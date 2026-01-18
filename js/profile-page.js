// profile-page.js - Profile page logic

let weightChart;

async function loadProfile() {
    await new Promise(resolve => setTimeout(resolve, 500));

    const profile = await db.get('userProfile', 'main');
    if (profile) {
        document.getElementById('nickname').value = profile.nickname || '';
        document.getElementById('weight').value = profile.weight || '';
        document.getElementById('height').value = profile.height || '';
        calculateBMI();
    }

    await loadWeightHistory();

    // Notification toggle
    const notifToggle = document.getElementById('notificationsToggle');
    notifToggle.checked = notificationManager.isEnabled();
}

function calculateBMI() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100;

    if (weight > 0 && height > 0) {
        const bmi = (weight / (height * height)).toFixed(1);
        let category = '';
        let colorClass = '';

        if (bmi < 18.5) {
            category = 'Niedowaga';
            colorClass = 'alert-warning';
        } else if (bmi < 25) {
            category = 'Prawidłowa waga';
            colorClass = 'alert-success';
        } else if (bmi < 30) {
            category = 'Nadwaga';
            colorClass = 'alert-warning';
        } else {
            category = 'Otyłość';
            colorClass = 'alert-danger';
        }

        const bmiResult = document.getElementById('bmiResult');
        bmiResult.className = `alert ${colorClass}`;
        bmiResult.textContent = '';
        
        const strong = document.createElement('strong');
        strong.textContent = 'BMI:';
        bmiResult.appendChild(strong);
        bmiResult.appendChild(document.createTextNode(` ${bmi} - ${category}`));
        bmiResult.style.display = 'block';
    }
}

document.getElementById('weight').addEventListener('input', calculateBMI);
document.getElementById('height').addEventListener('input', calculateBMI);

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Zapisywanie profilu...');

    const profile = {
        id: 'main',
        nickname: document.getElementById('nickname').value,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        height: parseFloat(document.getElementById('height').value) || 0,
        updatedAt: new Date().toISOString()
    };

    await db.update('userProfile', profile);

    // Add weight to history
    if (profile.weight > 0) {
        await db.add('weightHistory', {
            weight: profile.weight,
            date: new Date().toISOString()
        });
        await loadWeightHistory();
    }

    hideLoading();
    showToast('Profil zapisany', 'success');
});

async function loadWeightHistory() {
    const history = await db.getAll('weightHistory');
    if (history.length === 0) return;

    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = history.map(h => uiManager.formatDateForInput(h.date));
    const weights = history.map(h => h.weight);

    const ctx = document.getElementById('weightChart').getContext('2d');
    
    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waga (kg)',
                data: weights,
                borderColor: '#ffa500',
                backgroundColor: 'rgba(255, 165, 0, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

document.getElementById('addWeightBtn').addEventListener('click', async () => {
    const weight = prompt('Podaj aktualną wagę (kg):');
    if (weight && !isNaN(weight)) {
        await db.add('weightHistory', {
            weight: parseFloat(weight),
            date: new Date().toISOString()
        });
        await loadWeightHistory();
        showToast('Pomiar dodany', 'success');
    }
});

document.getElementById('requestNotificationBtn').addEventListener('click', async () => {
    const granted = await notificationManager.requestPermission();
    if (granted) {
        showToast('Powiadomienia włączone', 'success');
        document.getElementById('notificationsToggle').checked = true;
    } else {
        showToast('Odmówiono dostępu do powiadomień', 'error');
    }
});

document.getElementById('clearDataBtn').addEventListener('click', async () => {
    const confirmed = await showConfirm(
        'Wyczyść dane',
        'Czy na pewno chcesz usunąć wszystkie dane? Tej operacji nie można cofnąć!'
    );

    if (confirmed) {
        showLoading('Czyszczenie danych...');
        await db.clear('sessions');
        await db.clear('exercises');
        await db.clear('locations');
        await db.clear('userProfile');
        await db.clear('weightHistory');
        hideLoading();
        showToast('Wszystkie dane zostały usunięte', 'success');
        setTimeout(() => window.location.href = './index.html', 2000);
    }
});

document.addEventListener('DOMContentLoaded', loadProfile);
