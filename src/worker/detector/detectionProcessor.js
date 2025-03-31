/**
 * @fileoverview Módulo para procesar las detecciones del modelo YOLO.
 * Se encarga de ejecutar el modelo, procesar su salida y extraer las regiones 
 * de imagen donde se detectaron matrículas.
 */

import * as ort from "onnxruntime-web";
import { modelYolov9, modelInputShape, yolo_classes } from '../modelsLoader.js';
import { nonMaxSuppression } from './boundingBoxUtils.js';
import { cropImage } from './imageProcessor.js';

/**
 * Ejecuta el modelo de detección YOLO en los datos de entrada proporcionados.
 * 
 * @async
 * @param {Array<number>} input - Datos de imagen preprocesados en formato planar.
 * @returns {Promise<ort.Tensor>} Tensor con las predicciones del modelo.
 * @throws {Error} Si hay un error durante la ejecución del modelo.
 */
export async function run_model(input) {
    const tensorInput = new ort.Tensor(Float32Array.from(input), modelInputShape);
    const outputs = await modelYolov9.run({images: tensorInput});
    const outputName = modelYolov9.outputNames[0];
    return outputs[outputName];
}

/**
 * Procesa las predicciones del modelo y extrae los bounding boxes de las matrículas detectadas.
 * Aplica escalado de coordenadas, filtrado por confianza y tamaño, y non-max suppression.
 * 
 * @param {ort.Tensor} predictions - Tensor con las predicciones del modelo YOLO.
 * @param {ImageBitmap} imageBitmap - Imagen original sobre la que se realizó la detección.
 * @returns {Array<Object>} Array de objetos con la información de cada matrícula detectada,
 *                         incluyendo coordenadas, confianza y la imagen recortada.
 */
export function process_output_boxes(predictions, imageBitmap) {
    const img_width = imageBitmap.width;
    const img_height = imageBitmap.height;
    const MODEL_SIZE = modelInputShape[2]; // 384

    const detectionResults = processModelOutput(predictions);
    const confThresh = 0.6; 
    const dimThresh = 5 * 5; 

    let boxes = detectionResults
        .filter(result => result.confidence > confThresh)
        .map(result => {
            const { x1, y1, x2, y2 } = result.bounding_box;
            
            // Escalar las coordenadas desde el tamaño del modelo al tamaño de la imagen original
            const scaleX = img_width / MODEL_SIZE;
            const scaleY = img_height / MODEL_SIZE;

            const scaledX1 = x1 * scaleX;
            const scaledY1 = y1 * scaleY;
            const scaledX2 = x2 * scaleX;
            const scaledY2 = y2 * scaleY;

            // Asegurar que las coordenadas estén dentro de los límites de la imagen
            const validX1 = Math.max(0, Math.min(img_width, scaledX1));
            const validY1 = Math.max(0, Math.min(img_height, scaledY1));
            const validX2 = Math.max(0, Math.min(img_width, scaledX2));
            const validY2 = Math.max(0, Math.min(img_height, scaledY2));
            
            return {
                x1: validX1,
                y1: validY1,
                x2: validX2,
                y2: validY2,
                label: result.label,
                confidence: result.confidence,
                area: (validX2 - validX1) * (validY2 - validY1),
            }
        })
        // Filtrar cajas inválidas o demasiado pequeñas
        .filter(box => box.x2 > box.x1 && box.y2 > box.y1 && box.area > dimThresh)
        // Ordenar por confianza descendente
        .sort((box1, box2) => box2.confidence - box1.confidence);

    // Aplicar non-max suppression para eliminar detecciones duplicadas
    let finalBoxes = nonMaxSuppression(boxes);
    
    // Extracción de las regiones de la imagen original
    let croppedBoxes = finalBoxes.map(box => {
        const x = Math.round(box.x1);
        const y = Math.round(box.y1);
        const width = Math.round(box.x2 - box.x1);
        const height = Math.round(box.y2 - box.y1);
        
        const croppedImage = cropImage(imageBitmap, x, y, width, height);
        
        return {
            ...box,
            croppedImage: croppedImage
        };
    });
    
    return croppedBoxes; 
}

/**
 * Procesa la salida del modelo YOLO y la convierte en un formato estructurado.
 * Extrae las coordenadas, clase y confianza de cada detección.
 * 
 * @param {ort.Tensor} modelOutput - Tensor de salida del modelo YOLO.
 * @returns {Array<Object>} Array de objetos con los resultados de detección estructurados:
 *                         - label: Etiqueta de la clase detectada
 *                         - confidence: Valor de confianza de la detección (0-1)
 *                         - bounding_box: Coordenadas de la caja delimitadora (x1,y1,x2,y2)
 */
export function processModelOutput(modelOutput) {
    const data = modelOutput.cpuData;
    const dimensions = modelOutput.dims;

    const numDetections = dimensions[0];
    const valuesPerDetection = dimensions[1];

    let detectionResults = [];
    
    for (let i = 0; i < numDetections; i++) {
        const startIdx = i * valuesPerDetection;
        
        const classId = Math.round(data[startIdx]);
        const x1 = data[startIdx + 1];
        const y1 = data[startIdx + 2];
        const x2 = data[startIdx + 3];
        const y2 = data[startIdx + 4];
        const confidence = data[startIdx + 6];
        
        const detectionResult = {
            label: yolo_classes[classId],
            confidence: confidence,
            bounding_box: {
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2
            }
        };
        
        detectionResults.push(detectionResult);
    }
    
    return detectionResults;
}