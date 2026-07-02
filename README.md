# NECA Vision

A web-based tool for running live computer vision models using the Roboflow Inference API. This project provides an interface to run face liveness detection and passport identification directly in the browser via either file upload or live camera feed.

## Features

*   **Face Liveness Detection**: Determines head orientation and basic liveness properties from images or webcam feeds.
*   **Passport Detection**: Identifies whether a passport is present and whether it is the front or back cover.
*   **Live Camera Mode**: Streams webcam footage and performs inference automatically on a set interval.
*   **Upload Mode**: Run models against specific uploaded files (drag-and-drop or file browser).
*   **Adjustable Confidence**: Real-time slider to change the confidence threshold for detections.
*   **Responsive UI**: Focused, tool-like design utilizing modern CSS features (OKLCH, semantic z-index, prefers-reduced-motion).

## Setup & Running Locally

Because browsers enforce strict CORS policies and treat local `file://` URLs as a "null" origin, this application must be served via a local HTTP server to make calls to the Roboflow API.

1.  Open a terminal in the project root directory.
2.  Start a local server using Python (or your preferred server tool):
    ```bash
    python -m http.server 8080
    ```
    *Alternatively, you can double-click `start-server.bat` on Windows.*
3.  Open your browser and navigate to:
    ```
    http://localhost:8080/v2/neca-tool.html
    ```

## Project Structure

The modern application interface is contained in the `v2/` directory:

*   **`v2/neca-tool.html`**: The main application shell and structure.
*   **`v2/neca-styles.css`**: The design system, including layout, tokens, and responsive behavior.
*   **`v2/neca-app.js`**: Application logic handling file uploads, webcam streams, canvas drawing, and Roboflow REST API calls.

*(The root folder also contains earlier prototype versions of these files.)*

## Technologies Used

*   Vanilla HTML, CSS, JavaScript
*   [Roboflow Hosted API](https://detect.roboflow.com) for real-time model inference
*   Browser `getUserMedia` API for live webcam integration

## Usage

1.  **Select a Model**: Choose between "Face Liveness" or "Passport" from the sidebar.
2.  **Input Method**: Toggle between "Upload" or "Camera".
    *   *Upload*: Drag an image or click to browse. Click "Run detection".
    *   *Camera*: Click "Start camera", and allow webcam permissions. It will run automatically while active.
3.  **Adjust Threshold**: Use the slider in the sidebar to refine detection sensitivity. Results will dynamically appear below it.
