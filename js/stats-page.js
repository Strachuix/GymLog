// Tab switching and swipe functionality
let currentTab = 0;
let touchStartX = 0;
let touchEndX = 0;

// 1RM Calculation formulas
const formulas = {
    epley: (weight, reps) => weight * (1 + reps / 30),
    brzycki: (weight, reps) => weight * (36 / (37 - reps)),
    lombardi: (weight, reps) => weight * Math.pow(reps, 0.10),
    landers: (weight, reps) => (100 * weight) / (101.3 - 2.67123 * reps),
    oconner: (weight, reps) => weight * (1 + reps / 40)
};

const formulaDescriptions = {
    epley: 'Formuła Epley: 1RM = w × (1 + r/30) - najpopularniejsza',
    brzycki: 'Formuła Brzycki: 1RM = w × (36/(37 - r)) - bardzo dokładna',
    lombardi: 'Formuła Lombardi: 1RM = w × r^0.10 - dla małych liczb powtórzeń',
    landers: 'Formuła Landers: 1RM = (100 × w)/(101.3 - 2.67123 × r)',
    oconner: 'Formuła O\'Conner: 1RM = w × (1 + r/40) - konserwatywna',
    all: 'Porównaj wszystkie formuły i zobacz średnią'
};

const formulaNames = {
    epley: 'Epley',
    brzycki: 'Brzycki',
    lombardi: 'Lombardi',
    landers: 'Landers',
    oconner: 'O\'Conner'
};

let currentExerciseData = null;
let currentRecordTypeFilter = 'all';

function switchTab(tabIndex) {
    currentTab = tabIndex;
    const wrapper = document.getElementById('tabContent');
    wrapper.style.transform = `translateX(-${tabIndex * 25}%)`;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        if (i === tabIndex) {
            btn.classList.add('text-neon-green', 'bg-dark-card');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-neon-green', 'bg-dark-card');
            btn.classList.add('text-gray-500');
        }
    });
    
    // Initialize 1RM calculator when switching to it
    if (tabIndex === 1) {
        init1RMCalculator();
    }
}

// Swipe detection
const tabContent = document.getElementById('tabContent');

tabContent.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

tabContent.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && currentTab < 3) {
            // Swipe left - next tab
            switchTab(currentTab + 1);
        } else if (diff < 0 && currentTab > 0) {
            // Swipe right - previous tab
            switchTab(currentTab - 1);
        }
    }
}

// 1RM Calculator functions
function init1RMCalculator() {
    const sets = loadSets();
    const exerciseSelect = document.getElementById('exerciseSelect');
    const noDataBox = document.getElementById('noDataBox');
    
    // Clear previous options (keep first one)
    while (exerciseSelect.options.length > 1) {
        exerciseSelect.remove(1);
    }
    
    if (sets.length === 0) {
        noDataBox.classList.remove('hidden');
        return;
    }
    
    noDataBox.classList.add('hidden');
    
    // Populate exercise select - ONLY WEIGHTED exercises
    const weightedSets = sets.filter(s => s.type === 'weighted');
    const exercises = [...new Set(weightedSets.map(s => s.exercise))].sort();
    
    if (exercises.length === 0) {
        noDataBox.classList.remove('hidden');
        return;
    }
    
    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        option.textContent = exercise;
        exerciseSelect.appendChild(option);
    });
}

