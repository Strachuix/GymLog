const PROFILE_KEY = 'gymlog_profile';
const WEIGHT_HISTORY_KEY = 'gymlog_weight_history';

// Load profile data
function loadProfile() {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
}

// Save profile data
function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Load weight history
function loadWeightHistory() {
    const data = localStorage.getItem(WEIGHT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
}

// Save weight history
function saveWeightHistory(history) {
    localStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(history));
}

// Calculate BMI
function calculateBMI(weight, height) {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
}

// Get BMI category
function getBMICategory(bmi) {
    if (bmi < 18.5) return { text: 'Niedowaga', color: 'bg-yellow-500', textColor: 'text-yellow-900' };
    if (bmi < 25) return { text: 'Norma', color: 'bg-green-500', textColor: 'text-green-900' };
    if (bmi < 30) return { text: 'Nadwaga', color: 'bg-orange-500', textColor: 'text-orange-900' };
    return { text: 'Otyłość', color: 'bg-red-500', textColor: 'text-red-900' };
}

// Update display
function updateDisplay() {
    const profile = loadProfile();
    const weightHistory = loadWeightHistory();

    if (profile) {
        // Display username
        document.getElementById('displayUsername').textContent = profile.username || 'GymLog User';
        
        // Display profile picture
        if (profile.profilePic) {
            document.getElementById('profilePicDisplay').src = profile.profilePic;
            document.getElementById('profilePicDisplay').classList.remove('hidden');
            document.getElementById('profilePicPlaceholder').classList.add('hidden');
        } else {
            document.getElementById('profilePicDisplay').classList.add('hidden');
            document.getElementById('profilePicPlaceholder').classList.remove('hidden');
        }
        
        document.getElementById('displayAge').textContent = profile.age || '-';
        document.getElementById('displayHeight').textContent = profile.height ? `${profile.height} cm` : '-';
        
        // Set form values
        document.getElementById('username').value = profile.username || '';
        if (profile.gender) {
            document.querySelector(`input[name="gender"][value="${profile.gender}"]`).checked = true;
        }
        document.getElementById('age').value = profile.age || '';
        document.getElementById('height').value = profile.height || '';
        document.getElementById('oneRmFormula').value = profile.oneRmFormula || 'epley';

        // Get latest weight
        const latestWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
        document.getElementById('displayWeight').textContent = latestWeight ? `${latestWeight} kg` : '-';

        // Calculate and display BMI
        if (profile.height && latestWeight) {
            const bmi = calculateBMI(latestWeight, profile.height);
            const category = getBMICategory(bmi);
            
            document.getElementById('bmiValue').textContent = bmi.toFixed(1);
            const categoryEl = document.getElementById('bmiCategory');
            categoryEl.textContent = category.text;
            categoryEl.className = `px-3 py-1 rounded-full text-sm font-bold ${category.color} ${category.textColor}`;
            
            const bmiBar = document.getElementById('bmiBar');
            const percentage = Math.min((bmi / 40) * 100, 100);
            bmiBar.style.width = `${percentage}%`;
            bmiBar.className = `h-full transition-all duration-500 ${category.color}`;
            
            document.getElementById('bmiCard').classList.remove('hidden');
        } else {
            document.getElementById('bmiCard').classList.add('hidden');
        }
    }

    // Update weight chart and history
    if (weightHistory.length > 0) {
        displayWeightChart(weightHistory);
        displayWeightHistory(weightHistory);
        document.getElementById('weightChartContainer').classList.remove('hidden');
        document.getElementById('weightHistoryContainer').classList.remove('hidden');
    } else {
        document.getElementById('weightChartContainer').classList.add('hidden');
        document.getElementById('weightHistoryContainer').classList.add('hidden');
    }
}

