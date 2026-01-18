// exercises.js - Exercise Management Module with Native Features
class ExerciseManager {
  constructor() {
    this.categories = [
      'Klatka', 'Plecy', 'Nogi', 'Barki', 'Ramiona', 'Cardio', 'Inne'
    ];
    this.customCategories = [];
    this.isCardioMode = false;
    this.timer = null;
    this.timerSeconds = 0;
    this.timerInterval = null;
  }

  /**
   * Generate unique exercise ID
   */
  generateId() {
    return `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add new exercise
   */
  async addExercise(exerciseData) {
    try {
      // Validate date - no future dates
      const exerciseDate = new Date(exerciseData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (exerciseDate > today) {
        throw new Error('Nie można dodać ćwiczenia z przyszłą datą');
      }

      const exercise = {
        id: this.generateId(),
        exerciseName: exerciseData.exerciseName || 'Bez nazwy',
        sets: exerciseData.sets || 0,
        reps: exerciseData.reps || 0,
        weight: exerciseData.weight || 0,
        time: exerciseData.time || 0,
        notes: exerciseData.notes || '',
        photo: exerciseData.photo || null,
        date: exerciseData.date || new Date().toISOString(),
        category: exerciseData.category || 'Inne',
        location: exerciseData.location || null,
        sessionId: exerciseData.sessionId,
        createdAt: new Date().toISOString()
      };

      await db.add('exercises', exercise);
      console.log('Exercise added:', exercise);
      return exercise;
    } catch (error) {
      console.error('Failed to add exercise:', error);
      throw error;
    }
  }

  /**
   * Get exercise by ID
   */
  async getExercise(exerciseId) {
    try {
      return await db.get('exercises', exerciseId);
    } catch (error) {
      console.error('Failed to get exercise:', error);
      return null;
    }
  }

  /**
   * Get all exercises
   */
  async getAllExercises() {
    try {
      const exercises = await db.getAll('exercises');
      return exercises.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Failed to get exercises:', error);
      return [];
    }
  }

  /**
   * Get exercises by session ID
   */
  async getExercisesBySession(sessionId) {
    try {
      return await db.getByIndex('exercises', 'sessionId', sessionId);
    } catch (error) {
      console.error('Failed to get exercises by session:', error);
      return [];
    }
  }

  /**
   * Update exercise
   */
  async updateExercise(exerciseId, updates) {
    try {
      const exercise = await db.get('exercises', exerciseId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      const updatedExercise = {
        ...exercise,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await db.update('exercises', updatedExercise);
      console.log('Exercise updated:', updatedExercise);
      return updatedExercise;
    } catch (error) {
      console.error('Failed to update exercise:', error);
      throw error;
    }
  }

  /**
   * Delete exercise
   */
  async deleteExercise(exerciseId) {
    try {
      await db.delete('exercises', exerciseId);
      console.log('Exercise deleted:', exerciseId);
      return true;
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      throw error;
    }
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(category) {
    try {
      return await db.getByIndex('exercises', 'category', category);
    } catch (error) {
      console.error('Failed to get exercises by category:', error);
      return [];
    }
  }

  /**
   * Get exercise history for progress tracking
   */
  async getExerciseHistory(exerciseName) {
    try {
      const exercises = await db.getByIndex('exercises', 'exerciseName', exerciseName);
      return exercises.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Failed to get exercise history:', error);
      return [];
    }
  }

  /**
   * Add custom category
   */
  async addCustomCategory(categoryName) {
    if (!this.customCategories.includes(categoryName)) {
      this.customCategories.push(categoryName);
      await this.saveCustomCategories();
    }
  }

  /**
   * Get all categories (predefined + custom)
   */
  async getAllCategories() {
    await this.loadCustomCategories();
    return [...this.categories, ...this.customCategories];
  }

  /**
   * Save custom categories to IndexedDB
   */
  async saveCustomCategories() {
    try {
      await db.update('settings', {
        key: 'customCategories',
        value: this.customCategories
      });
    } catch (error) {
      console.error('Failed to save custom categories:', error);
    }
  }

  /**
   * Load custom categories from IndexedDB
   */
  async loadCustomCategories() {
    try {
      const data = await db.get('settings', 'customCategories');
      if (data && data.value) {
        this.customCategories = data.value;
      }
    } catch (error) {
      console.error('Failed to load custom categories:', error);
    }
  }

  // ========== CAMERA FUNCTIONALITY ==========

  /**
   * Capture photo from camera
   */
  async capturePhoto() {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera nie jest dostępna w tej przeglądarce');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });

      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);

          // Compress and convert to base64
          const base64Image = canvas.toDataURL('image/jpeg', 0.7);
          
          // Stop camera
          stream.getTracks().forEach(track => track.stop());
          
          resolve(base64Image);
        };

        video.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Nie udało się uruchomić kamery'));
        };
      });
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  }

  /**
   * Select photo from file system
   */
  async selectPhotoFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('Nie wybrano pliku'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          // Compress image
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxSize) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else if (height > maxSize) {
              width = (width / height) * maxSize;
              height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const base64Image = canvas.toDataURL('image/jpeg', 0.7);
            resolve(base64Image);
          };
          img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Nie udało się wczytać pliku'));
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  // ========== GEOLOCATION FUNCTIONALITY ==========

  /**
   * Get current location
   */
  async getCurrentLocation() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolokalizacja nie jest dostępna w tej przeglądarce');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              coords: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };

            // Try to get location name from reverse geocoding (simplified)
            location.locationName = `Lokalizacja (${location.coords.lat.toFixed(4)}, ${location.coords.lng.toFixed(4)})`;

            resolve(location);
          },
          (error) => {
            console.error('Geolocation error:', error);
            reject(new Error('Nie udało się pobrać lokalizacji'));
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      });
    } catch (error) {
      console.error('Geolocation error:', error);
      throw error;
    }
  }

  /**
   * Save location to database
   */
  async saveLocation(location) {
    try {
      await db.add('locations', {
        locationName: location.locationName,
        coords: location.coords,
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  }

  /**
   * Get saved locations
   */
  async getSavedLocations() {
    try {
      return await db.getAll('locations');
    } catch (error) {
      console.error('Failed to get saved locations:', error);
      return [];
    }
  }

  // ========== TIMER FUNCTIONALITY ==========

  /**
   * Start timer
   */
  startTimer(seconds = 0) {
    this.timerSeconds = seconds;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimerDisplay();
    }, 1000);

    console.log('Timer started');
  }

  /**
   * Pause timer
   */
  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('Timer paused at', this.timerSeconds, 'seconds');
    }
  }

  /**
   * Reset timer
   */
  resetTimer() {
    this.pauseTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    console.log('Timer reset');
  }

  /**
   * Get current timer value
   */
  getTimerValue() {
    return this.timerSeconds;
  }

  /**
   * Update timer display
   */
  updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      const hours = Math.floor(this.timerSeconds / 3600);
      const minutes = Math.floor((this.timerSeconds % 3600) / 60);
      const seconds = this.timerSeconds % 60;

      timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('timerUpdate', { 
      detail: { seconds: this.timerSeconds } 
    }));
  }

  /**
   * Start countdown timer
   */
  startCountdown(seconds) {
    this.timerSeconds = seconds;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();

      if (this.timerSeconds <= 0) {
        this.pauseTimer();
        this.onCountdownComplete();
      }
    }, 1000);

    console.log('Countdown started:', seconds, 'seconds');
  }

  /**
   * Handle countdown completion
   */
  onCountdownComplete() {
    console.log('Countdown complete!');
    
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Show notification
    if (notificationManager && notificationManager.isEnabled()) {
      notificationManager.showNotification('Timer zakończony!', {
        body: 'Czas minął - kontynuuj trening!',
        requireInteraction: true
      });
    }

    // Play sound (optional)
    this.playTimerSound();

    // Dispatch event
    window.dispatchEvent(new CustomEvent('countdownComplete'));
  }

  /**
   * Play timer completion sound
   */
  playTimerSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  /**
   * Format seconds to time string
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// Create global instance
const exerciseManager = new ExerciseManager();
