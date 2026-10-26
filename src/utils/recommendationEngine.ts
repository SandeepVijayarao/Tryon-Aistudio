import {
  BodyMeasurements,
  CutType,
  FabricType,
  ShoppingProduct,
} from '../types/tryon.ts';
import { DEFAULT_SIZE_CHART, analyzeFit } from './fitMath.ts';
import type { ExistingWardrobeItem, WardrobeCategory } from './wardrobeStyler.ts';

const IDEAL_EASE_CM: Record<CutType, Record<FabricType, number>> = {
  slim: { woven: 4, stretch_knit: 2 },
  regular: { woven: 6, stretch_knit: 4 },
  relaxed: { woven: 10, stretch_knit: 8 },
  oversized: { woven: 14, stretch_knit: 12 },
};

/**
 * 8-Dimensional Apparel Feature Embedding Vector (normalized [0, 1] per axis).
 * Equivalent to Spotify's Audio Feature Vectors adapted for Sartorial & Anthropometric Intelligence:
 * 0: formality           (0 = rugged workwear/tee, 1 = structured tailoring)
 * 1: warmth              (0 = lightweight summer linen/tee, 1 = heavy wool/coat)
 * 2: structure           (0 = fluid drape jersey, 1 = tailored canvas/heavy twill)
 * 3: textureRichness     (0 = smooth poplin/jersey, 1 = slub hemp, waffle, bouclé, suede)
 * 4: colorNeutrality     (0 = saturated/statement hue, 1 = core neutral ecru/charcoal/navy/white)
 * 5: stretchIndex        (0 = rigid woven, 1 = high-recovery stretch knit)
 * 6: silhouetteRelaxation(0 = slim tailored contour, 1 = relaxed/oversized architectural drape)
 * 7: priceTier           (0 = essentials <$60, 1 = luxury/atelier >$350)
 */
export type StyleVector8D = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const STYLE_VECTOR_LABELS: readonly string[] = [
  'Formality',
  'Seasonal Weight',
  'Architectural Structure',
  'Tactile Texture',
  'Palette Neutrality',
  'Stretch Recovery',
  'Silhouette Relaxation',
  'Atelier Tier',
];

export type ColorFamily =
  | 'ecru_stone'
  | 'optic_white'
  | 'charcoal_slate'
  | 'navy_indigo'
  | 'olive_sage'
  | 'sand_camel'
  | 'espresso_brown'
  | 'terracotta_rust'
  | 'burgundy_plum'
  | 'other_neutral';

export type OccasionContext =
  | 'all'
  | 'smart_tailored'
  | 'weekend_atelier'
  | 'creative_office'
  | 'evening_minimal';

export type DiscoveryMode = 'familiar' | 'balanced' | 'discovery';

export type RecommendationLane =
  | 'all_for_you'
  | 'proportion_perfect'
  | 'complete_the_look'
  | 'wardrobe_gap'
  | 'discover_weekly';

export type FeedbackActionType =
  | 'like'
  | 'super_like'
  | 'dismiss'
  | 'try_on'
  | 'save_closet'
  | 'flip_back';

export interface RecommendationFeedbackEvent {
  itemId: string;
  action: FeedbackActionType;
  timestampMs: number;
  vector?: StyleVector8D;
  brand?: string;
  category?: string;
}

export interface StyleDnaTrait {
  label: string;
  scorePct: number;
  axis: string;
  description: string;
}

export interface UserTasteProfile {
  vector: StyleVector8D;
  dominantTraits: StyleDnaTrait[];
  favoredBrands: string[];
  dismissedItemIds: Set<string>;
  likedItemIds: Set<string>;
  exploredCategories: Set<string>;
  feedbackCount: number;
  explorationRatio: number;
}

export interface RankedProductRecommendation {
  product: ShoppingProduct;
  totalMatchScore: number; // 0..99
  fitAffinityScore: number; // 0..100
  styleDnaScore: number; // 0..100
  wardrobeSynergyScore: number; // 0..100
  wardrobeGapScore: number; // 0..100
  noveltyScore: number; // 0..100
  trueSize: string;
  trueSizeInStock: boolean;
  chestEaseCm: number;
  waistEaseCm: number;
  bestClosetMatch: ExistingWardrobeItem | null;
  unlockedOutfitsCount: number;
  collaborativeTag: string;
  explanationReasons: string[];
  colorFamily: ColorFamily;
  vector: StyleVector8D;
  isLiked: boolean;
}

export interface OutfitHarmonyBreakdown {
  totalMatchScore: number; // 0..99
  fitHarmonyScore: number; // 0..100
  colorCoherenceScore: number; // 0..100
  layeringPhysicsScore: number; // 0..100
  tasteAlignmentScore: number; // 0..100
  collaborativeBadge: string;
  unlockedCombinations: number;
  explanationPills: string[];
}

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

/**
 * Infers the primary sartorial color family from item title, color label, or details.
 */
