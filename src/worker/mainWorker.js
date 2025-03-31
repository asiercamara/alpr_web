/**
 * @fileoverview Web Worker para el procesamiento de reconocimiento automático de matrículas (ALPR).
 * Este archivo maneja la carga de modelos, la detección de matrículas y el reconocimiento OCR.
 */

/**
 * Importación de módulos necesarios para el procesamiento de imágenes y reconocimiento.
 * @module modelsLoader - Maneja la inicialización y carga de modelos de IA.
 * @module imageProcessor - Prepara las imágenes para la entrada al modelo.
 * @module detectionProcessor - Ejecuta el modelo de detección y procesa sus resultados.
 * @module ocrProcessor - Realiza el reconocimiento óptico de caracteres en las matrículas detectadas.
 */
import { initializeModels } from './modelsLoader.js';
import { prepare_input } from './detector/imageProcessor.js';
import { run_model, process_output_boxes } from './detector/detectionProcessor.js';
import { recognizePlateText } from './ocr/ocrProcessor.js';

/**
 * Inicia el proceso de carga y warmup de los modelos de IA inmediatamente.
 * @returns {Promise<boolean>} Promesa que se resuelve a true si los modelos se cargan correctamente, false en caso contrario.
 */
const modelsReady = initializeModels();

/**
 * Notifica al hilo principal cuando el modelo está listo o ha fallado en su carga.
 * @param {boolean} success - Indica si la inicialización del modelo fue exitosa.
 */
modelsReady.then(success => {
    if (success) {
        postMessage({status: "model_ready"});
    } else {
        postMessage({status: "model_failed"});
    }
});

/**
 * Manejador de mensajes del Web Worker que recibe datos de imagen para procesamiento.
 * Ejecuta el flujo completo de detección de matrículas y reconocimiento de texto.
 * 
 * @param {MessageEvent} event - Evento que contiene los datos recibidos del hilo principal.
 * @param {ImageBitmap} event.data.imageBitmap - Imagen a procesar en formato ImageBitmap.
 * @returns {void} No retorna un valor, pero envía el resultado mediante postMessage.
 */
onmessage = async(event) => {
    const imageBitmap = event.data.imageBitmap;
    
    /**
     * Prepara la imagen para su procesamiento por el modelo de detección.
     * Redimensiona y normaliza la imagen según los requisitos del modelo.
     */
    const input = prepare_input(imageBitmap);
    
    // Asegurarse de que el modelo esté listo
    if (!await modelsReady) {
        postMessage({error: "No se pudo cargar el modelo"});
        return;
    }
    
    try {
        /**
         * Ejecuta el modelo de detección con la imagen preparada.
         * @returns {Object} Predicciones crudas del modelo.
         */
        const predictions = await run_model(input);
        
        /**
         * Procesa las predicciones del modelo para obtener las cajas delimitadoras.
         * Extrae las regiones de la imagen que contienen posibles matrículas.
         * @returns {Array<Object>} Array de objetos con información de las matrículas detectadas.
         */
        const boxes = process_output_boxes(predictions, imageBitmap);
        
        // Para cada matrícula detectada, aplicar OCR
        for (const box of boxes) {
            const plateImage = box.croppedImage;
            
            /**
             * Realiza el reconocimiento óptico de caracteres (OCR) en la imagen de la matrícula.
             * @param {ImageBitmap} plateImage - Imagen de la matrícula recortada.
             * @param {boolean} enhance - Indica si se debe aplicar mejora de imagen antes del OCR.
             * @returns {Object} Objeto con el texto reconocido y valores de confianza.
             */
            const plateText = await recognizePlateText(plateImage, true);
            box.plateText = plateText;
        }

        postMessage(boxes);
    } catch (error) {
        postMessage({error: error.message});
    }
}