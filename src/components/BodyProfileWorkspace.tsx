import React from 'react';
import { PhotoSlot } from './PhotoSlot.tsx';
import { ThreeGarmentWorldScene } from './ThreeGarmentWorldScene.tsx';
import { BodyMeasurements, PhotoLandmarks, SideLandmarks, ValidationResult } from '../types/tryon.ts';
import { UserCheck, ArrowRight, RotateCw, Sliders, Settings, Scan } from 'lucide-react';

interface BodyProfileWorkspaceProps {
  isSetupMode?: boolean;
  shopperFront?: string;
  shopperBack?: string;
  shopperSide?: string;
  frontLandmarks?: PhotoLandmarks;
  backLandmarks?: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  validations: Record<string, ValidationResult>;
  validatingSlot: string | null;
  onPhotoUpload: (slot: string, dataUrl: string | undefined) => void;
  heightCm: number;
  onHeightChange: (h: number) => void;
  overrideChest?: number;
  overrideWaist?: number;
  overrideHip?: number;
  onOverrideChange: (field: 'chest' | 'waist' | 'hip', val: number | undefined) => void;
  measurements?: BodyMeasurements;
  fittedGarmentsCount: number;
  visionComputeCount: number;
  computeMode: 'low' | 'full';
  onComputeModeChange: (mode: 'low' | 'full') => void;
  isProcessing: boolean;
  onRecalibrateFromPhotos: () => void;
  onCompleteSetupOrSave: () => void;
  onOpenStudio: () => void;
}

