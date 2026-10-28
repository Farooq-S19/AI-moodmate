import React, { useState, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  ScanLine,
  Layers,
  Camera as CameraIcon,
  Sparkles,
} from 'lucide-react';
import {
  DetectionResult,
  EMOTION_LIST,
  EMOTION_TOKENS,
  EmotionKey,
} from './types/mood';
import {
  CameraPreset,
  FinishMode,
  MoodCore3D,
} from './components/MoodCore3D';
import { ScannerPanel } from './components/ScannerPanel';
import { SpectrumPanel } from './components/SpectrumPanel';
import { WellnessPanel } from './components/WellnessPanel';
import { RippleButton } from './components/InteractiveUI';
import { soundEngine } from './utils/sound';

type WorkspaceTab = 'scanner' | 'spectrum' | 'wellness' | 'studio3d';

const INITIAL_DETECTION: DetectionResult = {
  source: 'biometric-engine',
  timestamp: new Date().toISOString(),
  dominant: 'natural',
  confidence: 78.4,
  spectrum: {
    happy: 9.2,
    sad: 2.1,
    angry: 1.0,
    fear: 1.4,
    natural: 78.4,
    sleepy: 3.5,
    surprise: 2.2,
    disgust: 0.8,
    contempt: 1.4,
  },
  insight:
    'Balanced facial symmetry and relaxed baseline muscle tone indicate calm, centered homeostatic equilibrium.',
  valence: 68,
  arousal: 42,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('scanner');
  const [detection, setDetection] = useState<DetectionResult>(INITIAL_DETECTION);
  const [isScanning, setIsScanning] = useState(false);

  // 3D Scene & Bottom Dock State
  const [explodedFactor, setExplodedFactor] = useState(0.15);
  const [finishMode, setFinishMode] = useState<FinishMode>('obsidian');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default');
  const [breathScale, setBreathScale] = useState(1);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  const activeEmotion = detection.dominant;
  const activeToken = EMOTION_TOKENS[activeEmotion] || EMOTION_TOKENS.natural;

  const fireConfettiBurst = useCallback((emotionKey: EmotionKey) => {
    const token = EMOTION_TOKENS[emotionKey] || EMOTION_TOKENS.happy;
    confetti({
      particleCount: 65,
      spread: 72,
      origin: { y: 0.65 },
      colors: [token.hex, token.secondaryHex, '#ffffff', '#fde047'],
    });
  }, []);

  const handleDetectFrame = useCallback(
    async (payload: {
      imageBase64?: string;
      mimeType?: string;
      presetEmotion?: EmotionKey;
    }) => {
      setIsScanning(true);
      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Network error');
        const data: DetectionResult = await res.json();
        setDetection(data);

        const domToken = EMOTION_TOKENS[data.dominant] || EMOTION_TOKENS.natural;
        soundEngine.playDetectionChime(domToken.frequencyHz);

        // Celebrate high-confidence positive detections
        if (
          (data.dominant === 'happy' ||
            data.dominant === 'surprise' ||
            data.dominant === 'natural') &&
          data.confidence >= 65
        ) {
          fireConfettiBurst(data.dominant);
        }
      } catch {
        // Offline client fallback
        const chosen: EmotionKey = payload.presetEmotion || 'happy';
        const fallbackSpectrum: Record<EmotionKey, number> = {
          happy: 4.2,
          sad: 2.1,
          angry: 1.5,
          fear: 1.8,
          natural: 6.4,
          sleepy: 3.0,
          surprise: 2.8,
          disgust: 0.9,
          contempt: 1.3,
        };
        fallbackSpectrum[chosen] = 76.0;
        setDetection({
          source: 'offline-client-simulation',
          timestamp: new Date().toISOString(),
          dominant: chosen,
          confidence: 76.0,
          spectrum: fallbackSpectrum,
          insight: EMOTION_TOKENS[chosen].tagline,
          valence: chosen === 'happy' ? 88 : 62,
          arousal: chosen === 'angry' ? 85 : 54,
        });
        soundEngine.playDetectionChime(EMOTION_TOKENS[chosen].frequencyHz);
      } finally {
        setIsScanning(false);
      }
    },
    [fireConfettiBurst]
  );

  // Keyboard shortcut 'H' to toggle Bottom Dock collapse
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen w-full text-slate-100 select-none overflow-x-hidden">
      {/* 1. Full-Bleed Three.js 3D Neural Gyroscope Viewport */}
      <MoodCore3D
        activeEmotion={activeEmotion}
        explodedFactor={explodedFactor}
        finishMode={finishMode}
        cameraPreset={cameraPreset}
        breathScale={breathScale}
        arousal={detection.arousal}
      />

      {/* 2. Dynamic Ambient Aura Overlay matching Active Emotion */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-700"
        style={{
          background: `radial-gradient(900px circle at 50% 24%, rgba(${activeToken.rgb}, 0.14), transparent 70%)`,
        }}
      />

      {/* 3. Strict 3-Zone Top Bar Contract (No backdrop-filter over WebGL) */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-4 bg-[#07090e]/92 border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('scanner');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          AI MoodMate
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(500);
              setActiveTab('scanner');
            }}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'scanner'
                ? 'text-white border-current'
                : 'border-transparent hover:text-slate-200'
            }`}
            style={activeTab === 'scanner' ? { borderColor: activeToken.hex } : undefined}
          >
            Biometric Scanner
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(540);
              setActiveTab('spectrum');
            }}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'spectrum'
                ? 'text-white border-current'
                : 'border-transparent hover:text-slate-200'
            }`}
            style={activeTab === 'spectrum' ? { borderColor: activeToken.hex } : undefined}
          >
            Emotion Spectrum
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(580);
              setActiveTab('wellness');
            }}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'wellness'
                ? 'text-white border-current'
                : 'border-transparent hover:text-slate-200'
            }`}
            style={activeTab === 'wellness' ? { borderColor: activeToken.hex } : undefined}
          >
            Wellness & Sound
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(620);
              setActiveTab('studio3d');
            }}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'studio3d'
                ? 'text-white border-current'
                : 'border-transparent hover:text-slate-200'
            }`}
            style={activeTab === 'studio3d' ? { borderColor: activeToken.hex } : undefined}
          >
            3D Core Studio
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <RippleButton
            onClick={() => handleDetectFrame({})}
            disabled={isScanning}
            accentColor={`rgba(${activeToken.rgb}, 0.65)`}
            style={{
              backgroundColor: activeToken.hex,
              color: '#07090e',
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg hover:brightness-110 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ScanLine className="w-3.5 h-3.5" />
            {isScanning ? 'Scanning...' : 'Quick Scan'}
          </RippleButton>
        </div>
      </header>

      {/* 4. Main Workspace Content Container */}
      <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-5 pb-36 pointer-events-none">
        {/* Top Context Banner */}
        <div className="pointer-events-auto mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0a0e17]/90 border border-white/10">
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="font-semibold text-white">
              Active State: <span style={{ color: activeToken.hex }}>{activeToken.label}</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              Confidence {detection.confidence.toFixed(1)}%
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">{activeToken.tagline}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setActiveTab(activeTab === 'studio3d' ? 'scanner' : 'studio3d')
              }
              className="text-xs font-medium text-slate-300 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              {activeTab === 'studio3d' ? 'Return to Panels' : 'Inspect 3D Core'}
            </button>
          </div>
        </div>

        {/* Conditional Tab Panels (in 'studio3d' mode, center viewport is 100% unobstructed) */}
        {activeTab === 'scanner' && (
          <div className="pointer-events-auto">
            <ScannerPanel
              activeEmotion={activeEmotion}
              isScanning={isScanning}
              lastDetection={detection}
              onDetectFrame={handleDetectFrame}
            />
          </div>
        )}

        {activeTab === 'spectrum' && (
          <div className="pointer-events-auto">
            <SpectrumPanel
              detection={detection}
              onSelectEmotion={(emo) => handleDetectFrame({ presetEmotion: emo })}
              onTriggerConfetti={() => fireConfettiBurst(activeEmotion)}
              onNavigateTab={(t) => setActiveTab(t)}
            />
          </div>
        )}

        {activeTab === 'wellness' && (
          <div className="pointer-events-auto">
            <WellnessPanel
              activeEmotion={activeEmotion}
              onBreathScaleChange={setBreathScale}
            />
          </div>
        )}

        {activeTab === 'studio3d' && (
          <div className="pointer-events-none h-[58vh] flex items-start justify-start">
            <div className="pointer-events-auto max-w-xs rounded-xl bg-[#0a0e17]/90 border border-white/10 p-3.5 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: activeToken.hex }} />
                3D Biometric Neural Gyroscope
              </div>
              <p className="text-slate-400 leading-relaxed">
                Drag anywhere to orbit, scroll to zoom, or use the bottom control dock to explode the 9-part assembly and switch surface finishes.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 5. Unified Collapsible Bottom Control Dock (Zero Viewport Flank Occlusion) */}
      <div
        style={{
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(940px, 94vw)',
        }}
        className="fixed z-30 w-full pointer-events-auto"
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(460);
              setDockCollapsed((prev) => !prev);
            }}
            className="px-3.5 py-1 rounded-full bg-[#0b0f18]/95 border border-white/15 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show 3D & Aura Controls (H)
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Hide Controls (H)
              </>
            )}
          </button>
        </div>

        {/* Dock Body */}
        <div
          className={`rounded-2xl bg-[#0a0e17]/95 border border-white/15 px-4 py-3 shadow-2xl transition-all duration-300 ${
            dockCollapsed
              ? 'opacity-0 translate-y-8 pointer-events-none h-0 py-0 overflow-hidden border-0'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Emotion Quick Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 mr-1 whitespace-nowrap">
                Aura:
              </span>
              {EMOTION_LIST.slice(0, 6).map((token) => {
                const isSelected = token.key === activeEmotion;
                return (
                  <button
                    key={token.key}
                    type="button"
                    title={`${token.label} (${token.colorName})`}
                    onClick={() => handleDetectFrame({ presetEmotion: token.key })}
                    style={{
                      backgroundColor: isSelected ? token.hex : 'rgba(255,255,255,0.06)',
                      color: isSelected ? '#07090e' : '#cbd5e1',
                      borderColor: isSelected ? token.hex : 'rgba(255,255,255,0.12)',
                    }}
                    className="px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    {token.label}
                  </button>
                );
              })}
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label
                htmlFor="exploded-slider"
                className="text-[11px] font-medium text-slate-400 whitespace-nowrap"
              >
                Explode 3D:
              </label>
              <input
                id="exploded-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                style={{ accentColor: activeToken.hex }}
                className="w-24 h-1.5 bg-white/15 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono tabular-nums text-slate-300 w-8">
                {Math.round(explodedFactor * 100)}%
              </span>
            </div>

            {/* 3D Material Finish Switcher */}
            <div className="flex items-center gap-1 bg-[#06080d] p-1 rounded-lg border border-white/10">
              {(['obsidian', 'gold', 'platinum', 'crystal'] as FinishMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(580);
                    setFinishMode(mode);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    finishMode === mode
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Camera Angle Presets & Audio Mute */}
            <div className="flex items-center gap-1.5">
              <CameraIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {(['default', 'closeup', 'topdown', 'cinematic'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(640);
                    setCameraPreset(preset);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === preset
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const nextMute = !audioMuted;
                  setAudioMuted(nextMute);
                  soundEngine.setMuted(nextMute);
                }}
                title={audioMuted ? 'Unmute UI Audio' : 'Mute UI Audio'}
                className="ml-1 p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
              >
                {audioMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" style={{ color: activeToken.hex }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
