# rPPG Vital-Signs Estimation System

> **⚠️ WELLNESS ESTIMATION TOOL — NOT A MEDICAL DEVICE**
>
> All readings (Heart Rate, HRV, Blood Pressure, Stress) are **estimates** derived from
> remote photoplethysmography (rPPG) and lightweight machine-learning models.  They have
> **not** been validated for clinical use.  Do **not** make medical decisions based on
> these outputs.  Consult a qualified healthcare professional for diagnosis or treatment.

---

## What It Does

Uses a standard RGB webcam to estimate:

| Metric | Method |
|---|---|
| **Heart Rate (BPM)** | rPPG (POS or CHROM algorithm) + FFT & peak detection |
| **HRV** (SDNN, RMSSD, pNN50) | Inter-beat interval analysis |
| **Blood Pressure** (Systolic / Diastolic) | RandomForest regression on HR + HRV + demographics |
| **Stress Level** | RMSSD-based heuristic (Low / Moderate / High) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        main.py  /  demo_cli.py              │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     ┌─────────┐  ┌───────────┐  ┌───────────┐
     │  api/   │  │  camera/  │  │   face/   │
     │ FastAPI │  │  capture  │  │ detector  │
     │  routes │  │  (thread) │  │ (MediaPipe│
     └────┬────┘  └─────┬─────┘  │  FaceMesh)│
          │             │        └─────┬─────┘
          │             ▼              ▼
          │      ┌─────────────────────┐
          │      │     rppg/ pipeline  │
          │      │  POS / CHROM algo   │
          │      │  Butterworth filter │
          │      └──────────┬──────────┘
          │                 ▼
          │      ┌─────────────────────┐
          │      │   features/         │
          │      │  hr.py   → BPM      │
          │      │  hrv.py  → RMSSD…   │
          │      └──────────┬──────────┘
          │                 ▼
          │      ┌─────────────────────┐
          │      │   model/            │
          │      │  bp_model.py → BP   │
          │      │  stress.py   → Stress│
          │      └─────────────────────┘
          │
          ▼  (JSON response)
     ┌─────────┐
     │  Client │  (browser / curl / mobile app)
     └─────────┘
```

### Module Breakdown

| Directory | Responsibility |
|---|---|
| `camera/` | Thread-safe webcam capture via OpenCV |
| `face/` | MediaPipe Face Mesh detection & ROI extraction (forehead, cheeks) |
| `rppg/` | POS & CHROM algorithms + Butterworth bandpass filter |
| `features/` | Heart-rate estimation (FFT + peak detection) and HRV metrics |
| `model/` | Blood-pressure RandomForest estimator and stress heuristic |
| `api/` | FastAPI routes, Pydantic schemas, scan-session manager |
| `utils/` | Shared logging configuration |

---

## Quick Start

### 1. Prerequisites

* **Python 3.10 – 3.11** (mediapipe compatibility; 3.12 support is limited)
* A **webcam** accessible via OpenCV (device index 0)
* ~500 MB free disk space (for MediaPipe model download on first run)

### 2. Create a Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

> **Tip:** If `mediapipe` fails to install, try:
> `pip install mediapipe==0.10.0`

### 4a. Run the CLI Demo (no server needed)

```bash
python demo_cli.py --age 30 --gender female --height 165 --weight 58 --duration 30
```

Add `--show-feed` to see a live camera window with face overlay:

```bash
python demo_cli.py --age 30 --gender female --height 165 --weight 58 --duration 30 --show-feed
```

### 4b. Run the FastAPI Server

```bash
python main.py
```

The server starts on **http://localhost:8000**.  Interactive API docs are at
**http://localhost:8000/docs**.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/metadata` | Set demographics (required before scan) |
| `POST` | `/scan/start` | Begin rPPG scan (background thread) |
| `GET` | `/scan/status` | Poll progress (0–100 %) |
| `GET` | `/scan/result` | Retrieve full vitals JSON |
| `POST` | `/scan/reset` | Reset session for next scan |

### Example Workflow (curl)

