// Main Training Page JavaScript

// State
let selectedType = 'weighted';
let currentRecord = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateWakeLockUI(false);
    loadExerciseHistory();
    displayRecentSets();
    selectExerciseType('weighted'); // Set default
    
    // Form submission
    document.getElementById('trainingForm').addEventListener('submit', handleFormSubmit);
    
    // Listen for input changes to show suggestions (weighted only)
    document.getElementById('exercise').addEventListener('input', checkSuggestion);
    document.getElementById('reps').addEventListener('input', checkSuggestion);
});

// Select exercise type
function selectExerciseType(type) {
    selectedType = type;
    
    // Update button styles
    document.querySelectorAll('.exercise-type-btn').forEach(btn => {
        btn.className = 'exercise-type-btn py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 border-gray-700 bg-dark-card text-gray-400';
    });
    document.getElementById(`type${type.charAt(0).toUpperCase() + type.slice(1)}`).className = 'exercise-type-btn py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 border-neon-green bg-neon-green/20 text-neon-green';
    
    // Show/hide relevant fields
    document.getElementById('weightedFields').classList.toggle('hidden', type !== 'weighted');
    document.getElementById('bodyweightFields').classList.toggle('hidden', type !== 'bodyweight');
    document.getElementById('timedFields').classList.toggle('hidden', type !== 'timed');
    
    // Load bodyweight from profile if bodyweight type selected
    if (type === 'bodyweight') {
        const profile = JSON.parse(localStorage.getItem('gymlog_profile') || '{}');
        const bodyWeight = profile.weight || '--';
        document.getElementById('bodyWeightDisplay').textContent = bodyWeight;
    }
    
    // Update exercise suggestions for selected type
    loadExerciseHistory();
}

// Load last entry into form
function loadLastEntry() {
    const sets = loadSets();
    if (sets.length === 0) {
        alert('Brak historii treningów!');
        return;
    }
    
    const lastSet = sets[0];
    document.getElementById('exercise').value = lastSet.exercise;
    
    // Switch to correct type and fill fields
    selectExerciseType(lastSet.type);
    
    if (lastSet.type === 'weighted') {
        document.getElementById('weight').value = lastSet.weight;
        document.getElementById('reps').value = lastSet.reps;
    } else if (lastSet.type === 'bodyweight') {
        document.getElementById('bwReps').value = lastSet.reps;
        document.getElementById('addedWeight').value = lastSet.addedWeight || 0;
    } else if (lastSet.type === 'timed') {
        document.getElementById('duration').value = lastSet.duration;
        document.getElementById('distance').value = lastSet.distance || '';
        document.getElementById('elevation').value = lastSet.elevation || '';
    }
    
    document.getElementById('exercise').focus();
    document.getElementById('exercise').select();
}

// Load exercise history into datalist (filtered by current type)
function loadExerciseHistory() {
    const sets = loadSets();
    // Filter by current selected type
    const filteredSets = sets.filter(s => (s.type || 'weighted') === selectedType);
    // Get unique exercise names
    const exercises = [...new Set(filteredSets.map(s => s.exercise))].sort();
    const datalist = document.getElementById('exerciseHistory');
    datalist.innerHTML = exercises.map(ex => `<option value="${ex}">`).join('');
}

// Display recent 5 sets
function displayRecentSets() {
    const sets = loadSets().slice(0, 5);
    const container = document.getElementById('recentSets');
    
    if (sets.length === 0) {
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <p class="text-gray-600 font-medium">Brak historii. Dodaj pierwszą serię!</p>
            </div>
        `;
        return;
    }
    
    const typeIcons = {
        weighted: '🏋️',
        bodyweight: '💪',
        timed: '⏱️'
    };
    
    container.innerHTML = sets.map(set => {
        let dataDisplay = '';
        
        if (set.type === 'weighted') {
            dataDisplay = `
                <div class="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg">
                    <span class="text-neon-green font-black text-xl">${set.weight}</span>
                    <span class="text-gray-600 text-sm font-bold">kg</span>
                    <span class="text-gray-700 mx-1">×</span>
                    <span class="text-white font-black text-xl">${set.reps}</span>
                </div>
            `;
        } else if (set.type === 'bodyweight') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-white font-black text-xl">${set.reps}</span>
                        <span class="text-gray-600 text-sm font-bold">reps</span>
                    </div>
                    ${set.addedWeight ? `<div class="text-xs text-gray-500 mt-1">+${set.addedWeight}kg</div>` : ''}
                </div>
            `;
        } else if (set.type === 'timed') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-blue-400 font-black text-xl">${set.duration}</span>
                        <span class="text-gray-600 text-sm font-bold">min</span>
                    </div>
                    ${set.distance ? `<div class="text-xs text-gray-400 mt-1">${set.distance}km</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="bg-dark-card border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${typeIcons[set.type] || '🏋️'}</span>
                        <p class="font-bold text-lg">${set.exercise}</p>
                    </div>
                    <p class="text-xs text-gray-500">${new Date(set.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                ${dataDisplay}
            </div>
        `;
    }).join('');
}

