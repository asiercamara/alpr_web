/**
 * @fileoverview Módulo para validación y comparación de matrículas detectadas
 * Implementa algoritmos para calcular similitud textual y evaluar calidad de detecciones
 */

/**
 * Calcula la similitud entre dos textos de matrícula
 * @param {string} text1 - Primer texto
 * @param {string} text2 - Segundo texto
 * @returns {number} Valor de similitud entre 0 y 1
 */
export function calculateTextSimilarity(text1, text2) {
    // Si son exactamente iguales
    if (text1 === text2) return 1.0;
    
    // Normalizar textos (eliminar espacios, convertir a mayúsculas)
    const normalize = (text) => text.replace(/\s+/g, '').toUpperCase();
    const normText1 = normalize(text1);
    const normText2 = normalize(text2);
    
    // Calcular distancia de Levenshtein
    const distance = levenshteinDistance(normText1, normText2);
    const maxLength = Math.max(normText1.length, normText2.length);
    
    // Convertir a similitud (1 - distancia/maxLength)
    return 1 - (distance / maxLength);
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas
 * @param {string} s1 - Primera cadena
 * @param {string} s2 - Segunda cadena
 * @returns {number} Distancia de edición
 */
function levenshteinDistance(s1, s2) {
    // Matriz para cálculo dinámico
    const d = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));
    
    // Inicialización
    for (let i = 0; i <= s1.length; i++) d[i][0] = i;
    for (let j = 0; j <= s2.length; j++) d[0][j] = j;
    
    // Cálculo de distancia
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i-1] === s2[j-1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i-1][j] + 1,      // eliminación
                d[i][j-1] + 1,      // inserción
                d[i-1][j-1] + cost  // sustitución
            );
        }
    }
    
    return d[s1.length][s2.length];
}

/**
 * Evalúa la calidad de una detección de matrícula
 * @param {object} detection - Objeto de detección
 * @returns {object} Resultado de la evaluación con puntaje y razones
 */
export function evaluatePlateQuality(detection) {
    const { plateText, confidenceMean } = detection;
    const text = plateText.text;
    
    // Criterios de calidad
    const criteria = [
        // Verificar longitud adecuada (entre 4 y 10 caracteres)
        {
            check: text.length >= 4 && text.length <= 10,
            weight: 0.2,
            reason: 'Longitud inadecuada'
        },
        // Verificar confianza general
        {
            check: confidenceMean >= 0.7,
            weight: 0.3,
            reason: 'Baja confianza general'
        },
        // Verificar confianza mínima de caracteres individuales
        {
            check: Math.min(...plateText.confidence) >= 0.5,
            weight: 0.25,
            reason: 'Caracteres de muy baja confianza'
        },
        // Verificar formato consistente con patrones de matrícula
        // Este patrón es genérico, puede ajustarse según el formato específico de matrículas
        {
            check: /^[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}$/i.test(text.trim()),
            weight: 0.25,
            reason: 'Formato inconsistente'
        }
    ];
    
    // Calcular puntuación
    let score = 0;
    const failedReasons = [];
    
    criteria.forEach(criterion => {
        if (criterion.check) {
            score += criterion.weight;
        } else {
            failedReasons.push(criterion.reason);
        }
    });
    
    return {
        score,
        isValid: score >= 0.7, // Umbral para considerar válida
        reasons: failedReasons
    };
}