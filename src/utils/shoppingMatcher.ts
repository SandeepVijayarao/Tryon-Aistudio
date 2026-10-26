import {
  BodyMeasurements,
  CutType,
  FabricType,
  FitAnalysis,
  ShoppingProduct,
  ShoppingVariantStock,
  SizeChartEntry,
} from '../types/tryon.ts';
import { analyzeFit } from './fitMath.ts';

const EXCLUDED_PRODUCT_KEYWORDS = [
  'cap',
  'hat',
  'beanie',
  'sock',
  'shoe',
  'boot',
  'sneaker',
  'loafer',
  'belt',
  'wallet',
  'bag',
  'tote',
  'towel',
  'comforter',
  'duvet',
  'sheet',
  'pillow',
  'gift card',
  'candle',
];

export function isUpperOrFullGarment(title: string, productType: string): boolean {
  const combined = `${title} ${productType}`.toLowerCase();
  for (const excluded of EXCLUDED_PRODUCT_KEYWORDS) {
    if (combined.includes(excluded)) return false;
  }
  if (
    combined.includes('pant') ||
    combined.includes('trouser') ||
    combined.includes('jean') ||
    combined.includes('short') ||
    combined.includes('chino')
  ) {
    return false;
  }
  return true;
}

export function normalizeShopifyVariantSize(rawTitle: string): string | null {
  if (!rawTitle) return null;
  const clean = rawTitle.trim().toUpperCase();

  // Direct letter sizes or prefixes like "XS - 36", "S - 38", "M / Regular"
  if (/^XS(\b|\s|-|\/)/.test(clean) || clean === 'EXTRA SMALL' || clean === 'X-SMALL') return 'XS';
  if (/^S(\b|\s|-|\/)/.test(clean) || clean === 'SMALL') return 'S';
  if (/^M(\b|\s|-|\/)/.test(clean) || clean === 'MEDIUM') return 'M';
  if (/^L(\b|\s|-|\/)/.test(clean) || clean === 'LARGE') return 'L';
  if (/^XL(\b|\s|-|\/)/.test(clean) || clean === 'EXTRA LARGE' || clean === 'X-LARGE') return 'XL';

  // Chest inch sizes common in blazers/suits: 34/36 -> XS, 38 -> S, 40 -> M, 42 -> L, 44 -> XL
  if (/^(34|36)(\b|\s|\/)/.test(clean)) return 'XS';
  if (/^38(\b|\s|\/)/.test(clean)) return 'S';
  if (/^40(\b|\s|\/)/.test(clean)) return 'M';
  if (/^42(\b|\s|\/)/.test(clean)) return 'L';
  if (/^(44|46)(\b|\s|\/)/.test(clean)) return 'XL';

  return null;
}

export function inferCutAndFabric(
  title: string,
  productType: string,
  tags: string[] = [],
  bodyHtml = ''
): { cut: CutType; fabric: FabricType } {
  const headerText = `${title} ${productType} ${tags.join(' ')}`.toLowerCase();
  const fullText = `${headerText} ${bodyHtml}`.toLowerCase();

  let cut: CutType = 'regular';
  if (headerText.includes('oversized') || headerText.includes('boxy')) {
    cut = 'oversized';
  } else if (
    headerText.includes('relaxed') ||
    headerText.includes('overshirt') ||
    headerText.includes('chore') ||
    headerText.includes('easy fit')
  ) {
    cut = 'relaxed';
  } else if (headerText.includes('slim') || headerText.includes('tailored')) {
    cut = 'slim';
  }

  let fabric: FabricType = 'woven';
  if (
    fullText.includes('knit') ||
    fullText.includes('terry') ||
    fullText.includes('jersey') ||
    fullText.includes('sweater') ||
    fullText.includes('cardigan') ||
    fullText.includes('stretch') ||
    fullText.includes('merino') ||
    fullText.includes('fleece') ||
    fullText.includes('polo') ||
    fullText.includes('tee') ||
    fullText.includes('t-shirt')
  ) {
    fabric = 'stretch_knit';
  }

  return { cut, fabric };
}

