import React, { useState } from 'react';
import { CutType, FabricType, SizeChartEntry } from '../types/tryon.ts';
import {
  Ruler,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Table,
  Link2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { SizeChartEditor } from './SizeChartEditor.tsx';

interface MeasurementsFormProps {
  heightCm: number;
  onHeightChange: (val: number) => void;
  cut: CutType;
  onCutChange: (val: CutType) => void;
  fabric: FabricType;
  onFabricChange: (val: FabricType) => void;
  garmentUrl: string;
  onGarmentUrlChange: (url: string) => void;
  garmentName: string;
  garmentDetails: string;
  onImportGarmentUrl: () => void;
  isImportingUrl?: boolean;
  overrideChest?: number;
  overrideWaist?: number;
  overrideHip?: number;
  onOverrideChange: (field: 'chest' | 'waist' | 'hip', val: number | undefined) => void;
  sizeChart: SizeChartEntry[];
  onSizeChartChange: (chart: SizeChartEntry[]) => void;
  onCalculate: () => void;
  isProcessing: boolean;
  canCalculate: boolean;
}

export const MeasurementsForm: React.FC<MeasurementsFormProps> = ({
  heightCm,
  onHeightChange,
  cut,
  onCutChange,
  fabric,
  onFabricChange,
  garmentUrl,
  onGarmentUrlChange,
  garmentName,
  garmentDetails,
  onImportGarmentUrl,
  isImportingUrl,
  overrideChest,
  overrideWaist,
  overrideHip,
  onOverrideChange,
  sizeChart,
  onSizeChartChange,
  onCalculate,
  isProcessing,
  canCalculate,
}) => {
  const [showOverrides, setShowOverrides] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
      {/* Garment Product Link Importer */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-xs font-bold text-slate-900">
              Garment Product Link &amp; Specifications
            </h3>
          </div>
          {garmentUrl && (
            <a
              href={garmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 whitespace-nowrap"
            >
              <span>View Product Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={garmentUrl}
            onChange={(e) => onGarmentUrlChange(e.target.value)}
            placeholder="Paste clothing product link (e.g. https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html)"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={onImportGarmentUrl}
            disabled={!garmentUrl || isImportingUrl}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isImportingUrl ? 'Extracting...' : 'Import Specs & Size Chart'}
          </button>
        </div>

        {garmentName && (
          <div className="pt-2 border-t border-slate-200/70 flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900">{garmentName}</div>
              {garmentDetails && (
                <p className="text-[11px] text-slate-600 leading-relaxed">{garmentDetails}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-indigo-600" />
          <span>Scale Anchor &amp; Garment Fit Parameters</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Height anchors the pixel-to-centimeter scale. Cut and fabric define ease thresholds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Height cm (required) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Height in cm <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={100}
              max={230}
              value={heightCm || ''}
              onChange={(e) => onHeightChange(parseInt(e.target.value) || 0)}
              placeholder="e.g. 186"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">cm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scale anchor (head to toe)</p>
        </div>

        {/* Cut selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Garment Cut Allowance
          </label>
          <select
            value={cut}
            onChange={(e) => onCutChange(e.target.value as CutType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
          >
            <option value="slim">Slim (0 cm allowance)</option>
            <option value="regular">Regular (+4 cm allowance)</option>
            <option value="relaxed">Relaxed (+10 cm allowance)</option>
            <option value="oversized">Oversized (+18 cm allowance)</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Pattern ease addition</p>
        </div>

        {/* Fabric selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Fabric Construction
          </label>
          <select
            value={fabric}
            onChange={(e) => onFabricChange(e.target.value as FabricType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
          >
            <option value="woven">Woven (rigid, zero stretch)</option>
            <option value="stretch_knit">Stretch Knit / Comfort Bi-Stretch (−4 cm tolerance)</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Tensile negative ease</p>
        </div>
      </div>

      {/* Accordion 1: Optional Manual Overrides */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowOverrides(!showOverrides)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Optional: Manual Measurement Overrides (chest, waist, hip)</span>
            {(overrideChest || overrideWaist || overrideHip) && (
              <span className="text-[11px] font-semibold text-indigo-600">· Active</span>
            )}
          </span>
          {showOverrides ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showOverrides && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chest Override (cm)
              </label>
              <input
                type="number"
                value={overrideChest || ''}
                onChange={(e) => onOverrideChange('chest', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Photo estimated"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Waist Override (cm)
              </label>
              <input
                type="number"
                value={overrideWaist || ''}
                onChange={(e) => onOverrideChange('waist', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Photo estimated"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hip Override (cm)
              </label>
              <input
                type="number"
                value={overrideHip || ''}
                onChange={(e) => onOverrideChange('hip', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Photo estimated"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 sm:col-span-3">
              User-entered numbers always override photo measurements and reduce uncertainty to ±4 cm.
            </p>
          </div>
        )}
      </div>

      {/* Accordion 2: Size Chart Editor */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowSizeChart(!showSizeChart)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
        >
          <span className="flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-indigo-500" />
            <span>Brand Size Chart Table ({sizeChart.map((s) => s.size).join(', ')})</span>
          </span>
          {showSizeChart ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showSizeChart && (
          <div className="mt-3">
            <SizeChartEditor sizeChart={sizeChart} onChange={onSizeChartChange} />
          </div>
        )}
      </div>

      {/* Calculate & Analyze Action */}
      <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {!canCalculate ? (
            <span className="text-amber-600 font-medium">
              Requires Height and at least Shopper Front photo.
            </span>
          ) : (
            <span>Ready to calculate precision fit and render 360° spin views.</span>
          )}
        </div>

        <button
          type="button"
          onClick={onCalculate}
          disabled={!canCalculate || isProcessing}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isProcessing ? 'Analyzing Body & Fit...' : 'Calculate Fit & Render 360°'}</span>
        </button>
      </div>
    </div>
  );
};