export function inferColorFamily(text: string): ColorFamily {
  const t = text.toLowerCase();
  if (
    t.includes('ecru') ||
    t.includes('stone') ||
    t.includes('ivory') ||
    t.includes('cream') ||
    t.includes('bone') ||
    t.includes('oat') ||
    t.includes('natural')
  ) {
    return 'ecru_stone';
  }
  if (t.includes('white') || t.includes('optic') || t.includes('chalk')) {
    return 'optic_white';
  }
  if (
    t.includes('charcoal') ||
    t.includes('slate') ||
    t.includes('black') ||
    t.includes('graphite') ||
    t.includes('ash') ||
    t.includes('grey') ||
    t.includes('gray') ||
    t.includes('midnight')
  ) {
    return 'charcoal_slate';
  }
  if (
    t.includes('navy') ||
    t.includes('indigo') ||
    t.includes('blue') ||
    t.includes('cobalt') ||
    t.includes('selvedge') ||
    t.includes('ocean')
  ) {
    return 'navy_indigo';
  }
  if (
    t.includes('olive') ||
    t.includes('sage') ||
    t.includes('bay leaf') ||
    t.includes('forest') ||
    t.includes('green') ||
    t.includes('moss') ||
    t.includes('cypress') ||
    t.includes('loden')
  ) {
    return 'olive_sage';
  }
  if (
    t.includes('sand') ||
    t.includes('camel') ||
    t.includes('khaki') ||
    t.includes('tan') ||
    t.includes('dune') ||
    t.includes('wheat')
  ) {
    return 'sand_camel';
  }
  if (
    t.includes('espresso') ||
    t.includes('brown') ||
    t.includes('walnut') ||
    t.includes('cognac') ||
    t.includes('tobacco') ||
    t.includes('chocolate') ||
    t.includes('chromexcel')
  ) {
    return 'espresso_brown';
  }
  if (
    t.includes('terracotta') ||
    t.includes('rust') ||
    t.includes('copper') ||
    t.includes('sienna') ||
    t.includes('brick')
  ) {
    return 'terracotta_rust';
  }
  if (t.includes('burgundy') || t.includes('wine') || t.includes('Oxblood') || t.includes('plum')) {
    return 'burgundy_plum';
  }
  return 'other_neutral';
}

/**
 * Sartorial Color Harmony Matrix (inspired by Amazon Complete-the-Look visual compatibility).
 * Evaluates tonal grounding, warm-cool balance, and classic menswear triads.
 */
export function computeColorHarmonyScore(c1: ColorFamily, c2: ColorFamily): number {
  if (c1 === c2) {
    // Tonal monochrome works well for neutrals, slightly less for bold hues
    if (c1 === 'charcoal_slate' || c1 === 'ecru_stone' || c1 === 'navy_indigo') {
      return 0.86;
    }
    return 0.72;
  }

  // Core anchors (optic_white, ecru_stone, charcoal_slate) pair effortlessly with almost everything
  const universalAnchors = new Set<ColorFamily>([
    'optic_white',
    'ecru_stone',
    'charcoal_slate',
  ]);

  const pairKey = [c1, c2].sort().join('__');
  const signaturePairings: Record<string, number> = {
    charcoal_slate__ecru_stone: 0.98,
    charcoal_slate__optic_white: 0.96,
    ecru_stone__olive_sage: 0.97,
    ecru_stone__navy_indigo: 0.97,
    ecru_stone__espresso_brown: 0.96,
    navy_indigo__optic_white: 0.97,
    navy_indigo__sand_camel: 0.96,
    navy_indigo__olive_sage: 0.93,
    olive_sage__optic_white: 0.95,
    olive_sage__sand_camel: 0.94,
    olive_sage__espresso_brown: 0.94,
    charcoal_slate__navy_indigo: 0.91,
    charcoal_slate__olive_sage: 0.93,
    espresso_brown__optic_white: 0.94,
    espresso_brown__sand_camel: 0.95,
  };

  if (signaturePairings[pairKey] !== undefined) {
    return signaturePairings[pairKey];
  }

  if (universalAnchors.has(c1) || universalAnchors.has(c2)) {
    return 0.9;
  }

  return 0.82;
}

/**
 * Encodes any Shop Product into an 8-dimensional Style DNA vector.
 */
export function encodeShopProductVector(product: ShoppingProduct): StyleVector8D {
  const text = `${product.title} ${product.category} ${product.details} ${product.brand}`.toLowerCase();

  // 0. Formality
  let formality = 0.52;
  if (text.includes('blazer') || text.includes('suit') || text.includes('tailored')) {
    formality = 0.88;
  } else if (text.includes('oxford') || text.includes('dress') || text.includes('trouser') || text.includes('merino') || text.includes('polo')) {
    formality = 0.68;
  } else if (text.includes('overshirt') || text.includes('cardigan') || text.includes('knit') || text.includes('shirt')) {
    formality = 0.56;
  } else if (text.includes('tee') || text.includes('t-shirt') || text.includes('terry') || text.includes('sweat') || text.includes('hoodie')) {
    formality = 0.34;
  }

  // 1. Warmth / Seasonal weight
  let warmth = 0.5;
  if (text.includes('heavy') || text.includes('wool') || text.includes('coat') || text.includes('jacket') || text.includes('flannel') || text.includes('14oz')) {
    warmth = 0.78;
  } else if (text.includes('overshirt') || text.includes('terry') || text.includes('sweater') || text.includes('knit') || text.includes('240gsm')) {
    warmth = 0.62;
  } else if (text.includes('linen') || text.includes('hemp') || text.includes('lightweight') || text.includes('short sleeve') || text.includes('tee')) {
    warmth = 0.35;
  }

  // 2. Architectural Structure
  let structure = product.fabric === 'woven' ? 0.76 : 0.38;
  if (text.includes('blazer') || text.includes('canvas') || text.includes('twill') || text.includes('chore') || text.includes('denim')) {
    structure = Math.min(0.95, structure + 0.16);
  } else if (text.includes('unstructured') || text.includes('ribbed') || text.includes('supima')) {
    structure = clamp01(structure - 0.08);
  }

  // 3. Texture Richness
  let textureRichness = 0.48;
  if (
    text.includes('hemp') ||
    text.includes('linen') ||
    text.includes('waffle') ||
    text.includes('boucle') ||
    text.includes('ribbed') ||
    text.includes('terry') ||
    text.includes('suede') ||
    text.includes('jacquard') ||
    text.includes('slub') ||
    text.includes('herringbone') ||
    text.includes('corduroy')
  ) {
    textureRichness = 0.86;
  } else if (text.includes('wool') || text.includes('twill') || text.includes('canvas') || text.includes('oxford')) {
    textureRichness = 0.68;
  }

  // 4. Color Neutrality
  const colorFam = inferColorFamily(text);
  const neutralFamilies = new Set<ColorFamily>([
    'ecru_stone',
    'optic_white',
    'charcoal_slate',
    'navy_indigo',
    'sand_camel',
    'espresso_brown',
    'olive_sage',
  ]);
  const colorNeutrality = neutralFamilies.has(colorFam) ? 0.9 : 0.55;

  // 5. Stretch Index
  const stretchIndex =
    product.fabric === 'stretch_knit'
      ? 0.88
      : text.includes('stretch') || text.includes('comfort') || text.includes('elastane')
        ? 0.65
        : 0.22;

  // 6. Silhouette Relaxation
  const cutMap: Record<CutType, number> = {
    slim: 0.2,
    regular: 0.5,
    relaxed: 0.8,
    oversized: 0.96,
  };
  const silhouetteRelaxation = cutMap[product.cut] ?? 0.5;

  // 7. Price Tier
  const numericPrice = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 140;
  const priceTier = clamp01((numericPrice - 40) / 310);

  return [
    formality,
    warmth,
    structure,
    textureRichness,
    colorNeutrality,
    stretchIndex,
    silhouetteRelaxation,
    priceTier,
  ];
}

