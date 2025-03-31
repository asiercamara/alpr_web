import { appState } from './config.js';
import { showCanvas } from './ui.js';
import { draw_boxes, worker, clearPlatesList } from './detector.js';
import { showPlateModal } from './modal.js';
import { getBestPlateDetections } from './plateStorage.js';

// Establecer el modo actual
export function setMode(mode) {
    const { playbackControls, playBtn, stopBtn } = getElements();
    
    // Si ya hay un modo activo, limpiar el estado anterior
    if (appState.currentMode) {
        if (appState.currentMode === 'camera' && appState.stream) {
            stopCamera();
        } else if (appState.currentMode === 'video' && appState.interval) {
            clearInterval(appState.interval);
            appState.interval = null;
        }
    }
    
    appState.currentMode = mode;
    
    // Limpiar la lista de matrículas al cambiar de modo
    clearPlatesList();
    
    // Reiniciar estado
    appState.boxes = [];
    appState.processingActive = mode === 'video' || mode === 'camera';
    
    // Ocultar controles de reproducción por defecto
    playbackControls.style.display = 'none';
    
    // Configurar UI según el modo
    if (mode === 'image') {
        // En modo imagen no mostramos controles de reproducción
    } else if (mode === 'video' || mode === 'camera') {
        // En modo video o cámara mostramos controles
        playbackControls.style.display = 'flex';
        playBtn.disabled = false;
        stopBtn.disabled = false;
    }
}

// Función para procesar imagen (modificada para múltiples matrículas)
export function processImage(file) {
    const { canvas } = getElements();
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Ajustar tamaño del canvas a la imagen
        canvas.width = img.width;
        canvas.height = img.height;
        showCanvas(canvas);
        
        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0);
        if (!appState.busy) {
            createImageBitmap(canvas).then(imageBitmap => {
                worker.postMessage({ imageBitmap: imageBitmap }, [imageBitmap]); // Transferencia de propiedad
                
                appState.busy = true;
                // Esperar la respuesta del worker cuando busy sea false
                const checkFinish = setInterval(() => {
                    if (!appState.busy) {
                        // boxes ya debería estar actualizado
                        draw_boxes(canvas, appState.boxes);
                        
                        // Mostrar modal con las matrículas detectadas
                        if (appState.currentMode === 'image') {
                            // Obtener todas las matrículas válidas detectadas
                            const detectedPlates = getBestPlateDetections();
                            
                            if (detectedPlates && detectedPlates.length > 0) {
                                // Iniciar con la primera matrícula (mejor confianza)
                                appState.activePlateIndex = 0;
                                showPlateModal(detectedPlates[0]);
                            }
                        }
                        
                        clearInterval(checkFinish);
                    }
                }, 30);
            });
        }
    };
    img.crossOrigin = "anonymous";
    img.src = URL.createObjectURL(file);
}

// Iniciar la cámara web con soporte para detención automática
export async function startCamera() {
    const { video } = getElements();
    
    try {
        // Solicitar permiso al usuario para acceder a la cámara
        const constraints = {
            video: {
                facingMode: {
                    ideal: "environment"
                }
            },
            audio: false
        };

        appState.stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = appState.stream;
        
        // Configurar estado
        appState.cameraActive = true;
        appState.processingActive = true;
        updatePlayPauseState(false);
        
        // Configurar callback para detención automática
        appState.stopCameraCallback = () => {
            // Esta función se llamará cuando se detecte la misma matrícula 10 veces
            console.log("Detención automática activada: misma matrícula detectada 10 veces consecutivas");
            stopCamera();
            
            // Mostrar modal con resultados finales
            // Pequeña pausa para asegurar que la cámara se ha cerrado completamente
            setTimeout(() => {
                showFinalResults();
            }, 100);
        };
        
        // Esperar a que el video esté completamente listo antes de reproducirlo
        video.onloadedmetadata = function() {
            video.play();
        };
        
    } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert('Permission required to access camera');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert('No camera found');
        } else {
            console.error('Error accessing camera:', err);
            alert('Error starting camera: ' + err.message);
        }
    }
}

