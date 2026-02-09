const { useState, useEffect, useRef } = React;

// ============================================================================
// Configuration
// ============================================================================
// Automatically detect environment
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : 'https://rppg-vitals-api.onrender.com'; // Update this with your Render URL after deployment

// ============================================================================
// API Client
// ============================================================================
const api = {
  async setMetadata(data) {
    const res = await fetch(`${API_BASE}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to set metadata');
    return res.json();
  },
  
  async startScan(algorithm = 'pos', duration = 45) {
    const res = await fetch(`${API_BASE}/scan/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm, duration_seconds: duration }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to start scan');
    }
    return res.json();
  },
  
  async getStatus() {
    const res = await fetch(`${API_BASE}/scan/status`);
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },
  
  async getResult() {
    const res = await fetch(`${API_BASE}/scan/result`);
    if (!res.ok) throw new Error('Failed to get result');
    return res.json();
  },
  
  async reset() {
    const res = await fetch(`${API_BASE}/scan/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset');
    return res.json();
  },
  
  async sendFrame(frameData, progress) {
    const res = await fetch(`${API_BASE}/scan/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frameData, progress_percent: progress }),
    });
    if (!res.ok) throw new Error('Failed to send frame');
    return res.json();
  },
};

// ============================================================================
// Step 1: User Information Form
// ============================================================================
function Step1_UserInfo({ onNext }) {
  const [form, setForm] = useState({
    age: '',
    gender: 'male',
    height_cm: '',
    weight_kg: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.age || form.age < 10 || form.age > 120) {
      errs.age = 'Age must be between 10 and 120';
    }
    if (!form.height_cm || form.height_cm < 100 || form.height_cm > 250) {
      errs.height_cm = 'Height must be between 100 and 250 cm';
    }
    if (!form.weight_kg || form.weight_kg < 20 || form.weight_kg > 300) {
      errs.weight_kg = 'Weight must be between 20 and 300 kg';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.setMetadata(form);
      onNext();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full gradient-bg mb-3 sm:mb-4">
          <i data-lucide="user" className="w-8 h-8 sm:w-10 sm:h-10"></i>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Personal Information</h2>
        <p className="text-slate-400 text-sm sm:text-base px-4">Enter your details for accurate vital sign estimation</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
        {/* Age */}
        <div>
          <label className="block text-sm font-semibold mb-2">Age (years)</label>
          <input
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-base"
            placeholder="e.g., 30"
          />
          {errors.age && <p className="text-red-400 text-xs sm:text-sm mt-1">{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold mb-2">Gender</label>
          <div className="grid grid-cols-3 gap-3">
            {['male', 'female', 'other'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, gender: g })}
                className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium capitalize transition text-sm sm:text-base ${
                  form.gender === g
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 active:bg-slate-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Height (cm)</label>
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-base"
              placeholder="175"
            />
            {errors.height_cm && <p className="text-red-400 text-xs sm:text-sm mt-1">{errors.height_cm}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Weight (kg)</label>
            <input
              type="number"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-base"
              placeholder="70"
            />
            {errors.weight_kg && <p className="text-red-400 text-xs sm:text-sm mt-1">{errors.weight_kg}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-bg py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg active:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
        >
          {loading ? 'Saving...' : 'Continue to Scan'}
          <i data-lucide="arrow-right" className="w-4 h-4 sm:w-5 sm:h-5"></i>
        </button>
      </form>

      {/* Disclaimer */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-900/20 border border-amber-700 rounded-lg text-xs sm:text-sm text-amber-200">
        <strong>⚠️ Wellness Tool Disclaimer:</strong> This is an estimation system, NOT a medical device. 
        Results are for wellness tracking only. Consult a healthcare professional for medical advice.
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Real-Time Camera Scanning with Face Detection
// ============================================================================
function Step2_Scanning({ onComplete, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [message, setMessage] = useState('Initializing camera...');
  const [scanDuration] = useState(45);
  const [error, setError] = useState(null);
  
  const streamRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const lastFaceSeenRef = useRef(Date.now());

  // Initialize camera when instructions are dismissed
  useEffect(() => {
    if (!showInstructions) {
      initCamera();
    }
    return () => cleanup();
  }, [showInstructions]);

  // Redraw icons when state changes
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [cameraReady, scanning, faceDetected, progress, showInstructions, analyzing]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setMessage('Camera ready');
        startFaceDetection();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const startFaceDetection = async () => {
    if (!window.FaceMesh) {
      console.error('MediaPipe FaceMesh not loaded');
      return;
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onFaceResults);
    faceMeshRef.current = faceMesh;

    if (videoRef.current && window.Camera) {
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      camera.start();
      cameraRef.current = camera;
    }
  };

  const onFaceResults = (results) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      lastFaceSeenRef.current = Date.now();

      const landmarks = results.multiFaceLandmarks[0];
      drawFaceMesh(ctx, landmarks, canvas.width, canvas.height);
    } else {
      setFaceDetected(false);
      
      // Check if face has been missing for too long during scan
      if (scanning && Date.now() - lastFaceSeenRef.current > 3000) {
        setMessage('⚠️ Face lost! Please position your face in frame');
      }
    }
  };

  const drawFaceMesh = (ctx, landmarks, width, height) => {
    // Draw face bounding box
    const bbox = getFaceBoundingBox(landmarks, width, height);
    
    ctx.strokeStyle = faceDetected ? '#10b981' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    
    // Draw some key landmarks
    ctx.fillStyle = '#10b981';
    landmarks.forEach((landmark, i) => {
      if (i % 10 === 0) { // Draw every 10th point
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const getFaceBoundingBox = (landmarks, width, height) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach(landmark => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const startScan = async () => {
    if (!faceDetected) {
      setMessage('⚠️ Please position your face in the camera view');
      return;
    }

    if (scanning) {
      console.log('Scan already in progress, ignoring click');
      return;
    }

    try {
      setScanning(true);
      setProgress(0);
      setMessage('Initializing scan...');
      
      // Reset any previous scan
      try {
        await api.reset();
        console.log('Session reset successful');
      } catch (e) {
        console.log('Reset failed (may be first scan):', e);
      }
      
      // Start backend scan session
      await api.startScan('pos', scanDuration);
      console.log('Scan initialization successful');
      
      const startTime = Date.now();
      const duration = scanDuration * 1000; // Convert to milliseconds
      let lastFrameTime = 0;
      const FRAME_INTERVAL = 200; // Send frame every 200ms
      
      // Track progress and send frames to backend
      pollIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(currentProgress);
        
        // Update message based on face detection
        if (faceDetected) {
          setMessage(`Scanning... ${Math.round(currentProgress)}% complete`);
        } else {
          setMessage('⚠️ Face not detected - please stay in frame');
        }
        
        // Capture and send frame to backend every 200ms
        const now = Date.now();
        if (videoRef.current && now - lastFrameTime >= FRAME_INTERVAL) {
          lastFrameTime = now;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            const frameData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Send frame to backend (non-blocking)
            api.sendFrame(frameData, currentProgress)
              .then(response => {
                console.log(`Frame sent successfully - Progress: ${currentProgress.toFixed(1)}%`);
              })
              .catch(err => {
                console.warn('Frame send failed:', err);
              });
          } catch (err) {
            console.warn('Frame capture failed:', err);
          }
        }
        
        // Check if scan is complete
        if (currentProgress >= 100) {
          clearInterval(pollIntervalRef.current);
          setScanning(false);
          setAnalyzing(true);
          setMessage('✓ Scan complete! Analyzing your vitals...');
          
          // Stop camera and face detection
          if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
          }
          if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          // Poll for backend processing completion
          const pollForResults = async (attempt = 0, maxAttempts = 30) => {
            try {
              console.log(`Polling for results (attempt ${attempt + 1}/${maxAttempts})...`);
              const statusData = await api.getStatus();
              console.log(`Backend status: ${statusData.status}, progress: ${statusData.progress_percent}`);
              
              if (statusData.status === 'complete') {
                console.log('Backend processing complete! Fetching results...');
                onComplete();
              } else if (statusData.status === 'error') {
                console.error('Backend reported error status');
                onComplete(); // Still navigate to see error
              } else if (attempt < maxAttempts) {
                // Still processing, try again in 500ms
                setTimeout(() => pollForResults(attempt + 1, maxAttempts), 500);
              } else {
                console.warn('Max polling attempts reached, proceeding anyway...');
                onComplete();
              }
            } catch (err) {
              console.error('Error polling status:', err);
              if (attempt < maxAttempts) {
                setTimeout(() => pollForResults(attempt + 1, maxAttempts), 500);
              } else {
                onComplete();
              }
            }
          };
          
          // Start polling after a brief delay
          setTimeout(() => pollForResults(), 1000);
        }
      }, 100); // Update every 100ms for smooth progress
      
    } catch (err) {
      setScanning(false);
      setProgress(0);
      setMessage('Failed to start scan: ' + err.message);
      console.error('Scan start error:', err);
      
      // Clear any running intervals
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  };

  const cleanup = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (cameraRef.current) cameraRef.current.stop();
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4">
      {/* Show Instructions First */}
      {showInstructions ? (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full gradient-bg mb-4 sm:mb-6 animate-pulse">
              <i data-lucide="scan-face" className="w-10 h-10 sm:w-12 sm:h-12"></i>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 px-4">Face Scan Instructions</h2>
            <p className="text-slate-400 text-sm sm:text-base md:text-lg px-4">Please read carefully before starting the scan</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                <i data-lucide="info" className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400"></i>
                How It Works
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                Our system uses your device camera to detect subtle color changes in your face caused by blood flow. 
                This technique (rPPG - Remote Photoplethysmography) allows us to estimate your vital signs without physical contact.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4 bg-slate-700/50 rounded-xl p-3 sm:p-5 active:bg-slate-700 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="user-check" className="w-5 h-5 sm:w-6 sm:h-6 text-green-400"></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base md:text-lg mb-1">Position your face in the green box and stay still for {scanDuration} seconds</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Keep your head steady and look directly at the camera</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 bg-slate-700/50 rounded-xl p-3 sm:p-5 active:bg-slate-700 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="alert-triangle" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400"></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base md:text-lg mb-1">Keep your face visible - scan may pause if face is not detected</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Avoid moving out of frame or covering your face</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 bg-slate-700/50 rounded-xl p-3 sm:p-5 active:bg-slate-700 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-600/20 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="sun" className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400"></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base md:text-lg mb-1">Ensure good lighting for best results</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Natural or bright indoor lighting works best. Avoid backlighting.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 bg-slate-700/50 rounded-xl p-3 sm:p-5 active:bg-slate-700 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="video" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400"></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base md:text-lg mb-1">Allow camera access when prompted</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Your camera data is processed locally and never uploaded</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-3 sm:p-5 mt-4 sm:mt-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <i data-lucide="shield-alert" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0 mt-1"></i>
                <div>
                  <h4 className="font-bold text-amber-200 mb-2 text-sm sm:text-base">Important Disclaimer</h4>
                  <p className="text-amber-200/80 text-xs sm:text-sm leading-relaxed">
                    This is a wellness estimation tool, NOT a medical device. Results are for informational purposes only. 
                    Always consult a healthcare professional for medical advice, diagnosis, or treatment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={onBack}
              className="bg-slate-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold active:bg-slate-600 inline-flex items-center justify-center gap-2 text-base sm:text-lg touch-manipulation"
            >
              <i data-lucide="arrow-left" className="w-4 h-4 sm:w-5 sm:h-5"></i>
              Back
            </button>
            <button
              onClick={() => setShowInstructions(false)}
              className="gradient-bg px-8 sm:px-12 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg active:opacity-80 inline-flex items-center justify-center gap-2 shadow-xl touch-manipulation"
            >
              I Understand - Continue
              <i data-lucide="arrow-right" className="w-4 h-4 sm:w-5 sm:h-5"></i>
            </button>
          </div>
        </div>
      ) : (
        /* Camera Scanning View */
        <>
      <div className="text-center mb-4 sm:mb-6 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Face Scan</h2>
        <p className="text-slate-400 text-sm sm:text-base">Keep your face visible for {scanDuration} seconds</p>
      </div>

      {/* Camera Preview Area */}
      <div className="relative bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
        {/* Camera Video and Canvas */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{ display: cameraReady && !analyzing ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: cameraReady && !analyzing ? 'block' : 'none' }}
        />
        
        {/* Analyzing Animation */}
        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900">
            {/* Animated Pulse Circles */}
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-ping"></div>
              <div className="absolute inset-4 rounded-full bg-blue-500 opacity-30 animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute inset-8 rounded-full bg-pink-500 opacity-40 animate-ping" style={{animationDelay: '1s'}}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full gradient-bg flex items-center justify-center animate-pulse">
                  <i data-lucide="brain" className="w-16 h-16 text-white"></i>
                </div>
              </div>
            </div>
            
            {/* Analyzing Text with Animated Dots */}
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 animate-pulse">Analyzing Vitals</h3>
            <div className="flex gap-2 mb-4 sm:mb-6">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
            
            {/* Processing Steps */}
            <div className="space-y-2 text-slate-300 text-sm sm:text-base px-4">
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Processing facial blood flow patterns</span>
              </div>
              <div className="flex items-center gap-2 animate-pulse" style={{animationDelay: '0.3s'}}>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Extracting heart rate variability</span>
              </div>
              <div className="flex items-center gap-2 animate-pulse" style={{animationDelay: '0.6s'}}>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Estimating blood pressure</span>
              </div>
              <div className="flex items-center gap-2 animate-pulse" style={{animationDelay: '0.9s'}}>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Calculating stress indicators</span>
              </div>
            </div>
          </div>
        )}
        
        {!cameraReady && !error && !analyzing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white text-lg">{message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                <i data-lucide="camera-off" className="w-10 h-10 text-red-400"></i>
              </div>
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Scanning Progress Overlay */}
        {scanning && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/70 to-transparent backdrop-blur-md p-3 sm:p-6 z-10">
            {/* Header with Status */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative hidden sm:block">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <div>
                  <span className="text-white font-bold text-sm sm:text-base md:text-xl">Scanning in Progress</span>
                  <p className="text-green-400 text-xs font-medium mt-0.5 hidden sm:block">{message}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-2xl sm:text-3xl">{Math.round(progress)}%</span>
                <p className="text-slate-300 text-xs mt-0.5">Complete</p>
              </div>
            </div>
            
            {/* Progress Bar with Glow Effect */}
            <div className="relative">
              <div className="w-full bg-slate-800/60 rounded-full h-3 sm:h-4 overflow-hidden border border-slate-700/50">
                <div
                  className="gradient-bg h-full transition-all duration-100 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Time & Face Detection Status */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <i data-lucide="clock" className="w-4 h-4"></i>
                <span className="font-medium">Time remaining: {Math.max(0, scanDuration - Math.floor((progress / 100) * scanDuration))}s</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${faceDetected ? 'text-green-400' : 'text-red-400'}`}>
                <i data-lucide={faceDetected ? 'check-circle' : 'alert-circle'} className="w-4 h-4"></i>
                <span className="font-medium">{faceDetected ? 'Face Detected' : 'No Face'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Face Detection Status Badge */}
        {cameraReady && !scanning && !analyzing && (
          <div className="absolute top-4 right-4 flex gap-2">
            <div className={`px-4 py-2 rounded-full font-semibold backdrop-blur-md ${faceDetected ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
              {faceDetected ? '✓ Face Detected' : '✗ No Face'}
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
        {!scanning && cameraReady && !analyzing && (
          <>
            <button
              onClick={onBack}
              className="bg-slate-700 px-6 py-3 rounded-lg font-semibold active:bg-slate-600 inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            >
              <i data-lucide="arrow-left" className="w-4 h-4 sm:w-5 sm:h-5"></i>
              Back
            </button>
            <button
              onClick={startScan}
              disabled={!faceDetected || scanning}
              className="gradient-bg px-8 py-3 rounded-lg font-bold active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-base touch-manipulation"
            >
              <i data-lucide="play" className="w-4 h-4 sm:w-5 sm:h-5"></i>
              <span className="hidden sm:inline">Start {scanDuration}s Scan</span>
              <span className="sm:hidden">Start Scan</span>
            </button>
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function Step3_Results({ onRestart }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
    lucide.createIcons();
  }, []);

  useEffect(() => {
    lucide.createIcons();
  }, [results]);

  const loadResults = async () => {
    try {
      const data = await api.getResult();
      console.log('Results received:', data);
      
      // Validate that we have the minimum required data
      if (!data || !data.hr || !data.blood_pressure || !data.stress) {
        throw new Error('Incomplete results data received from server');
      }
      
      setResults(data);
    } catch (err) {
      console.error('Failed to load results:', err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    await api.reset();
    onRestart();
  };

  if (loading) {
    return (
      <div className="text-center py-12 sm:py-20 px-4">
        <div className="inline-block w-12 h-12 sm:w-16 sm:h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm sm:text-base">Loading results...</p>
      </div>
    );
  }

  // Validate results data before rendering
  if (!results || !results.hr || !results.blood_pressure || !results.stress) {
    return (
      <div className="text-center py-12 sm:py-20 px-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="alert-triangle" className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400"></i>
        </div>
        <p className="text-amber-400 text-lg sm:text-xl mb-3 sm:mb-4">{!results ? 'Failed to Load Results' : 'Incomplete Results'}</p>
        <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">
          {!results 
            ? 'The scan data could not be retrieved. Please try scanning again.' 
            : 'The scan completed but some vital signs could not be calculated.'}
        </p>
        <button
          onClick={handleRestart}
          className="gradient-bg px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg active:opacity-80 inline-flex items-center justify-center gap-2 touch-manipulation"
        >
          <i data-lucide="refresh-cw" className="w-4 h-4 sm:w-5 sm:h-5"></i>
          {!results ? 'Start New Scan' : 'Try Again'}
        </button>
      </div>
    );
  }

  const { hr, hrv, blood_pressure, stress } = results;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full gradient-success mb-3 sm:mb-4">
          <i data-lucide="heart-pulse" className="w-8 h-8 sm:w-10 sm:h-10"></i>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Vital Signs</h2>
        <p className="text-slate-400 text-sm sm:text-base">Analysis complete{results?.scan_duration_seconds ? ` • ${results.scan_duration_seconds}s scan` : ''}</p>
      </div>

      {/* Results Grid - 3 Cards in One Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Heart Rate */}
        <div className="bg-gradient-to-br from-red-600 to-pink-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-red-100 text-xs sm:text-sm font-semibold mb-1">Heart Rate</p>
              <p className="text-4xl sm:text-5xl font-bold">{hr?.hr_bpm || 'N/A'}</p>
              <p className="text-red-100 text-xs sm:text-sm mt-1">BPM</p>
            </div>
            <i data-lucide="heart" className="w-10 h-10 sm:w-12 sm:h-12 text-red-100"></i>
          </div>
          <div className="text-xs sm:text-sm text-red-100 space-y-1">
            <p>FFT: {hr?.hr_fft || 'N/A'} BPM (conf: {hr?.confidence_fft ? (hr.confidence_fft * 100).toFixed(0) : 'N/A'}%)</p>
            <p>Peaks: {hr?.hr_peaks || 'N/A'} BPM (conf: {hr?.confidence_peaks ? (hr.confidence_peaks * 100).toFixed(0) : 'N/A'}%)</p>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mb-1">Blood Pressure</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold">{blood_pressure?.systolic || 'N/A'}/{blood_pressure?.diastolic || 'N/A'}</p>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">mmHg</p>
            </div>
            <i data-lucide="activity" className="w-10 h-10 sm:w-12 sm:h-12 text-blue-100"></i>
          </div>
          <div className="bg-blue-700/30 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-blue-100">
            <strong>⚠️ Estimated value</strong> — Not measured. For reference only.
          </div>
        </div>

        {/* HRV - Commented out due to high values 
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-emerald-100 text-sm font-semibold mb-1">Heart Rate Variability</p>
              {hrv.valid ? (
                <>
                  <p className="text-3xl font-bold">RMSSD: {hrv.rmssd_ms} ms</p>
                  <p className="text-emerald-100 text-sm mt-1">({hrv.num_beats} beats analyzed)</p>
                </>
              ) : (
                <p className="text-2xl font-semibold text-emerald-200">Insufficient data</p>
              )}
            </div>
            <i data-lucide="waves" className="w-12 h-12 text-emerald-100"></i>
          </div>
          {hrv.valid && (
            <div className="text-sm text-emerald-100 space-y-1">
              <p>SDNN: {hrv.sdnn_ms} ms</p>
              <p>pNN50: {hrv.pnn50}%</p>
              <p>Mean RR: {hrv.mean_rr_ms} ms</p>
            </div>
          )}
        </div>
        */}

        {/* Stress Level */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl sm:col-span-2 md:col-span-1 ${
          stress?.level === 'Low' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
          stress?.level === 'Moderate' ? 'bg-gradient-to-br from-yellow-600 to-orange-600' :
          'bg-gradient-to-br from-red-600 to-rose-600'
        }`}>
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-white/90 text-xs sm:text-sm font-semibold mb-1">Stress Level</p>
              <p className="text-3xl sm:text-4xl font-bold">{stress?.level || 'N/A'}</p>
              <p className="text-white/90 text-xs sm:text-sm mt-1">Score: {stress?.score || 'N/A'}/100</p>
            </div>
            <i data-lucide="brain" className="w-10 h-10 sm:w-12 sm:h-12 text-white/90"></i>
          </div>
          <div className="bg-black/20 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-white/90">
            <p>{stress?.description || 'No description available'}</p>
            <p className="mt-2 text-xs">Confidence: {stress?.confidence || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleRestart}
          className="gradient-bg px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg active:opacity-80 inline-flex items-center justify-center gap-2 touch-manipulation"
        >
          <i data-lucide="refresh-cw" className="w-4 h-4 sm:w-5 sm:h-5"></i>
          New Scan
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-amber-900/20 border border-amber-700 rounded-lg text-xs sm:text-sm text-amber-200">
        <strong>⚠️ Important:</strong> {results?.disclaimer || 'This is a wellness estimation tool, NOT a medical device. Results are for informational purposes only. Always consult a healthcare professional for medical advice, diagnosis, or treatment.'}
      </div>
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================
function App() {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    lucide.createIcons();
  }, [currentStep]);

  return (
    <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4">
      {/* Header */}
      <header className="text-center mb-6 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          VitalSense AI
        </h1>
        <p className="text-slate-400 text-sm sm:text-base md:text-lg">Remote Photoplethysmography Health Scanner</p>
      </header>

      {/* Content */}
      <main>
        {currentStep === 1 && <Step1_UserInfo onNext={() => setCurrentStep(2)} />}
        {currentStep === 2 && (
          <Step2_Scanning
            onComplete={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && <Step3_Results onRestart={() => setCurrentStep(1)} />}
      </main>

      {/* Footer */}
      <footer className="text-center mt-8 sm:mt-16 text-slate-500 text-xs sm:text-sm px-4">
        <p>© 2026 VitalSense AI • Powered by rPPG Technology</p>
        <p className="mt-1">Not intended for medical diagnosis or treatment</p>
      </footer>
    </div>
  );
}

// ============================================================================
// Render
// ============================================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
