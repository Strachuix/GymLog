// stats-page.js - Statistics page logic

async function loadStats() {
    await new Promise(resolve => setTimeout(resolve, 500));

    const sessions = await sessionManager.getAllSessions();
    const exercises = await exerciseManager.getAllExercises();

    // Overall stats
    document.getElementById('totalSessions').textContent = sessions.length;
    document.getElementById('totalExercises').textContent = exercises.length;

    const totalWeight = exercises.reduce((sum, ex) => 
        sum + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)), 0);
    document.getElementById('totalWeight').textContent = Math.round(totalWeight);

    const totalTime = exercises.reduce((sum, ex) => sum + (ex.time || 0), 0);
    document.getElementById('totalTime').textContent = exerciseManager.formatTime(totalTime);

    // Monthly chart
    createMonthlyChart(sessions);

    // Category chart
    createCategoryChart(exercises);

    // Top exercises
    displayTopExercises(exercises);
}

function createMonthlyChart(sessions) {
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last6Months.push(date);
    }

    const labels = last6Months.map(d => d.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' }));
    const data = last6Months.map(month => {
        return sessions.filter(s => {
            const sDate = new Date(s.date);
            return sDate.getMonth() === month.getMonth() && sDate.getFullYear() === month.getFullYear();
        }).length;
    });

    const ctx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sesje treningowe',
                data: data,
                backgroundColor: '#ffa500',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function createCategoryChart(exercises) {
    const categories = {};
    exercises.forEach(ex => {
        const cat = ex.category || 'Inne';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#95a5a6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function displayTopExercises(exercises) {
    const exerciseCounts = {};
    exercises.forEach(ex => {
        exerciseCounts[ex.exerciseName] = (exerciseCounts[ex.exerciseName] || 0) + 1;
    });

    const sorted = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('topExercises');
    container.textContent = '';
    
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';
    
    const template = document.getElementById('topExerciseItemTemplate');
    
    sorted.forEach(([name, count], index) => {
        const item = template.content.cloneNode(true);
        item.querySelector('.exercise-rank').textContent = `${index + 1}.`;
        item.querySelector('.exercise-name').textContent = name;
        item.querySelector('.exercise-count').textContent = count;
        listGroup.appendChild(item);
    });
    
    container.appendChild(listGroup);
}

document.addEventListener('DOMContentLoaded', loadStats);
