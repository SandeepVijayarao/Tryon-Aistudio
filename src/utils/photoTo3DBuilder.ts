import {
  BodyMeasurements,
  PhotoLandmarks,
  SideLandmarks,
  SpinFrame,
} from '../types/tryon.ts';

export interface BodyCrossSectionSlice {
  stationId:
    | 'hem'
    | 'hip'
    | 'low_waist'
    | 'waist'
    | 'underbust'
    | 'chest'
    | 'shoulders'
    | 'neck';
  label: string;
  /** Height offset in 3D mannequin local space */
  yMeters: number;
  /** Semi-major horizontal width radius (X axis, meters) derived from front/back photo landmarks */
  radiusWidthX: number;
  /** Semi-minor sagittal depth radius (Z axis, meters) derived from side photo landmarks or Ramanujan ellipse inversion */
  radiusDepthZ: number;
  /** Circumference in cm at this slice */
  girthCm: number;
  /** Normalized vertical coordinate [0..1] in the source user photo */
  photoNormalizedY: number;
}

export interface NormalizedCropBox {
  centerX: number;
  topY: number;
  bottomY: number;
  width: number;
}

export interface Reconstructed3DBodySpec {
  heightCm: number;
  statureScale: number;
  shoulderWidthCm: number;
  chestWidthCm: number;
  chestDepthCm: number;
  waistWidthCm: number;
  waistDepthCm: number;
  hipWidthCm: number;
  hipDepthCm: number;
  torsoLengthCm: number;
  inlegLengthCm: number;
  /** Scale multipliers relative to the 178cm reference rig */
  scales: {
    statureY: number;
    shoulderX: number;
    chestX: number;
    chestZ: number;
    waistX: number;
    waistZ: number;
    hipX: number;
    hipZ: number;
  };
  /** 8 anatomical cross-section slices from hem to neck for 3D Lathe/Loft mesh construction */
  slices: BodyCrossSectionSlice[];
  /** Face crop region in normalized [0..1] front photo coordinates */
  faceCropBox: NormalizedCropBox;
  /** Front torso crop region in normalized [0..1] front photo coordinates */
  bodyCropBox: NormalizedCropBox;
  /** Back torso crop region in normalized [0..1] back photo coordinates */
  backBodyCropBox: NormalizedCropBox;
  /** Back head crop region in normalized [0..1] back photo coordinates */
  backHeadCropBox: NormalizedCropBox;
  /** Side torso crop region in normalized [0..1] side photo coordinates */
  sideBodyCropBox: NormalizedCropBox;
  /** Lower body / trousers crop region in normalized [0..1] front photo coordinates */
  legsCropBox: NormalizedCropBox;
  /** Source summary describing which user photos contributed to the 3D mesh */
  photoSourcesUsed: string[];
}

export interface SampledPhotoAppearance {
  skinHex: number;
  hairHex: number;
  upperGarmentHex: number;
  lowerGarmentHex: number;
}

/**
 * Given ellipse perimeter (girthCm) and semi-major width radius aCm (half of front photo width),
 * solves for the semi-minor depth radius bCm using the quadratic Ramanujan / root-mean-square relation:
 *   C ≈ 2 * pi * sqrt((a^2 + b^2) / 2)
 */
export function solveDepthRadiusFromGirthAndWidth(
  girthCm: number,
  halfWidthCm: number
): number {
  const targetRms = girthCm / (2 * Math.PI);
  const bSquared = Math.max(
    (halfWidthCm * 0.58) ** 2,
    2 * targetRms * targetRms - halfWidthCm * halfWidthCm
  );
  return Math.sqrt(bSquared);
}

function toNorm(val: number, scale: number): number {
  return val / scale;
}

/**
 * Reconstructs a full 3D volumetric body specification from the user's Front, Back, and Side
 * photo landmarks, calibrated height, and circumference measurements.
 */
