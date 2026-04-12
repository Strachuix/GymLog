// Common LocalStorage key
const STORAGE_KEY = 'gymlog_data';
const APP_MODE_KEY = 'gymlog_app_mode';
const CLOUD_SYNC_QUEUE_KEY = 'gymlog_cloud_pending_sync';
const CLOUD_LAST_SYNC_KEY = 'gymlog_cloud_last_sync';
const CLOUD_MIGRATION_DONE_KEY = 'gymlog_cloud_migration_completed';
const CLOUD_MIGRATION_REQUIRED_KEY = 'gymlog_cloud_migration_required';

let dataConflictResolver = null;
let authEmailResolver = null;
let appConfirmResolver = null;
let appNoticeResolver = null;

function inferNoticeType(message = '') {
    const text = String(message).toLowerCase();

    if (text.includes('❌') || text.includes('błąd') || text.includes('nie udało')) return 'error';
    if (text.includes('⚠️') || text.includes('uwaga') || text.includes('brak') || text.includes('ryzyko')) return 'warning';
    if (text.includes('✅') || text.includes('✓') || text.includes('skopiowano') || text.includes('zapisano') || text.includes('wysłany')) return 'success';
    return 'info';
}

function getNoticeTitle(type) {
    return {
        success: 'Gotowe',
        error: 'Wystąpił problem',
        warning: 'Uwaga',
        info: 'Informacja'
    }[type] || 'Informacja';
}

