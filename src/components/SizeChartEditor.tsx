import React from 'react';
import { SizeChartEntry } from '../types/tryon.ts';
import { RotateCcw, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_SIZE_CHART } from '../utils/fitMath.ts';

interface SizeChartEditorProps {
  sizeChart: SizeChartEntry[];
  onChange: (chart: SizeChartEntry[]) => void;
}

export const SizeChartEditor: React.FC<SizeChartEditorProps> = ({ sizeChart, onChange }) => {
  const handleUpdate = (index: number, field: keyof SizeChartEntry, val: string | number) => {
    const updated = [...sizeChart];
    updated[index] = {
      ...updated[index],
      [field]: typeof val === 'number' ? val : val,
    };
    onChange(updated);
  };

  const handleReset = () => {
    onChange([...DEFAULT_SIZE_CHART]);
  };

  const handleAddRow = () => {
    const last = sizeChart[sizeChart.length - 1];
    onChange([
      ...sizeChart,
      {
        size: 'XXL',
        chest: last ? last.chest + 8 : 120,
        waist: last ? last.waist + 8 : 104,
        hip: last ? last.hip + 8 : 128,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (sizeChart.length <= 1) return;
    onChange(sizeChart.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-800">Brand Size Chart</h3>
          <p className="text-xs text-slate-500">
            Garment measurements in cm. Edit to match the brand&apos;s published guide.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="Reset to prefilled defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
              <th className="py-2 px-3 rounded-l-lg">Size</th>
              <th className="py-2 px-3">Chest (cm)</th>
              <th className="py-2 px-3">Waist (cm)</th>
              <th className="py-2 px-3">Hip (cm)</th>
              <th className="py-2 px-2 text-right rounded-r-lg">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sizeChart.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-semibold text-slate-800">
                  <input
                    type="text"
                    value={row.size}
                    onChange={(e) => handleUpdate(idx, 'size', e.target.value)}
                    className="w-14 px-2 py-1 rounded border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    value={row.chest}
                    onChange={(e) => handleUpdate(idx, 'chest', parseInt(e.target.value) || 0)}
                    className="w-18 px-2 py-1 rounded border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    value={row.waist}
                    onChange={(e) => handleUpdate(idx, 'waist', parseInt(e.target.value) || 0)}
                    className="w-18 px-2 py-1 rounded border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    value={row.hip}
                    onChange={(e) => handleUpdate(idx, 'hip', parseInt(e.target.value) || 0)}
                    className="w-18 px-2 py-1 rounded border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={sizeChart.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                    title="Remove size row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={handleAddRow}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Size Row</span>
        </button>
      </div>
    </div>
  );
};