/**
 * Encodes an ExistingWardrobeItem from the user's closet into the same 8D embedding space.
 */
export function encodeWardrobeItemVector(item: ExistingWardrobeItem): StyleVector8D {
  const pseudoProduct: ShoppingProduct = {
    id: item.id,
    title: `${item.name} ${item.color}`,
    brand: item.brand,
    category: item.category,
    price: item.category === 'Blazer' || item.category === 'Watch' || item.category === 'Shoes' ? '260.00' : '135.00',
    currency: 'USD',
    productUrl: item.garmentUrl || '',
    frontImage: item.frontImage,
    backImage: item.backImage || item.frontImage,
    cut: item.cut,
    fabric: item.fabric,
    details: `${item.category} ${item.color} ${item.notes || ''}`,
    available: true,
    availableSizes: [item.ownedSize],
    variants: [],
    sizeChart: item.sizeChart || DEFAULT_SIZE_CHART,
    apiSource: 'closet',
    verifiedAt: '',
  };
  return encodeShopProductVector(pseudoProduct);
}

/**
 * Cosine similarity between two 8D style vectors in [0, 1].
 */
export function cosineSimilarity8D(a: StyleVector8D, b: StyleVector8D): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 8; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0.5;
  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return clamp01(raw);
}

/**
 * Contextual Bandit Target Shift Vector for Occasion Contexts.
 */
const OCCASION_TARGET_VECTORS: Record<Exclude<OccasionContext, 'all'>, StyleVector8D> = {
  smart_tailored: [0.86, 0.58, 0.82, 0.62, 0.92, 0.52, 0.44, 0.72],
  weekend_atelier: [0.46, 0.48, 0.58, 0.86, 0.88, 0.64, 0.78, 0.55],
  creative_office: [0.68, 0.56, 0.7, 0.78, 0.9, 0.6, 0.64, 0.65],
  evening_minimal: [0.82, 0.64, 0.76, 0.58, 0.96, 0.58, 0.48, 0.76],
};

const FEEDBACK_WEIGHTS: Record<FeedbackActionType, number> = {
  super_like: 3.0,
  like: 2.0,
  save_closet: 2.4,
  try_on: 1.35,
  flip_back: 0.45,
  dismiss: -2.6,
};

/**
 * Builds the user's Spotify-style Dynamic Taste DNA Profile from:
 * 1. Owned wardrobe items (baseline anchor)
 * 2. Real-time implicit & explicit feedback events (with exponential recency weighting)
 * 3. Active Occasion Context shift
 */
