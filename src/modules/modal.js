/**
 * @fileoverview Funciones para manejar el modal de detalle de matrículas
 */

import { appState } from './config.js';
import { getBestPlateDetections } from './plateStorage.js';

/**
 * Muestra el modal con los detalles de la matrícula detectada
 * @param {Object} plate - Objeto con los datos de la matrícula detectada
 * @param {boolean} isFromList - Indica si la apertura viene desde la lista (opcional)
 */
export function showPlateModal(plate, isFromList = false) {
    if (!plate || !plate.plateText) return;
    
    const modal = document.getElementById('plateModal');
    const plateImageContainer = document.getElementById('plateImageContainer');
    const plateTextValue = document.getElementById('plateTextValue');
    const plateConfidenceMean = document.getElementById('plateConfidenceMean');
    const confidenceChartContainer = document.getElementById('confidenceChartContainer');
    
    // Obtener la lista de matrículas únicas
    const uniquePlates = getBestPlateDetections();
    
    // Si viene desde la lista, actualizar el índice activo
    if (isFromList) {
        const plateIndex = uniquePlates.findIndex(p => p.id === plate.id);
        if (plateIndex >= 0) {
            appState.activePlateIndex = plateIndex;
        }
    }
    
    // Preparar interfaz para múltiples matrículas
    prepareMultiplePlatesUI(modal, uniquePlates);
    
    // Limpiar contenedores y añadir un indicador de carga
    plateImageContainer.innerHTML = '<div class="animate-spin w-8 h-8 border-4 border-primary-light border-t-transparent rounded-full mx-auto"></div>';
    plateImageContainer.className = 'mb-4 bg-gray-100 dark:bg-gray-700 rounded-md p-2 flex justify-center items-center min-h-[120px]';
    confidenceChartContainer.innerHTML = '';
    
    // Mostrar la matrícula actual
    displayCurrentPlate(plate, plateImageContainer, plateTextValue, plateConfidenceMean, confidenceChartContainer);
    
    // Actualizar controles de navegación
    updateNavigationControls();
    
    // Mostrar el modal con animación
    modal.classList.remove('hidden');
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content') || modal.querySelector('div');
        modalContent.classList.add('scale-100');
        modalContent.classList.remove('scale-95', 'opacity-0');
        
        // Emitir vibración y beep solo cuando se abre el modal inicialmente, no al navegar
        if (!isFromList) {
            // Emitir vibración si está disponible
            if ('vibrate' in navigator) {
                navigator.vibrate(200); // Vibración de 200ms
            }
            
            // Reproducir beep de confirmación
            playConfirmationBeep();
        }
    }, 10);
    
    // Configurar botones de cierre
    setupCloseActions(modal);
}

/**
 * Prepara la interfaz para mostrar múltiples matrículas
 * @param {HTMLElement} modal - Elemento del modal
 * @param {Array} uniquePlates - Lista de matrículas únicas
 */
function prepareMultiplePlatesUI(modal, uniquePlates) {
    // Verificar si ya existe el contenedor de navegación
    let navContainer = modal.querySelector('.plates-navigation');
    
    if (!navContainer && uniquePlates.length > 1) {
        // Crear elementos para navegación
        const modalContent = modal.querySelector('.modal-content') || modal.querySelector('div');
        
        // Contenedor de navegación
        navContainer = document.createElement('div');
        navContainer.className = 'plates-navigation flex justify-between items-center p-3 border-t border-gray-200 dark:border-gray-700';
        
        // Indicador de posición
        const positionIndicator = document.createElement('div');
        positionIndicator.id = 'platePositionIndicator';
        positionIndicator.className = 'text-sm text-gray-600 dark:text-gray-400';
        
        // Botones de navegación
        const navButtons = document.createElement('div');
        navButtons.className = 'flex space-x-2';
        navButtons.innerHTML = `
            <button id="prevPlateBtn" class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button id="nextPlateBtn" class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        `;
        
        // Ensamblar elementos
        navContainer.appendChild(positionIndicator);
        navContainer.appendChild(navButtons);
        
        // Añadir antes del footer
        const footer = modalContent.querySelector('.bg-gray-50') || modalContent.querySelector('div:last-child');
        
        // Si el footer existe y es hijo de modalContent, insertar antes del footer
        // Si no, añadir al final de modalContent
        if (footer && footer.parentNode === modalContent) {
            modalContent.insertBefore(navContainer, footer);
        } else {
            modalContent.appendChild(navContainer);
        }
        
        // Configurar event listeners
        document.getElementById('prevPlateBtn').addEventListener('click', navigateToPrevPlate);
        document.getElementById('nextPlateBtn').addEventListener('click', navigateToNextPlate);
    }
}

