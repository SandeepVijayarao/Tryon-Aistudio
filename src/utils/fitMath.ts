import {
  CutType,
  FabricType,
  PhotoLandmarks,
  SideLandmarks,
  SizeChartEntry,
  FitCategory,
  SizeFitResult,
  BodyMeasurements,
  FitAnalysis,
  MeasurementSource,
} from '../types/tryon.ts';

export const DEFAULT_SIZE_CHART: SizeChartEntry[] = [
  { size: 'XS', chest: 82, waist: 66, hip: 90 },
  { size: 'S', chest: 88, waist: 72, hip: 96 },
  { size: 'M', chest: 96, waist: 80, hip: 104 },
  { size: 'L', chest: 104, waist: 88, hip: 112 },
  { size: 'XL', chest: 112, waist: 96, hip: 120 },
];

export const CUT_ALLOWANCES: Record<CutType, number> = {
  slim: 0,
  regular: 4,
  relaxed: 10,
  oversized: 18,
};

export const FIT_DESCRIPTIONS: Record<FitCategory, string> = {
  tight: 'fabric taut across chest and shoulders, horizontal strain lines, hem rides up, sleeves end short.',
  fitted: 'follows the body closely, a few soft folds.',
  relaxed: 'stands slightly off the body, soft vertical drape, shoulder seam a little past the shoulder.',
  loose: 'hangs well off the body, deep folds, dropped shoulders, longer hem and sleeves.',
};

/**
 * Ramanujan approximation of ellipse perimeter:
 * π * (3*(a + b) - sqrt((3*a + b) * (a + 3*b)))
 */
export function calculateEllipseGirth(width: number, depth: number): number {
  const a = Math.max(0.1, width / 2);
  const b = Math.max(0.1, depth / 2);
  const term1 = 3 * (a + b);
  const term2 = Math.sqrt((3 * a + b) * (a + 3 * b));
  return Math.PI * (term1 - term2);
}

export interface CalculateMeasurementsInput {
  heightCm: number;
  frontLandmarks: PhotoLandmarks;
  backLandmarks: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  userOverrides?: {
    chest?: number;
    waist?: number;
    hip?: number;
  };
}

