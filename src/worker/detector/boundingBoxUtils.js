/**
 * @fileoverview Utilidades para el procesamiento de cajas delimitadoras (bounding boxes).
 * Incluye funciones para calcular la intersección, unión, y aplicar el algoritmo de
 * supresión de no máximos (NMS) para eliminar detecciones redundantes.
 */

/**
 * Algoritmo de Supresión de No Máximos (NMS).
 * Elimina las cajas delimitadoras redundantes basándose en su superposición (IoU)
 * y dejando solo las detecciones más confiables.
 * 
 * @param {Array<Object>} boxes - Array de objetos que representan cajas delimitadoras.
 *                               Cada objeto debe tener propiedades x1, y1, x2, y2, label y area.
 * @returns {Array<Object>} Array filtrado con las cajas delimitadoras no suprimidas.
 */
export function nonMaxSuppression(boxes) {
    const result = [];
    while (boxes.length > 0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0], box) < 0.7 || boxes[0].label !== box.label);
    }
    
    return result;
}

/**
 * Calcula el índice IoU (Intersection over Union) entre dos cuadros delimitadores.
 * Este valor representa la proporción del área de intersección respecto al área de unión.
 * 
 * @param {Object} box1 - Primer cuadro delimitador con propiedades x1, y1, x2, y2 y area.
 * @param {Object} box2 - Segundo cuadro delimitador con propiedades x1, y1, x2, y2 y area.
 * @returns {number} Valor IoU entre 0 (sin superposición) y 1 (superposición completa).
 */
export function iou(box1, box2) {
    const intersectionArea = intersection(box1, box2);
    const unionArea = union(box1, box2);
    if (unionArea === 0) return 0;
    return intersectionArea / unionArea;
}

/**
 * Calcula el área de la unión de dos cuadros delimitadores.
 * La unión es la suma de las áreas menos la intersección.
 * 
 * @param {Object} box1 - Primer cuadro delimitador con propiedad area.
 * @param {Object} box2 - Segundo cuadro delimitador con propiedad area.
 * @returns {number} Área de la unión en píxeles cuadrados.
 */
export function union(box1, box2) {
    return box1.area + box2.area - intersection(box1, box2);
}

/**
 * Calcula el área de intersección entre dos cuadros delimitadores.
 * 
 * @param {Object} box1 - Primer cuadro delimitador con propiedades x1, y1, x2, y2.
 * @param {Object} box2 - Segundo cuadro delimitador con propiedades x1, y1, x2, y2.
 * @returns {number} Área de intersección en píxeles cuadrados. 0 si no hay intersección.
 */
export function intersection(box1, box2) {
    const x1 = Math.max(box1.x1, box2.x1);
    const y1 = Math.max(box1.y1, box2.y1);
    const x2 = Math.min(box1.x2, box2.x2);
    const y2 = Math.min(box1.y2, box2.y2);
    
    const width = Math.max(0, x2 - x1);
    const height = Math.max(0, y2 - y1);
    
    return width * height;
}