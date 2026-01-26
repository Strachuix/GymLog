// index-page.js - Dashboard page logic

async function loadDashboard() {
    try {
        // Wait for DB to initialize
        await new Promise(resolve => {
            if (db.db) {
                resolve();
            } else {
                setTimeout(resolve, 500);
            }
        });

        // Load statistics
        const sessions = await sessionManager.getAllSessions();
        const exercises = await exerciseManager.getAllExercises();
        
        // Update stats
        document.getElementById('totalSessions').textContent = sessions.length;
        document.getElementById('totalExercises').textContent = exercises.length;
        
        // This week sessions
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekSessions = sessions.filter(s => new Date(s.date) >= oneWeekAgo);
        document.getElementById('thisWeekSessions').textContent = thisWeekSessions.length;
        
        // Total weight
        const totalWeight = exercises.reduce((sum, ex) => {
            return sum + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0));
        }, 0);
        document.getElementById('totalWeight').textContent = Math.round(totalWeight);

        // Load sessions
        await loadSessions();

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        uiManager.renderErrorState(
            document.getElementById('sessionsContainer'),
            'Nie udało się załadować danych'
        );
    }
}

async function loadSessions() {
    const container = document.getElementById('sessionsContainer');
    const sessions = await sessionManager.getAllSessions();

    if (sessions.length === 0) {
        uiManager.renderEmptyState(
            container,
            'Brak sesji treningowych. Rozpocznij pierwszy trening!',
            'bi-calendar-x'
        );
        return;
    }

    // Clear container
    container.textContent = '';

    // Display only recent 10 sessions
    const recentSessions = sessions.slice(0, 10);
    const template = document.getElementById('sessionCardTemplate');

    for (const session of recentSessions) {
        try {
            // Validate session data
            const sessionName = session.sessionName || 'Sesja bez nazwy';
            const sessionDate = session.date || new Date().toISOString();
            const sessionId = session.id;

            if (!sessionId) {
                console.warn('Session without ID, skipping:', session);
                continue;
            }

            const stats = await sessionManager.getSessionStats(sessionId);

            // Clone template
            const card = template.content.cloneNode(true);
            const cardElement = card.querySelector('.session-card');
            
            // Set onclick for navigation
            cardElement.onclick = () => window.location.href = `./session.html?id=${sessionId}`;
            cardElement.classList.add('fade-in');
            
            // Fill data
            card.querySelector('.session-name').textContent = sessionName;
            card.querySelector('.session-date').innerHTML = `<i class="bi bi-calendar"></i> ${uiManager.formatDate(sessionDate)} <span class="text-muted ms-2">(${uiManager.getRelativeTime(sessionDate)})</span>`;
            
            // Build session stats
            const statsContainer = card.querySelector('.session-stats');
            statsContainer.textContent = '';
            
            // Add exercise count
            const exerciseCount = document.createElement('div');
            exerciseCount.className = 'stat-item';
            exerciseCount.innerHTML = `<i class="bi bi-list-check"></i> ${stats.totalExercises || 0} ćwiczeń`;
            statsContainer.appendChild(exerciseCount);
            
            // Add sets count
            const setsCount = document.createElement('div');
            setsCount.className = 'stat-item';
            setsCount.innerHTML = `<i class="bi bi-layers"></i> ${stats.totalSets || 0} serii`;
            statsContainer.appendChild(setsCount);
            
            // Add weight if available
            if (stats.totalWeight > 0) {
                const weightStat = document.createElement('div');
                weightStat.className = 'stat-item';
                weightStat.innerHTML = `<i class="bi bi-box"></i> ${Math.round(stats.totalWeight)} kg`;
                statsContainer.appendChild(weightStat);
            }
            
            // Add time if available
            if (stats.totalTime > 0) {
                const timeStat = document.createElement('div');
                timeStat.className = 'stat-item';
                timeStat.innerHTML = `<i class="bi bi-clock"></i> ${exerciseManager.formatTime(stats.totalTime)}`;
                statsContainer.appendChild(timeStat);
            }
            
            // Setup delete button
            card.querySelector('.delete-session').onclick = (e) => {
                e.stopPropagation();
                deleteSession(sessionId);
            };
            
            container.appendChild(card);
        } catch (error) {
            console.error('Error loading session:', session, error);
            // Skip broken sessions
            continue;
        }
    }
}

async function deleteSession(sessionId) {
    const confirmed = await showConfirm(
        'Usuń sesję',
        'Czy na pewno chcesz usunąć tę sesję? Wszystkie ćwiczenia zostaną usunięte.'
    );

    if (confirmed) {
        showLoading('Usuwanie sesji...');
        try {
            await sessionManager.deleteSession(sessionId);
            showToast('Sesja została usunięta', 'success');
            await loadDashboard();
        } catch (error) {
            console.error('Failed to delete session:', error);
            showToast('Nie udało się usunąć sesji', 'error');
        } finally {
            hideLoading();
        }
    }
}

// Event listeners
document.getElementById('newTrainingBtn').addEventListener('click', async () => {
    showLoading('Tworzenie sesji...');
    try {
        const session = await sessionManager.createSession();
        hideLoading();
        showToast('Utworzono nową sesję', 'success');
        window.location.href = `./add.html?sessionId=${session.id}`;
    } catch (error) {
        hideLoading();
        console.error('Failed to create session:', error);
        showToast('Nie udało się utworzyć sesji', 'error');
    }
});

document.getElementById('quickAddBtn').addEventListener('click', async () => {
    showLoading('Tworzenie sesji...');
    try {
        const session = await sessionManager.createSession();
        hideLoading();
        showToast('Utworzono nową sesję', 'success');
        window.location.href = `./add.html?sessionId=${session.id}`;
    } catch (error) {
        hideLoading();
        console.error('Failed to create session:', error);
        showToast('Nie udało się utworzyć sesji', 'error');
    }
});

document.getElementById('newSessionBtn').addEventListener('click', async () => {
    showLoading('Tworzenie sesji...');
    try {
        const session = await sessionManager.createSession();
        hideLoading();
        showToast('Utworzono nową sesję', 'success');
        window.location.href = `./session.html?id=${session.id}`;
    } catch (error) {
        hideLoading();
        console.error('Failed to create session:', error);
        showToast('Nie udało się utworzyć sesji', 'error');
    }
});

document.getElementById('exportBtn').addEventListener('click', async () => {
    showLoading('Eksportowanie danych...');
    try {
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gymlog_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        hideLoading();
        showToast('Dane wyeksportowane pomyślnie', 'success');
    } catch (error) {
        hideLoading();
        console.error('Failed to export data:', error);
        showToast('Nie udało się wyeksportować danych', 'error');
    }
});

document.getElementById('importBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showLoading('Importowanie danych...');
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await db.importData(data);
            hideLoading();
            
            if (result.success) {
                showToast('Dane zaimportowane pomyślnie', 'success');
                await loadDashboard();
            } else {
                showToast(`Błąd importu: ${result.message}`, 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Failed to import data:', error);
            showToast('Nie udało się zaimportować danych', 'error');
        }
    };
    input.click();
});

const backToTopBtn = document.getElementById('backToTopBtn');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});

backToTopBtn.addEventListener('click', () => {
    uiManager.scrollToTop();
});

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
