import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeColorHarmonyScore,
  computeGaussianFitScore,
  computeUserTasteProfile,
  encodeShopProductVector,
  evaluateCompleteOutfitHarmony,
  evaluateWardrobeSynergyAndGap,
  inferColorFamily,
  rankShopCatalogForUser,
  scoreShopProductForUser,
} from './recommendationEngine.ts';
import { DEFAULT_EXISTING_WARDROBE } from './wardrobeStyler.ts';
import { DEFAULT_SIZE_CHART } from './fitMath.ts';
import { BodyMeasurements, ShoppingProduct } from '../types/tryon.ts';

const MOCK_USER_MEASUREMENTS: BodyMeasurements = {
  chest: 99,
  waist: 95,
  hip: 93,
  chestSource: 'side photo',
  waistSource: 'side photo',
  hipSource: 'side photo',
  confidence: 0.96,
  uncertaintyCm: 5,
};

const SAMPLE_CATALOG: ShoppingProduct[] = [
  {
    id: 'ts-hemp-overshirt',
    title: 'The Pacific Overshirt in Bay Leaf Olive Hemp',
    brand: 'Taylor Stitch',
    category: 'Overshirts',
    price: '188.00',
    currency: 'USD',
    productUrl: 'https://www.taylorstitch.com/products/pacific-overshirt',
    frontImage: '/img1.jpg',
    backImage: '/img1-b.jpg',
    cut: 'relaxed',
    fabric: 'woven',
    details: 'Tactile organic hemp canvas overshirt with chest pockets',
    available: true,
    availableSizes: ['S', 'M', 'L', 'XL'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
  {
    id: 'ts-hemp-overshirt-clone',
    title: 'The Utility Overshirt in Olive Moss Hemp',
    brand: 'Taylor Stitch',
    category: 'Overshirts',
    price: '185.00',
    currency: 'USD',
    productUrl: 'https://www.taylorstitch.com/products/utility-overshirt',
    frontImage: '/img2.jpg',
    backImage: '/img2-b.jpg',
    cut: 'relaxed',
    fabric: 'woven',
    details: 'Tactile organic hemp canvas overshirt in olive green',
    available: true,
    availableSizes: ['S', 'M', 'L', 'XL'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
  {
    id: 'kotn-merino-crew',
    title: 'Fine Merino Ribbed Crewneck Sweater in Navy Indigo',
    brand: 'Kotn',
    category: 'Knitwear',
    price: '128.00',
    currency: 'USD',
    productUrl: 'https://kotn.com/products/merino-crew',
    frontImage: '/img3.jpg',
    backImage: '/img3-b.jpg',
    cut: 'regular',
    fabric: 'stretch_knit',
    details: 'Breathable stretch merino knit sweater ideal for layering under blazers',
    available: true,
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
  {
    id: 'zara-duplicate-blazer',
    title: 'Comfort Suit Blazer (Ref. 4456/999)',
    brand: 'ZARA',
    category: 'Blazer',
    price: '169.00',
    currency: 'USD',
    productUrl: DEFAULT_EXISTING_WARDROBE[0].garmentUrl || 'https://www.zara.com/blazer',
    frontImage: '/img4.jpg',
    backImage: '/img4-b.jpg',
    cut: 'regular',
    fabric: 'stretch_knit',
    details: 'Unstructured ecru stone blazer',
    available: true,
    availableSizes: ['S', 'M', 'L'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
  {
    id: 'out-of-true-size-shirt',
    title: 'Slim Oxford Shirt in White',
    brand: 'Percival London',
    category: 'Shirts',
    price: '145.00',
    currency: 'USD',
    productUrl: 'https://www.percivalclo.com/products/slim-oxford',
    frontImage: '/img5.jpg',
    backImage: '/img5-b.jpg',
    cut: 'slim',
    fabric: 'woven',
    details: 'Crisp cotton poplin slim shirt',
    available: true,
    availableSizes: ['XS'], // Only XS available, too small for 99cm chest / 95cm waist
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
];

test('inferColorFamily and computeColorHarmonyScore evaluate sartorial color pairings accurately', () => {
  assert.equal(inferColorFamily('Light Ecru / Stone Blazer'), 'ecru_stone');
  assert.equal(inferColorFamily('Bay Leaf Olive Hemp'), 'olive_sage');
  assert.equal(inferColorFamily('Deep Charcoal Wool Trousers'), 'charcoal_slate');

  const ecruOlive = computeColorHarmonyScore('ecru_stone', 'olive_sage');
  assert.ok(ecruOlive >= 0.95);
});

test('computeGaussianFitScore ranks in-stock true-size garments significantly higher than out-of-true-size items', () => {
  const goodFit = computeGaussianFitScore(SAMPLE_CATALOG[0], MOCK_USER_MEASUREMENTS);
  const badStockFit = computeGaussianFitScore(SAMPLE_CATALOG[4], MOCK_USER_MEASUREMENTS);

  assert.equal(goodFit.trueSizeInStock, true);
  assert.equal(badStockFit.trueSizeInStock, false);
  assert.ok(
    goodFit.fitScore > badStockFit.fitScore + 15,
    `Expected in-stock true-size score (${goodFit.fitScore}) > out-of-stock score (${badStockFit.fitScore})`
  );
});

test('evaluateWardrobeSynergyAndGap penalizes owned closet duplicates and rewards high outfit multipliers', () => {
  const complementaryKnit = evaluateWardrobeSynergyAndGap(
    SAMPLE_CATALOG[2],
    DEFAULT_EXISTING_WARDROBE
  );
  const duplicateBlazer = evaluateWardrobeSynergyAndGap(
    SAMPLE_CATALOG[3],
    DEFAULT_EXISTING_WARDROBE
  );

  assert.ok(
    complementaryKnit.wardrobeGapScore > duplicateBlazer.wardrobeGapScore + 25,
    `Expected complementary knit gap score (${complementaryKnit.wardrobeGapScore}) > duplicate blazer (${duplicateBlazer.wardrobeGapScore})`
  );
  assert.ok(complementaryKnit.unlockedOutfitsCount >= 3);
});

test('Spotify-style real-time feedback loop shifts Taste DNA and filters dismissed items', () => {
  const now = Date.now();
  const initialRank = rankShopCatalogForUser(
    SAMPLE_CATALOG,
    MOCK_USER_MEASUREMENTS,
    DEFAULT_EXISTING_WARDROBE,
    []
  );
  assert.equal(initialRank.ranked.length, 5);

  const kotnVec = encodeShopProductVector(SAMPLE_CATALOG[2]);
  const feedbackEvents = [
    {
      itemId: 'kotn-merino-crew',
      action: 'super_like' as const,
      timestampMs: now,
      vector: kotnVec,
      brand: 'Kotn',
      category: 'Knitwear',
    },
    {
      itemId: 'ts-hemp-overshirt-clone',
      action: 'dismiss' as const,
      timestampMs: now,
      vector: encodeShopProductVector(SAMPLE_CATALOG[1]),
      brand: 'Taylor Stitch',
      category: 'Overshirts',
    },
  ];

  const updatedRank = rankShopCatalogForUser(
    SAMPLE_CATALOG,
    MOCK_USER_MEASUREMENTS,
    DEFAULT_EXISTING_WARDROBE,
    feedbackEvents
  );

  // Dismissed item is filtered out
  assert.equal(
    updatedRank.ranked.some((r) => r.product.id === 'ts-hemp-overshirt-clone'),
    false
  );

  // Super-liked item is marked liked and boosted
  const likedEntry = updatedRank.ranked.find((r) => r.product.id === 'kotn-merino-crew');
  assert.ok(likedEntry);
  assert.equal(likedEntry.isLiked, true);
  assert.equal(updatedRank.tasteProfile.feedbackCount, 2);
});

test('MMR diversity re-ranking prevents consecutive identical brand+category clones at the top of the feed', () => {
  const { ranked } = rankShopCatalogForUser(
    SAMPLE_CATALOG.slice(0, 3), // 2 near-identical Taylor Stitch olive hemp overshirts + 1 Kotn merino crew
    MOCK_USER_MEASUREMENTS,
    DEFAULT_EXISTING_WARDROBE,
    [],
    { mmrLambda: 0.65 }
  );

  assert.equal(ranked.length, 3);
  // Top 2 items should not both be the two identical Taylor Stitch olive hemp overshirts
  const topTwoBrandsAndCats = ranked.slice(0, 2).map((r) => `${r.product.brand}:${r.product.category}`);
  assert.notEqual(
    topTwoBrandsAndCats[0],
    topTwoBrandsAndCats[1],
    'MMR should diversify top-2 results rather than clustering near-identical overshirts'
  );
});

test('evaluateCompleteOutfitHarmony verifies outer-over-inner layering ease physics', () => {
  const taste = computeUserTasteProfile(DEFAULT_EXISTING_WARDROBE);
  const shopRec = scoreShopProductForUser(
    SAMPLE_CATALOG[0],
    MOCK_USER_MEASUREMENTS,
    DEFAULT_EXISTING_WARDROBE,
    taste
  );

  const goodLayering = evaluateCompleteOutfitHarmony({
    topTitle: 'The Pacific Overshirt in Olive Hemp',
    topBrand: 'Taylor Stitch',
    topChestEaseCm: 10,
    layeringTitle: 'Heavyweight White Supima Tee',
    layeringBrand: 'Kotn',
    layeringChestEaseCm: 4,
    bottomTitle: 'Tailored Pleated Charcoal Trousers',
    watchTitle: '40mm Chronograph',
    shoesTitle: 'Espresso Suede Loafers',
    shopRec,
  });

  const bunchedLayering = evaluateCompleteOutfitHarmony({
    topTitle: 'Slim Shirt',
    topBrand: 'Percival',
    topChestEaseCm: 2,
    layeringTitle: 'Oversized Heavy Sweater',
    layeringBrand: 'Corridor',
    layeringChestEaseCm: 12,
    bottomTitle: 'Tailored Pleated Charcoal Trousers',
    watchTitle: '40mm Chronograph',
    shoesTitle: 'Espresso Suede Loafers',
    shopRec,
  });

  assert.ok(goodLayering.layeringPhysicsScore > bunchedLayering.layeringPhysicsScore + 20);
  assert.ok(goodLayering.totalMatchScore > bunchedLayering.totalMatchScore);
});
