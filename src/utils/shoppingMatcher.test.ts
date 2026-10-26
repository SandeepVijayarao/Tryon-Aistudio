import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeShopifyVariantSize,
  inferCutAndFabric,
  normalizeShopifyProduct,
  filterAndRankProducts,
  evaluateProductFitForUser,
} from './shoppingMatcher.ts';
import { BodyMeasurements } from '../types/tryon.ts';

test('normalizeShopifyVariantSize maps standard and chest-inch labels to XS-XL', () => {
  assert.equal(normalizeShopifyVariantSize('XS - 36'), 'XS');
  assert.equal(normalizeShopifyVariantSize('S - 38'), 'S');
  assert.equal(normalizeShopifyVariantSize('M - 40'), 'M');
  assert.equal(normalizeShopifyVariantSize('L - 42'), 'L');
  assert.equal(normalizeShopifyVariantSize('XL - 44'), 'XL');
  assert.equal(normalizeShopifyVariantSize('40 / 32 / R'), 'M');
  assert.equal(normalizeShopifyVariantSize('One Size'), null);
});

test('inferCutAndFabric detects overshirts, knitwear, and tailored blazers', () => {
  const overshirt = inferCutAndFabric('The Pacific Overshirt in Hemp', 'Wovens', []);
  assert.equal(overshirt.cut, 'relaxed');
  assert.equal(overshirt.fabric, 'woven');

  const sweater = inferCutAndFabric('The Sunset Crew in Heather Oat Terry', 'Knits', []);
  assert.equal(sweater.fabric, 'stretch_knit');

  const slimSuit = inferCutAndFabric('Tailored Suit Blazer', 'Outerwear', ['slim']);
  assert.equal(slimSuit.cut, 'slim');
});

test('normalizeShopifyProduct filters out sold-out products and keeps available garments', () => {
  const soldOutProduct = {
    id: 101,
    title: 'Tailored Birdseye Wool Suit',
    handle: 'birdseye-suit',
    product_type: 'Outerwear',
    variants: [
      { title: 'S - 38', available: false, price: '635.00' },
      { title: 'M - 40', available: false, price: '635.00' },
    ],
    images: [{ src: 'https://cdn.shopify.com/front.jpg' }],
  };

  assert.equal(
    normalizeShopifyProduct(soldOutProduct, 'https://www.percivalclo.com', 'Percival London'),
    null
  );

  const availableProduct = {
    id: 202,
    title: 'The Pacific Overshirt in Bay Leaf Hemp Canvas',
    handle: 'pacific-overshirt',
    product_type: 'Wovens',
    variants: [
      { title: 'S - 38', available: false, price: '188.00' },
      { title: 'M - 40', available: true, price: '188.00' },
      { title: 'L - 42', available: true, price: '188.00' },
    ],
    images: [
      { src: 'https://cdn.shopify.com/front.jpg' },
      { src: 'https://cdn.shopify.com/back.jpg' },
    ],
  };

  const normalized = normalizeShopifyProduct(
    availableProduct,
    'https://www.taylorstitch.com',
    'Taylor Stitch'
  );
  assert.ok(normalized);
  assert.equal(normalized.available, true);
  assert.deepEqual(normalized.availableSizes, ['M', 'L']);
  assert.equal(normalized.frontImage, 'https://cdn.shopify.com/front.jpg');
  assert.equal(normalized.backImage, 'https://cdn.shopify.com/back.jpg');
});

test('filterAndRankProducts and evaluateProductFitForUser match query and verify true size stock', () => {
  const p1 = normalizeShopifyProduct(
    {
      id: 1,
      title: 'The Pacific Overshirt in Bay Leaf Hemp Canvas',
      handle: 'pacific-overshirt',
      product_type: 'Overshirts',
      variants: [
        { title: 'M - 40', available: true, price: '188.00' },
        { title: 'L - 42', available: true, price: '188.00' },
      ],
      images: [{ src: 'https://cdn.shopify.com/1.jpg' }],
    },
    'https://www.taylorstitch.com',
    'Taylor Stitch'
  )!;

  const ranked = filterAndRankProducts([p1], 'hemp overshirt');
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].title, 'The Pacific Overshirt in Bay Leaf Hemp Canvas');

  const shopperMeasurements: BodyMeasurements = {
    chest: 99,
    waist: 95,
    hip: 93,
    chestSource: 'side photo',
    waistSource: 'side photo',
    hipSource: 'side photo',
    confidence: 0.96,
    uncertaintyCm: 6,
  };

  const fitEval = evaluateProductFitForUser(p1, shopperMeasurements);
  assert.ok(fitEval.trueSize);
  assert.equal(fitEval.trueSizeInStock, true);
});
