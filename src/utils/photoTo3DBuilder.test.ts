import test from 'node:test';
import assert from 'node:assert/strict';
import {
  build3DBodySpecFromUserPhotos,
  computeActiveStudioAngleFromCamera,
  computeMannequinVerticalLockCameraSpec,
  keyOutStudioBackdropFromRgba,
  resolveStudioTurntableFramesFor3D,
  solveDepthRadiusFromGirthAndWidth,
} from './photoTo3DBuilder';
import { DEMO_PRESETS } from './demoPresets';
import { buildReusableBodyProfile } from './bodyProfileStore';

test('solveDepthRadiusFromGirthAndWidth computes positive sagittal depth radius matching circumference', () => {
  const girthCm = 99;
  const halfWidthCm = 17.2; // 34.4cm front chest width
  const depthRadiusCm = solveDepthRadiusFromGirthAndWidth(girthCm, halfWidthCm);
  assert.ok(depthRadiusCm > 10 && depthRadiusCm < 18);
});

test('build3DBodySpecFromUserPhotos reconstructs 8 anatomical 3D slices and face/body UV crops from user photos and landmarks', () => {
  const preset = DEMO_PRESETS[0];
  const profile = buildReusableBodyProfile({
    heightCm: preset.heightCm,
    frontImage: preset.shopperFrontImage,
    backImage: preset.shopperBackImage,
    sideImage: preset.shopperSideImage,
    frontLandmarks: preset.frontLandmarks,
    backLandmarks: preset.backLandmarks,
    sideLandmarks: preset.sideLandmarks,
  });

  const spec = build3DBodySpecFromUserPhotos({
    heightCm: profile.heightCm,
    measurements: profile.measurements,
    frontLandmarks: profile.frontLandmarks,
    backLandmarks: profile.backLandmarks,
    sideLandmarks: profile.sideLandmarks,
    hasFrontImage: Boolean(profile.frontImage),
    hasBackImage: Boolean(profile.backImage),
    hasSideImage: Boolean(profile.sideImage),
  });

  assert.equal(spec.slices.length, 8);
  assert.equal(spec.photoSourcesUsed.length, 3);
  assert.ok(spec.chestWidthCm > 25 && spec.chestWidthCm < 48);
  assert.ok(spec.waistDepthCm > 16 && spec.waistDepthCm < 35);
  assert.ok(spec.faceCropBox.bottomY > spec.faceCropBox.topY);
  assert.ok(spec.bodyCropBox.bottomY > spec.bodyCropBox.topY);
});

test('build3DBodySpecFromUserPhotos scales 3D cross-sections proportionally when user height or waist changes', () => {
  const preset = DEMO_PRESETS[0];
  const slimProfile = buildReusableBodyProfile({
    heightCm: 175,
    frontLandmarks: preset.frontLandmarks,
    backLandmarks: preset.backLandmarks,
    overrideChest: 96,
    overrideWaist: 82,
    overrideHip: 94,
  });
  const fullerProfile = buildReusableBodyProfile({
    heightCm: 186,
    frontLandmarks: preset.frontLandmarks,
    backLandmarks: preset.backLandmarks,
    overrideChest: 108,
    overrideWaist: 98,
    overrideHip: 104,
  });

  const slimSpec = build3DBodySpecFromUserPhotos({
    heightCm: slimProfile.heightCm,
    measurements: slimProfile.measurements,
    frontLandmarks: slimProfile.frontLandmarks,
    backLandmarks: slimProfile.backLandmarks,
  });
  const fullerSpec = build3DBodySpecFromUserPhotos({
    heightCm: fullerProfile.heightCm,
    measurements: fullerProfile.measurements,
    frontLandmarks: fullerProfile.frontLandmarks,
    backLandmarks: fullerProfile.backLandmarks,
  });

  assert.ok(fullerSpec.statureScale > slimSpec.statureScale);
  const slimWaistSlice = slimSpec.slices.find((s) => s.stationId === 'waist')!;
  const fullerWaistSlice = fullerSpec.slices.find((s) => s.stationId === 'waist')!;
  assert.ok(fullerWaistSlice.radiusDepthZ > slimWaistSlice.radiusDepthZ);
});

test('resolveStudioTurntableFramesFor3D maps all 8 angles from 360 Fitting Studio frames and mirrors left hemisphere', () => {
  const preset = DEMO_PRESETS[0];
  const resolved = resolveStudioTurntableFramesFor3D({
    presetFramesBySize: preset.framesBySize,
    selectedSize: 'M',
  });
  assert.equal(resolved.length, 8);
  assert.equal(resolved[0].angle, 0);
  assert.equal(resolved[0].mirrorHorizontally, false);
  assert.equal(resolved[4].angle, 180);
  assert.equal(resolved[6].angle, 270);
  assert.equal(resolved[6].mirrorHorizontally, true);
});

