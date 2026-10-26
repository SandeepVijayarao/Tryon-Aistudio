import React from 'react';
import {
  FitAnalysis,
  FitCategory,
} from '../types/tryon.ts';
import {
  AlertTriangle,
  Info,
  Columns,
  BadgeCheck,
  UserCheck,
  ShoppingBag,
} from 'lucide-react';

interface FitResultsCardProps {
  analysis: FitAnalysis;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  cachedSizes: string[];
  isComparing: boolean;
  onToggleCompare: () => void;
  onOpenBodyProfile?: () => void;
  onOpenShopCatalog?: () => void;
}

export const FitResultsCard: React.FC<FitResultsCardProps> = ({
  analysis,
  selectedSize,
  onSelectSize,
  cachedSizes,
  isComparing,
  onToggleCompare,
  onOpenBodyProfile,
  onOpenShopCatalog,
}) => {
  const { measurements, sizeResults, trueSize, uncertaintySentence } = analysis;

  const getEaseColorClass = (category: FitCategory): string => {
    if (category === 'fitted') {
      return 'text-emerald-800 bg-emerald-50/70';
    }
    if (category === 'relaxed') {
      return 'text-amber-800 bg-amber-50/70';
    }
    if (category === 'tight') {
      return 'text-rose-800 bg-rose-50/70';
    }
    return 'text-indigo-800 bg-indigo-50/70';
  };

  const selectedResult = sizeResults.find((s) => s.size === selectedSize);

  return (
    <div className="space-y-4">
      {/* 1. True Size & Instant Fit Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <BadgeCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Recommended Size</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">
                  Fitted from Saved Body Profile (&lt;1ms math)
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-0.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  True Size: {trueSize || 'Check Measurements'}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Smallest size where every point passes
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {onOpenShopCatalog && (
              <button
                type="button"
                onClick={onOpenShopCatalog}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Try Other Garments</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCompare}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isComparing
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Close Compare' : 'Compare 2 Sizes'}</span>
            </button>
          </div>
        </div>

        {/* Uncertainty Sentence Callout */}
        {uncertaintySentence && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <span className="font-semibold">{uncertaintySentence}</span>
              <span className="text-amber-800 ml-1.5">
                (Within ±{measurements.uncertaintyCm} cm measurement tolerance)
              </span>
            </div>
          </div>
        )}

        {/* Width Asymmetry Warning if detected */}
        {measurements.widthAsymmetryWarning && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600">{measurements.widthAsymmetryWarning}</p>
          </div>
        )}

        {/* Size Selection Segmented Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Select Size to Inspect in 360° Turntable
            </label>
            <span className="text-xs text-slate-500">
              {cachedSizes.length} sizes ready in cache
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeResults.map((s) => {
              const isSelected = s.size === selectedSize;
              const isTrue = s.size === trueSize;

              return (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => onSelectSize(s.size)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <span>{s.size}</span>
                  {isTrue && (
                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                    >
                      · True Fit
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Fit Description */}
          {selectedResult && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900 mb-1">
                <span className="capitalize">Size {selectedSize}: {selectedResult.overallCategory} Fit</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-slate-600 font-mono tabular-nums font-normal">
                  Chest ease {selectedResult.chest.ease > 0 ? `+${selectedResult.chest.ease}` : selectedResult.chest.ease} cm · Waist ease {selectedResult.waist.ease > 0 ? `+${selectedResult.waist.ease}` : selectedResult.waist.ease} cm · Hip ease {selectedResult.hip.ease > 0 ? `+${selectedResult.hip.ease}` : selectedResult.hip.ease} cm
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {selectedResult.fitDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Ease Matrix Across Sizes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Anthropometric Ease Matrix Across Sizes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ease = Brand Size Chart − Your Body Girth + Cut Allowance
            </p>
          </div>
          <div className="text-xs text-slate-500">
            <span>Fitted (0–6cm)</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Relaxed (6–14cm)</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Tight (&lt;0cm)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Chest Ease</th>
                <th className="py-2.5 px-3">Waist Ease</th>
                <th className="py-2.5 px-3">Hip Ease</th>
                <th className="py-2.5 px-3">Drape Profile</th>
                <th className="py-2.5 px-3 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sizeResults.map((row) => {
                const isSelected = row.size === selectedSize;
                const isTrue = row.size === trueSize;

                return (
                  <tr
                    key={row.size}
                    onClick={() => onSelectSize(row.size)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/50 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-mono tabular-nums">
                      <span>{row.size}</span>
                      {isTrue && (
                        <span className="ml-1.5 text-[10px] font-semibold text-emerald-700">
                          · True
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <span className={`px-2 py-0.5 rounded ${getEaseColorClass(row.chest.category)}`}>
                        {row.chest.ease > 0 ? `+${row.chest.ease}` : row.chest.ease} cm · {row.chest.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <span className={`px-2 py-0.5 rounded ${getEaseColorClass(row.waist.category)}`}>
                        {row.waist.ease > 0 ? `+${row.waist.ease}` : row.waist.ease} cm · {row.waist.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <span className={`px-2 py-0.5 rounded ${getEaseColorClass(row.hip.category)}`}>
                        {row.hip.ease > 0 ? `+${row.hip.ease}` : row.hip.ease} cm · {row.hip.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 capitalize font-medium text-slate-700">
                      {row.overallCategory}
                    </td>

                    <td className="py-2.5 px-3 text-right font-semibold">
                      {row.passes ? (
                        <span className="text-emerald-700">Passes</span>
                      ) : (
                        <span className="text-rose-600">Too Tight</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Compact Saved Body Measurements Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-slate-900">Your Calibrated Body Profile:</span>
            <span className="text-slate-600 ml-2 font-mono tabular-nums">
              Chest {measurements.chest} cm ({measurements.chestSource}) · Waist {measurements.waist} cm ({measurements.waistSource}) · Hip {measurements.hip} cm ({measurements.hipSource}) · ±{measurements.uncertaintyCm} cm
            </span>
          </div>
        </div>
        {onOpenBodyProfile && (
          <button
            type="button"
            onClick={onOpenBodyProfile}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
          >
            Edit Body Profile &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
