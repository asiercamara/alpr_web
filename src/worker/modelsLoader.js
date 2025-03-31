/**
 * @fileoverview Módulo encargado de la carga e inicialización de los modelos de IA
 * utilizados para la detección de matrículas y reconocimiento de texto (OCR).
 */

/**
 * Importación de la biblioteca ONNX Runtime para la ejecución de modelos,
 * URLs de los modelos y configuración OCR.
 */
import * as ort from "onnxruntime-web";
import yoloModelUrl from '/models/yolo-v9-t-384-license-plates-end2end.onnx?url';
import ocrModelUrl from '/models/european_mobile_vit_v2_ocr.onnx?url';
import ocrConfig from '../models/european_mobile_vit_v2_ocr_config.json' assert { type: 'json' };

/**
 * @constant {number} MODEL_SIZE - Tamaño de entrada del modelo (ancho y alto en píxeles).
 * @constant {Array<number>} modelInputShape - Forma del tensor de entrada para el modelo [batch, channels, height, width].
 * @constant {Array<string>} yolo_classes - Clases que puede detectar el modelo YOLOv9.
 */
const MODEL_SIZE = 384;
const modelInputShape = [1, 3, MODEL_SIZE, MODEL_SIZE];
const yolo_classes = ['license_plate'];

/**
 * Variables que almacenarán las instancias de los modelos una vez cargados.
 * @type {ort.InferenceSession|null}
 */
let modelYolov9 = null;
let ocrModel = null;

export { 
    modelYolov9, 
    ocrModel, 
    MODEL_SIZE, 
    modelInputShape, 
    yolo_classes, 
    initializeModels 
};

/**
 * Inicializa ambos modelos (YOLOv9 y OCR) y verifica que estén correctamente cargados.
 * 
 * @async
 * @function initializeModels
 * @returns {Promise<boolean>} Promesa que se resuelve a true si ambos modelos se cargan correctamente, false en caso contrario.
 */
async function initializeModels() {
    // Inicializar el modelo YOLOv9 y hacer warmup
    const yolov9Ready = await initializeModelYolov9();
    if (!yolov9Ready) {
        console.error("Error al cargar el modelo YOLOv9");
        return false;
    }

    // Inicializar el modelo OCR
    const ocrReady = await initializeModelOCR();
    if (!ocrReady) {
        console.error("Error al cargar el modelo OCR");
        return false;
    }

    return true; // Ambos modelos cargados y listos
}

/**
 * Inicializa el modelo YOLOv9 para detección de matrículas y realiza un warmup
 * para asegurar rendimiento óptimo en la primera inferencia.
 * 
 * @async
 * @function initializeModelYolov9
 * @returns {Promise<boolean>} Promesa que se resuelve a true si el modelo se carga y realiza warmup correctamente.
 */
async function initializeModelYolov9() {
    try {
        console.log("Iniciando carga del modelo...");
        modelYolov9 = await ort.InferenceSession.create(yoloModelUrl, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all'
        });
        
        console.log("Modelo cargado. Realizando warmup...");
        
        // Crear datos de entrada dummy para el warmup
        const dummyInput = new Float32Array(modelInputShape.reduce((a, b) => a * b));
        
        // Llenar el array con valores aleatorios entre 0 y 1
        for (let i = 0; i < dummyInput.length; i++) {
            dummyInput[i] = Math.random();
        }
        
        // Ejecutar inferencia con datos dummy
        const tensorInput = new ort.Tensor(dummyInput, modelInputShape);
        await modelYolov9.run({images: tensorInput});
        
        console.log("Warmup completado. Modelo listo para inferencia.");
        return true;
    } catch (error) {
        console.error("Error en la inicialización del modelo:", error);
        return false;
    }
}

/**
 * Inicializa el modelo OCR para reconocimiento de texto en matrículas.
 * 
 * @async
 * @function initializeModelOCR
 * @returns {Promise<boolean>} Promesa que se resuelve a true si el modelo OCR se carga correctamente.
 */
async function initializeModelOCR() {
    try {
        console.log("Iniciando carga del modelo OCR...", ocrConfig);        
        // Cargar el modelo OCR
        ocrModel = await ort.InferenceSession.create(ocrModelUrl);
        console.log('Modelo OCR cargado correctamente');
        return true;
    } catch (error) {
        console.error('Error al cargar el modelo OCR:', error);
        return false;
    }
}