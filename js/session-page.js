// session-page.js - Session details page logic

const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('id');

async function loadSession() {
    if (!sessionId) {
        window.location.href = './index.html';
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            showToast('Sesja nie została znaleziona', 'error');
            setTimeout(() => window.location.href = './index.html', 2000);
            return;
        }

        // Validate and fix session data
        const sessionName = session.sessionName || 'Sesja bez nazwy';
        const sessionDate = session.date || new Date().toISOString();

        document.getElementById('sessionName').textContent = sessionName;
        document.getElementById('sessionDate').textContent = uiManager.formatDate(sessionDate);
        document.getElementById('addExerciseBtn').href = `./add.html?sessionId=${sessionId}`;

        await loadExercises();
    } catch (error) {
        console.error('Error loading session:', error);
        showToast('Błąd ładowania sesji. Spróbuj usunąć tę sesję.', 'error');
        setTimeout(() => window.location.href = './index.html', 3000);
    }
}

async function loadExercises() {
    const container = document.getElementById('exercisesContainer');
    
    try {
        const exercises = await exerciseManager.getExercisesBySession(sessionId);
        document.getElementById('exerciseCount').textContent = exercises.length;

        if (exercises.length === 0) {
            uiManager.renderEmptyState(container, 'Brak ćwiczeń. Dodaj pierwsze ćwiczenie!', 'bi-list-check');
            return;
        }

        container.textContent = '';
        const template = document.getElementById('exerciseCardTemplate');
        
        for (const exercise of exercises) {
            try {
                // Validate exercise data
                const exerciseName = exercise.exerciseName || 'Ćwiczenie bez nazwy';
                const category = exercise.category || 'Inne';
                const categoryClass = `category-${category.toLowerCase().replace(/\s/g, '-')}`;
                
                // Clone template
                const card = template.content.cloneNode(true);
                const cardElement = card.querySelector('.exercise-card');
                
                cardElement.onclick = () => window.location.href = `./exercise.html?id=${exercise.id}`;
                
                const categoryBadge = card.querySelector('.category-badge');
                categoryBadge.classList.add(categoryClass);
                categoryBadge.textContent = category;
                
                card.querySelector('.exercise-name').textContent = exerciseName;
                
                const detailsContainer = card.querySelector('.exercise-details');
                detailsContainer.textContent = '';
                
                if (exercise.sets) {
                    const setBadge = document.createElement('span');
                    setBadge.className = 'detail-badge';
                    setBadge.textContent = `${exercise.sets} serii`;
                    detailsContainer.appendChild(setBadge);
                }
                
                if (exercise.reps) {
                    const repBadge = document.createElement('span');
                    repBadge.className = 'detail-badge';
                    repBadge.textContent = `${exercise.reps} powtórzeń`;
                    detailsContainer.appendChild(repBadge);
                }
                
                if (exercise.weight) {
                    const weightBadge = document.createElement('span');
                    weightBadge.className = 'detail-badge';
                    weightBadge.textContent = `${exercise.weight} kg`;
                    detailsContainer.appendChild(weightBadge);
                }
                
                if (exercise.time) {
                    const timeBadge = document.createElement('span');
                    timeBadge.className = 'detail-badge';
                    timeBadge.textContent = exerciseManager.formatTime(exercise.time);
                    detailsContainer.appendChild(timeBadge);
                }
                
                const notesEl = card.querySelector('.exercise-notes');
                if (exercise.notes) {
                    notesEl.innerHTML = `<i class="bi bi-chat-left-text"></i> ${exercise.notes}`;
                } else {
                    notesEl.remove();
                }
                
                container.appendChild(card);
            } catch (error) {
                console.error('Error rendering exercise:', exercise, error);
                continue;
            }
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
        uiManager.renderErrorState(container, 'Błąd ładowania ćwiczeń');
    }
}

document.getElementById('editSessionBtn').addEventListener('click', async () => {
    const newName = prompt('Podaj nową nazwę sesji:');
    if (newName && newName.trim()) {
        showLoading();
        await sessionManager.updateSession(sessionId, { sessionName: newName.trim() });
        await loadSession();
        hideLoading();
        showToast('Nazwa sesji zmieniona', 'success');
    }
});

document.getElementById('deleteSessionBtn').addEventListener('click', async () => {
    const confirmed = await showConfirm('Usuń sesję', 'Czy na pewno usunąć tę sesję i wszystkie ćwiczenia?');
    if (confirmed) {
        showLoading();
        await sessionManager.deleteSession(sessionId);
        hideLoading();
        showToast('Sesja usunięta', 'success');
        window.location.href = './index.html';
    }
});

document.addEventListener('DOMContentLoaded', loadSession);