export function build3DBodySpecFromUserPhotos(params: {
  heightCm: number;
  measurements: BodyMeasurements;
  frontLandmarks?: PhotoLandmarks;
  backLandmarks?: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  hasFrontImage?: boolean;
  hasBackImage?: boolean;
  hasSideImage?: boolean;
}): Reconstructed3DBodySpec {
  const {
    heightCm,
    measurements,
    frontLandmarks,
    backLandmarks,
    sideLandmarks,
    hasFrontImage = true,
    hasBackImage = true,
    hasSideImage = false,
  } = params;

  const safeHeight = Math.min(Math.max(heightCm || 178, 145), 210);
  const statureScale = Number((safeHeight / 178).toFixed(3));

  // Landmarks can be in [0..1000] pixel space or [0..1] normalized space
  const fScale = frontLandmarks && frontLandmarks.feet_y > 1.5 ? 1000 : 1;
  const bScale = backLandmarks && backLandmarks.feet_y > 1.5 ? 1000 : 1;
  const sScale = sideLandmarks && sideLandmarks.feet_y > 1.5 ? 1000 : 1;

  const headY = frontLandmarks ? toNorm(frontLandmarks.head_y, fScale) : 0.04;
  const feetY = frontLandmarks ? toNorm(frontLandmarks.feet_y, fScale) : 0.94;
  const bodySpanNorm = Math.max(0.35, feetY - headY);
  const cmPerNormUnit = safeHeight / bodySpanNorm;

  const measureSpanCm = (
    pLeft?: { x: number; y: number },
    pRight?: { x: number; y: number },
    coordScale = 1,
    fallbackCm = 34
  ) => {
    if (!pLeft || !pRight) return fallbackCm;
    const normDist =
      Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y) / coordScale;
    const rawCm = normDist * cmPerNormUnit;
    return Math.min(Math.max(rawCm, fallbackCm * 0.72), fallbackCm * 1.38);
  };

  const frontShoulderCm = measureSpanCm(
    frontLandmarks?.shoulder_left,
    frontLandmarks?.shoulder_right,
    fScale,
    45.5
  );
  const backShoulderCm = measureSpanCm(
    backLandmarks?.shoulder_left,
    backLandmarks?.shoulder_right,
    bScale,
    frontShoulderCm
  );
  const shoulderWidthCm = Number(((frontShoulderCm + backShoulderCm) / 2).toFixed(1));

  const frontChestWidthCm = measureSpanCm(
    frontLandmarks?.chest_left,
    frontLandmarks?.chest_right,
    fScale,
    measurements.chest * 0.345
  );
  const backChestWidthCm = measureSpanCm(
    backLandmarks?.chest_left,
    backLandmarks?.chest_right,
    bScale,
    frontChestWidthCm
  );
  const chestWidthCm = Number(((frontChestWidthCm + backChestWidthCm) / 2).toFixed(1));

  const frontWaistWidthCm = measureSpanCm(
    frontLandmarks?.waist_left,
    frontLandmarks?.waist_right,
    fScale,
    measurements.waist * 0.335
  );
  const backWaistWidthCm = measureSpanCm(
    backLandmarks?.waist_left,
    backLandmarks?.waist_right,
    bScale,
    frontWaistWidthCm
  );
  const waistWidthCm = Number(((frontWaistWidthCm + backWaistWidthCm) / 2).toFixed(1));

  const frontHipWidthCm = measureSpanCm(
    frontLandmarks?.hip_left,
    frontLandmarks?.hip_right,
    fScale,
    measurements.hip * 0.355
  );
  const backHipWidthCm = measureSpanCm(
    backLandmarks?.hip_left,
    backLandmarks?.hip_right,
    bScale,
    frontHipWidthCm
  );
  const hipWidthCm = Number(((frontHipWidthCm + backHipWidthCm) / 2).toFixed(1));

  const sideSpanNorm = sideLandmarks
    ? Math.max(0.35, (sideLandmarks.feet_y - sideLandmarks.head_y) / sScale)
    : bodySpanNorm;
  const sideCmPerNorm = safeHeight / sideSpanNorm;

  const chestDepthCm = sideLandmarks
    ? Number(
        Math.min(
          Math.max(
            (Math.hypot(
              sideLandmarks.chest_front.x - sideLandmarks.chest_back.x,
              sideLandmarks.chest_front.y - sideLandmarks.chest_back.y
            ) /
              sScale) *
              sideCmPerNorm,
            18
          ),
          36
        ).toFixed(1)
      )
    : Number(
        (solveDepthRadiusFromGirthAndWidth(measurements.chest, chestWidthCm / 2) * 2).toFixed(1)
      );

  const waistDepthCm = sideLandmarks
    ? Number(
        Math.min(
          Math.max(
            (Math.hypot(
              sideLandmarks.waist_front.x - sideLandmarks.waist_back.x,
              sideLandmarks.waist_front.y - sideLandmarks.waist_back.y
            ) /
              sScale) *
              sideCmPerNorm,
            16
          ),
          35
        ).toFixed(1)
      )
    : Number(
        (solveDepthRadiusFromGirthAndWidth(measurements.waist, waistWidthCm / 2) * 2).toFixed(1)
      );

  const hipDepthCm = sideLandmarks
    ? Number(
        Math.min(
          Math.max(
            (Math.hypot(
              sideLandmarks.hip_front.x - sideLandmarks.hip_back.x,
              sideLandmarks.hip_front.y - sideLandmarks.hip_back.y
            ) /
              sScale) *
              sideCmPerNorm,
            18
          ),
          36
        ).toFixed(1)
      )
    : Number(
        (solveDepthRadiusFromGirthAndWidth(measurements.hip, hipWidthCm / 2) * 2).toFixed(1)
      );

  const shoulderY = frontLandmarks
    ? (frontLandmarks.shoulder_left.y + frontLandmarks.shoulder_right.y) / (2 * fScale)
    : headY + bodySpanNorm * 0.17;
  const chestY = frontLandmarks
    ? (frontLandmarks.chest_left.y + frontLandmarks.chest_right.y) / (2 * fScale)
    : headY + bodySpanNorm * 0.28;
  const waistY = frontLandmarks
    ? (frontLandmarks.waist_left.y + frontLandmarks.waist_right.y) / (2 * fScale)
    : headY + bodySpanNorm * 0.42;
  const hipY = frontLandmarks
    ? (frontLandmarks.hip_left.y + frontLandmarks.hip_right.y) / (2 * fScale)
    : headY + bodySpanNorm * 0.53;

  const torsoLengthCm = Number(
    Math.max(42, (hipY - shoulderY) * cmPerNormUnit).toFixed(1)
  );
  const inlegLengthCm = Number(
    Math.max(68, (feetY - hipY) * cmPerNormUnit).toFixed(1)
  );

  const scales = {
    statureY: statureScale,
    shoulderX: Number((shoulderWidthCm / 45.5).toFixed(3)),
    chestX: Number((chestWidthCm / 34.0).toFixed(3)),
    chestZ: Number((chestDepthCm / 24.5).toFixed(3)),
    waistX: Number((waistWidthCm / 30.5).toFixed(3)),
    waistZ: Number((waistDepthCm / 22.0).toFixed(3)),
    hipX: Number((hipWidthCm / 34.0).toFixed(3)),
    hipZ: Number((hipDepthCm / 24.0).toFixed(3)),
  };

  const cmToSceneRadius = 0.0082;
  const cRx = (chestWidthCm / 2) * cmToSceneRadius;
  const cRz = (chestDepthCm / 2) * cmToSceneRadius;
  const wRx = (waistWidthCm / 2) * cmToSceneRadius;
  const wRz = (waistDepthCm / 2) * cmToSceneRadius;
  const hRx = (hipWidthCm / 2) * cmToSceneRadius;
  const hRz = (hipDepthCm / 2) * cmToSceneRadius;
  const sRx = (shoulderWidthCm / 2) * cmToSceneRadius * 0.85;

  const slices: BodyCrossSectionSlice[] = [
    {
      stationId: 'hem',
      label: 'Lower Pelvis',
      yMeters: -0.14,
      radiusWidthX: Number((hRx * 0.92).toFixed(4)),
      radiusDepthZ: Number((hRz * 0.9).toFixed(4)),
      girthCm: Number((measurements.hip * 0.93).toFixed(1)),
      photoNormalizedY: Math.min(0.95, hipY + 0.05),
    },
    {
      stationId: 'hip',
      label: 'Hip Landmark Plane',
      yMeters: 0.0,
      radiusWidthX: Number(hRx.toFixed(4)),
      radiusDepthZ: Number(hRz.toFixed(4)),
      girthCm: measurements.hip,
      photoNormalizedY: hipY,
    },
    {
      stationId: 'low_waist',
      label: 'Lower Waist',
      yMeters: 0.09,
      radiusWidthX: Number(((hRx + wRx) * 0.5).toFixed(4)),
      radiusDepthZ: Number(((hRz + wRz) * 0.5).toFixed(4)),
      girthCm: Number(((measurements.hip + measurements.waist) * 0.5).toFixed(1)),
      photoNormalizedY: (hipY + waistY) * 0.5,
    },
    {
      stationId: 'waist',
      label: 'Waist Landmark Plane',
      yMeters: 0.18,
      radiusWidthX: Number(wRx.toFixed(4)),
      radiusDepthZ: Number(wRz.toFixed(4)),
      girthCm: measurements.waist,
      photoNormalizedY: waistY,
    },
    {
      stationId: 'underbust',
      label: 'Ribcage Taper',
      yMeters: 0.3,
      radiusWidthX: Number(((wRx + cRx) * 0.52).toFixed(4)),
      radiusDepthZ: Number(((wRz + cRz) * 0.52).toFixed(4)),
      girthCm: Number(((measurements.waist + measurements.chest) * 0.51).toFixed(1)),
      photoNormalizedY: (waistY + chestY) * 0.5,
    },
    {
      stationId: 'chest',
      label: 'Chest Landmark Plane',
      yMeters: 0.42,
      radiusWidthX: Number(cRx.toFixed(4)),
      radiusDepthZ: Number(cRz.toFixed(4)),
      girthCm: measurements.chest,
      photoNormalizedY: chestY,
    },
    {
      stationId: 'shoulders',
      label: 'Shoulder Yoke Plane',
      yMeters: 0.56,
      radiusWidthX: Number(sRx.toFixed(4)),
      radiusDepthZ: Number((cRz * 0.88).toFixed(4)),
      girthCm: Number((shoulderWidthCm * 2.35).toFixed(1)),
      photoNormalizedY: shoulderY,
    },
    {
      stationId: 'neck',
      label: 'Collar / Neck Base',
      yMeters: 0.65,
      radiusWidthX: Number((cRx * 0.44).toFixed(4)),
      radiusDepthZ: Number((cRz * 0.44).toFixed(4)),
      girthCm: 39.5,
      photoNormalizedY: Math.max(0.03, shoulderY - 0.04),
    },
  ];

  const frontCenterX = frontLandmarks
    ? (frontLandmarks.shoulder_left.x +
        frontLandmarks.shoulder_right.x +
        frontLandmarks.waist_left.x +
        frontLandmarks.waist_right.x) /
      (4 * fScale)
    : 0.46;

  const frontShoulderSpanNorm = frontLandmarks
    ? Math.max(
        0.14,
        Math.abs(frontLandmarks.shoulder_right.x - frontLandmarks.shoulder_left.x) / fScale
      )
    : 0.22;

  const backCenterX = backLandmarks
    ? (backLandmarks.shoulder_left.x +
        backLandmarks.shoulder_right.x +
        backLandmarks.waist_left.x +
        backLandmarks.waist_right.x) /
      (4 * bScale)
    : 0.79;

  const backShoulderSpanNorm = backLandmarks
    ? Math.max(
        0.14,
        Math.abs(backLandmarks.shoulder_right.x - backLandmarks.shoulder_left.x) / bScale
      )
    : 0.22;

  const sideCenterX = sideLandmarks
    ? (sideLandmarks.chest_front.x +
        sideLandmarks.chest_back.x +
        sideLandmarks.waist_front.x +
        sideLandmarks.waist_back.x) /
      (4 * sScale)
    : 0.16;

  const sideDepthSpanNorm = sideLandmarks
    ? Math.max(
        0.1,
        Math.abs(sideLandmarks.chest_back.x - sideLandmarks.chest_front.x) / sScale
      )
    : 0.14;

  const faceTopY = Math.max(0.01, headY);
  const faceBottomY = Math.max(faceTopY + 0.08, shoulderY - 0.015);

  const photoSourcesUsed: string[] = [];
  if (hasFrontImage) photoSourcesUsed.push('Front Photo (Width + Face/Torso UV)');
  if (hasBackImage) photoSourcesUsed.push('Back Photo (Rear Silhouette + Back UV)');
  if (hasSideImage || sideLandmarks) photoSourcesUsed.push('Side Profile (Sagittal Depth Z)');

  return {
    heightCm: safeHeight,
    statureScale,
    shoulderWidthCm,
    chestWidthCm,
    chestDepthCm,
    waistWidthCm,
    waistDepthCm,
    hipWidthCm,
    hipDepthCm,
    torsoLengthCm,
    inlegLengthCm,
    scales,
    slices,
    faceCropBox: {
      centerX: Number(frontCenterX.toFixed(3)),
      topY: Number(faceTopY.toFixed(3)),
      bottomY: Number(faceBottomY.toFixed(3)),
      width: Number((frontShoulderSpanNorm * 0.65).toFixed(3)),
    },
    bodyCropBox: {
      centerX: Number(frontCenterX.toFixed(3)),
      topY: Number(shoulderY.toFixed(3)),
      bottomY: Number(hipY.toFixed(3)),
      width: Number((frontShoulderSpanNorm * 1.05).toFixed(3)),
    },
    backBodyCropBox: {
      centerX: Number(backCenterX.toFixed(3)),
      topY: Number(shoulderY.toFixed(3)),
      bottomY: Number(hipY.toFixed(3)),
      width: Number((backShoulderSpanNorm * 1.05).toFixed(3)),
    },
    backHeadCropBox: {
      centerX: Number(backCenterX.toFixed(3)),
      topY: Number(faceTopY.toFixed(3)),
      bottomY: Number(faceBottomY.toFixed(3)),
      width: Number((backShoulderSpanNorm * 0.65).toFixed(3)),
    },
    sideBodyCropBox: {
      centerX: Number(sideCenterX.toFixed(3)),
      topY: Number(shoulderY.toFixed(3)),
      bottomY: Number(hipY.toFixed(3)),
      width: Number((sideDepthSpanNorm * 1.15).toFixed(3)),
    },
    legsCropBox: {
      centerX: Number(frontCenterX.toFixed(3)),
      topY: Number(hipY.toFixed(3)),
      bottomY: Number(Math.min(0.92, feetY - 0.04).toFixed(3)),
      width: Number((frontShoulderSpanNorm * 0.85).toFixed(3)),
    },
    photoSourcesUsed,
  };
}

