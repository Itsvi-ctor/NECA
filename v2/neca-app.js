/**
 * NECA Vision — neca-app.js
 * Roboflow REST API via detect.roboflow.com
 * Requires serving via http://localhost (not file://) to avoid CORS null-origin.
 * Run: python -m http.server 8080  →  open http://localhost:8080/v2/neca-tool.html
 */

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const API_KEY  = "r2RzScCqYkOUzrEzQreJ";
const BASE_URL = "https://detect.roboflow.com";

const MODELS = {
  "face_liveliness_detection_v2/1": {
    project: "face_liveliness_detection_v2",
    version: "1",
    // Color map for known class labels — add more as you discover them
    colors: {
      "face-straight":     "#22d3a0",
      "straight":          "#22d3a0",
      "looking-straight":  "#22d3a0",
      "looking_straight":  "#22d3a0",
      "face-turned":       "#f59e0b",
      "turned":            "#f59e0b",
      "not-straight":      "#f59e0b",
      "not_straight":      "#f59e0b",
      DEFAULT:             "#818cf8",
    },
  },
  "passport_detection-ddezu/2": {
    project: "passport_detection-ddezu",
    version: "2",
    colors: {
      "passport":          "#38bdf8",
      "passport-front":    "#38bdf8",
      "passport-back":     "#a78bfa",
      "no-passport":       "#f87171",
      DEFAULT:             "#818cf8",
    },
  },
};

const AUTO_COLORS = [
  "#818cf8","#38bdf8","#22d3a0","#f59e0b",
  "#f87171","#a78bfa","#34d399","#60a5fa","#fb923c",
];
const usedColors = {};
let autoIdx = 0;

function getClassColor(modelId, cls) {
  const lower = (cls || "").toLowerCase().trim();
  const map   = MODELS[modelId]?.colors || {};
  if (map[lower])  return map[lower];
  if (map.DEFAULT) return map.DEFAULT;
  if (!usedColors[lower]) {
    usedColors[lower] = AUTO_COLORS[autoIdx % AUTO_COLORS.length];
    autoIdx++;
  }
  return usedColors[lower];
}

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const state = {
  model:         "face_liveliness_detection_v2/1",
  confidence:    40,
  mode:          "upload",      // "upload" | "camera"
  uploadedImage: null,
  cameraRunning: false,
  videoStream:   null,
  lastImage:     null,
};

/* ══════════════════════════════════════════
   DOM
══════════════════════════════════════════ */
const el = (id) => document.getElementById(id);

const dom = {
  // Sidebar controls
  tabFace:      el("tab-face"),
  tabPassport:  el("tab-passport"),
  btnUpload:    el("btn-upload"),
  btnCamera:    el("btn-camera"),
  confSlider:   el("conf-slider"),
  confDisplay:  el("conf-display"),
  sliderFill:   el("slider-fill"),

  // Results
  resultsSection: el("results-section"),
  mCount:         el("m-count"),
  mConf:          el("m-conf"),
  mTime:          el("m-time"),
  detList:        el("detections-list"),

  // Error
  sidebarError:   el("sidebar-error"),
  errorText:      el("error-text"),
  retryBtn:       el("retry-btn"),

  // Status
  statusBadge: el("status-badge"),
  statusText:  el("status-badge").querySelector(".status-text"),

  // Upload workspace
  workspaceUpload: el("workspace-upload"),
  dropzone:        el("dropzone"),
  fileInput:       el("file-input"),
  browseBtn:       el("browse-btn"),
  canvasArea:      el("canvas-area"),
  resultCanvas:    el("result-canvas"),
  detectBtn:       el("detect-btn"),
  clearBtn:        el("clear-btn"),
  loadingOverlay:  el("loading-overlay"),

  // Camera workspace
  workspaceCamera: el("workspace-camera"),
  cameraIdle:      el("camera-idle"),
  cameraLive:      el("camera-live"),
  video:           el("video"),
  camCanvas:       el("cam-canvas"),
  startCamBtn:     el("start-cam-btn"),
  stopCamBtn:      el("stop-cam-btn"),
  
  // Resizer
  sidebarResizer:  el("sidebar-resizer"),
};

/* ══════════════════════════════════════════
   STATUS
══════════════════════════════════════════ */
function setStatus(state, text) {
  dom.statusBadge.className = `status-badge ${state === "busy" ? "busy" : state === "error" ? "error" : ""}`;
  dom.statusText.textContent = text;
}