export function buildSizeChartForBrand(brand: string, cut: CutType): SizeChartEntry[] {
  const b = brand.toLowerCase();
  // Taylor Stitch uses chest 36 (XS=91cm), 38 (S=96cm), 40 (M=102cm), 42 (L=107cm), 44 (XL=112cm)
  if (b.includes('taylor stitch')) {
    return [
      { size: 'XS', chest: 91, waist: 79, hip: 93 },
      { size: 'S', chest: 96, waist: 84, hip: 98 },
      { size: 'M', chest: 102, waist: 89, hip: 103 },
      { size: 'L', chest: 107, waist: 94, hip: 108 },
      { size: 'XL', chest: 112, waist: 99, hip: 113 },
    ];
  }

  // Percival London / European tailored sizing
  if (b.includes('percival') || b.includes('zara')) {
    return [
      { size: 'XS', chest: 88, waist: 76, hip: 90 },
      { size: 'S', chest: 94, waist: 82, hip: 96 },
      { size: 'M', chest: 100, waist: 88, hip: 102 },
      { size: 'L', chest: 106, waist: 94, hip: 108 },
      { size: 'XL', chest: 112, waist: 100, hip: 114 },
    ];
  }

  // Relaxed / contemporary menswear (Corridor, Kotn, etc.)
  const offset = cut === 'oversized' ? 4 : cut === 'relaxed' ? 2 : 0;
  return [
    { size: 'XS', chest: 88 + offset, waist: 74 + offset, hip: 92 + offset },
    { size: 'S', chest: 94 + offset, waist: 80 + offset, hip: 98 + offset },
    { size: 'M', chest: 100 + offset, waist: 86 + offset, hip: 104 + offset },
    { size: 'L', chest: 106 + offset, waist: 92 + offset, hip: 110 + offset },
    { size: 'XL', chest: 112 + offset, waist: 98 + offset, hip: 116 + offset },
  ];
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

export function normalizeShopifyProduct(
  rawProduct: any,
  storeBaseUrl: string,
  brandName: string
): ShoppingProduct | null {
  if (!rawProduct || !rawProduct.title || !rawProduct.handle) return null;

  const title = String(rawProduct.title).trim();
  const productType = String(rawProduct.product_type || 'Apparel').trim();
  if (!isUpperOrFullGarment(title, productType)) {
    return null;
  }

  const rawVariants = Array.isArray(rawProduct.variants) ? rawProduct.variants : [];
  const sizeMap = new Map<string, ShoppingVariantStock>();
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];

  for (const v of rawVariants) {
    const normSize = normalizeShopifyVariantSize(String(v.title || v.option1 || ''));
    if (!normSize) continue;
    const isAvail = Boolean(v.available);
    const existing = sizeMap.get(normSize);
    // If multiple variants map to the same size (e.g. Short/Regular length), mark available if any is available
    if (!existing || (!existing.available && isAvail)) {
      sizeMap.set(normSize, {
        size: normSize,
        rawTitle: String(v.title || normSize),
        available: isAvail,
        price: String(v.price || '0.00'),
        sku: v.sku ? String(v.sku) : undefined,
      });
    }
  }

  const variants: ShoppingVariantStock[] = sizeOrder
    .map((sz) => sizeMap.get(sz))
    .filter((v): v is ShoppingVariantStock => Boolean(v));

  const availableSizes = variants.filter((v) => v.available).map((v) => v.size);

  // Strict requirement: only include products that are genuinely available in stock
  if (availableSizes.length === 0) {
    return null;
  }

  const images = Array.isArray(rawProduct.images) ? rawProduct.images : [];
  const frontImage = images[0]?.src ? String(images[0].src) : '';
  const backImage = images[1]?.src ? String(images[1].src) : frontImage;
  if (!frontImage) return null;

  const tags = Array.isArray(rawProduct.tags)
    ? rawProduct.tags.map(String)
    : typeof rawProduct.tags === 'string'
      ? rawProduct.tags.split(',').map((t: string) => t.trim())
      : [];

  const bodyHtml = String(rawProduct.body_html || '');
  const { cut, fabric } = inferCutAndFabric(title, productType, tags, bodyHtml);
  const sizeChart = buildSizeChartForBrand(brandName, cut);
  const cleanDetails =
    stripHtmlTags(bodyHtml) ||
    `${brandName} ${title} (${productType}). Cut: ${cut}, Fabric: ${fabric.replace('_', ' ')}.`;

  const cleanBase = storeBaseUrl.replace(/\/$/, '');

  return {
    id: `${brandName.toLowerCase().replace(/\s+/g, '-')}-${rawProduct.id || rawProduct.handle}`,
    title,
    brand: brandName,
    category: productType || 'Tops & Outerwear',
    price: variants[0]?.price || '148.00',
    currency: 'USD',
    productUrl: `${cleanBase}/products/${rawProduct.handle}`,
    frontImage,
    backImage,
    cut,
    fabric,
    details: cleanDetails,
    available: true,
    availableSizes,
    variants,
    sizeChart,
    apiSource: `${cleanBase}/products.json`,
    verifiedAt: new Date().toISOString(),
  };
}

export function filterAndRankProducts(
  products: ShoppingProduct[],
  query: string,
  requireAvailable = true
): ShoppingProduct[] {
  const pool = requireAvailable
    ? products.filter((p) => p.available && p.availableSizes.length > 0)
    : products;

  if (!query || !query.trim()) {
    return pool;
  }

  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (tokens.length === 0) return pool;

  const scored = pool.map((product) => {
    const searchable = `${product.title} ${product.brand} ${product.category} ${product.cut} ${product.fabric} ${product.details}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (product.title.toLowerCase().includes(token)) score += 5;
      else if (product.category.toLowerCase().includes(token)) score += 3;
      else if (searchable.includes(token)) score += 2;
    }
    return { product, score };
  });

  const matched = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (matched.length > 0) {
    return matched.map((m) => m.product);
  }

  return pool;
}

export function evaluateProductFitForUser(
  product: ShoppingProduct,
  measurements: BodyMeasurements
): {
  trueSize: string | null;
  trueSizeInStock: boolean;
  fitAnalysis: FitAnalysis;
} {
  const fitAnalysis = analyzeFit({
    measurements,
    sizeChart: product.sizeChart,
    cut: product.cut,
    fabric: product.fabric,
  });

  const trueSize = fitAnalysis.trueSize;
  const trueSizeInStock = Boolean(trueSize && product.availableSizes.includes(trueSize));

  return {
    trueSize,
    trueSizeInStock,
    fitAnalysis,
  };
}
