/**
 * NECA Computer Vision Project — app.js
 * Uses Roboflow Hosted Inference REST API (detect.roboflow.com).
 * Serve this project via a local HTTP server to avoid CORS null-origin issues:
 *   Python:  python -m http.server 8080
 *   Node:    npx serve . -l 8080
 * Then open: http://localhost:8080
 */

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const CONFIG = {
  API_KEY:  "r2RzScCqYkOUzrEzQreJ",
  // detect.roboflow.com is the CORS-enabled hosted inference endpoint
  BASE_URL: "https://detect.roboflow.com",

  MODELS: {
    "face_liveliness_detection_v2/1": {
      name:    "Face Liveness Detection",
      project: "face_liveliness_detection_v2",
      version: "1",
      colors: {
        "face-straight":    "#10b981",
        "face-turned":      "#f59e0b",
        "straight":         "#10b981",
        "looking-straight": "#10b981",
        "looking_straight": "#10b981",
        "not-straight":     "#f59e0b",
        "not_straight":     "#f59e0b",
        "turned":           "#f59e0b",
        "face":             "#7c3aed",
        DEFAULT:            "#06b6d4",
      },
    },
    "passport_detection-ddezu/2": {
      name:    "Passport Detection",
      project: "passport_detection-ddezu",
      version: "2",
      colors: {
        "passport":       "#06b6d4",
        "passport-front": "#06b6d4",
        "passport-back":  "#a78bfa",
        "no-passport":    "#ef4444",
        DEFAULT:          "#7c3aed",
      },
    },
  },
};

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const state = {
  activeModel: "face_liveliness_detection_v2/1",
  confidence:  40,
  mode:        "upload",   // "upload" | "camera"
  uploadedImage: null,     // HTMLImageElement
  cameraRunning: false,
  videoStream:   null,
};

/* ══════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

const els = {
  tabA:          $("tab-model-a"),
  tabB:          $("tab-model-b"),
  confSlider:    $("confidence-slider"),
  confVal:       $("confidence-val"),
  btnUploadMode: $("btn-upload-mode"),
  btnCameraMode: $("btn-camera-mode"),

  uploadPanel:    $("upload-panel"),
  dropZone:       $("drop-zone"),
  fileInput:      $("file-input"),
  browseBtn:      $("browse-btn"),
  canvasWrapper:  $("canvas-wrapper"),
  resultCanvas:   $("result-canvas"),
  clearBtn:       $("clear-btn"),
  detectBtn:      $("detect-btn"),

  cameraPanel:       $("camera-panel"),
  cameraPlaceholder: $("camera-placeholder"),
  videoFeed:         $("video-feed"),
  cameraCanvas:      $("camera-canvas"),
  startCameraBtn:    $("start-camera-btn"),
  stopCameraBtn:     $("stop-camera-btn"),

  loadingOverlay: $("loading-overlay"),
  resultsPanel:   $("results-panel"),
  errorPanel:     $("error-panel"),
  errorMessage:   $("error-message"),
  retryBtn:       $("retry-btn"),

  metricCount: $("metric-count"),
  metricConf:  $("metric-conf"),
  metricTime:  $("metric-time"),
  predList:    $("predictions-list"),

  copyCodeBtn: $("copy-code-btn"),
};

/* ══════════════════════════════════════════
   COLOUR HELPERS
══════════════════════════════════════════ */
const AUTO_COLORS = [
  "#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444",
  "#a78bfa","#67e8f9","#6ee7b7","#fcd34d","#fca5a5",
  "#f472b6","#34d399","#60a5fa","#fb923c","#e879f9",
];
const assignedColors = {};
let autoColorIdx = 0;

function classColor(modelId, cls) {
  const lower = (cls || "").toLowerCase().trim();
  const map   = CONFIG.MODELS[modelId]?.colors || {};
  if (map[lower])   return map[lower];
  if (map.DEFAULT)  return map.DEFAULT;
  if (!assignedColors[lower]) {
    assignedColors[lower] = AUTO_COLORS[autoColorIdx % AUTO_COLORS.length];
    autoColorIdx++;
  }
  return assignedColors[lower];
}