export function computeUserTasteProfile(
  existingWardrobe: ExistingWardrobeItem[],
  feedbackEvents: RecommendationFeedbackEvent[] = [],
  occasion: OccasionContext = 'all',
  discoveryMode: DiscoveryMode = 'balanced',
  nowMs: number = Date.now()
): UserTasteProfile {
  const accum: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  let totalPositiveWeight = 0;

  const brandScores = new Map<string, number>();
  const dismissedItemIds = new Set<string>();
  const likedItemIds = new Set<string>();
  const exploredCategories = new Set<string>();

  // 1. Seed from existing closet items
  for (const item of existingWardrobe) {
    const vec = encodeWardrobeItemVector(item);
    const weight = 1.2;
    for (let i = 0; i < 8; i++) {
      accum[i] += vec[i] * weight;
    }
    totalPositiveWeight += weight;
    exploredCategories.add(item.category.toLowerCase());
    brandScores.set(item.brand, (brandScores.get(item.brand) || 0) + 1.0);
  }

  // Fallback baseline if closet is empty
  if (totalPositiveWeight === 0) {
    const defaultVec: StyleVector8D = [0.62, 0.54, 0.66, 0.68, 0.9, 0.58, 0.58, 0.58];
    for (let i = 0; i < 8; i++) accum[i] = defaultVec[i];
    totalPositiveWeight = 1;
  }

  // Normalize baseline
  const baseVector: StyleVector8D = [
    accum[0] / totalPositiveWeight,
    accum[1] / totalPositiveWeight,
    accum[2] / totalPositiveWeight,
    accum[3] / totalPositiveWeight,
    accum[4] / totalPositiveWeight,
    accum[5] / totalPositiveWeight,
    accum[6] / totalPositiveWeight,
    accum[7] / totalPositiveWeight,
  ];

  // 2. Apply real-time feedback vectors with exponential recency decay (half-life ~30 mins in session)
  const workingVector: StyleVector8D = [...baseVector] as StyleVector8D;
  for (const ev of feedbackEvents) {
    if (ev.action === 'dismiss') {
      dismissedItemIds.add(ev.itemId);
      likedItemIds.delete(ev.itemId);
    } else if (ev.action === 'like' || ev.action === 'super_like') {
      likedItemIds.add(ev.itemId);
      dismissedItemIds.delete(ev.itemId);
    }

    if (ev.brand) {
      const bDelta = FEEDBACK_WEIGHTS[ev.action] * 0.6;
      brandScores.set(ev.brand, (brandScores.get(ev.brand) || 0) + bDelta);
    }
    if (ev.category) {
      exploredCategories.add(ev.category.toLowerCase());
    }

    if (!ev.vector) continue;
    const ageMinutes = Math.max(0, (nowMs - ev.timestampMs) / 60000);
    const decay = Math.exp(-0.025 * ageMinutes);
    const rawW = FEEDBACK_WEIGHTS[ev.action] * decay;
    const stepAlpha = Math.min(0.42, Math.abs(rawW) * 0.14);

    for (let i = 0; i < 8; i++) {
      if (rawW >= 0) {
        workingVector[i] = clamp01(workingVector[i] * (1 - stepAlpha) + ev.vector[i] * stepAlpha);
      } else {
        // Push away from dismissed item vector
        const diff = workingVector[i] - ev.vector[i];
        workingVector[i] = clamp01(workingVector[i] + diff * stepAlpha);
      }
    }
  }

  // 3. Blend with contextual occasion target if active
  if (occasion !== 'all') {
    const target = OCCASION_TARGET_VECTORS[occasion];
    const contextBlend = 0.38;
    for (let i = 0; i < 8; i++) {
      workingVector[i] = clamp01(workingVector[i] * (1 - contextBlend) + target[i] * contextBlend);
    }
  }

  const favoredBrands = [...brandScores.entries()]
    .filter(([, sc]) => sc > 0.4)
    .sort((a, b) => b[1] - a[1])
    .map(([b]) => b);

  // Derive top human-readable Style DNA Traits
  const candidateTraits: StyleDnaTrait[] = [
    {
      label:
        workingVector[0] >= 0.68
          ? 'Smart Unstructured Tailoring'
          : workingVector[0] <= 0.45
            ? 'Elevated Off-Duty Essentials'
            : 'Smart-Casual Versatility',
      scorePct: Math.round(68 + workingVector[0] * 30),
      axis: 'Formality',
      description: 'Balances lapel architecture with breathable layering comfort',
    },
    {
      label:
        workingVector[3] >= 0.65
          ? 'Tactile Natural Weaves'
          : 'Crisp Minimalist Finishes',
      scorePct: Math.round(70 + workingVector[3] * 28),
      axis: 'Texture',
      description: 'Prefers organic hemp, slub linen, wool twill, and fine-ribbed Supima',
    },
    {
      label:
        workingVector[6] >= 0.65
          ? 'Relaxed Draped Proportions'
          : workingVector[6] <= 0.35
            ? 'Sharp Tailored Contour'
            : 'Balanced Classic Drape',
      scorePct: Math.round(72 + workingVector[6] * 25),
      axis: 'Silhouette',
      description: 'Calibrated ease across chest and waist without fabric strain',
    },
    {
      label: 'Tonal Earth & Slate Palette',
      scorePct: Math.round(74 + workingVector[4] * 24),
      axis: 'Palette',
      description: 'High cross-wardrobe interchangeability across ecru, charcoal, navy & olive',
    },
  ];

  const explorationRatio =
    discoveryMode === 'familiar' ? 0.15 : discoveryMode === 'balanced' ? 0.35 : 0.72;

  return {
    vector: workingVector,
    dominantTraits: candidateTraits,
    favoredBrands,
    dismissedItemIds,
    likedItemIds,
    exploredCategories,
    feedbackCount: feedbackEvents.length,
    explorationRatio,
  };
}

/**
 * Stage 1: Anthropometric Gaussian Fit & Ease Curve Scoring (0..100).
 * Uses a continuous Gaussian bell curve centered at the target chest and waist ease
 * for the garment's cut and fabric, weighted by stock availability and measurement confidence.
 */
