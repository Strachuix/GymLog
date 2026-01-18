// ui.js - UI Helper Functions and Components
class UIManager {
  constructor() {
    this.toastContainer = null;
  }

  /**
   * Initialize UI components
   */
  init() {
    this.createToastContainer();
    this.createTemplates();
    this.setupServiceWorker();
    console.log('UI Manager initialized');
  }

  /**
   * Create reusable templates
   */
  createTemplates() {
    if (!document.getElementById('toastTemplate')) {
      const template = document.createElement('template');
      template.id = 'toastTemplate';
      template.innerHTML = `
        <div class="toast text-white" role="alert">
          <div class="toast-header text-white">
            <i class="bi me-2 toast-icon"></i>
            <strong class="me-auto">GymLog</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
          </div>
          <div class="toast-body"></div>
        </div>
      `;
      document.body.appendChild(template);
    }

    if (!document.getElementById('modalTemplate')) {
      const template = document.createElement('template');
      template.id = 'modalTemplate';
      template.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary modal-cancel" data-bs-dismiss="modal">Anuluj</button>
                <button type="button" class="btn btn-primary modal-confirm">Potwierdź</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(template);
    }

    if (!document.getElementById('loadingTemplate')) {
      const template = document.createElement('template');
      template.id = 'loadingTemplate';
      template.innerHTML = `
        <div class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.5); z-index: 9999;">
          <div class="card text-center p-4">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="loading-message"></div>
          </div>
        </div>
      `;
      document.body.appendChild(template);
    }

    if (!document.getElementById('emptyStateTemplate')) {
      const template = document.createElement('template');
      template.id = 'emptyStateTemplate';
      template.innerHTML = `
        <div class="text-center py-5">
          <i class="bi display-1 text-muted empty-icon"></i>
          <h4 class="mt-3 text-muted empty-message"></h4>
        </div>
      `;
      document.body.appendChild(template);
    }

    if (!document.getElementById('errorStateTemplate')) {
      const template = document.createElement('template');
      template.id = 'errorStateTemplate';
      template.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <span class="error-message"></span>
        </div>
      `;
      document.body.appendChild(template);
    }

    if (!document.getElementById('updateNotificationTemplate')) {
      const template = document.createElement('template');
      template.id = 'updateNotificationTemplate';
      template.innerHTML = `
        <div class="alert alert-info alert-dismissible fade show position-fixed bottom-0 start-50 translate-middle-x mb-3" style="z-index: 9999;">
          <i class="bi bi-download me-2"></i>
          <strong>Dostępna aktualizacja!</strong> Odśwież stronę, aby załadować nową wersję.
          <button type="button" class="btn btn-sm btn-info ms-3 update-reload-btn">Odśwież</button>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
      document.body.appendChild(template);
    }
  }

