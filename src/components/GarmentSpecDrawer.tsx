import React, { useState } from 'react';
import {
  CutType,
  FabricType,
  SizeChartEntry,
  ValidationResult,
} from '../types/tryon.ts';
import { PhotoSlot } from './PhotoSlot.tsx';
import {
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { DEFAULT_SIZE_CHART } from '../utils/fitMath.ts';

interface GarmentSpecDrawerProps {
  garmentName: string;
  garmentDetails?: string;
  garmentUrl: string;
  onGarmentUrlChange: (url: string) => void;
  onImportGarmentUrl: () => void;
  isImportingUrl: boolean;
  garmentFront?: string;
  garmentBack?: string;
  validations: Record<string, ValidationResult>;
  validatingSlot: string | null;
  onPhotoUpload: (slot: string, dataUrl: string | undefined) => void;
  cut: CutType;
  onCutChange: (cut: CutType) => void;
  fabric: FabricType;
  onFabricChange: (fabric: FabricType) => void;
  sizeChart: SizeChartEntry[];
  onSizeChartChange: (chart: SizeChartEntry[]) => void;
}

const CUT_OPTIONS: { value: CutType; label: string; allowance: string }[] = [
  { value: 'slim', label: 'Slim', allowance: '+0 cm' },
  { value: 'regular', label: 'Regular', allowance: '+4 cm' },
  { value: 'relaxed', label: 'Relaxed', allowance: '+10 cm' },
  { value: 'oversized', label: 'Oversized', allowance: '+18 cm' },
];

const FABRIC_OPTIONS: { value: FabricType; label: string; desc: string }[] = [
  { value: 'woven', label: 'Woven', desc: 'Min ease 0 cm' },
  { value: 'stretch_knit', label: 'Stretch Knit', desc: 'Tolerates −4 cm' },
];

export const GarmentSpecDrawer: React.FC<GarmentSpecDrawerProps> = ({
  garmentName,
  garmentDetails,
  garmentUrl,
  onGarmentUrlChange,
  onImportGarmentUrl,
  isImportingUrl,
  garmentFront,
  garmentBack,
  validations,
  validatingSlot,
  onPhotoUpload,
  cut,
  onCutChange,
  fabric,
  onFabricChange,
  sizeChart,
  onSizeChartChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCellChange = (
    index: number,
    field: keyof Omit<SizeChartEntry, 'size'>,
    val: string
  ) => {
    const num = parseFloat(val) || 0;
    const updated = sizeChart.map((row, i) =>
      i === index ? { ...row, [field]: num } : row
    );
    onSizeChartChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header / Quick Controls Bar (Always Visible) */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Active Garment Specifications</span>
              <span aria-hidden="true">·</span>
              <span>Instant 0ms Recalculation</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              {garmentName || 'Custom Garment'}
            </h3>
            {garmentDetails && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {garmentDetails}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center shrink-0 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isOpen ? 'Hide Chart & Photos' : 'Edit Size Chart & Garment Photos'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Always-Accessible Cut & Fabric Segmented Selectors (Zero Compute Instant Fit Updates) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Garment Cut Allowance
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              {CUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCutChange(opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    cut === opt.value
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {opt.allowance}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Fabric Elasticity
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              {FABRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFabricChange(opt.value)}
                  className={`py-1.5 px-2.5 rounded-lg text-center transition-all cursor-pointer ${
                    fabric === opt.value
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Garment URL, Front/Back Photos & Editable Size Chart */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/60 space-y-5">
          {/* Product Link Importer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="studio-garment-url"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import Garment by Product URL (Zara, Shopify, etc.)</span>
              </label>
              {garmentUrl && (
                <a
                  href={garmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <span>Open Product Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="studio-garment-url"
                type="url"
                value={garmentUrl}
                onChange={(e) => onGarmentUrlChange(e.target.value)}
                placeholder="https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={onImportGarmentUrl}
                disabled={isImportingUrl || !garmentUrl}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isImportingUrl ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Import Specs</span>
                )}
              </button>
            </div>
          </div>

          {/* Garment Front & Back Photos + Editable Size Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <PhotoSlot
                id="garment-front"
                slotType="garment_front"
                label="Garment Front"
                badge="Required"
                image={garmentFront}
                validation={validations.garment_front}
                isValidating={validatingSlot === 'garment_front'}
                onImageChange={(img) => onPhotoUpload('garment_front', img)}
              />

              <PhotoSlot
                id="garment-back"
                slotType="garment_back"
                label="Garment Back"
                badge="Required"
                image={garmentBack}
                validation={validations.garment_back}
                isValidating={validatingSlot === 'garment_back'}
                onImageChange={(img) => onPhotoUpload('garment_back', img)}
              />
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Editable Brand Size Chart (cm)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Edits immediately update True Size &amp; Ease Matrix in 0ms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSizeChartChange(DEFAULT_SIZE_CHART)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2 px-2.5">Size</th>
                      <th className="py-2 px-2.5">Chest (cm)</th>
                      <th className="py-2 px-2.5">Waist (cm)</th>
                      <th className="py-2 px-2.5">Hip (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {sizeChart.map((row, idx) => (
                      <tr key={row.size}>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900">{row.size}</td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="number"
                            aria-label={`${row.size} chest cm`}
                            value={row.chest}
                            onChange={(e) => handleCellChange(idx, 'chest', e.target.value)}
                            className="w-18 px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="number"
                            aria-label={`${row.size} waist cm`}
                            value={row.waist}
                            onChange={(e) => handleCellChange(idx, 'waist', e.target.value)}
                            className="w-18 px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="number"
                            aria-label={`${row.size} hip cm`}
                            value={row.hip}
                            onChange={(e) => handleCellChange(idx, 'hip', e.target.value)}
                            className="w-18 px-2 py-1 rounded border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
