import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShoppingProductFromExtracted,
  buildSizeSpecificProductUrl,
  inferBrandFromUrl,
  isDirectProductUrl,
  normalizeProductUrl,
  parseHtmlProductMetadata,
  resolveShopifyJsonEndpoint,
} from './productLinkFetcher.ts';
import { DEFAULT_SIZE_CHART } from './fitMath.ts';
import { ShoppingProduct } from '../types/tryon.ts';

test('isDirectProductUrl and normalizeProductUrl clean tracking parameters and collection paths', () => {
  assert.equal(
    isDirectProductUrl('https://www.taylorstitch.com/products/the-ojai-jacket-in-olive'),
    true
  );
  assert.equal(
    isDirectProductUrl('taylorstitch.com/collections/mens-outerwear/products/ojai-jacket'),
    true
  );
  assert.equal(isDirectProductUrl('relaxed hemp overshirt for dinner'), false);

  const cleaned = normalizeProductUrl(
    'https://www.taylorstitch.com/collections/mens-outerwear/products/the-ojai-jacket?utm_source=ig&fbclid=12345&variant=998877'
  );
  assert.equal(
    cleaned,
    'https://www.taylorstitch.com/products/the-ojai-jacket?variant=998877'
  );

  const jsonUrl = resolveShopifyJsonEndpoint(cleaned);
  assert.equal(
    jsonUrl,
    'https://www.taylorstitch.com/products/the-ojai-jacket.json'
  );
  assert.equal(inferBrandFromUrl(cleaned), 'Taylor Stitch');
});

test('buildSizeSpecificProductUrl links directly to the user True Size variant ID', () => {
  const sampleProduct: ShoppingProduct = {
    id: 'ts-shore-shirt',
    title: 'The Shore Shirt in Midnight Check Wool',
    brand: 'Taylor Stitch',
    category: 'Overshirts',
    price: '168.00',
    currency: 'USD',
    productUrl: 'https://www.taylorstitch.com/products/shore-shirt-midnight-check',
    frontImage: '/front.jpg',
    backImage: '/back.jpg',
    cut: 'regular',
    fabric: 'woven',
    details: 'Wool overshirt',
    available: true,
    availableSizes: ['M', 'L'],
    variants: [
      {
        size: 'M',
        rawTitle: 'M - 40',
        available: true,
        price: '168.00',
        variantId: '41001122',
        variantUrl: 'https://www.taylorstitch.com/products/shore-shirt-midnight-check?variant=41001122',
      },
      {
        size: 'L',
        rawTitle: 'L - 42',
        available: true,
        price: '168.00',
        variantId: '41001133',
        variantUrl: 'https://www.taylorstitch.com/products/shore-shirt-midnight-check?variant=41001133',
      },
    ],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'shopify',
    verifiedAt: '2026-10-25T00:00:00Z',
  };

  const sizeLUrl = buildSizeSpecificProductUrl(sampleProduct, 'L');
  assert.equal(
    sizeLUrl,
    'https://www.taylorstitch.com/products/shore-shirt-midnight-check?variant=41001133'
  );
});

test('parseHtmlProductMetadata extracts JSON-LD Product schema, OpenGraph tags, images, and stock variants', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relaxed Linen Chore Jacket | Percival London</title>
        <meta property="og:title" content="Relaxed Linen Chore Jacket" />
        <meta property="og:image" content="https://cdn.percivalclo.com/chore-front.jpg" />
        <meta property="product:price:amount" content="215.00" />
        <meta property="product:price:currency" content="USD" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Relaxed Linen Chore Jacket in Sage",
            "brand": { "@type": "Brand", "name": "Percival London" },
            "description": "Breathable 100% organic linen relaxed chore jacket with patch pockets.",
            "sku": "PERC-CHORE-01",
            "image": [
              "https://cdn.percivalclo.com/chore-front.jpg",
              "https://cdn.percivalclo.com/chore-back.jpg"
            ],
            "offers": [
              {
                "@type": "Offer",
                "name": "S - 38",
                "price": "215.00",
                "priceCurrency": "USD",
                "availability": "https://schema.org/OutOfStock"
              },
              {
                "@type": "Offer",
                "name": "M - 40",
                "price": "215.00",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "url": "https://www.percivalclo.com/products/linen-chore-sage?variant=5511"
              },
              {
                "@type": "Offer",
                "name": "L - 42",
                "price": "215.00",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "url": "https://www.percivalclo.com/products/linen-chore-sage?variant=5522"
              }
            ]
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const extracted = parseHtmlProductMetadata(
    sampleHtml,
    'https://www.percivalclo.com/products/linen-chore-sage?utm_source=newsletter'
  );
  assert.ok(extracted);
  assert.equal(extracted.title, 'Relaxed Linen Chore Jacket in Sage');
  assert.equal(extracted.brand, 'Percival London');
  assert.equal(extracted.price, '215.00');
  assert.equal(extracted.frontImage, 'https://cdn.percivalclo.com/chore-front.jpg');
  assert.equal(extracted.backImage, 'https://cdn.percivalclo.com/chore-back.jpg');
  assert.deepEqual(extracted.availableSizes, ['M', 'L']);
  assert.equal(extracted.extractionMethod, 'hybrid');

  const shoppingProduct = buildShoppingProductFromExtracted(extracted);
  assert.equal(shoppingProduct.cut, 'relaxed');
  assert.equal(shoppingProduct.fabric, 'woven');
  assert.equal(
    buildSizeSpecificProductUrl(shoppingProduct, 'M'),
    'https://www.percivalclo.com/products/linen-chore-sage?variant=5511'
  );
});
