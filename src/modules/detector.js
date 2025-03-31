import { appState } from './config.js';
import ModelWorker from '../worker/mainWorker?worker';
import { evaluatePlateQuality } from './validation.js';
import { addPlateDetection, clearPlateStorage } from './plateStorage.js';
import { showPlateModal } from './modal.js';

// Worker para la inferencia
export const worker = new ModelWorker();

// Manejo de respuestas del worker
export function setupWorkerListeners(onModelReady) {
    worker.onmessage = function(event) {
        if (event.data.status === "model_ready") {
            console.log("El modelo está listo para uso");
            // Actualizar el estado y habilitar botones
            const { modelStatusElement } = getElements();
            modelStatusElement.innerText = 'Model loaded and ready';
            modelStatusElement.style.color = 'green';
            
            if (onModelReady) onModelReady();
        } else if (event.data.status === "model_failed") {
            console.error("Hubo un problema al cargar el modelo");
            const { modelStatusElement } = getElements();
            modelStatusElement.innerText = 'Error loading model';
            modelStatusElement.style.color = 'red';
            alert('Error loading the detection model');
        } else if (event.data.error) {
            console.error("Error en la inferencia:", event.data.error);
            appState.busy = false;
        } else {
            // Procesar resultados normales de la inferencia
            appState.boxes = event.data.predictions || event.data;
            appState.busy = false;
        }
    };
}

// Variable para almacenar el último texto detectado
let lastDetectedTexts = {};

// Función para dibujar cajas en el canvas
export function draw_boxes(canvas, boxes) {
    const confThresh = 0.7; // Umbral de confianza para mostrar
    
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.font = "18px serif";
    
    // Procesar todas las cajas
    boxes
        .map(box => {
            // Calcular y añadir confidenceMean a cada box
            const confidenceValues = box.plateText.confidence;
            const confidenceSum = confidenceValues.reduce((a, b) => a + b, 0);
            box.confidenceMean = confidenceSum / confidenceValues.length;
            return box;
        })
        .filter(box => box.confidenceMean >= confThresh)
        .forEach(box => {
            const { x1, y1, x2, y2, label, confidence } = box;
            
            // Dibujar el recuadro
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            const displayText = `${label} ${(box.confidenceMean * 100).toFixed(1)}%: ${box.plateText.text}`;
            
            // Preparar el fondo para el texto
            ctx.fillStyle = "#00ff00";
            const width = ctx.measureText(displayText).width;
            // Colocar el fondo de texto ENCIMA del recuadro (restar altura del texto)
            ctx.fillRect(x1, y1 - 25, width + 10, 25);
            
            // Escribir el texto
            ctx.fillStyle = "#000000";
            // Colocar el texto dentro del rectángulo verde
            ctx.fillText(displayText, x1 + 5, y1 - 7);
            
            // Evaluar calidad de la matrícula
            const qualityEvaluation = evaluatePlateQuality(box);
            
            // Solo procesar matrículas válidas
            if (qualityEvaluation.isValid) {
                // Preparar datos para almacenamiento
                const plateData = {
                    text: box.plateText.text,
                    confidence: box.confidenceMean,
                    croppedImage: box.croppedImage,
                    boundingBox: {x1, y1, x2, y2},
                    plateText: box.plateText // Mantener datos originales del OCR
                };
                
                // Añadir al sistema de almacenamiento
                const detection = addPlateDetection(plateData);
                
                // Verificar si esto debe detener la captura de cámara
                if (appState.currentMode === 'camera' && detection === true) {
                    // Señal para detener la cámara por detecciones repetidas
                    if (appState.stopCameraCallback) {
                        appState.stopCameraCallback();
                    }
                }
                
                // Actualizar la UI
                if (detection && detection.id) {
                    updatePlatesListUI(box.plateText.text, box.confidenceMean, detection.id);
                }
            }
        });
}

// Función para actualizar la lista de matrículas en la UI
function updatePlatesListUI(plateText, confidence, uniqueId) {
    const platesList = document.getElementById('platesList');
    if (!platesList) return;
    
    const confidencePct = (confidence * 100).toFixed(1);
    const timestamp = new Date().toLocaleTimeString();
    
    const plateElement = document.createElement('div');
    plateElement.id = uniqueId;
    plateElement.className = 'p-2 bg-gray-100 dark:bg-gray-700 rounded flex justify-between items-center mb-2';
    plateElement.innerHTML = `
        <div class="flex-grow">
            <div class="flex justify-between">
                <span class="font-semibold">${plateText}</span>
                <span class="text-sm">${confidencePct}% - ${timestamp}</span>
            </div>
        </div>
        <button class="ml-2 px-2 py-1 bg-primary-light dark:bg-primary-dark text-white rounded-md text-xs view-plate-btn">
            Ver
        </button>
    `;
    
    // Añadir event listener al botón
    const viewBtn = plateElement.querySelector('.view-plate-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            // Mostrar esta matrícula específica en el modal
            const plateObj = appState.detectedPlates.find(p => p.id === uniqueId);
            if (plateObj) {
                showPlateModal(plateObj, true); // true indica que viene de la lista
            }
        });
    }
    
    // Añadir al principio de la lista para que las detecciones más recientes estén arriba
    platesList.prepend(plateElement);
    
    // En modo video o cámara, limitar el número visible (se guardan todas internamente)
    if (appState.currentMode === 'video' || appState.currentMode === 'camera') {
        // Mostrar solo las últimas 10 mientras está en proceso
        if (platesList.children.length > 10) {
            platesList.removeChild(platesList.lastChild);
        }
    }
}

// Función para limpiar la lista de matrículas y el almacenamiento interno
export function clearPlatesList() {
    // Limpiar el almacenamiento interno
    clearPlateStorage();
    
    // Limpiar el elemento HTML
    const platesList = document.getElementById('platesList');
    if (platesList) {
        platesList.innerHTML = '';
    }
}

// Recorta una región de la imagen basada en la detección
function drawCroppedImage4Debug(box) {
    const _canvas = document.createElement('canvas');
    const boxWidth = box.x2 - box.x1;
    const boxHeight = box.y2 - box.y1;
    
    // Configurar dimensiones
    _canvas.width = boxWidth;
    _canvas.height = boxHeight;
    
    _canvas.style.display = 'block';
    _canvas.style.width = `${boxWidth}px`;  
    _canvas.style.height = `${boxHeight}px`;
    
    const _ctx = _canvas.getContext('2d');
    _ctx.drawImage(box.croppedImage, 0, 0);

    // añadimos a canvas el texto de la matrícula box.plateText
    _ctx.font = "18px serif";
    _ctx.fillStyle = "#000000";
    // {  text: cleanedPlateText,  confidence: confidenceValues}
    _ctx.fillText(JSON.stringify(box.plateText), 5, 20);
    
    document.body.appendChild(_canvas);
}

// Importar getElements de config.js para uso interno
import { getElements } from './config.js';
