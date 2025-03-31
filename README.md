[![en](https://img.shields.io/badge/lang-en-red.svg)](./README.md)
[![es](https://img.shields.io/badge/lang-es-yellow.svg)](./README.es.md)


# Web ALPR - Automatic License Plate Recognition in Browser

This project implements an automatic license plate recognition (ALPR) system that runs entirely in the browser without the need for external servers. It uses optimized AI models (YOLO and OCR) that run locally via WebAssembly.

## Features

- 🔍 Real-time license plate detection
- 📷 Works with images, videos, and webcam
- 🧠 AI models optimized for browser (ONNX)
- 🌐 Fully offline functionality
- 🌙 Dark/light mode
- 📱 Responsive design for mobile devices
- ⚡ Optimized performance with Web Workers

## Requirements

- Node.js 16.x or higher
- NPM 8.x or higher
- Modern browser with WebAssembly support

## Installation

```bash
# Clone the repository
git clone https://github.com/your-user/web_alpr.git
cd web_alpr

# Install dependencies
npm install
```

## Usage

### Development

To start the development server:

```bash
npm run dev
```

This will automatically open the application in your default browser. By default, the application will be available at: http://localhost:5173/

### Build for production

```bash
npm run build
```

This will generate an optimized version of the application in the `dist/` folder, which can be deployed on any static web server.

### Preview production build

```bash
npm run preview
```

## Project Structure

```bash
web_alpr/
├── index.html              # Main HTML page
├── package.json            # Dependencies and scripts
├── public/                 # Static files
│   ├── favicon.ico         # Favicon
│   └── models/             # Pre-trained ONNX models
│       ├── european_mobile_vit_v2_ocr_config.yaml
│       ├── european_mobile_vit_v2_ocr.onnx
│       └── yolo-v9-t-384-license-plates-end2end.onnx
├── src/                    # Source code
│   ├── object_detector.js  # Main entry point
│   ├── tailwind.css        # CSS styles with Tailwind
│   ├── models/             # Model configurations
│   │   └── european_mobile_vit_v2_ocr_config.json
│   ├── modules/            # Functional modules web part
│   │   ├── config.js       # Global configuration
│   │   ├── detector.js     # Detection management
│   │   ├── media.js        # Media handling (image/video/camera)
│   │   ├── modal.js        # Modal windows manager
│   │   ├── plateStorage.js # Detected license plates storage
│   │   ├── ui.js           # UI functions
│   │   └── validation.js   # Data validation
│   └── worker/             # Web Workers for background processing
│       ├── mainWorker.js   # Main worker
│       ├── modelsLoader.js # Model loader
│       ├── detector/       # License plate detection modules
│       │   ├── boundingBoxUtils.js # Bounding box utilities
│       │   ├── detectionProcessor.js # Detection processor
│       │   └── imageProcessor.js # Image processor for detection
│       └── ocr/            # Text recognition modules
│           ├── imageProcessor.js # Image processor for OCR
│           ├── ocrProcessor.js # Main OCR processor
│           └── textProcessor.js # Recognized text processor
└── test/                   # Test images and videos
    
```

## Architecture and Components

### Processing Flow

1. **Image Capture**: From photo, video, or webcam
2. **License Plate Detection**: Using YOLOv9 to identify and locate plates
3. **Region Extraction**: Cropping detected plate regions
4. **OCR**: Recognizing text from extracted regions
5. **Visualization**: Displaying results in the UI

### Main Components

#### 1. License Plate Detector

Uses an optimized YOLOv9 model to detect license plates in images. The model is specifically trained to recognize plates in various conditions.

#### 2. OCR System

Implements an optical character recognition model based on MobileViT v2, optimized for reading European license plate text.

#### 3. Web Workers

AI models run in Web Workers to prevent blocking the browser's main thread, ensuring a smooth user experience.

#### 4. User Interface

A modern and responsive interface built with Tailwind CSS 4.0, supporting dark/light mode and optimized for different devices.

## Models Used

### License Plate Detector

- **Model**: yolo-v9-t-384-license-plates-end2end.onnx [open-image-models](https://github.com/ankandrew/open-image-models)
- **Format**: ONNX
- **Input Resolution**: 1x1
- **Classes**: Specifically detects vehicle license plates

#### YOLO (You Only Look Once) Architecture

YOLO is a real-time object detection algorithm that applies a single neural network to the entire image. This network divides the image into regions and predicts bounding boxes and probabilities for each region. Bounding boxes are weighted by predicted probabilities.

Key features of YOLOv9:
- **Single-pass detection**: Unlike two-stage systems, YOLO analyzes the entire image in a single pass, making it extremely fast.
- **Optimized architecture**: YOLOv9 is a compact version designed to run on resource-limited devices, ideal for web applications.
- **High accuracy**: Despite its reduced size, the model achieves an optimal balance between speed and accuracy for license plate detection.
- **Spatial representation**: The model divides the image into a grid and predicts multiple bounding boxes and confidence scores per cell.

The model used in this project has been specifically trained and optimized to detect vehicle license plates under various lighting conditions and angles.

### License Plate OCR

- **Model**: european_mobile_vit_v2_ocr.onnx [open-image-models](https://github.com/ankandrew/open-image-models)
- **Format**: ONNX
- **Input Resolution**: european_mobile_vit_v2_ocr_config.json - 140x70 pixels
- **Alphabet**: Alphanumeric characters (0-9, A-Z) and hyphen

#### ConvNet (CNN) Architecture

The OCR model's architecture is simple yet effective, consisting of multiple CNN layers with multiple output heads. Each head represents the prediction of a single license plate character.

If the license plate contains a maximum of 7 characters (`max_plate_slots=7`), the model will have 7 output heads. Each head generates a probability distribution over the vocabulary specified during training. Therefore, the output prediction for a single license plate will have a shape of `(max_plate_slots, vocabulary_size)`.
![OCR heads model](https://raw.githubusercontent.com/ankandrew/fast-plate-ocr/4a7dd34c9803caada0dc50a33b59487b63dd4754/extra/FCN.png)

#### OCR Model Metrics

During training, the model utilizes the following metrics:

* **plate_acc**: Calculates the number of **plates** that were **fully classified** correctly. For an individual plate, if the ground truth is `ABC123` and the prediction is also `ABC123`, it would score 1. However, if the prediction were `ABD123`, it would score 0, as **not all characters** were correctly classified.

* **cat_acc**: Calculates the accuracy of **individual characters** within the plates. For example, if the correct label is `ABC123` and the prediction is `ABC133`, it would yield an accuracy of 83.3% (5 out of 6 characters correctly classified), instead of 0% as in plate_acc.

* **top_3_k**: Calculates how often the true character is included in the **top 3 predictions** (the three predictions with the highest probability).

In this web implementation, the model has been converted to ONNX format to optimize its performance in the browser, maintaining a balance between accuracy and processing speed.

## Advanced Configuration

### Modifying Detection Thresholds

Confidence thresholds for detection and OCR can be adjusted in the files:

- `src/worker/detector/detectionProcessor.js` - For detection threshold
- `src/modules/detector.js` - For display threshold

```javascript
// Confidence threshold for detection
const confThresh = 0.6; // Modify as needed
```

### Interface Customization

The project uses Tailwind CSS 4.0, which can be customized by modifying the `src/tailwind.css` file or the theme in the HTML.

## Limitations

- Performance depends on the device's processing capability
- Models are optimized for European license plates
- Does not work on older browsers without WebAssembly support

## Acknowledgements

- [fast-alpr](https://github.com/ankandrew/fast-alpr) - Based on this project
  - [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) - Default **OCR** models
  - [open-image-models](https://github.com/ankandrew/open-image-models) - Default plate **detection** models

## Use of Artificial Intelligence

This project has extensively used artificial intelligence, primarily for:
- Python to JavaScript conversions
- Web interface development and client-side functionalities

The AI tools and models used include:
- [roocode](https://docs.roocode.com/) with OpenRouter and Claude 3.7 Sonnet (normal and thinking)
- [GitHub Copilot](https://github.com/features/copilot) with the same models mentioned above
- Other platforms such as [Claude](https://claude.ai), [ChatGPT](https://chat.openai.com), and [Google Gemini](https://gemini.google.com)

