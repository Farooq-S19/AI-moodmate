import React, { useState } from 'react';
import {
  PartyPopper,
  Activity,
  Wind,
  Music,
  Sliders,
  Send,
  Download,
  FileText,
  Sparkles,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { DetectionResult, EMOTION_LIST, EMOTION_TOKENS, EmotionKey } from '../types/mood';
import { RippleButton, TiltCard } from './InteractiveUI';
import { soundEngine } from '../utils/sound';

interface SpectrumPanelProps {
  detection: DetectionResult;
  onSelectEmotion: (emotion: EmotionKey) => void;
  onTriggerConfetti: () => void;
  onNavigateTab: (tab: 'wellness') => void;
}

export const SpectrumPanel: React.FC<SpectrumPanelProps> = ({
  detection,
  onSelectEmotion,
  onTriggerConfetti,
  onNavigateTab,
}) => {
  const dominantToken = EMOTION_TOKENS[detection.dominant] || EMOTION_TOKENS.natural;

  // Text sentiment state
  const [journalText, setJournalText] = useState('');
  const [analyzedFeedback, setAnalyzedFeedback] = useState<string | null>(null);

  // Analyze free-form text input
  const handleAnalyzeText = () => {
    if (!journalText.trim()) return;
    soundEngine.playClick(560);

    const txt = journalText.toLowerCase();
    let detectedMood: EmotionKey = 'natural';

    if (/(happy|great|excited|awesome|good|love|grateful|joy|blessed|proud)/.test(txt)) {
      detectedMood = 'happy';
    } else if (/(sad|down|cry|depressed|unhappy|lonely|heartbroken|grief|blue)/.test(txt)) {
      detectedMood = 'sad';
    } else if (/(angry|mad|furious|irritated|hate|annoyed|frustrated|pissed)/.test(txt)) {
      detectedMood = 'angry';
    } else if (/(fear|anxious|scared|nervous|worry|panic|dread|frightened)/.test(txt)) {
      detectedMood = 'fear';
    } else if (/(tired|sleepy|exhausted|drained|weary|fatigued|drowsy)/.test(txt)) {
      detectedMood = 'sleepy';
    } else if (/(wow|surprised|shocked|amazed|unbelievable|astonished)/.test(txt)) {
      detectedMood = 'surprise';
    } else if (/(disgust|gross|nasty|repulsed|sick)/.test(txt)) {
      detectedMood = 'disgust';
    }

    onSelectEmotion(detectedMood);
    setAnalyzedFeedback(
      `Sentiment mapped to "${EMOTION_TOKENS[detectedMood].label}" based on keyword valence and affective tone.`
    );
  };

  // Export CSV Report
  const handleExportCSV = () => {
    soundEngine.playClick(600);
    const headers = ['Timestamp', 'Dominant Emotion', 'Confidence (%)', 'Valence', 'Arousal', 'Insight'];
    const row = [
      new Date().toISOString(),
      dominantToken.label,
      detection.confidence.toFixed(1),
      detection.valence,
      detection.arousal,
      `"${detection.insight.replace(/"/g, '""')}"`,
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MoodMate_Session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Export Printable HTML/PDF Report
  const handleExportReport = () => {
    soundEngine.playClick(640);
    const win = window.open('', '_blank');
    if (!win) return;

    const spectrumRows = EMOTION_LIST.map((token) => {
      const pct = Number(detection.spectrum[token.key] ?? 0);
      return `<tr>
        <td style="padding: 8px 12px; font-weight: 600; color: ${token.hex};">${token.label}</td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${pct.toFixed(1)}%</td>
      </tr>`;
    }).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI MoodMate - Clinical Session Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #07090e; color: #f1f5f9; padding: 40px; margin: 0; }
          .card { max-width: 650px; margin: 0 auto; background: #0e121b; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
          h1 { color: #8B5CF6; font-size: 24px; margin-top: 0; margin-bottom: 4px; }
          .date { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(245,158,11,0.15); color: #F59E0B; font-weight: 700; font-size: 16px; border: 1px solid #F59E0B; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
          tr:nth-child(even) { background: rgba(255,255,255,0.03); }
          .footer { margin-top: 24px; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; text-align: center; }
          @media print { body { background: #ffffff; color: #000000; padding: 20px; } .card { border: 1px solid #ccc; box-shadow: none; background: #fff; } }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🧠 AI MoodMate - Biometric Telemetry Report</h1>
          <div class="date">Recorded: ${new Date().toLocaleString()} · Neural Engine YOLOv11</div>
          
          <div class="badge" style="color: ${dominantToken.hex}; border-color: ${dominantToken.hex};">
            Dominant Affect: ${dominantToken.label} (${detection.confidence.toFixed(1)}%)
          </div>

          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            <b>Biometric Observation:</b> ${detection.insight}
          </p>

          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">9-Class Emotion Spectrum</h3>
          <table>
            ${spectrumRows}
          </table>

          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #94a3b8; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px;">
            <div>Affective Valence: <b>${detection.valence}%</b></div>
            <div>Autonomic Arousal: <b>${detection.arousal}%</b></div>
          </div>

          <div class="footer">
            Generated via AI MoodMate • Clinical Affective Computing System
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Grid: Real-Time 9-Class Emotion Spectrum Bars + Dominant Insight Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: 9-Class Real-Time Emotion Spectrum Horizontal Bars */}
        <TiltCard
          glowColor={dominantToken.rgb}
          intensity={4}
          className="lg:col-span-7 p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                <span>📊</span> Real-Time 9-Class Emotion Spectrum
              </h2>
              <p className="text-xs text-slate-400">
                Click any emotion bar to shift the 3D Neural Gyroscope & ambient aura
              </p>
            </div>
            <RippleButton
              onClick={onTriggerConfetti}
              accentColor={`rgba(${dominantToken.rgb}, 0.55)`}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-slate-100 border border-white/15 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <PartyPopper className="w-3.5 h-3.5" style={{ color: dominantToken.hex }} />
              Celebrate State
            </RippleButton>
          </div>

          <div className="space-y-2.5">
            {EMOTION_LIST.map((token) => {
              const pct = Number(detection.spectrum[token.key] ?? 0);
              const isDominant = detection.dominant === token.key;

              return (
                <button
                  key={token.key}
                  type="button"
                  onClick={() => onSelectEmotion(token.key)}
                  className="w-full text-left group focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-lg p-1.5 -mx-1.5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: token.hex }}
                      />
                      <span
                        className={`font-medium ${
                          isDominant ? 'text-white font-semibold' : 'text-slate-300'
                        }`}
                      >
                        {token.label}
                      </span>
                      <span className="text-slate-500" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-400">{token.colorName}</span>
                    </div>
                    <div className="font-mono tabular-nums text-xs flex items-center gap-2">
                      <span className="text-slate-500">{token.frequencyHz} Hz</span>
                      <span
                        className={isDominant ? 'font-semibold text-white' : 'text-slate-300'}
                        style={isDominant ? { color: token.hex } : undefined}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Track using transform scaleX */}
                  <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden p-[1px]">
                    <div
                      className="h-full rounded-full origin-left transition-transform duration-500 ease-out"
                      style={{
                        transform: `scaleX(${Math.max(pct / 100, 0.02)})`,
                        background: `linear-gradient(90deg, ${token.hex} 0%, ${token.secondaryHex} 100%)`,
                        boxShadow: isDominant ? `0 0 12px ${token.hex}` : 'none',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </TiltCard>

        {/* Right 5 Cols: Dominant Biometric Insight & Valence/Arousal Telemetry */}
        <TiltCard
          glowColor={dominantToken.rgb}
          intensity={5}
          className="lg:col-span-5 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Dominant Classification</span>
              <span className="font-mono tabular-nums">
                {new Date(detection.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <h3
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: dominantToken.hex }}
                >
                  {dominantToken.label}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {dominantToken.colorName} · {dominantToken.frequencyHz} Hz Harmonic
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold tabular-nums text-white">
                  {detection.confidence.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400">Confidence</div>
              </div>
            </div>

            {/* Clinical Affective Insight */}
            <div className="py-4 border-b border-white/10">
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" style={{ color: dominantToken.hex }} />
                Biometric & Ocular Synthesis
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {detection.insight}
              </p>
            </div>

            {/* Valence & Arousal Coordinates */}
            <div className="py-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#07090e]/85 border border-white/10 p-3">
                <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                  <span>Affective Valence</span>
                  <Sliders className="w-3 h-3 text-slate-500" />
                </div>
                <div className="text-lg font-mono font-bold tabular-nums text-white">
                  {detection.valence}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full origin-left transition-transform duration-500"
                    style={{
                      transform: `scaleX(${detection.valence / 100})`,
                      backgroundColor: dominantToken.hex,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#07090e]/85 border border-white/10 p-3">
                <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                  <span>Autonomic Arousal</span>
                  <Activity className="w-3 h-3 text-slate-500" />
                </div>
                <div className="text-lg font-mono font-bold tabular-nums text-white">
                  {detection.arousal}%
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full origin-left transition-transform duration-500"
                    style={{
                      transform: `scaleX(${detection.arousal / 100})`,
                      backgroundColor: dominantToken.secondaryHex,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Wellness Actions */}
          <div className="pt-2 flex items-center gap-3">
            <RippleButton
              onClick={() => onNavigateTab('wellness')}
              accentColor={`rgba(${dominantToken.rgb}, 0.6)`}
              style={{
                backgroundColor: dominantToken.hex,
                color: '#07090e',
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 hover:brightness-110"
            >
              <Wind className="w-4 h-4" />
              Launch Breathing Pacer
            </RippleButton>
            <RippleButton
              onClick={() => onNavigateTab('wellness')}
              className="py-2.5 px-4 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Music className="w-4 h-4" style={{ color: dominantToken.hex }} />
              Playlists
            </RippleButton>
          </div>
        </TiltCard>
      </div>

      {/* Bottom Grid: Text Sentiment Mood Journaling + 1-Click Export Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Text Mood Journal & Sentiment Analyzer */}
        <TiltCard
          glowColor={dominantToken.rgb}
          intensity={4}
          className="lg:col-span-7 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Express in Words (Affective Sentiment Analyzer)
              </h3>
              <span className="text-[11px] font-mono text-slate-400">NLP Keyword Engine</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Type how you're feeling right now to pair linguistic sentiment with your facial telemetry.
            </p>

            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="e.g. Feeling grateful for a productive morning, but a bit tired from late meetings..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[#06080d] border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-purple-400 transition-colors resize-none placeholder:text-slate-600 shadow-inner"
            />

            {analyzedFeedback && (
              <div className="mt-2 text-xs text-cyan-300 flex items-center gap-1.5 bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{analyzedFeedback}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            {/* Quick Sentiment Tags */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setJournalText('I am feeling so joyful, energized, and grateful today!');
                  onSelectEmotion('happy');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400 text-[11px] text-amber-300 transition-colors"
              >
                ⚡ Energized
              </button>
              <button
                type="button"
                onClick={() => {
                  setJournalText('Feeling calm, centered, and peaceful right now.');
                  onSelectEmotion('natural');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 text-[11px] text-cyan-300 transition-colors"
              >
                🫧 Calm
              </button>
              <button
                type="button"
                onClick={() => {
                  setJournalText('Feeling exhausted, sleepy, and ready to rest.');
                  onSelectEmotion('sleepy');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-purple-400 text-[11px] text-purple-300 transition-colors"
              >
                🌙 Worn Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setJournalText('Feeling anxious and worried about my workload.');
                  onSelectEmotion('fear');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-violet-400 text-[11px] text-violet-300 transition-colors"
              >
                🌪️ Stressed
              </button>
            </div>

            <RippleButton
              onClick={handleAnalyzeText}
              disabled={!journalText.trim()}
              style={{ backgroundColor: dominantToken.hex, color: '#07090e' }}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Analyze Sentiment
            </RippleButton>
          </div>
        </TiltCard>

        {/* Right 5 Cols: 1-Click Export & Session Documentation */}
        <TiltCard
          glowColor={dominantToken.rgb}
          intensity={4}
          className="lg:col-span-5 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Session Documentation & Export
              </h3>
              <span className="text-[11px] font-mono text-slate-400">PDF / CSV</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Export an official clinical summary of your biometric affect session including the full 9-class spectrum breakdown, valence/arousal coordinates, and recommended breath protocols.
            </p>

            <div className="rounded-xl bg-[#06080d] p-3 border border-white/10 text-xs space-y-1.5 mb-4 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Session ID:</span>
                <span>MM-{Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dominant Affect:</span>
                <span style={{ color: dominantToken.hex }}>{dominantToken.label} ({detection.confidence.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valence / Arousal:</span>
                <span>{detection.valence}% / {detection.arousal}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RippleButton
              onClick={handleExportReport}
              style={{ backgroundColor: dominantToken.hex, color: '#07090e' }}
              className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              Print / Save PDF Report
            </RippleButton>

            <RippleButton
              onClick={handleExportCSV}
              className="py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Export CSV
            </RippleButton>
          </div>
        </TiltCard>
      </div>
    </div>
  );
};