// Detener la cámara web y mostrar resultados finales
export function stopCamera() {
    const { video, canvas, playbackControls } = getElements();
    
    if (appState.stream) {
        // Detener el intervalo de inferencia si existe
        if (appState.interval) {
            clearInterval(appState.interval);
            appState.interval = null;
        }
        
        // Detener procesamiento activo
        appState.processingActive = false;
        
        appState.stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        appState.cameraActive = false;
        
        // No mostramos resultados finales aquí, ya que showFinalResults se llamará
        // desde stopCameraCallback si es necesario
        
        // Limpiar cualquier detección previa
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Volver al estado inicial
        // No reiniciamos el modo para mantener los resultados visibles
        canvas.style.display = 'none';
        playbackControls.style.display = 'none';
    }
}

// Función para mostrar resultados finales tras detener procesamiento
function showFinalResults() {
    // Obtener las mejores detecciones
    const bestDetections = getBestPlateDetections();
    
    if (bestDetections && bestDetections.length > 0) {
        // Actualizar platesList para mostrar todas las detecciones
        const platesList = document.getElementById('platesList');
        if (platesList) {
            platesList.innerHTML = '<h4 class="font-medium mb-2">Detecciones finales:</h4>';
            
            // Mostrar todas las detecciones agrupadas
            bestDetections.forEach(plate => {
                // Crear elemento en la lista para cada detección válida
                const plateElement = document.createElement('div');
                plateElement.id = plate.id;
                plateElement.className = 'p-2 bg-gray-100 dark:bg-gray-700 rounded flex justify-between items-center mb-2';
                
                const confidencePct = (plate.confidence * 100).toFixed(1);
                const occurrences = plate.occurrences || 1;
                
                plateElement.innerHTML = `
                    <div class="flex-grow">
                        <div class="flex justify-between">
                            <span class="font-semibold">${plate.plateText.text}</span>
                            <span class="text-sm">${confidencePct}% - ${occurrences} detecciones</span>
                        </div>
                    </div>
                    <button class="ml-2 px-2 py-1 bg-primary-light dark:bg-primary-dark text-white rounded-md text-xs view-plate-btn">
                        Ver
                    </button>
                `;
                
                // Añadir event listener al botón
                const viewBtn = plateElement.querySelector('.view-plate-btn');
                viewBtn.addEventListener('click', () => {
                    // Buscar el índice de esta placa
                    const index = appState.detectedPlates.findIndex(p => p.id === plate.id);
                    if (index >= 0) {
                        appState.activePlateIndex = index;
                        showPlateModal(plate, true);
                    }
                });
                
                platesList.appendChild(plateElement);
            });
        }
        
        // Mostrar automáticamente el modal con la mejor detección
        appState.activePlateIndex = 0;
        showPlateModal(bestDetections[0]);
    }
}

// Video processing setup modificado para procesamiento continuo
export function setupVideoEventListeners() {
    const { video, canvas } = getElements();
    
    // Manejar evento de reproducción del video
    video.addEventListener("play", () => {
        // Esperar a que el video tenga dimensiones válidas
        const waitForVideoReady = () => {
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                // Si el video aún no tiene dimensiones, esperar un poco más
                setTimeout(waitForVideoReady, 100);
                return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            showCanvas(canvas);
            
            const context = canvas.getContext("2d");
            
            // Activar procesamiento continuo
            appState.processingActive = true;
            
            appState.interval = setInterval(() => {
                if (video.readyState >= 2 && appState.processingActive) {
                    // Actualizar estadísticas de procesamiento
                    appState.videoStats.totalFrames++;
                    
                    context.drawImage(video, 0, 0);
                    draw_boxes(canvas, appState.boxes);
                    
                    if (!appState.busy) {
                        appState.videoStats.processedFrames++;
                        createImageBitmap(canvas).then(imageBitmap => {
                            worker.postMessage({ imageBitmap: imageBitmap }, [imageBitmap]);
                            appState.busy = true;
                        });
                    }
                }
            }, 20);
        };
        
        waitForVideoReady();
        updatePlayPauseState(false);
    });

    video.addEventListener("pause", () => {
        updatePlayPauseState(true);
    });
    
    video.addEventListener("ended", () => {
        // Cuando el video termina, detener el procesamiento y mostrar resultados
        if (appState.interval) {
            clearInterval(appState.interval);
            appState.interval = null;
        }
        
        appState.processingActive = false;
        updatePlayPauseState(true);
        
        // Mostrar resultados finales
        showFinalResults();
    });
}

// Imports locales
import { getElements } from './config.js';
import { updatePlayPauseState } from './ui.js';
