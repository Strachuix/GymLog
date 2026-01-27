// PWA Install Logic
let deferredPrompt;
let installButton;

// Initialize install functionality
function initInstall() {
    // installButton is already set in DOMContentLoaded
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is already installed');
        return; // Already installed, don't show button
    }
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt fired');
        
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show the install button
        showInstallButton();
    });
    
    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        
        // Hide the install button
        hideInstallButton();
        
        // Clear the deferredPrompt
        deferredPrompt = null;
        
        // Show success notification
        showInstallSuccess();
    });
}

// Show install button
function showInstallButton() {
    if (installButton) {
        installButton.style.display = 'flex';
        // Add animation
        setTimeout(() => {
            installButton.style.opacity = '1';
            installButton.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Hide install button
function hideInstallButton() {
    if (installButton) {
        installButton.style.opacity = '0';
        installButton.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            installButton.style.display = 'none';
        }, 300);
    }
}

// Handle install button click
async function handleInstallClick() {
    if (!deferredPrompt) {
        console.log('No deferred prompt available');
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
    } else {
        console.log('User dismissed the install prompt');
        // Still hide the button if user dismissed
        setTimeout(() => hideInstallButton(), 2000);
    }
    
    // We've used the prompt, clear it
    deferredPrompt = null;
}

// Show success notification
function showInstallSuccess() {
    const toast = document.getElementById('toast');
    if (toast) {
        const originalText = toast.textContent;
        toast.textContent = '✓ GymLog zainstalowana!';
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.textContent = originalText;
        }, 3000);
    }
}

// Close install button manually
function closeInstallPrompt() {
    hideInstallButton();
    
    // Save preference to not show again for 7 days
    const hideUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('gymlog_install_hide_until', hideUntil);
}

// Check if we should show the install prompt
function shouldShowInstallPrompt() {
    const hideUntil = localStorage.getItem('gymlog_install_hide_until');
    
    if (!hideUntil) {
        return true;
    }
    
    return Date.now() > parseInt(hideUntil);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Always get the button reference
    installButton = document.getElementById('installButton');
    
    // Only initialize install logic if we should show the prompt
    if (shouldShowInstallPrompt()) {
        initInstall();
    } else {
        // Ensure button stays hidden if user dismissed it recently
        if (installButton) {
            installButton.style.display = 'none';
        }
    }
});
