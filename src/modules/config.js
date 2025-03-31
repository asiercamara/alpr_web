// Configuración global
export const MODEL_SIZE = 384; // Tamaño del modelo (384x384)

// Elementos DOM
export function getElements() {
    return {
        video: document.querySelector("video"),
        canvas: document.querySelector("canvas"),
        imageBtn: document.getElementById('imageBtn'),
        videoBtn: document.getElementById('videoBtn'),
        cameraBtn: document.getElementById('cameraBtn'),
        imageInput: document.getElementById('imageInput'),
        videoInput: document.getElementById('videoInput'),
        playBtn: document.getElementById('playBtn'),
        stopBtn: document.getElementById('stopBtn'),
        playbackControls: document.getElementById('playbackControls'),
        modelStatusElement: document.getElementById('modelStatus'),
        darkModeToggle: document.getElementById('darkModeToggle')
    };
}

// Estado de la aplicación
export const appState = {
    // Propiedades existentes
    currentMode: null, // 'image', 'video', 'camera'
    stream: null,
    cameraActive: false,
    url: null,
    boxes: [],
    interval: null,
    busy: false,
    isPaused: false,
    isDarkMode: localStorage.getItem('darkMode') === 'true',
    
    // Nuevas propiedades para el sistema ampliado
    detectedPlates: [], // Historial completo de todas las matrículas detectadas
    activePlateIndex: 0, // Índice de la matrícula actualmente seleccionada
    plateGroups: {}, // Agrupación de matrículas por similitud textual
    cameraConsecutiveDetections: {}, // Para contar detecciones consecutivas en modo cámara
    processingActive: false, // Indica si el análisis continuo está activo
    stopCameraCallback: null, // Callback para detener la cámara automáticamente
    videoStats: {
        totalFrames: 0,
        processedFrames: 0,
        uniquePlatesCount: 0
    }
};
