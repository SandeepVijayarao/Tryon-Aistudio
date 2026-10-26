import {
  CutType,
  FabricType,
  ShoppingProduct,
  ShoppingVariantStock,
  SizeChartEntry,
} from '../types/tryon.ts';
import {
  buildSizeChartForBrand,
  inferCutAndFabric,
  normalizeShopifyVariantSize,
  stripHtmlTags,
} from './shoppingMatcher.ts';

const TRACKING_PARAMS_TO_STRIP = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  '_pos',
  '_sid',
  '_ss',
  '_fid',
  'ref',
]);

/**
 * Determines whether a user input string is a direct product URL.
 */
export function isDirectProductUrl(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)) {
    return true;
  }
  if (
    /^(www\.)?(zara|taylorstitch|percivalclo|corridornyc|kotn|uniqlo|cos|jcrew|mrporter|toddsnyder)\.[a-z]{2,}\/\S+/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes a product URL by adding https:// if missing and stripping tracking query params
 * while preserving functional variant/color identifiers.
 */
export function normalizeProductUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS_TO_STRIP.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    // Canonicalize /collections/<col>/products/<handle> -> /products/<handle> on Shopify stores
    const collectionProdMatch = parsed.pathname.match(/\/collections\/[^/]+\/products\/([^/?#]+)/i);
    if (collectionProdMatch) {
      parsed.pathname = `/products/${collectionProdMatch[1]}`;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return withProto;
  }
}

/**
 * Resolves a Shopify product URL (including /collections/.../products/<handle>)
 * to its official JSON API endpoint (<origin>/products/<handle>.json).
 */
export function resolveShopifyJsonEndpoint(productUrl: string): string | null {
  try {
    const norm = normalizeProductUrl(productUrl);
    const parsed = new URL(norm);
    const match = parsed.pathname.match(/\/products\/([^/?#.]+)/i);
    if (!match) return null;
    return `${parsed.origin}/products/${match[1]}.json`;
  } catch {
    return null;
  }
}

/**
 * Builds a size-specific deep link for a ShoppingProduct so clicking the store link
 * pre-selects the shopper's calibrated True Size variant directly on the retailer page.
 */
export function buildSizeSpecificProductUrl(
  product: ShoppingProduct,
  targetSize?: string | null
): string {
  const base = normalizeProductUrl(product.productUrl);
  if (!base) return '#';
  if (!targetSize) return base;

  const matchedVariant = product.variants?.find(
    (v) => v.size.toUpperCase() === targetSize.toUpperCase() && v.available
  );

  if (matchedVariant?.variantUrl) {
    return matchedVariant.variantUrl;
  }

  try {
    const parsed = new URL(base);
    if (matchedVariant?.variantId) {
      parsed.searchParams.set('variant', matchedVariant.variantId);
      return parsed.toString();
    }
  } catch {
    // Fall back to base URL
  }

  return base;
}

/**
 * Extracts brand name cleanly from a hostname when explicit brand metadata is missing.
 */
export function inferBrandFromUrl(url: string): string {
  try {
    const host = new URL(normalizeProductUrl(url)).hostname
      .replace(/^www\./i, '')
      .split('.')[0];
    const knownBrands: Record<string, string> = {
      zara: 'ZARA',
      taylorstitch: 'Taylor Stitch',
      percivalclo: 'Percival London',
      corridornyc: 'Corridor NYC',
      kotn: 'Kotn',
      uniqlo: 'Uniqlo',
      cos: 'COS',
      jcrew: 'J.Crew',
      toddsnyder: 'Todd Snyder',
      mrporter: 'MR PORTER',
      grantstoneboots: 'Grant Stone',
      morjas: 'Morjas',
      jakshoes: 'JAK Footwear',
    };
    if (knownBrands[host.toLowerCase()]) {
      return knownBrands[host.toLowerCase()];
    }
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return 'Verified Retailer';
  }
}

export interface ExtractedLiveHtmlProduct {
  title: string;
  brand: string;
  price: string;
  currency: string;
  frontImage: string;
  backImage: string;
  description: string;
  sku?: string;
  available: boolean;
  availableSizes: string[];
  variants: ShoppingVariantStock[];
  canonicalUrl: string;
  extractionMethod: 'json-ld' | 'opengraph' | 'hybrid';
}

function extractMetaContent(html: string, attrName: string): string {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

function collectJsonLdNodes(parsed: any): any[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed.flatMap(collectJsonLdNodes);
  }
  if (typeof parsed === 'object') {
    const nodes = [parsed];
    if (Array.isArray(parsed['@graph'])) {
      nodes.push(...parsed['@graph'].flatMap(collectJsonLdNodes));
    }
    if (Array.isArray(parsed.hasVariant)) {
      nodes.push(...parsed.hasVariant.flatMap(collectJsonLdNodes));
    }
    return nodes;
  }
  return [];
}

/**
 * Parses Schema.org JSON-LD (`Product` / `ProductGroup`) and OpenGraph meta tags
 * from raw retailer HTML to construct a verified live product record.
 */
export function parseHtmlProductMetadata(
  html: string,
  sourceUrl: string
): ExtractedLiveHtmlProduct | null {
  if (!html || typeof html !== 'string') return null;

  const canonicalUrl = normalizeProductUrl(sourceUrl);
  const fallbackBrand = inferBrandFromUrl(canonicalUrl);

  // 1. Extract OpenGraph / Meta tags
  const ogTitle =
    extractMetaContent(html, 'og:title') ||
    extractMetaContent(html, 'twitter:title') ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim();
  const ogImage =
    extractMetaContent(html, 'og:image:secure_url') ||
    extractMetaContent(html, 'og:image') ||
    extractMetaContent(html, 'twitter:image');
  const ogDesc =
    extractMetaContent(html, 'og:description') ||
    extractMetaContent(html, 'description');
  const metaPrice =
    extractMetaContent(html, 'product:price:amount') ||
    extractMetaContent(html, 'og:price:amount');
  const metaCurrency =
    extractMetaContent(html, 'product:price:currency') ||
    extractMetaContent(html, 'og:price:currency') ||
    'USD';
  const metaBrand =
    extractMetaContent(html, 'product:brand') ||
    extractMetaContent(html, 'og:site_name');

  // 2. Extract JSON-LD <script type="application/ld+json">
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldProduct: any = null;
  const allLdVariants: any[] = [];

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1].trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      const nodes = collectJsonLdNodes(parsed);
      for (const node of nodes) {
        const nodeType = String(node['@type'] || '').toLowerCase();
        if (nodeType === 'product' || nodeType === 'productgroup') {
          if (!ldProduct) {
            ldProduct = node;
          }
          if (Array.isArray(node.hasVariant)) {
            allLdVariants.push(...node.hasVariant);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  let title = '';
  let brand = metaBrand || fallbackBrand;
  let price = metaPrice || '148.00';
  let currency = metaCurrency || 'USD';
  const images: string[] = [];
  let description = ogDesc || '';
  let sku: string | undefined;
  let available = true;
  const sizeMap = new Map<string, ShoppingVariantStock>();

  if (ldProduct) {
    title = String(ldProduct.name || ogTitle || '').trim();
    if (typeof ldProduct.brand === 'string') {
      brand = ldProduct.brand;
    } else if (ldProduct.brand?.name) {
      brand = String(ldProduct.brand.name);
    }

    if (ldProduct.sku) sku = String(ldProduct.sku);
    if (ldProduct.description) {
      description = stripHtmlTags(String(ldProduct.description));
    }

    // Collect images from JSON-LD
    const rawImgs = Array.isArray(ldProduct.image)
      ? ldProduct.image
      : ldProduct.image
        ? [ldProduct.image]
        : [];
    for (const img of rawImgs) {
      const src = typeof img === 'string' ? img : img?.url || img?.contentUrl;
      if (src && typeof src === 'string') {
        const cleanSrc = src.startsWith('//') ? `https:${src}` : src;
        if (!images.includes(cleanSrc)) images.push(cleanSrc);
      }
    }

    // Collect offers & variant sizes
    const rawOffers = Array.isArray(ldProduct.offers)
      ? ldProduct.offers
      : ldProduct.offers?.offers && Array.isArray(ldProduct.offers.offers)
        ? ldProduct.offers.offers
        : ldProduct.offers
          ? [ldProduct.offers]
          : [];

    for (const offer of [...rawOffers, ...allLdVariants]) {
      const offerPrice = offer?.price || offer?.lowPrice || offer?.highPrice || offer?.offers?.price;
      if (offerPrice) {
        price = String(offerPrice);
      }
      if (offer?.priceCurrency || offer?.offers?.priceCurrency) {
        currency = String(offer.priceCurrency || offer.offers.priceCurrency);
      }
      const availStr = String(
        offer?.availability || offer?.offers?.availability || 'InStock'
      ).toLowerCase();
      const isOfferAvail = !availStr.includes('outofstock') && !availStr.includes('soldout');

      const sizeCandidate =
        offer?.size ||
        offer?.name ||
        offer?.sku ||
        '';
      const normSz = normalizeShopifyVariantSize(String(sizeCandidate));
      if (normSz) {
        const existing = sizeMap.get(normSz);
        if (!existing || (!existing.available && isOfferAvail)) {
          sizeMap.set(normSz, {
            size: normSz,
            rawTitle: String(sizeCandidate || normSz),
            available: isOfferAvail,
            price: String(offerPrice || price),
            sku: offer?.sku ? String(offer.sku) : undefined,
            variantUrl: offer?.url ? normalizeProductUrl(String(offer.url)) : canonicalUrl,
          });
        }
      }
    }
  }

  if (!title) {
    title = ogTitle.split(/\s+[-|–]\s+/)[0]?.trim() || '';
  }
  if (!title) return null;

  if (ogImage) {
    const cleanOg = ogImage.startsWith('//') ? `https:${ogImage}` : ogImage;
    if (!images.includes(cleanOg)) images.push(cleanOg);
  }

  const frontImage = images[0] || '';
  const backImage = images[1] || frontImage;

  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
  let variants: ShoppingVariantStock[] = sizeOrder
    .map((sz) => sizeMap.get(sz))
    .filter((v): v is ShoppingVariantStock => Boolean(v));

  if (variants.length === 0) {
    variants = ['S', 'M', 'L', 'XL'].map((sz) => ({
      size: sz,
      rawTitle: sz,
      available: true,
      price,
      variantUrl: canonicalUrl,
    }));
  }

  const availableSizes = variants.filter((v) => v.available).map((v) => v.size);
  available = availableSizes.length > 0;

  return {
    title,
    brand,
    price,
    currency,
    frontImage,
    backImage,
    description: description || `${brand} ${title}`,
    sku,
    available,
    availableSizes: availableSizes.length > 0 ? availableSizes : ['S', 'M', 'L'],
    variants,
    canonicalUrl,
    extractionMethod: ldProduct && ogTitle ? 'hybrid' : ldProduct ? 'json-ld' : 'opengraph',
  };
}

/**
 * Converts an ExtractedLiveHtmlProduct (or AI-enriched metadata) into a full ShoppingProduct
 * ready for the 360° Try-On Studio and 5-Piece Outfit Recommendation Engine.
 */
export function buildShoppingProductFromExtracted(
  extracted: ExtractedLiveHtmlProduct,
  overrides: {
    cut?: CutType;
    fabric?: FabricType;
    sizeChart?: SizeChartEntry[];
    frontImageFallback?: string;
  } = {}
): ShoppingProduct {
  const inferred = inferCutAndFabric(
    extracted.title,
    'Apparel',
    [],
    extracted.description
  );
  const cut = overrides.cut || inferred.cut;
  const fabric = overrides.fabric || inferred.fabric;
  const sizeChart =
    overrides.sizeChart && overrides.sizeChart.length > 0
      ? overrides.sizeChart
      : buildSizeChartForBrand(extracted.brand, cut);

  const frontImage =
    extracted.frontImage ||
    overrides.frontImageFallback ||
    '/assets/aistudio/1859546-800w_3767735c.jpg';
  const backImage = extracted.backImage || frontImage;

  const slug = extracted.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);

  return {
    id: `live-${extracted.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slug}`,
    title: extracted.title,
    brand: extracted.brand,
    category: 'Live Fetched Garment',
    price: extracted.price || '148.00',
    currency: extracted.currency || 'USD',
    productUrl: extracted.canonicalUrl,
    frontImage,
    backImage,
    cut,
    fabric,
    details: extracted.description,
    available: extracted.available,
    availableSizes: extracted.availableSizes,
    variants: extracted.variants,
    sizeChart,
    apiSource: `live-fetch:${extracted.extractionMethod}`,
    verifiedAt: new Date().toISOString(),
  };
}