  /**
   * Create toast container
   */
  createToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      this.toastContainer = container;
    } else {
      this.toastContainer = document.getElementById('toastContainer');
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    const toastId = `toast_${Date.now()}`;
    const bgClass = {
      'success': 'bg-success',
      'error': 'bg-danger',
      'warning': 'bg-warning',
      'info': 'bg-info'
    }[type] || 'bg-info';

    const icon = {
      'success': 'bi-check-circle-fill',
      'error': 'bi-x-circle-fill',
      'warning': 'bi-exclamation-triangle-fill',
      'info': 'bi-info-circle-fill'
    }[type] || 'bi-info-circle-fill';

    // Clone template
    const template = document.getElementById('toastTemplate');
    const toast = template.content.cloneNode(true);
    const toastElement = toast.querySelector('.toast');
    
    // Set properties
    toastElement.id = toastId;
    toastElement.classList.add(bgClass);
    toastElement.querySelector('.toast-header').classList.add(bgClass);
    toastElement.querySelector('.toast-icon').classList.add(icon);
    toastElement.querySelector('.toast-body').textContent = message;
    
    this.toastContainer.appendChild(toast);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: duration });
    bsToast.show();

    // Remove from DOM after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  /**
   * Show confirmation dialog
   */
  async showConfirm(title, message) {
    return new Promise((resolve) => {
      const modalId = `confirmModal_${Date.now()}`;
      
      // Clone template
      const template = document.getElementById('modalTemplate');
      const modal = template.content.cloneNode(true);
      const modalElement = modal.querySelector('.modal');
      
      // Set properties
      modalElement.id = modalId;
      modalElement.querySelector('.modal-title').textContent = title;
      modalElement.querySelector('.modal-body').textContent = message;
      
      document.body.appendChild(modal);
      const modalEl = document.getElementById(modalId);
      const bsModal = new bootstrap.Modal(modalEl);
      
      modalEl.querySelector('.modal-confirm').addEventListener('click', () => {
        bsModal.hide();
        resolve(true);
      });

      modalEl.querySelector('.modal-cancel').addEventListener('click', () => {
        bsModal.hide();
        resolve(false);
      });

      modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
      });

      bsModal.show();
    });
  }

  /**
   * Show loading spinner
   */
  showLoading(message = 'Ładowanie...') {
    const loadingId = 'loadingSpinner';
    let loadingElement = document.getElementById(loadingId);

    if (!loadingElement) {
      // Clone template
      const template = document.getElementById('loadingTemplate');
      const loading = template.content.cloneNode(true);
      const loadingEl = loading.querySelector('.position-fixed');
      
      loadingEl.id = loadingId;
      loadingEl.querySelector('.loading-message').textContent = message;
      
      document.body.appendChild(loading);
    } else {
      loadingElement.querySelector('.loading-message').textContent = message;
      loadingElement.style.display = 'flex';
    }
  }

  /**
   * Hide loading spinner
   */
  hideLoading() {
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return date.toLocaleDateString('pl-PL', options);
  }

  /**
   * Format date for input field
   */
  formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get relative time (e.g., "2 days ago")
   */
  getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Dzisiaj';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tygodni temu`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} miesięcy temu`;
    return `${Math.floor(diffDays / 365)} lat temu`;
  }

  /**
   * Render empty state
   */
  renderEmptyState(container, message, iconClass = 'bi-inbox') {
    container.textContent = '';
    const template = document.getElementById('emptyStateTemplate');
    const emptyState = template.content.cloneNode(true);
    emptyState.querySelector('.empty-icon').classList.add(iconClass);
    emptyState.querySelector('.empty-message').textContent = message;
    container.appendChild(emptyState);
  }

  /**
   * Render error state
   */
  renderErrorState(container, message) {
    container.textContent = '';
    const template = document.getElementById('errorStateTemplate');
    const errorState = template.content.cloneNode(true);
    errorState.querySelector('.error-message').textContent = message;
    container.appendChild(errorState);
  }

  /**
   * Setup Service Worker
   */
  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registered:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const template = document.getElementById('updateNotificationTemplate');
    const notification = template.content.cloneNode(true);
    notification.querySelector('.update-reload-btn').onclick = () => location.reload();
    document.body.appendChild(notification);
  }

  /**
   * Check online status
   */
  checkOnlineStatus() {
    const updateOnlineStatus = () => {
      const statusBar = document.getElementById('onlineStatus');
      if (statusBar) {
        if (navigator.onLine) {
          statusBar.classList.remove('bg-danger');
          statusBar.classList.add('bg-success');
          statusBar.textContent = 'Online';
        } else {
          statusBar.classList.remove('bg-success');
          statusBar.classList.add('bg-danger');
          statusBar.textContent = 'Offline';
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  /**
   * Setup install prompt
   */
  setupInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install button
      const installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            installBtn.style.display = 'none';
          }
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.showToast('Aplikacja została zainstalowana!', 'success');
    });
  }

  /**
   * Animate element
   */
  animate(element, animation, duration = 1000) {
    return new Promise((resolve) => {
      element.style.animation = `${animation} ${duration}ms`;
      element.addEventListener('animationend', () => {
        element.style.animation = '';
        resolve();
      }, { once: true });
    });
  }

  /**
   * Scroll to top smoothly
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Skopiowano do schowka', 'success');
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Nie udało się skopiować', 'error');
      return false;
    }
  }

  /**
   * Share content (Web Share API)
   */
  async share(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    } else {
      this.showToast('Udostępnianie nie jest dostępne', 'warning');
      return false;
    }
  }
}

// Create global instance
const uiManager = new UIManager();

// Global helper functions
function showToast(message, type, duration) {
  uiManager.showToast(message, type, duration);
}

function showLoading(message) {
  uiManager.showLoading(message);
}

function hideLoading() {
  uiManager.hideLoading();
}

function showConfirm(title, message) {
  return uiManager.showConfirm(title, message);
}

// Initialize UI on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  uiManager.init();
  uiManager.checkOnlineStatus();
  uiManager.setupInstallPrompt();
});