export const STUDIO_TURNTABLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export interface Studio3DAngleSpec {
  angle: number;
  index: number;
  imageUrl: string;
  mirrorHorizontally: boolean;
  isCompositeSheet: boolean;
  sheetCrop?: { sxNorm: number; swNorm: number };
}

/**
 * Resolves the 8-angle 360° Fitting Studio frames into ready-to-render 3D texture specs.
 */
export function resolveStudioTurntableFramesFor3D(params: {
  studioFrames?: SpinFrame[];
  presetFramesBySize?: Record<string, string[]>;
  selectedSize?: string;
  fallbackFrontUrl?: string;
}): Studio3DAngleSpec[] {
  const {
    studioFrames,
    presetFramesBySize,
    selectedSize = 'M',
    fallbackFrontUrl = '/src/assets/images/man_blazer_front_1792967532469.jpg',
  } = params;

  const presetFrames =
    presetFramesBySize?.[selectedSize] ||
    presetFramesBySize?.['M'] ||
    [];

  return STUDIO_TURNTABLE_ANGLES.map((angle, index) => {
    const matchedSpin = studioFrames?.find((f) => f.angle === angle);
    const imageUrl =
      matchedSpin?.imageUrl ||
      presetFrames[index] ||
      presetFrames[0] ||
      fallbackFrontUrl;

    const isCompositeSheet = imageUrl.includes('front-back-profile-full-portrait');
    const isMirroredPresetAngle =
      (imageUrl.startsWith('/src/assets/images/') &&
        (angle === 225 || angle === 270 || angle === 315)) ||
      (isCompositeSheet && angle === 270);

    let sheetCrop: { sxNorm: number; swNorm: number } | undefined;
    if (isCompositeSheet) {
      if (angle === 0 || angle === 45 || angle === 315) {
        sheetCrop = { sxNorm: 0.3, swNorm: 0.31 };
      } else if (angle === 90 || angle === 270) {
        sheetCrop = { sxNorm: 0.0, swNorm: 0.3 };
      } else {
        sheetCrop = { sxNorm: 0.62, swNorm: 0.38 };
      }
    }

    return {
      angle,
      index,
      imageUrl,
      mirrorHorizontally: isMirroredPresetAngle,
      isCompositeSheet,
      sheetCrop,
    };
  });
}

