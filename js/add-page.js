// add-page.js - Add exercise page logic

const urlParams = new URLSearchParams(window.location.search);
let sessionId = urlParams.get('sessionId');

// Set default date to today (no future dates)
document.getElementById('date').value = new Date().toISOString().split('T')[0];
document.getElementById('date').max = new Date().toISOString().split('T')[0];

// Cardio mode toggle
document.getElementById('cardioMode').addEventListener('change', (e) => {
    const isCardio = e.target.checked;
    document.getElementById('regularFields').style.display = isCardio ? 'none' : 'block';
    document.getElementById('cardioFields').style.display = isCardio ? 'block' : 'none';
    
    if (isCardio) {
        document.getElementById('category').value = 'Cardio';
    }
});

// Timer controls
document.getElementById('startTimerBtn').addEventListener('click', () => {
    exerciseManager.startTimer(exerciseManager.getTimerValue());
});

document.getElementById('pauseTimerBtn').addEventListener('click', () => {
    exerciseManager.pauseTimer();
    document.getElementById('timeValue').value = exerciseManager.getTimerValue();
});

document.getElementById('resetTimerBtn').addEventListener('click', () => {
    exerciseManager.resetTimer();
    document.getElementById('timeValue').value = 0;
});

// Get location
document.getElementById('getLocationBtn').addEventListener('click', async () => {
    const btn = document.getElementById('getLocationBtn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '';
    const spinner = document.createElement('span');
    spinner.className = 'spinner-border spinner-border-sm';
    btn.appendChild(spinner);
    
    try {
        const location = await exerciseManager.getCurrentLocation();
        document.getElementById('locationName').value = location.locationName;
        document.getElementById('locationLat').value = location.coords.lat;
        document.getElementById('locationLng').value = location.coords.lng;
        showToast('Lokalizacja pobrana', 'success');
    } catch (error) {
        showToast('Nie udało się pobrać lokalizacji', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
});

// Take picture
document.getElementById('takePictureBtn').addEventListener('click', async () => {
    try {
        showLoading('Uruchamianie kamery...');
        const photo = await exerciseManager.capturePhoto();
        hideLoading();
        displayPhoto(photo);
        showToast('Zdjęcie zrobione', 'success');
    } catch (error) {
        hideLoading();
        showToast('Nie udało się zrobić zdjęcia: ' + error.message, 'error');
    }
});

// Select picture
document.getElementById('selectPictureBtn').addEventListener('click', async () => {
    try {
        showLoading('Ładowanie zdjęcia...');
        const photo = await exerciseManager.selectPhotoFromFile();
        hideLoading();
        displayPhoto(photo);
        showToast('Zdjęcie wybrane', 'success');
    } catch (error) {
        hideLoading();
        showToast('Nie udało się wybrać zdjęcia', 'error');
    }
});

function displayPhoto(photoData) {
    document.getElementById('photoData').value = photoData;
    const container = document.getElementById('photoPreviewContainer');
    container.textContent = '';
    
    const template = document.getElementById('photoPreviewTemplate');
    const preview = template.content.cloneNode(true);
    preview.querySelector('.photo-preview').src = photoData;
    preview.querySelector('.photo-remove-btn').onclick = removePhoto;
    
    container.appendChild(preview);
}

function removePhoto() {
    document.getElementById('photoData').value = '';
    document.getElementById('photoPreviewContainer').textContent = '';
}

// Form submission
document.getElementById('exerciseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Ensure we have a session
    if (!sessionId) {
        showLoading('Tworzenie sesji...');
        const session = await sessionManager.createSession();
        sessionId = session.id;
        hideLoading();
    }

    showLoading('Zapisywanie ćwiczenia...');

    try {
        const isCardio = document.getElementById('cardioMode').checked;
        
        const exerciseData = {
            exerciseName: document.getElementById('exerciseName').value,
            category: document.getElementById('category').value,
            date: new Date(document.getElementById('date').value).toISOString(),
            notes: document.getElementById('notes').value,
            photo: document.getElementById('photoData').value,
            sessionId: sessionId
        };

        if (isCardio) {
            exerciseData.time = exerciseManager.getTimerValue();
            exerciseData.sets = 0;
            exerciseData.reps = 0;
            exerciseData.weight = 0;
        } else {
            exerciseData.sets = parseInt(document.getElementById('sets').value) || 0;
            exerciseData.reps = parseInt(document.getElementById('reps').value) || 0;
            exerciseData.weight = parseFloat(document.getElementById('weight').value) || 0;
            exerciseData.time = 0;
        }

        // Location
        const locationName = document.getElementById('locationName').value;
        if (locationName) {
            exerciseData.location = {
                locationName: locationName,
                coords: {
                    lat: parseFloat(document.getElementById('locationLat').value) || 0,
                    lng: parseFloat(document.getElementById('locationLng').value) || 0
                }
            };
        }

        await exerciseManager.addExercise(exerciseData);
        hideLoading();
        showToast('Ćwiczenie dodane!', 'success');
        
        setTimeout(() => {
            window.location.href = `./session.html?id=${sessionId}`;
        }, 1000);

    } catch (error) {
        hideLoading();
        console.error('Failed to add exercise:', error);
        showToast('Błąd: ' + error.message, 'error');
    }
});
