/**
 * @fileoverview Utilidades para el procesamiento de imágenes de matrículas para OCR.
 * Contiene funciones para preparar imágenes para ser procesadas por el modelo OCR,
 * incluyendo redimensionamiento y conversión a escala de grises.
 */

/**
 * Preprocesa una imagen de matrícula para el reconocimiento OCR.
 * Redimensiona la imagen al tamaño esperado por el modelo y la convierte
 * a escala de grises sin normalizar.
 *
 * @param {ImageBitmap} imageBitmap - Imagen de la matrícula a procesar.
 * @param {number} targetHeight - Altura objetivo para redimensionar (píxeles).
 * @param {number} targetWidth - Anchura objetivo para redimensionar (píxeles).
 * @returns {Uint8Array} Tensor de entrada para el modelo OCR en formato [batch, height, width, channels].
 */
export function preprocessImage(imageBitmap, targetHeight, targetWidth) {
    // Redimensionar y convertir a escala de grises
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    
    // Dibujar la imagen redimensionada en el canvas
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    
    // Obtener los datos de la imagen
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    
    // Convertir a escala de grises
    const grayscaleData = convertToGrayscale(imageData.data);
    
    // Formatear los datos para el modelo ONNX
    // Formato: [batch_size, height, width, channels]
    const inputData = new Uint8Array(1 * targetHeight * targetWidth * 1);
    
    // Copiar los datos en escala de grises al array de entrada del modelo
    for (let i = 0; i < grayscaleData.length; i++) {
        inputData[i] = grayscaleData[i];
    }
    
    return inputData;
}

/**
 * Convierte los datos de imagen RGB a escala de grises.
 * Utiliza la fórmula ponderada estándar: Gray = 0.299*R + 0.587*G + 0.114*B
 *
 * @param {Uint8ClampedArray} imageData - Datos de la imagen en formato RGBA.
 * @returns {Uint8Array} Datos de la imagen en escala de grises (valores 0-255).
 */
export function convertToGrayscale(imageData) {
    const grayscaleData = new Uint8Array(imageData.length / 4);
    
    // Recorremos los píxeles (formato RGBA)
    for (let i = 0; i < imageData.length; i += 4) {
        // Convertir a escala de grises usando la fórmula estándar
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Mantener valores entre 0-255 sin normalizar
        grayscaleData[i / 4] = gray;
    }
    
    return grayscaleData;
}

/**
 * Crea un tensor para ONNX Runtime a partir de los datos de la imagen.
 * Define la estructura que espera el modelo OCR.
 *
 * @param {Uint8Array} inputData - Datos preprocesados de la imagen.
 * @param {number} height - Altura de la imagen en píxeles.
 * @param {number} width - Anchura de la imagen en píxeles.
 * @returns {Object} Descripción del tensor para ONNX Runtime.
 */
export function createInputTensor(inputData, height, width) {
    return {
        // Formato esperado por el modelo: [batch_size, height, width, channels]
        dims: [1, height, width, 1],
        data: inputData,
        type: 'uint8'
    };
}