function onExerciseChange() {
    const exercise = document.getElementById('exerciseSelect').value;
    const lastPerformanceBox = document.getElementById('lastPerformanceBox');
    const formulaBox = document.getElementById('formulaBox');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsBox = document.getElementById('resultsBox');
    
    if (!exercise) {
        lastPerformanceBox.classList.add('hidden');
        formulaBox.classList.add('hidden');
        calculateBtn.classList.add('hidden');
        resultsBox.classList.add('hidden');
        return;
    }
    
    // Get last set for this exercise
    const lastSet = getLastSetForExercise(exercise);
    
    if (!lastSet) {
        alert('Brak danych dla tego ćwiczenia');
        return;
    }
    
    currentExerciseData = lastSet;
    
    // Show last performance
    document.getElementById('lastWeight').textContent = `${lastSet.weight} kg`;
    document.getElementById('lastReps').textContent = lastSet.reps;
    
    const date = new Date(lastSet.timestamp);
    document.getElementById('lastDate').textContent = `Data: ${date.toLocaleDateString('pl-PL')} ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    
    lastPerformanceBox.classList.remove('hidden');
    formulaBox.classList.remove('hidden');
    calculateBtn.classList.remove('hidden');
    resultsBox.classList.add('hidden');
}

function onFormulaChange() {
    const formula = document.getElementById('formulaSelect').value;
    document.getElementById('formulaDescription').textContent = formulaDescriptions[formula];
}

function calculate1RM() {
    if (!currentExerciseData) return;
    
    const weight = parseFloat(currentExerciseData.weight);
    const reps = parseInt(currentExerciseData.reps);
    const selectedFormula = document.getElementById('formulaSelect').value;
    const resultsBox = document.getElementById('resultsBox');
    const singleResult = document.getElementById('singleResult');
    const multipleResults = document.getElementById('multipleResults');
    
    // Validate data
    if (reps < 1 || reps > 20) {
        alert('Formuły są najdokładniejsze dla 1-10 powtórzeń. Wyniki dla powyżej 10 powtórzeń mogą być mniej dokładne.');
    }
    
    resultsBox.classList.remove('hidden');
    
    if (selectedFormula === 'all') {
        // Show all formulas
        singleResult.classList.add('hidden');
        multipleResults.classList.remove('hidden');
        
        const allResultsDiv = document.getElementById('allResults');
        allResultsDiv.innerHTML = '';
        let sum = 0;
        let count = 0;
        
        Object.keys(formulas).forEach(key => {
            const result = formulas[key](weight, reps);
            sum += result;
            count++;
            
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-gray-900 rounded-lg px-4 py-3';
            div.innerHTML = `
                <span class="text-sm text-gray-400">${formulaNames[key]}</span>
                <span class="text-lg font-bold text-neon-green">${result.toFixed(1)} kg</span>
            `;
            allResultsDiv.appendChild(div);
        });
        
        const average = sum / count;
        document.getElementById('averageResult').textContent = `${average.toFixed(1)} kg`;
    } else {
        // Show single formula result
        singleResult.classList.remove('hidden');
        multipleResults.classList.add('hidden');
        
        const result = formulas[selectedFormula](weight, reps);
        document.getElementById('resultValue').textContent = `${result.toFixed(1)} kg`;
        document.getElementById('resultFormula').textContent = `Formuła ${formulaNames[selectedFormula]}`;
    }
    
    // Scroll to results
    resultsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Display top 5 exercises
function displayTopExercises() {
    const topWeighted = getTopExercises();
    const topTimed = getTopTimedExercises();
    const container = document.getElementById('topExercises');
    
    let html = '';
    
    // Top 5 Weighted Exercises
    if (topWeighted.length > 0) {
        html += `<div class="mb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">🏋️ Top 5 - Ćwiczenia z ciężarem</h3>
        `;
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        
        html += topWeighted.map((ex, i) => `
            <div class="bg-dark-card border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors mb-2">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${medals[i]}</span>
                    <div>
                        <p class="font-bold text-lg">${ex.name}</p>
                        <p class="text-xs text-gray-500">${ex.count} ${ex.count === 1 ? 'seria' : 'serii'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-neon-green font-black text-sm">${ex.totalVolume.toFixed(0)}</p>
                    <p class="text-xs text-gray-600">objętość</p>
                </div>
            </div>
        `).join('');
        
        html += `</div>`;
    }
    
    // Top 5 Timed Exercises
    if (topTimed.length > 0) {
        html += `<div class="mb-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">⏱️ Top 5 - Ćwiczenia czasowe</h3>
        `;
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        
        html += topTimed.map((ex, i) => `
            <div class="bg-dark-card border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors mb-2">
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${medals[i]}</span>
                    <div>
                        <p class="font-bold text-lg">${ex.name}</p>
                        <p class="text-xs text-gray-500">${ex.count} ${ex.count === 1 ? 'seria' : 'serii'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-blue-400 font-black text-sm">${ex.totalDuration.toFixed(1)} min</p>
                    ${ex.totalDistance > 0 ? `<p class="text-xs text-gray-600">${ex.totalDistance.toFixed(1)} km</p>` : `<p class="text-xs text-gray-600">łącznie</p>`}
                </div>
            </div>
        `).join('');
        
        html += `</div>`;
    }
    
    // No data message
    if (topWeighted.length === 0 && topTimed.length === 0) {
        html = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <p class="text-gray-600 font-medium">Brak danych</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Display personal records with share button
function displayPersonalRecords(typeFilter = 'all') {
    const records = getPersonalRecords();
    const container = document.getElementById('personalRecords');
    
    // Filter by type if specified
    let filteredRecords = records;
    if (typeFilter !== 'all') {
        filteredRecords = records.filter(r => (r.type || 'weighted') === typeFilter);
    }
    
    if (filteredRecords.length === 0) {
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <p class="text-gray-600 font-medium">Brak rekordów</p>
            </div>
        `;
        return;
    }
    
    const typeIcons = {
        weighted: '🏋️',
        bodyweight: '💪',
        timed: '⏱️'
    };

    const getBodySideBadge = (side) => {
        const meta = typeof getBodySideMeta === 'function' ? getBodySideMeta(side) : { symbol: '', shortLabel: '', label: '' };
        if (!meta.label) {
            return '';
        }

        return `<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-900 text-gray-300 font-bold">${meta.shortLabel}</span>`;
    };
    
    container.innerHTML = filteredRecords.map(record => {
        const recordType = record.type || 'weighted';
        let dataDisplay = '';
        
        if (recordType === 'weighted') {
            dataDisplay = `
                <div class="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg">
                    <span class="text-neon-green font-black text-2xl">${record.weight}</span>
                    <span class="text-gray-600 text-xs font-bold">kg</span>
                    <span class="text-gray-700 mx-1">×</span>
                    <span class="text-white font-black text-lg">${record.reps}</span>
                </div>
            `;
        } else if (recordType === 'bodyweight') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-white font-black text-xl">${record.reps}</span>
                        <span class="text-gray-600 text-xs font-bold">reps</span>
                    </div>
                    ${record.addedWeight ? `<div class="text-xs text-gray-500 mt-1">+${record.addedWeight}kg</div>` : ''}
                </div>
            `;
        } else if (recordType === 'timed') {
            dataDisplay = `
                <div class="bg-gray-900 px-3 py-2 rounded-lg text-center">
                    <div class="flex items-center gap-2">
                        <span class="text-blue-400 font-black text-xl">${record.duration}</span>
                        <span class="text-gray-600 text-xs font-bold">min</span>
                    </div>
                    ${record.distance ? `<div class="text-xs text-gray-400 mt-1">${record.distance}km</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="bg-dark-card border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${typeIcons[recordType] || '🏋️'}</span>
                        <p class="font-bold text-lg">${record.exercise}</p>
                        ${recordType === 'timed' ? '' : getBodySideBadge(record.bodySide)}
                    </div>
                    <p class="text-xs text-gray-500">${new Date(record.date).toLocaleDateString('pl-PL')}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${dataDisplay}
                    <button 
                        class="p-2 text-gray-500 hover:text-neon-green transition-colors"
                        onclick="shareRecord('${record.exercise}', ${JSON.stringify(record).replace(/"/g, '&quot;')})"
                        title="Udostępnij rekord"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter records by type
function filterRecordsByType(type) {
    currentRecordTypeFilter = type;
    
    // Update button styles
    document.querySelectorAll('.record-filter-btn').forEach(btn => {
        btn.className = 'record-filter-btn px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all bg-gray-800 text-gray-500';
    });
    
    const activeBtn = document.getElementById(`recordFilter${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (activeBtn) {
        activeBtn.className = 'record-filter-btn px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all bg-gray-800 text-neon-green';
    }
    
    // Redisplay with filter
    displayPersonalRecords(type);
}

// Display charts for selected exercise
function initChartExerciseSelect() {
    const grouped = groupSetsByExercise();
    const exercises = Object.keys(grouped).sort();
    const select = document.getElementById('chartExerciseSelect');
    const container = document.getElementById('charts');
    
    // Clear previous options (keep first one)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    if (exercises.length === 0) {
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <p class="text-gray-600 font-medium">Brak danych do wyświetlenia</p>
            </div>
        `;
        return;
    }
    
    // Populate select with all exercises
    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        option.textContent = `${exercise} (${grouped[exercise].length} serii)`;
        select.appendChild(option);
    });
    
    // Load last selected exercise from localStorage
    const lastSelectedExercise = localStorage.getItem('lastChartExercise');
    
    if (lastSelectedExercise && exercises.includes(lastSelectedExercise)) {
        // Set the select to last exercise and generate chart
        select.value = lastSelectedExercise;
        onChartExerciseChange();
    } else {
        // Show instruction
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                </svg>
                <p class="text-gray-400 font-medium">Wybierz ćwiczenie z listy powyżej</p>
                <p class="text-sm text-gray-500 mt-2">aby zobaczyć wykres postępu</p>
            </div>
        `;
    }
}

function onChartExerciseChange() {
    const exercise = document.getElementById('chartExerciseSelect').value;
    const container = document.getElementById('charts');
    
    if (!exercise) {
        // Clear localStorage when deselecting
        localStorage.removeItem('lastChartExercise');
        container.innerHTML = `
            <div class="bg-dark-card border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                </svg>
                <p class="text-gray-400 font-medium">Wybierz ćwiczenie z listy powyżej</p>
                <p class="text-sm text-gray-500 mt-2">aby zobaczyć wykres postępu</p>
            </div>
        `;
        return;
    }
    
    // Save selected exercise to localStorage
    localStorage.setItem('lastChartExercise', exercise);
    
    const grouped = groupSetsByExercise();
    const sets = grouped[exercise];
    
    if (!sets || sets.length < 2) {
        container.innerHTML = `
            <div class="bg-dark-card border border-yellow-800 rounded-2xl p-8 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p class="text-gray-300 font-medium mb-2">Za mało danych</p>
                <p class="text-sm text-gray-500">Potrzebujesz co najmniej <span class="text-neon-green font-bold">2 serie</span> tego ćwiczenia,<br>aby wygenerować wykres postępu.</p>
                <p class="text-xs text-gray-600 mt-3">Obecnie: ${sets ? sets.length : 0} seria</p>
            </div>
        `;
        return;
    }
    
    // Generate chart
    displayChart(exercise, sets);
}

function displayChart(exerciseName, sets) {
    const container = document.getElementById('charts');
    const sortedSets = sets.slice().reverse(); // Oldest to newest
    
    // Determine exercise type (all sets of same exercise should have same type)
    const exerciseType = sortedSets[0].type || 'weighted';
    
    // Generate charts based on type
    if (exerciseType === 'weighted') {
        displayWeightedChart(exerciseName, sortedSets, container);
    } else if (exerciseType === 'bodyweight') {
        displayBodyweightChart(exerciseName, sortedSets, container);
    } else if (exerciseType === 'timed') {
        displayTimedChart(exerciseName, sortedSets, container);
    }
}

function displayWeightedChart(exerciseName, sortedSets, container) {
    const chartId = `chart-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    const volumeChartId = `volume-chart-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    const oneRmChartId = `onerm-chart-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    
    // Get selected formula from profile or use default (Epley)
    const profile = JSON.parse(localStorage.getItem('gymlog_profile')) || {};
    const selectedFormula = profile.oneRmFormula || 'epley';
    const formulaName = {
        epley: 'Epley',
        brzycki: 'Brzycki',
        lombardi: 'Lombardi',
        landers: 'Landers',
        oconner: "O'Conner",
        average: 'Średnia ze wszystkich'
    }[selectedFormula];
    
    // Calculate 1RM for each set using selected formula
    let oneRmData;
    if (selectedFormula === 'average') {
        // Calculate average of all formulas
        oneRmData = sortedSets.map(s => {
            const values = [
                formulas.epley(s.weight, s.reps),
                formulas.brzycki(s.weight, s.reps),
                formulas.lombardi(s.weight, s.reps),
                formulas.landers(s.weight, s.reps),
                formulas.oconner(s.weight, s.reps)
            ];
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            return avg.toFixed(1);
        });
    } else {
        oneRmData = sortedSets.map(s => formulas[selectedFormula](s.weight, s.reps).toFixed(1));
    }
    
    container.innerHTML = `
        <div class="bg-dark-card border border-gray-800 rounded-xl p-5 space-y-6">
            <div class="flex items-center gap-2">
                <span class="text-xl">🏋️</span>
                <h3 class="font-bold text-lg text-neon-green">${exerciseName}</h3>
            </div>
            
            <!-- Weight Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Ciężar w serii</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${chartId}"></canvas>
                </div>
            </div>
            
            <!-- Volume Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Objętość serii (kg × powtórzenia)</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${volumeChartId}"></canvas>
                </div>
            </div>
            
            <!-- 1RM Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Estymowany 1RM (formuła ${formulaName})</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${oneRmChartId}"></canvas>
                </div>
            </div>
            
            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Serie</p>
                    <p class="text-lg font-bold text-gray-300">${sortedSets.length}</p>
                </div>
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Max ciężar</p>
                    <p class="text-lg font-bold text-neon-green">${Math.max(...sortedSets.map(s => s.weight))} kg</p>
                </div>
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Całk. objętość</p>
                    <p class="text-lg font-bold text-blue-400">${sortedSets.reduce((sum, s) => sum + (s.weight * s.reps), 0).toFixed(0)}</p>
                </div>
            </div>
        </div>
    `;
    
    // Create weight chart
    const ctx = document.getElementById(chartId);
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedSets.map((_, i) => `#${i + 1}`),
                datasets: [
                    {
                        label: 'Ciężar (kg)',
                        data: sortedSets.map(s => s.weight),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#10b981',
                        bodyColor: '#fff',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const index = items[0].dataIndex;
                                const date = new Date(sortedSets[index].timestamp);
                                return date.toLocaleString('pl-PL', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const set = sortedSets[context.dataIndex];
                                return `${set.weight}kg × ${set.reps} powtórzeń`;
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
                            color: '#10b981', 
                            font: { size: 11, weight: 'bold' },
                            callback: (value) => value + ' kg'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
    
    // Create volume chart
    const volumeCtx = document.getElementById(volumeChartId);
    if (volumeCtx) {
        new Chart(volumeCtx, {
            type: 'line',
            data: {
                labels: sortedSets.map((_, i) => `#${i + 1}`),
                datasets: [
                    {
                        label: 'Objętość',
                        data: sortedSets.map(s => s.weight * s.reps),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#3b82f6',
                        bodyColor: '#fff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const index = items[0].dataIndex;
                                const date = new Date(sortedSets[index].timestamp);
                                return date.toLocaleString('pl-PL', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const set = sortedSets[context.dataIndex];
                                const volume = set.weight * set.reps;
                                return `${set.weight}kg × ${set.reps} = ${volume}`;
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
                            color: '#3b82f6', 
                            font: { size: 11, weight: 'bold' },
                            callback: (value) => value.toFixed(0)
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
    
    // Create 1RM chart
    const oneRmCtx = document.getElementById(oneRmChartId);
    if (oneRmCtx) {
        new Chart(oneRmCtx, {
            type: 'line',
            data: {
                labels: sortedSets.map((_, i) => `#${i + 1}`),
                datasets: [
                    {
                        label: '1RM',
                        data: oneRmData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#f59e0b',
                        bodyColor: '#fff',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const index = items[0].dataIndex;
                                const date = new Date(sortedSets[index].timestamp);
                                return date.toLocaleString('pl-PL', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const set = sortedSets[context.dataIndex];
                                const oneRm = oneRmData[context.dataIndex];
                                return `${set.weight}kg × ${set.reps} → ~${oneRm}kg 1RM`;
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
                            color: '#f59e0b', 
                            font: { size: 11, weight: 'bold' },
                            callback: (value) => value.toFixed(0) + ' kg'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
}

function displayBodyweightChart(exerciseName, sortedSets, container) {
    const chartId = `chart-bw-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    
    container.innerHTML = `
        <div class="bg-dark-card border border-gray-800 rounded-xl p-5 space-y-6">
            <div class="flex items-center gap-2">
                <span class="text-xl">💪</span>
                <h3 class="font-bold text-lg text-neon-green">${exerciseName}</h3>
            </div>
            
            <!-- Reps Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Powtórzenia w serii</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${chartId}"></canvas>
                </div>
            </div>
            
            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Serie</p>
                    <p class="text-lg font-bold text-gray-300">${sortedSets.length}</p>
                </div>
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Max powtórzeń</p>
                    <p class="text-lg font-bold text-neon-green">${Math.max(...sortedSets.map(s => s.reps))}</p>
                </div>
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Całk. powtórzenia</p>
                    <p class="text-lg font-bold text-blue-400">${sortedSets.reduce((sum, s) => sum + s.reps, 0)}</p>
                </div>
            </div>
        </div>
    `;
    
    // Create reps chart
    const ctx = document.getElementById(chartId);
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedSets.map((_, i) => `#${i + 1}`),
                datasets: [
                    {
                        label: 'Powtórzenia',
                        data: sortedSets.map(s => s.reps),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#10b981',
                        bodyColor: '#fff',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const index = items[0].dataIndex;
                                const date = new Date(sortedSets[index].timestamp);
                                return date.toLocaleString('pl-PL', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const set = sortedSets[context.dataIndex];
                                let label = `${set.reps} powtórzeń`;
                                if (set.addedWeight && set.addedWeight > 0) {
                                    label += ` (+${set.addedWeight}kg)`;
                                }
                                if (set.bodyWeight) {
                                    label += ` | Masa ciała: ${set.bodyWeight}kg`;
                                }
                                return label;
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
                            color: '#10b981', 
                            font: { size: 11, weight: 'bold' },
                            callback: (value) => value
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
}

function displayTimedChart(exerciseName, sortedSets, container) {
    const durationChartId = `chart-duration-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    const distanceChartId = `chart-distance-${exerciseName.replace(/\s+/g, '-').replace(/[()]/g, '')}`;
    
    const hasDistance = sortedSets.some(s => s.distance);
    
    container.innerHTML = `
        <div class="bg-dark-card border border-gray-800 rounded-xl p-5 space-y-6">
            <div class="flex items-center gap-2">
                <span class="text-xl">⏱️</span>
                <h3 class="font-bold text-lg text-neon-green">${exerciseName}</h3>
            </div>
            
            <!-- Duration Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Czas (minuty)</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${durationChartId}"></canvas>
                </div>
            </div>
            
            ${hasDistance ? `
            <!-- Distance Chart -->
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Dystans (km)</h4>
                <div class="bg-gray-900 rounded-lg p-3">
                    <canvas id="${distanceChartId}"></canvas>
                </div>
            </div>
            ` : ''}
            
            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Serie</p>
                    <p class="text-lg font-bold text-gray-300">${sortedSets.length}</p>
                </div>
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Najdł. czas</p>
                    <p class="text-lg font-bold text-blue-400">${Math.max(...sortedSets.map(s => s.duration))} min</p>
                </div>
                ${hasDistance ? `
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Całk. dystans</p>
                    <p class="text-lg font-bold text-neon-green">${sortedSets.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(1)} km</p>
                </div>
                ` : `
                <div class="bg-gray-900 rounded-lg p-3">
                    <p class="text-xs text-gray-500 mb-1">Całk. czas</p>
                    <p class="text-lg font-bold text-neon-green">${sortedSets.reduce((sum, s) => sum + s.duration, 0).toFixed(1)} min</p>
                </div>
                `}
            </div>
        </div>
    `;
    
    // Create duration chart
    const durationCtx = document.getElementById(durationChartId);
    if (durationCtx) {
        new Chart(durationCtx, {
            type: 'line',
            data: {
                labels: sortedSets.map((_, i) => `#${i + 1}`),
                datasets: [
                    {
                        label: 'Czas (min)',
                        data: sortedSets.map(s => s.duration),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#3b82f6',
                        bodyColor: '#fff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                const index = items[0].dataIndex;
                                const date = new Date(sortedSets[index].timestamp);
                                return date.toLocaleString('pl-PL', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            },
                            label: (context) => {
                                const set = sortedSets[context.dataIndex];
                                let label = `Czas: ${set.duration} min`;
                                if (set.distance) label += ` | Dystans: ${set.distance} km`;
                                if (set.elevation) label += ` | Wzniesienie: ${set.elevation} m`;
                                return label;
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
                            color: '#3b82f6', 
                            font: { size: 11, weight: 'bold' },
                            callback: (value) => value + ' min'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
    
    // Create distance chart if applicable
    if (hasDistance) {
        const distanceCtx = document.getElementById(distanceChartId);
        if (distanceCtx) {
            new Chart(distanceCtx, {
                type: 'line',
                data: {
                    labels: sortedSets.map((_, i) => `#${i + 1}`),
                    datasets: [
                        {
                            label: 'Dystans (km)',
                            data: sortedSets.map(s => s.distance || 0),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 3,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            titleColor: '#10b981',
                            bodyColor: '#fff',
                            borderColor: '#10b981',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                title: (items) => {
                                    const index = items[0].dataIndex;
                                    const date = new Date(sortedSets[index].timestamp);
                                    return date.toLocaleString('pl-PL', { 
                                        day: '2-digit', 
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                },
                                label: (context) => {
                                    const set = sortedSets[context.dataIndex];
                                    let label = `Dystans: ${set.distance || 0} km | Czas: ${set.duration} min`;
                                    if (set.elevation) label += ` | Wzniesienie: ${set.elevation} m`;
                                    return label;
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
                                color: '#10b981', 
                                font: { size: 11, weight: 'bold' },
                                callback: (value) => value + ' km'
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
        }
    }
}

// Share record functionality
function shareRecord(exerciseName, record) {
    const recordType = record.type || 'weighted';
    const sideMeta = typeof getBodySideMeta === 'function' ? getBodySideMeta(record.bodySide) : { label: '', symbol: '' };
    const sideText = sideMeta.label ? ` (${sideMeta.label})` : '';
    let shareText = `🏋️ GymLog - Mój Rekord!\n\n`;
    shareText += `💪 ${exerciseName}${sideText}\n`;
    
    if (recordType === 'weighted') {
        shareText += `⚡ ${record.weight}kg × ${record.reps} powtórzeń\n`;
    } else if (recordType === 'bodyweight') {
        shareText += `⚡ ${record.reps} powtórzeń`;
        if (record.addedWeight) shareText += ` (+${record.addedWeight}kg)`;
        shareText += `\n`;
    } else if (recordType === 'timed') {
        shareText += `⚡ ${record.duration} minut`;
        if (record.distance) shareText += ` | ${record.distance} km`;
        shareText += `\n`;
    }
    
    const date = new Date(record.date);
    shareText += `📅 ${date.toLocaleDateString('pl-PL')}\n\n`;
    shareText += `#GymLog #Trening #Fitness`;
    
    if (navigator.share) {
        navigator.share({
            title: `Rekord - ${exerciseName}`,
            text: shareText
        }).catch(err => console.log('Share cancelled', err));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('✅ Rekord skopiowany do schowka!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('❌ Nie udało się skopiować rekordu');
        });
    }
}

// Handle JSON import
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const result = await importFromJSON(file);
        
        if (result.imported > 0) {
            alert(`✅ Import zakończony!\n\n` +
                  `Zaimportowano: ${result.imported}\n` +
                  `Pominięto (duplikaty): ${result.skipped}`);
            
            // Odśwież widok
            displayTopExercises();
            displayPersonalRecords();
            initChartExerciseSelect();
        } else {
            alert('⚠️ Nie zaimportowano żadnych danych.\nWszystkie rekordy już istnieją.');
        }
    } catch (err) {
        alert('❌ Błąd importu:\n' + err.message);
    }
    
    // Reset input
    event.target.value = '';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set initial tab (Top 5)
    switchTab(0);
    
    displayTopExercises();
    displayPersonalRecords();
    initChartExerciseSelect();
    
    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    document.getElementById('importFile').addEventListener('change', handleImport);
    document.getElementById('exerciseSelect').addEventListener('change', onExerciseChange);
    document.getElementById('formulaSelect').addEventListener('change', onFormulaChange);
    document.getElementById('calculateBtn').addEventListener('click', calculate1RM);
    document.getElementById('chartExerciseSelect').addEventListener('change', onChartExerciseChange);
});
