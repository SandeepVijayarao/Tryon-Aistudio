import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEllipseGirth,
  calculateMeasurements,
  classifyEase,
  analyzeFit,
  DEFAULT_SIZE_CHART,
} from './fitMath.ts';
import { PhotoLandmarks, SideLandmarks } from '../types/tryon.ts';

test('calculateEllipseGirth computes circle and ellipse perimeters accurately', () => {
  // For a circle of diameter 30 (radius 15), perimeter is 2 * pi * 15 ≈ 94.2477
  const circlePerimeter = calculateEllipseGirth(30, 30);
  assert.ok(Math.abs(circlePerimeter - 2 * Math.PI * 15) < 0.1);

  // For an ellipse with width 32, depth 24:
  // a = 16, b = 12
  // 3*(16+12) = 84, sqrt((48+12)*(16+36)) = sqrt(60*52) = sqrt(3120) ≈ 55.8569
  // pi * (84 - 55.8569) ≈ 88.41
  const ellipseGirth = calculateEllipseGirth(32, 24);
  assert.ok(ellipseGirth > 85 && ellipseGirth < 92);
});

test('calculateMeasurements correctly scales landmarks from height and uses priors', () => {
  // Person 180cm, height in pixels: 1000 - 100 = 900px -> 0.2 cm/px
  const frontLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 }, // 220px = 44cm
    chest_left: { x: 230, y: 350 },
    chest_right: { x: 390, y: 350 }, // 160px = 32cm
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 }, // 130px = 26cm
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 }, // 160px = 32cm
    arms_in_silhouette: false,
    confidence: 0.9,
  };

  const backLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 },
    chest_left: { x: 230, y: 350 },
    chest_right: { x: 390, y: 350 }, // same 32cm
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 }, // 26cm
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 }, // 32cm
    arms_in_silhouette: false,
    confidence: 0.9,
  };

  const measurements = calculateMeasurements({
    heightCm: 180,
    frontLandmarks,
    backLandmarks,
  });

  // Chest width: 32cm, depth = 32 * 0.72 = 23.04cm
  // Waist width: 26cm, depth = 26 * 0.78 = 20.28cm
  // Hip width: 32cm, depth = 32 * 0.80 = 25.6cm
  assert.ok(measurements.chest > 80 && measurements.chest < 95);
  assert.ok(measurements.waist > 65 && measurements.waist < 80);
  assert.ok(measurements.hip > 85 && measurements.hip < 100);
  assert.equal(measurements.chestSource, 'front+back photos');
  assert.equal(measurements.uncertaintyCm, 8);
  assert.equal(measurements.widthAsymmetryWarning, undefined);
});

test('calculateMeasurements flags >8% width difference between front and back', () => {
  const frontLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 },
    chest_left: { x: 230, y: 350 },
    chest_right: { x: 390, y: 350 }, // 160px
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 },
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 },
    arms_in_silhouette: false,
    confidence: 0.85,
  };

  // Back photo was taken closer or in different stance -> 190px chest width (>15% diff)
  const backLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 190, y: 250 },
    shoulder_right: { x: 430, y: 250 },
    chest_left: { x: 205, y: 350 },
    chest_right: { x: 395, y: 350 }, // 190px
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 },
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 },
    arms_in_silhouette: false,
    confidence: 0.85,
  };

  const measurements = calculateMeasurements({
    heightCm: 180,
    frontLandmarks,
    backLandmarks,
  });

  assert.ok(measurements.widthAsymmetryWarning !== undefined);
  assert.ok(measurements.widthAsymmetryWarning?.includes('%'));
});

test('arms in silhouette uses shoulder width and reduces confidence', () => {
  const frontLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 }, // 220px
    chest_left: { x: 210, y: 350 }, // blocked by arms
    chest_right: { x: 410, y: 350 },
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 },
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 },
    arms_in_silhouette: true,
    confidence: 0.8,
  };

  const backLandmarks = { ...frontLandmarks, arms_in_silhouette: false };

  const measurements = calculateMeasurements({
    heightCm: 180,
    frontLandmarks,
    backLandmarks,
  });

  // Confidence should be lowered
  assert.ok(measurements.confidence < 0.8);
});

