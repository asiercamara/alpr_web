// Importar módulos
import { getElements, appState } from './modules/config.js';
import { initDarkMode, toggleDarkMode, showCanvas, updatePlayPauseState } from './modules/ui.js';
import { setupWorkerListeners, draw_boxes } from './modules/detector.js';
import { setMode, processImage, startCamera, stopCamera, setupVideoEventListeners } from './modules/media.js';

// Obtener referencias a los elementos del DOM
const { 
    video, canvas, imageBtn, videoBtn, cameraBtn, 
    imageInput, videoInput, playBtn, stopBtn, 
    darkModeToggle
} = getElements();

// Inicializar botones
imageBtn.disabled = true;
videoBtn.disabled = true;
cameraBtn.disabled = true;
playBtn.disabled = true;
stopBtn.disabled = true;

// Configurar listeners para el worker
setupWorkerListeners(() => {
    // Callback cuando el modelo está listo
    imageBtn.disabled = false;
    videoBtn.disabled = false;
    cameraBtn.disabled = false;
});

// Event listeners para los botones principales
imageBtn.addEventListener('click', () => {
    imageInput.click();
});

videoBtn.addEventListener('click', () => {
    videoInput.click();
});

cameraBtn.addEventListener('click', () => {
    setMode('camera');
    startCamera();
});

// Event listener para cargar imagen
imageInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        setMode('image');
        processImage(e.target.files[0]);
    }
});

// Event listener para cargar video
videoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
  
    if (appState.url) {
        URL.revokeObjectURL(appState.url);
    }
    
    appState.url = URL.createObjectURL(file);
    video.crossOrigin = "anonymous";
    video.src = appState.url;
    setMode('video');
    
    // El video comenzará a reproducirse cuando esté listo
    video.onloadedmetadata = function() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        showCanvas(canvas);
        video.play();
    };
});

// Event listeners para los botones de reproducción
playBtn.addEventListener('click', () => {
    if (appState.currentMode === 'video' || appState.currentMode === 'camera') {
        if (appState.isPaused) {
            // Reanudar
            video.play();
            updatePlayPauseState(false);
        } else {
            // Pausar
            video.pause();
            updatePlayPauseState(true);
        }
    }
});

stopBtn.addEventListener('click', () => {
    if (appState.currentMode === 'video') {
        // Detener la reproducción del video
        video.pause();
        if (appState.interval) {
            clearInterval(appState.interval);
            appState.interval = null;
        }
        // Reiniciar el video
        video.currentTime = 0;
        updatePlayPauseState(true);
    } else if (appState.currentMode === 'camera') {
        // Detener la cámara
        stopCamera();
    }
});

// Configurar eventos del video
setupVideoEventListeners();

// Evento de redimensionamiento de ventana
window.addEventListener('resize', () => showCanvas(canvas));

// Asegurarse de que los event listeners se agreguen cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el modo oscuro
    initDarkMode();
    
    // Asegurar que el event listener está correctamente configurado
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    
});