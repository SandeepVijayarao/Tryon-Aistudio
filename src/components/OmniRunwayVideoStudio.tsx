import React, { useState } from 'react';
import {
  Film,
  Upload,
  Play,
  RotateCw,
  CheckCircle2,
  Sparkles,
  Download,
  AlertCircle,
} from 'lucide-react';
import { InteractionStepRecord } from '../utils/multiAgentOrchestrator.ts';

interface OmniRunwayVideoStudioProps {
  defaultImageUrl?: string;
  garmentName: string;
  trueSize: string;
}

const MOTION_PRESETS = [
  {
    id: 'runway-walk',
    label: 'Architectural Runway Walk',
    prompt:
      'The man in the tailored sand suit blazer steps forward smoothly on a minimalist architectural runway, natural studio lighting, subtle fabric drape and notched lapel motion as he turns.',
  },
  {
    id: 'turntable-360-spin',
    label: '360° Tailoring Inspection Turn',
    prompt:
      'Smooth 360-degree studio turntable rotation of the man wearing the tailored blazer and 5-piece outfit, showcasing clean shoulder seams, zero waist button pulling, and crisp double back vents.',
  },
  {
    id: 'sf-golden-hour',
    label: 'Shack15 SF Waterfront Golden Hour',
    prompt:
      'Cinematic golden hour shot at the San Francisco Ferry Building waterfront: the founder in the tailored blazer walks confidently toward the camera as a light breeze moves the lapel.',
  },
];

export const OmniRunwayVideoStudio: React.FC<OmniRunwayVideoStudioProps> = ({
  defaultImageUrl = '/src/assets/images/man_blazer_front_1792967532469.jpg',
  garmentName,
  trueSize,
}) => {
  const [sourceImageUrl, setSourceImageUrl] = useState<string>(defaultImageUrl);
  const [sourceLabel, setSourceLabel] = useState<string>(
    `360° Dressed Frame · ${garmentName} (Size ${trueSize})`
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<'5s' | '10s'>('5s');
  const [motionPrompt, setMotionPrompt] = useState<string>(MOTION_PRESETS[0].prompt);

  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [steps, setSteps] = useState<InteractionStepRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImageUrl(reader.result);
        setSourceLabel(`Uploaded Photo: ${file.name}`);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sourceImageUrl || !motionPrompt.trim()) return;

    setIsGeneratingVideo(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/generate-runway-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: sourceImageUrl,
          prompt: motionPrompt,
          aspectRatio,
          duration,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(
          data.error || 'Video generation encountered an issue. Verify GEMINI_API_KEY permissions.'
        );
      } else if (data.videoDataUrl) {
        setVideoDataUrl(data.videoDataUrl);
        setInteractionId(data.interactionId || null);
        setLatencyMs(data.latencyMs || null);
        setSteps(Array.isArray(data.steps) ? data.steps : []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while generating runway video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <section
      aria-label="Gemini Omni 1.1 Flash Image-to-Video Runway Studio"
      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded">
              <Film className="w-3 h-3 text-indigo-400" />
              Interactions API · gemini-omni-1.1-flash
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Animate Try-On Photo into Runway Video (`16:9` Landscape or `9:16` Portrait)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Upload any photo or use your dressed 360° studio frame to synthesize a runway motion
            clip via <code className="font-mono text-indigo-700">ai.interactions.create</code> with{' '}
            <code className="font-mono text-indigo-700">gemini-omni-1.1-flash</code>.
          </p>
        </div>

        {/* Aspect Ratio Selector (16:9 vs 9:16 required by guidelines) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAspectRatio('16:9')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              16:9 Landscape
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('9:16')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              9:16 Portrait
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDuration('5s')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                duration === '5s'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5s
            </button>
            <button
              type="button"
              onClick={() => setDuration('10s')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                duration === '10s'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10s
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5 Cols: Photo Upload / Source Frame + Motion Prompt Controls */}
        <form onSubmit={handleGenerateVideo} className="lg:col-span-6 space-y-3.5">
          {/* Source Image Picker & Upload */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="w-16 h-20 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
              <img
                src={sourceImageUrl}
                alt="Starting frame for video generation"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-bold text-slate-900 truncate">{sourceLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSourceImageUrl('/src/assets/images/man_blazer_front_1792967532469.jpg');
                    setSourceLabel(`360° Dressed Frame · ${garmentName} (Size ${trueSize})`);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Use Dressed Zara Blazer Frame
                </button>
              </div>
            </div>
          </div>

          {/* Motion Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Motion Direction Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MOTION_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMotionPrompt(p.prompt)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Motion Prompt Input */}
          <div className="space-y-1">
            <label
              htmlFor="omni-video-prompt"
              className="text-xs font-semibold text-slate-700 block"
            >
              Runway Motion Prompt (`gemini-omni-1.1-flash`):
            </label>
            <textarea
              id="omni-video-prompt"
              rows={3}
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              placeholder="Describe how the person and garment should move in the video..."
            />
          </div>

          <button
            type="submit"
            disabled={isGeneratingVideo}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGeneratingVideo ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>
                  Synthesizing {aspectRatio} Video with gemini-omni-1.1-flash...
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  Animate Photo into {aspectRatio} Video (`gemini-omni-1.1-flash`)
                </span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Omni Flash Video Status</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </form>

        {/* Right 6 Cols: Video Output Viewport & Interaction Telemetry */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl bg-slate-950 border border-slate-800 p-4 text-white min-h-[290px]">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <span className="font-mono text-indigo-300 font-semibold">
              Output Format: MP4 · {aspectRatio} · {duration} · 720p
            </span>
            {interactionId && (
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {interactionId} ({latencyMs}ms)
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {videoDataUrl ? (
              <div className="w-full flex flex-col items-center gap-3">
                <video
                  src={videoDataUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className={
                    aspectRatio === '9:16'
                      ? 'max-h-[340px] w-auto rounded-xl border border-slate-700'
                      : 'w-full max-h-[280px] rounded-xl border border-slate-700 object-contain'
                  }
                />
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="text-slate-400 font-mono">
                    Generated by gemini-omni-1.1-flash ({steps.length} interaction steps)
                  </span>
                  <a
                    href={videoDataUrl}
                    download={`tryon-omni-runway-${aspectRatio.replace(':', 'x')}.mp4`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-indigo-400">
                  <Film className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  Ready to Animate Starting Frame ({aspectRatio})
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select a photo on the left, choose <span className="text-white">16:9</span> or{' '}
                  <span className="text-white">9:16</span>, and click{' '}
                  <span className="text-indigo-300 font-semibold">Animate Photo into Video</span> to
                  invoke <code className="font-mono">gemini-omni-1.1-flash</code> via the
                  Interactions API.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