export function calculateMeasurements(input: CalculateMeasurementsInput): BodyMeasurements {
  const { heightCm, frontLandmarks, backLandmarks, sideLandmarks, userOverrides } = input;

  const frontHeightPx = Math.abs(frontLandmarks.feet_y - frontLandmarks.head_y);
  const backHeightPx = Math.abs(backLandmarks.feet_y - backLandmarks.head_y);

  const frontCmPerPx = frontHeightPx > 0 ? heightCm / frontHeightPx : 0.25;
  const backCmPerPx = backHeightPx > 0 ? heightCm / backHeightPx : 0.25;

  let effectiveConfidence = (frontLandmarks.confidence + backLandmarks.confidence) / 2;

  // Front widths in cm
  let frontChestWidth = Math.abs(frontLandmarks.chest_right.x - frontLandmarks.chest_left.x) * frontCmPerPx;
  if (frontLandmarks.arms_in_silhouette) {
    // If arms in silhouette, use shoulder width as chest width and lower confidence
    const shoulderWidth = Math.abs(frontLandmarks.shoulder_right.x - frontLandmarks.shoulder_left.x) * frontCmPerPx;
    frontChestWidth = shoulderWidth;
    effectiveConfidence = Math.max(0.3, effectiveConfidence * 0.75);
  }

  const frontWaistWidth = Math.abs(frontLandmarks.waist_right.x - frontLandmarks.waist_left.x) * frontCmPerPx;
  const frontHipWidth = Math.abs(frontLandmarks.hip_right.x - frontLandmarks.hip_left.x) * frontCmPerPx;

  // Back widths in cm
  let backChestWidth = Math.abs(backLandmarks.chest_right.x - backLandmarks.chest_left.x) * backCmPerPx;
  if (backLandmarks.arms_in_silhouette) {
    const shoulderWidth = Math.abs(backLandmarks.shoulder_right.x - backLandmarks.shoulder_left.x) * backCmPerPx;
    backChestWidth = shoulderWidth;
    effectiveConfidence = Math.max(0.3, effectiveConfidence * 0.75);
  }

  const backWaistWidth = Math.abs(backLandmarks.waist_right.x - backLandmarks.waist_left.x) * backCmPerPx;
  const backHipWidth = Math.abs(backLandmarks.hip_right.x - backLandmarks.hip_left.x) * backCmPerPx;

  // Check 8% difference between front and back widths
  const chestDiffPct = Math.abs(frontChestWidth - backChestWidth) / ((frontChestWidth + backChestWidth) / 2 || 1);
  const waistDiffPct = Math.abs(frontWaistWidth - backWaistWidth) / ((frontWaistWidth + backWaistWidth) / 2 || 1);
  const hipDiffPct = Math.abs(frontHipWidth - backHipWidth) / ((frontHipWidth + backHipWidth) / 2 || 1);

  let widthAsymmetryWarning: string | undefined = undefined;
  if (chestDiffPct > 0.08 || waistDiffPct > 0.08 || hipDiffPct > 0.08) {
    const maxDiff = Math.max(chestDiffPct, waistDiffPct, hipDiffPct);
    const diffPctRounded = Math.round(maxDiff * 100);
    widthAsymmetryWarning = `Front and back widths vary by ${diffPctRounded}% (distance or stance slightly differed). Values averaged for stability.`;
  }

  const avgChestWidth = (frontChestWidth + backChestWidth) / 2;
  const avgWaistWidth = (frontWaistWidth + backWaistWidth) / 2;
  const avgHipWidth = (frontHipWidth + backHipWidth) / 2;

  // Depth: side photo if given, else priors: chest 0.72, waist 0.78, hip 0.80
  let chestDepth: number;
  let waistDepth: number;
  let hipDepth: number;
  let defaultSource: MeasurementSource = 'front+back photos';

  if (sideLandmarks) {
    const sideHeightPx = Math.abs(sideLandmarks.feet_y - sideLandmarks.head_y);
    const sideCmPerPx = sideHeightPx > 0 ? heightCm / sideHeightPx : 0.25;
    chestDepth = Math.abs(sideLandmarks.chest_front.x - sideLandmarks.chest_back.x) * sideCmPerPx;
    waistDepth = Math.abs(sideLandmarks.waist_front.x - sideLandmarks.waist_back.x) * sideCmPerPx;
    hipDepth = Math.abs(sideLandmarks.hip_front.x - sideLandmarks.hip_back.x) * sideCmPerPx;
    defaultSource = 'side photo';
    effectiveConfidence = Math.min(1, (effectiveConfidence + sideLandmarks.confidence) / 2);
  } else {
    chestDepth = avgChestWidth * 0.72;
    waistDepth = avgWaistWidth * 0.78;
    hipDepth = avgHipWidth * 0.80;
  }

  // Calculate elliptical girths
  let calcChest = Math.round(calculateEllipseGirth(avgChestWidth, chestDepth));
  let calcWaist = Math.round(calculateEllipseGirth(avgWaistWidth, waistDepth));
  let calcHip = Math.round(calculateEllipseGirth(avgHipWidth, hipDepth));

  let chestSource: MeasurementSource = defaultSource;
  let waistSource: MeasurementSource = defaultSource;
  let hipSource: MeasurementSource = defaultSource;

  // User overrides always win
  const hasUserChest = typeof userOverrides?.chest === 'number' && userOverrides.chest > 0;
  const hasUserWaist = typeof userOverrides?.waist === 'number' && userOverrides.waist > 0;
  const hasUserHip = typeof userOverrides?.hip === 'number' && userOverrides.hip > 0;

  if (hasUserChest) {
    calcChest = userOverrides!.chest!;
    chestSource = 'you entered';
  }
  if (hasUserWaist) {
    calcWaist = userOverrides!.waist!;
    waistSource = 'you entered';
  }
  if (hasUserHip) {
    calcHip = userOverrides!.hip!;
    hipSource = 'you entered';
  }

  // Uncertainty calculation:
  // ±4 cm if user typed measurements; ±6 with a side photo; else ±8 (±12 if confidence < 0.5)
  let uncertaintyCm = 8;
  if (hasUserChest && hasUserWaist && hasUserHip) {
    uncertaintyCm = 4;
  } else if (sideLandmarks) {
    uncertaintyCm = 6;
  } else if (effectiveConfidence < 0.5) {
    uncertaintyCm = 12;
  } else {
    uncertaintyCm = 8;
  }

  return {
    chest: calcChest,
    waist: calcWaist,
    hip: calcHip,
    chestSource,
    waistSource,
    hipSource,
    confidence: Number(effectiveConfidence.toFixed(2)),
    widthAsymmetryWarning,
    uncertaintyCm,
  };
}

export function classifyEase(ease: number, fabric: FabricType): FitCategory {
  const minThreshold = fabric === 'stretch_knit' ? -4 : 0;
  if (ease < minThreshold) return 'tight';
  if (ease <= 6) return 'fitted';
  if (ease <= 14) return 'relaxed';
  return 'loose';
}