/**
 * Maps the 3D camera position relative to the central turntable pedestal (plus any manual/auto
 * spin offset in degrees) to the nearest of the 8 360° Fitting Studio turntable angles.
 */
export function computeActiveStudioAngleFromCamera(
  cameraX: number,
  cameraZ: number,
  targetX = 0,
  targetZ = 0,
  manualOffsetDeg = 0
): { angle: number; index: number; azimuthDeg: number } {
  const dx = cameraX - targetX;
  const dz = cameraZ - targetZ;
  // When camera is at +Z looking toward origin (dx=0, dz>0), atan2(0, dz) = 0° (Front view)
  const rawDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
  const normalizedDeg = (((rawDeg + manualOffsetDeg) % 360) + 360) % 360;
  const stepIndex = Math.round(normalizedDeg / 45) % 8;
  return {
    angle: STUDIO_TURNTABLE_ANGLES[stepIndex],
    index: stepIndex,
    azimuthDeg: Math.round(normalizedDeg),
  };
}

export interface MannequinVerticalLockCameraSpec {
  camPos: [number, number, number];
  lookAt: [number, number, number];
  minPolarAngle: number;
  maxPolarAngle: number;
  enablePan: boolean;
  enableZoom: boolean;
  minDistance: number;
  maxDistance: number;
}

