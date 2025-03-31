/**
 * @fileoverview Módulo para almacenamiento y gestión de matrículas detectadas
 * Implementa funciones para añadir, agrupar, filtrar y recuperar detecciones
 */

import { appState } from './config.js';
import { calculateTextSimilarity } from './validation.js';

// Constantes para configuración
const SIMILARITY_THRESHOLD = 0.8; // Umbral para considerar textos similares
const CONSECUTIVE_DETECTION_TIMEOUT = 5000; // Tiempo máximo entre detecciones consecutivas (ms)
const CONSECUTIVE_DETECTIONS_REQUIRED = 10; // Número de detecciones consecutivas para detener la cámara

/**
 * Añade una nueva detección al almacenamiento
 * @param {Object} plateData - Datos de la matrícula detectada
 * @returns {Object|boolean} Objeto de detección o true si debe detenerse la cámara
 */
export function addPlateDetection(plateData) {
    const { text, confidence, croppedImage, boundingBox } = plateData;
    
    // Generar ID único
    const uniqueId = `plate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear objeto de detección
    const detectionObj = {
        id: uniqueId,
        text,
        confidence,
        timestamp: new Date(),
        croppedImage,
        originalBoundingBox: boundingBox,
        occurrences: 1,
        isFiltered: false, // No filtrado por defecto
        plateText: plateData.plateText // Mantener datos originales del OCR
    };
    
    // Procesar según modo actual
    if (appState.currentMode === 'camera') {
        const shouldStop = processForCameraMode(detectionObj);
        if (shouldStop) {
            return true; // Señal para detener la cámara
        }
    }
    
    // Añadir al historial general
    appState.detectedPlates.push(detectionObj);
    
    // Agrupar con detecciones similares
    groupSimilarDetections(detectionObj);
    
    // Actualizar estadísticas
    updateDetectionStats();
    
    return detectionObj;
}

/**
 * Procesa una detección para modo cámara con lógica de detención automática
 * @param {Object} detectionObj - Objeto de detección
 * @returns {boolean} True si se debe detener la cámara
 */
function processForCameraMode(detectionObj) {
    const text = detectionObj.text;
    
    // Inicializar contador si es primera detección de este texto
    if (!appState.cameraConsecutiveDetections[text]) {
        appState.cameraConsecutiveDetections[text] = {
            count: 0,
            lastTimestamp: null,
            detections: []
        };
    }
    
    const current = appState.cameraConsecutiveDetections[text];
    const now = Date.now();
    
    // Reiniciar contador si ha pasado mucho tiempo entre detecciones
    if (current.lastTimestamp && (now - current.lastTimestamp) > CONSECUTIVE_DETECTION_TIMEOUT) {
        current.count = 0;
        current.detections = [];
    }
    
    // Incrementar contador y guardar esta detección
    current.count++;
    current.lastTimestamp = now;
    current.detections.push(detectionObj);
    
    // Verificar si llegamos al número requerido de detecciones consecutivas
    if (current.count >= CONSECUTIVE_DETECTIONS_REQUIRED) {
        console.log(`Detectada la misma matrícula (${text}) ${CONSECUTIVE_DETECTIONS_REQUIRED} veces consecutivas. Deteniendo cámara.`);
        return true; // Indicar que se debe detener la captura
    }
    
    return false;
}

/**
 * Agrupa detecciones similares para mejorar la precisión
 * @param {Object} newDetection - Nueva detección a agrupar
 */
function groupSimilarDetections(newDetection) {
    const text = newDetection.text;
    let foundGroup = false;
    
    // Buscar en grupos existentes
    for (const mainText in appState.plateGroups) {
        const similarity = calculateTextSimilarity(text, mainText);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
            // Es lo suficientemente similar, añadir a este grupo
            if (!appState.plateGroups[mainText].variants) {
                appState.plateGroups[mainText].variants = [];
            }
            
            appState.plateGroups[mainText].variants.push(newDetection);
            appState.plateGroups[mainText].totalOccurrences++;
            
            // Actualizar texto principal si esta variante es más frecuente
            let variantIndex = appState.plateGroups[mainText].variantTexts ? 
                appState.plateGroups[mainText].variantTexts.findIndex(v => v.text === text) : -1;
            
            if (!appState.plateGroups[mainText].variantTexts) {
                appState.plateGroups[mainText].variantTexts = [];
            }
            
            if (variantIndex >= 0) {
                appState.plateGroups[mainText].variantTexts[variantIndex].occurrences++;
            } else {
                appState.plateGroups[mainText].variantTexts.push({
                    text,
                    occurrences: 1
                });
            }
            
            // Si esta variante es ahora más frecuente, convertirla en la principal
            updateMainVariant(mainText);
            
            foundGroup = true;
            break;
        }
    }
    
    // Si no encontró grupo, crear uno nuevo
    if (!foundGroup) {
        appState.plateGroups[text] = {
            mainText: text,
            totalOccurrences: 1,
            variants: [newDetection],
            variantTexts: [{text, occurrences: 1}],
            confidenceMean: newDetection.confidence
        };
    }
}

/**
 * Actualiza la variante principal de un grupo si es necesario
 * @param {string} groupKey - Clave del grupo a actualizar
 */
function updateMainVariant(groupKey) {
    const group = appState.plateGroups[groupKey];
    
    if (!group || !group.variantTexts || group.variantTexts.length === 0) return;
    
    // Encontrar la variante con más ocurrencias
    const mainVariant = group.variantTexts.reduce(
        (max, v) => v.occurrences > max.occurrences ? v : max, 
        {occurrences: 0}
    );
    
    // Si la variante principal ha cambiado, actualizar el grupo
    if (mainVariant.text !== groupKey && mainVariant.occurrences > 
        group.variantTexts.find(v => v.text === groupKey)?.occurrences) {
        
        // Crear nuevo grupo con esta variante como principal
        const oldGroup = {...appState.plateGroups[groupKey]};
        delete appState.plateGroups[groupKey];
        
        appState.plateGroups[mainVariant.text] = {
            mainText: mainVariant.text,
            totalOccurrences: oldGroup.totalOccurrences,
            variants: oldGroup.variants,
            variantTexts: oldGroup.variantTexts,
            confidenceMean: calculateGroupConfidence(oldGroup.variants)
        };
    }
}

/**
 * Calcula la confianza promedio para un grupo de detecciones
 * @param {Array} variants - Array de detecciones variantes
 * @returns {number} Confianza promedio
 */
function calculateGroupConfidence(variants) {
    if (!variants || variants.length === 0) return 0;
    
    const sum = variants.reduce((total, variant) => total + variant.confidence, 0);
    return sum / variants.length;
}

/**
 * Actualiza estadísticas generales de detección
 */
function updateDetectionStats() {
    // Actualizar contador de matrículas únicas
    appState.videoStats.uniquePlatesCount = Object.keys(appState.plateGroups).length;
    
    // Actualizar elemento DOM si existe
    const statsElement = document.getElementById('detectionStats');
    if (statsElement) {
        statsElement.textContent = `Total: ${appState.detectedPlates.length} | Únicas: ${appState.videoStats.uniquePlatesCount}`;
    }
}

/**
 * Obtiene las mejores matrículas detectadas (filtradas y ordenadas)
 * @param {number} limit - Límite de resultados a devolver
 * @returns {Array} Array de las mejores detecciones
 */
export function getBestPlateDetections(limit = 10) {
    // Convertir grupos a array para ordenar
    const groupsArray = Object.values(appState.plateGroups);
    
    // Ordenar por número de ocurrencias (descendente)
    const sortedGroups = groupsArray.sort((a, b) => {
        // Primero por ocurrencias
        if (b.totalOccurrences !== a.totalOccurrences) {
            return b.totalOccurrences - a.totalOccurrences;
        }
        // Luego por confianza
        return b.confidenceMean - a.confidenceMean;
    });
    
    // Obtener la mejor detección de cada grupo
    const bestDetections = sortedGroups.map(group => {
        // Ordenar variantes por confianza
        const sortedVariants = [...group.variants].sort((a, b) => b.confidence - a.confidence);
        const bestVariant = sortedVariants[0];
        
        // Añadir información del grupo
        bestVariant.occurrences = group.totalOccurrences;
        bestVariant.isMainVariant = true;
        
        return bestVariant;
    });
    
    // Limitar resultados
    return bestDetections.slice(0, limit);
}

/**
 * Limpia el almacenamiento al cambiar de modo
 */
export function clearPlateStorage() {
    appState.detectedPlates = [];
    appState.plateGroups = {};
    appState.cameraConsecutiveDetections = {};
    appState.activePlateIndex = 0;
    appState.videoStats = {
        totalFrames: 0,
        processedFrames: 0,
        uniquePlatesCount: 0
    };
    
    // Actualizar UI si es necesario
    updateDetectionStats();
}