test('side photo updates depth source and sets uncertainty to ±6', () => {
  const frontLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 },
    chest_left: { x: 230, y: 350 },
    chest_right: { x: 390, y: 350 },
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 },
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 },
    arms_in_silhouette: false,
    confidence: 0.9,
  };

  const sideLandmarks: SideLandmarks = {
    head_y: 100,
    feet_y: 1000,
    chest_front: { x: 250, y: 350 },
    chest_back: { x: 370, y: 350 }, // 120px depth
    waist_front: { x: 260, y: 480 },
    waist_back: { x: 360, y: 480 },
    hip_front: { x: 250, y: 600 },
    hip_back: { x: 380, y: 600 },
    confidence: 0.88,
  };

  const measurements = calculateMeasurements({
    heightCm: 180,
    frontLandmarks,
    backLandmarks: frontLandmarks,
    sideLandmarks,
  });

  assert.equal(measurements.chestSource, 'side photo');
  assert.equal(measurements.uncertaintyCm, 6);
});

test('user typed overrides take precedence and set uncertainty to ±4', () => {
  const frontLandmarks: PhotoLandmarks = {
    head_y: 100,
    feet_y: 1000,
    shoulder_left: { x: 200, y: 250 },
    shoulder_right: { x: 420, y: 250 },
    chest_left: { x: 230, y: 350 },
    chest_right: { x: 390, y: 350 },
    waist_left: { x: 245, y: 480 },
    waist_right: { x: 375, y: 480 },
    hip_left: { x: 235, y: 600 },
    hip_right: { x: 395, y: 600 },
    arms_in_silhouette: false,
    confidence: 0.9,
  };

  const measurements = calculateMeasurements({
    heightCm: 180,
    frontLandmarks,
    backLandmarks: frontLandmarks,
    userOverrides: {
      chest: 98,
      waist: 82,
      hip: 105,
    },
  });

  assert.equal(measurements.chest, 98);
  assert.equal(measurements.waist, 82);
  assert.equal(measurements.hip, 105);
  assert.equal(measurements.chestSource, 'you entered');
  assert.equal(measurements.waistSource, 'you entered');
  assert.equal(measurements.hipSource, 'you entered');
  assert.equal(measurements.uncertaintyCm, 4);
});

test('classifyEase respects woven vs stretch knit thresholds', () => {
  // Woven: <0 tight, 0-6 fitted, 6-14 relaxed, >14 loose
  assert.equal(classifyEase(-1, 'woven'), 'tight');
  assert.equal(classifyEase(0, 'woven'), 'fitted');
  assert.equal(classifyEase(4, 'woven'), 'fitted');
  assert.equal(classifyEase(6, 'woven'), 'fitted');
  assert.equal(classifyEase(8, 'woven'), 'relaxed');
  assert.equal(classifyEase(14, 'woven'), 'relaxed');
  assert.equal(classifyEase(15, 'woven'), 'loose');

  // Stretch knit tolerates down to -4 cm
  assert.equal(classifyEase(-5, 'stretch_knit'), 'tight');
  assert.equal(classifyEase(-4, 'stretch_knit'), 'fitted');
  assert.equal(classifyEase(-2, 'stretch_knit'), 'fitted');
  assert.equal(classifyEase(2, 'stretch_knit'), 'fitted');
});

test('analyzeFit calculates true size, cut allowances, and uncertainty warning', () => {
  // Body: chest 94, waist 78, hip 102
  // Size chart:
  // XS 82/66/90
  // S 88/72/96
  // M 96/80/104
  // L 104/88/112
  // XL 112/96/120
  //
  // Cut: regular (+4 allowance)
  // For S:
  // chest ease: (88 - 94) + 4 = -2 (tight for woven)
  // For M:
  // chest ease: (96 - 94) + 4 = +6 (fitted)
  // waist ease: (80 - 78) + 4 = +6 (fitted)
  // hip ease: (104 - 102) + 4 = +6 (fitted)
  // Smallest passing size should be M!
  const measurements = {
    chest: 94,
    waist: 78,
    hip: 102,
    chestSource: 'front+back photos' as const,
    waistSource: 'front+back photos' as const,
    hipSource: 'front+back photos' as const,
    confidence: 0.9,
    uncertaintyCm: 8,
  };

  const result = analyzeFit({
    measurements,
    sizeChart: DEFAULT_SIZE_CHART,
    cut: 'regular',
    fabric: 'woven',
  });

  assert.equal(result.trueSize, 'M');
  // Margin for M is 6 cm (above 0). Since 6 < uncertainty (8), it should produce uncertainty warning:
  assert.ok(result.uncertaintySentence !== undefined);
  assert.ok(result.uncertaintySentence?.includes('Between M and L'));
  assert.ok(result.uncertaintySentence?.includes('measure your'));

  // Test promptFitText
  const mResult = result.sizeResults.find((s) => s.size === 'M')!;
  assert.ok(mResult.promptFitText.startsWith('Fit: fitted: chest ease 6 cm, waist ease 6 cm.'));
});
