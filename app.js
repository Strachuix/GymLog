// Common LocalStorage key
const STORAGE_KEY = 'gymlog_data';

// Load all sets from LocalStorage
function loadSets() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save sets to LocalStorage
function saveSets(sets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

// Get unique exercise names for datalist
function getExerciseHistory() {
    const sets = loadSets();
    const exercises = [...new Set(sets.map(s => s.exercise))];
    return exercises.sort();
}

// Get last set for a specific exercise
function getLastSetForExercise(exerciseName) {
    const sets = loadSets();
    const exerciseSets = sets.filter(s => s.exercise.toLowerCase() === exerciseName.toLowerCase());
    return exerciseSets.length > 0 ? exerciseSets[0] : null;
}

// Group sets by exercise
function groupSetsByExercise() {
    const sets = loadSets();
    const grouped = {};
    
    sets.forEach(set => {
        if (!grouped[set.exercise]) {
            grouped[set.exercise] = [];
        }
        grouped[set.exercise].push(set);
    });
    
    return grouped;
}

// Get top 3 most frequent exercises
function getTopExercises() {
    const grouped = groupSetsByExercise();
    const exercises = Object.keys(grouped).map(name => ({
        name: name,
        count: grouped[name].length,
        totalVolume: grouped[name].reduce((sum, s) => sum + (s.weight * s.reps), 0)
    }));
    
    return exercises.sort((a, b) => b.count - a.count).slice(0, 3);
}

// Get personal records (max weight) for each exercise
function getPersonalRecords() {
    const grouped = groupSetsByExercise();
    const records = [];
    
    Object.keys(grouped).forEach(exerciseName => {
        const sets = grouped[exerciseName];
        const maxWeightSet = sets.reduce((max, set) => 
            set.weight > max.weight ? set : max
        );
        
        records.push({
            exercise: exerciseName,
            weight: maxWeightSet.weight,
            reps: maxWeightSet.reps,
            date: maxWeightSet.timestamp
        });
    });
    
    return records.sort((a, b) => b.weight - a.weight);
}

// Export data to CSV
function exportToCSV() {
    const sets = loadSets();
    
    if (sets.length === 0) {
        alert('Brak danych do wyeksportowania!');
        return;
    }
    
    // Create CSV content
    let csv = 'Data,Godzina,Ćwiczenie,Ciężar (kg),Powtórzenia\n';
    
    sets.forEach(set => {
        const date = new Date(set.timestamp);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        csv += `${dateStr},${timeStr},"${set.exercise}",${set.weight},${set.reps}\n`;
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymlog_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Web Share API - Share a personal record
async function shareRecord(exercise, weight, reps) {
    const shareData = {
        title: 'GymLog - Mój rekord!',
        text: `Mój rekord w ${exercise} to ${weight}kg × ${reps}! 💪 Zrobione w #GymLog`,
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareData.text);
            alert('📋 Tekst skopiowany do schowka!\n\n' + shareData.text);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share error:', err);
        }
    }
}