/**
 * Computes the 3D camera framing and OrbitControls vertical lock constraints so the central
 * 360° Fitting Studio mannequin is framed head-to-toe and locked vertically against tilt/scroll.
 */
export function computeMannequinVerticalLockCameraSpec(params: {
  verticalLocked: boolean;
  statureScaleY?: number;
  isDockCollapsed?: boolean;
}): MannequinVerticalLockCameraSpec {
  const { verticalLocked, statureScaleY = 1.0, isDockCollapsed = false } = params;
  const clampedScale = Math.max(0.88, Math.min(1.15, statureScaleY));

  // Center the mannequin (shoes at y=-0.785, head top at y≈0.78) cleanly between top bar and bottom dock
  const lookAtY = isDockCollapsed ? 0.01 * clampedScale : -0.06 * clampedScale;
  const camY = lookAtY + 0.05;
  const camZ = Number((3.02 * clampedScale).toFixed(2));

  const dy = camY - lookAtY;
  const radius = Math.hypot(dy, camZ);
  const lockedPolarAngle = Number(Math.acos(dy / radius).toFixed(4));

  return {
    camPos: [0.0, Number(camY.toFixed(3)), camZ],
    lookAt: [0.0, Number(lookAtY.toFixed(3)), 0.0],
    minPolarAngle: verticalLocked ? lockedPolarAngle : Number((Math.PI * 0.18).toFixed(4)),
    maxPolarAngle: verticalLocked ? lockedPolarAngle : Number((Math.PI * 0.51).toFixed(4)),
    enablePan: !verticalLocked,
    enableZoom: !verticalLocked,
    minDistance: verticalLocked ? camZ : 1.45,
    maxDistance: verticalLocked ? camZ : 7.2,
  };
}


