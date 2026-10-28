import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  Sparkles,
  RefreshCw,
  ScanLine,
  FileVideo,
  Image as ImageIcon,
  FlipHorizontal,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { DetectionResult, EMOTION_LIST, EMOTION_TOKENS, EmotionKey } from '../types/mood';
import { RippleButton, TiltCard } from './InteractiveUI';
import { soundEngine } from '../utils/sound';

interface ScannerPanelProps {
  activeEmotion: EmotionKey;
  isScanning: boolean;
  lastDetection: DetectionResult;
  onDetectFrame: (payload: { imageBase64?: string; mimeType?: string; presetEmotion?: EmotionKey }) => void;
}

export const ScannerPanel: React.FC<ScannerPanelProps> = ({
  activeEmotion,
  isScanning,
  lastDetection,
  onDetectFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState(true);
  const [continuousScan, setContinuousScan] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null);

  const activeToken = EMOTION_TOKENS[activeEmotion] || EMOTION_TOKENS.natural;

  // Safe camera stopper
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setContinuousScan(false);
  }, []);

  // Robust camera starter: attempts ideal constraints, then gracefully falls back to basic video
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setUploadedPreview(null);

    let stream: MediaStream | null = null;

    try {
      // 1. Try high-definition user camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
    } catch {
      try {
        // 2. Fallback to generic video (works on virtual cameras, USB webcams, etc.)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err: any) {
        console.warn('Camera access denied or device not found:', err);
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please allow camera access in your browser address bar.'
            : 'Webcam device not found. You can drag and drop a selfie photo or video on the right!'
        );
        setCameraActive(false);
        setCameraLoading(false);
        return;
      }
    }

    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
        setCameraActive(true);
        soundEngine.playScanSweep();
      } catch (e) {
        console.error('Video play error:', e);
      }
    }
    setCameraLoading(false);
  }, []);

  // Auto-start camera on component mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture frame and send to real YOLOv11 backend
  const captureAndAnalyze = useCallback(() => {
    soundEngine.playScanSweep();

    // 1. If camera is live, grab exact video frame
    if (cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onDetectFrame({ imageBase64: dataUrl, mimeType: 'image/jpeg' });
        return;
      }
    }

    // 2. If camera is not active, try starting it instead of sending empty payload
    if (!cameraActive && !uploadedPreview) {
      startCamera();
      return;
    }
  }, [cameraActive, uploadedPreview, onDetectFrame, startCamera]);

  // Continuous auto-scan timer
  useEffect(() => {
    if (!continuousScan || !cameraActive || isScanning) return;
    const interval = window.setInterval(() => {
      if (cameraActive && !isScanning) {
        captureAndAnalyze();
      }
    }, 2400);
    return () => window.clearInterval(interval);
  }, [continuousScan, cameraActive, isScanning, captureAndAnalyze]);

  // Draw face bounding boxes on overlay canvas whenever detection changes
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions matching display size
    canvas.width = video.clientWidth || 640;
    canvas.height = video.clientHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (lastDetection && lastDetection.boxes && lastDetection.boxes.length > 0) {
      const sourceWidth = video.videoWidth || 640;
      const sourceHeight = video.videoHeight || 480;
      const scaleX = canvas.width / sourceWidth;
      const scaleY = canvas.height / sourceHeight;

      lastDetection.boxes.forEach((box: any) => {
        let x1: number, y1: number, x2: number, y2: number, conf: number, label: string;

        if (Array.isArray(box)) {
          [x1, y1, x2, y2, conf, label] = box;
        } else {
          ({ x1, y1, x2, y2, conf, label } = box);
        }

        const normKey = label === 'surprised' ? 'surprise' : (label as EmotionKey);
        const token = EMOTION_TOKENS[normKey] || activeToken;

        // Bounding box coordinates with optional mirror adjust
        let drawX = x1 * scaleX;
        let drawW = (x2 - x1) * scaleX;
        if (mirrored) {
          drawX = canvas.width - (x2 * scaleX);
        }
        const drawY = y1 * scaleY;
        const drawH = (y2 - y1) * scaleY;

        // Draw bounding box
        ctx.strokeStyle = token.hex;
        ctx.lineWidth = 3;
        ctx.shadowColor = token.hex;
        ctx.shadowBlur = 12;
        ctx.strokeRect(drawX, drawY, drawW, drawH);
        ctx.shadowBlur = 0;

        // Tag badge background
        const tagText = `${token.label.toUpperCase()} ${typeof conf === 'number' ? conf.toFixed(0) : ''}%`;
        ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
        const textMetrics = ctx.measureText(tagText);
        const badgeW = textMetrics.width + 12;
        const badgeH = 22;

        ctx.fillStyle = token.hex;
        ctx.fillRect(drawX, Math.max(0, drawY - badgeH), badgeW, badgeH);

        // Tag text
        ctx.fillStyle = '#07090e';
        ctx.fillText(tagText, drawX + 6, Math.max(15, drawY - 6));
      });
    }
  }, [lastDetection, activeToken, mirrored]);

  // Handle uploaded file (image or video)
  const processFile = useCallback(
    (file: File) => {
      stopCamera();
      setCameraError(null);
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        setCameraError('Please drop a valid image (JPG, PNG, WEBP) or video (MP4, WEBM).');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setUploadedPreview({
        url: objectUrl,
        type: isVideo ? 'video' : 'image',
        name: file.name,
      });

      soundEngine.playScanSweep();

      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          onDetectFrame({ imageBase64: base64, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      } else {
        const tempVideo = document.createElement('video');
        tempVideo.src = objectUrl;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.currentTime = 0.5;
        tempVideo.onloadeddata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || 640;
          canvas.height = tempVideo.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            onDetectFrame({ imageBase64: dataUrl, mimeType: 'image/jpeg' });
          }
        };
      }
    },
    [onDetectFrame, stopCamera]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Left 7 Cols: Live Biometric Webcam HUD & Reticle Overlay */}
      <TiltCard
        glowColor={activeToken.rgb}
        intensity={4}
        className="lg:col-span-7 p-5 flex flex-col justify-between"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <span>📷</span>
              Live Affective Optical Scanner
            </h2>
            <p className="text-xs text-slate-400">
              YOLOv11 neural inference for micro-expression detection
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mirror Toggle */}
            {cameraActive && (
              <button
                type="button"
                onClick={() => setMirrored((m) => !m)}
                title="Mirror Camera View"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Continuous Scan Toggle */}
            {cameraActive && (
              <button
                type="button"
                onClick={() => setContinuousScan((c) => !c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  continuousScan
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-lg shadow-cyan-500/20 animate-pulse'
                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {continuousScan ? 'Auto-Scan ON' : 'Auto-Scan OFF'}
              </button>
            )}

            {/* Camera Enable/Stop */}
            {!cameraActive ? (
              <RippleButton
                onClick={startCamera}
                disabled={cameraLoading}
                accentColor={`rgba(${activeToken.rgb}, 0.5)`}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                {cameraLoading ? 'Starting...' : 'Enable Webcam'}
              </RippleButton>
            ) : (
              <RippleButton
                onClick={stopCamera}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Stop Feed
              </RippleButton>
            )}

            {/* Scan Expression Button */}
            <RippleButton
              onClick={captureAndAnalyze}
              disabled={isScanning}
              accentColor={`rgba(${activeToken.rgb}, 0.65)`}
              style={{
                backgroundColor: activeToken.hex,
                color: '#07090e',
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold hover:brightness-110 flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 shadow-lg"
            >
              {isScanning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ScanLine className="w-3.5 h-3.5" />
              )}
              {isScanning ? 'Inferencing...' : 'Scan Expression'}
            </RippleButton>
          </div>
        </div>

        {/* Viewport Frame with Targeting Reticle HUD & Laser Scanner */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#06080d] border border-white/10 flex items-center justify-center shadow-inner">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : 'scale-x-1'} ${
              cameraActive ? 'block' : 'hidden'
            }`}
          />

          {/* Bounding Box Overlay Canvas */}
          <canvas
            ref={overlayCanvasRef}
            className={`absolute inset-0 pointer-events-none z-10 ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Uploaded File Preview */}
          {!cameraActive && uploadedPreview && (
            <div className="w-full h-full relative">
              {uploadedPreview.type === 'image' ? (
                <img
                  src={uploadedPreview.url}
                  alt={uploadedPreview.name}
                  className="w-full h-full object-contain bg-black/60"
                />
              ) : (
                <video
                  src={uploadedPreview.url}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-contain bg-black/60"
                />
              )}
            </div>
          )}

          {/* Standby / Error Placeholder */}
          {!cameraActive && !uploadedPreview && (
            <div className="text-center px-6 max-w-md z-10">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-white/15"
                style={{ backgroundColor: `rgba(${activeToken.rgb}, 0.12)` }}
              >
                <Camera className="w-6 h-6" style={{ color: activeToken.hex }} />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Camera Feed Standby
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {cameraError ||
                  'Click "Enable Webcam" above to initialize your camera, or drag and drop a portrait picture on the right.'}
              </p>
              <RippleButton
                onClick={startCamera}
                style={{ backgroundColor: activeToken.hex, color: '#07090e' }}
                className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Connect Live Webcam
              </RippleButton>
            </div>
          )}

          {/* Targeting Reticle HUD Overlay */}
          <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between z-20">
            {/* Top HUD Corners & Readout */}
            <div className="flex items-start justify-between">
              <div
                className="w-7 h-7 border-t-2 border-l-2 rounded-tl-md transition-colors duration-300"
                style={{ borderColor: activeToken.hex }}
              />
              <div className="px-3 py-1 rounded bg-[#07090e]/85 border border-white/10 text-[11px] font-mono tabular-nums text-slate-300 flex items-center gap-2">
                {cameraActive ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> LIVE CAMERA
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertCircle className="w-3 h-3" /> STANDBY
                  </span>
                )}
                <span className="text-slate-600">·</span>
                <span>AFFECT: {activeToken.label.toUpperCase()}</span>
                <span className="text-slate-600">·</span>
                <span style={{ color: activeToken.hex }}>{activeToken.frequencyHz} Hz</span>
              </div>
              <div
                className="w-7 h-7 border-t-2 border-r-2 rounded-tr-md transition-colors duration-300"
                style={{ borderColor: activeToken.hex }}
              />
            </div>

            {/* Center Targeting Crosshair Reticle */}
            <div className="relative mx-auto my-auto w-40 h-40 flex items-center justify-center opacity-60">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{ color: activeToken.hex }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="8 6"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeOpacity="0.5"
                />
                <path
                  d="M100 15 V32 M100 168 V185 M15 100 H32 M168 100 H185"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="3" fill="currentColor" />
              </svg>
            </div>

            {/* Bottom HUD Corners */}
            <div className="flex items-end justify-between">
              <div
                className="w-7 h-7 border-b-2 border-l-2 rounded-bl-md transition-colors duration-300"
                style={{ borderColor: activeToken.hex }}
              />
              <div className="text-[11px] font-mono tabular-nums text-slate-300 bg-[#07090e]/85 px-3 py-1 rounded border border-white/10 flex items-center gap-2">
                <span>
                  {lastDetection?.has_face === false
                    ? '⚠️ NO FACE IN FRAME'
                    : `DETECTED: ${lastDetection?.face_count ?? 1} FACE(S)`}
                </span>
                <span className="text-slate-600">·</span>
                <span style={{ color: activeToken.hex }}>
                  CONFIDENCE: {lastDetection?.confidence?.toFixed(1) ?? '90'}%
                </span>
              </div>
              <div
                className="w-7 h-7 border-b-2 border-r-2 rounded-br-md transition-colors duration-300"
                style={{ borderColor: activeToken.hex }}
              />
            </div>
          </div>

          {/* Animated Laser Scanner Line */}
          <div
            className="pointer-events-none absolute inset-x-0 h-0.5 animate-[laserSweep_3.2s_ease-in-out_infinite] z-20"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${activeToken.hex} 50%, transparent 100%)`,
              boxShadow: `0 0 16px 2px ${activeToken.hex}`,
            }}
          />
        </div>

        {/* Instant Biometric Emotion Calibration Presets */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: activeToken.hex }} />
              Test All 9 Trained YOLOv11 Emotion Classes:
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Active: {activeToken.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOTION_LIST.map((item) => {
              const isSelected = item.key === activeEmotion || (item.key === 'surprise' && activeEmotion === 'surprised');
              return (
                <RippleButton
                  key={item.key}
                  soundFreq={item.frequencyHz}
                  accentColor={`rgba(${item.rgb}, 0.5)`}
                  onClick={() => onDetectFrame({ presetEmotion: item.key })}
                  style={{
                    borderColor: isSelected ? item.hex : 'rgba(255,255,255,0.1)',
                    backgroundColor: isSelected
                      ? `rgba(${item.rgb}, 0.22)`
                      : 'rgba(255,255,255,0.03)',
                  }}
                  className="px-2.5 py-1.5 rounded-lg border text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span>{item.label}</span>
                </RippleButton>
              );
            })}
          </div>
        </div>
      </TiltCard>

      {/* Right 5 Cols: Animated Dashed Drag-and-Drop Image/Video Dropzone */}
      <TiltCard
        glowColor={activeToken.rgb}
        intensity={5}
        className="lg:col-span-5 p-5 flex flex-col justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <Upload className="w-4 h-4" style={{ color: activeToken.hex }} />
            Media Dropzone Analyzer
          </h2>
          <p className="text-xs text-slate-400">
            Upload any selfie photo or short video clip for instant neural inference
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            borderColor: isDragging ? activeToken.hex : 'rgba(255, 255, 255, 0.22)',
            backgroundColor: isDragging
              ? `rgba(${activeToken.rgb}, 0.12)`
              : 'rgba(10, 14, 23, 0.65)',
          }}
          className="my-4 flex-1 min-h-[220px] rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 text-center group shadow-inner"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />

          <div
            className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center border border-white/15 transition-transform duration-200 group-hover:scale-110 shadow-lg"
            style={{ backgroundColor: `rgba(${activeToken.rgb}, 0.16)` }}
          >
            <Upload className="w-5 h-5" style={{ color: activeToken.hex }} />
          </div>

          <p className="text-sm font-semibold text-white mb-1">
            Drop Portrait Photo or Video
          </p>
          <p className="text-xs text-slate-400 max-w-xs mb-3">
            Supports JPG, PNG, WEBP, MP4, and WEBM. Instantly analyzed via YOLOv11.
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              High-Res Image
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <FileVideo className="w-3.5 h-3.5 text-purple-400" />
              Video Analysis
            </span>
          </div>
        </div>

        {/* Active Biometric Summary Footer */}
        <div className="rounded-xl bg-[#07090e]/95 border border-white/10 p-3.5 shadow-lg">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: activeToken.hex }} />
              Dominant Affect Observation
            </span>
            <span
              className="font-mono font-bold tabular-nums"
              style={{ color: activeToken.hex }}
            >
              {activeToken.label} ({lastDetection?.confidence?.toFixed(1) ?? '90'}%)
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lastDetection?.insight || activeToken.tagline}
          </p>
        </div>
      </TiltCard>
    </div>
  );
};