```bash
# 1. Set metadata
curl -X POST http://localhost:8000/metadata \
  -H "Content-Type: application/json" \
  -d '{"age": 35, "gender": "male", "height_cm": 178, "weight_kg": 75}'

# 2. Start scan (default: POS algorithm, 45 s)
curl -X POST http://localhost:8000/scan/start \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "pos", "duration_seconds": 45}'

# 3. Poll until complete
curl http://localhost:8000/scan/status

# 4. Get results
curl http://localhost:8000/scan/result | python -m json.tool

# 5. Reset for next scan
curl -X POST http://localhost:8000/scan/reset
```

### Example Response (scan/result)

```json
{
  "disclaimer": "⚠️ This is a WELLNESS ESTIMATION tool …",
  "hr": {
    "hr_bpm": 72.4,
    "hr_fft": 71.8,
    "hr_peaks": 73.1,
    "confidence_fft": 0.42,
    "confidence_peaks": 0.81
  },
  "hrv": {
    "sdnn_ms": 28.4,
    "rmssd_ms": 34.2,
    "pnn50": 18.5,
    "mean_rr_ms": 829.3,
    "num_beats": 54,
    "valid": true
  },
  "blood_pressure": {
    "systolic": 118.3,
    "diastolic": 76.7,
    "unit": "mmHg"
  },
  "stress": {
    "level": "Moderate",
    "score": 42.1,
    "confidence": "Medium",
    "description": "Your HRV indicates a moderate level …"
  },
  "scan_duration_seconds": 45.0,
  "algorithm_used": "pos"
}
```

---

## Configuration

All tunable parameters are in **`config.py`**:

| Parameter | Default | Description |
|---|---|---|
| `CAMERA_INDEX` | 0 | Webcam device index |
| `SCAN_DURATION_SECONDS` | 45 | Default scan length |
| `BP_LOW_HZ` / `BP_HIGH_HZ` | 0.7 / 4.0 | Bandpass filter bounds |
| `HR_WINDOW_SECONDS` | 10.0 | Sliding window for HR |
| `STRESS_RMSSD_HIGH` | 45 ms | RMSSD threshold → Low stress |
| `STRESS_RMSSD_MED` | 25 ms | RMSSD threshold → Moderate stress |

---

## Tips for Best Results

1. **Lighting** — Use steady, diffuse lighting (avoid harsh overhead or backlighting).
2. **Distance** — Sit 40–80 cm from the camera so your face fills ~30 % of the frame.
3. **Movement** — Stay as still as possible during the scan; motion is the #1 source of artefact.
4. **Face coverage** — Keep your forehead and cheeks unobstructed (no glasses on forehead, hats, etc.).
5. **Duration** — Longer scans (45 s+) produce more reliable HRV estimates.

---

## Known Limitations

* **Blood Pressure accuracy is low.**  The model is trained on *synthetic* data and uses
  only HR, HRV, and demographics as features.  Real BP estimation from rPPG is an active
  research problem requiring pulse-wave transit time (PTT) or similar measurements.
* **Short recording window** — 30–45 seconds provides only ~30–60 heartbeats, which limits
  HRV reliability compared to the clinical 5-minute standard.
* **Single-user session** — The current API serves one scan at a time.  For multi-user
  deployments, key sessions by authentication token.
* **MediaPipe compatibility** — mediapipe does not support all Python / OS combinations.
  See [MediaPipe GitHub issues](https://github.com/google/mediapipe/issues) for workarounds.

---

## 🚀 Deployment to Production

To deploy this app to production (Render + Netlify), see the comprehensive deployment guide:

**📖 [DEPLOYMENT.md](DEPLOYMENT.md)**

Quick overview:
- **Backend (FastAPI):** Deploy to Render using `render.yaml`
- **Frontend (React):** Deploy to Netlify using drag & drop or GitHub
- **Zero build required** — Static frontend with CDN-hosted React
- **Auto-configuration** — Environment detection in frontend

Expected live URLs:
- Backend: `https://rppg-vitals-api.onrender.com`
- Frontend: `https://your-app-name.netlify.app`

For detailed step-by-step instructions, troubleshooting, and monitoring tips, check [DEPLOYMENT.md](DEPLOYMENT.md).

---

## License

This project is provided as-is for educational, research, and prototyping purposes.
See the disclaimer at the top of this file and in every source module.
