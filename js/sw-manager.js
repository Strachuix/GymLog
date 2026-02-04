// Service Worker Manager
// Handles Service Worker registration, updates, and notifications

// Register Service Worker with update checking
if ('serviceWorker' in navigator) {
    let refreshing = false;
    
    // Listen for controller change (new SW took control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
    
    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('Service Worker registered');
            
            // Check for updates every 60 seconds
            setInterval(() => {
                reg.update();
            }, 60000);
            
            // Check for update on start
            reg.update();
            
            // Listen for new Service Worker waiting
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch(err => console.error('Service Worker error', err));
    
    // Listen for messages from Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'VERSION') {
            console.log('Current Service Worker version:', event.data.version);
        }
    });
}

function showUpdateNotification() {
    const notification = document.getElementById('updateNotification');
    if (!notification) return;
    
    notification.classList.remove('hidden');
    
    notification.onclick = () => {
        // Notify waiting SW to take control
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        });
    };
}
