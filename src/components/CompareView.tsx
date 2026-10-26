import React, { useState } from 'react';
import { Turntable360Viewer } from './Turntable360Viewer.tsx';
import { SpinFrame, SizeFitResult } from '../types/tryon.ts';
import { Columns, ArrowLeftRight } from 'lucide-react';

interface CompareViewProps {
  availableSizes: string[];
  sizeFitResults: SizeFitResult[];
  framesBySize: Record<string, SpinFrame[]>;
  initialSizeA?: string;
  initialSizeB?: string;
  onClose: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  availableSizes,
  sizeFitResults,
  framesBySize,
  initialSizeA = 'M',
  initialSizeB = 'L',
  onClose,
}) => {
  const [sizeA, setSizeA] = useState<string>(initialSizeA);
  const [sizeB, setSizeB] = useState<string>(initialSizeB);
  const [sharedAngle, setSharedAngle] = useState<number>(0);

  const resultA = sizeFitResults.find((r) => r.size === sizeA);
  const resultB = sizeFitResults.find((r) => r.size === sizeB);

  const framesA = framesBySize[sizeA] || [];
  const framesB = framesBySize[sizeB] || [];

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Compare Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Side-by-Side Size Comparison</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized 360° rotation — inspect drape, hem length, and silhouette differences simultaneously.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Exit Compare Mode
        </button>
      </div>

      {/* Selectors for Size A and Size B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Size A Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Size 1:</label>
            <div className="flex items-center gap-1">
              {availableSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSizeA(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    sizeA === s
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Turntable360Viewer
            frames={framesA}
            sizeLabel={sizeA}
            sizeFitResult={resultA}
            syncAngle={sharedAngle}
            onAngleChange={(ang) => setSharedAngle(ang)}
          />

          {resultA && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 tabular-nums">
              <div className="flex justify-between font-semibold">
                <span>Overall:</span>
                <span className="capitalize">{resultA.overallCategory}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Chest Ease:</span>
                <span>{resultA.chest.ease > 0 ? `+${resultA.chest.ease}` : resultA.chest.ease} cm</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Waist Ease:</span>
                <span>{resultA.waist.ease > 0 ? `+${resultA.waist.ease}` : resultA.waist.ease} cm</span>
              </div>
            </div>
          )}
        </div>

        {/* Size B Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Size 2:</label>
            <div className="flex items-center gap-1">
              {availableSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSizeB(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    sizeB === s
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Turntable360Viewer
            frames={framesB}
            sizeLabel={sizeB}
            sizeFitResult={resultB}
            syncAngle={sharedAngle}
            onAngleChange={(ang) => setSharedAngle(ang)}
          />

          {resultB && (
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 tabular-nums">
              <div className="flex justify-between font-semibold">
                <span>Overall:</span>
                <span className="capitalize">{resultB.overallCategory}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Chest Ease:</span>
                <span>{resultB.chest.ease > 0 ? `+${resultB.chest.ease}` : resultB.chest.ease} cm</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Waist Ease:</span>
                <span>{resultB.waist.ease > 0 ? `+${resultB.waist.ease}` : resultB.waist.ease} cm</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
