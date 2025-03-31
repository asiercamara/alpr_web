import { appState } from './config.js';

// Gestión del modo oscuro
export function initDarkMode() {
    // Comprobar si hay una preferencia guardada, o detectar la preferencia del sistema
    appState.isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                
    // Guardar la preferencia
    localStorage.setItem('darkMode', appState.isDarkMode);

    // Aplicar el modo
    applyDarkMode();
}

export function toggleDarkMode() {
    // Cambiar el estado del modo oscuro
    console.log('Toggle dark mode:', appState.isDarkMode);
    appState.isDarkMode = !appState.isDarkMode;
    localStorage.setItem('darkMode', appState.isDarkMode);
    
    // Aplicar el cambio
    applyDarkMode();
    console.log('Dark mode toggled:', appState.isDarkMode);
}

function applyDarkMode() {
    const { darkModeToggle } = getElements();
    
    if (appState.isDarkMode) {
        document.documentElement.classList.add('dark');
        darkModeToggle.classList.add('toggle-active');
    } else {
        document.documentElement.classList.remove('dark');
        darkModeToggle.classList.remove('toggle-active');
    }
}

// Ajustar tamaño del canvas
export function showCanvas(canvas) {
    
    if (appState.currentMode) {
        // Si hay un modo activo, asegurarse de que el canvas sea visible
        canvas.style.display = 'block';
    }
}

// Actualiza el estado visual del botón play/pause
export function updatePlayPauseState(paused) {
    const { playBtn } = getElements();
    
    appState.isPaused = paused;
    
    // Actualizar el texto
    document.getElementById('playBtnText').textContent = paused ? 'Play' : 'Pause';
    
    // Actualizar los iconos
    const playIcon = playBtn.querySelector('svg.play-icon');
    const pauseIcon = playBtn.querySelector('svg.pause-icon');
    
    if (playIcon && pauseIcon) {
        if (paused) {
            pauseIcon.classList.add('hidden');
            playIcon.classList.remove('hidden');
        } else {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    }
}

// Importar getElements de config.js para uso interno
import { getElements } from './config.js';