export function determineOverallCategory(
  chestCat: FitCategory,
  waistCat: FitCategory,
  hipCat: FitCategory
): FitCategory {
  // If any point is tight, the garment fit is tight
  if (chestCat === 'tight' || waistCat === 'tight' || hipCat === 'tight') {
    return 'tight';
  }
  // If any point is loose, and none are tight
  if (chestCat === 'loose' || waistCat === 'loose' || hipCat === 'loose') {
    // If predominantly loose
    const looseCount = [chestCat, waistCat, hipCat].filter((c) => c === 'loose').length;
    if (looseCount >= 2) return 'loose';
    return 'relaxed';
  }
  if (chestCat === 'relaxed' || waistCat === 'relaxed' || hipCat === 'relaxed') {
    return 'relaxed';
  }
  return 'fitted';
}

export interface AnalyzeFitInput {
  measurements: BodyMeasurements;
  sizeChart: SizeChartEntry[];
  cut: CutType;
  fabric: FabricType;
}

export function analyzeFit(input: AnalyzeFitInput): FitAnalysis {
  const { measurements, sizeChart, cut, fabric } = input;
  const cutAllowance = CUT_ALLOWANCES[cut];
  const minPassThreshold = fabric === 'stretch_knit' ? -4 : 0;

  const sizeResults: SizeFitResult[] = sizeChart.map((entry) => {
    // ease = chart_measurement - body_measurement + cut_allowance
    const rawChestEase = entry.chest - measurements.chest;
    const rawWaistEase = entry.waist - measurements.waist;
    const rawHipEase = entry.hip - measurements.hip;

    const chestEase = Math.round(rawChestEase + cutAllowance);
    const waistEase = Math.round(rawWaistEase + cutAllowance);
    const hipEase = Math.round(rawHipEase + cutAllowance);

    const chestCategory = classifyEase(chestEase, fabric);
    const waistCategory = classifyEase(waistEase, fabric);
    const hipCategory = classifyEase(hipEase, fabric);

    const passes =
      chestEase >= minPassThreshold &&
      waistEase >= minPassThreshold &&
      hipEase >= minPassThreshold;

    const overallCategory = determineOverallCategory(chestCategory, waistCategory, hipCategory);
    const fitDescription = FIT_DESCRIPTIONS[overallCategory];

    const promptFitText = `Fit: ${overallCategory}: chest ease ${chestEase} cm, waist ease ${waistEase} cm. ${fitDescription}`;

    return {
      size: entry.size,
      chest: {
        chartValue: entry.chest,
        bodyValue: measurements.chest,
        rawEase: rawChestEase,
        ease: chestEase,
        category: chestCategory,
      },
      waist: {
        chartValue: entry.waist,
        bodyValue: measurements.waist,
        rawEase: rawWaistEase,
        ease: waistEase,
        category: waistCategory,
      },
      hip: {
        chartValue: entry.hip,
        bodyValue: measurements.hip,
        rawEase: rawHipEase,
        ease: hipEase,
        category: hipCategory,
      },
      passes,
      overallCategory,
      fitDescription,
      promptFitText,
    };
  });

  // True size = smallest size where every point passes
  const passingSizes = sizeResults.filter((s) => s.passes);
  const trueSizeResult = passingSizes.length > 0 ? passingSizes[0] : null;
  const trueSize = trueSizeResult ? trueSizeResult.size : null;

  // Uncertainty sentence:
  // "If the true size wins by less than the uncertainty, say 'Between M and L — measure your chest to be sure'."
  let uncertaintySentence: string | undefined = undefined;

  if (trueSizeResult) {
    const minEaseValue = Math.min(
      trueSizeResult.chest.ease,
      trueSizeResult.waist.ease,
      trueSizeResult.hip.ease
    );
    const marginAboveMin = minEaseValue - minPassThreshold;

    // Check if margin is within uncertainty
    if (marginAboveMin < measurements.uncertaintyCm) {
      // Find the bottleneck point
      let bottleneck = 'chest';
      if (trueSizeResult.waist.ease <= trueSizeResult.chest.ease && trueSizeResult.waist.ease <= trueSizeResult.hip.ease) {
        bottleneck = 'waist';
      } else if (trueSizeResult.hip.ease <= trueSizeResult.chest.ease && trueSizeResult.hip.ease <= trueSizeResult.waist.ease) {
        bottleneck = 'hip';
      }

      // Next size up in chart
      const currentIndex = sizeChart.findIndex((e) => e.size === trueSizeResult.size);
      const nextSizeEntry = sizeChart[currentIndex + 1];
      const otherSize = nextSizeEntry ? nextSizeEntry.size : (sizeChart[currentIndex - 1]?.size || 'next size');

      uncertaintySentence = `Between ${trueSizeResult.size} and ${otherSize} — measure your ${bottleneck} to be sure`;
    }
  } else if (sizeResults.length > 0) {
    uncertaintySentence = 'No standard size completely passes all ease thresholds — consider sizing up or custom tailoring.';
  }

  return {
    measurements,
    sizeResults,
    trueSize,
    uncertaintySentence,
  };
}
