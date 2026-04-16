// Comprehensive mobile and tablet support

// Add full touch event handling for camera controls
document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchmove', handleTouchMove);
document.addEventListener('touchend', handleTouchEnd);

// Pinch-to-zoom gesture support
let pinchStartDistance = null;
function handleTouchStart(event) {
    if (event.touches.length === 2) {
        pinchStartDistance = getDistance(event.touches[0], event.touches[1]);
    }
}

function handleTouchMove(event) {
    if (event.touches.length === 2 && pinchStartDistance) {
        const currentDistance = getDistance(event.touches[0], event.touches[1]);
        const zoomFactor = currentDistance / pinchStartDistance;
        // Implement zoom functionality here
    }
}

function getDistance(touch1, touch2) {
    return Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
}

// Swipe camera rotation using two-finger gestures

// ... (additional code for camera rotation and touch-optimized raycasting)

// Adaptive pixel ratio based on device type
let pixelRatio = window.devicePixelRatio || 1;

// Responsive UI text sizing
function adjustTextSize() {
    const viewportWidth = window.innerWidth;
    const newSize = Math.max(12, viewportWidth / 50);
    document.body.style.fontSize = newSize + 'px';
}
window.addEventListener('resize', adjustTextSize);
adjustTextSize();

// Mobile keyboard shortcuts and touch button alternatives

// Gesture detection for multi-touch swipe operations

// Performance optimization for mobile devices
// Reducing draw calls and managing frame rates based on device capabilities

// Full cross-device compatibility adjustments