// Check if suggestion should be shown (weighted only)
function checkSuggestion() {
    if (selectedType !== 'weighted') return;
    
    const exercise = document.getElementById('exercise').value.trim();
    const reps = parseInt(document.getElementById('reps').value);
    const suggestionBox = document.getElementById('suggestionBox');
    const suggestionText = document.getElementById('suggestionText');
    
    if (exercise && reps >= 5) {
        const lastSet = getLastSetForExercise(exercise);
        if (lastSet && lastSet.type === 'weighted' && lastSet.reps >= 5) {
            const suggested = (lastSet.weight + 2.5).toFixed(1);
            suggestionText.textContent = `Sugestia: +2.5kg (${suggested}kg)`;
            suggestionBox.classList.remove('hidden');
        } else {
            suggestionBox.classList.add('hidden');
        }
    } else {
        suggestionBox.classList.add('hidden');
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const exerciseRaw = document.getElementById('exercise').value;
    const exercise = sanitizeInput(exerciseRaw, 40);
    
    if (!exercise) {
        alert('Proszę podać nazwę ćwiczenia.');
        return;
    }
    
    // Check if exercise with this name already exists with different type
    const existingSets = loadSets();
    const existingExercise = existingSets.find(s => 
        s.exercise.toLowerCase() === exercise.toLowerCase() && 
        (s.type || 'weighted') !== selectedType
    );
    
    if (existingExercise) {
        const typeNames = {
            weighted: 'Ciężar',
            bodyweight: 'Masy',
            timed: 'Czas'
        };
        alert(`Ćwiczenie "${exercise}" już istnieje jako typ: ${typeNames[existingExercise.type || 'weighted']}.\n\nNie można mieć tego samego ćwiczenia w różnych kategoriach.`);
        return;
    }
    
    let newSet = {
        id: crypto.randomUUID(),
        exercise: exercise,
        type: selectedType,
        timestamp: Date.now()
    };
    
    // Add type-specific fields
    if (selectedType === 'weighted') {
        const weight = parseFloat(document.getElementById('weight').value);
        const reps = parseInt(document.getElementById('reps').value);
        
        if (!weight || !reps) {
            alert('Proszę wypełnić ciężar i powtórzenia.');
            return;
        }
        
        newSet.weight = weight;
        newSet.reps = reps;
        
        // Check for new record (weighted only)
        const record = checkNewRecord(exercise, weight);
        if (record) {
            setTimeout(() => showRecordModal(record), 2200);
        }
        
    } else if (selectedType === 'bodyweight') {
        const reps = parseInt(document.getElementById('bwReps').value);
        const addedWeight = parseFloat(document.getElementById('addedWeight').value) || 0;
        const profile = JSON.parse(localStorage.getItem('gymlog_profile') || '{}');
        const bodyWeight = profile.weight || 0;
        
        if (!reps) {
            alert('Proszę wypełnić powtórzenia.');
            return;
        }
        
        newSet.reps = reps;
        newSet.addedWeight = addedWeight;
        newSet.bodyWeight = bodyWeight; // Save for user info
        
    } else if (selectedType === 'timed') {
        const duration = parseFloat(document.getElementById('duration').value);
        const distance = parseFloat(document.getElementById('distance').value) || null;
        const elevation = parseFloat(document.getElementById('elevation').value) || null;
        
        if (!duration) {
            alert('Proszę wypełnić czas.');
            return;
        }
        
        newSet.duration = duration;
        if (distance) newSet.distance = distance;
        if (elevation) newSet.elevation = elevation;
    }
    
    // Save to localStorage
    const sets = loadSets();
    sets.unshift(newSet);
    saveSets(sets);
    
    // Show toast
    const toast = document.getElementById('toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
    
    // Update UI
    displayRecentSets();
    loadExerciseHistory();
    
    // Reset form but keep type selected
    e.target.reset();
    if (selectedType === 'bodyweight') {
        document.getElementById('addedWeight').value = '0';
    }
    document.getElementById('suggestionBox').classList.add('hidden');
    document.getElementById('exercise').focus();
}

// Show record modal
function showRecordModal(record) {
    currentRecord = record;
    
    document.getElementById('recordExercise').textContent = record.exercise;
    document.getElementById('recordPrevious').textContent = record.previousWeight + 'kg';
    document.getElementById('recordNew').textContent = record.newWeight + 'kg';
    document.getElementById('recordImprovement').textContent = record.improvement.toFixed(1);
    
    document.getElementById('recordModal').classList.remove('hidden');
}

function closeRecordModal() {
    document.getElementById('recordModal').classList.add('hidden');
    currentRecord = null;
}

function shareRecord() {
    if (!currentRecord) return;
    
    const text = `🏋️‍♂️ Nowy rekord w GymLog!\n🏆 ${currentRecord.exercise}\n💪 ${currentRecord.previousWeight}kg → ${currentRecord.newWeight}kg (+${currentRecord.improvement.toFixed(1)}kg)`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Nowy Rekord - GymLog',
            text: text
        }).then(() => {
            closeRecordModal();
        }).catch(err => console.log('Share cancelled', err));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('toast');
            toast.textContent = '✓ Skopiowano do schowka!';
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.textContent = '✓ Seria zapisana!';
            }, 2000);
            closeRecordModal();
        });
    }
}
