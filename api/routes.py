"""
api/routes.py — FastAPI route definitions
==========================================
All HTTP endpoints are defined here and wired into the app via
`app.include_router(router)` in `api/app.py`.

Endpoint summary
----------------
    GET  /health              — Liveness probe
    POST /metadata            — Set user demographics (age, gender, height, weight)
    POST /scan/start          — Begin a 30–45 s rPPG scan (background thread)
    GET  /scan/status         — Poll scan progress & state
    GET  /scan/result         — Retrieve the full vitals JSON once scan is complete
    POST /scan/reset          — Reset session to idle
    GET  /docs                — Auto-generated Swagger UI (FastAPI built-in)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import cv2
import asyncio
from api.schemas import (
    UserMetadata,
    ScanRequest,
    StatusResponse,
    VitalsResponse,
)
from api.session import ScanSession
from utils.logger import get_logger

logger = get_logger("api.routes")

router = APIRouter()

# ── Global session instance ──────────────────────────────────────────────────
# One session for the entire application lifetime.  In a multi-user
# deployment you would key sessions by user/token; for an MVP this is fine.
_session = ScanSession()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """Simple liveness check with session status."""
    return {
        "status": "ok", 
        "service": "rPPG Vital Signs Estimator",
        "scan_status": _session.status,
        "scan_progress": _session.progress if _session.status == "scanning" else None
    }


# ── Metadata ──────────────────────────────────────────────────────────────────

@router.post("/metadata")
async def set_metadata(metadata: UserMetadata):
    """
    Store user demographic data required by the BP estimation model.
    Must be called before starting a scan.

    Body (JSON):
        age        : int     (10–120)
        gender     : str     ("male" | "female" | "other")
        height_cm  : float   (100–250)
        weight_kg  : float   (20–300)
    """
    _session.set_metadata(metadata)
    return {
        "status": "ok",
        "message": "Metadata stored. You can now start a scan via POST /scan/start.",
    }


# ── Scan Control ──────────────────────────────────────────────────────────────

@router.post("/scan/start")
async def start_scan(request: ScanRequest = ScanRequest()):
    """
    Begin an rPPG scan.  The scan will receive frames from the frontend.

    Body (JSON, all optional):
        algorithm         : "pos" | "chrom"   (default "pos")
        duration_seconds  : int               (20–120, default 45)

    Returns 409 if a scan is already running, or 422 if metadata is missing.
    """
    # Just initialize the session - don't actually start camera processing
    # Frontend will send frames
    success = _session.start_scan_frontend_mode(
        algorithm=request.algorithm,
        duration_seconds=request.duration_seconds,
    )
    if not success:
        current_status = _session.status
        if current_status == "scanning":
            raise HTTPException(status_code=409, detail="A scan is already in progress.")
        raise HTTPException(
            status_code=422,
            detail="Cannot start scan. Set user metadata first via POST /metadata.",
        )

    return {
        "status": "scanning",
        "message": (
            f"Scan started ({request.algorithm}, {request.duration_seconds}s). "
            "Send frames via POST /scan/frame."
        ),
    }


@router.post("/scan/frame")
async def receive_frame(data: dict):
    """
    Receive a frame from the frontend during scanning.
    
    Body (JSON):
        frame: base64 encoded image data
        progress_percent: current progress (0-100)
    """
    try:
        # Quick validation
        if _session.status not in ["scanning", "complete"]:
            return {"success": False, "error": "No active scan"}
        
        frame_data = data.get('frame', '')
        progress = data.get('progress_percent', 0)
        
        # Validate frame data
        if not frame_data:
            logger.warning("Empty frame data received")
            return {"success": False, "error": "Empty frame data"}
        
        # Process the frame in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(
            None, 
            _session.process_frontend_frame, 
            frame_data, 
            progress
        )
        
        return {"success": success, "progress": progress, "status": _session.status}
    except asyncio.TimeoutError:
        logger.error("Frame processing timeout")
        return {"success": False, "error": "Processing timeout"}
    except Exception as e:
        logger.error(f"Frame processing error: {e}", exc_info=True)
        return {"success": False, "error": str(e)[:100]}


@router.get("/scan/status")
async def scan_status() -> StatusResponse:
    """
    Poll the current scan state and progress percentage.

    Returns
    -------
    StatusResponse
        status           : "idle" | "scanning" | "complete" | "error"
        progress_percent : 0–100  (only meaningful when scanning)
        message          : human-readable description
    """
    status = _session.status
    progress = _session.progress

    messages = {
        "idle":     "No scan in progress. POST /scan/start to begin.",
        "scanning": f"Scan in progress — {progress:.0f}% complete. Keep your face visible.",
        "complete": "Scan complete! Retrieve results via GET /scan/result.",
        "error":    "Scan encountered an error. Check logs or restart.",
    }

    return StatusResponse(
        status=status,
        message=messages.get(status, "Unknown state."),
        progress_percent=progress if status == "scanning" else None,
    )


@router.get("/scan/result")
async def scan_result():
    """
    Retrieve the full vitals JSON after a successful scan.

    Returns 404 if the scan is not yet complete, or 500 if it errored.
    """
    status = _session.status

    if status == "scanning":
        raise HTTPException(status_code=202, detail="Scan still in progress.")
    if status == "idle":
        raise HTTPException(status_code=404, detail="No scan has been run yet.")
    if status == "error":
        raise HTTPException(status_code=500, detail="Scan failed. Reset and try again.")

    result = _session.get_result()
    if result is None:
        raise HTTPException(status_code=500, detail="Result unavailable.")

    return result


@router.post("/scan/reset")
async def scan_reset():
    """Reset the session to idle state so a new scan can be started."""
    _session.reset()
    return {"status": "ok", "message": "Session reset. Ready for a new scan."}


# ── Video Streaming ───────────────────────────────────────────────────────────

async def generate_video_frames():
    """
    Generate video frames for streaming during the scan.
    Yields JPEG-encoded frames from the active camera session.
    """
    while True:
        frame = _session.get_current_frame()
        if frame is not None:
            # Draw face detection visualization if available
            rois = _session.get_current_rois()
            if rois and rois.face_detected:
                # Draw face landmarks
                landmarks = rois.landmarks
                if landmarks:
                    # Draw face mesh points
                    for (x, y) in landmarks[::5]:  # Draw every 5th point to avoid clutter
                        cv2.circle(frame, (x, y), 1, (0, 255, 0), -1)
                    
                    # Calculate face bounding box from landmarks
                    if len(landmarks) > 0:
                        xs = [pt[0] for pt in landmarks]
                        ys = [pt[1] for pt in landmarks]
                        x_min, x_max = min(xs), max(xs)
                        y_min, y_max = min(ys), max(ys)
                        
                        # Add padding
                        padding = 20
                        x_min = max(0, x_min - padding)
                        y_min = max(0, y_min - padding)
                        x_max = min(frame.shape[1], x_max + padding)
                        y_max = min(frame.shape[0], y_max + padding)
                        
                        # Draw purple frame around face
                        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (255, 0, 255), 3)
                        
                        # Draw "Face Detected" indicator
                        cv2.putText(frame, "Face Detected", (x_min, y_min - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            else:
                # No face detected - show warning
                h, w = frame.shape[:2]
                cv2.putText(frame, "No Face Detected", (w//2 - 150, h//2), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Limit frame rate to avoid overwhelming the client
        await asyncio.sleep(0.033)  # ~30 FPS


@router.get("/video_feed")
async def video_feed():
    """
    Stream live video from the camera during scanning.
    Returns an MJPEG stream.
    """
    return StreamingResponse(
        generate_video_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
