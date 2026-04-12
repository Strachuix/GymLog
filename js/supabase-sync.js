(function () {
    let supabaseClient = null;
    let syncInProgress = false;
    let pullSyncInProgress = false;
    let pendingChanges = false;
    const OTP_COOLDOWN_MS = 60 * 1000;
    const BACKGROUND_SYNC_INTERVAL_MS = 10000; // Push every 10 seconds
    const BACKGROUND_PULL_INTERVAL_MS = 30000; // Pull every 30 seconds
    let backgroundSyncIntervalId = null;
    let backgroundPullIntervalId = null;

    function getConfig() {
        return window.GYMLOG_SUPABASE_CONFIG || {};
    }

    function isConfigured() {
        const config = getConfig();
        return Boolean(window.supabase && config.url && config.anonKey);
    }

    function getClient() {
        if (!isConfigured()) {
            return null;
        }

        if (!supabaseClient) {
            const config = getConfig();
            supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    flowType: 'implicit'
                }
            });
        }

        return supabaseClient;
    }

    function normalizeTimestamp(value) {
        if (!value) return Date.now();
        if (typeof value === 'number') return value;

        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : Date.now();
    }

    function getLocalSets() {
        return JSON.parse(localStorage.getItem('gymlog_data') || '[]');
    }

    function getLocalProfile() {
        return JSON.parse(localStorage.getItem('gymlog_profile') || 'null');
    }

    function getLocalWeightHistory() {
        return JSON.parse(localStorage.getItem('gymlog_weight_history') || '[]');
    }

    function getLocalSnapshot() {
        return {
            sets: getLocalSets(),
            profile: getLocalProfile(),
            weightHistory: getLocalWeightHistory()
        };
    }

    function hasAnyData(snapshot) {
        return snapshot.sets.length > 0 || Boolean(snapshot.profile) || snapshot.weightHistory.length > 0;
    }

    function mapSetFromCloud(set) {
        return {
            id: set.id,
            exercise: set.exercise,
            type: set.type || 'weighted',
            weight: set.weight ?? undefined,
            reps: set.reps ?? undefined,
            addedWeight: set.added_weight ?? undefined,
            bodyWeight: set.body_weight ?? undefined,
            duration: set.duration ?? undefined,
            distance: set.distance ?? undefined,
            elevation: set.elevation ?? undefined,
            timestamp: normalizeTimestamp(set.timestamp)
        };
    }

    function mapProfileFromCloud(profile) {
        if (!profile) {
            return null;
        }

        return {
            username: profile.username || 'GymLog User',
            gender: profile.gender || null,
            age: profile.age ?? null,
            height: profile.height ?? null,
            weight: profile.weight ?? null,
            oneRmFormula: profile.one_rm_formula || 'epley',
            profilePic: profile.profile_picture_base64 || null
        };
    }

    function mapWeightEntryFromCloud(entry) {
        return {
            id: entry.id,
            timestamp: normalizeTimestamp(entry.timestamp),
            weight: Number(entry.weight)
        };
    }

    function getSnapshotItemId(item) {
        if (item?.id) {
            return String(item.id);
        }

        const timestamp = normalizeTimestamp(item?.timestamp || item?.date);

        if (item?.exercise) {
            return `${item.exercise}-${timestamp}`;
        }

        if (item?.weight !== undefined) {
            return `${timestamp}-${item.weight}`;
        }

        return String(timestamp);
    }

    function compareById(localItems, cloudItems) {
        const localIds = new Set(localItems.map(getSnapshotItemId));
        const cloudIds = new Set(cloudItems.map(getSnapshotItemId));

        let localOnly = 0;
        let cloudOnly = 0;

        localIds.forEach(id => {
            if (!cloudIds.has(id)) {
                localOnly += 1;
            }
        });

        cloudIds.forEach(id => {
            if (!localIds.has(id)) {
                cloudOnly += 1;
            }
        });

        return { localOnly, cloudOnly };
    }

    function serializeProfileForCompare(profile) {
        if (!profile) {
            return '';
        }

        return JSON.stringify({
            username: profile.username || 'GymLog User',
            gender: profile.gender || null,
            age: profile.age ?? null,
            height: profile.height ?? null,
            weight: profile.weight ?? null,
            oneRmFormula: profile.oneRmFormula || 'epley',
            profilePic: profile.profilePic || null
        });
    }

    async function fetchCloudSnapshot(userId) {
        const client = getClient();
        if (!client) {
            return { sets: [], profile: null, weightHistory: [] };
        }

        const [setsResult, profileResult, historyResult] = await Promise.all([
            client.from('training_sets').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
            client.from('profiles').select('*').eq('id', userId).maybeSingle(),
            client.from('weight_history').select('*').eq('user_id', userId).order('timestamp', { ascending: false })
        ]);

        if (setsResult.error) throw setsResult.error;
        if (profileResult.error) throw profileResult.error;
        if (historyResult.error) throw historyResult.error;

        return {
            sets: (setsResult.data || []).map(mapSetFromCloud),
            profile: mapProfileFromCloud(profileResult.data),
            weightHistory: (historyResult.data || []).map(mapWeightEntryFromCloud)
        };
    }

    function replaceLocalSnapshot(snapshot) {
        localStorage.setItem('gymlog_data', JSON.stringify(
            [...(snapshot.sets || [])].sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp))
        ));

        if (snapshot.profile) {
            localStorage.setItem('gymlog_profile', JSON.stringify(snapshot.profile));
        } else {
            localStorage.removeItem('gymlog_profile');
        }

        localStorage.setItem('gymlog_weight_history', JSON.stringify(
            [...(snapshot.weightHistory || [])].sort((a, b) => normalizeTimestamp(b.timestamp || b.date) - normalizeTimestamp(a.timestamp || a.date))
        ));

        window.dispatchEvent(new CustomEvent('gymlog-data-changed', {
            detail: { source: 'cloud-sync' }
        }));
    }

    function mergeUniqueById(localItems, cloudItems) {
        const merged = new Map();

        cloudItems.forEach(item => {
            merged.set(getSnapshotItemId(item), item);
        });

        localItems.forEach(item => {
            merged.set(getSnapshotItemId(item), item);
        });

        return [...merged.values()];
    }

    function mergeProfiles(localProfile, cloudProfile) {
        if (!localProfile && !cloudProfile) {
            return null;
        }

        return {
            ...(cloudProfile || {}),
            ...(localProfile || {})
        };
    }

    function buildMergedSnapshot(localSnapshot, cloudSnapshot) {
        return {
            sets: mergeUniqueById(localSnapshot.sets, cloudSnapshot.sets)
                .sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp)),
            profile: mergeProfiles(localSnapshot.profile, cloudSnapshot.profile),
            weightHistory: mergeUniqueById(localSnapshot.weightHistory, cloudSnapshot.weightHistory)
                .sort((a, b) => normalizeTimestamp(b.timestamp || b.date) - normalizeTimestamp(a.timestamp || a.date))
        };
    }

    function summarizeConflict(localSnapshot, cloudSnapshot) {
        const setsDiff = compareById(localSnapshot.sets, cloudSnapshot.sets);
        const weightDiff = compareById(localSnapshot.weightHistory, cloudSnapshot.weightHistory);
        const profileDiffers = serializeProfileForCompare(localSnapshot.profile) !== serializeProfileForCompare(cloudSnapshot.profile);
        const localHasData = hasAnyData(localSnapshot);
        const cloudHasData = hasAnyData(cloudSnapshot);

        return {
            localHasData,
            cloudHasData,
            localSets: localSnapshot.sets.length,
            cloudSets: cloudSnapshot.sets.length,
            localWeightEntries: localSnapshot.weightHistory.length,
            cloudWeightEntries: cloudSnapshot.weightHistory.length,
            localHasProfile: Boolean(localSnapshot.profile),
            cloudHasProfile: Boolean(cloudSnapshot.profile),
            localOnlySetIds: setsDiff.localOnly,
            cloudOnlySetIds: setsDiff.cloudOnly,
            localOnlyWeightIds: weightDiff.localOnly,
            cloudOnlyWeightIds: weightDiff.cloudOnly,
            profileDiffers,
            needsResolution: localHasData && cloudHasData && (
                setsDiff.localOnly > 0 ||
                setsDiff.cloudOnly > 0 ||
                weightDiff.localOnly > 0 ||
                weightDiff.cloudOnly > 0 ||
                profileDiffers
            )
        };
    }

    function clearAuthParamsFromUrl() {
        const url = new URL(window.location.href);
        const queryKeys = ['code', 'token_hash', 'type', 'error', 'error_code', 'error_description'];
        let changed = false;

        queryKeys.forEach(key => {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        });

        if (url.hash && /(access_token|refresh_token|expires_in|expires_at)/.test(url.hash)) {
            url.hash = '';
            changed = true;
        }

        if (changed) {
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    async function bootstrapSession() {
        const client = getClient();
        if (!client) {
            return null;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');

        try {
            const { data: existingData, error: existingError } = await client.auth.getSession();
            if (existingError && !/Auth session missing/i.test(existingError.message || '')) {
                console.error('Supabase session error:', existingError.message);
            }

            if (existingData?.session) {
                return existingData.session;
            }

            if (code) {
                const { error } = await client.auth.exchangeCodeForSession(code);
                if (error) {
                    if (/code verifier not found/i.test(error.message || '')) {
                        clearAuthParamsFromUrl();
                        await window.showNoticeModal?.({
                            title: 'Link logowania wygasł lub był otwarty w innym miejscu',
                            message: 'Ten magic link został wygenerowany w innym browserze, na innym urządzeniu albo przed ostatnią zmianą konfiguracji logowania. Poproś o nowy link i otwórz go w tym samym browserze oraz pod tym samym adresem (`localhost` albo `127.0.0.1`).',
                            type: 'warning'
                        });
                        return null;
                    }

                    console.error('Supabase code exchange failed:', error.message);
                } else {
                    clearAuthParamsFromUrl();
                }
            } else if (tokenHash && type) {
                const { error } = await client.auth.verifyOtp({
                    type,
                    token_hash: tokenHash
                });

                if (error) {
                    console.error('Supabase OTP verification failed:', error.message);
                } else {
                    clearAuthParamsFromUrl();
                }
            }

            const { data, error } = await client.auth.getSession();
            if (error && !/Auth session missing/i.test(error.message || '')) {
                console.error('Supabase session error:', error.message);
                return null;
            }

            return data?.session || null;
        } catch (error) {
            console.error('Supabase session bootstrap failed:', error);
            return null;
        }
    }

    async function getCurrentUser() {
        const session = await bootstrapSession();
        return session?.user || null;
    }

    async function startAuthFlow() {
        const client = getClient();

        if (!client) {
            alert('Supabase nie jest jeszcze skonfigurowany. Uzupełnij `js/supabase-config.js`, a potem spróbuj ponownie.');
            return false;
        }

        const lastOtpRequestAt = parseInt(localStorage.getItem('gymlog_last_otp_request_at') || '0', 10);
        const now = Date.now();
        const cooldownRemaining = OTP_COOLDOWN_MS - (now - lastOtpRequestAt);

        if (cooldownRemaining > 0) {
            const seconds = Math.ceil(cooldownRemaining / 1000);
            window.showToast?.(`⏳ Poczekaj około ${seconds}s przed wysłaniem kolejnego linku logowania.`, 'warning', 3500);
            return false;
        }

        const lastUsedEmail = localStorage.getItem('gymlog_last_auth_email') || '';
        const email = window.promptForCloudEmail
            ? await window.promptForCloudEmail(lastUsedEmail)
            : null;

        if (!email) {
            return false;
        }

        localStorage.setItem('gymlog_last_auth_email', email);

        const config = getConfig();
        const redirectTo = config.redirectUrl || (window.location.origin + window.location.pathname);

        const { error } = await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: redirectTo
            }
        });

        if (error) {
            const message = error.message || 'Nieznany błąd';

            if (error.status === 429 || /rate limit|security purposes/i.test(message)) {
                localStorage.setItem('gymlog_last_otp_request_at', String(Date.now()));
                await window.showNoticeModal?.({
                    title: 'Za dużo prób logowania',
                    message: 'Supabase chwilowo zablokował kolejne wysyłki magic linka, bo link był wysyłany zbyt często. Odczekaj około minutę i spróbuj ponownie.',
                    type: 'warning'
                });
                return false;
            }

            alert(`Nie udało się wysłać linku logowania: ${message}`);
            return false;
        }

        localStorage.setItem('gymlog_last_otp_request_at', String(Date.now()));
        window.showToast?.('✉️ Link logowania został wysłany na maila.', 'success', 3200);
        await window.showNoticeModal?.({
            title: 'Sprawdź skrzynkę mailową',
            message: 'Link logowania został wysłany. Otwórz go w tym samym browserze i pod tym samym adresem aplikacji (`localhost` albo `127.0.0.1`), z którego wysłałeś żądanie.',
            type: 'info'
        });
        return true;
    }

    async function signOut() {
        const client = getClient();
        if (!client) {
            localStorage.setItem('gymlog_app_mode', 'local');
            window.updateAppModeUI?.();
            return;
        }

        const { error } = await client.auth.signOut();
        if (error) {
            alert(`Nie udało się wylogować: ${error.message}`);
            return;
        }

        localStorage.setItem('gymlog_app_mode', 'local');
        window.updateAppModeUI?.();
    }

    function mapSetForCloud(set, userId) {
        return {
            id: set.id,
            user_id: userId,
            exercise: set.exercise,
            type: set.type || 'weighted',
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            added_weight: set.addedWeight ?? null,
            body_weight: set.bodyWeight ?? null,
            duration: set.duration ?? null,
            distance: set.distance ?? null,
            elevation: set.elevation ?? null,
            timestamp: normalizeTimestamp(set.timestamp),
            updated_at: new Date().toISOString()
        };
    }

    function mapProfileForCloud(profile, userId, latestWeight) {
        return {
            id: userId,
            username: profile?.username || 'GymLog User',
            gender: profile?.gender || null,
            age: profile?.age ?? null,
            height: profile?.height ?? null,
            weight: latestWeight ?? profile?.weight ?? null,
            one_rm_formula: profile?.oneRmFormula || 'epley',
            profile_picture_base64: profile?.profilePic || null,
            updated_at: new Date().toISOString()
        };
    }

    function mapWeightEntryForCloud(entry, userId) {
        const timestamp = normalizeTimestamp(entry.timestamp || entry.date);

        return {
            id: entry.id || `${userId}-${timestamp}-${entry.weight}`,
            user_id: userId,
            timestamp,
            weight: entry.weight,
            created_at: new Date().toISOString()
        };
    }

    async function pushSnapshotToCloud(snapshot, userId, options = {}) {
        const client = getClient();
        if (!client) {
            return { ok: false, reason: 'not-configured' };
        }

        try {
            if (options.replaceExisting) {
                const [setsDelete, historyDelete, profileDelete] = await Promise.all([
                    client.from('training_sets').delete().eq('user_id', userId),
                    client.from('weight_history').delete().eq('user_id', userId),
                    snapshot.profile ? Promise.resolve({ error: null }) : client.from('profiles').delete().eq('id', userId)
                ]);

                if (setsDelete.error) throw setsDelete.error;
                if (historyDelete.error) throw historyDelete.error;
                if (profileDelete.error) throw profileDelete.error;
            }

            const latestWeight = snapshot.weightHistory.length > 0 ? snapshot.weightHistory[0].weight : null;

            if (snapshot.profile) {
                const { error: profileError } = await client
                    .from('profiles')
                    .upsert(mapProfileForCloud(snapshot.profile, userId, latestWeight), { onConflict: 'id' });

                if (profileError) throw profileError;
            }

            if (snapshot.sets.length > 0) {
                const payload = snapshot.sets.map(set => mapSetForCloud(set, userId));
                const { error: setsError } = await client
                    .from('training_sets')
                    .upsert(payload, { onConflict: 'id' });

                if (setsError) throw setsError;
            }

            if (snapshot.weightHistory.length > 0) {
                const payload = snapshot.weightHistory.map(entry => mapWeightEntryForCloud(entry, userId));
                const { error: historyError } = await client
                    .from('weight_history')
                    .upsert(payload, { onConflict: 'id' });

                if (historyError) throw historyError;
            }

            return { ok: true };
        } catch (error) {
            console.error('Cloud write failed:', error);
            return { ok: false, reason: 'sync-error', error };
        }
    }

    async function migrateLocalDataToCloud() {
        const user = await getCurrentUser();
        if (!user) {
            return { ok: false, reason: 'not-authenticated' };
        }

        const localSnapshot = getLocalSnapshot();
        const result = await pushSnapshotToCloud(localSnapshot, user.id, { replaceExisting: false });

        if (!result.ok) {
            return result;
        }

        localStorage.setItem('gymlog_cloud_migration_completed', 'true');
        localStorage.removeItem('gymlog_cloud_migration_required');
        window.markCloudSyncComplete?.();
        window.updateAppModeUI?.();

        return {
            ok: true,
            imported: {
                sets: localSnapshot.sets.length,
                weightEntries: localSnapshot.weightHistory.length,
                hasProfile: Boolean(localSnapshot.profile)
            }
        };
    }

    async function askConflictResolution(summary) {
        if (window.promptCloudConflictResolution) {
            return window.promptCloudConflictResolution(summary);
        }

        window.showToast?.('⚠️ Nie udało się otworzyć modala konfliktu, wybrano bezpieczny merge.', 'warning', 3200);
        return 'merge';
    }

    async function resolveSnapshotConflict(summary, localSnapshot, cloudSnapshot, userId) {
        const choice = await askConflictResolution(summary);

        if (choice === 'cloud') {
            replaceLocalSnapshot(cloudSnapshot);
            window.markCloudSyncComplete?.();
            return {
                ok: true,
                action: 'cloud',
                message: 'Zachowano dane z chmury i nadpisano nimi dane lokalne na tym urządzeniu.'
            };
        }

        if (choice === 'local') {
            const replaceResult = await pushSnapshotToCloud(localSnapshot, userId, { replaceExisting: true });
            if (!replaceResult.ok) {
                return replaceResult;
            }

            replaceLocalSnapshot(localSnapshot);
            window.markCloudSyncComplete?.();
            return {
                ok: true,
                action: 'local',
                message: 'Zachowano dane lokalne i zastąpiono nimi zawartość chmury.'
            };
        }

        const mergedSnapshot = buildMergedSnapshot(localSnapshot, cloudSnapshot);
        const mergeResult = await pushSnapshotToCloud(mergedSnapshot, userId, { replaceExisting: false });
        if (!mergeResult.ok) {
            return mergeResult;
        }

        replaceLocalSnapshot(mergedSnapshot);
        window.markCloudSyncComplete?.();
        return {
            ok: true,
            action: 'merge',
            message: `Zmergowano dane. Łącznie masz teraz ${mergedSnapshot.sets.length} serii i ${mergedSnapshot.weightHistory.length} wpisów wagi.`
        };
    }

    async function silentMergeSnapshot(localSnapshot, cloudSnapshot, userId) {
        try {
            const mergedSnapshot = buildMergedSnapshot(localSnapshot, cloudSnapshot);
            const mergeResult = await pushSnapshotToCloud(mergedSnapshot, userId, { replaceExisting: false });
            if (mergeResult.ok) {
                replaceLocalSnapshot(mergedSnapshot);
                localStorage.setItem('gymlog_cloud_last_sync', new Date().toISOString());
                console.log('Background merge sync completed silently');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Silent merge failed:', error);
            return false;
        }
    }

    async function backgroundPushSync() {
        if (syncInProgress || !isConfigured()) {
            return;
        }

        if (!hasPendingChanges()) {
            return; // No changes to push, skip
        }

        const user = await getCurrentUser();
        if (!user) {
            return;
        }

        syncInProgress = true;

        try {
            const localSnapshot = getLocalSnapshot();
            if (!hasAnyData(localSnapshot)) {
                clearPendingChanges();
                syncInProgress = false;
                return;
            }

            const result = await pushSnapshotToCloud(localSnapshot, user.id, { replaceExisting: false });
            if (result.ok) {
                localStorage.setItem('gymlog_cloud_last_sync', new Date().toISOString());
                clearPendingChanges();
                console.log('Background push sync completed');
            } else {
                console.error('Background push sync failed:', result.reason);
            }
        } catch (error) {
            console.error('Background push sync error:', error);
        } finally {
            syncInProgress = false;
        }
    }

    async function backgroundPullSync() {
        if (pullSyncInProgress || !isConfigured()) {
            return;
        }

        const user = await getCurrentUser();
        if (!user) {
            return;
        }

        pullSyncInProgress = true;

        try {
            const localSnapshot = getLocalSnapshot();
            const cloudSnapshot = await fetchCloudSnapshot(user.id);
            const summary = summarizeConflict(localSnapshot, cloudSnapshot);

            // Silent cloud download if local is empty
            if (!summary.localHasData && summary.cloudHasData) {
                replaceLocalSnapshot(cloudSnapshot);
                window.updateAppModeUI?.();
                console.log('Background cloud download completed');
                pullSyncInProgress = false;
                return;
            }

            // Silent merge if needed
            if (summary.needsResolution) {
                await silentMergeSnapshot(localSnapshot, cloudSnapshot, user.id);
                console.log('Background merge completed');
                pullSyncInProgress = false;
                return;
            }

            // Already in sync, nothing to do
            pullSyncInProgress = false;
        } catch (error) {
            console.error('Background pull sync error:', error);
            pullSyncInProgress = false;
        }
    }

    function ensureBackgroundSyncLoops() {
        if (backgroundSyncIntervalId !== null) {
            return; // Already running
        }

        console.log('Starting background sync loops...');

        // Push sync every 10 seconds
        backgroundSyncIntervalId = setInterval(() => {
            backgroundPushSync().catch(err => {
                console.error('Background push sync interval error:', err);
            });
        }, BACKGROUND_SYNC_INTERVAL_MS);

        // Pull sync every 30 seconds
        backgroundPullIntervalId = setInterval(() => {
            backgroundPullSync().catch(err => {
                console.error('Background pull sync interval error:', err);
            });
        }, BACKGROUND_PULL_INTERVAL_MS);

        // Run first sync immediately
        backgroundPushSync().catch(err => console.error('Initial push sync error:', err));
        backgroundPullSync().catch(err => console.error('Initial pull sync error:', err));
    }

    function stopBackgroundSyncLoops() {
        if (backgroundSyncIntervalId !== null) {
            clearInterval(backgroundSyncIntervalId);
            backgroundSyncIntervalId = null;
            console.log('Stopped background push sync loop');
        }

        if (backgroundPullIntervalId !== null) {
            clearInterval(backgroundPullIntervalId);
            backgroundPullIntervalId = null;
            console.log('Stopped background pull sync loop');
        }
    }

    function markPendingChanges() {
        pendingChanges = true;
        console.log('Data marked as changed - pending push sync');
    }

    function clearPendingChanges() {
        pendingChanges = false;
        console.log('Pending changes cleared after successful push');
    }

    function hasPendingChanges() {
        return pendingChanges;
    }

    async function syncIfConfigured() {
        if (syncInProgress) {
            return { ok: false, reason: 'in-progress' };
        }

        if (!isConfigured()) {
            return { ok: false, reason: 'not-configured' };
        }

        const user = await getCurrentUser();
        if (!user) {
            return { ok: false, reason: 'not-authenticated' };
        }

        syncInProgress = true;

        try {
            const localSnapshot = getLocalSnapshot();
            const cloudSnapshot = await fetchCloudSnapshot(user.id);
            const summary = summarizeConflict(localSnapshot, cloudSnapshot);

            if (!summary.localHasData && summary.cloudHasData) {
                replaceLocalSnapshot(cloudSnapshot);
                window.markCloudSyncComplete?.();
                window.updateAppModeUI?.();
                return {
                    ok: true,
                    action: 'cloud-download',
                    message: 'Pobrano dane z chmury na to urządzenie.'
                };
            }

            if (summary.localHasData && !summary.cloudHasData) {
                const migrationResult = await migrateLocalDataToCloud();
                if (migrationResult.ok) {
                    localStorage.setItem('gymlog_cloud_last_sync', new Date().toISOString());
                }
                return migrationResult;
            }

            if (summary.needsResolution) {
                const resolutionResult = await resolveSnapshotConflict(summary, localSnapshot, cloudSnapshot, user.id);
                if (resolutionResult.ok) {
                    localStorage.setItem('gymlog_cloud_last_sync', new Date().toISOString());
                    window.updateAppModeUI?.();
                }
                return resolutionResult;
            }

            const pushResult = await pushSnapshotToCloud(localSnapshot, user.id, { replaceExisting: false });
            if (!pushResult.ok) {
                return pushResult;
            }

            localStorage.setItem('gymlog_cloud_last_sync', new Date().toISOString());
            window.markCloudSyncComplete?.();
            window.updateAppModeUI?.();

            return {
                ok: true,
                action: 'synced'
            };
        } catch (error) {
            console.error('Cloud sync failed:', error);
            return { ok: false, reason: 'sync-error', error };
        } finally {
            syncInProgress = false;
        }
    }

    async function getStatusSummary() {
        const user = await getCurrentUser();
        return {
            configured: isConfigured(),
            user,
            lastSync: localStorage.getItem('gymlog_cloud_last_sync'),
            migrationCompleted: localStorage.getItem('gymlog_cloud_migration_completed') === 'true'
        };
    }

    async function handleAuthenticatedUser() {
        const user = await getCurrentUser();
        if (!user) {
            window.updateAppModeUI?.();
            stopBackgroundSyncLoops();
            return;
        }

        localStorage.setItem('gymlog_app_mode', 'cloud');

        // First synchronization (can show message)
        const syncResult = await syncIfConfigured();
        if (syncResult.ok) {
            if (syncResult.action === 'cloud-download') {
                window.showToast?.('☁️ Pobrano dane z chmury.', 'info', 2000);
            } else if (syncResult.action === 'synced' || syncResult.action === 'merge') {
                window.showToast?.('✅ Dane zsynchronizowane.', 'success', 2000);
            }
        }

        // Start background sync loops
        ensureBackgroundSyncLoops();

        window.updateAppModeUI?.();
    }

    async function initSupabaseSync() {
        const client = getClient();
        if (!client) {
            window.updateAppModeUI?.();
            return;
        }

        await bootstrapSession();
        await handleAuthenticatedUser();

        client.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await handleAuthenticatedUser();
                return;
            }

            if (event === 'SIGNED_OUT') {
                stopBackgroundSyncLoops();
                window.updateAppModeUI?.();
            }
        });
    }

    window.GymLogCloudSync = {
        isConfigured,
        getClient,
        getCurrentUser,
        getStatusSummary,
        startAuthFlow,
        signOut,
        syncIfConfigured,
        migrateLocalDataToCloud,
        getSession: bootstrapSession,
        backgroundPushSync,
        backgroundPullSync,
        ensureBackgroundSyncLoops,
        stopBackgroundSyncLoops,
        markPendingChanges,
        clearPendingChanges,
        hasPendingChanges
    };

    document.addEventListener('DOMContentLoaded', initSupabaseSync);
    window.addEventListener('online', () => {
        window.GymLogCloudSync.syncIfConfigured().catch(err => {
            console.error('Background sync failed:', err);
        });
    });
})();