/* ══════════════════════════════════════════
   MODEL SWITCHER
══════════════════════════════════════════ */
dom.tabFace.addEventListener("click",     () => switchModel("face_liveliness_detection_v2/1"));
dom.tabPassport.addEventListener("click", () => switchModel("passport_detection-ddezu/2"));

function switchModel(id) {
  state.model = id;
  dom.tabFace.classList.toggle("active", id === "face_liveliness_detection_v2/1");
  dom.tabFace.setAttribute("aria-selected", id === "face_liveliness_detection_v2/1");
  dom.tabPassport.classList.toggle("active", id === "passport_detection-ddezu/2");
  dom.tabPassport.setAttribute("aria-selected", id === "passport_detection-ddezu/2");
  clearResults();
  hideError();
}

/* ══════════════════════════════════════════
   CONFIDENCE SLIDER
══════════════════════════════════════════ */
dom.confSlider.addEventListener("input", () => {
  state.confidence = parseInt(dom.confSlider.value, 10);
  dom.confDisplay.textContent = `${state.confidence}%`;
  dom.sliderFill.style.width  = `${state.confidence}%`;
  dom.confSlider.setAttribute("aria-valuenow", state.confidence);
});

/* ══════════════════════════════════════════
   MODE TOGGLE
══════════════════════════════════════════ */
dom.btnUpload.addEventListener("click", () => setMode("upload"));
dom.btnCamera.addEventListener("click", () => setMode("camera"));

function setMode(mode) {
  state.mode = mode;
  dom.btnUpload.classList.toggle("active",  mode === "upload");
  dom.btnCamera.classList.toggle("active",  mode === "camera");
  dom.btnUpload.setAttribute("aria-pressed", mode === "upload");
  dom.btnCamera.setAttribute("aria-pressed", mode === "camera");
  dom.workspaceUpload.hidden = mode !== "upload";
  dom.workspaceCamera.hidden = mode !== "camera";
  if (mode === "upload") stopCamera();
  else clearResults();
}

/* ══════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════ */
dom.browseBtn.addEventListener("click", (e) => { e.stopPropagation(); dom.fileInput.click(); });
dom.dropzone.addEventListener("click", (e) => { 
  if (e.target !== dom.fileInput) {
    dom.fileInput.click(); 
  }
});
dom.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dom.fileInput.click(); }
});