function injectFeedbackUI() {
    if (document.getElementById('appGlobalToast')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="appGlobalToast" class="hidden fixed top-5 left-1/2 -translate-x-1/2 z-[95] px-4">
            <div id="appGlobalToastContent" class="min-w-[220px] max-w-[90vw] rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl border"></div>
        </div>

        <div id="appNoticeModal" class="hidden fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
            <div class="bg-dark-card border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-in">
                <div class="mb-5">
                    <p id="appNoticeTitle" class="text-xl font-black text-gray-100">Informacja</p>
                    <p id="appNoticeMessage" class="text-sm text-gray-400 mt-3 leading-relaxed whitespace-pre-line"></p>
                </div>
                <button id="appNoticeOkBtn" type="button" class="w-full bg-neon-green hover:bg-emerald-400 text-dark-bg font-black py-3 rounded-2xl transition-colors">
                    OK
                </button>
            </div>
        </div>

        <div id="appConfirmModal" class="hidden fixed inset-0 bg-black/80 z-[91] flex items-center justify-center p-4">
            <div class="bg-dark-card border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-in">
                <div class="mb-5">
                    <p id="appConfirmTitle" class="text-xl font-black text-gray-100">Potwierdzenie</p>
                    <p id="appConfirmMessage" class="text-sm text-gray-400 mt-3 leading-relaxed whitespace-pre-line"></p>
                </div>
                <div class="flex gap-3">
                    <button id="appConfirmCancelBtn" type="button" class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-100 font-bold py-3 rounded-2xl transition-colors">
                        Anuluj
                    </button>
                    <button id="appConfirmOkBtn" type="button" class="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-3 rounded-2xl transition-colors">
                        Potwierdź
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('appNoticeOkBtn')?.addEventListener('click', () => {
        document.getElementById('appNoticeModal')?.classList.add('hidden');
        const resolver = appNoticeResolver;
        appNoticeResolver = null;
        resolver?.();
    });

    document.getElementById('appConfirmCancelBtn')?.addEventListener('click', () => resolveAppConfirm(false));
    document.getElementById('appConfirmOkBtn')?.addEventListener('click', () => resolveAppConfirm(true));

    document.getElementById('appNoticeModal')?.addEventListener('click', event => {
        if (event.target?.id === 'appNoticeModal') {
            document.getElementById('appNoticeOkBtn')?.click();
        }
    });

    document.getElementById('appConfirmModal')?.addEventListener('click', event => {
        if (event.target?.id === 'appConfirmModal') {
            resolveAppConfirm(false);
        }
    });
}

function resolveAppConfirm(result) {
    document.getElementById('appConfirmModal')?.classList.add('hidden');

    const resolver = appConfirmResolver;
    appConfirmResolver = null;
    resolver?.(result);
}

function showToast(message, type = inferNoticeType(message), duration = 2400) {
    injectFeedbackUI();

    const toast = document.getElementById('appGlobalToast');
    const content = document.getElementById('appGlobalToastContent');
    if (!toast || !content) {
        return;
    }

    const styles = {
        success: 'bg-neon-green text-dark-bg border-neon-green/40',
        error: 'bg-red-500 text-white border-red-300/40',
        warning: 'bg-yellow-400 text-yellow-950 border-yellow-200/40',
        info: 'bg-dark-card text-gray-100 border-gray-700'
    };

    content.className = `min-w-[220px] max-w-[90vw] rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl border ${styles[type] || styles.info}`;
    content.textContent = String(message);
    toast.classList.remove('hidden');

    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

function showNoticeModal(arg1, arg2, arg3 = {}) {
    injectFeedbackUI();

    const options = typeof arg1 === 'object'
        ? arg1
        : { title: arg1, message: arg2, ...(arg3 || {}) };

    const type = options.type || inferNoticeType(options.message);
    const title = options.title || getNoticeTitle(type);
    const message = String(options.message || '');

    document.getElementById('appNoticeTitle').textContent = title;
    document.getElementById('appNoticeMessage').textContent = message;
    document.getElementById('appNoticeModal')?.classList.remove('hidden');

    return new Promise(resolve => {
        appNoticeResolver = resolve;
    });
}

function showConfirmDialog(arg1, arg2, arg3 = {}) {
    injectFeedbackUI();

    const options = typeof arg1 === 'object'
        ? arg1
        : { title: arg1, message: arg2, ...(arg3 || {}) };

    document.getElementById('appConfirmTitle').textContent = options.title || 'Potwierdzenie';
    document.getElementById('appConfirmMessage').textContent = String(options.message || '');
    document.getElementById('appConfirmCancelBtn').textContent = options.cancelText || 'Anuluj';
    document.getElementById('appConfirmOkBtn').textContent = options.confirmText || 'Potwierdź';
    document.getElementById('appConfirmOkBtn').className = `flex-1 ${options.danger === false ? 'bg-neon-green hover:bg-emerald-400 text-dark-bg' : 'bg-red-500 hover:bg-red-400 text-white'} font-black py-3 rounded-2xl transition-colors`;
    document.getElementById('appConfirmModal')?.classList.remove('hidden');

    return new Promise(resolve => {
        appConfirmResolver = resolve;
    });
}

function showAppNotice(message, options = {}) {
    const text = String(message || '');
    const type = options.type || inferNoticeType(text);
    const shouldToast = options.preferToast ?? (text.length < 110 && !text.includes('\n\n'));

    if (shouldToast) {
        showToast(text, type, options.duration);
        return Promise.resolve();
    }

    return showNoticeModal({
        title: options.title || getNoticeTitle(type),
        message: text,
        type
    });
}

window.showToast = showToast;
window.showNoticeModal = showNoticeModal;
window.showConfirmDialog = showConfirmDialog;
window.showConfirm = showConfirmDialog;
window.alert = function(message) {
    showAppNotice(message);
};

function getAppMode() {
    return localStorage.getItem(APP_MODE_KEY);
}

function setAppMode(mode) {
    localStorage.setItem(APP_MODE_KEY, mode);

    if (mode === 'cloud' && hasLocalDataToMigrate()) {
        localStorage.setItem(CLOUD_MIGRATION_REQUIRED_KEY, 'true');
    }

    updateAppModeUI();
}

function hasLocalDataToMigrate() {
    if (localStorage.getItem(CLOUD_MIGRATION_REQUIRED_KEY) === 'true') {
        return true;
    }

    if (localStorage.getItem(CLOUD_MIGRATION_DONE_KEY) === 'true' && getAppMode() === 'cloud') {
        return false;
    }

    const sets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const profile = JSON.parse(localStorage.getItem('gymlog_profile') || 'null');
    const weightHistory = JSON.parse(localStorage.getItem('gymlog_weight_history') || '[]');

    return sets.length > 0 || Boolean(profile) || weightHistory.length > 0;
}

function getPendingCloudSyncQueue() {
    try {
        const data = JSON.parse(localStorage.getItem(CLOUD_SYNC_QUEUE_KEY) || '[]');
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function queuePendingCloudSync(scope = 'general') {
    if (getAppMode() !== 'cloud') {
        return;
    }

    const queue = getPendingCloudSyncQueue();
    if (!queue.includes(scope)) {
        queue.push(scope);
        localStorage.setItem(CLOUD_SYNC_QUEUE_KEY, JSON.stringify(queue));
    }

    localStorage.setItem(CLOUD_MIGRATION_REQUIRED_KEY, 'true');
    updateAppModeUI();

    if (navigator.onLine && window.GymLogCloudSync?.syncIfConfigured) {
        window.GymLogCloudSync.syncIfConfigured()
            .catch(err => console.error('Auto sync failed:', err))
            .finally(() => updateAppModeUI());
    }
}

function markCloudSyncComplete() {
    localStorage.setItem(CLOUD_SYNC_QUEUE_KEY, JSON.stringify([]));
    localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
    localStorage.setItem(CLOUD_MIGRATION_DONE_KEY, 'true');
    localStorage.removeItem(CLOUD_MIGRATION_REQUIRED_KEY);
    updateAppModeUI();
}

function formatLastSyncDate(value) {
    if (!value) {
        return 'jeszcze nie wykonano';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'brak danych';
    }

    return date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeAppModeModal() {
    document.getElementById('appModeModal')?.classList.add('hidden');
}

async function chooseLocalMode() {
    const shouldContinue = await showConfirmDialog({
        title: 'Tryb lokalny',
        message: 'Tryb lokalny zapisuje dane tylko na tym urządzeniu. Jeśli wyczyścisz dane przeglądarki albo zmienisz telefon, możesz je stracić. Czy chcesz kontynuować?',
        confirmText: 'Korzystaj lokalnie',
        cancelText: 'Wróć',
        danger: false
    });

    if (!shouldContinue) {
        return;
    }

    setAppMode('local');
    closeAppModeModal();
}

async function chooseCloudMode() {
    setAppMode('cloud');
    closeAppModeModal();

    if (window.GymLogCloudSync?.startAuthFlow) {
        await window.GymLogCloudSync.startAuthFlow();
    } else {
        alert('Konfiguracja trybu chmurowego jest gotowa do podpięcia, ale wymaga jeszcze uzupełnienia `js/supabase-config.js`.');
    }

    await updateAppModeUI();
}

async function handleAppModeAction() {
    if (getAppMode() !== 'cloud') {
        await chooseCloudMode();
        return;
    }

    if (!window.GymLogCloudSync?.syncIfConfigured) {
        alert('Warstwa synchronizacji nie jest jeszcze gotowa. Sprawdź konfigurację Supabase.');
        return;
    }

    const result = await window.GymLogCloudSync.syncIfConfigured();

    if (!result.ok && result.reason === 'not-configured') {
        alert('Uzupełnij `js/supabase-config.js`, aby włączyć synchronizację z chmurą.');
    } else if (!result.ok && result.reason === 'not-authenticated') {
        await window.GymLogCloudSync.startAuthFlow();
    } else if (!result.ok && result.reason === 'sync-error') {
        alert(`Synchronizacja nie powiodła się: ${result.error?.message || 'nieznany błąd'}`);
    }

    await updateAppModeUI();
}

function injectAppModeUI() {
    if (document.getElementById('appModeBanner')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="appModeBanner" class="hidden fixed left-1/2 -translate-x-1/2 bottom-24 z-[55] w-[calc(100%-1.5rem)] max-w-lg">
            <div class="bg-dark-card/95 backdrop-blur border border-gray-800 rounded-2xl px-4 py-3 shadow-2xl">
                <div class="flex items-start gap-3">
                    <div id="appModeBadge" class="mt-1 h-2.5 w-2.5 rounded-full bg-gray-500"></div>
                    <div class="flex-1 min-w-0">
                        <p id="appModeTitle" class="text-sm font-bold text-gray-100">Tryb aplikacji</p>
                        <p id="appModeDescription" class="text-xs text-gray-400 mt-1 leading-relaxed"></p>
                    </div>
                    <button id="appModeActionBtn" type="button" class="shrink-0 bg-neon-green hover:bg-emerald-400 text-dark-bg text-xs font-black px-3 py-2 rounded-xl transition-colors">
                        Zaloguj
                    </button>
                </div>
            </div>
        </div>

        <div id="appModeModal" class="hidden fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
            <div class="bg-dark-card border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-in">
                <div class="mb-5">
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-neon-green mb-2">Start aplikacji</p>
                    <h2 class="text-2xl font-black text-gray-100">Jak chcesz korzystać z GymLog?</h2>
                    <p class="text-sm text-gray-400 mt-2">Możesz zalogować się i synchronizować dane w chmurze albo korzystać lokalnie z ryzykiem utraty danych.</p>
                </div>

                <div class="space-y-3">
                    <button id="chooseCloudModeBtn" type="button" class="w-full bg-neon-green hover:bg-emerald-400 text-dark-bg font-black py-4 rounded-2xl transition-colors">
                        Zaloguj i synchronizuj
                    </button>
                    <button id="chooseLocalModeBtn" type="button" class="w-full bg-gray-900 hover:bg-gray-800 text-gray-100 font-bold py-4 rounded-2xl border border-gray-700 transition-colors">
                        Korzystaj lokalnie
                    </button>
                </div>

                <p class="text-xs text-gray-500 mt-4 leading-relaxed">
                    W trybie lokalnym dane są trzymane tylko na tym urządzeniu i mogą zniknąć po czyszczeniu przeglądarki lub zmianie telefonu.
                </p>
            </div>
        </div>
    `);

    document.getElementById('chooseLocalModeBtn')?.addEventListener('click', chooseLocalMode);
    document.getElementById('chooseCloudModeBtn')?.addEventListener('click', chooseCloudMode);
    document.getElementById('appModeActionBtn')?.addEventListener('click', handleAppModeAction);
}

function injectCloudConflictModal() {
    if (document.getElementById('cloudConflictModal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="cloudConflictModal" class="hidden fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
            <div class="bg-dark-card border border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-slide-in">
                <div class="mb-5">
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400 mb-2">Konflikt danych</p>
                    <h2 class="text-2xl font-black text-gray-100">Dane lokalne i chmurowe nie są zgodne</h2>
                    <p class="text-sm text-gray-400 mt-2">Wygląda na to, że konto było używane na więcej niż jednym urządzeniu. Wybierz, które dane chcesz zachować.</p>
                </div>

                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Na tym urządzeniu</p>
                        <p class="text-sm text-gray-200">Serie: <span id="conflictLocalSets" class="font-black text-neon-green">0</span></p>
                        <p class="text-sm text-gray-200">Waga: <span id="conflictLocalWeight" class="font-black text-neon-green">0</span></p>
                        <p class="text-xs text-gray-500 mt-2" id="conflictLocalProfile">Profil: brak</p>
                    </div>
                    <div class="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                        <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">W chmurze</p>
                        <p class="text-sm text-gray-200">Serie: <span id="conflictCloudSets" class="font-black text-blue-400">0</span></p>
                        <p class="text-sm text-gray-200">Waga: <span id="conflictCloudWeight" class="font-black text-blue-400">0</span></p>
                        <p class="text-xs text-gray-500 mt-2" id="conflictCloudProfile">Profil: brak</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <button type="button" data-conflict-choice="merge" class="w-full bg-neon-green hover:bg-emerald-400 text-dark-bg font-black py-4 rounded-2xl transition-colors">
                        Zmerguj dane
                    </button>
                    <button type="button" data-conflict-choice="cloud" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl transition-colors">
                        Zachowaj tylko dane z chmury
                    </button>
                    <button type="button" data-conflict-choice="local" class="w-full bg-gray-900 hover:bg-gray-800 text-gray-100 font-bold py-3 rounded-2xl border border-gray-700 transition-colors">
                        Zachowaj tylko dane lokalne
                    </button>
                </div>

                <p class="text-xs text-gray-500 mt-4 leading-relaxed">
                    Opcja <strong class="text-gray-300">merge</strong> łączy tylko rekordy o różnych identyfikatorach. Dla tego samego ID zostaje bieżąca wersja lokalna.
                </p>
            </div>
        </div>
    `);

    document.querySelectorAll('[data-conflict-choice]').forEach(button => {
        button.addEventListener('click', () => resolveCloudConflictChoice(button.dataset.conflictChoice));
    });
}

function resolveCloudConflictChoice(choice) {
    document.getElementById('cloudConflictModal')?.classList.add('hidden');

    const resolver = dataConflictResolver;
    dataConflictResolver = null;
    resolver?.(choice);
}

function promptCloudConflictResolution(summary) {
    injectCloudConflictModal();

    document.getElementById('conflictLocalSets').textContent = summary.localSets;
    document.getElementById('conflictLocalWeight').textContent = summary.localWeightEntries;
    document.getElementById('conflictLocalProfile').textContent = `Profil: ${summary.localHasProfile ? 'jest zapisany' : 'brak'}`;
    document.getElementById('conflictCloudSets').textContent = summary.cloudSets;
    document.getElementById('conflictCloudWeight').textContent = summary.cloudWeightEntries;
    document.getElementById('conflictCloudProfile').textContent = `Profil: ${summary.cloudHasProfile ? 'jest zapisany' : 'brak'}`;

    document.getElementById('cloudConflictModal')?.classList.remove('hidden');

    return new Promise(resolve => {
        dataConflictResolver = resolve;
    });
}

function injectAuthEmailModal() {
    if (document.getElementById('authEmailModal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="authEmailModal" class="hidden fixed inset-0 bg-black/80 z-[85] flex items-center justify-center p-4">
            <div class="bg-dark-card border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-in">
                <div class="mb-5">
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-neon-green mb-2">Logowanie do chmury</p>
                    <h2 class="text-2xl font-black text-gray-100">Podaj adres e-mail</h2>
                    <p class="text-sm text-gray-400 mt-2">Wyślemy Ci magic link do zalogowania i synchronizacji danych z Supabase.</p>
                </div>

                <form id="authEmailForm" class="space-y-4">
                    <div>
                        <label for="authEmailInput" class="block text-sm font-semibold text-gray-400 mb-2">Adres e-mail</label>
                        <input
                            type="email"
                            id="authEmailInput"
                            autocomplete="email"
                            required
                            class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent transition-all"
                            placeholder="np. jan@example.com"
                        >
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" id="cancelAuthEmailBtn" class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-3 rounded-2xl transition-colors">
                            Anuluj
                        </button>
                        <button type="submit" class="flex-1 bg-neon-green hover:bg-emerald-400 text-dark-bg font-black py-3 rounded-2xl transition-colors">
                            Wyślij link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    const modal = document.getElementById('authEmailModal');
    const form = document.getElementById('authEmailForm');
    const input = document.getElementById('authEmailInput');
    const cancelBtn = document.getElementById('cancelAuthEmailBtn');

    cancelBtn?.addEventListener('click', () => resolveAuthEmailModal(null));
    modal?.addEventListener('click', event => {
        if (event.target === modal) {
            resolveAuthEmailModal(null);
        }
    });

    form?.addEventListener('submit', event => {
        event.preventDefault();

        if (!input?.reportValidity()) {
            return;
        }

        const email = input.value.trim();
        if (!email) {
            return;
        }

        resolveAuthEmailModal(email);
    });
}

function resolveAuthEmailModal(email) {
    document.getElementById('authEmailModal')?.classList.add('hidden');

    const resolver = authEmailResolver;
    authEmailResolver = null;
    resolver?.(email);
}

function promptForCloudEmail(defaultValue = '') {
    injectAuthEmailModal();

    const modal = document.getElementById('authEmailModal');
    const input = document.getElementById('authEmailInput');

    if (input) {
        input.value = defaultValue;
    }

    modal?.classList.remove('hidden');

    requestAnimationFrame(() => {
        input?.focus();
        input?.select();
    });

    return new Promise(resolve => {
        authEmailResolver = resolve;
    });
}

async function updateAppModeUI() {
    const banner = document.getElementById('appModeBanner');
    const modal = document.getElementById('appModeModal');
    const title = document.getElementById('appModeTitle');
    const description = document.getElementById('appModeDescription');
    const actionBtn = document.getElementById('appModeActionBtn');
    const badge = document.getElementById('appModeBadge');

    if (!banner || !modal || !title || !description || !actionBtn || !badge) {
        return;
    }

    const mode = getAppMode();

    if (!mode) {
        banner.classList.add('hidden');
        modal.classList.remove('hidden');
        return;
    }

    modal.classList.add('hidden');
    banner.classList.remove('hidden');

    const pendingSync = getPendingCloudSyncQueue().length > 0 || localStorage.getItem(CLOUD_MIGRATION_REQUIRED_KEY) === 'true';

    if (mode === 'local') {
        badge.className = 'mt-1 h-2.5 w-2.5 rounded-full bg-amber-400';
        title.textContent = 'Tryb lokalny';
        description.textContent = 'Dane zapisują się tylko na tym urządzeniu. Zaloguj się, aby zabezpieczyć je w chmurze i mieć synchronizację między urządzeniami.';
        actionBtn.textContent = 'Zaloguj';
        return;
    }

    const status = await window.GymLogCloudSync?.getStatusSummary?.();

    if (!status?.configured) {
        badge.className = 'mt-1 h-2.5 w-2.5 rounded-full bg-orange-400';
        title.textContent = 'Tryb chmurowy — wymaga konfiguracji';
        description.textContent = 'Warstwa chmurowa jest już podpięta w aplikacji, ale trzeba jeszcze wkleić dane projektu Supabase do pliku konfiguracyjnego.';
        actionBtn.textContent = 'Konfiguruj';
        return;
    }

    if (!status.user) {
        badge.className = 'mt-1 h-2.5 w-2.5 rounded-full bg-blue-400';
        title.textContent = 'Tryb chmurowy — czeka na logowanie';
        description.textContent = pendingSync
            ? 'Wykryto lokalne dane do przeniesienia. Zaloguj się przez link e-mail, a aplikacja automatycznie wyśle je do chmury.'
            : 'Zaloguj się przez magic link, aby włączyć backup i synchronizację.';
        actionBtn.textContent = 'Wyślij link';
        return;
    }

    badge.className = `mt-1 h-2.5 w-2.5 rounded-full ${pendingSync ? 'bg-yellow-400' : 'bg-neon-green'}`;
    title.textContent = pendingSync ? 'Synchronizacja oczekuje' : 'Synchronizacja chmurowa aktywna';
    description.textContent = pendingSync
        ? `Konto: ${status.user.email || 'połączone'}. Zmiany czekają na zapis do chmury.`
        : `Konto: ${status.user.email || 'połączone'}. Ostatni sync: ${formatLastSyncDate(status.lastSync || localStorage.getItem(CLOUD_LAST_SYNC_KEY))}.`;
    actionBtn.textContent = 'Synchronizuj';
}

document.addEventListener('DOMContentLoaded', () => {
    injectFeedbackUI();
    injectAppModeUI();
    injectCloudConflictModal();
    injectAuthEmailModal();
    updateAppModeUI();

    if (getAppMode() === 'cloud' && window.GymLogCloudSync?.syncIfConfigured) {
        window.GymLogCloudSync.syncIfConfigured()
            .catch(err => console.error('Cloud sync startup error:', err))
            .finally(() => updateAppModeUI());
    }
});

window.addEventListener('online', () => {
    updateAppModeUI();

    if (getAppMode() === 'cloud' && window.GymLogCloudSync?.syncIfConfigured) {
        window.GymLogCloudSync.syncIfConfigured()
            .catch(err => console.error('Cloud sync retry error:', err))
            .finally(() => updateAppModeUI());
    }
});

window.updateAppModeUI = updateAppModeUI;
window.queuePendingCloudSync = queuePendingCloudSync;
window.markCloudSyncComplete = markCloudSyncComplete;
window.hasLocalDataToMigrate = hasLocalDataToMigrate;
window.promptCloudConflictResolution = promptCloudConflictResolution;
window.promptForCloudEmail = promptForCloudEmail;

// Sanitize user input
function sanitizeInput(input, maxLength = 40) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove URLs (http://, https://, www.)
    sanitized = sanitized.replace(/(https?:\/\/|www\.)[^\s]+/gi, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>"'`]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

// Load all sets from LocalStorage with migration
function loadSets() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const sets = JSON.parse(data);
    
    // Migrate old data: add type: 'weighted' if missing
    let needsMigration = false;
    const migrated = sets.map(set => {
        if (!set.type) {
            needsMigration = true;
            return { ...set, type: 'weighted' };
        }
        return set;
    });
    
    // Save migrated data
    if (needsMigration) {
        saveSets(migrated);
        console.log('Data migrated: added type field to', sets.length, 'entries');
    }
    
    return migrated;
}

// Save sets to LocalStorage
function saveSets(sets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    window.GymLogCloudSync?.markPendingChanges?.();
    window.queuePendingCloudSync?.('training_sets');
}

// Delete a set by ID
function deleteSet(id) {
    const sets = loadSets();
    const filtered = sets.filter(s => s.id !== id);
    saveSets(filtered);
    return filtered.length < sets.length; // Return true if something was deleted
}

// Update a set by ID
function updateSet(id, updates) {
    const sets = loadSets();
    const index = sets.findIndex(s => s.id === id);
    
    if (index === -1) {
        return false; // Set not found
    }
    
    // Update only provided fields
    sets[index] = {
        ...sets[index],
        ...updates,
        id: sets[index].id // Preserve ID
    };
    
    saveSets(sets);
    return true;
}

// Get unique exercise names for datalist
function getExerciseHistory() {
    const sets = loadSets();
    const exercises = [...new Set(sets.map(s => s.exercise))];
    return exercises.sort();
}

// Get last set for a specific exercise
function getLastSetForExercise(exerciseName) {
    const sets = loadSets();
    const exerciseSets = sets.filter(s => s.exercise.toLowerCase() === exerciseName.toLowerCase());
    return exerciseSets.length > 0 ? exerciseSets[0] : null;
}

// Group sets by exercise
function groupSetsByExercise() {
    const sets = loadSets();
    const grouped = {};
    
    sets.forEach(set => {
        if (!grouped[set.exercise]) {
            grouped[set.exercise] = [];
        }
        grouped[set.exercise].push(set);
    });
    
    return grouped;
}

// Get top 5 most frequent WEIGHTED exercises (excludes bodyweight and timed)
function getTopExercises() {
    const grouped = groupSetsByExercise();
    const exercises = Object.keys(grouped)
        .filter(name => {
            const sets = grouped[name];
            const type = sets[0].type || 'weighted';
            return type === 'weighted'; // Only weighted exercises
        })
        .map(name => ({
            name: name,
            count: grouped[name].length,
            totalVolume: grouped[name].reduce((sum, s) => sum + (s.weight * s.reps), 0)
        }));
    
    return exercises.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
}

// Get top 5 most frequent TIMED exercises
function getTopTimedExercises() {
    const grouped = groupSetsByExercise();
    const exercises = Object.keys(grouped)
        .filter(name => {
            const sets = grouped[name];
            const type = sets[0].type || 'weighted';
            return type === 'timed'; // Only timed exercises
        })
        .map(name => ({
            name: name,
            count: grouped[name].length,
            totalDuration: grouped[name].reduce((sum, s) => sum + (s.duration || 0), 0),
            totalDistance: grouped[name].reduce((sum, s) => sum + (s.distance || 0), 0)
        }));
    
    return exercises.sort((a, b) => b.count - a.count).slice(0, 5);
}

// Get personal records (max weight) for each exercise
function getPersonalRecords() {
    const grouped = groupSetsByExercise();
    const records = [];
    
    Object.keys(grouped).forEach(exerciseName => {
        const sets = grouped[exerciseName];
        const exerciseType = sets[0].type || 'weighted';
        
        let maxSet;
        if (exerciseType === 'weighted') {
            maxSet = sets.reduce((max, set) => 
                set.weight > max.weight ? set : max
            );
        } else if (exerciseType === 'bodyweight') {
            maxSet = sets.reduce((max, set) => 
                set.reps > max.reps ? set : max
            );
        } else if (exerciseType === 'timed') {
            // For timed: longest duration
            maxSet = sets.reduce((max, set) => 
                set.duration > max.duration ? set : max
            );
        }
        
        records.push({
            exercise: exerciseName,
            type: exerciseType,
            weight: maxSet.weight,
            reps: maxSet.reps,
            addedWeight: maxSet.addedWeight,
            duration: maxSet.duration,
            distance: maxSet.distance,
            date: maxSet.timestamp
        });
    });
    
    return records.sort((a, b) => {
        // Sort weighted by weight, bodyweight by reps, timed by duration
        if (a.type === 'weighted' && b.type === 'weighted') {
            return b.weight - a.weight;
        } else if (a.type === 'bodyweight' && b.type === 'bodyweight') {
            return b.reps - a.reps;
        } else if (a.type === 'timed' && b.type === 'timed') {
            return b.duration - a.duration;
        }
        // Mixed types - maintain alphabetical
        return a.exercise.localeCompare(b.exercise);
    });
}

// Check if new set is a personal record
function checkNewRecord(exercise, weight) {
    const exerciseSets = loadSets().filter(s => s.exercise === exercise);
    
    // Must have at least 1 previous set (so this is 2nd or more)
    if (exerciseSets.length < 1) {
        return null;
    }
    
    // Find previous max weight
    const previousMax = Math.max(...exerciseSets.map(s => s.weight));
    
    // Check if new weight beats the record
    if (weight > previousMax) {
        return {
            exercise: exercise,
            newWeight: weight,
            previousWeight: previousMax,
            improvement: weight - previousMax
        };
    }
    
    return null;
}

// Export data to JSON
function exportToJSON() {
    const sets = loadSets();
    
    if (sets.length === 0) {
        alert('Brak danych do wyeksportowania!');
        return;
    }
    
    // Create JSON content
    const json = JSON.stringify(sets, null, 2);
    
    // Create blob and download
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymlog_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Import data from JSON
function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedSets = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedSets)) {
                    reject(new Error('Nieprawidłowy format pliku JSON'));
                    return;
                }
                
                if (importedSets.length === 0) {
                    reject(new Error('Plik JSON jest pusty'));
                    return;
                }
                
                const existingSets = loadSets();
                const existingIds = new Set(existingSets.map(s => s.id));
                
                let imported = 0;
                let skipped = 0;
                const newSets = [];
                
                importedSets.forEach(set => {
                    // Validate required fields
                    if (!set.exercise) {
                        return; // Skip if no exercise name
                    }
                    
                    // Validate type-specific fields
                    const setType = set.type || 'weighted';
                    if (setType === 'weighted' && (set.weight === undefined || set.reps === undefined)) {
                        return; // Weighted needs weight and reps
                    }
                    if (setType === 'bodyweight' && set.reps === undefined) {
                        return; // Bodyweight needs reps
                    }
                    if (setType === 'timed' && (set.duration === undefined || set.distance === undefined)) {
                        return; // Timed needs duration and distance
                    }
                    
                    // Sanitize exercise name
                    const sanitizedExercise = sanitizeInput(set.exercise, 40);
                    if (!sanitizedExercise) {
                        return; // Skip if sanitization results in empty string
                    }
                    
                    // Generate ID if missing
                    if (!set.id) {
                        set.id = crypto.randomUUID();
                    }
                    
                    // Skip if ID already exists
                    if (existingIds.has(set.id)) {
                        skipped++;
                        return;
                    }
                    
                    // Ensure timestamp exists
                    if (!set.timestamp) {
                        set.timestamp = Date.now();
                    }
                    
                    // Build set object based on type
                    const newSet = {
                        id: set.id,
                        exercise: sanitizedExercise,
                        type: setType,
                        timestamp: set.timestamp
                    };
                    
                    // Add type-specific fields
                    if (setType === 'weighted') {
                        newSet.weight = parseFloat(set.weight);
                        newSet.reps = parseInt(set.reps);
                    } else if (setType === 'bodyweight') {
                        newSet.reps = parseInt(set.reps);
                        if (set.addedWeight !== undefined) {
                            newSet.addedWeight = parseFloat(set.addedWeight);
                        }
                        if (set.bodyWeight !== undefined) {
                            newSet.bodyWeight = parseFloat(set.bodyWeight);
                        }
                    } else if (setType === 'timed') {
                        newSet.duration = parseInt(set.duration);
                        newSet.distance = parseInt(set.distance);
                        if (set.avgPace !== undefined) {
                            newSet.avgPace = parseFloat(set.avgPace);
                        }
                    }
                    
                    newSets.push(newSet);
                    imported++;
                    existingIds.add(set.id);
                });
                
                if (imported > 0) {
                    // Merge and sort by timestamp (newest first)
                    const allSets = [...existingSets, ...newSets]
                        .sort((a, b) => b.timestamp - a.timestamp);
                    saveSets(allSets);
                }
                
                resolve({ imported, skipped });
            } catch (err) {
                if (err instanceof SyntaxError) {
                    reject(new Error('Nieprawidłowy format JSON'));
                } else {
                    reject(err);
                }
            }
        };
        
        reader.onerror = () => reject(new Error('Błąd odczytu pliku'));
        reader.readAsText(file, 'UTF-8');
    });
}

// Web Share API - Share a personal record
async function shareRecord(exercise, weight, reps) {
    const shareData = {
        title: 'GymLog - Mój rekord!',
        text: `Mój rekord w ${exercise} to ${weight}kg × ${reps}! 💪 Zrobione w #GymLog`,
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareData.text);
            alert('📋 Tekst skopiowany do schowka!\n\n' + shareData.text);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share error:', err);
        }
    }
}