export function computeGaussianFitScore(
  product: ShoppingProduct,
  measurements: BodyMeasurements
): {
  fitScore: number;
  trueSize: string;
  trueSizeInStock: boolean;
  chestEaseCm: number;
  waistEaseCm: number;
  fitExplanation: string;
} {
  const analysis = analyzeFit({
    measurements,
    sizeChart: product.sizeChart || DEFAULT_SIZE_CHART,
    cut: product.cut,
    fabric: product.fabric,
  });

  // Note: analyzeFit already adds CUT_ALLOWANCES[cut] to row.chest.ease and row.waist.ease
  const idealChestEase = IDEAL_EASE_CM[product.cut]?.[product.fabric] ?? 6;
  const idealWaistEase = Math.max(2, Math.round(idealChestEase * 0.45));

  const trueSize = analysis.trueSize || 'L';
  const trueSizeInStock = Boolean(
    analysis.trueSize && product.availableSizes.includes(analysis.trueSize)
  );

  // Score any size row on [0, 1] using asymmetric Gaussian ease curve
  const scoreSizeRow = (row: (typeof analysis.sizeResults)[number]): number => {
    const chestDelta = row.chest.ease - idealChestEase;
    const waistDelta = row.waist.ease - idealWaistEase;

    // Tight/negative ease is penalized sharply; comfortable drape has a wider bell curve
    const sigmaC = chestDelta < -1 ? 3.5 : 8.5;
    const sigmaW = waistDelta < -1 ? 3.5 : 8.5;

    const chestGauss = Math.exp(-(chestDelta * chestDelta) / (2 * sigmaC * sigmaC));
    const waistGauss = Math.exp(-(waistDelta * waistDelta) / (2 * sigmaW * sigmaW));

    const passBonus = row.passes ? 0.18 : -0.25;
    return clamp01(chestGauss * 0.58 + waistGauss * 0.42 + passBonus);
  };

  // Find best in-stock size row
  const inStockRows = analysis.sizeResults.filter((r) =>
    product.availableSizes.includes(r.size)
  );
  const poolToSearch = inStockRows.length > 0 ? inStockRows : analysis.sizeResults;

  let bestInStockRow = poolToSearch[0] || analysis.sizeResults[0];
  let bestInStockScore = -1;
  for (const row of poolToSearch) {
    const sc = scoreSizeRow(row);
    if (sc > bestInStockScore) {
      bestInStockScore = sc;
      bestInStockRow = row;
    }
  }

  const trueSizeRow = analysis.sizeResults.find((r) => r.size === trueSize);
  const chosenRow =
    trueSizeInStock && trueSizeRow ? trueSizeRow : bestInStockRow || trueSizeRow;

  const chestEaseCm = chosenRow ? chosenRow.chest.ease : idealChestEase;
  const waistEaseCm = chosenRow ? chosenRow.waist.ease : idealWaistEase;

  let rawScore = (chosenRow ? scoreSizeRow(chosenRow) : 0.75) * 100;
  if (trueSizeInStock) {
    rawScore = Math.max(84, rawScore);
  } else if (chosenRow?.passes && inStockRows.length > 0) {
    // An adjacent in-stock size still passes without strain
    rawScore = Math.min(82, rawScore * 0.85);
  } else {
    // No in-stock size fits without strain
    rawScore = Math.min(48, rawScore * 0.52);
  }

  const confidenceFactor = 0.95 + clamp01(measurements.confidence || 0.9) * 0.05;
  const fitScore = Math.round(Math.max(18, Math.min(99, rawScore * confidenceFactor)));

  const signC = chestEaseCm > 0 ? `+${chestEaseCm}` : `${chestEaseCm}`;
  const signW = waistEaseCm > 0 ? `+${waistEaseCm}` : `${waistEaseCm}`;
  const fitExplanation = trueSizeInStock
    ? `True Size ${trueSize} in stock (${signC}cm chest, ${signW}cm waist ease for ${product.cut} ${product.fabric.replace('_', ' ')})`
    : `Best available size ${chosenRow?.size || trueSize} (${signC}cm chest ease)`;

  return {
    fitScore,
    trueSize: trueSizeInStock ? trueSize : chosenRow?.size || trueSize,
    trueSizeInStock,
    chestEaseCm,
    waistEaseCm,
    fitExplanation,
  };
}

/**
 * Categorizes a shop product into a canonical WardrobeCategory for cross-category graph matching.
 */
export function classifyProductCategory(product: ShoppingProduct): WardrobeCategory {
  const t = `${product.title} ${product.category}`.toLowerCase();
  if (t.includes('blazer') || t.includes('suit') || t.includes('jacket') || t.includes('coat')) {
    return 'Blazer';
  }
  if (t.includes('overshirt') || t.includes('chore') || t.includes('shacket')) {
    return 'Overshirt';
  }
  if (t.includes('tee') || t.includes('t-shirt') || t.includes('henley')) {
    return 'Layering Tee';
  }
  if (
    t.includes('knit') ||
    t.includes('crew') ||
    t.includes('sweater') ||
    t.includes('cardigan') ||
    t.includes('terry') ||
    t.includes('merino') ||
    t.includes('polo')
  ) {
    return 'Knitwear';
  }
  return 'Shirt';
}

/**
 * Stage 2: Amazon-Style Item-to-Item Cross-Category Collaborative Compatibility Matrix.
 * Scores how naturally a candidate category pairs with an existing closet category in a 5-piece outfit.
 */
const CROSS_CATEGORY_COMPATIBILITY: Record<WardrobeCategory, Record<WardrobeCategory, number>> = {
  Blazer: {
    Blazer: 0.15, // Don't layer two blazers together
    Overshirt: 0.35,
    'Layering Tee': 0.98, // Unstructured blazer + heavyweight tee is a signature pairing
    Knitwear: 0.95, // Fine knit/crew under blazer
    Shirt: 0.96, // Poplin/oxford shirt under blazer
    Bottom: 0.97,
    Watch: 0.95,
    Shoes: 0.95,
  },
  Overshirt: {
    Blazer: 0.35,
    Overshirt: 0.2,
    'Layering Tee': 0.98, // Overshirt + Supima crewneck tee
    Knitwear: 0.88,
    Shirt: 0.78,
    Bottom: 0.96,
    Watch: 0.94,
    Shoes: 0.94,
  },
  'Layering Tee': {
    Blazer: 0.98,
    Overshirt: 0.98,
    'Layering Tee': 0.2,
    Knitwear: 0.86, // Tee layered under sweater/cardigan
    Shirt: 0.9, // Open shirt over tee
    Bottom: 0.94,
    Watch: 0.92,
    Shoes: 0.92,
  },
  Knitwear: {
    Blazer: 0.95,
    Overshirt: 0.88,
    'Layering Tee': 0.88,
    Knitwear: 0.25,
    Shirt: 0.91, // Collar under crewneck knit
    Bottom: 0.96,
    Watch: 0.93,
    Shoes: 0.94,
  },
  Shirt: {
    Blazer: 0.96,
    Overshirt: 0.8,
    'Layering Tee': 0.9,
    Knitwear: 0.91,
    Shirt: 0.22,
    Bottom: 0.96,
    Watch: 0.94,
    Shoes: 0.94,
  },
  Bottom: {
    Blazer: 0.97,
    Overshirt: 0.96,
    'Layering Tee': 0.94,
    Knitwear: 0.96,
    Shirt: 0.96,
    Bottom: 0.1,
    Watch: 0.9,
    Shoes: 0.97,
  },
  Watch: {
    Blazer: 0.95,
    Overshirt: 0.94,
    'Layering Tee': 0.92,
    Knitwear: 0.93,
    Shirt: 0.94,
    Bottom: 0.9,
    Watch: 0.05,
    Shoes: 0.92,
  },
  Shoes: {
    Blazer: 0.95,
    Overshirt: 0.94,
    'Layering Tee': 0.92,
    Knitwear: 0.94,
    Shirt: 0.94,
    Bottom: 0.97,
    Watch: 0.92,
    Shoes: 0.05,
  },
};