/* ══════════════════════════════════════════
   ROBOFLOW REST API
  
  detect.roboflow.com format:
    POST /{project}/{version}?api_key=KEY&confidence=N&format=json
    Content-Type: application/x-www-form-urlencoded
    body: base64_image (no data-URL prefix)
══════════════════════════════════════════ */
async function callRoboflowAPI(base64Image) {
  const cfg  = CONFIG.MODELS[state.activeModel];
  const conf = Math.round(state.confidence);

  const url = `${CONFIG.BASE_URL}/${cfg.project}/${cfg.version}`
    + `?api_key=${CONFIG.API_KEY}`
    + `&confidence=${conf}`
    + `&overlap=50`
    + `&format=json`;

  const t0 = performance.now();

  const resp = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    base64Image,   // raw base64, no "data:image/..." prefix
  });

  const t1 = performance.now();

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${body || resp.statusText}`);
  }

  const data = await resp.json();
  return {
    predictions: data.predictions || [],
    time:        Math.round(t1 - t0),
  };
}

/* ══════════════════════════════════════════
   MODEL SWITCHER
══════════════════════════════════════════ */
function setActiveModel(modelId) {
  state.activeModel = modelId;
  [els.tabA, els.tabB].forEach((t) => {
    const active = t.dataset.model === modelId;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active);
  });
  clearResults();
}

els.tabA.addEventListener("click", () => setActiveModel(els.tabA.dataset.model));
els.tabB.addEventListener("click", () => setActiveModel(els.tabB.dataset.model));

/* ══════════════════════════════════════════
   CONFIDENCE SLIDER
══════════════════════════════════════════ */
els.confSlider.addEventListener("input", () => {
  state.confidence = parseInt(els.confSlider.value, 10);
  els.confVal.textContent = `${state.confidence}%`;
  els.confSlider.setAttribute("aria-valuenow", state.confidence);
});

/* ══════════════════════════════════════════
   MODE TOGGLE
══════════════════════════════════════════ */
function setMode(mode) {
  state.mode = mode;
  const isUpload = mode === "upload";

  els.btnUploadMode.classList.toggle("active",  isUpload);
  els.btnCameraMode.classList.toggle("active", !isUpload);
  els.btnUploadMode.setAttribute("aria-pressed",  isUpload);
  els.btnCameraMode.setAttribute("aria-pressed", !isUpload);

  els.uploadPanel.hidden = !isUpload;
  els.cameraPanel.hidden =  isUpload;

  if (isUpload) stopCamera();
  else          clearResults();
}

els.btnUploadMode.addEventListener("click", () => setMode("upload"));
els.btnCameraMode.addEventListener("click", () => setMode("camera"));

/* ══════════════════════════════════════════
   IMAGE UPLOAD — Drag & Drop + Click
══════════════════════════════════════════ */
els.browseBtn.addEventListener("click", (e) => { e.stopPropagation(); els.fileInput.click(); });
els.dropZone.addEventListener("click",  () => els.fileInput.click());
els.dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.fileInput.click(); }
});

["dragenter", "dragover"].forEach((ev) =>
  els.dropZone.addEventListener(ev, (e) => { e.preventDefault(); els.dropZone.classList.add("drag-over"); })
);
["dragleave", "dragend", "drop"].forEach((ev) =>
  els.dropZone.addEventListener(ev, () => els.dropZone.classList.remove("drag-over"))
);
els.dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) handleImageFile(file);
});
els.fileInput.addEventListener("change", () => {
  if (els.fileInput.files[0]) handleImageFile(els.fileInput.files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please upload a valid image file (PNG, JPG, WEBP)."); return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError("Image too large. Please use an image under 10 MB."); return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.uploadedImage = img;
      renderImageToCanvas(img, []);
      els.dropZone.hidden     = true;
      els.canvasWrapper.hidden = false;
      clearResults();
      els.detectBtn.disabled = false;
      els.detectBtn.setAttribute("aria-disabled", "false");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

els.clearBtn.addEventListener("click", () => {
  state.uploadedImage  = null;
  els.fileInput.value  = "";
  els.dropZone.hidden     = false;
  els.canvasWrapper.hidden = true;
  els.detectBtn.disabled  = true;
  els.detectBtn.setAttribute("aria-disabled", "true");
  clearResults();
});

/* ══════════════════════════════════════════
   CANVAS RENDERING
══════════════════════════════════════════ */
function imgToBase64(img) {
  const c  = document.createElement("canvas");
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d").drawImage(img, 0, 0);
  // Strip the "data:image/jpeg;base64," prefix — API wants raw base64
  return c.toDataURL("image/jpeg", 0.92).split(",")[1];
}

function renderImageToCanvas(img, predictions) {
  const canvas = els.resultCanvas;
  const ctx    = canvas.getContext("2d");

  const maxW  = Math.min(img.naturalWidth, 1280);
  const scale = maxW / img.naturalWidth;
  canvas.width  = img.naturalWidth  * scale;
  canvas.height = img.naturalHeight * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (predictions?.length) {
    drawBoundingBoxes(
      ctx, predictions,
      canvas.width  / img.naturalWidth,
      canvas.height / img.naturalHeight
    );
  }
}

function drawBoundingBoxes(ctx, predictions, scaleX = 1, scaleY = 1) {
  predictions.forEach((pred) => {
    const color = classColor(state.activeModel, pred.class);

    // Roboflow returns center-based bbox
    const x = (pred.x - pred.width  / 2) * scaleX;
    const y = (pred.y - pred.height / 2) * scaleY;
    const w = pred.width  * scaleX;
    const h = pred.height * scaleY;

    // Glow + box
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    // Corner accents
    drawCorner(ctx, x,     y,     color, 14, 3);
    drawCorner(ctx, x + w, y,     color, 14, 3, true,  false);
    drawCorner(ctx, x,     y + h, color, 14, 3, false, true);
    drawCorner(ctx, x + w, y + h, color, 14, 3, true,  true);

    // Label
    const confPct = Math.round((pred.confidence || 0) * 100);
    const label   = `${pred.class}  ${confPct}%`;
    ctx.font      = "bold 12px 'Inter', sans-serif";
    const textW   = ctx.measureText(label).width;
    const labelH  = 22;
    const labelY  = y > labelH + 4 ? y - labelH - 2 : y + 2;

    ctx.save();
    ctx.fillStyle = color;
    roundRect(ctx, x, labelY, textW + 14, labelH, 5);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font      = "bold 11.5px 'Inter', sans-serif";
    ctx.fillText(label, x + 7, labelY + 15);
  });
}

function drawCorner(ctx, cx, cy, color, size, lw, flipX = false, flipY = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw + 1;
  ctx.lineCap     = "round";
  ctx.beginPath();
  ctx.moveTo(cx + (flipX ? -1 : 1) * size, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + (flipY ? -1 : 1) * size);
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ══════════════════════════════════════════
   DETECT BUTTON
══════════════════════════════════════════ */
els.detectBtn.addEventListener("click", async () => {
  if (!state.uploadedImage) return;
  await runImageDetection(state.uploadedImage);
});

els.retryBtn.addEventListener("click", () => {
  hideError();
  if (state.uploadedImage) runImageDetection(state.uploadedImage);
});

async function runImageDetection(img) {
  showLoading();
  clearResults();
  try {
    const base64 = imgToBase64(img);
    const { predictions, time } = await callRoboflowAPI(base64);
    renderImageToCanvas(img, predictions);
    showResults(predictions, time);
  } catch (err) {
    showError(friendlyError(err));
  } finally {
    hideLoading();
  }
}

/* ══════════════════════════════════════════
   WEBCAM
══════════════════════════════════════════ */
els.startCameraBtn.addEventListener("click", startCamera);
els.stopCameraBtn.addEventListener("click",  stopCamera);

async function startCamera() {
  try {
    state.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });

    els.videoFeed.srcObject     = state.videoStream;
    els.videoFeed.hidden        = false;
    els.cameraCanvas.hidden     = false;
    els.cameraPlaceholder.hidden = true;

    await els.videoFeed.play();

    els.videoFeed.onloadedmetadata = () => {
      els.cameraCanvas.width  = els.videoFeed.videoWidth;
      els.cameraCanvas.height = els.videoFeed.videoHeight;
    };

    els.startCameraBtn.hidden = true;
    els.stopCameraBtn.hidden  = false;
    state.cameraRunning = true;

    runCameraLoop();
  } catch (_err) {
    showError("Camera access denied or unavailable. Please allow camera permissions in your browser.");
  }
}

async function runCameraLoop() {
  if (!state.cameraRunning) return;
  try {
    const base64 = captureCameraBase64();
    if (base64) {
      const { predictions, time } = await callRoboflowAPI(base64);
      if (state.cameraRunning) {
        drawCameraOverlay(predictions);
        showResults(predictions, time);
      }
    }
  } catch (_err) { /* silently retry */ }

  if (state.cameraRunning) setTimeout(runCameraLoop, 900);
}

function captureCameraBase64() {
  const video = els.videoFeed;
  if (video.readyState < 2) return null;
  const c = document.createElement("canvas");
  c.width  = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  return c.toDataURL("image/jpeg", 0.8).split(",")[1];
}

function drawCameraOverlay(predictions) {
  const canvas = els.cameraCanvas;
  const ctx    = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (predictions.length > 0) drawBoundingBoxes(ctx, predictions, 1, 1);
}

function stopCamera() {
  state.cameraRunning = false;
  if (state.videoStream) {
    state.videoStream.getTracks().forEach((t) => t.stop());
    state.videoStream = null;
  }
  els.videoFeed.srcObject      = null;
  els.videoFeed.hidden         = true;
  els.cameraCanvas.hidden      = true;
  els.cameraPlaceholder.hidden = false;
  els.startCameraBtn.hidden    = false;
  els.stopCameraBtn.hidden     = true;
  const ctx = els.cameraCanvas.getContext("2d");
  ctx.clearRect(0, 0, els.cameraCanvas.width, els.cameraCanvas.height);
  clearResults();
}

/* ══════════════════════════════════════════
   RESULTS DISPLAY
══════════════════════════════════════════ */
function showResults(predictions, timeMs) {
  hideError();
  els.resultsPanel.hidden = false;
  els.metricCount.textContent = predictions.length;

  if (predictions.length > 0) {
    const avg = predictions.reduce((s, p) => s + (p.confidence || 0), 0) / predictions.length;
    els.metricConf.textContent = `${Math.round(avg * 100)}%`;
  } else {
    els.metricConf.textContent = "—";
  }
  els.metricTime.textContent = timeMs ? `${timeMs}ms` : "—";

  els.predList.innerHTML = "";
  if (predictions.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "text-align:center;color:var(--clr-text-faint);font-size:.875rem;padding:.75rem 0";
    empty.textContent = "No objects detected above the confidence threshold.";
    els.predList.appendChild(empty);
    return;
  }

  predictions
    .slice()
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .forEach((pred, i) => {
      const conf  = Math.round((pred.confidence || 0) * 100);
      const color = classColor(state.activeModel, pred.class);
      const item  = document.createElement("div");
      item.className = "prediction-item";
      item.style.animationDelay = `${i * 50}ms`;
      item.innerHTML = `
        <div class="pred-left">
          <span class="pred-dot" style="background:${color}" aria-hidden="true"></span>
          <span class="pred-class">${escapeHtml(pred.class || "unknown")}</span>
        </div>
        <div class="pred-right">
          <div class="pred-conf-bar" aria-hidden="true">
            <div class="pred-conf-fill" style="width:${conf}%;background:${color}"></div>
          </div>
          <span class="pred-conf-val">${conf}%</span>
        </div>`;
      els.predList.appendChild(item);
    });
}

function clearResults() {
  els.resultsPanel.hidden     = true;
  els.predList.innerHTML      = "";
  els.metricCount.textContent = "0";
  els.metricConf.textContent  = "—";
  els.metricTime.textContent  = "—";
  hideError();
}

/* ══════════════════════════════════════════
   LOADING / ERROR UI
══════════════════════════════════════════ */
function showLoading() { els.loadingOverlay.hidden = false; }
function hideLoading() { els.loadingOverlay.hidden = true;  }

function showError(msg) {
  hideLoading();
  els.errorMessage.textContent = msg;
  els.errorPanel.hidden   = false;
  els.resultsPanel.hidden = true;
}
function hideError() { els.errorPanel.hidden = true; }

function friendlyError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Network error — check your internet connection, or make sure you are accessing the page via http://localhost:8080 (not file://).";
  if (msg.includes("401") || msg.includes("403"))
    return "Authentication failed. Check your Roboflow API key.";
  if (msg.includes("404"))
    return "Model not found. Verify the model ID and version on Roboflow.";
  if (msg.includes("429"))
    return "Rate limit hit. Please wait a moment and try again.";
  return `Inference error: ${err?.message || "Unknown error"}`;
}

/* ══════════════════════════════════════════
   CODE COPY BUTTON
══════════════════════════════════════════ */
const CODE_TEXT = `const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];

const response = await fetch(
  "https://detect.roboflow.com/face_liveliness_detection_v2/1"
  + "?api_key=YOUR_KEY&confidence=40&format=json",
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64Image,
  }
);

const { predictions } = await response.json();
// predictions → [{ class, confidence, x, y, width, height }]`;

els.copyCodeBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CODE_TEXT);
    els.copyCodeBtn.textContent = "✓ Copied!";
    els.copyCodeBtn.classList.add("copied");
    setTimeout(() => {
      els.copyCodeBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
      els.copyCodeBtn.classList.remove("copied");
    }, 2200);
  } catch (_) { /* clipboard unavailable */ }
});

/* ══════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════ */
function initReveal() {
  const targets = document.querySelectorAll(
    ".model-card,.step-card,.usecase-card,.section-header,.demo-panel,.code-card"
  );
  targets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  targets.forEach((el) => io.observe(el));
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    header.style.boxShadow = window.scrollY > 10 ? "0 4px 32px rgba(0,0,0,.5)" : "none";
  }, { passive: true });
});
