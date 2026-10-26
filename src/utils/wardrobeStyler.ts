import {
  BodyMeasurements,
  CutType,
  FabricType,
  ShoppingProduct,
  SizeChartEntry,
} from '../types/tryon.ts';
import { DEFAULT_SIZE_CHART, analyzeFit } from './fitMath.ts';
import { DEMO_PRESETS } from './demoPresets.ts';

export type WardrobeCategory =
  | 'Blazer'
  | 'Overshirt'
  | 'Layering Tee'
  | 'Knitwear'
  | 'Shirt'
  | 'Bottom'
  | 'Watch'
  | 'Shoes';

export interface ExistingWardrobeItem {
  id: string;
  name: string;
  brand: string;
  category: WardrobeCategory;
  color: string;
  frontImage: string;
  backImage?: string;
  cut: CutType;
  fabric: FabricType;
  ownedSize: string;
  sizeChart: SizeChartEntry[];
  garmentUrl?: string;
  notes?: string;
}

export type OutfitSlotType = 'top' | 'layering' | 'bottom' | 'watch' | 'shoes';

export interface OutfitSlotPiece {
  slot: OutfitSlotType;
  slotLabel: 'Top / Outer' | 'Layering (T-Shirt)' | 'Bottom' | 'Watch' | 'Shoes';
  name: string;
  brand: string;
  source: 'Your Closet' | 'Shop Match';
  sizeOrSpec: string;
  fitNote: string;
  price?: string;
  imageUrl: string;
  productUrl?: string;
  shopProduct?: ShoppingProduct;
  closetItem?: ExistingWardrobeItem;
}

export interface StylePairingRecommendation {
  id: string;
  title: string;
  occasion: string;
  existingItem: ExistingWardrobeItem;
  shopComplement: ShoppingProduct;
  shopTrueSize: string;
  shopChestEaseCm: number;
  whyItWorks: string;
  slots: {
    top: OutfitSlotPiece;
    layering: OutfitSlotPiece;
    bottom: OutfitSlotPiece;
    watch: OutfitSlotPiece;
    shoes: OutfitSlotPiece;
  };
}

