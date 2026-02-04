// Screen Wake Lock API Manager
// Prevents screen from turning off during workout

let wakeLock = null;
let wakeLockEnabled = false;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLockEnabled = true;
            updateWakeLockUI(true);
            
            wakeLock.addEventListener('release', () => {
                wakeLockEnabled = false;
                updateWakeLockUI(false);
            });
        }
    } catch (err) {
        console.error('Wake Lock error:', err);
        wakeLockEnabled = false;
        updateWakeLockUI(false);
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        wakeLockEnabled = false;
        updateWakeLockUI(false);
    }
}

async function toggleWakeLock() {
    if (wakeLockEnabled) {
        await releaseWakeLock();
    } else {
        await requestWakeLock();
    }
}

function updateWakeLockUI(active) {
    const dot = document.getElementById('wakeLockDot');
    const icon = document.getElementById('wakeLockIcon');
    const iconPath = document.getElementById('wakeLockIconPath');
    
    if (!dot || !icon || !iconPath) return;
    
    if (active) {
        // Active - green with pulse
        dot.className = 'w-2 h-2 bg-neon-green rounded-full animate-pulse';
        icon.className = 'w-4 h-4 text-neon-green';
        iconPath.setAttribute('d', 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z');
    } else {
        // Inactive - gray, open lock icon
        dot.className = 'w-2 h-2 bg-gray-600 rounded-full';
        icon.className = 'w-4 h-4 text-gray-600';
        iconPath.setAttribute('d', 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z');
    }
}

// Re-acquire wake lock when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (wakeLockEnabled && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});