/**
 * Muestra la matrícula actual en el modal
 * @param {Object} plate - Datos de la matrícula a mostrar
 * @param {HTMLElement} imageContainer - Contenedor para la imagen
 * @param {HTMLElement} textElement - Elemento para mostrar el texto
 * @param {HTMLElement} confidenceElement - Elemento para mostrar la confianza
 * @param {HTMLElement} chartContainer - Contenedor para el gráfico de confianza
 */
function displayCurrentPlate(plate, imageContainer, textElement, confidenceElement, chartContainer) {
    // Agregar la imagen de la matrícula con un pequeño retraso para mostrar el spinner
    if (plate.croppedImage) {
        setTimeout(() => {
            imageContainer.innerHTML = ''; // Limpiar el spinner
            const canvas = document.createElement('canvas');
            canvas.width = plate.croppedImage.width;
            canvas.height = plate.croppedImage.height;
            canvas.className = 'max-w-full max-h-64 rounded border border-gray-200 dark:border-gray-700 block';
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(plate.croppedImage, 0, 0);
            imageContainer.appendChild(canvas);
        }, 200);
    }
    
    // Mostrar el texto reconocido
    textElement.textContent = plate.plateText.text || 'Not recognized';
    
    // Calcular y mostrar la confianza media
    const confidenceValues = plate.plateText.confidence || [];
    const confidenceMean = confidenceValues.length > 0 
        ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length 
        : 0;
    
    confidenceElement.textContent = `${(confidenceMean * 100).toFixed(1)}%`;
    confidenceElement.className = getConfidenceClass(confidenceMean);
    
    // Crear gráfico de barras para la confianza por carácter
    createConfidenceChart(chartContainer, plate.plateText);
}

/**
 * Actualiza los controles de navegación según la posición actual
 */
function updateNavigationControls() {
    const positionIndicator = document.getElementById('platePositionIndicator');
    const prevButton = document.getElementById('prevPlateBtn');
    const nextButton = document.getElementById('nextPlateBtn');
    
    if (!positionIndicator || !prevButton || !nextButton) return;
    
    // Obtener la lista de matrículas únicas
    const uniquePlates = getBestPlateDetections();
    
    const currentIndex = appState.activePlateIndex;
    const totalPlates = uniquePlates.length;
    
    // Actualizar indicador de posición
    positionIndicator.textContent = `${currentIndex + 1} de ${totalPlates}`;
    
    // Deshabilitar botones según sea necesario
    prevButton.disabled = currentIndex === 0;
    prevButton.classList.toggle('opacity-50', currentIndex === 0);
    
    nextButton.disabled = currentIndex === totalPlates - 1;
    nextButton.classList.toggle('opacity-50', currentIndex === totalPlates - 1);
}

/**
 * Navega a la matrícula anterior
 */
function navigateToPrevPlate() {
    // Obtener la lista de matrículas únicas
    const uniquePlates = getBestPlateDetections();
    
    if (appState.activePlateIndex > 0) {
        appState.activePlateIndex--;
        const prevPlate = uniquePlates[appState.activePlateIndex];
        if (prevPlate) {
            showPlateModal(prevPlate, true);
        }
    }
}

/**
 * Navega a la matrícula siguiente
 */
function navigateToNextPlate() {
    // Obtener la lista de matrículas únicas
    const uniquePlates = getBestPlateDetections();
    
    if (appState.activePlateIndex < uniquePlates.length - 1) {
        appState.activePlateIndex++;
        const nextPlate = uniquePlates[appState.activePlateIndex];
        if (nextPlate) {
            showPlateModal(nextPlate, true);
        }
    }
}

