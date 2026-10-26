import React, { useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, Eye, Info } from 'lucide-react';
import { PoseGuide, SlotType } from './PoseGuide.tsx';
import { ValidationResult } from '../types/tryon.ts';

interface PhotoSlotProps {
  id: string;
  slotType: SlotType;
  label: string;
  badge?: string;
  isOptional?: boolean;
  image?: string;
  validation?: ValidationResult;
  isValidating?: boolean;
  onImageChange: (dataUrl: string | undefined) => void;
  onValidateAgain?: () => void;
}

export const PhotoSlot: React.FC<PhotoSlotProps> = ({
  id,
  slotType,
  label,
  badge,
  isOptional,
  image,
  validation,
  isValidating,
  onImageChange,
  onValidateAgain,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGuide, setShowGuide] = React.useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div>
        {/* Slot Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-slate-800 leading-tight">{label}</h3>
            {badge && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                {badge}
              </span>
            )}
            {isOptional && (
              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                (Optional)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium shrink-0"
            title="Toggle pose guide"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        </div>

        {/* Collapsible Pose Guide */}
        {showGuide && (
          <div className="mb-3">
            <PoseGuide slotType={slotType} />
          </div>
        )}

        {/* Photo Container / Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !image && fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed overflow-hidden aspect-3/4 flex flex-col items-center justify-center transition-all ${
            image
              ? 'border-transparent bg-slate-100'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/20 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {image ? (
            <>
              {image.includes('front-back-profile-full-portrait') ? (
                <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden relative">
                  <img
                    src={image}
                    alt={label}
                    style={
                      slotType === 'front'
                        ? {
                            clipPath: 'inset(0 39% 0 30%)',
                            transform: 'translateX(4.5%) scale(1.02)',
                          }
                        : slotType === 'back'
                          ? {
                              clipPath: 'inset(0 0 0 62%)',
                              transform: 'translateX(-28.5%) scale(1.02)',
                            }
                          : slotType === 'side'
                            ? {
                                clipPath: 'inset(0 70% 0 0)',
                                transform: 'translateX(34.5%) scale(1.02)',
                              }
                            : undefined
                    }
                    className="h-[96%] w-auto max-w-none select-none pointer-events-none"
                  />
                  <span className="absolute bottom-1.5 inset-x-2 text-center bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md pointer-events-none">
                    {slotType === 'front'
                      ? '3-View Sheet · Front Pose'
                      : slotType === 'back'
                        ? '3-View Sheet · Back Pose'
                        : '3-View Sheet · Side Profile'}
                  </span>
                </div>
              ) : (
                <img
                  src={image}
                  alt={label}
                  className="w-full h-full object-contain select-none"
                />
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 gap-2 z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow-md hover:bg-slate-50 transition-transform hover:scale-105"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageChange(undefined);
                  }}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold shadow-md hover:bg-red-700 transition-transform hover:scale-105"
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Click or drag photo</p>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WebP</p>
            </div>
          )}
        </div>
      </div>

      {/* Validation status / Retake explanation */}
      {image && (
        <div className="mt-3">
          {isValidating ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50/70 px-2.5 py-1.5 rounded-lg border border-indigo-100">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Validating with Gemini...</span>
            </div>
          ) : validation ? (
            validation.valid ? (
              <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{validation.feedback || 'Photo verified. Stance & framing good.'}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 px-2.5 py-2 rounded-lg border border-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Retake Needed</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    {validation.feedback}
                  </p>
                </div>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
};
