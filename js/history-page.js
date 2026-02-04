// History Page JavaScript

// State
let allSets = [];
let currentTypeFilter = 'all';
let editType = 'weighted';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    document.getElementById('searchInput').addEventListener('input', filterHistory);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
});

// Select edit type
function selectEditType(type) {
    editType = type;
    
    // Update button styles
    document.querySelectorAll('.edit-type-btn').forEach(btn => {
        btn.className = 'edit-type-btn py-2 px-3 rounded-lg font-bold text-xs transition-all border-2 border-gray-700 bg-dark-bg text-gray-400';
    });
    document.getElementById(`editType${type.charAt(0).toUpperCase() + type.slice(1)}`).className = 'edit-type-btn py-2 px-3 rounded-lg font-bold text-xs transition-all border-2 border-neon-green bg-neon-green/20 text-neon-green';
    
    // Show/hide relevant fields
    document.getElementById('editWeightedFields').classList.toggle('hidden', type !== 'weighted');
    document.getElementById('editBodyweightFields').classList.toggle('hidden', type !== 'bodyweight');
    document.getElementById('editTimedFields').classList.toggle('hidden', type !== 'timed');
}

// Filter by type
function filterByType(type) {
    currentTypeFilter = type;
    
    // Update button styles
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.className = 'category-btn px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all bg-gray-800 text-gray-500';
    });
    
    const activeBtn = document.getElementById(`filter${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (activeBtn) {
        activeBtn.className = 'category-btn px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all bg-gray-800 text-neon-green';
    }
    
    // Apply filters
    filterHistory();
}

// Load and display history
function loadHistory() {
    allSets = loadSets();
    filterHistory();
}

// Display history list
function displayHistory(sets) {
    const container = document.getElementById('historyList');
    
    if (sets.length === 0) {
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <p class="text-gray-600 font-medium">Brak treningów</p>
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
        const date = new Date(set.timestamp);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const setType = set.type || 'weighted';
        
        let dataDisplay = '';
        
        if (setType === 'weighted') {
            dataDisplay = `
                <div class="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg">
                    <span class="text-neon-green font-black text-xl">${set.weight}</span>
                    <span class="text-gray-600 text-xs font-bold">kg</span>
                    <span class="text-gray-700 mx-1">×</span>
                    <span class="text-white font-black text-lg">${set.reps}</span>
                </div>
            `;
        } else if (setType === 'bodyweight') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-white font-black text-lg">${set.reps}</span>
                        <span class="text-gray-600 text-xs font-bold">reps</span>
                    </div>
                    ${set.addedWeight ? `<div class="text-xs text-gray-500 mt-1">+${set.addedWeight}kg</div>` : ''}
                </div>
            `;
        } else if (setType === 'timed') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-blue-400 font-black text-lg">${set.duration}</span>
                        <span class="text-gray-600 text-xs font-bold">min</span>
                    </div>
                    ${set.distance ? `<div class="text-xs text-gray-400 mt-1">${set.distance}km</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="bg-dark-card border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${typeIcons[setType] || '🏋️'}</span>
                            <p class="font-bold text-lg">${set.exercise}</p>
                        </div>
                        <p class="text-xs text-gray-500">${dateStr} • ${timeStr}</p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        ${dataDisplay}
                        
                        <div class="flex flex-col gap-1">
                            <button 
                                onclick="openEditModal('${set.id}')"
                                class="p-1.5 text-gray-500 hover:text-neon-green transition-colors bg-gray-900 rounded-lg"
                                title="Edytuj"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button 
                                onclick="confirmDelete('${set.id}', '${set.exercise}')"
                                class="p-1.5 text-gray-500 hover:text-red-500 transition-colors bg-gray-900 rounded-lg"
                                title="Usuń"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter history
function filterHistory() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter by type first
    let filtered = allSets;
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(set => (set.type || 'weighted') === currentTypeFilter);
    }
    
    // Then filter by search query
    if (query) {
        filtered = filtered.filter(set => 
            set.exercise.toLowerCase().includes(query)
        );
    }
    
    displayHistory(filtered);
    
    // Update count display
    if (currentTypeFilter === 'all' && !query) {
        updateCount(filtered.length);
    } else {
        updateCount(filtered.length, allSets.length);
    }
}

// Update count
function updateCount(current, total) {
    const countEl = document.getElementById('totalCount');
    
    if (total && current !== total) {
        countEl.textContent = `${current} z ${total} treningów`;
    } else {
        countEl.textContent = `${current} ${current === 1 ? 'trening' : current < 5 ? 'treningi' : 'treningów'}`;
    }
}

// Open edit modal
function openEditModal(id) {
    const set = allSets.find(s => s.id === id);
    if (!set) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('editExercise').value = set.exercise;
    
    const setType = set.type || 'weighted';
    selectEditType(setType);
    
    // Load fields based on type
    if (setType === 'weighted') {
        document.getElementById('editWeight').value = set.weight || '';
        document.getElementById('editReps').value = set.reps || '';
    } else if (setType === 'bodyweight') {
        document.getElementById('editBwReps').value = set.reps || '';
        document.getElementById('editAddedWeight').value = set.addedWeight || 0;
    } else if (setType === 'timed') {
        document.getElementById('editDuration').value = set.duration || '';
        document.getElementById('editDistance').value = set.distance || '';
        document.getElementById('editElevation').value = set.elevation || '';
    }
    
    document.getElementById('editModal').classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editForm').reset();
}

// Handle edit submit
function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const exerciseRaw = document.getElementById('editExercise').value;
    const exercise = sanitizeInput(exerciseRaw, 40);
    
    if (!exercise) {
        showToast('❌ Nieprawidłowa nazwa ćwiczenia!');
        return;
    }
    
    // Check if exercise with this name already exists with different type
    const existingExercise = allSets.find(s => 
        s.id !== id && 
        s.exercise.toLowerCase() === exercise.toLowerCase() && 
        (s.type || 'weighted') !== editType
    );
    
    if (existingExercise) {
        const typeNames = {
            weighted: 'Ciężar',
            bodyweight: 'Masy',
            timed: 'Czas'
        };
        showToast(`❌ Ćwiczenie "${exercise}" już istnieje jako: ${typeNames[existingExercise.type || 'weighted']}`);
        return;
    }
    
    let updates = {
        exercise: exercise,
        type: editType
    };
    
    // Add type-specific fields
    if (editType === 'weighted') {
        const weight = parseFloat(document.getElementById('editWeight').value);
        const reps = parseInt(document.getElementById('editReps').value);
        
        if (!weight || !reps) {
            showToast('❌ Wypełnij wszystkie pola!');
            return;
        }
        
        updates.weight = weight;
        updates.reps = reps;
        // Clear other type fields
        updates.addedWeight = undefined;
        updates.bodyWeight = undefined;
        updates.duration = undefined;
        updates.distance = undefined;
        updates.elevation = undefined;
        
    } else if (editType === 'bodyweight') {
        const reps = parseInt(document.getElementById('editBwReps').value);
        const addedWeight = parseFloat(document.getElementById('editAddedWeight').value) || 0;
        
        if (!reps) {
            showToast('❌ Wypełnij powtórzenia!');
            return;
        }
        
        const profile = JSON.parse(localStorage.getItem('gymlog_profile') || '{}');
        const bodyWeight = profile.weight || 0;
        
        updates.reps = reps;
        updates.addedWeight = addedWeight;
        updates.bodyWeight = bodyWeight;
        // Clear other type fields
        updates.weight = undefined;
        updates.duration = undefined;
        updates.distance = undefined;
        updates.elevation = undefined;
        
    } else if (editType === 'timed') {
        const duration = parseFloat(document.getElementById('editDuration').value);
        const distance = parseFloat(document.getElementById('editDistance').value) || null;
        const elevation = parseFloat(document.getElementById('editElevation').value) || null;
        
        if (!duration) {
            showToast('❌ Wypełnij czas!');
            return;
        }
        
        updates.duration = duration;
        if (distance) updates.distance = distance;
        if (elevation) updates.elevation = elevation;
        // Clear other type fields
        updates.weight = undefined;
        updates.reps = undefined;
        updates.addedWeight = undefined;
        updates.bodyWeight = undefined;
    }
    
    if (updateSet(id, updates)) {
        showToast('✓ Zapisano zmiany!');
        closeEditModal();
        loadHistory();
    } else {
        showToast('❌ Błąd zapisu!');
    }
}

// Confirm delete
function confirmDelete(id, exercise) {
    if (confirm(`Czy na pewno chcesz usunąć:\n${exercise}?`)) {
        if (deleteSet(id)) {
            showToast('✓ Usunięto trening!');
            loadHistory();
        } else {
            showToast('❌ Błąd usuwania!');
        }
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}
