/**
 * @fileoverview Utilidades para procesar la salida del modelo OCR.
 * Este módulo contiene funciones para transformar la salida bruta del modelo
 * en texto legible de matrículas, incluyendo operaciones de reshape, mapeo de índices
 * y limpieza de texto.
 */

/**
 * Postprocesa la salida del modelo OCR para obtener el texto de la matrícula.
 * Realiza reshape del output, obtiene los índices con mayor probabilidad,
 * los mapea al alfabeto y devuelve el texto final de la matrícula.
 * 
 * @param {Float32Array} modelOutput - Salida del modelo OCR en formato plano.
 * @param {Object} config - Configuración del modelo OCR.
 * @param {number} config.max_plate_slots - Número máximo de caracteres en la matrícula.
 * @param {string} config.alphabet - Cadena con todos los caracteres posibles.
 * @param {string} [config.pad_char='-'] - Carácter de relleno.
 * @param {boolean} [returnConfidence=false] - Indica si se debe devolver la confianza.
 * @returns {string|Object} Texto de la matrícula o objeto con texto y valores de confianza.
 */
export function postprocessOutput(modelOutput, config, returnConfidence = false) {
    // Extraer parámetros de la configuración
    const maxPlateSlots = config.max_plate_slots;
    const alphabet = config.alphabet;
    const padChar = config.pad_char || '-';
    const alphabetLength = alphabet.length;
    
    // Reshape del modelOutput
    // En Python: predictions = model_output.reshape((-1, max_plate_slots, len(model_alphabet)))
    const predictions = reshapeOutput(modelOutput, maxPlateSlots, alphabetLength);
    
    // Obtener los índices de mayor probabilidad para cada slot
    // En Python: prediction_indices = np.argmax(predictions, axis=-1)
    const predictionIndices = getMaxIndices(predictions, maxPlateSlots, alphabetLength);
    
    // Mapear los índices al alfabeto para obtener los caracteres
    // En Python: plate_chars = alphabet_array[prediction_indices]
    const plateChars = mapIndicesToChars(predictionIndices, alphabet);
    
    // Unir los caracteres para formar el texto de la matrícula
    // En Python: plates = np.apply_along_axis("".join, 1, plate_chars).tolist()
    const plateText = plateChars.join('');
    
    // Limpiar el texto eliminando caracteres de relleno
    const cleanedPlateText = cleanPlateText(plateText, padChar);
    
    if (returnConfidence) {
        // Obtener las probabilidades máximas (confianza) para cada caracter
        // En Python: probs = np.max(predictions, axis=-1)
        const confidenceValues = getMaxValues(predictions, maxPlateSlots, alphabetLength);
        return {
            text: cleanedPlateText,
            confidence: confidenceValues
        };
    }
    
    return cleanedPlateText;
}

/**
 * Reshape del output del modelo para su procesamiento.
 * Convierte una matriz plana en una estructura bidimensional.
 * 
 * @param {Float32Array} output - Salida plana del modelo.
 * @param {number} maxPlateSlots - Número máximo de caracteres.
 * @param {number} alphabetLength - Longitud del alfabeto.
 * @returns {Array<Array<number>>} Output con forma [maxPlateSlots][alphabetLength].
 * @throws {Error} Si el tamaño del output no coincide con lo esperado.
 */
function reshapeOutput(output, maxPlateSlots, alphabetLength) {
    const reshaped = [];
    const totalElements = maxPlateSlots * alphabetLength;
    
    // Verificar que el tamaño del output sea correcto
    if (output.length !== totalElements) {
        throw new Error(`Tamaño de salida incorrecto. Esperado: ${totalElements}, Recibido: ${output.length}`);
    }
    
    // Reshape: de [maxPlateSlots * alphabetLength] a [maxPlateSlots][alphabetLength]
    for (let i = 0; i < maxPlateSlots; i++) {
        const start = i * alphabetLength;
        const end = start + alphabetLength;
        reshaped.push(output.slice(start, end));
    }
    
    return reshaped;
}

/**
 * Obtiene los índices de los valores máximos para cada slot de carácter.
 * Para cada posición, determina cuál es el carácter más probable.
 * 
 * @param {Array<Array<number>>} predictions - Predicciones reshapeadas [maxPlateSlots][alphabetLength].
 * @param {number} maxPlateSlots - Número máximo de caracteres.
 * @param {number} alphabetLength - Longitud del alfabeto.
 * @returns {Array<number>} Índices de los valores máximos para cada slot.
 */
function getMaxIndices(predictions, maxPlateSlots, alphabetLength) {
    const indices = [];
    
    for (let i = 0; i < maxPlateSlots; i++) {
        const slotPredictions = predictions[i];
        let maxIndex = 0;
        let maxValue = slotPredictions[0];
        
        // Encontrar el índice del valor máximo
        for (let j = 1; j < alphabetLength; j++) {
            if (slotPredictions[j] > maxValue) {
                maxValue = slotPredictions[j];
                maxIndex = j;
            }
        }
        
        indices.push(maxIndex);
    }
    
    return indices;
}

/**
 * Obtiene los valores máximos (confianza) para cada slot de carácter.
 * Estos valores representan la certeza del modelo en la predicción.
 * 
 * @param {Array<Array<number>>} predictions - Predicciones reshapeadas [maxPlateSlots][alphabetLength].
 * @param {number} maxPlateSlots - Número máximo de caracteres.
 * @param {number} alphabetLength - Longitud del alfabeto.
 * @returns {Array<number>} Valores de confianza (entre 0 y 1) para cada carácter.
 */
function getMaxValues(predictions, maxPlateSlots, alphabetLength) {
    const values = [];
    
    for (let i = 0; i < maxPlateSlots; i++) {
        const slotPredictions = predictions[i];
        let maxValue = slotPredictions[0];
        
        // Encontrar el valor máximo
        for (let j = 1; j < alphabetLength; j++) {
            if (slotPredictions[j] > maxValue) {
                maxValue = slotPredictions[j];
            }
        }
        
        values.push(maxValue);
    }
    
    return values;
}

/**
 * Mapea los índices a caracteres del alfabeto.
 * Convierte cada índice numérico en su carácter correspondiente.
 * 
 * @param {Array<number>} indices - Índices de los caracteres en el alfabeto.
 * @param {string} alphabet - Alfabeto del modelo como cadena de caracteres.
 * @returns {Array<string>} Array de caracteres correspondientes a los índices.
 */
function mapIndicesToChars(indices, alphabet) {
    return indices.map(index => alphabet[index]);
}

/**
 * Limpia el texto de la matrícula eliminando caracteres de relleno.
 * Elimina los caracteres de padding que pueden aparecer al final del texto.
 * 
 * @param {string} plateText - Texto de la matrícula con posibles caracteres de relleno.
 * @param {string} [padChar='-'] - Carácter de relleno a eliminar.
 * @returns {string} Texto de la matrícula limpio sin caracteres de relleno.
 */
export function cleanPlateText(plateText, padChar = '-') {
    // Escapar caracteres especiales en el padChar para usarlo en RegExp
    const escapedPadChar = padChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Eliminar los caracteres de relleno al final
    return plateText.replace(new RegExp(`${escapedPadChar}+$`), '');
}