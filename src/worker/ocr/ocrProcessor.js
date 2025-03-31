/**
 * @fileoverview Procesador principal de OCR para reconocimiento de texto en matrículas.
 * Este módulo integra el preprocesamiento de imágenes, la ejecución del modelo OCR
 * y el postprocesamiento del texto detectado.
 */

import * as ort from "onnxruntime-web";
import { ocrModel } from '../modelsLoader.js';
import { preprocessImage, createInputTensor } from './imageProcessor.js';
import { postprocessOutput } from './textProcessor.js';
import ocrConfig from '../../models/european_mobile_vit_v2_ocr_config.json' assert { type: 'json' };

/**
 * Reconoce el texto de una placa de matrícula usando OCR.
 * Coordina todo el proceso de reconocimiento: preprocesamiento de imagen,
 * ejecución del modelo y postprocesamiento del texto.
 *
 * @async
 * @param {ImageBitmap} plateImage - Imagen de la matrícula recortada.
 * @param {boolean} [returnConfidence=false] - Si se debe devolver la confianza para cada carácter.
 * @returns {Promise<string|Object>} Texto reconocido o objeto con texto y valores de confianza.
 */
export async function recognizePlateText(plateImage, returnConfidence = false) {
    try {
        // 1. Preprocesar la imagen según los requisitos del modelo OCR
        const inputWidth = ocrConfig.img_width;
        const inputHeight = ocrConfig.img_height;
        
        // Preparar los datos de entrada normalizados y en escala de grises
        const inputData = preprocessImage(plateImage, inputHeight, inputWidth);
        
        // 2. Ejecutar inferencia OCR con el modelo
        const output = await runOcrModel(inputData, inputHeight, inputWidth);
        
        // 3. Procesar el resultado para obtener el texto de la matrícula
        return postprocessOutput(output, ocrConfig, returnConfidence);
    } catch (error) {
        console.error("Error en OCR:", error);
        return returnConfidence ? { text: "", confidence: [] } : "";
    }
}

/**
 * Ejecuta el modelo OCR en los datos de entrada proporcionados.
 * Crea el tensor de entrada apropiado y realiza la inferencia con el modelo.
 *
 * @async
 * @param {Uint8Array} input - Datos de imagen preprocesados en escala de grises.
 * @param {number} height - Altura de la imagen en píxeles.
 * @param {number} width - Anchura de la imagen en píxeles.
 * @returns {Promise<Float32Array>} Salida del modelo OCR como array plano.
 * @throws {Error} Si el modelo OCR no está inicializado.
 */
export async function runOcrModel(input, height, width) {
    if (!ocrModel) {
        throw new Error("Modelo OCR no inicializado");
    }
    
    // Crear tensor de entrada para ONNX Runtime
    const tensorInput = new ort.Tensor('uint8', input, [1, height, width, 1]);
    
    // Ejecutar el modelo
    const outputs = await ocrModel.run({ 'input': tensorInput });
    
    // Extraer y devolver la salida del modelo
    const outputName = Object.keys(outputs)[0];
    return outputs[outputName].data;
}
