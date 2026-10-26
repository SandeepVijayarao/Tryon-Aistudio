import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EXISTING_WARDROBE,
  buildStyleAndShopPairings,
  findBestWardrobeMatchForProduct,
} from './wardrobeStyler.ts';
import { BodyMeasurements, ShoppingProduct } from '../types/tryon.ts';
import { DEFAULT_SIZE_CHART } from './fitMath.ts';

const MOCK_MEASUREMENTS: BodyMeasurements = {
  chest: 99,
  waist: 95,
  hip: 93,
  chestSource: 'side photo',
  waistSource: 'side photo',
  hipSource: 'side photo',
  confidence: 0.96,
  uncertaintyCm: 6,
};

const MOCK_SHOP_PRODUCTS: ShoppingProduct[] = [
  {
    id: 'ts-pacific-overshirt',
    title: 'The Pacific Overshirt in Hemp',
    brand: 'Taylor Stitch',
    price: '188.00',
    currency: 'USD',
    productUrl: 'https://www.taylorstitch.com/products/pacific-overshirt',
    frontImage: '/front1.jpg',
    backImage: '/back1.jpg',
    category: 'Overshirts',
    cut: 'relaxed',
    fabric: 'woven',
    available: true,
    availableSizes: ['S', 'M', 'L', 'XL'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    details: 'Organic hemp overshirt',
    apiSource: 'shopify-storefront-api',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
  {
    id: 'ts-sunset-crew',
    title: 'The Sunset Crew in Heather Oat Terry',
    brand: 'Taylor Stitch',
    price: '118.00',
    currency: 'USD',
    productUrl: 'https://www.taylorstitch.com/products/sunset-crew',
    frontImage: '/front2.jpg',
    backImage: '/back2.jpg',
    category: 'Knits',
    cut: 'regular',
    fabric: 'stretch_knit',
    available: true,
    availableSizes: ['XS', 'S', 'M', 'L'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    details: 'Loopback organic cotton terry knit',
    apiSource: 'shopify-storefront-api',
    verifiedAt: '2026-10-25T00:00:00Z',
  },
];

test('buildStyleAndShopPairings creates complete 5-piece outfit recommendations (top, layering, bottom, watch, shoes)', () => {
  const pairings = buildStyleAndShopPairings(
    DEFAULT_EXISTING_WARDROBE,
    MOCK_SHOP_PRODUCTS,
    MOCK_MEASUREMENTS,
    'hemp'
  );

  assert.ok(pairings.length >= 2);
  const first = pairings[0];
  assert.equal(first.shopComplement.id, 'ts-pacific-overshirt');
  assert.ok(first.shopTrueSize);
  assert.ok(first.whyItWorks.includes('99 cm chest'));

  // Verify all 5 slots exist and have valid metadata & images
  assert.equal(first.slots.top.slotLabel, 'Top / Outer');
  assert.equal(first.slots.layering.slotLabel, 'Layering (T-Shirt)');
  assert.equal(first.slots.bottom.slotLabel, 'Bottom');
  assert.equal(first.slots.watch.slotLabel, 'Watch');
  assert.equal(first.slots.shoes.slotLabel, 'Shoes');

  assert.ok(first.slots.top.imageUrl.length > 0);
  assert.ok(first.slots.layering.imageUrl.length > 0);
  assert.ok(first.slots.bottom.imageUrl.length > 0);
  assert.ok(first.slots.watch.imageUrl.length > 0);
  assert.ok(first.slots.shoes.imageUrl.length > 0);
  assert.ok(first.slots.bottom.sizeOrSpec.includes('Waist'));
});

test('findBestWardrobeMatchForProduct pairs non-blazers with the user existing blazer', () => {
  const match = findBestWardrobeMatchForProduct(MOCK_SHOP_PRODUCTS[0], DEFAULT_EXISTING_WARDROBE);
  assert.ok(match);
  assert.equal(match.category, 'Blazer');
});