/**
 * Computes Amazon-style Item-to-Item Collaborative Synergy + Stage 3 Wardrobe Gap & Outfit Multiplier.
 */
export function evaluateWardrobeSynergyAndGap(
  product: ShoppingProduct,
  existingWardrobe: ExistingWardrobeItem[]
): {
  wardrobeSynergyScore: number;
  wardrobeGapScore: number;
  bestClosetMatch: ExistingWardrobeItem | null;
  unlockedOutfitsCount: number;
  collaborativeTag: string;
} {
  if (existingWardrobe.length === 0) {
    return {
      wardrobeSynergyScore: 78,
      wardrobeGapScore: 85,
      bestClosetMatch: null,
      unlockedOutfitsCount: 3,
      collaborativeTag: 'Versatile Foundation Piece',
    };
  }

  const prodCat = classifyProductCategory(product);
  const prodColor = inferColorFamily(`${product.title} ${product.details}`);
  const prodVec = encodeShopProductVector(product);

  let bestMatch: ExistingWardrobeItem | null = null;
  let bestPairScore = -1;
  let maxRedundancy = 0;

  for (const closetItem of existingWardrobe) {
    const closetColor = inferColorFamily(`${closetItem.name} ${closetItem.color}`);
    const closetVec = encodeWardrobeItemVector(closetItem);

    // Check redundancy (same category + very close style vector or identical URL)
    if (
      (closetItem.garmentUrl && closetItem.garmentUrl === product.productUrl) ||
      closetItem.name.toLowerCase() === product.title.toLowerCase()
    ) {
      maxRedundancy = 1.0;
    } else if (closetItem.category === prodCat) {
      const vecSim = cosineSimilarity8D(prodVec, closetVec);
      const sameColor = closetColor === prodColor ? 0.15 : 0;
      maxRedundancy = Math.max(maxRedundancy, clamp01(vecSim * 0.85 + sameColor));
    }

    // Cross-category collaborative score (prioritizing upper-body layering partners first)
    const crossCompat =
      CROSS_CATEGORY_COMPATIBILITY[prodCat]?.[closetItem.category] ?? 0.75;
    const colorHarmony = computeColorHarmonyScore(prodColor, closetColor);
    const styleCoherence = cosineSimilarity8D(prodVec, closetVec);

    // Prefer matching with upper-body / core clothing pieces for primary pairing callout
    const slotPriority =
      closetItem.category === 'Blazer' ||
      closetItem.category === 'Overshirt' ||
      closetItem.category === 'Layering Tee' ||
      closetItem.category === 'Knitwear' ||
      closetItem.category === 'Shirt'
        ? 1.06
        : 0.94;

    const pairScore =
      (crossCompat * 0.48 + colorHarmony * 0.34 + styleCoherence * 0.18) * slotPriority;

    if (pairScore > bestPairScore && closetItem.category !== prodCat) {
      bestPairScore = pairScore;
      bestMatch = closetItem;
    }
  }

  if (!bestMatch) {
    bestMatch = existingWardrobe[0];
    bestPairScore = 0.82;
  }

  // Count how many complete 5-piece outfits this piece unlocks with the user's closet
  const compatibleUpperPartners = existingWardrobe.filter((w) => {
    const compat = CROSS_CATEGORY_COMPATIBILITY[prodCat]?.[w.category] ?? 0;
    return compat >= 0.78 && (w.category === 'Blazer' || w.category === 'Overshirt' || w.category === 'Layering Tee' || w.category === 'Knitwear' || w.category === 'Shirt');
  }).length;
  const compatibleBottoms = Math.max(1, existingWardrobe.filter((w) => w.category === 'Bottom').length + 1);
  const compatibleShoes = Math.max(1, existingWardrobe.filter((w) => w.category === 'Shoes').length + 1);

  const unlockedOutfitsCount = Math.max(
    2,
    Math.min(12, Math.max(1, compatibleUpperPartners) * compatibleBottoms + (compatibleShoes > 1 ? 1 : 0))
  );

  // Wardrobe Gap Score: high when item fills an unowned silhouette/texture/category & unlocks many outfits
  const noveltyBonus = 1 - maxRedundancy * 0.75;
  const multiplierBonus = Math.min(1, unlockedOutfitsCount / 6);
  const wardrobeGapScore = Math.round(
    Math.max(20, Math.min(99, (noveltyBonus * 0.68 + multiplierBonus * 0.32) * 100))
  );

  const wardrobeSynergyScore = Math.round(
    Math.max(45, Math.min(99, bestPairScore * 96))
  );

  const shortClosetName = bestMatch.name.split('(')[0].trim();
  const collaborativeTag =
    maxRedundancy >= 0.95
      ? `Already in Your Closet (${bestMatch.brand})`
      : `Frequently Styled With Your ${bestMatch.brand} ${shortClosetName}`;

  return {
    wardrobeSynergyScore,
    wardrobeGapScore,
    bestClosetMatch: bestMatch,
    unlockedOutfitsCount,
    collaborativeTag,
  };
}

/**
 * Multi-Stage Candidate Scoring for a single Shop Product (Amazon + Spotify Hybrid).
 */
