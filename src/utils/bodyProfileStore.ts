import {
  BodyMeasurements,
  CutType,
  FabricType,
  FitAnalysis,
  PhotoLandmarks,
  SideLandmarks,
  SizeChartEntry,
  ShoppingProduct,
} from '../types/tryon.ts';
import { calculateMeasurements, analyzeFit } from './fitMath.ts';

export interface SavedBodyProfile {
  id: string;
  name: string;
  heightCm: number;
  frontImage?: string;
  backImage?: string;
  sideImage?: string;
  frontLandmarks: PhotoLandmarks;
  backLandmarks: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  overrideChest?: number;
  overrideWaist?: number;
  overrideHip?: number;
  measurements: BodyMeasurements;
  calibratedAt: string;
  computeCount: number;
}

export interface InstantGarmentFitInput {
  id: string;
  title: string;
  brand?: string;
  cut: CutType;
  fabric: FabricType;
  sizeChart: SizeChartEntry[];
}

/**
 * Builds or updates a reusable BodyProfile from cached landmarks + height/overrides
 * without invoking any vision API calls when only numbers change.
 */
export function buildReusableBodyProfile(params: {
  id?: string;
  name?: string;
  heightCm: number;
  frontImage?: string;
  backImage?: string;
  sideImage?: string;
  frontLandmarks: PhotoLandmarks;
  backLandmarks: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  overrideChest?: number;
  overrideWaist?: number;
  overrideHip?: number;
  previousComputeCount?: number;
}): SavedBodyProfile {
  const measurements = calculateMeasurements({
    heightCm: params.heightCm,
    frontLandmarks: params.frontLandmarks,
    backLandmarks: params.backLandmarks,
    sideLandmarks: params.sideLandmarks,
    userOverrides: {
      chest: params.overrideChest,
      waist: params.overrideWaist,
      hip: params.overrideHip,
    },
  });

  return {
    id: params.id || 'default-body-profile',
    name: params.name || 'Calibrated Shopper Profile',
    heightCm: params.heightCm,
    frontImage: params.frontImage,
    backImage: params.backImage,
    sideImage: params.sideImage,
    frontLandmarks: params.frontLandmarks,
    backLandmarks: params.backLandmarks,
    sideLandmarks: params.sideLandmarks,
    overrideChest: params.overrideChest,
    overrideWaist: params.overrideWaist,
    overrideHip: params.overrideHip,
    measurements,
    calibratedAt: new Date().toISOString(),
    computeCount: params.previousComputeCount ?? 1,
  };
}

/**
 * Fits any garment immediately against a pre-calibrated SavedBodyProfile
 * in sub-millisecond pure math (0 API compute).
 */
export function fitGarmentWithSavedProfile(
  profile: SavedBodyProfile,
  garment: {
    sizeChart: SizeChartEntry[];
    cut: CutType;
    fabric: FabricType;
  }
): FitAnalysis {
  return analyzeFit({
    measurements: profile.measurements,
    sizeChart: garment.sizeChart,
    cut: garment.cut,
    fabric: garment.fabric,
  });
}

/**
 * Batch-evaluates an entire catalog of garments against the single calibrated
 * body profile with zero vision API calls.
 */
export function batchFitCatalogWithSavedProfile(
  profile: SavedBodyProfile,
  products: ShoppingProduct[]
): Record<
  string,
  {
    analysis: FitAnalysis;
    trueSize: string | null;
    chestEaseCm: number | null;
    waistEaseCm: number | null;
    overallFitLabel: string | null;
  }
> {
  const results: Record<
    string,
    {
      analysis: FitAnalysis;
      trueSize: string | null;
      chestEaseCm: number | null;
      waistEaseCm: number | null;
      overallFitLabel: string | null;
    }
  > = {};

  for (const product of products) {
    const analysis = fitGarmentWithSavedProfile(profile, {
      sizeChart: product.sizeChart,
      cut: product.cut,
      fabric: product.fabric,
    });
    const targetSize = analysis.trueSize || analysis.sizeResults[2]?.size || 'M';
    const sizeMatch = analysis.sizeResults.find((s) => s.size === targetSize);

    results[product.id] = {
      analysis,
      trueSize: analysis.trueSize,
      chestEaseCm: sizeMatch ? sizeMatch.chest.ease : null,
      waistEaseCm: sizeMatch ? sizeMatch.waist.ease : null,
      overallFitLabel: sizeMatch ? sizeMatch.overallCategory : null,
    };
  }

  return results;
}

/**
 * Creates a deterministic cache key for storing 360° spins per garment + size
 * so switching between tried-on garments reuses existing renders.
 */
export function getGarmentSpinCacheKey(garmentIdentifier: string, size: string): string {
  const cleanId = (garmentIdentifier || 'default-garment')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 64);
  return `${cleanId}__${size.toUpperCase()}`;
}