// Drag events
["dragenter", "dragover"].forEach((ev) =>
  dom.dropzone.addEventListener(ev, (e) => { e.preventDefault(); dom.dropzone.classList.add("drag-over"); })
);
["dragleave", "dragend", "drop"].forEach((ev) =>
  dom.dropzone.addEventListener(ev, () => dom.dropzone.classList.remove("drag-over"))
);
dom.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dom.fileInput.addEventListener("change", () => {
  if (dom.fileInput.files[0]) handleFile(dom.fileInput.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) { showError("Please upload a valid image (PNG, JPG, WEBP)."); return; }
  if (file.size > 10 * 1024 * 1024)   { showError("Image must be under 10 MB."); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.uploadedImage = img;
      state.lastImage     = img;
      paintImage(img, []);
      dom.dropzone.hidden  = true;
      dom.canvasArea.hidden = false;
      clearResults();
      hideError();
      enableDetect();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

dom.clearBtn.addEventListener("click", () => {
  state.uploadedImage = null;
  dom.fileInput.value = "";
  dom.dropzone.hidden  = false;
  dom.canvasArea.hidden = true;
  disableDetect();
  clearResults();
  hideError();
});

function enableDetect() {
  dom.detectBtn.disabled = false;
  dom.detectBtn.removeAttribute("aria-disabled");
}
function disableDetect() {
  dom.detectBtn.disabled = true;
  dom.detectBtn.setAttribute("aria-disabled", "true");
}

/* ══════════════════════════════════════════
   CANVAS PAINTING
══════════════════════════════════════════ */
function paintImage(img, predictions) {
  const canvas = dom.resultCanvas;
  const ctx    = canvas.getContext("2d");
  const MAX    = 1280;
  const scale  = Math.min(1, MAX / img.naturalWidth);

  canvas.width  = img.naturalWidth  * scale;
  canvas.height = img.naturalHeight * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (predictions?.length) {
    drawBoxes(ctx, predictions, canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  }
}

function drawBoxes(ctx, preds, sx = 1, sy = 1, mirror = false) {
  preds.forEach((p) => {
    const color = getClassColor(state.model, p.class);
    const baseCx = p.x * sx;
    const cx = mirror ? ctx.canvas.width - baseCx : baseCx;
    const w = p.width * sx;
    const h = p.height * sy;
    const x = cx - w / 2;
    const y = (p.y - p.height / 2) * sy;

    // Translucent fill + glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    ctx.fillStyle = hexAlpha(color, 0.08);
    ctx.fillRect(x, y, w, h);

    // Corner marks (replace full border with accents)
    const C = 12, LW = 2.5;
    [[x, y], [x+w, y], [x, y+h], [x+w, y+h]].forEach(([cx, cy], i) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = LW;
      ctx.lineCap     = "round";
      const dx = i % 2 === 1 ? -1 : 1;
      const dy = i > 1       ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + dx * C, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * C);
      ctx.stroke();
      ctx.restore();
    });

    // Label pill
    const pct   = Math.round((p.confidence || 0) * 100);
    const label = `${p.class}  ${pct}%`;
    ctx.font = "600 11.5px 'Inter', sans-serif";
    const tw   = ctx.measureText(label).width;
    const ph   = 20; const pw = tw + 12;
    const lx   = x;
    const ly   = y > ph + 4 ? y - ph - 3 : y + 3;

    ctx.save();
    ctx.fillStyle = color;
    drawPill(ctx, lx, ly, pw, ph, 4);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#0d0f1a";
    ctx.fillText(label, lx + 6, ly + 14);
  });
}

function drawPill(ctx, x, y, w, h, r) {
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

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ══════════════════════════════════════════
   ROBOFLOW API
══════════════════════════════════════════ */
async function callAPI(base64) {
  const cfg  = MODELS[state.model];
  const url  = `${BASE_URL}/${cfg.project}/${cfg.version}`
             + `?api_key=${API_KEY}`
             + `&confidence=${state.confidence}`
             + `&overlap=50`
             + `&format=json`;

  const t0   = performance.now();
  const resp = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    base64,
  });
  const t1 = performance.now();

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${body || resp.statusText}`);
  }

  const data = await resp.json();
  return { predictions: data.predictions || [], ms: Math.round(t1 - t0) };
}

function imgToBase64(img) {
  const c = document.createElement("canvas");
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", 0.92).split(",")[1];
}

/* ══════════════════════════════════════════
   DETECT — Image
══════════════════════════════════════════ */
dom.detectBtn.addEventListener("click", () => {
  if (state.uploadedImage) runImageDetection(state.uploadedImage);
});
dom.retryBtn.addEventListener("click", () => {
  hideError();
  if (state.uploadedImage) runImageDetection(state.uploadedImage);
});

async function runImageDetection(img) {
  setStatus("busy", "Detecting…");
  dom.loadingOverlay.hidden = false;
  clearResults();

  try {
    const { predictions, ms } = await callAPI(imgToBase64(img));
    paintImage(img, predictions);
    showResults(predictions, ms);
    setStatus("ready", "Ready");
  } catch (err) {
    showError(friendlyErr(err));
    setStatus("error", "Error");
  } finally {
    dom.loadingOverlay.hidden = true;
  }
}

/* ══════════════════════════════════════════
   CAMERA
══════════════════════════════════════════ */
dom.startCamBtn.addEventListener("click", startCamera);
dom.stopCamBtn.addEventListener("click",  stopCamera);

async function startCamera() {
  try {
    state.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });

    dom.video.srcObject = state.videoStream;
    await dom.video.play();

    dom.video.onloadedmetadata = () => {
      dom.camCanvas.width  = dom.video.videoWidth;
      dom.camCanvas.height = dom.video.videoHeight;
    };

    dom.cameraIdle.hidden = true;
    dom.cameraLive.hidden = false;
    state.cameraRunning   = true;
    camLoop();

  } catch (_) {
    showError("Camera access denied. Please allow camera permissions and try again.");
    setStatus("error", "Error");
  }
}

async function camLoop() {
  if (!state.cameraRunning) return;
  try {
    const b64 = captureCamFrame();
    if (b64) {
      setStatus("busy", "Detecting…");
      const { predictions, ms } = await callAPI(b64);
      if (state.cameraRunning) {
        paintCamOverlay(predictions);
        showResults(predictions, ms);
        setStatus("ready", "Ready");
      }
    }
  } catch (_) { /* silent retry */ }
  if (state.cameraRunning) setTimeout(camLoop, 900);
}

function captureCamFrame() {
  if (dom.video.readyState < 2) return null;
  const c = document.createElement("canvas");
  c.width  = dom.video.videoWidth;
  c.height = dom.video.videoHeight;
  c.getContext("2d").drawImage(dom.video, 0, 0);
  return c.toDataURL("image/jpeg", 0.8).split(",")[1];
}

function paintCamOverlay(preds) {
  // Sync canvas size dynamically in case video layout aspect ratio changed
  if (dom.camCanvas.width !== dom.video.videoWidth || dom.camCanvas.height !== dom.video.videoHeight) {
    dom.camCanvas.width = dom.video.videoWidth;
    dom.camCanvas.height = dom.video.videoHeight;
  }
  
  const ctx = dom.camCanvas.getContext("2d");
  ctx.clearRect(0, 0, dom.camCanvas.width, dom.camCanvas.height);
  if (preds.length) drawBoxes(ctx, preds, 1, 1, true);
}

function stopCamera() {
  state.cameraRunning = false;
  state.videoStream?.getTracks().forEach((t) => t.stop());
  state.videoStream    = null;
  dom.video.srcObject  = null;
  dom.cameraLive.hidden = true;
  dom.cameraIdle.hidden = false;
  const ctx = dom.camCanvas.getContext("2d");
  ctx.clearRect(0, 0, dom.camCanvas.width, dom.camCanvas.height);
  clearResults();
  setStatus("ready", "Ready");
}

/* ══════════════════════════════════════════
   RESULTS
══════════════════════════════════════════ */
function showResults(preds, ms) {
  hideError();

  dom.resultsSection.hidden = false;
  // Trigger CSS transition
  requestAnimationFrame(() => dom.resultsSection.classList.add("visible"));

  dom.mCount.textContent = preds.length;
  dom.mTime.textContent  = ms ? `${ms}ms` : "—";

  if (preds.length > 0) {
    const avg = preds.reduce((s, p) => s + (p.confidence || 0), 0) / preds.length;
    dom.mConf.textContent = `${Math.round(avg * 100)}%`;
  } else {
    dom.mConf.textContent = "—";
  }

  dom.detList.innerHTML = "";

  if (preds.length === 0) {
    const li = document.createElement("li");
    li.style.cssText = "font-size:.8125rem;color:var(--ink-muted);text-align:center;padding:8px 0";
    li.textContent = "Nothing detected above threshold";
    dom.detList.appendChild(li);
    return;
  }

  preds
    .slice()
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .forEach((p, i) => {
      const pct   = Math.round((p.confidence || 0) * 100);
      const color = getClassColor(state.model, p.class);
      const li    = document.createElement("li");
      li.className = "detection-item";
      li.style.animationDelay = `${i * 40}ms`;
      li.innerHTML = `
        <span class="det-swatch" style="background:${color}" aria-hidden="true"></span>
        <span class="det-class">${esc(p.class || "unknown")}</span>
        <span class="det-right">
          <span class="det-bar" aria-hidden="true">
            <span class="det-bar-fill" style="width:${pct}%;background:${color}"></span>
          </span>
          <span class="det-pct">${pct}%</span>
        </span>`;
      dom.detList.appendChild(li);
    });
}

function clearResults() {
  dom.resultsSection.hidden = true;
  dom.resultsSection.classList.remove("visible");
  dom.mCount.textContent = "0";
  dom.mConf.textContent  = "—";
  dom.mTime.textContent  = "—";
  dom.detList.innerHTML  = "";
}

/* ══════════════════════════════════════════
   ERROR
══════════════════════════════════════════ */
function showError(msg) {
  dom.errorText.textContent = msg;
  dom.sidebarError.hidden   = false;
}
function hideError() { dom.sidebarError.hidden = true; }

function friendlyErr(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror"))
    return "Network error. Open this page via http://localhost:8080 (not file://) to fix CORS, then check your internet connection.";
  if (m.includes("401") || m.includes("403"))
    return "Authentication failed. Verify your Roboflow API key.";
  if (m.includes("404"))
    return "Model not found. Verify the model ID and version on Roboflow.";
  if (m.includes("429"))
    return "Rate limit reached. Wait a moment, then try again.";
  return `Inference error: ${err?.message || "Unknown error"}`;
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  setStatus("ready", "Ready");
  
  // Sidebar resizing logic
  let isResizing = false;
  dom.sidebarResizer.addEventListener("mousedown", () => {
    isResizing = true;
    document.body.style.cursor = "col-resize";
    dom.sidebarResizer.classList.add("is-resizing");
  });
  
  window.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const minWidth = 240;
    const maxWidth = 500;
    let newWidth = e.clientX;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    document.body.style.setProperty("--sidebar-width", `${newWidth}px`);
  });
  
  window.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      dom.sidebarResizer.classList.remove("is-resizing");
    }
  });
});
