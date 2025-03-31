[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)

# Web ALPR - Reconocimiento Automático de Matrículas en Navegador

Este proyecto implementa un sistema de reconocimiento automático de matrículas de vehículos (ALPR - Automatic License Plate Recognition) que funciona completamente en el navegador, sin necesidad de servidores externos. Utiliza modelos de IA optimizados (YOLO y OCR) que se ejecutan localmente mediante WebAssembly.

## Características

- 🔍 Detección de matrículas en tiempo real
- 📷 Funciona con imágenes, videos y cámara web
- 🧠 Modelos de IA optimizados para navegador (ONNX)
- 🌐 Funciona completamente offline
- 🌙 Modo oscuro/claro
- 📱 Diseño responsive para dispositivos móviles
- ⚡ Rendimiento optimizado con Web Workers

## Requisitos

- Node.js 16.x o superior
- NPM 8.x o superior
- Navegador moderno con soporte para WebAssembly

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/web_alpr.git
cd web_alpr

# Instalar dependencias
npm install
```

## Uso

### Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

Esto abrirá automáticamente la aplicación en tu navegador predeterminado. Por defecto, la aplicación estará disponible en: http://localhost:5173/

### Compilación para producción

```bash
npm run build
```

Esto generará una versión optimizada de la aplicación en la carpeta `dist/` que puede ser desplegada en cualquier servidor web estático.

### Vista previa de la versión de producción

```bash
npm run preview
```

## Estructura del Proyecto

```bash
web_alpr/
├── index.html              # Página HTML principal
├── package.json            # Dependencias y scripts
├── public/                 # Archivos estáticos
│   ├── favicon.ico         # Favicon
│   └── models/             # Modelos ONNX pre-entrenados
│       ├── european_mobile_vit_v2_ocr_config.yaml
│       ├── european_mobile_vit_v2_ocr.onnx
│       └── yolo-v9-t-384-license-plates-end2end.onnx
├── src/                    # Código fuente
│   ├── object_detector.js  # Punto de entrada principal
│   ├── tailwind.css        # Estilos CSS con Tailwind
│   ├── models/             # Configuraciones de modelos
│   │   └── european_mobile_vit_v2_ocr_config.json
│   ├── modules/            # Módulos funcionales parte web
│   │   ├── config.js       # Configuración global
│   │   ├── detector.js     # Gestión de detección
│   │   ├── media.js        # Manejo de medios (imagen/video/cámara)
│   │   ├── modal.js        # Gestor de ventanas modales
│   │   ├── plateStorage.js # Almacenamiento de matrículas detectadas
│   │   ├── ui.js           # Funciones de interfaz de usuario
│   │   └── validation.js   # Validación de datos
│   └── worker/             # Web Workers para procesamiento en segundo plano
│       ├── mainWorker.js   # Worker principal
│       ├── modelsLoader.js # Cargador de modelos
│       ├── detector/       # Módulos para detección de matrículas
│       │   ├── boundingBoxUtils.js # Utilidades para cuadros delimitadores
│       │   ├── detectionProcessor.js # Procesador de detecciones
│       │   └── imageProcessor.js # Procesador de imágenes para detección
│       └── ocr/            # Módulos para reconocimiento de texto
│           ├── imageProcessor.js # Procesador de imágenes para OCR
│           ├── ocrProcessor.js # Procesador principal de OCR
│           └── textProcessor.js # Procesador de texto reconocido
└── test/                   # Imágenes y videos de prueba
```

## Arquitectura y Componentes

### Flujo de Procesamiento

1. **Captura de Imagen**: A través de foto, video o cámara web
2. **Detección de Matrículas**: Usando YOLOv9 para identificar y localizar matrículas
3. **Extracción de Regiones**: Recorte de las áreas detectadas como matrículas
4. **OCR**: Reconocimiento del texto en las regiones extraídas
5. **Visualización**: Muestra los resultados en la interfaz

### Componentes Principales

#### 1. Detector de Matrículas

Utiliza un modelo YOLOv9 optimizado para detectar matrículas en imágenes. El modelo está entrenado específicamente para reconocer placas de matrícula en diferentes condiciones.

#### 2. Sistema OCR

Implementa un modelo de reconocimiento óptico de caracteres basado en MobileViT v2, optimizado para leer texto de matrículas europeas.

#### 3. Web Workers

Los modelos de IA se ejecutan en Web Workers para evitar bloquear el hilo principal del navegador, proporcionando una experiencia de usuario fluida.

#### 4. Interfaz de Usuario

Interfaz moderna y responsive construida con Tailwind CSS 4.0, con soporte para modo oscuro/claro y optimizada para diferentes dispositivos.

## Modelos Utilizados

### Detector de Matrículas

- **Modelo**: yolo-v9-t-384-license-plates-end2end.onnx [open-image-models](https://github.com/ankandrew/open-image-models)
- **Formato**: ONNX
- **Resolución de entrada**: 1x1 
- **Clases**: Detecta específicamente matrículas de vehículos

#### Arquitectura YOLO (You Only Look Once)

YOLO es un algoritmo de detección de objetos en tiempo real que aplica una única red neuronal a la imagen completa. Esta red divide la imagen en regiones y predice cuadros delimitadores y probabilidades para cada región. Los cuadros delimitadores se ponderan por las probabilidades predichas.

Características principales de YOLOv9:
- **Detección en una sola pasada**: A diferencia de los sistemas de dos etapas, YOLO analiza toda la imagen en una sola pasada, lo que lo hace extremadamente rápido.
- **Arquitectura optimizada**: YOLOv9 es una versión reducida diseñada para ejecutarse en dispositivos con recursos limitados, ideal para aplicaciones web.
- **Alta precisión**: A pesar de su tamaño reducido, el modelo alcanza un equilibrio óptimo entre velocidad y precisión para la detección de matrículas.
- **Representación espacial**: El modelo divide la imagen en una cuadrícula y predice múltiples cuadros delimitadores y puntuaciones de confianza para cada celda.

El modelo usado en este proyecto ha sido específicamente entrenado y optimizado para detectar matrículas vehiculares en diferentes condiciones de iluminación y ángulos.

### OCR de Matrículas

- **Modelo**: european_mobile_vit_v2_ocr.onnx [open-image-models](https://github.com/ankandrew/open-image-models)
- **Formato**: ONNX
- **Resolución de entrada**: european_mobile_vit_v2_ocr_config.json - 140x70 píxeles
- **Alfabeto**: Caracteres alfanuméricos (0-9, A-Z) y guión

#### Arquitectura ConvNet (CNN)

La arquitectura del modelo OCR es simple pero efectiva, consistiendo en varias capas CNN con múltiples cabezas de salida. Cada cabeza representa la predicción de un carácter de la matrícula. 

Si la matrícula consiste en un máximo de 7 caracteres (`max_plate_slots=7`), entonces el modelo tendría 7 cabezas de salida. Cada cabeza genera una distribución de probabilidad sobre el vocabulario especificado durante el entrenamiento. Por lo tanto, la predicción de salida para una sola matrícula tendrá una forma de `(max_plate_slots, vocabulary_size)`.

![Modelo de cabezas OCR](https://raw.githubusercontent.com/ankandrew/fast-plate-ocr/4a7dd34c9803caada0dc50a33b59487b63dd4754/extra/FCN.png)

#### Métricas del Modelo OCR

Durante el entrenamiento, el modelo utiliza las siguientes métricas:

* **plate_acc**: Calcula el número de **matrículas** que fueron **completamente clasificadas** correctamente. Para una matrícula individual, si la verdad fundamental es `ABC123` y la predicción también es `ABC123`, puntuaría 1. Sin embargo, si la predicción fuera `ABD123`, puntuaría 0, ya que **no todos los caracteres** fueron correctamente clasificados.

* **cat_acc**: Calcula la precisión de **caracteres individuales** dentro de las matrículas. Por ejemplo, si la etiqueta correcta es `ABC123` y la predicción es `ABC133`, produciría una precisión del 83.3% (5 de 6 caracteres clasificados correctamente), en lugar de 0% como en plate_acc.

* **top_3_k**: Calcula con qué frecuencia el carácter verdadero está incluido en las **3 predicciones principales** (las tres predicciones con mayor probabilidad).

En esta implementación web, el modelo ha sido convertido a formato ONNX para optimizar su rendimiento en el navegador, manteniendo un equilibrio entre precisión y velocidad de procesamiento.

## Configuración Avanzada

### Modificar Umbrales de Detección

Los umbrales de confianza para la detección y el OCR pueden ajustarse en los archivos:

- `src/worker/detector/detectionProcessor.js` - Para el umbral de detección
- `src/modules/detector.js` - Para el umbral de visualización

```javascript
// Umbral de confianza para detección
const confThresh = 0.6; // Modificar según necesidad
```

### Personalización de la Interfaz

El proyecto utiliza Tailwind CSS 4.0, que puede personalizarse modificando el archivo `src/tailwind.css` o el tema en el HTML.

## Limitaciones

- El rendimiento depende de la capacidad de procesamiento del dispositivo
- Los modelos están optimizados para matrículas europeas
- No funciona en navegadores antiguos sin soporte para WebAssembly

## Reconocimientos

- [fast-alpr](https://github.com/ankandrew/fast-alpr) - Basado en este proyecto
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) - Modelos de **OCR** por defecto
  - [open-image-models](https://github.com/ankandrew/open-image-models) - Modelos de **detección** de placas por defecto

## Uso de Inteligencia Artificial

Este proyecto ha hecho uso extensivo de inteligencia artificial, principalmente para:

- Conversiones de Python a JavaScript
- Desarrollo de la interfaz web y funcionalidades del cliente

Las herramientas y modelos de IA utilizados incluyen:

- [roocode](https://docs.roocode.com/) con OpenRouter y Claude 3.7 Sonnet (normal y thinking)
- [GitHub Copilot](https://github.com/features/copilot) con los mismos modelos anteriores
- Otras plataformas como [Claude](https://claude.ai), [ChatGPT](https://chat.openai.com) y [Google Gemini](https://gemini.google.com)