export function scoreShopProductForUser(
  product: ShoppingProduct,
  measurements: BodyMeasurements,
  existingWardrobe: ExistingWardrobeItem[],
  tasteProfile: UserTasteProfile,
  options: {
    searchQuery?: string;
    occasion?: OccasionContext;
    discoveryMode?: DiscoveryMode;
  } = {}
): RankedProductRecommendation {
  const vector = encodeShopProductVector(product);
  const colorFamily = inferColorFamily(`${product.title} ${product.details}`);

  // Stage 1: Anthropometric Gaussian Fit
  const fitResult = computeGaussianFitScore(product, measurements);

  // Stage 2 & 3: Collaborative Closet Synergy & Wardrobe Gap Utility
  const synergyResult = evaluateWardrobeSynergyAndGap(product, existingWardrobe);

  // Stage 4: Spotify Style DNA Cosine Similarity & Novelty
  const rawCosine = cosineSimilarity8D(vector, tasteProfile.vector);
  const brandAffinityBonus = tasteProfile.favoredBrands.includes(product.brand) ? 0.05 : 0;
  const isLiked = tasteProfile.likedItemIds.has(product.id);
  const explicitLikeBonus = isLiked ? 0.08 : 0;

  const styleDnaScore = Math.round(
    Math.max(35, Math.min(99, (rawCosine * 0.88 + brandAffinityBonus + explicitLikeBonus) * 100))
  );

  // Novelty / Exploration score (rewards textures, cuts, or brands less represented in closet)
  const prodCat = classifyProductCategory(product).toLowerCase();
  const categoryNovelty = tasteProfile.exploredCategories.has(prodCat) ? 0.55 : 0.92;
  const brandNovelty = tasteProfile.favoredBrands.slice(0, 2).includes(product.brand) ? 0.52 : 0.88;
  const textureNovelty = vector[3]; // Tactile richness
  const noveltyScore = Math.round(
    clamp01(categoryNovelty * 0.35 + brandNovelty * 0.35 + textureNovelty * 0.3) * 100
  );

  // Query relevance boost if user entered a search query
  let queryBoost = 0;
  const q = (options.searchQuery || '').trim().toLowerCase();
  if (q) {
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    const searchable = `${product.title} ${product.brand} ${product.category} ${product.cut} ${product.fabric} ${product.details}`.toLowerCase();
    let matchedTokens = 0;
    for (const tk of tokens) {
      if (searchable.includes(tk)) matchedTokens++;
    }
    if (tokens.length > 0) {
      queryBoost = (matchedTokens / tokens.length) * 18;
    }
  }

  // Blend weights based on DiscoveryMode (Familiar vs Balanced vs Deep Discovery)
  const mode = options.discoveryMode || 'balanced';
  let composite = 0;
  if (mode === 'familiar') {
    composite =
      fitResult.fitScore * 0.34 +
      styleDnaScore * 0.38 +
      synergyResult.wardrobeSynergyScore * 0.2 +
      synergyResult.wardrobeGapScore * 0.08;
  } else if (mode === 'discovery') {
    composite =
      fitResult.fitScore * 0.3 +
      styleDnaScore * 0.2 +
      synergyResult.wardrobeGapScore * 0.26 +
      noveltyScore * 0.24;
  } else {
    // balanced
    composite =
      fitResult.fitScore * 0.34 +
      styleDnaScore * 0.28 +
      synergyResult.wardrobeSynergyScore * 0.22 +
      synergyResult.wardrobeGapScore * 0.16;
  }

  if (isLiked) composite += 5;
  if (tasteProfile.dismissedItemIds.has(product.id)) composite -= 45;

  const totalMatchScore = Math.round(Math.max(25, Math.min(99, composite + queryBoost)));

  const explanationReasons: string[] = [
    fitResult.fitExplanation,
    synergyResult.collaborativeTag,
    `Unlocks ${synergyResult.unlockedOutfitsCount} head-to-toe closet combinations`,
  ];

  return {
    product,
    totalMatchScore,
    fitAffinityScore: fitResult.fitScore,
    styleDnaScore,
    wardrobeSynergyScore: synergyResult.wardrobeSynergyScore,
    wardrobeGapScore: synergyResult.wardrobeGapScore,
    noveltyScore,
    trueSize: fitResult.trueSize,
    trueSizeInStock: fitResult.trueSizeInStock,
    chestEaseCm: fitResult.chestEaseCm,
    waistEaseCm: fitResult.waistEaseCm,
    bestClosetMatch: synergyResult.bestClosetMatch,
    unlockedOutfitsCount: synergyResult.unlockedOutfitsCount,
    collaborativeTag: synergyResult.collaborativeTag,
    explanationReasons,
    colorFamily,
    vector,
    isLiked,
  };
}

/**
 * Pairwise similarity between two candidate products for Maximal Marginal Relevance (MMR) penalty.
 */
function computeCandidateSimilarity(
  a: RankedProductRecommendation,
  b: RankedProductRecommendation
): number {
  const vecSim = cosineSimilarity8D(a.vector, b.vector);
  const sameBrand = a.product.brand === b.product.brand ? 0.25 : 0;
  const sameCategory =
    classifyProductCategory(a.product) === classifyProductCategory(b.product) ? 0.25 : 0;
  const sameColor = a.colorFamily === b.colorFamily ? 0.15 : 0;

  return clamp01(vecSim * 0.35 + sameBrand + sameCategory + sameColor);
}

/**
 * Stage 5: Maximal Marginal Relevance (MMR) Diversity Re-Ranker & Lane Sorter.
 * Prevents consecutive identical brands/silhouettes while respecting the active Recommendation Lane.
 */