/**
 * Removes the neutral studio cyclorama background from a 360° Fitting Studio RGBA pixel buffer
 * using an edge-connected Breadth-First Search (BFS) flood-fill that preserves warm garments
 * (e.g. cream/sand blazer), skin tones, dark trousers, and footwear.
 */
export function keyOutStudioBackdropFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { keyedPixelsCount: number; isStudioBackdropDetected: boolean } {
  if (width <= 4 || height <= 4 || data.length < width * height * 4) {
    return { keyedPixelsCount: 0, isStudioBackdropDetected: false };
  }

  // Find the opaque bounding box so canvases with transparent letterbox/pillarbox margins work identically
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX - minX < 4 || maxY - minY < 4) {
    return { keyedPixelsCount: 0, isStudioBackdropDetected: false };
  }

  const getPixel = (x: number, y: number) => {
    const cx = Math.max(minX, Math.min(maxX, x));
    const cy = Math.max(minY, Math.min(maxY, y));
    const i = (cy * width + cx) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };

  // Sample top-left and top-right corners of the opaque photo region to verify studio cyclorama backdrop
  const [tlR, tlG, tlB] = getPixel(minX + 2, minY + 2);
  const [trR, trG, trB] = getPixel(maxX - 2, minY + 2);
  const tlLum = (tlR + tlG + tlB) / 3;
  const trLum = (trR + trG + trB) / 3;
  const tlChroma = Math.max(tlR, tlG, tlB) - Math.min(tlR, tlG, tlB);
  const trChroma = Math.max(trR, trG, trB) - Math.min(trR, trG, trB);

  if (tlLum < 145 || trLum < 145 || tlChroma > 18 || trChroma > 18) {
    return { keyedPixelsCount: 0, isStudioBackdropDetected: false };
  }

  // Per-row border reference RGB so vertical lighting gradients on the studio wall & floor key cleanly
  const rowBorderRgb = new Int16Array(height * 6);
  for (let y = minY; y <= maxY; y++) {
    const [lR, lG, lB] = getPixel(minX + 1, y);
    const [rR, rG, rB] = getPixel(maxX - 1, y);
    const base = y * 6;
    rowBorderRgb[base] = lR;
    rowBorderRgb[base + 1] = lG;
    rowBorderRgb[base + 2] = lB;
    rowBorderRgb[base + 3] = rR;
    rowBorderRgb[base + 4] = rG;
    rowBorderRgb[base + 5] = rB;
  }

  const isBackdropPixel = (x: number, y: number): boolean => {
    const idx = (y * width + x) * 4;
    if (data[idx + 3] <= 16) return true;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = maxC - minC;
    const warmDelta = Math.abs(r - b);
    const lum = (r + g + b) / 3;

    // Warm cream blazers have (r - b) >= 14; skin has (r - b) >= 18; dark trousers have lum < 115.
    // Studio cyclorama walls/floors are neutral achromatic (warmDelta <= 10, chroma <= 13, lum >= 138).
    if (lum < 138 || chroma > 13 || warmDelta > 10) {
      return false;
    }

    const base = y * 6;
    const distLeft =
      Math.abs(r - rowBorderRgb[base]) +
      Math.abs(g - rowBorderRgb[base + 1]) +
      Math.abs(b - rowBorderRgb[base + 2]);
    const distRight =
      Math.abs(r - rowBorderRgb[base + 3]) +
      Math.abs(g - rowBorderRgb[base + 4]) +
      Math.abs(b - rowBorderRgb[base + 5]);

    return Math.min(distLeft, distRight) <= 42;
  };

  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number) => {
    if (x < minX || x > maxX || y < minY || y > maxY) return;
    const pIdx = y * width + x;
    if (visited[pIdx]) return;
    if (isBackdropPixel(x, y)) {
      visited[pIdx] = 1;
      queue[tail++] = pIdx;
    }
  };

  // Seed from all 4 outer borders of the opaque photo region
  for (let x = minX; x <= maxX; x++) {
    tryEnqueue(x, minY);
    tryEnqueue(x, maxY);
  }
  for (let y = minY + 1; y < maxY; y++) {
    tryEnqueue(minX, y);
    tryEnqueue(maxX, y);
  }

  // Also seed between the trouser legs if the gap between knees/calves shows bright studio backdrop
  const boxH = maxY - minY + 1;
  const boxMidX = Math.floor((minX + maxX) * 0.5);
  for (const gapYRatio of [0.68, 0.76, 0.84]) {
    const gy = Math.floor(minY + boxH * gapYRatio);
    const [gr, gg, gb] = getPixel(boxMidX, gy);
    if ((gr + gg + gb) / 3 >= 185 && Math.abs(gr - gb) <= 8) {
      tryEnqueue(boxMidX, gy);
    }
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = (curr - cx) / width;

    if (cx > minX) tryEnqueue(cx - 1, cy);
    if (cx < maxX) tryEnqueue(cx + 1, cy);
    if (cy > minY) tryEnqueue(cx, cy - 1);
    if (cy < maxY) tryEnqueue(cx, cy + 1);
  }

  // Apply transparent alpha to flood-filled studio backdrop and soft anti-aliased edge feathering
  for (let pIdx = 0; pIdx < totalPixels; pIdx++) {
    if (visited[pIdx]) {
      data[pIdx * 4 + 3] = 0;
    } else if (data[pIdx * 4 + 3] > 16) {
      const cx = pIdx % width;
      const cy = (pIdx - cx) / width;
      let backdropNeighbors = 0;
      if (cx > minX && visited[pIdx - 1]) backdropNeighbors++;
      if (cx < maxX && visited[pIdx + 1]) backdropNeighbors++;
      if (cy > minY && visited[pIdx - width]) backdropNeighbors++;
      if (cy < maxY && visited[pIdx + width]) backdropNeighbors++;
      if (backdropNeighbors >= 2) {
        data[pIdx * 4 + 3] = 165;
      } else if (backdropNeighbors === 1) {
        data[pIdx * 4 + 3] = 220;
      }
    }
  }

  return {
    keyedPixelsCount: tail,
    isStudioBackdropDetected: true,
  };
}

