# Roboflow AI Vision — Model Integration Showcase Website

A presentation-ready, visually stunning website that demonstrates how your trained Roboflow models can be integrated into any environment. Supports image upload and live camera inference with real-time bounding box visualization.

---

## User Review Required

> [!IMPORTANT]
> **Before I can build this, I need several pieces of information from you.** See the [What I Need From You](#what-i-need-from-you) section below for the full list with step-by-step instructions on how to get each item.

---

## What I Need From You

### 1. 🔑 Roboflow API Key (Required)

Your **Private API Key** — used to authenticate inference requests.

**How to get it:**
1. Log in to [app.roboflow.com](https://app.roboflow.com/)
2. Click your workspace name (top-left corner)
3. Go to **Settings** → **API Keys** (or go directly to [app.roboflow.com/settings/api](https://app.roboflow.com/settings/api))
4. Copy your **Private API Key**

> [!WARNING]
> Since this is a client-side website, your API key will be visible in the browser source code. This is acceptable for a **presentation demo**. For production use, you'd want a backend proxy. I'll add a note about this in the website itself for your presentation.

---

### 2. 📦 Model Details — For BOTH Models (Required)

For **each** of your 2 trained models, I need:

| Info Needed | Example | How to Find It |
|---|---|---|
| **Project ID (slug)** | `hard-hat-detection` | Go to your project → look at the URL: `app.roboflow.com/<workspace>/<project-id>` — the last part is your Project ID |
| **Model Version** | `1` | Go to your project → **Versions** tab in the left sidebar → note the version number of the trained model |
| **Model Type** | `object-detection`, `classification`, or `instance-segmentation` | Visible on the project page — tells me what kind of predictions to expect |
| **What each model detects** | "Detects hard hats and no-hard-hats on construction workers" | A short description so I can label it nicely in the UI |
| **Class names & preferred colors** *(optional)* | `hard-hat → green`, `no-hard-hat → red` | The class labels your model was trained on. If you don't provide colors, I'll auto-assign a beautiful palette |

**How to find Model ID and Version:**
1. Go to [app.roboflow.com](https://app.roboflow.com/)
2. Click on your project
3. Click the **Deploy** tab (left sidebar)
4. You'll see your **Model ID** displayed (format: `project-slug/version-number`)
5. Copy the project slug and version number separately

---

### 3. 🏷️ Presentation Branding *(Optional but Recommended)*

| Info | Why I Need It |
|---|---|
| **Your name or team name** | Shown in the hero section ("Built by [Name]") |
| **Project/presentation title** | E.g. "AI-Powered Safety Detection" — used as the site header |
| **A short tagline** | E.g. "Real-time computer vision for workplace safety" |
| **Color theme preference** | Any brand colors? Or should I pick a stunning dark-mode palette? |

If you don't provide these, I'll create a sleek generic "AI Vision Demo" branding.

---

## Proposed Architecture

### Technology Choices

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Vanilla HTML + CSS + JavaScript | No build step needed, instant deploy, works on any static host |
| **Inference** | Roboflow Hosted API (`https://serverless.roboflow.com`) | Your models are already trained — the hosted API allows inference without formal deployment. No server needed. |
| **Visualization** | HTML5 Canvas overlay | Draw bounding boxes, labels, and confidence scores directly on images/video |
| **Hosting** | **Netlify** (free tier) | Drag-and-drop deploy, free HTTPS, custom subdomain, 100GB bandwidth/mo |

> [!NOTE]
> Since you haven't formally "deployed" your model, the Roboflow hosted inference API should still work as long as the model has completed training. The API serves any trained model version automatically.

---

## Proposed Features

### Core Features
1. **Model Selector** — Toggle between your 2 models via a sleek dropdown/tab UI
2. **Image Upload** — Drag & drop or click-to-browse, with instant inference and bounding box overlay
3. **Live Camera** — Real-time webcam feed with continuous inference and bounding box rendering
4. **Results Panel** — Confidence scores, class breakdown, detection count, and inference time

### Premium Design Features (Impeccable Design)
1. **Dark-mode glassmorphism UI** — Frosted glass cards, gradient accents, depth shadows
2. **Animated hero section** — Particle/grid background animation with floating AI-themed elements
3. **Smooth micro-animations** — Hover effects, card transitions, loading shimmer, result fade-ins
4. **Typography** — Google Fonts (Inter for body, Space Grotesk for headings)
5. **Responsive design** — Looks flawless on laptop/projector for presentations, and on mobile
6. **Detection animation** — Bounding boxes animate in with a subtle glow effect
7. **Stats dashboard** — Live detection count, average confidence, inference speed displayed as glowing metric cards

### Presentation Enhancers
1. **"How It Works" section** — Visual flowchart showing: Train → API → Your App → Results
2. **Code snippet section** — Show the actual API call code with syntax highlighting (demonstrates integration simplicity)
3. **"Integration Possibilities" section** — Cards showing where this could be deployed (Mobile App, Drone, Factory Camera, etc.)
4. **Footer** — "Powered by Roboflow" badge + your branding

---

## Proposed Changes

### Website Structure

#### [NEW] `index.html`
Main HTML file with semantic structure:
- Hero section with animated background
- Model selector tabs
- Image upload zone (drag & drop)
- Live camera section with start/stop controls
- Results visualization panel with canvas overlay
- "How It Works" explainer section
- "Integration Possibilities" showcase
- API code snippet section
- Footer with credits

#### [NEW] `styles.css`
Complete design system:
- CSS custom properties (color palette, spacing, typography scale)
- Dark-mode glassmorphism cards
- Animated gradients and particle background via CSS
- Responsive grid layouts
- Micro-animation keyframes (fade-in, slide-up, glow, shimmer)
- Canvas overlay positioning for bounding boxes

#### [NEW] `app.js`
Core application logic:
- Roboflow API integration (REST calls to `serverless.roboflow.com`)
- Image upload handling (File API + base64 conversion)
- Webcam access via `getUserMedia()` API
- Canvas-based bounding box rendering with labels and confidence
- Model switching logic
- Results aggregation (detection count, avg confidence, speed)
- Smooth animation orchestration

#### [NEW] `README.md`
Documentation for the project:
- Setup instructions
- How to update API keys
- How to add more models
- Deployment guide

---

## Suggestions to Make This Even Better

> [!TIP]
> Here are some ideas that would elevate your presentation:

1. **Sample images** — If you provide 2-3 sample images that your models are good at detecting, I'll embed them as "Try these examples" buttons. This way during your presentation, you can instantly demo without fumbling with files.

2. **Confidence threshold slider** — Let the audience interactively adjust the minimum confidence to show. Great for demonstrating model behavior.

3. **Side-by-side comparison** — Since you have 2 models, we could add a "Compare" mode that runs both models on the same image simultaneously and shows results side-by-side.

4. **Export results** — A "Download Results" button that exports the annotated image + JSON predictions. Shows practical utility.

5. **Sound effects** — A subtle detection sound (optional toggle) for live camera mode, making the demo more engaging.

Let me know which of these extras you'd like included!

---

## Hosting Plan

I recommend **Netlify** for free hosting:
- ✅ Free HTTPS
- ✅ Custom subdomain (e.g., `your-project.netlify.app`)
- ✅ Drag-and-drop deploy (no Git required)
- ✅ 100GB bandwidth/month (more than enough)
- ✅ Instant global CDN

**Deployment steps (after I build it):**
1. I'll package the site into a ready-to-deploy folder
2. Go to [app.netlify.com](https://app.netlify.com/) and sign up (free)
3. Drag the folder onto the Netlify dashboard
4. Your site is live! 🎉

---

## Verification Plan

### Manual Verification
- Test image upload with sample images to verify bounding box rendering
- Test live camera functionality in browser
- Test model switching between both models
- Verify responsive layout on different screen sizes
- Verify the site renders correctly when deployed to Netlify

### Code Quality
- Validate HTML structure
- Ensure all interactive elements have unique IDs
- Test error handling (invalid image, API failure, camera denied)

---

## Open Questions

1. **What are your 2 models?** — Knowing what they detect helps me design the UI context (e.g., safety helmet detection gets a construction theme, pet detection gets a playful theme, etc.)

2. **Any sample images?** — Do you have 2-3 images that work well with your models that I can embed as quick-demo buttons?

3. **Presentation context?** — Is this for a school project, work demo, hackathon? Helps me calibrate the tone of the copy text.

4. **Which extras do you want?** — From the suggestions list above, which ones appeal to you?