/**
 * Crea un gráfico de barras simple para mostrar la confianza por carácter
 * @param {HTMLElement} container - Contenedor donde se creará el gráfico 
 * @param {Object} plateText - Objeto con texto y valores de confianza
 */
function createConfidenceChart(container, plateText) {
    if (!plateText || !plateText.confidence || !plateText.text) return;
    
    const text = plateText.text;
    const confidence = plateText.confidence;
    
    // Configurar el contenedor principal
    container.className = 'mt-2 bg-gray-50 dark:bg-gray-900 rounded p-2';
    container.style.minHeight = '150px'; // Aumentar la altura para mejor visualización
    
    const chartDiv = document.createElement('div');
    chartDiv.className = 'flex justify-around h-full w-full';
    
    // Crear una barra por cada carácter
    for (let i = 0; i < text.length; i++) {
        const charDiv = document.createElement('div');
        charDiv.className = 'flex flex-col items-center mx-1 h-full';
        
        // Valor de confianza
        const confValue = confidence[i] || 0;
        const confPercent = Math.max(5, Math.round(confValue * 100)); // Mínimo 5% para visualización
        
        // Valor numérico encima de la barra
        const valueDiv = document.createElement('div');
        valueDiv.className = 'text-xs font-semibold mb-1';
        valueDiv.textContent = `${confPercent}%`;
        
        // Contenedor de la barra con altura fija
        const barContainer = document.createElement('div');
        barContainer.className = 'flex items-end w-full flex-grow';
        barContainer.style.height = '80px'; // Altura fija para el contenedor de barras
        
        // Barra con altura variable
        const barDiv = document.createElement('div');
        barDiv.className = `w-6 ${getConfidenceClass(confValue)} rounded-t border border-gray-300 dark:border-gray-600 mx-auto`;
        // Usar un valor absoluto para la altura en lugar de porcentaje
        barDiv.style.height = `${confPercent * 0.8}px`; // Proporcional a la altura del contenedor (80px)
        
        // Etiqueta del carácter
        const labelDiv = document.createElement('div');
        labelDiv.className = 'text-xs font-medium mt-2';
        labelDiv.textContent = text[i];
        
        // Armar la estructura
        barContainer.appendChild(barDiv);
        charDiv.appendChild(valueDiv);
        charDiv.appendChild(barContainer);
        charDiv.appendChild(labelDiv);
        
        chartDiv.appendChild(charDiv);
    }
    
    // Limpiar el contenedor antes de añadir el gráfico
    container.innerHTML = '';
    container.appendChild(chartDiv);
}

/**
 * Devuelve una clase CSS según el nivel de confianza
 * @param {number} confidence - Valor de confianza entre 0 y 1
 * @returns {string} Clase CSS para aplicar color según confianza
 */
function getConfidenceClass(confidence) {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-900';
    if (confidence >= 0.7) return 'text-blue-600 dark:text-blue-400 bg-blue-200 dark:bg-blue-900';
    if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900';
    return 'text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-900';
}

/**
 * Configura las acciones para cerrar el modal
 * @param {HTMLElement} modal - Elemento del modal 
 */
function setupCloseActions(modal) {
    const closeBtn = document.getElementById('closeModalBtn');
    const closeIcon = document.getElementById('closeModal');
    
    const closeModal = () => {
        const modalContent = modal.querySelector('.modal-content') || modal.querySelector('div');
        modalContent.classList.add('scale-95', 'opacity-0');
        modalContent.classList.remove('scale-100');
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeIcon.addEventListener('click', closeModal);
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

/**
 * Reproduce un beep de confirmación
 */
function playConfirmationBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Frecuencia en Hz
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Ajustar volumen (valor bajo para que no sea molesto)
        gainNode.gain.value = 0.1;
        
        // Programar inicio y fin del sonido
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 200); // Duración del beep en ms
    } catch (error) {
        console.warn('No se pudo reproducir el beep de confirmación', error);
    }
}