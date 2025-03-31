/**
 * @fileoverview Módulo para el procesamiento de imágenes utilizado por el sistema ALPR.
 * Contiene funciones para preparar, recortar y redimensionar imágenes para su procesamiento
 * por el modelo de detección yolo-v9.
 */

import { MODEL_SIZE } from '../modelsLoader.js';

/**
 * Prepara una imagen para ser procesada por la red neuronal del sistema ALPR.
 * Redimensiona la imagen al tamaño del modelo y la convierte a un formato de tensor
 * apropiado (RGB normalizado en formato planar).
 * 
 * @param {ImageBitmap} imageBitmap - Imagen de entrada en formato ImageBitmap.
 * @returns {Float32Array|null} Array de valores normalizados en formato planar [R,G,B]
 *                             o null si hubo un error en el procesamiento.
 */
export function prepare_input(imageBitmap) {
    const tempCanvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
    const context = tempCanvas.getContext("2d");

    try {
        context.drawImage(imageBitmap, 0, 0, MODEL_SIZE, MODEL_SIZE);
        
        const imageData = context.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
        if (!imageData || !imageData.data || imageData.data.length === 0) {
            console.warn("No se pudieron obtener datos de imagen válidos");
            return null;
        }

        // Extraer canales RGB en formato planar
        const data = imageData.data;
        const red = [], green = [], blue = [];
        for (let index = 0; index < data.length; index += 4) {
            red.push(data[index] / 255);      // Canal R
            green.push(data[index + 1] / 255); // Canal G
            blue.push(data[index + 2] / 255); // Canal B
        }
        
        return [...red, ...green, ...blue]; // Tensor en formato planar
    } catch (error) {
        console.error("Error al preparar la entrada:", error);
        return null;
    }
}

/**
 * Recorta una porción específica de una imagen.
 * Útil para extraer las regiones donde se han detectado matrículas.
 * 
 * @param {ImageBitmap} imageBitmap - Imagen de origen a recortar.
 * @param {number} x - Coordenada X de la esquina superior izquierda del recorte.
 * @param {number} y - Coordenada Y de la esquina superior izquierda del recorte.
 * @param {number} width - Ancho del área a recortar en píxeles.
 * @param {number} height - Alto del área a recortar en píxeles.
 * @returns {ImageBitmap} Imagen recortada en formato ImageBitmap.
 */
export function cropImage(imageBitmap, x, y, width, height) {
    const offscreenCanvas = new OffscreenCanvas(width, height);
    const context = offscreenCanvas.getContext("2d");
    
    // Dibujar el área recortada en el nuevo canvas
    context.drawImage(imageBitmap, x, y, width, height, 0, 0, width, height);
    
    return offscreenCanvas.transferToImageBitmap(); // Devolver el ImageBitmap recortado
}

/**
 * Redimensiona una imagen a un tamaño específico manteniendo la proporción de aspecto.
 * Utilizado para normalizar tamaños antes del procesamiento OCR.
 * 
 * @async
 * @param {ImageBitmap} imageBitmap - Imagen original a redimensionar.
 * @param {number} targetWidth - Ancho objetivo en píxeles.
 * @param {number} targetHeight - Alto objetivo en píxeles.
 * @returns {Promise<ImageBitmap>} Promesa que se resuelve con la imagen redimensionada.
 */
export async function resizeImage(imageBitmap, targetWidth, targetHeight) {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    
    return canvas.transferToImageBitmap();
}