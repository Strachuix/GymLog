// Common LocalStorage key
const STORAGE_KEY = 'gymlog_data';

// Sanitize user input
function sanitizeInput(input, maxLength = 40) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove URLs (http://, https://, www.)
    sanitized = sanitized.replace(/(https?:\/\/|www\.)[^\s]+/gi, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>"'`]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

// Load all sets from LocalStorage with migration
function loadSets() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const sets = JSON.parse(data);
    
    // Migrate old data: add type: 'weighted' if missing
    let needsMigration = false;
    const migrated = sets.map(set => {
        if (!set.type) {
            needsMigration = true;
            return { ...set, type: 'weighted' };
        }
        return set;
    });
    
    // Save migrated data
    if (needsMigration) {
        saveSets(migrated);
        console.log('Data migrated: added type field to', sets.length, 'entries');
    }
    
    return migrated;
}

// Save sets to LocalStorage
function saveSets(sets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

// Delete a set by ID
function deleteSet(id) {
    const sets = loadSets();
    const filtered = sets.filter(s => s.id !== id);
    saveSets(filtered);
    return filtered.length < sets.length; // Return true if something was deleted
}

// Update a set by ID
function updateSet(id, updates) {
    const sets = loadSets();
    const index = sets.findIndex(s => s.id === id);
    
    if (index === -1) {
        return false; // Set not found
    }
    
    // Update only provided fields
    sets[index] = {
        ...sets[index],
        ...updates,
        id: sets[index].id // Preserve ID
    };
    
    saveSets(sets);
    return true;
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

// Get top 5 most frequent exercises
function getTopExercises() {
    const grouped = groupSetsByExercise();
    const exercises = Object.keys(grouped).map(name => ({
        name: name,
        count: grouped[name].length,
        totalVolume: grouped[name].reduce((sum, s) => sum + (s.weight * s.reps), 0)
    }));
    
    return exercises.sort((a, b) => b.count - a.count).slice(0, 5);
}

// Get personal records (max weight) for each exercise
function getPersonalRecords() {
    const grouped = groupSetsByExercise();
    const records = [];
    
    Object.keys(grouped).forEach(exerciseName => {
        const sets = grouped[exerciseName];
        const exerciseType = sets[0].type || 'weighted';
        
        let maxSet;
        if (exerciseType === 'weighted') {
            maxSet = sets.reduce((max, set) => 
                set.weight > max.weight ? set : max
            );
        } else if (exerciseType === 'bodyweight') {
            maxSet = sets.reduce((max, set) => 
                set.reps > max.reps ? set : max
            );
        } else if (exerciseType === 'timed') {
            // For timed: longest duration
            maxSet = sets.reduce((max, set) => 
                set.duration > max.duration ? set : max
            );
        }
        
        records.push({
            exercise: exerciseName,
            type: exerciseType,
            weight: maxSet.weight,
            reps: maxSet.reps,
            addedWeight: maxSet.addedWeight,
            duration: maxSet.duration,
            distance: maxSet.distance,
            date: maxSet.timestamp
        });
    });
    
    return records.sort((a, b) => {
        // Sort weighted by weight, bodyweight by reps, timed by duration
        if (a.type === 'weighted' && b.type === 'weighted') {
            return b.weight - a.weight;
        } else if (a.type === 'bodyweight' && b.type === 'bodyweight') {
            return b.reps - a.reps;
        } else if (a.type === 'timed' && b.type === 'timed') {
            return b.duration - a.duration;
        }
        // Mixed types - maintain alphabetical
        return a.exercise.localeCompare(b.exercise);
    });
}

// Check if new set is a personal record
function checkNewRecord(exercise, weight) {
    const exerciseSets = loadSets().filter(s => s.exercise === exercise);
    
    // Must have at least 1 previous set (so this is 2nd or more)
    if (exerciseSets.length < 1) {
        return null;
    }
    
    // Find previous max weight
    const previousMax = Math.max(...exerciseSets.map(s => s.weight));
    
    // Check if new weight beats the record
    if (weight > previousMax) {
        return {
            exercise: exercise,
            newWeight: weight,
            previousWeight: previousMax,
            improvement: weight - previousMax
        };
    }
    
    return null;
}

// Export data to JSON
function exportToJSON() {
    const sets = loadSets();
    
    if (sets.length === 0) {
        alert('Brak danych do wyeksportowania!');
        return;
    }
    
    // Create JSON content
    const json = JSON.stringify(sets, null, 2);
    
    // Create blob and download
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymlog_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Import data from JSON
function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedSets = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedSets)) {
                    reject(new Error('Nieprawidłowy format pliku JSON'));
                    return;
                }
                
                if (importedSets.length === 0) {
                    reject(new Error('Plik JSON jest pusty'));
                    return;
                }
                
                const existingSets = loadSets();
                const existingIds = new Set(existingSets.map(s => s.id));
                
                let imported = 0;
                let skipped = 0;
                const newSets = [];
                
                importedSets.forEach(set => {
                    // Validate required fields
                    if (!set.exercise || set.weight === undefined || set.reps === undefined) {
                        return; // Skip invalid entries
                    }
                    
                    // Sanitize exercise name
                    const sanitizedExercise = sanitizeInput(set.exercise, 40);
                    if (!sanitizedExercise) {
                        return; // Skip if sanitization results in empty string
                    }
                    
                    // Generate ID if missing
                    if (!set.id) {
                        set.id = crypto.randomUUID();
                    }
                    
                    // Skip if ID already exists
                    if (existingIds.has(set.id)) {
                        skipped++;
                        return;
                    }
                    
                    // Ensure timestamp exists
                    if (!set.timestamp) {
                        set.timestamp = Date.now();
                    }
                    
                    newSets.push({
                        id: set.id,
                        exercise: sanitizedExercise,
                        weight: parseFloat(set.weight),
                        reps: parseInt(set.reps),
                        timestamp: set.timestamp
                    });
                    
                    imported++;
                    existingIds.add(set.id);
                });
                
                if (imported > 0) {
                    // Merge and sort by timestamp (newest first)
                    const allSets = [...existingSets, ...newSets]
                        .sort((a, b) => b.timestamp - a.timestamp);
                    saveSets(allSets);
                }
                
                resolve({ imported, skipped });
            } catch (err) {
                if (err instanceof SyntaxError) {
                    reject(new Error('Nieprawidłowy format JSON'));
                } else {
                    reject(err);
                }
            }
        };
        
        reader.onerror = () => reject(new Error('Błąd odczytu pliku'));
        reader.readAsText(file, 'UTF-8');
    });
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