/**
 * High-detail studio product SVG illustrations for complete 5-piece outfit slots
 * (Layering T-Shirts, Tailored Bottoms, Horology Watches, and Footwear).
 */
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const STUDIO_OUTFIT_SVGS = {
  whiteSupimaTee: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="145" r="95" fill="#F1F5F9"/>
      <path d="M78 58 C95 69, 145 69, 162 58 L206 86 L186 128 L162 114 L162 246 L78 246 L78 114 L54 128 L34 86 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M90 60 C104 76, 136 76, 150 60" stroke="#94A3B8" stroke-width="3.5" fill="none"/>
      <path d="M94 64 C106 78, 134 78, 146 64" stroke="#E2E8F0" stroke-width="2" fill="none"/>
      <line x1="78" y1="234" x2="162" y2="234" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="120" y="278" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">HEAVYWEIGHT SUPIMA TEE</text>
    </svg>
  `),
  ribbedSlateTee: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="145" r="95" fill="#F1F5F9"/>
      <path d="M78 58 C95 69, 145 69, 162 58 L206 86 L186 128 L162 114 L162 246 L78 246 L78 114 L54 128 L34 86 Z" fill="#334155" stroke="#1E293B" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M90 60 C104 76, 136 76, 150 60" stroke="#94A3B8" stroke-width="3.5" fill="none"/>
      <line x1="98" y1="75" x2="98" y2="244" stroke="#475569" stroke-width="1.5"/>
      <line x1="120" y1="75" x2="120" y2="244" stroke="#475569" stroke-width="1.5"/>
      <line x1="142" y1="75" x2="142" y2="244" stroke="#475569" stroke-width="1.5"/>
      <text x="120" y="278" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">MERCERIZED RIBBED TEE</text>
    </svg>
  `),
  charcoalTrousers: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="95" fill="#F1F5F9"/>
      <path d="M74 36 L166 36 L174 252 L134 252 L120 112 L106 252 L66 252 Z" fill="#27272A" stroke="#18181B" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="74" y="36" width="92" height="16" fill="#18181B"/>
      <line x1="94" y1="56" x2="88" y2="248" stroke="#52525B" stroke-width="1.5" stroke-dasharray="4 3"/>
      <line x1="146" y1="56" x2="152" y2="248" stroke="#52525B" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="120" cy="44" r="3" fill="#D4D4D8"/>
      <text x="120" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">PLEATED WOOL TROUSERS</text>
    </svg>
  `),
  oliveChinos: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="95" fill="#F1F5F9"/>
      <path d="M74 36 L166 36 L172 252 L133 252 L120 112 L107 252 L68 252 Z" fill="#4D5D4B" stroke="#364235" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="74" y="36" width="92" height="15" fill="#3B4739"/>
      <path d="M75 56 Q92 75 94 92" stroke="#364235" stroke-width="2.5" fill="none"/>
      <path d="M165 56 Q148 75 146 92" stroke="#364235" stroke-width="2.5" fill="none"/>
      <circle cx="120" cy="43" r="3" fill="#D6D3D1"/>
      <text x="120" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">TAPERED ORGANIC CHINOS</text>
    </svg>
  `),
  selvedgeDenim: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="95" fill="#F1F5F9"/>
      <path d="M74 36 L166 36 L172 246 L133 246 L120 112 L107 246 L68 246 Z" fill="#1E3A5F" stroke="#0F2542" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="67" y="236" width="41" height="12" fill="#CBD5E1" stroke="#0F2542" stroke-width="2"/>
      <rect x="132" y="236" width="41" height="12" fill="#CBD5E1" stroke="#0F2542" stroke-width="2"/>
      <line x1="87" y1="236" x2="87" y2="248" stroke="#DC2626" stroke-width="2.5"/>
      <line x1="152" y1="236" x2="152" y2="248" stroke="#DC2626" stroke-width="2.5"/>
      <circle cx="120" cy="43" r="3.5" fill="#F59E0B"/>
      <text x="120" y="280" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">14OZ SELVEDGE DENIM</text>
    </svg>
  `),
  chronographWatch: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="145" r="92" fill="#F1F5F9"/>
      <rect x="98" y="28" width="44" height="65" rx="6" fill="#5C3A21" stroke="#3E2716" stroke-width="3"/>
      <rect x="98" y="197" width="44" height="65" rx="6" fill="#5C3A21" stroke="#3E2716" stroke-width="3"/>
      <circle cx="120" cy="145" r="56" fill="#E2E8F0" stroke="#475569" stroke-width="5"/>
      <circle cx="120" cy="145" r="46" fill="#0F172A" stroke="#94A3B8" stroke-width="2"/>
      <circle cx="102" cy="145" r="11" fill="#1E293B" stroke="#64748B" stroke-width="1.5"/>
      <circle cx="138" cy="145" r="11" fill="#1E293B" stroke="#64748B" stroke-width="1.5"/>
      <line x1="120" y1="145" x2="120" y2="112" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="120" y1="145" x2="146" y2="132" stroke="#F8FAFC" stroke-width="3" stroke-linecap="round"/>
      <line x1="120" y1="145" x2="132" y2="174" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="176" y="138" width="8" height="14" rx="2" fill="#64748B"/>
      <text x="120" y="282" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">40MM CHRONOGRAPH</text>
    </svg>
  `),
  fieldWatch: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="145" r="92" fill="#F1F5F9"/>
      <rect x="98" y="28" width="44" height="65" rx="4" fill="#3F4F3E" stroke="#293528" stroke-width="3"/>
      <rect x="98" y="197" width="44" height="65" rx="4" fill="#3F4F3E" stroke="#293528" stroke-width="3"/>
      <circle cx="120" cy="145" r="54" fill="#CBD5E1" stroke="#475569" stroke-width="4.5"/>
      <circle cx="120" cy="145" r="44" fill="#F8FAFC" stroke="#64748B" stroke-width="2"/>
      <line x1="120" y1="145" x2="104" y2="118" stroke="#1E293B" stroke-width="4" stroke-linecap="round"/>
      <line x1="120" y1="145" x2="148" y2="145" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
      <circle cx="120" cy="145" r="4" fill="#D97706"/>
      <text x="120" y="282" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">38MM TITANIUM FIELD</text>
    </svg>
  `),
  steelDressWatch: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="145" r="92" fill="#F1F5F9"/>
      <rect x="100" y="28" width="40" height="65" rx="4" fill="#94A3B8" stroke="#475569" stroke-width="3"/>
      <rect x="100" y="197" width="40" height="65" rx="4" fill="#94A3B8" stroke="#475569" stroke-width="3"/>
      <circle cx="120" cy="145" r="54" fill="#E2E8F0" stroke="#475569" stroke-width="4"/>
      <circle cx="120" cy="145" r="44" fill="#1E3A8A" stroke="#93C5FD" stroke-width="2"/>
      <line x1="120" y1="145" x2="120" y2="112" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="120" y1="145" x2="146" y2="156" stroke="#F8FAFC" stroke-width="3" stroke-linecap="round"/>
      <text x="120" y="282" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">39MM SUNRAY STEEL</text>
    </svg>
  `),
  suedeLoafers: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="92" fill="#F1F5F9"/>
      <path d="M36 178 C40 144, 78 134, 114 138 C134 140, 152 158, 198 164 C210 166, 214 182, 208 194 L36 194 Z" fill="#6B4423" stroke="#432818" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="34" y="194" width="176" height="14" rx="4" fill="#27170E"/>
      <rect x="34" y="206" width="52" height="8" rx="2" fill="#1C110A"/>
      <path d="M98 146 L138 152" stroke="#432818" stroke-width="5" stroke-linecap="round"/>
      <text x="120" y="278" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">ESPRESSO SUEDE LOAFERS</text>
    </svg>
  `),
  minimalistSneakers: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="92" fill="#F1F5F9"/>
      <path d="M34 182 C36 138, 76 128, 114 136 C138 142, 162 158, 202 164 C212 166, 214 182, 208 192 L34 192 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="32" y="190" width="178" height="18" rx="5" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2.5"/>
      <line x1="112" y1="138" x2="128" y2="152" stroke="#64748B" stroke-width="3" stroke-linecap="round"/>
      <line x1="126" y1="144" x2="142" y2="156" stroke="#64748B" stroke-width="3" stroke-linecap="round"/>
      <text x="120" y="278" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">CALFSKIN LOW SNEAKERS</text>
    </svg>
  `),
  serviceBoots: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" fill="none">
      <rect width="240" height="300" fill="#F8FAFC"/>
      <circle cx="120" cy="150" r="92" fill="#F1F5F9"/>
      <path d="M48 92 L112 92 L122 142 C148 152, 174 156, 204 162 C214 165, 214 184, 206 194 L42 194 Z" fill="#52301C" stroke="#361E10" stroke-width="3.5" stroke-linejoin="round"/>
      <rect x="40" y="194" width="170" height="15" rx="4" fill="#1F1209"/>
      <rect x="40" y="207" width="54" height="10" rx="2" fill="#140B05"/>
      <line x1="106" y1="104" x2="118" y2="104" stroke="#D6D3D1" stroke-width="3"/>
      <line x1="108" y1="118" x2="120" y2="118" stroke="#D6D3D1" stroke-width="3"/>
      <line x1="110" y1="132" x2="122" y2="132" stroke="#D6D3D1" stroke-width="3"/>
      <text x="120" y="278" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#64748B">GOODYEAR WELT BOOTS</text>
    </svg>
  `),
};

export const DEFAULT_EXISTING_WARDROBE: ExistingWardrobeItem[] = [
  {
    id: 'wardrobe-zara-blazer',
    name: 'Comfort Suit Blazer (Ref. 4456/999)',
    brand: 'ZARA',
    category: 'Blazer',
    color: 'Light Ecru / Stone',
    frontImage: DEMO_PRESETS[0].garmentFrontImage,
    backImage: DEMO_PRESETS[0].garmentBackImage,
    cut: DEMO_PRESETS[0].cut,
    fabric: DEMO_PRESETS[0].fabric,
    ownedSize: 'M',
    sizeChart: DEMO_PRESETS[0].sizeChart,
    garmentUrl: DEMO_PRESETS[0].garmentUrl,
    notes: 'High-stretch unstructured tailoring in your wardrobe',
  },
  {
    id: 'wardrobe-supima-tee',
    name: 'Heavyweight White Supima Crewneck T-Shirt',
    brand: 'Kotn',
    category: 'Layering Tee',
    color: 'Optic White',
    frontImage: STUDIO_OUTFIT_SVGS.whiteSupimaTee,
    cut: 'regular',
    fabric: 'stretch_knit',
    ownedSize: 'M',
    sizeChart: DEFAULT_SIZE_CHART,
    notes: '240gsm Egyptian cotton base layer in your closet',
  },
  {
    id: 'wardrobe-charcoal-trousers',
    name: 'Tailored Pleated Wool-Blend Trousers',
    brand: 'ZARA',
    category: 'Bottom',
    color: 'Deep Charcoal',
    frontImage: STUDIO_OUTFIT_SVGS.charcoalTrousers,
    cut: 'regular',
    fabric: 'woven',
    ownedSize: 'EU 50 / 34"',
    sizeChart: DEFAULT_SIZE_CHART,
    notes: 'Mid-rise tailored trousers calibrated for 95 cm waist',
  },
  {
    id: 'wardrobe-chrono-watch',
    name: '40mm Brushed Steel Chronograph (Leather Strap)',
    brand: 'Tissot Heritage',
    category: 'Watch',
    color: 'Midnight Dial / Espresso Strap',
    frontImage: STUDIO_OUTFIT_SVGS.chronographWatch,
    cut: 'regular',
    fabric: 'woven',
    ownedSize: '40mm Case',
    sizeChart: DEFAULT_SIZE_CHART,
    notes: '47mm lug-to-lug clears shirt and blazer cuffs cleanly',
  },
  {
    id: 'wardrobe-suede-loafers',
    name: 'Goodyear-Welted Espresso Suede Penny Loafers',
    brand: 'Morjas',
    category: 'Shoes',
    color: 'Espresso Suede',
    frontImage: STUDIO_OUTFIT_SVGS.suedeLoafers,
    cut: 'regular',
    fabric: 'woven',
    ownedSize: 'EU 43 / US 10',
    sizeChart: DEFAULT_SIZE_CHART,
    notes: 'Unlined suede vamp with low-profile leather sole',
  },
  {
    id: 'wardrobe-linen-overshirt',
    name: 'Relaxed Sandstone Linen Overshirt',
    brand: 'Atelier Archive',
    category: 'Overshirt',
    color: 'Warm Sandstone',
    frontImage: DEMO_PRESETS[1].garmentFrontImage,
    backImage: DEMO_PRESETS[1].garmentBackImage,
    cut: DEMO_PRESETS[1].cut,
    fabric: DEMO_PRESETS[1].fabric,
    ownedSize: 'M',
    sizeChart: DEMO_PRESETS[1].sizeChart,
    notes: 'Breathable woven layer with +10 cm relaxed cut allowance',
  },
];

/**
 * Generates curated 5-piece head-to-toe style recommendations (Top/Outer, Layering T-Shirt,
 * Bottom, Watch, and Shoes) that combine the user's existing clothing with live, in-stock
 * shop garments pre-fitted to their saved BodyMeasurements.
 */
export function buildStyleAndShopPairings(
  existingWardrobe: ExistingWardrobeItem[],
  shopCatalog: ShoppingProduct[],
  measurements: BodyMeasurements,
  searchQuery = ''
): StylePairingRecommendation[] {
  if (existingWardrobe.length === 0 || shopCatalog.length === 0) {
    return [];
  }

  const q = searchQuery.trim().toLowerCase();
  const availableShop = shopCatalog.filter((p) => p.available && p.availableSizes.length > 0);
  if (availableShop.length === 0) return [];

  // Rank shop items by query if present
  const sortedShop = [...availableShop].sort((a, b) => {
    if (!q) return 0;
    const aMatch = `${a.title} ${a.brand} ${a.category} ${a.details}`.toLowerCase().includes(q) ? 1 : 0;
    const bMatch = `${b.title} ${b.brand} ${b.category} ${b.details}`.toLowerCase().includes(q) ? 1 : 0;
    return bMatch - aMatch;
  });

  // Find closet pieces by category
  const closetTops = existingWardrobe.filter(
    (w) => w.category === 'Blazer' || w.category === 'Overshirt' || w.category === 'Shirt'
  );
  const closetLayering = existingWardrobe.filter(
    (w) => w.category === 'Layering Tee' || w.category === 'Knitwear'
  );
  const closetBottoms = existingWardrobe.filter((w) => w.category === 'Bottom');
  const closetWatches = existingWardrobe.filter((w) => w.category === 'Watch');
  const closetShoes = existingWardrobe.filter((w) => w.category === 'Shoes');

  // Calibrated waist & seat metrics from saved anthropometric profile
  const waistInches = Math.max(28, Math.min(42, Math.round(measurements.waist / 2.54) - 3));
  const euTrouserSize = waistInches <= 31 ? 48 : waistInches <= 34 ? 50 : 52;

  const pairings: StylePairingRecommendation[] = [];
  const usedShopIds = new Set<string>();

  const occasions = [
    'Smart Tailored Layering',
    'Elevated Weekend Proportions',
    'Relaxed Knit & Structure',
  ];

  // Curated complementary Bottoms, Watches, and Shoes when rotating across the 3 full outfits
  const curatedBottoms = [
    {
      name: closetBottoms[0]?.name || 'Tailored Pleated Wool-Blend Trousers',
      brand: closetBottoms[0]?.brand || 'ZARA',
      source: (closetBottoms[0] ? 'Your Closet' : 'Shop Match') as 'Your Closet' | 'Shop Match',
      sizeOrSpec: `EU ${euTrouserSize} / ${waistInches}" Waist`,
      fitNote: `Calibrated for ${measurements.waist} cm waist & ${measurements.hip} cm hip (+4 cm seat ease)`,
      price: closetBottoms[0] ? undefined : '119.00',
      imageUrl: closetBottoms[0]?.frontImage || STUDIO_OUTFIT_SVGS.charcoalTrousers,
      closetItem: closetBottoms[0],
    },
    {
      name: 'Relaxed Tapered Organic Twill Chinos',
      brand: 'Taylor Stitch',
      source: 'Shop Match' as const,
      sizeOrSpec: `${waistInches}" × 31" Inseam`,
      fitNote: `Mid-rise taper balances ${measurements.waist} cm waist with relaxed thigh drape`,
      price: '138.00',
      imageUrl: STUDIO_OUTFIT_SVGS.oliveChinos,
      productUrl: 'https://www.taylorstitch.com/collections/mens-pants',
    },
    {
      name: '14oz Japanese Selvedge Straight Denim',
      brand: 'Corridor NYC',
      source: 'Shop Match' as const,
      sizeOrSpec: `${waistInches}" Waist · Straight Cut`,
      fitNote: `Structured straight leg grounds ${measurements.chest} cm upper-body frame`,
      price: '225.00',
      imageUrl: STUDIO_OUTFIT_SVGS.selvedgeDenim,
      productUrl: 'https://corridornyc.com/collections/pants',
    },
  ];

  const curatedWatches = [
    {
      name: closetWatches[0]?.name || '40mm Brushed Steel Chronograph',
      brand: closetWatches[0]?.brand || 'Tissot Heritage',
      source: (closetWatches[0] ? 'Your Closet' : 'Shop Match') as 'Your Closet' | 'Shop Match',
      sizeOrSpec: '40mm · 11mm Slim Case',
      fitNote: '47mm lug-to-lug slips cleanly under blazer & shirt cuffs',
      imageUrl: closetWatches[0]?.frontImage || STUDIO_OUTFIT_SVGS.chronographWatch,
      closetItem: closetWatches[0],
    },
    {
      name: '38mm Brushed Titanium Field Watch (Olive NATO)',
      brand: 'Hamilton Khaki',
      source: 'Shop Match' as const,
      sizeOrSpec: '38mm · Matte Dial',
      fitNote: 'Lightweight field case complements textured hemp & linen weaves',
      price: '595.00',
      imageUrl: STUDIO_OUTFIT_SVGS.fieldWatch,
    },
    {
      name: '39mm Sunray Blue Automatic Dress Watch',
      brand: 'Seiko Presage',
      source: 'Shop Match' as const,
      sizeOrSpec: '39mm · Steel Bracelet',
      fitNote: 'Balanced dial proportion for rolled sleeves or knit cuffs',
      price: '450.00',
      imageUrl: STUDIO_OUTFIT_SVGS.steelDressWatch,
    },
  ];

  const curatedShoes = [
    {
      name: closetShoes[0]?.name || 'Goodyear-Welted Espresso Suede Loafers',
      brand: closetShoes[0]?.brand || 'Morjas',
      source: (closetShoes[0] ? 'Your Closet' : 'Shop Match') as 'Your Closet' | 'Shop Match',
      sizeOrSpec: closetShoes[0]?.ownedSize || 'EU 43 / US 10',
      fitNote: 'Almond toe elongates tailored trouser line with zero break',
      imageUrl: closetShoes[0]?.frontImage || STUDIO_OUTFIT_SVGS.suedeLoafers,
      closetItem: closetShoes[0],
    },
    {
      name: 'Minimalist Full-Grain Calfskin Low Sneakers',
      brand: 'JAK Footwear',
      source: 'Shop Match' as const,
      sizeOrSpec: 'EU 43 / US 10 (D Width)',
      fitNote: 'Clean tonal cupsole anchors relaxed overshirt & chino proportions',
      price: '215.00',
      imageUrl: STUDIO_OUTFIT_SVGS.minimalistSneakers,
    },
    {
      name: 'Goodyear-Welted Chromexcel Service Boots',
      brand: 'Grant Stone',
      source: 'Shop Match' as const,
      sizeOrSpec: 'US 9.5D (Leo Last)',
      fitNote: 'Structured heel counter balances heavy knitwear & selvedge denim',
      price: '380.00',
      imageUrl: STUDIO_OUTFIT_SVGS.serviceBoots,
    },
  ];

  for (let i = 0; i < 3; i++) {
    const primaryCloset = (closetTops[i % Math.max(1, closetTops.length)] ||
      existingWardrobe[i % existingWardrobe.length])!;

    const candidates = sortedShop.filter(
      (p) =>
        p.productUrl !== primaryCloset.garmentUrl &&
        !usedShopIds.has(p.id) &&
        !existingWardrobe.some(
          (w) =>
            (w.garmentUrl && w.garmentUrl === p.productUrl) ||
            w.name.toLowerCase().includes(p.title.toLowerCase())
        )
    );
    const shopPiece = candidates[0] || sortedShop[i % sortedShop.length];
    if (!shopPiece) continue;
    usedShopIds.add(shopPiece.id);

    const fit = analyzeFit({
      measurements,
      sizeChart: shopPiece.sizeChart || DEFAULT_SIZE_CHART,
      cut: shopPiece.cut,
      fabric: shopPiece.fabric,
    });

    const trueSize = fit.trueSize || 'M';
    const sizeRow = fit.sizeResults.find((s) => s.size === trueSize) || fit.sizeResults[2];
    const chestEase = sizeRow ? sizeRow.chest.ease : 6;

    const lowerTitle = shopPiece.title.toLowerCase();
    const isOuterwearPiece =
      lowerTitle.includes('blazer') ||
      lowerTitle.includes('overshirt') ||
      lowerTitle.includes('jacket') ||
      lowerTitle.includes('coat');

    // Decide whether the Shop piece sits in the Top/Outer slot or Layering (T-Shirt/Knit) slot
    const shopIsBaseOrKnit =
      !isOuterwearPiece &&
      (shopPiece.fabric === 'stretch_knit' ||
        lowerTitle.includes('tee') ||
        lowerTitle.includes('t-shirt') ||
        lowerTitle.includes('crew') ||
        lowerTitle.includes('polo'));

    const closetTee = closetLayering[0];

    const topSlot: OutfitSlotPiece = shopIsBaseOrKnit
      ? {
          slot: 'top',
          slotLabel: 'Top / Outer',
          name: primaryCloset.name,
          brand: primaryCloset.brand,
          source: 'Your Closet',
          sizeOrSpec: `Owned Size ${primaryCloset.ownedSize} (${primaryCloset.cut})`,
          fitNote: `Outer layer proportioned over ${measurements.chest} cm chest`,
          imageUrl: primaryCloset.frontImage,
          productUrl: primaryCloset.garmentUrl,
          closetItem: primaryCloset,
        }
      : {
          slot: 'top',
          slotLabel: 'Top / Outer',
          name: shopPiece.title,
          brand: shopPiece.brand,
          source: 'Shop Match',
          sizeOrSpec: `True Size ${trueSize} (${chestEase > 0 ? `+${chestEase}` : chestEase} cm ease)`,
          fitNote: `In-stock ${shopPiece.cut} cut for ${measurements.chest} cm chest`,
          price: shopPiece.price,
          imageUrl: shopPiece.frontImage,
          productUrl: shopPiece.productUrl,
          shopProduct: shopPiece,
        };

    const layeringSlot: OutfitSlotPiece = shopIsBaseOrKnit
      ? {
          slot: 'layering',
          slotLabel: 'Layering (T-Shirt)',
          name: shopPiece.title,
          brand: shopPiece.brand,
          source: 'Shop Match',
          sizeOrSpec: `True Size ${trueSize} (${chestEase > 0 ? `+${chestEase}` : chestEase} cm ease)`,
          fitNote: `Breathable knit base layer under ${primaryCloset.brand} outer`,
          price: shopPiece.price,
          imageUrl: shopPiece.frontImage,
          productUrl: shopPiece.productUrl,
          shopProduct: shopPiece,
        }
      : i === 1
        ? {
            slot: 'layering',
            slotLabel: 'Layering (T-Shirt)',
            name: 'Mercerized Slate Ribbed Crewneck Tee',
            brand: 'Kotn',
            source: 'Shop Match',
            sizeOrSpec: `True Size ${trueSize} (+4 cm base ease)`,
            fitNote: 'Smooth fine-ribbed jersey prevents bunching under overshirts',
            price: '48.00',
            imageUrl: STUDIO_OUTFIT_SVGS.ribbedSlateTee,
            productUrl: 'https://kotn.com/collections/mens-tshirts',
          }
        : {
            slot: 'layering',
            slotLabel: 'Layering (T-Shirt)',
            name: closetTee?.name || 'Heavyweight White Supima Crewneck T-Shirt',
            brand: closetTee?.brand || 'Kotn',
            source: closetTee ? 'Your Closet' : 'Shop Match',
            sizeOrSpec: `Size ${closetTee?.ownedSize || trueSize} (+4 cm base ease)`,
            fitNote: '240gsm collar holds structure cleanly beneath lapels',
            imageUrl: closetTee?.frontImage || STUDIO_OUTFIT_SVGS.whiteSupimaTee,
            closetItem: closetTee,
          };

    const btm = curatedBottoms[i % curatedBottoms.length];
    const bottomSlot: OutfitSlotPiece = {
      slot: 'bottom',
      slotLabel: 'Bottom',
      name: btm.name,
      brand: btm.brand,
      source: btm.source,
      sizeOrSpec: btm.sizeOrSpec,
      fitNote: btm.fitNote,
      price: btm.price,
      imageUrl: btm.imageUrl,
      productUrl: btm.productUrl,
      closetItem: btm.closetItem,
    };

    const wtc = curatedWatches[i % curatedWatches.length];
    const watchSlot: OutfitSlotPiece = {
      slot: 'watch',
      slotLabel: 'Watch',
      name: wtc.name,
      brand: wtc.brand,
      source: wtc.source,
      sizeOrSpec: wtc.sizeOrSpec,
      fitNote: wtc.fitNote,
      price: wtc.price,
      imageUrl: wtc.imageUrl,
      closetItem: wtc.closetItem,
    };

    const sho = curatedShoes[i % curatedShoes.length];
    const shoesSlot: OutfitSlotPiece = {
      slot: 'shoes',
      slotLabel: 'Shoes',
      name: sho.name,
      brand: sho.brand,
      source: sho.source,
      sizeOrSpec: sho.sizeOrSpec,
      fitNote: sho.fitNote,
      price: sho.price,
      imageUrl: sho.imageUrl,
      closetItem: sho.closetItem,
    };

    pairings.push({
      id: `pairing-${primaryCloset.id}-${shopPiece.id}-${i}`,
      title: `${topSlot.name.split('(')[0].trim()} + ${layeringSlot.name.split('(')[0].trim()}`,
      occasion: occasions[i % occasions.length],
      existingItem: primaryCloset,
      shopComplement: shopPiece,
      shopTrueSize: trueSize,
      shopChestEaseCm: chestEase,
      whyItWorks: `Complete 5-piece look calibrated for your ${measurements.chest} cm chest and ${measurements.waist} cm waist: pairs ${topSlot.brand}'s ${topSlot.name.split('(')[0].trim()} over ${layeringSlot.brand}'s ${layeringSlot.name.split('(')[0].trim()}, grounded with ${bottomSlot.sizeOrSpec} ${bottomSlot.name.toLowerCase()}, ${watchSlot.sizeOrSpec.split('·')[0].trim()} watch, and ${shoesSlot.name.toLowerCase()}.`,
      slots: {
        top: topSlot,
        layering: layeringSlot,
        bottom: bottomSlot,
        watch: watchSlot,
        shoes: shoesSlot,
      },
    });
  }

  return pairings;
}

/**
 * Computes which existing wardrobe piece best complements a given shop product.
 */
export function findBestWardrobeMatchForProduct(
  product: ShoppingProduct,
  existingWardrobe: ExistingWardrobeItem[]
): ExistingWardrobeItem | null {
  if (existingWardrobe.length === 0) return null;
  const isBlazer =
    product.title.toLowerCase().includes('blazer') ||
    product.category.toLowerCase().includes('blazer');
  if (isBlazer) {
    return existingWardrobe.find((w) => w.category !== 'Blazer') || existingWardrobe[0];
  }
  return existingWardrobe.find((w) => w.category === 'Blazer') || existingWardrobe[0];
}