test('computeActiveStudioAngleFromCamera snaps 3D camera orbit and manual turntable spin to 8 studio angles', () => {
  const frontView = computeActiveStudioAngleFromCamera(0, 3.5, 0, 0, 0);
  assert.equal(frontView.angle, 0);
  assert.equal(frontView.index, 0);

  const rightSideView = computeActiveStudioAngleFromCamera(3.5, 0, 0, 0, 0);
  assert.equal(rightSideView.angle, 90);
  assert.equal(rightSideView.index, 2);

  const backViewViaOffset = computeActiveStudioAngleFromCamera(0, 3.5, 0, 0, 180);
  assert.equal(backViewViaOffset.angle, 180);
  assert.equal(backViewViaOffset.index, 4);
});

test('keyOutStudioBackdropFromRgba removes neutral studio cyclorama while preserving warm cream blazer and dark trousers', () => {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);

  // Fill entire image with neutral white studio cyclorama (242, 242, 242, 255)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 242;
    data[i * 4 + 1] = 242;
    data[i * 4 + 2] = 242;
    data[i * 4 + 3] = 255;
  }

  // Paint a warm cream/sand blazer block in the center (x=5..10, y=4..8) -> (230, 220, 198) where R-B = 32
  for (let y = 4; y <= 8; y++) {
    for (let x = 5; x <= 10; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 230;
      data[idx + 1] = 220;
      data[idx + 2] = 198;
      data[idx + 3] = 255;
    }
  }

  // Paint dark charcoal trousers below (x=5..10, y=9..13) -> (45, 48, 52)
  for (let y = 9; y <= 13; y++) {
    for (let x = 5; x <= 10; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 45;
      data[idx + 1] = 48;
      data[idx + 2] = 52;
      data[idx + 3] = 255;
    }
  }

  const res = keyOutStudioBackdropFromRgba(data, width, height);
  assert.equal(res.isStudioBackdropDetected, true);
  assert.ok(res.keyedPixelsCount > 100);

  // Border pixel (0, 0) should be keyed out to transparent (alpha = 0)
  assert.equal(data[3], 0);

  // Interior of warm cream blazer (7, 6) should remain 100% opaque (alpha = 255)
  const blazerCenterIdx = (6 * width + 7) * 4;
  assert.equal(data[blazerCenterIdx + 3], 255);

  // Interior of charcoal trousers (7, 11) should remain 100% opaque (alpha = 255)
  const trouserCenterIdx = (11 * width + 7) * 4;
  assert.equal(data[trouserCenterIdx + 3], 255);
});

test('keyOutStudioBackdropFromRgba keys out studio backdrop even when surrounded by transparent canvas margins', () => {
  const width = 20;
  const height = 20;
  const data = new Uint8ClampedArray(width * height * 4);
  // Leave a 2px transparent border around (x=2..17, y=2..17)
  for (let y = 2; y <= 17; y++) {
    for (let x = 2; x <= 17; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 228;
      data[idx + 1] = 228;
      data[idx + 2] = 228;
      data[idx + 3] = 255;
    }
  }
  // Warm cream blazer in center (x=7..12, y=6..14)
  for (let y = 6; y <= 14; y++) {
    for (let x = 7; x <= 12; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 215;
      data[idx + 1] = 208;
      data[idx + 2] = 192;
      data[idx + 3] = 255;
    }
  }

  const res = keyOutStudioBackdropFromRgba(data, width, height);
  assert.equal(res.isStudioBackdropDetected, true);
  assert.ok(res.keyedPixelsCount > 100);
  // Studio backdrop inside opaque region (3, 3) should now be transparent (alpha = 0)
  assert.equal(data[(3 * width + 3) * 4 + 3], 0);
  // Warm cream blazer interior (9, 9) should remain opaque (alpha = 255)
  assert.equal(data[(9 * width + 9) * 4 + 3], 255);
});

test('computeMannequinVerticalLockCameraSpec locks polar angle, pan, and zoom when verticalLocked is true', () => {
  const lockedSpec = computeMannequinVerticalLockCameraSpec({
    verticalLocked: true,
    statureScaleY: 1.0,
    isDockCollapsed: false,
  });
  assert.equal(lockedSpec.minPolarAngle, lockedSpec.maxPolarAngle);
  assert.equal(lockedSpec.enablePan, false);
  assert.equal(lockedSpec.enableZoom, false);
  assert.equal(lockedSpec.minDistance, lockedSpec.maxDistance);
  assert.ok(lockedSpec.minPolarAngle > 1.5 && lockedSpec.minPolarAngle < Math.PI / 2);

  const unlockedSpec = computeMannequinVerticalLockCameraSpec({
    verticalLocked: false,
    statureScaleY: 1.0,
    isDockCollapsed: false,
  });
  assert.ok(unlockedSpec.maxPolarAngle > unlockedSpec.minPolarAngle);
  assert.equal(unlockedSpec.enablePan, true);
  assert.equal(unlockedSpec.enableZoom, true);
});



