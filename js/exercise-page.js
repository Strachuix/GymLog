// exercise-page.js - Exercise details page logic

const urlParams = new URLSearchParams(window.location.search);
const exerciseId = urlParams.get('id');

async function loadExercise() {
    if (!exerciseId) {
        window.location.href = './index.html';
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const exercise = await exerciseManager.getExercise(exerciseId);
    if (!exercise) {
        showToast('Ćwiczenie nie znalezione', 'error');
        setTimeout(() => window.location.href = './index.html', 2000);
        return;
    }

    displayExercise(exercise);
    await displayHistory(exercise.exerciseName);
}

function displayExercise(exercise) {
    const container = document.getElementById('exerciseDetails');
    container.textContent = '';
    
    const template = document.getElementById('exerciseDetailsTemplate');
    const card = template.content.cloneNode(true);
    
    const categoryClass = `category-${exercise.category.toLowerCase().replace(/\s/g, '-')}`;
    
    // Set basic info
    card.querySelector('.exercise-name').textContent = exercise.exerciseName;
    const categoryBadge = card.querySelector('.exercise-category');
    categoryBadge.textContent = exercise.category;
    categoryBadge.classList.add(categoryClass);
    
    const dateEl = card.querySelector('.exercise-date');
    dateEl.innerHTML = `<i class="bi bi-calendar"></i> ${uiManager.formatDate(exercise.date, true)}`;
    
    // Stats section
    const statsContainer = card.querySelector('.exercise-stats');
    if (exercise.time > 0) {
        const timeAlert = document.createElement('div');
        timeAlert.className = 'alert alert-info';
        timeAlert.innerHTML = `<i class="bi bi-clock"></i> <strong>Czas:</strong> ${exerciseManager.formatTime(exercise.time)}`;
        statsContainer.appendChild(timeAlert);
    } else {
        const row = document.createElement('div');
        row.className = 'row text-center mb-3';
        
        // Sets
        const setsCol = document.createElement('div');
        setsCol.className = 'col-4';
        setsCol.innerHTML = `<div class="stat-card"><div class="stat-value">${exercise.sets}</div><div class="stat-label">Serie</div></div>`;
        row.appendChild(setsCol);
        
        // Reps
        const repsCol = document.createElement('div');
        repsCol.className = 'col-4';
        repsCol.innerHTML = `<div class="stat-card"><div class="stat-value">${exercise.reps}</div><div class="stat-label">Powtórzenia</div></div>`;
        row.appendChild(repsCol);
        
        // Weight
        const weightCol = document.createElement('div');
        weightCol.className = 'col-4';
        weightCol.innerHTML = `<div class="stat-card"><div class="stat-value">${exercise.weight}</div><div class="stat-label">kg</div></div>`;
        row.appendChild(weightCol);
        
        statsContainer.appendChild(row);
    }
    
    // Notes
    const notesContainer = card.querySelector('.exercise-notes');
    if (exercise.notes) {
        const notesAlert = document.createElement('div');
        notesAlert.className = 'alert alert-secondary';
        notesAlert.innerHTML = `<strong><i class="bi bi-chat-left-text"></i> Notatki:</strong><br>${exercise.notes}`;
        notesContainer.appendChild(notesAlert);
    }
    
    // Location
    const locationContainer = card.querySelector('.exercise-location');
    if (exercise.location) {
        const locationAlert = document.createElement('div');
        locationAlert.className = 'alert alert-warning';
        locationAlert.innerHTML = `<i class="bi bi-geo-alt-fill"></i> <strong>Lokalizacja:</strong> ${exercise.location.locationName}`;
        locationContainer.appendChild(locationAlert);
    }
    
    // Photo
    const photoContainer = card.querySelector('.exercise-photo');
    if (exercise.photo) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'text-center mb-3';
        const img = document.createElement('img');
        img.src = exercise.photo;
        img.className = 'photo-preview';
        img.alt = 'Exercise photo';
        photoDiv.appendChild(img);
        photoContainer.appendChild(photoDiv);
    }
    
    // Buttons
    card.querySelector('.delete-exercise-btn').onclick = deleteExercise;
    card.querySelector('.share-exercise-btn').onclick = shareExercise;
    
    container.appendChild(card);
}

async function displayHistory(exerciseName) {
    const history = await exerciseManager.getExerciseHistory(exerciseName);
    
    if (history.length <= 1) return;

    const container = document.getElementById('exerciseHistory');
    container.textContent = '';
    
    const template = document.getElementById('historyChartTemplate');
    const chartCard = template.content.cloneNode(true);
    
    container.appendChild(chartCard);

    // Create chart
    const ctx = container.querySelector('.progress-chart').getContext('2d');
    const labels = history.map(e => uiManager.formatDateForInput(e.date));
    const weights = history.map(e => e.weight || 0);
    const reps = history.map(e => e.reps || 0);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ciężar (kg)',
                data: weights,
                borderColor: '#ffa500',
                backgroundColor: 'rgba(255, 165, 0, 0.1)',
                tension: 0.4
            }, {
                label: 'Powtórzenia',
                data: reps,
                borderColor: '#17a2b8',
                backgroundColor: 'rgba(23, 162, 184, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

async function deleteExercise() {
    const confirmed = await showConfirm('Usuń ćwiczenie', 'Czy na pewno usunąć to ćwiczenie?');
    if (confirmed) {
        showLoading();
        await exerciseManager.deleteExercise(exerciseId);
        hideLoading();
        showToast('Ćwiczenie usunięte', 'success');
        history.back();
    }
}

async function shareExercise() {
    const exercise = await exerciseManager.getExercise(exerciseId);
    const text = `${exercise.exerciseName} - ${exercise.sets}x${exercise.reps} @ ${exercise.weight}kg`;
    await uiManager.share({ title: 'GymLog', text: text, url: window.location.href });
}

document.addEventListener('DOMContentLoaded', loadExercise);
