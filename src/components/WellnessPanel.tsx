import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Music,
  BookOpen,
  PhoneCall,
  ExternalLink,
  X,
  Volume2,
  Check,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
  CRISIS_HOTLINES,
  CURATED_SOUNDSCAPES,
  EMOTION_TOKENS,
  EmotionKey,
  SoundscapeTrack,
  WELLNESS_READINGS,
} from '../types/mood';
import { RippleButton, TiltCard } from './InteractiveUI';
import { soundEngine } from '../utils/sound';

interface WellnessPanelProps {
  activeEmotion: EmotionKey;
  onBreathScaleChange: (scale: number) => void;
}

type BreathProtocolKey = 'coherent' | 'box' | 'relax478';

interface BreathProtocol {
  key: BreathProtocolKey;
  name: string;
  subtitle: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

const BREATH_PROTOCOLS: Record<BreathProtocolKey, BreathProtocol> = {
  coherent: {
    key: 'coherent',
    name: 'Coherent Resonance (5-5)',
    subtitle: 'Synchronizes heart rate variability (HRV) at 6 breaths/min',
    inhale: 5,
    holdIn: 0,
    exhale: 5,
    holdOut: 0,
  },
  box: {
    key: 'box',
    name: 'Tactical Box Breathing (4-4-4-4)',
    subtitle: 'Stabilizes vagal tone and sharpens prefrontal executive focus',
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
  },
  relax478: {
    key: 'relax478',
    name: 'Parasympathetic Reset (4-7-8)',
    subtitle: 'Rapidly decelerates sympathetic arousal and prepares for deep rest',
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
  },
};

export const WellnessPanel: React.FC<WellnessPanelProps> = ({
  activeEmotion,
  onBreathScaleChange,
}) => {
  const normKey = activeEmotion === 'surprised' ? 'surprise' : activeEmotion;
  const activeToken = EMOTION_TOKENS[normKey] || EMOTION_TOKENS.natural;

  const [protocolKey, setProtocolKey] = useState<BreathProtocolKey>(
    activeToken.recommendedBreath
  );
  const [isBreathing, setIsBreathing] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState<'Ready' | 'Inhale' | 'Hold' | 'Exhale'>('Ready');
  const [secondsLeft, setSecondsLeft] = useState<number>(
    BREATH_PROTOCOLS[activeToken.recommendedBreath].inhale
  );
  const [completedCycles, setCompletedCycles] = useState(0);

  // Music filter state
  const [selectedMusicFilter, setSelectedMusicFilter] = useState<string>('matched');
  const [activeTrack, setActiveTrack] = useState<SoundscapeTrack | null>(null);
  const [copiedHotlineId, setCopiedHotlineId] = useState<string | null>(null);

  const orbRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const scaleObjRef = useRef({ value: 1 });

  const protocol = BREATH_PROTOCOLS[protocolKey];

  const stopBreathing = useCallback(() => {
    setIsBreathing(false);
    setPhaseLabel('Ready');
    setSecondsLeft(protocol.inhale);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gsap.killTweensOf([orbRef.current, haloRef.current, scaleObjRef.current]);
    if (orbRef.current) {
      gsap.to(orbRef.current, { scale: 1, duration: 0.6, ease: 'power2.out' });
    }
    if (haloRef.current) {
      gsap.to(haloRef.current, { scale: 1, opacity: 0.35, duration: 0.6, ease: 'power2.out' });
    }
    onBreathScaleChange(1);
  }, [onBreathScaleChange, protocol.inhale]);

  // Update recommended protocol when active emotion changes (if not running)
  useEffect(() => {
    if (!isBreathing) {
      const rec = activeToken.recommendedBreath;
      setProtocolKey(rec);
      setSecondsLeft(BREATH_PROTOCOLS[rec].inhale);
    }
  }, [activeToken, isBreathing]);

  // Breathing timer and animation loop
  useEffect(() => {
    if (!isBreathing) return;

    let currentPhase: 'inhale' | 'holdIn' | 'exhale' | 'holdOut' = 'inhale';
    let counter = protocol.inhale;

    const triggerPhaseTween = (phase: typeof currentPhase, durationSec: number) => {
      if (phase === 'inhale') {
        setPhaseLabel('Inhale');
        soundEngine.playBreathCue('inhale');
        gsap.to(orbRef.current, {
          scale: 1.45,
          duration: durationSec,
          ease: 'sine.inOut',
        });
        gsap.to(haloRef.current, {
          scale: 1.75,
          opacity: 0.75,
          duration: durationSec,
          ease: 'sine.inOut',
        });
        gsap.to(scaleObjRef.current, {
          value: 1.35,
          duration: durationSec,
          ease: 'sine.inOut',
          onUpdate: () => onBreathScaleChange(scaleObjRef.current.value),
        });
      } else if (phase === 'holdIn' || phase === 'holdOut') {
        setPhaseLabel('Hold');
        soundEngine.playBreathCue('hold');
      } else if (phase === 'exhale') {
        setPhaseLabel('Exhale');
        soundEngine.playBreathCue('exhale');
        gsap.to(orbRef.current, {
          scale: 0.85,
          duration: durationSec,
          ease: 'sine.inOut',
        });
        gsap.to(haloRef.current, {
          scale: 0.90,
          opacity: 0.22,
          duration: durationSec,
          ease: 'sine.inOut',
        });
        gsap.to(scaleObjRef.current, {
          value: 0.85,
          duration: durationSec,
          ease: 'sine.inOut',
          onUpdate: () => onBreathScaleChange(scaleObjRef.current.value),
        });
      }
    };

    setSecondsLeft(counter);
    triggerPhaseTween('inhale', protocol.inhale);

    timerRef.current = window.setInterval(() => {
      counter -= 1;
      if (counter > 0) {
        setSecondsLeft(counter);
        return;
      }

      if (currentPhase === 'inhale') {
        if (protocol.holdIn > 0) {
          currentPhase = 'holdIn';
          counter = protocol.holdIn;
        } else {
          currentPhase = 'exhale';
          counter = protocol.exhale;
        }
      } else if (currentPhase === 'holdIn') {
        currentPhase = 'exhale';
        counter = protocol.exhale;
      } else if (currentPhase === 'exhale') {
        if (protocol.holdOut > 0) {
          currentPhase = 'holdOut';
          counter = protocol.holdOut;
        } else {
          currentPhase = 'inhale';
          counter = protocol.inhale;
          setCompletedCycles((c) => c + 1);
        }
      } else {
        currentPhase = 'inhale';
        counter = protocol.inhale;
        setCompletedCycles((c) => c + 1);
      }

      setSecondsLeft(counter);
      triggerPhaseTween(currentPhase, counter);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isBreathing, protocol, onBreathScaleChange]);

  const handleCopyHotline = (id: string, code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedHotlineId(id);
    window.setTimeout(() => setCopiedHotlineId(null), 2000);
  };

  // Filter soundscapes
  const displayedSoundscapes = CURATED_SOUNDSCAPES.filter((track) => {
    if (selectedMusicFilter === 'matched') {
      return track.emotion === normKey || track.emotion === activeEmotion;
    }
    if (selectedMusicFilter === 'all') return true;
    return track.emotion === selectedMusicFilter;
  });

  return (
    <div className="space-y-6">
      {/* Row 1: Guided Breathing Orb + Neuro-Acoustic Soundscapes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Cols: Interactive Guided Breathing Orb */}
        <TiltCard
          glowColor={activeToken.rgb}
          intensity={4}
          className="lg:col-span-5 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  <Wind className="w-4 h-4" style={{ color: activeToken.hex }} />
                  Guided Breathing Pacer
                </h2>
                <p className="text-xs text-slate-400">{protocol.subtitle}</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Cycles: {completedCycles}
              </span>
            </div>

            {/* Segmented Protocol Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#07090e] border border-white/10 mb-6">
              {(Object.keys(BREATH_PROTOCOLS) as BreathProtocolKey[]).map((key) => {
                const isSelected = protocolKey === key;
                const label =
                  key === 'coherent' ? '5-5 Coherent' : key === 'box' ? '4-4-4-4 Box' : '4-7-8 Relax';
                return (
                  <RippleButton
                    key={key}
                    onClick={() => {
                      stopBreathing();
                      setProtocolKey(key);
                      setSecondsLeft(BREATH_PROTOCOLS[key].inhale);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </RippleButton>
                );
              })}
            </div>
          </div>

          {/* Center GSAP Animated Breathing Orb */}
          <div className="relative my-6 h-56 flex items-center justify-center">
            {/* Outer Expanding Halo */}
            <div
              ref={haloRef}
              className="pointer-events-none absolute w-36 h-36 rounded-full opacity-35"
              style={{
                background: `radial-gradient(circle, ${activeToken.hex} 0%, transparent 72%)`,
              }}
            />

            {/* Main GSAP Breathing Sphere */}
            <div
              ref={orbRef}
              style={{
                borderColor: activeToken.hex,
                boxShadow: `0 0 40px -5px rgba(${activeToken.rgb}, 0.45), inset 0 0 24px rgba(${activeToken.rgb}, 0.35)`,
                background: `radial-gradient(circle at 35% 30%, rgba(${activeToken.rgb}, 0.45), rgba(12, 16, 24, 0.92) 75%)`,
              }}
              className="relative w-36 h-36 rounded-full border-2 flex flex-col items-center justify-center text-center select-none"
            >
              <span className="text-xs font-medium tracking-wide text-slate-300">
                {phaseLabel}
              </span>
              <span className="text-3xl font-mono font-bold tabular-nums text-white mt-0.5">
                {secondsLeft}s
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <RippleButton
              onClick={() => {
                if (isBreathing) {
                  stopBreathing();
                } else {
                  setIsBreathing(true);
                }
              }}
              accentColor={`rgba(${activeToken.rgb}, 0.6)`}
              style={{
                backgroundColor: isBreathing ? 'rgba(244, 63, 94, 0.2)' : activeToken.hex,
                color: isBreathing ? '#fda4af' : '#07090e',
                borderColor: isBreathing ? 'rgba(244, 63, 94, 0.4)' : 'transparent',
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
            >
              {isBreathing ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Breathing Session
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Guided Breathing
                </>
              )}
            </RippleButton>

            <RippleButton
              onClick={() => {
                stopBreathing();
                setCompletedCycles(0);
              }}
              aria-label="Reset breathing session"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
            >
              <RotateCcw className="w-4 h-4" />
            </RippleButton>
          </div>
        </TiltCard>

        {/* Right 7 Cols: Curated Music Player Cards with Working YouTube Embed */}
        <TiltCard
          glowColor={activeToken.rgb}
          intensity={4}
          className="lg:col-span-7 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                  <Music className="w-4 h-4" style={{ color: activeToken.hex }} />
                  Curated Music Therapy Picks
                </h2>
                <p className="text-xs text-slate-400">
                  5 hand-picked tracks per emotion tailored to harmonize your affective state
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {activeToken.frequencyHz} Hz Solfeggio
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
              <button
                type="button"
                onClick={() => setSelectedMusicFilter('matched')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedMusicFilter === 'matched'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ✨ Matched: {activeToken.label}
              </button>
              <button
                type="button"
                onClick={() => setSelectedMusicFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedMusicFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                All Tracks ({CURATED_SOUNDSCAPES.length})
              </button>
              {['happy', 'sad', 'angry', 'fear', 'natural', 'sleepy'].map((k) => {
                const tok = EMOTION_TOKENS[k as EmotionKey];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedMusicFilter(k)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      selectedMusicFilter === k
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tok.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {displayedSoundscapes.map((track) => {
              const token = EMOTION_TOKENS[track.emotion] || activeToken;
              const isMatched = track.emotion === normKey;
              const isPlaying = activeTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    soundEngine.playClick(token.frequencyHz);
                    setActiveTrack(track);
                  }}
                  style={{
                    borderColor: isMatched ? token.hex : 'rgba(255,255,255,0.1)',
                    backgroundColor: isMatched
                      ? `rgba(${token.rgb}, 0.12)`
                      : 'rgba(7, 9, 14, 0.85)',
                  }}
                  className="rounded-xl border p-3.5 cursor-pointer hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2.5 group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold" style={{ color: token.hex }}>
                        {token.label} · {track.bpm} BPM
                      </span>
                      <span className="font-mono tabular-nums">{track.duration}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                      {track.title}
                    </h3>
                    <p className="text-xs text-slate-300 truncate">{track.artist}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {track.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    {/* Animated Equalizer Bars */}
                    <div className="flex items-end gap-1 h-3.5">
                      {[0.4, 0.8, 0.55, 0.95, 0.5, 0.7].map((h, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: token.hex,
                            height: `${h * 100}%`,
                            animationDelay: `${i * 120}ms`,
                          }}
                          className={`w-1 rounded-full origin-bottom ${
                            isPlaying || isMatched
                              ? 'animate-[eqBounce_0.85s_ease-in-out_infinite]'
                              : 'opacity-40'
                          }`}
                        />
                      ))}
                    </div>

                    <span
                      className="text-xs font-semibold flex items-center gap-1.5"
                      style={{ color: token.hex }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isPlaying ? 'Playing Now' : 'Play Track'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </TiltCard>
      </div>

      {/* Row 2: Reading Links + 24/7 Crisis Hotline Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Curated Affective Neuroscience Readings */}
        <TiltCard
          glowColor={activeToken.rgb}
          intensity={3}
          className="lg:col-span-6 p-6 flex flex-col justify-between"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: activeToken.hex }} />
              Curated Affective Neuroscience Library
            </h2>
            <p className="text-xs text-slate-400">
              Evidence-based strategies for stress reduction, focus, and emotional stamina
            </p>
          </div>

          <div className="divide-y divide-white/10 max-h-[360px] overflow-y-auto pr-1">
            {WELLNESS_READINGS.map((item) => {
              const tagToken = EMOTION_TOKENS[item.targetEmotion] || activeToken;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => soundEngine.playClick(480)}
                  className="py-3 first:pt-0 last:pb-0 block group"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span style={{ color: tagToken.hex }} className="font-semibold">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.author}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.readTime}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {item.summary}
                  </p>
                </a>
              );
            })}
          </div>
        </TiltCard>

        {/* Right 6 Cols: 24/7 Mental Health Crisis Support Directory */}
        <TiltCard
          glowColor={activeToken.rgb}
          intensity={3}
          className="lg:col-span-6 p-6 flex flex-col justify-between"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-rose-400" />
              24/7 Free & Confidential Crisis Support Hotlines
            </h2>
            <p className="text-xs text-slate-400">
              Verified clinical support lines available anytime in India and internationally
            </p>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {CRISIS_HOTLINES.map((hotline) => {
              const isCopied = copiedHotlineId === hotline.id;
              return (
                <div
                  key={hotline.id}
                  className="rounded-xl bg-[#07090e]/95 border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-rose-300 font-semibold">{hotline.region}</span>
                      <span aria-hidden="true">·</span>
                      <span>{hotline.availability}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{hotline.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {hotline.description}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <RippleButton
                      onClick={() => handleCopyHotline(hotline.id, hotline.phoneOrCode)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {hotline.contactAction}
                        </>
                      )}
                    </RippleButton>
                    <a
                      href={hotline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </TiltCard>
      </div>

      {/* Embedded YouTube Player Modal with Equalizer */}
      {activeTrack && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveTrack(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-[#0b0f18] border border-white/20 overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Volume2
                  className="w-5 h-5"
                  style={{ color: (EMOTION_TOKENS[activeTrack.emotion] || activeToken).hex }}
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{activeTrack.title}</h3>
                  <p className="text-xs text-slate-400">
                    {activeTrack.artist} · {activeTrack.bpm} BPM
                  </p>
                </div>
              </div>
              <RippleButton
                onClick={() => setActiveTrack(null)}
                aria-label="Close music player modal"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300"
              >
                <X className="w-4 h-4" />
              </RippleButton>
            </div>

            {/* Embedded YouTube Iframe */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeTrack.youtubeId}?autoplay=1&rel=0`}
                title={activeTrack.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Live Equalizer Footer */}
            <div className="px-5 py-4 bg-[#07090e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-slate-300 max-w-md">{activeTrack.description}</p>
              <div className="flex items-end gap-1 h-6 shrink-0">
                {Array.from({ length: 16 }).map((_, idx) => {
                  const token = EMOTION_TOKENS[activeTrack.emotion] || activeToken;
                  return (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: token.hex,
                        height: `${30 + ((idx * 17) % 70)}%`,
                        animationDelay: `${idx * 70}ms`,
                      }}
                      className="w-1.5 rounded-full origin-bottom animate-[eqBounce_0.75s_ease-in-out_infinite]"
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
