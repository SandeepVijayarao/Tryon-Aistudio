import React from 'react';
import {
  RotateCw,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Settings,
  Cpu,
  Presentation,
} from 'lucide-react';
import { DEMO_PRESETS, DemoPreset } from '../utils/demoPresets.ts';
import { BodyMeasurements } from '../types/tryon.ts';

export type WorkspaceTab = 'home' | 'agents' | 'studio' | 'pitch' | 'settings';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  measurements?: BodyMeasurements;
  heightCm: number;
  fittedGarmentsCount: number;
  onSelectPreset: (preset: DemoPreset) => void;
  onReset: () => void;
  currentPresetId?: string;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  measurements,
  heightCm,
  fittedGarmentsCount,
  onSelectPreset,
  onReset,
  currentPresetId,
  isProcessing,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        {/* Left: Compact Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <RotateCw className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-slate-900">Tryon</h1>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-slate-600">
                  Argon 360° Fit &amp; Managed Agents
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden xl:block">
                Gemini 4 Argon · Three.js 3D World · Omni Video · Calibrate once &amp; fit in &lt;1ms
              </p>
            </div>
          </button>
        </div>

        {/* Center: Primary Navigation Tabs */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'home'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Home: Style &amp; Shop</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('agents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Cpu
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'agents' ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            />
            <span>Argon Swarm + 3D + Video</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('studio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>360° Fitting Studio</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('pitch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pitch'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Presentation
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'pitch' ? 'text-white' : 'text-amber-600'
              }`}
            />
            <span>Shack15 Pitch Deck</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Setup &amp; Settings</span>
          </button>
        </nav>

        {/* Right: Saved Body Profile Quick Access & Demo Presets */}
        <div className="flex items-center gap-2 shrink-0">
          {measurements && (
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              title="Open Settings to edit your uploaded photos or body measurements anytime"
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="font-semibold text-slate-800">My Fit:</span>
              <span className="text-slate-600 font-mono tabular-nums">
                {heightCm}cm · {measurements.chest}/{measurements.waist}/{measurements.hip}cm
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-emerald-700 font-mono tabular-nums font-medium">
                {fittedGarmentsCount} fitted
              </span>
            </button>
          )}

          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg border border-slate-200/70">
            {DEMO_PRESETS.map((preset, idx) => {
              const isActive = currentPresetId === preset.id;
              const shortLabel = idx === 0 ? 'Zara Blazer' : 'Overshirt';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  disabled={isProcessing}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={isProcessing}
            title="Reset to setup screen"
            aria-label="Reset all inputs"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