// Display weight chart
function displayWeightChart(history) {
    const sortedHistory = history.slice().reverse(); // Oldest to newest
    const ctx = document.getElementById('weightChart');
    
    // Destroy existing chart if any
    if (window.weightChartInstance) {
        window.weightChartInstance.destroy();
    }

    window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedHistory.map(entry => {
                const date = new Date(entry.timestamp);
                return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
                label: 'Waga (kg)',
                data: sortedHistory.map(entry => entry.weight),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 30, 0.95)',
                    titleColor: '#8b5cf6',
                    bodyColor: '#fff',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => {
                            const index = items[0].dataIndex;
                            const date = new Date(sortedHistory[index].timestamp);
                            return date.toLocaleDateString('pl-PL');
                        },
                        label: (context) => {
                            return `${context.parsed.y} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(75, 85, 99, 0.3)' },
                    ticks: { color: '#6b7280', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(75, 85, 99, 0.3)' },
                    ticks: { 
                        color: '#8b5cf6', 
                        font: { size: 11, weight: 'bold' },
                        callback: (value) => value + ' kg'
                    }
                }
            }
        }
    });

    // Calculate statistics
    const weights = sortedHistory.map(e => e.weight);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const change = lastWeight - firstWeight;
    const average = weights.reduce((sum, w) => sum + w, 0) / weights.length;

    const changeEl = document.getElementById('weightChange');
    changeEl.textContent = change >= 0 ? `+${change.toFixed(1)} kg` : `${change.toFixed(1)} kg`;
    changeEl.className = `text-lg font-bold ${change >= 0 ? 'text-red-400' : 'text-neon-green'}`;
    
    document.getElementById('weightAverage').textContent = `${average.toFixed(1)} kg`;
    document.getElementById('weightCount').textContent = weights.length;
}

// Display weight history list
function displayWeightHistory(history) {
    const container = document.getElementById('weightHistory');
    container.innerHTML = history.map((entry, index) => {
        const date = new Date(entry.timestamp);
        return `
            <div class="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                <div>
                    <p class="text-sm font-bold text-gray-200">${entry.weight} kg</p>
                    <p class="text-xs text-gray-500">${date.toLocaleDateString('pl-PL')}</p>
                </div>
                <button onclick="deleteWeightEntry(${index})" class="text-red-400 hover:text-red-300 p-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

// Delete weight entry - make it global
window.deleteWeightEntry = function(index) {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
    
    const history = loadWeightHistory();
    history.splice(index, 1);
    saveWeightHistory(history);
    updateDisplay();
}

// Photo dialog controls
window.showPhotoOptions = function() {
    document.getElementById('photoDialog').classList.remove('hidden');
}

window.closePhotoDialog = function() {
    document.getElementById('photoDialog').classList.add('hidden');
}

// Check camera permissions before opening
window.selectCamera = async function() {
    closePhotoDialog();
    
    try {
        // Check if Permissions API is supported
        if (navigator.permissions && navigator.permissions.query) {
            const result = await navigator.permissions.query({ name: 'camera' });
            
            if (result.state === 'denied') {
                showCameraBlockedModal();
                return;
            }
        }
        
        // If permissions are granted or prompt, open camera input
        document.getElementById('cameraInput').click();
    } catch (error) {
        console.error('Error checking camera permissions:', error);
        // Fallback: try to open camera anyway (for browsers without Permissions API)
        document.getElementById('cameraInput').click();
    }
}

window.selectGallery = function() {
    closePhotoDialog();
    document.getElementById('galleryInput').click();
}

// Show camera blocked modal
function showCameraBlockedModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-dark-card rounded-xl p-6 max-w-sm w-full border border-gray-800">
            <div class="flex items-center gap-3 mb-4">
                <div class="bg-red-500/20 p-3 rounded-lg">
                    <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-200">Aparat zablokowany</h3>
            </div>
            <p class="text-gray-400 mb-6">
                Dostęp do aparatu jest zablokowany w ustawieniach przeglądarki. 
                Aby zrobić zdjęcie, musisz włączyć uprawnienia do aparatu.
            </p>
            <div class="space-y-3">
                <button onclick="this.closest('.fixed').remove()" class="w-full bg-neon-green hover:bg-emerald-400 text-dark-bg font-bold py-3 rounded-lg transition-colors">
                    Rozumiem
                </button>
                <p class="text-xs text-gray-500 text-center">
                    Kliknij ikonę 🔒 w pasku adresu, aby zmienić ustawienia
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Compress image to WebP format (max 200KB)
async function compressImageToWebP(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Start with reasonable size
                const maxDimension = 800;
                if (width > height && width > maxDimension) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Try different quality levels to get under 200KB
                let quality = 0.9;
                let result = canvas.toDataURL('image/webp', quality);
                
                // Keep reducing quality until file is under 200KB
                while (result.length > 200 * 1024 * 1.37 && quality > 0.1) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/webp', quality);
                }
                
                resolve(result);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Handle photo upload from camera or gallery
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        try {
            const compressedImage = await compressImageToWebP(file);
            const profile = loadProfile() || {};
            profile.profilePic = compressedImage;
            localStorage.setItem('gymlog_profile', JSON.stringify(profile));
            updateDisplay();
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Błąd podczas przetwarzania zdjęcia');
        }
    }
    // Reset input
    e.target.value = '';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Clear weight history
    document.getElementById('clearWeightHistoryBtn').addEventListener('click', () => {
        if (!confirm('Czy na pewno chcesz usunąć całą historię wagi?')) return;
        
        saveWeightHistory([]);
        document.getElementById('weightChartContainer').classList.add('hidden');
        document.getElementById('weightHistoryContainer').classList.add('hidden');
        updateDisplay();
    });

    // Profile form submit
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const age = parseInt(document.getElementById('age').value);
        const height = parseInt(document.getElementById('height').value);
        const oneRmFormula = document.getElementById('oneRmFormula').value;

        if (!gender || !age || !height) {
            alert('Wypełnij wszystkie pola!');
            return;
        }

        const existingProfile = loadProfile() || {};
        const profile = { 
            username: username || 'GymLog User',
            profilePic: existingProfile.profilePic || null,
            gender, 
            age, 
            height,
            oneRmFormula: oneRmFormula || 'epley'
        };
        saveProfile(profile);
        updateDisplay();
        alert('✅ Dane zapisane!');
    });

    // Weight form submit
    document.getElementById('weightForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const weight = parseFloat(document.getElementById('weight').value);
        const date = document.getElementById('weightDate').value;

        if (!weight || !date) {
            alert('Wypełnij wszystkie pola!');
            return;
        }

        const history = loadWeightHistory();
        history.unshift({
            timestamp: new Date(date).toISOString(),
            weight: weight
        });
        
        saveWeightHistory(history);
        updateDisplay();
        
        // Reset form
        document.getElementById('weight').value = '';
        document.getElementById('weightDate').value = '';
        
        alert('✅ Wpis dodany!');
    });

    // Set today's date as default
    document.getElementById('weightDate').valueAsDate = new Date();

    // Photo upload handlers
    document.getElementById('cameraInput').addEventListener('change', handlePhotoUpload);
    document.getElementById('galleryInput').addEventListener('change', handlePhotoUpload);

    // Initialize
    updateDisplay();

    // Get version from Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Service Worker registered');
                // Get version
                if (navigator.serviceWorker.controller) {
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data.type === 'VERSION') {
                            document.getElementById('appVersion').textContent = `v${event.data.version}`;
                        }
                    };
                    navigator.serviceWorker.controller.postMessage(
                        { type: 'GET_VERSION' },
                        [messageChannel.port2]
                    );
                }
            })
            .catch(err => console.log('Service Worker registration failed:', err));
    }
});