export function rankShopCatalogForUser(
  products: ShoppingProduct[],
  measurements: BodyMeasurements,
  existingWardrobe: ExistingWardrobeItem[],
  feedbackEvents: RecommendationFeedbackEvent[] = [],
  options: {
    searchQuery?: string;
    occasion?: OccasionContext;
    discoveryMode?: DiscoveryMode;
    lane?: RecommendationLane;
    mmrLambda?: number; // 1.0 = pure relevance, 0.0 = pure diversity (default 0.78)
    includeDismissed?: boolean;
  } = {}
): {
  ranked: RankedProductRecommendation[];
  tasteProfile: UserTasteProfile;
} {
  const tasteProfile = computeUserTasteProfile(
    existingWardrobe,
    feedbackEvents,
    options.occasion || 'all',
    options.discoveryMode || 'balanced'
  );

  const availablePool = products.filter((p) => p.available && p.availableSizes.length > 0);
  const scoredPool = availablePool
    .filter((p) => options.includeDismissed || !tasteProfile.dismissedItemIds.has(p.id))
    .map((p) =>
      scoreShopProductForUser(p, measurements, existingWardrobe, tasteProfile, {
        searchQuery: options.searchQuery,
        occasion: options.occasion,
        discoveryMode: options.discoveryMode,
      })
    );

  // Lane-specific primary metric
  const lane = options.lane || 'all_for_you';
  const getLanePrimaryScore = (item: RankedProductRecommendation): number => {
    switch (lane) {
      case 'proportion_perfect':
        return item.fitAffinityScore * 0.75 + item.totalMatchScore * 0.25;
      case 'complete_the_look':
        return item.wardrobeSynergyScore * 0.75 + item.totalMatchScore * 0.25;
      case 'wardrobe_gap':
        return item.wardrobeGapScore * 0.7 + item.unlockedOutfitsCount * 2.5 + item.fitAffinityScore * 0.2;
      case 'discover_weekly':
        return item.noveltyScore * 0.65 + item.fitAffinityScore * 0.35;
      case 'all_for_you':
      default:
        return item.totalMatchScore;
    }
  };

  // If user typed a specific search query, weight relevance higher (lambda = 0.9)
  const hasSearch = Boolean(options.searchQuery && options.searchQuery.trim().length > 0);
  const lambda =
    options.mmrLambda !== undefined
      ? options.mmrLambda
      : hasSearch
        ? 0.92
        : options.discoveryMode === 'discovery'
          ? 0.68
          : 0.78;

  const remaining = [...scoredPool];
  const selected: RankedProductRecommendation[] = [];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestMmrValue = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = getLanePrimaryScore(candidate) / 100;

      let maxSimToSelected = 0;
      for (const alreadyPicked of selected) {
        const sim = computeCandidateSimilarity(candidate, alreadyPicked);
        if (sim > maxSimToSelected) {
          maxSimToSelected = sim;
        }
      }

      const mmrValue = lambda * relevance - (1 - lambda) * maxSimToSelected;
      if (mmrValue > bestMmrValue) {
        bestMmrValue = mmrValue;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return {
    ranked: selected,
    tasteProfile,
  };
}

/**
 * Evaluates a complete 5-piece outfit's multi-slot harmony (Amazon "Complete the Look" + Physics Ease Check).
 * Ensures the inner layering piece has smaller or equal chest ease than the outer layer so sleeves/chest never bunch.
 */
export function evaluateCompleteOutfitHarmony(params: {
  topTitle: string;
  topBrand: string;
  topChestEaseCm: number;
  layeringTitle: string;
  layeringBrand: string;
  layeringChestEaseCm: number;
  bottomTitle: string;
  watchTitle: string;
  shoesTitle: string;
  shopRec: RankedProductRecommendation;
}): OutfitHarmonyBreakdown {
  const {
    topTitle,
    topChestEaseCm,
    layeringTitle,
    layeringChestEaseCm,
    bottomTitle,
    shoesTitle,
    shopRec,
  } = params;

  // 1. Layering Physics Score: outer layer ease should exceed base layer ease by >= 2cm
  const easeDelta = topChestEaseCm - layeringChestEaseCm;
  const layeringPhysicsScore =
    easeDelta >= 2
      ? Math.min(99, 92 + Math.round(Math.min(7, easeDelta)))
      : easeDelta >= 0
        ? 84
        : 68;

  // 2. Multi-Slot Color Coherence
  const topColor = inferColorFamily(topTitle);
  const layerColor = inferColorFamily(layeringTitle);
  const bottomColor = inferColorFamily(bottomTitle);
  const shoesColor = inferColorFamily(shoesTitle);

  const cTopLayer = computeColorHarmonyScore(topColor, layerColor);
  const cTopBottom = computeColorHarmonyScore(topColor, bottomColor);
  const cBottomShoes = computeColorHarmonyScore(bottomColor, shoesColor);

  const colorCoherenceScore = Math.round(
    ((cTopLayer * 0.38 + cTopBottom * 0.38 + cBottomShoes * 0.24) * 100)
  );

  const fitHarmonyScore = shopRec.fitAffinityScore;
  const tasteAlignmentScore = shopRec.styleDnaScore;

  const totalMatchScore = Math.round(
    Math.min(
      99,
      fitHarmonyScore * 0.34 +
        colorCoherenceScore * 0.24 +
        layeringPhysicsScore * 0.2 +
        tasteAlignmentScore * 0.22
    )
  );

  const explanationPills = [
    `Fit Affinity ${fitHarmonyScore}%`,
    `Palette Harmony ${colorCoherenceScore}%`,
    `Layering Clearance +${Math.max(2, Math.round(easeDelta))}cm`,
    `Style DNA ${tasteAlignmentScore}%`,
  ];

  return {
    totalMatchScore,
    fitHarmonyScore,
    colorCoherenceScore,
    layeringPhysicsScore,
    tasteAlignmentScore,
    collaborativeBadge: shopRec.collaborativeTag,
    unlockedCombinations: shopRec.unlockedOutfitsCount,
    explanationPills,
  };
}
