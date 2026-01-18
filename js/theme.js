// theme.js - Theme Management Module
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.themeKey = 'gymlog-theme';
  }

  /**
   * Initialize theme on page load
   */
  async init() {
    try {
      // Load theme from localStorage first (instant)
      const localTheme = localStorage.getItem(this.themeKey);
      
      if (localTheme) {
        this.currentTheme = localTheme;
      } else {
        // Auto-detect system theme preference
        this.currentTheme = this.detectSystemTheme();
        localStorage.setItem(this.themeKey, this.currentTheme);
      }

      // Apply theme immediately
      this.applyTheme(this.currentTheme);
      this.updateToggleButton();
      console.log('Theme initialized:', this.currentTheme);

      // Sync with IndexedDB in background (non-blocking)
      this.syncWithDatabase();
    } catch (error) {
      console.error('Theme initialization failed:', error);
      // Final fallback
      this.currentTheme = this.detectSystemTheme();
      this.applyTheme(this.currentTheme);
    }
  }

  /**
   * Sync theme with IndexedDB (non-blocking background operation)
   */
  async syncWithDatabase() {
    try {
      // Wait for database to be ready with longer timeout
      const dbReady = await this.waitForDatabase();
      
      if (!dbReady) {
        console.log('Database not available, using localStorage only');
        return;
      }
      
      const savedTheme = await db.get('settings', this.themeKey);
      
      if (savedTheme && savedTheme.value && savedTheme.value !== this.currentTheme) {
        // Database has different theme, use it
        this.currentTheme = savedTheme.value;
        localStorage.setItem(this.themeKey, this.currentTheme);
        this.applyTheme(this.currentTheme);
        this.updateToggleButton();
      } else if (!savedTheme) {
        // Save current theme to database
        await this.saveTheme(this.currentTheme);
      }
    } catch (error) {
      // Silently fail - localStorage is working fine
      console.log('Theme using localStorage only');
    }
  }

  /**
   * Wait for database to be initialized
   */
  async waitForDatabase(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.db && window.db.db) {
        console.log('✅ Database ready for theme sync');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('⏱️ Database not ready after 3 seconds, continuing with localStorage');
    return false; // Return false instead of throwing
  }

  /**
   * Detect system theme preference
   */
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
    }

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  /**
   * Toggle between light and dark theme
   */
  async toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    await this.saveTheme(newTheme);
    this.updateToggleButton();
    
    // Show toast notification
    if (typeof showToast === 'function') {
      showToast(`Przełączono na tryb ${newTheme === 'dark' ? 'ciemny' : 'jasny'}`, 'success');
    }
  }

  /**
   * Save theme preference to IndexedDB
   */
  async saveTheme(theme) {
    try {
      // Save to localStorage as backup
      localStorage.setItem(this.themeKey, theme);
      
      // Save to IndexedDB if available
      if (window.db && db.db) {
        await db.update('settings', {
          key: this.themeKey,
          value: theme,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Failed to save theme to IndexedDB, using localStorage:', error);
      localStorage.setItem(this.themeKey, theme);
    }
  }

  /**
   * Update theme toggle button UI
   */
  updateToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = this.currentTheme === 'dark' 
        ? 'bi bi-sun-fill' 
        : 'bi bi-moon-stars-fill';
    }

    toggleBtn.setAttribute('aria-label', 
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`
    );
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Listen for system theme changes
   */
  watchSystemTheme() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', async (e) => {
        const systemTheme = e.matches ? 'dark' : 'light';
        console.log('System theme changed to:', systemTheme);
        
        // Optionally auto-switch (can be made configurable)
        // this.applyTheme(systemTheme);
        // await this.saveTheme(systemTheme);
        // this.updateToggleButton();
      });
    }
  }
}

// Create global instance
const themeManager = new ThemeManager();

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => themeManager.init(), 100);
  });
} else {
  setTimeout(() => themeManager.init(), 100);
}

// Setup theme toggle button when available
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => themeManager.toggle());
  }

  // Watch for system theme changes
  themeManager.watchSystemTheme();
});