export const BodyProfileWorkspace: React.FC<BodyProfileWorkspaceProps> = ({
  isSetupMode = false,
  shopperFront,
  shopperBack,
  shopperSide,
  frontLandmarks,
  backLandmarks,
  sideLandmarks,
  validations,
  validatingSlot,
  onPhotoUpload,
  heightCm,
  onHeightChange,
  overrideChest,
  overrideWaist,
  overrideHip,
  onOverrideChange,
  measurements,
  fittedGarmentsCount,
  visionComputeCount,
  computeMode,
  onComputeModeChange,
  isProcessing,
  onRecalibrateFromPhotos,
  onCompleteSetupOrSave,
  onOpenStudio,
}) => {
  const parseOptionalNum = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Initial Setup vs Settings Anytime */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isSetupMode ? 'Step 01 · Initial Body Profile Setup' : 'Profile & Fit Settings'}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">
                Calibrated Once ({visionComputeCount} vision pass · {fittedGarmentsCount} garments fitted at 0ms)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {isSetupMode
                ? 'Set Up Your Body Profile & 3D Twin Once'
                : 'Edit Photos, 3D Body Representation & Compute Settings'}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 max-w-2xl">
              Upload your Front, Back, and optional Side photos during setup—or refine your height and measurements here anytime. Your photos directly texture and loft your 3D human representation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRecalibrateFromPhotos}
              disabled={isProcessing || !shopperFront}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Recalibrate Landmarks from Photos</span>
            </button>

            <button
              type="button"
              onClick={onCompleteSetupOrSave}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>
                {isSetupMode ? 'Complete Setup & Open Style Home' : 'Save & Return to Style Home'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Locked Measurements Readout */}
        {measurements && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500">Height Anchor</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {heightCm} <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pixel-to-cm scale</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500">Chest Girth</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {measurements.chest} <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 capitalize">
                Source: {measurements.chestSource}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500">Waist Girth</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {measurements.waist} <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 capitalize">
                Source: {measurements.waistSource}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500">Hip Girth</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {measurements.hip} <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 capitalize">
                Source: {measurements.hipSource}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs text-slate-500">Precision Margin</div>
              <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                ±{measurements.uncertaintyCm}{' '}
                <span className="text-xs font-normal text-slate-500">cm</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Confidence {Math.round(measurements.confidence * 100)}%
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Shopper Reference Photos (Upload During Setup or Edit Anytime) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              1. Upload Your Reference Photos (Front, Back &amp; Side Profile)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Stand straight with arms slightly away from your torso. Each photo is verified for full-body framing and mapped onto your 3D representation below.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <UserCheck className="w-4 h-4" />
            <span>Reused across all clothing recommendations &amp; 3D Twin</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
          <PhotoSlot
            id="shopper-front"
            slotType="front"
            label="1. Shopper Front"
            badge="Required"
            image={shopperFront}
            validation={validations.front}
            isValidating={validatingSlot === 'front'}
            onImageChange={(img) => onPhotoUpload('front', img)}
          />

          <PhotoSlot
            id="shopper-back"
            slotType="back"
            label="2. Shopper Back"
            badge="Required"
            image={shopperBack}
            validation={validations.back}
            isValidating={validatingSlot === 'back'}
            onImageChange={(img) => onPhotoUpload('back', img)}
          />

          <PhotoSlot
            id="shopper-side"
            slotType="side"
            label="3. Shopper Side Profile"
            isOptional={true}
            image={shopperSide}
            validation={validations.side}
            isValidating={validatingSlot === 'side'}
            onImageChange={(img) => onPhotoUpload('side', img)}
          />
        </div>

        {/* Live 3D Representation Reconstructed from Uploaded Reference Photos */}
        {measurements && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Live 3D Representation Reconstructed from Your Pictures
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                Click &ldquo;View Raw 3D Photo Scan&rdquo; inside the 3D scene to inspect cylindrical UV projection &amp; landmark rings
              </span>
            </div>

            <ThreeGarmentWorldScene
              measurements={measurements}
              heightCm={heightCm}
              userFrontImage={shopperFront}
              userBackImage={shopperBack}
              userSideImage={shopperSide}
              frontLandmarks={frontLandmarks}
              backLandmarks={backLandmarks}
              sideLandmarks={sideLandmarks}
              onPhotoUpload={(slot, dataUrl) => onPhotoUpload(slot, dataUrl)}
              initialSection="mannequin"
            />
          </div>
        )}
      </section>

      {/* Instant Measurement Overrides & Compute Preferences */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              2. Scale Anchor, Tape-Measure Overrides &amp; Compute Preferences
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Edits recalculate your True Size across all garments in 0ms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="profile-height-cm"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Height in cm (Scale Anchor)
            </label>
            <input
              id="profile-height-cm"
              type="number"
              min={120}
              max={230}
              value={heightCm || ''}
              onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              cm_per_px = height / (feet_y − head_y)
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-override-chest"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Chest Override (cm, optional)
            </label>
            <input
              id="profile-override-chest"
              type="number"
              min={60}
              max={180}
              placeholder={measurements ? `Auto: ${measurements.chest} cm` : 'Auto from photo'}
              value={overrideChest ?? ''}
              onChange={(e) => onOverrideChange('chest', parseOptionalNum(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label
              htmlFor="profile-override-waist"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Waist Override (cm, optional)
            </label>
            <input
              id="profile-override-waist"
              type="number"
              min={50}
              max={180}
              placeholder={measurements ? `Auto: ${measurements.waist} cm` : 'Auto from photo'}
              value={overrideWaist ?? ''}
              onChange={(e) => onOverrideChange('waist', parseOptionalNum(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label
              htmlFor="profile-override-hip"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Hip Override (cm, optional)
            </label>
            <input
              id="profile-override-hip"
              type="number"
              min={60}
              max={180}
              placeholder={measurements ? `Auto: ${measurements.hip} cm` : 'Auto from photo'}
              value={overrideHip ?? ''}
              onChange={(e) => onOverrideChange('hip', parseOptionalNum(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Compute Preference Setting */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">
              360° Turntable Render Compute Mode
            </div>
            <div className="text-xs text-slate-500">
              Choose whether to synthesize only Front/Back keyframes on demand or all 8 turntable angles.
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 w-fit">
            <button
              type="button"
              onClick={() => onComputeModeChange('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                computeMode === 'low'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minimal Compute (0ms Fit + Keyframes)
            </button>
            <button
              type="button"
              onClick={() => onComputeModeChange('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                computeMode === 'full'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full 8-Angle AI Turntable
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenStudio}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Jump directly to 360° Fitting Studio &rarr;
          </button>

          <button
            type="button"
            onClick={onCompleteSetupOrSave}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>
              {isSetupMode ? 'Complete Setup & Open Style Home' : 'Save Settings & Open Style Home'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
