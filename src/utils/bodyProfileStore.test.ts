import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReusableBodyProfile,
  fitGarmentWithSavedProfile,
  batchFitCatalogWithSavedProfile,
  getGarmentSpinCacheKey,
} from './bodyProfileStore.ts';
import { DEMO_PRESETS } from './demoPresets.ts';
import { ShoppingProduct } from '../types/tryon.ts';

test('buildReusableBodyProfile calibrates once and recalculates overrides with zero vision calls', () => {
  const preset = DEMO_PRESETS[0];
  const profile = buildReusableBodyProfile({
    heightCm: preset.heightCm,
    frontLandmarks: preset.frontLandmarks,
    backLandmarks: preset.backLandmarks,
    sideLandmarks: preset.sideLandmarks,
  });

  assert.equal(profile.measurements.chest, 99);
  assert.equal(profile.measurements.waist, 95);
  assert.equal(profile.measurements.hip, 93);
  assert.equal(profile.measurements.uncertaintyCm, 6);

  // Override chest/waist/hip without re-running landmark extraction
  const updatedProfile = buildReusableBodyProfile({
    ...profile,
    overrideChest: 104,
    overrideWaist: 92,
    overrideHip: 96,
  });
  assert.equal(updatedProfile.measurements.chest, 104);
  assert.equal(updatedProfile.measurements.chestSource, 'you entered');
  assert.equal(updatedProfile.measurements.uncertaintyCm, 4);
});

test('fitGarmentWithSavedProfile and batchFitCatalogWithSavedProfile fit multiple garments instantly', () => {
  const preset = DEMO_PRESETS[0];
  const profile = buildReusableBodyProfile({
    heightCm: preset.heightCm,
    frontLandmarks: preset.frontLandmarks,
    backLandmarks: preset.backLandmarks,
    sideLandmarks: preset.sideLandmarks,
  });

  const mockProducts: ShoppingProduct[] = [
    {
      id: 'zara-blazer',
      title: 'Comfort Suit Blazer',
      brand: 'ZARA',
      price: '$129.00',
      currency: 'USD',
      productUrl: 'https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html',
      frontImage: '/front.jpg',
      backImage: '/back.jpg',
      category: 'Blazer',
      cut: 'regular',
      fabric: 'stretch_knit',
      available: true,
      availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
      variants: [],
      sizeChart: preset.sizeChart,
      details: 'Bi-stretch blazer',
      apiSource: 'zara-catalog-feed',
      verifiedAt: '2026-10-25T00:00:00Z',
    },
    {
      id: 'slim-shirt',
      title: 'Tailored Poplin Shirt',
      brand: 'Percival London',
      price: '$140.00',
      currency: 'USD',
      productUrl: 'https://www.percivalclo.com/products/shirt',
      frontImage: '/shirt.jpg',
      backImage: '/shirt-back.jpg',
      category: 'Shirt',
      cut: 'slim',
      fabric: 'woven',
      available: true,
      availableSizes: ['M', 'L', 'XL'],
      variants: [],
      sizeChart: [
        { size: 'XS', chest: 86, waist: 74, hip: 88 },
        { size: 'S', chest: 92, waist: 80, hip: 94 },
        { size: 'M', chest: 98, waist: 86, hip: 100 },
        { size: 'L', chest: 104, waist: 96, hip: 106 },
        { size: 'XL', chest: 112, waist: 104, hip: 112 },
      ],
      details: 'Crisp woven poplin',
      apiSource: 'shopify-storefront-api',
      verifiedAt: '2026-10-25T00:00:00Z',
    },
  ];

  const batchResults = batchFitCatalogWithSavedProfile(profile, mockProducts);
  assert.equal(batchResults['zara-blazer'].trueSize, 'M');
  // For the slim woven shirt (cut allowance 0), M has waist 86 (< 95), while L has chest 104 (>=99) and waist 96 (>=95)
  assert.equal(batchResults['slim-shirt'].trueSize, 'L');

  const singleFit = fitGarmentWithSavedProfile(profile, mockProducts[1]);
  assert.equal(singleFit.trueSize, 'L');
});

test('getGarmentSpinCacheKey namespaces spin caches per garment and size', () => {
  const key1 = getGarmentSpinCacheKey('zara-comfort-suit-blazer', 'M');
  const key2 = getGarmentSpinCacheKey('taylor-stitch-overshirt', 'M');
  assert.notEqual(key1, key2);
  assert.equal(key1, 'zara-comfort-suit-blazer__M');
});
