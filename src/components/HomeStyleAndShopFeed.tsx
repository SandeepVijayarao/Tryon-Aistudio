import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  ShoppingBag,
  Layers,
  Plus,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shirt,
  SlidersHorizontal,
  Globe,
  Check,
} from 'lucide-react';
import {
  BodyMeasurements,
  CutType,
  FabricType,
  LiveWebDiscoveryItem,
  ShoppingProduct,
} from '../types/tryon.ts';
import {
  ExistingWardrobeItem,
  OutfitSlotPiece,
  StylePairingRecommendation,
  STUDIO_OUTFIT_SVGS,
  buildStyleAndShopPairings,
  findBestWardrobeMatchForProduct,
} from '../utils/wardrobeStyler.ts';
import { evaluateProductFitForUser } from '../utils/shoppingMatcher.ts';
import { DEFAULT_SIZE_CHART } from '../utils/fitMath.ts';

interface HomeStyleAndShopFeedProps {
  measurements: BodyMeasurements;
  heightCm: number;
  existingWardrobe: ExistingWardrobeItem[];
  onAddWardrobeItem: (item: ExistingWardrobeItem) => void;
  onTryOnExistingItem: (item: ExistingWardrobeItem) => void;
  onTryOnShopProduct: (product: ShoppingProduct) => void;
  onTryOnCompleteOutfit?: (
    pairing: StylePairingRecommendation,
    focusSlot?: OutfitSlotPiece
  ) => void;
  onImportDiscoveryUrl: (url: string) => void;
  onOpenSettings: () => void;
  onCatalogLoaded?: (products: ShoppingProduct[]) => void;
  activeGarmentUrl?: string;
}

const AI_QUERY_SUGGESTIONS = [
  'Complete 5-piece smart dinner look with my Zara Blazer',
  'Relaxed hemp overshirt + layering tee + chinos + watch & shoes',
  'Breathable stretch knit crewnecks and polos to layer under jackets',
  'Tailored outerwear that fits a 99cm chest without pulling at the waist',
];

const BRAND_FILTERS = ['All', 'ZARA', 'Taylor Stitch', 'Percival London', 'Corridor NYC', 'Kotn'];

function getDefaultCategoryImage(
  category: ExistingWardrobeItem['category'],
  fallbackUrl: string
): string {
  switch (category) {
    case 'Layering Tee':
      return STUDIO_OUTFIT_SVGS.whiteSupimaTee;
    case 'Bottom':
      return STUDIO_OUTFIT_SVGS.charcoalTrousers;
    case 'Watch':
      return STUDIO_OUTFIT_SVGS.chronographWatch;
    case 'Shoes':
      return STUDIO_OUTFIT_SVGS.suedeLoafers;
    default:
      return fallbackUrl;
  }
}

export const HomeStyleAndShopFeed: React.FC<HomeStyleAndShopFeedProps> = ({
  measurements,
  heightCm,
  existingWardrobe,
  onAddWardrobeItem,
  onTryOnExistingItem,
  onTryOnShopProduct,
  onTryOnCompleteOutfit,
  onImportDiscoveryUrl,
  onOpenSettings,
  onCatalogLoaded,
  activeGarmentUrl,
}) => {
  const [products, setProducts] = useState<ShoppingProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingAI, setIsSearchingAI] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [recommendedIdeas, setRecommendedIdeas] = useState<string[]>([]);
  const [webDiscoveries, setWebDiscoveries] = useState<LiveWebDiscoveryItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean>(false);
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});
  const [savedToWardrobeIds, setSavedToWardrobeIds] = useState<Record<string, boolean>>({});

  // Add Existing Clothing Modal/Drawer State
  const [showAddWardrobeForm, setShowAddWardrobeForm] = useState<boolean>(false);
  const [newWardrobeName, setNewWardrobeName] = useState<string>('');
  const [newWardrobeBrand, setNewWardrobeBrand] = useState<string>('');
  const [newWardrobeCategory, setNewWardrobeCategory] =
    useState<ExistingWardrobeItem['category']>('Layering Tee');
  const [newWardrobeCut, setNewWardrobeCut] = useState<CutType>('regular');
  const [newWardrobeFabric, setNewWardrobeFabric] = useState<FabricType>('stretch_knit');
  const [newWardrobeSize, setNewWardrobeSize] = useState<string>('M');
  const [newWardrobeImage, setNewWardrobeImage] = useState<string>('');

  useEffect(() => {
    loadCatalog('All', '');
  }, []);

  const loadCatalog = async (brand: string, query: string) => {
    setIsLoadingCatalog(true);
    try {
      const params = new URLSearchParams();
      if (brand && brand !== 'All') params.set('brand', brand);
      if (query) params.set('q', query);
      const res = await fetch(`/api/shop/catalog?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
        if (brand === 'All' && !query && onCatalogLoaded) {
          onCatalogLoaded(data.products);
        }
      }
      if (typeof data.latencyMs === 'number') setLatencyMs(data.latencyMs);
      setCacheHit(Boolean(data.cacheHit));
    } catch (err) {
      console.warn('Failed to fetch live shopping catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleAISearch = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!q) {
      loadCatalog(selectedBrand, '');
      return;
    }
    if (customQuery !== undefined) {
      setSearchQuery(customQuery);
    }

    setIsSearchingAI(true);
    try {
      const wardrobeSummary = existingWardrobe
        .map((w) => `${w.brand} ${w.name} (${w.category}, Size ${w.ownedSize})`)
        .join('; ');

      const res = await fetch('/api/shop/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${q} (Existing wardrobe: ${wardrobeSummary})`,
          measurements,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.matchedProducts)) {
        setProducts(data.matchedProducts);
      }
      setAiAdvice(data.aiStylingAdvice || '');
      setRecommendedIdeas(Array.isArray(data.recommendedIdeas) ? data.recommendedIdeas : []);
      setWebDiscoveries(Array.isArray(data.webDiscoveries) ? data.webDiscoveries : []);
      if (typeof data.latencyMs === 'number') setLatencyMs(data.latencyMs);
      setCacheHit(Boolean(data.cacheHit));
    } catch (err) {
      console.warn('AI shopping search error:', err);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleBrandClick = (brand: string) => {
    setSelectedBrand(brand);
    loadCatalog(brand, searchQuery);
  };

  const handleFileUploadForWardrobe = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewWardrobeImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateWardrobeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWardrobeName.trim()) return;
    const fallbackImg =
      existingWardrobe[0]?.frontImage || '/assets/aistudio/1859546-800w_3767735c.jpg';
    const created: ExistingWardrobeItem = {
      id: `wardrobe-custom-${Date.now()}`,
      name: newWardrobeName.trim(),
      brand: newWardrobeBrand.trim() || 'Personal Wardrobe',
      category: newWardrobeCategory,
      color: 'Custom',
      frontImage: newWardrobeImage || getDefaultCategoryImage(newWardrobeCategory, fallbackImg),
      cut: newWardrobeCut,
      fabric: newWardrobeFabric,
      ownedSize: newWardrobeSize,
      sizeChart: DEFAULT_SIZE_CHART,
      notes: 'Added to your existing wardrobe',
    };
    onAddWardrobeItem(created);
    setNewWardrobeName('');
    setNewWardrobeBrand('');
    setNewWardrobeImage('');
    setShowAddWardrobeForm(false);
  };

  const handleSaveShopProductToWardrobe = (product: ShoppingProduct, recSize: string) => {
    const item: ExistingWardrobeItem = {
      id: `wardrobe-${product.id}`,
      name: product.title,
      brand: product.brand,
      category: product.title.toLowerCase().includes('blazer')
        ? 'Blazer'
        : product.title.toLowerCase().includes('overshirt')
          ? 'Overshirt'
          : product.title.toLowerCase().includes('tee') ||
              product.title.toLowerCase().includes('t-shirt')
            ? 'Layering Tee'
            : product.fabric === 'stretch_knit'
              ? 'Knitwear'
              : 'Shirt',
      color: 'Storefront Match',
      frontImage: product.frontImage,
      backImage: product.backImage,
      cut: product.cut,
      fabric: product.fabric,
      ownedSize: recSize,
      sizeChart: product.sizeChart,
      garmentUrl: product.productUrl,
      notes: `Saved from ${product.brand} in your True Size ${recSize}`,
    };
    onAddWardrobeItem(item);
    setSavedToWardrobeIds((prev) => ({ ...prev, [product.id]: true }));
  };

  const stylePairings = buildStyleAndShopPairings(
    existingWardrobe,
    products,
    measurements,
    searchQuery
  );

  const handleSlotCardTryOn = (
    pairing: StylePairingRecommendation,
    piece: OutfitSlotPiece
  ) => {
    if (onTryOnCompleteOutfit) {
      onTryOnCompleteOutfit(pairing, piece);
      return;
    }
    if (piece.shopProduct) {
      onTryOnShopProduct(piece.shopProduct);
    } else if (piece.closetItem) {
      onTryOnExistingItem(piece.closetItem);
    } else {
      onTryOnShopProduct(pairing.shopComplement);
    }
  };

  const renderSlotCard = (
    pairing: StylePairingRecommendation,
    piece: OutfitSlotPiece,
    compact = false
  ) => {
    const isCloset = piece.source === 'Your Closet';
    return (
      <button
        key={piece.slot}
        type="button"
        onClick={() => handleSlotCardTryOn(pairing, piece)}
        className="bg-white hover:bg-indigo-50/40 rounded-lg p-2.5 border border-slate-200/80 hover:border-indigo-300 flex flex-col justify-between gap-1.5 text-left transition-all group cursor-pointer"
        title={`Click to try on ${piece.slotLabel}: ${piece.name} in 360° Studio`}
      >
        <div className="w-full">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-700">
              {piece.slotLabel}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                isCloset ? 'text-slate-600' : 'text-emerald-700'
              }`}
            >
              {piece.source}
            </span>
          </div>

          <div
            className={`${
              compact ? 'aspect-square' : 'aspect-3/4'
            } rounded bg-slate-50 overflow-hidden mb-1.5 relative border border-slate-100`}
          >
            <img
              src={piece.imageUrl}
              alt={piece.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-103"
            />
            {piece.price && (
              <span className="absolute top-1.5 right-1.5 bg-white/95 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono tabular-nums border border-slate-200/60">
                ${piece.price}
              </span>
            )}
            <span className="absolute bottom-1 inset-x-1 bg-slate-900/80 text-white text-[9px] font-semibold py-0.5 px-1.5 rounded text-center opacity-0 group-hover:opacity-100 transition-opacity">
              Try in 360° &rarr;
            </span>
          </div>

          <div className="text-[10px] text-slate-500 truncate">
            <span className="font-semibold text-slate-800">{piece.brand}</span>
          </div>
          <div className="text-xs font-semibold text-slate-900 line-clamp-1" title={piece.name}>
            {piece.name}
          </div>
        </div>

        <div className="w-full pt-1 border-t border-slate-100">
          <div className="text-[10px] font-mono tabular-nums font-medium text-indigo-950 truncate">
            {piece.sizeOrSpec}
          </div>
          <div className="text-[10px] text-slate-500 line-clamp-1" title={piece.fitNote}>
            {piece.fitNote}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO AI STYLE & SHOPPING SEARCH CONCIERGE */}
      <section
        aria-label="AI Clothing & Style Search"
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">
                Calibrated Body Profile Active
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {heightCm} cm · Chest {measurements.chest} cm · Waist {measurements.waist} cm · Hip {measurements.hip} cm (±{measurements.uncertaintyCm} cm)
              </span>
              <span aria-hidden="true">·</span>
              <span>0ms Fit Evaluation</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Personal Style &amp; Live Shop Recommendations
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Ask AI to build complete 5-piece outfits (Top, Layering Tee, Bottom, Watch &amp; Shoes) from your closet and live in-stock catalogs.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 self-start lg:self-center shrink-0 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Photos &amp; Fit Settings</span>
          </button>
        </div>

        {/* AI Query Input Bar */}
        <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAISearch();
                  }
                }}
                placeholder="Ask AI to find clothing or build a 5-piece outfit (e.g. 'unstructured blazer outfit', 'layering tee and overshirt')..."
                aria-label="Ask AI to search clothing and style recommendations"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAISearch()}
              disabled={isSearchingAI}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              {isSearchingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching Style &amp; Stock...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>AI Search &amp; Match My Fit</span>
                </>
              )}
            </button>
          </div>

          {/* Prompt Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Ask AI:</span>
            {AI_QUERY_SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleAISearch(prompt)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* AI Grounded Styling Response & Live Web Matches */}
        {(aiAdvice || webDiscoveries.length > 0) && (
          <div className="rounded-xl bg-indigo-50/50 border border-indigo-200/80 p-4 space-y-3">
            {aiAdvice && (
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 space-y-1.5">
                  <p className="font-bold text-slate-900">
                    AI Stylist Answer for Your Proportions &amp; Wardrobe
                  </p>
                  <p className="leading-relaxed text-slate-700">{aiAdvice}</p>
                  {recommendedIdeas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-slate-600">
                      {recommendedIdeas.map((idea, idx) => (
                        <span key={idx} className="text-xs font-medium text-indigo-950">
                          {idx > 0 && (
                            <span className="mr-3 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                          )}
                          {idea}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {webDiscoveries.length > 0 && (
              <div className="pt-3 border-t border-indigo-200/60">
                <p className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Verified Web Retailers (Live HTTP 200 Stock Check)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {webDiscoveries.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-3 border border-slate-200 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-indigo-600 truncate">
                            {item.brand}
                          </span>
                          <span className="text-emerald-700 font-mono tabular-nums shrink-0">
                            Live 200 OK
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 line-clamp-1 mt-0.5">
                          {item.title}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onImportDiscoveryUrl(item.url)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Try On in 360° Studio &rarr;
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                        >
                          <span>Retailer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. COMPLETE 5-PIECE STYLE RECOMMENDATIONS WITH YOUR EXISTING CLOTHING */}
      <section
        aria-label="Style Recommendations with Existing Clothing"
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>01. Complete 5-Piece Lookbook</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-700">
                Top + Layering (T-Shirt) + Bottom + Watch + Shoes
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Style Recommendations with Your Existing Clothing
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Head-to-toe outfits combining pieces from your closet with live in-stock garments calibrated for your {measurements.chest} cm chest and {measurements.waist} cm waist. Click any piece or outfit to try on in 360°.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddWardrobeForm(!showAddWardrobeForm)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAddWardrobeForm ? 'Cancel' : 'Add Existing Clothing Piece'}</span>
          </button>
        </div>

        {/* Inline Add Existing Wardrobe Piece Form */}
        {showAddWardrobeForm && (
          <form
            onSubmit={handleCreateWardrobeItem}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
          >
            <div className="text-xs font-bold text-slate-900">
              Add a Piece from Your Closet (Top, Layering T-Shirt, Bottom, Watch, or Shoes)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Piece Name
                </label>
                <input
                  type="text"
                  required
                  value={newWardrobeName}
                  onChange={(e) => setNewWardrobeName(e.target.value)}
                  placeholder="e.g. Heavyweight Crewneck T-Shirt"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={newWardrobeBrand}
                  onChange={(e) => setNewWardrobeBrand(e.target.value)}
                  placeholder="e.g. Uniqlo / COS / Tissot"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Outfit Slot / Category
                </label>
                <select
                  value={newWardrobeCategory}
                  onChange={(e) =>
                    setNewWardrobeCategory(e.target.value as ExistingWardrobeItem['category'])
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="Blazer">Top: Blazer</option>
                  <option value="Overshirt">Top: Overshirt</option>
                  <option value="Shirt">Top: Shirt</option>
                  <option value="Layering Tee">Layering (T-Shirt)</option>
                  <option value="Knitwear">Layering (Knitwear)</option>
                  <option value="Bottom">Bottom (Trousers / Denim)</option>
                  <option value="Watch">Watch</option>
                  <option value="Shoes">Shoes</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Owned Size &amp; Cut
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={newWardrobeSize}
                    onChange={(e) => setNewWardrobeSize(e.target.value)}
                    className="w-20 px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', '34" Waist', '40mm', 'EU 43'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newWardrobeCut}
                    onChange={(e) => setNewWardrobeCut(e.target.value as CutType)}
                    className="flex-1 px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  >
                    <option value="slim">Slim</option>
                    <option value="regular">Regular</option>
                    <option value="relaxed">Relaxed</option>
                    <option value="oversized">Oversized</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUploadForWardrobe}
                  className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-200 file:text-slate-800 file:font-semibold"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Save to My Existing Wardrobe
              </button>
            </div>
          </form>
        )}

        {/* Your Existing Clothing Strip */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0">
            Your Closet ({existingWardrobe.length}):
          </span>
          {existingWardrobe.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 shrink-0"
            >
              <img
                src={item.frontImage}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-10 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
              />
              <div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800">{item.brand}</span>
                  <span className="mx-1" aria-hidden="true">·</span>
                  <span>{item.category}</span>
                  <span className="mx-1" aria-hidden="true">·</span>
                  <span className="font-mono">{item.ownedSize}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 max-w-[180px] truncate">
                  {item.name}
                </div>
                <button
                  type="button"
                  onClick={() => onTryOnExistingItem(item)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 mt-0.5 cursor-pointer"
                >
                  Inspect Fit in 360° Studio &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Curated 5-Piece Outfit Recommendations Grid */}
        {stylePairings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {stylePairings.map((pairing, idx) => (
              <div
                key={pairing.id}
                className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3.5 bg-slate-50/40"
              >
                <div className="space-y-3">
                  {/* Outfit Header */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-200/70 pb-2.5">
                    <div>
                      <span className="font-bold text-slate-900">
                        0{idx + 1}. {pairing.occasion}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        5-Piece Look · Top + Tee + Bottom + Watch + Shoes
                      </div>
                    </div>
                    <span className="text-emerald-700 font-mono tabular-nums font-semibold shrink-0">
                      True Size {pairing.shopTrueSize}
                    </span>
                  </div>

                  {/* Upper Body Row: 1. Top / Outer + 2. Layering (T-Shirt) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {renderSlotCard(pairing, pairing.slots.top, false)}
                    {renderSlotCard(pairing, pairing.slots.layering, false)}
                  </div>

                  {/* Lower Body & Accessories Row: 3. Bottom + 4. Watch + 5. Shoes */}
                  <div className="grid grid-cols-3 gap-2">
                    {renderSlotCard(pairing, pairing.slots.bottom, true)}
                    {renderSlotCard(pairing, pairing.slots.watch, true)}
                    {renderSlotCard(pairing, pairing.slots.shoes, true)}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {pairing.whyItWorks}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() =>
                      onTryOnCompleteOutfit
                        ? onTryOnCompleteOutfit(pairing)
                        : onTryOnShopProduct(pairing.shopComplement)
                    }
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    <span>Try 5-Piece Outfit in 360° ({pairing.shopTrueSize})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onTryOnCompleteOutfit
                        ? onTryOnCompleteOutfit(
                            pairing,
                            pairing.slots.top.source === 'Your Closet'
                              ? pairing.slots.top
                              : pairing.slots.layering
                          )
                        : onTryOnExistingItem(pairing.existingItem)
                    }
                    className="py-2 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Inspect your closet piece within this 5-piece outfit in 360°"
                  >
                    Closet 360°
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. SIMULTANEOUS LIVE SHOP RECOMMENDATIONS (OFFICIAL STOREFRONT APIS) */}
      <section
        aria-label="Live Shop Recommendations"
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>02. Official Storefront Catalog</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">Live Stock Verified</span>
              <span aria-hidden="true">·</span>
              <span>Pre-Fitted to Your Saved Profile</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Shop Recommendations for Your Build &amp; Wardrobe
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {latencyMs !== null && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {latencyMs} ms · {cacheHit ? 'Edge Cache' : 'Live API'}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadCatalog(selectedBrand, searchQuery)}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
              <span>Refresh ({products.length} available)</span>
            </button>
          </div>
        </div>

        {/* Brand Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 w-fit">
          {BRAND_FILTERS.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => handleBrandClick(brand)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedBrand === brand
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-slate-200 p-3 space-y-3 animate-pulse bg-slate-50"
              >
                <div className="aspect-3/4 rounded-lg bg-slate-200/70" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((product) => {
              const fitEval = evaluateProductFitForUser(product, measurements);
              const trueSizeRow = fitEval.fitAnalysis.sizeResults.find(
                (s) => s.size === fitEval.trueSize
              );
              const wardrobeMatch = findBestWardrobeMatchForProduct(product, existingWardrobe);
              const isSelected = activeGarmentUrl === product.productUrl;
              const showBack = Boolean(flippedCardIds[product.id]);
              const displayImage = showBack ? product.backImage : product.frontImage;
              const isSavedInCloset = Boolean(savedToWardrobeIds[product.id]);

              return (
                <div
                  key={product.id}
                  className={`rounded-xl border transition-all flex flex-col justify-between overflow-hidden bg-white ${
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Product Image */}
                    <div
                      onClick={() => onTryOnShopProduct(product)}
                      className="relative aspect-3/4 bg-slate-100 overflow-hidden group cursor-pointer"
                      title={`Try ${product.title} on in 360° Studio`}
                    >
                      <img
                        src={displayImage}
                        alt={product.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-103"
                      />

                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                        <span className="bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded">
                          In Stock
                        </span>
                        <span className="bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2 py-0.5 rounded font-mono tabular-nums">
                          ${product.price}
                        </span>
                      </div>

                      {product.backImage && product.backImage !== product.frontImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedCardIds((prev) => ({
                              ...prev,
                              [product.id]: !prev[product.id],
                            }));
                          }}
                          className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-200 cursor-pointer"
                        >
                          {showBack ? 'Showing: Back' : 'View Back Photo'}
                        </button>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3.5 space-y-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800">{product.brand}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{product.cut}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{product.fabric.replace('_', ' ')}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                          {product.title}
                        </h4>
                      </div>

                      {/* Pre-Calculated True Size & Ease */}
                      {fitEval.trueSize && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-slate-900">
                            <span>Your True Size: {fitEval.trueSize}</span>
                            <span
                              className={
                                fitEval.trueSizeInStock ? 'text-emerald-700' : 'text-amber-700'
                              }
                            >
                              {fitEval.trueSizeInStock ? 'Ready in Stock' : 'Alt Size Available'}
                            </span>
                          </div>
                          {trueSizeRow && (
                            <div className="text-slate-500 font-mono tabular-nums mt-0.5">
                              Chest {trueSizeRow.chest.ease > 0 ? `+${trueSizeRow.chest.ease}` : trueSizeRow.chest.ease}cm · Waist {trueSizeRow.waist.ease > 0 ? `+${trueSizeRow.waist.ease}` : trueSizeRow.waist.ease}cm ({trueSizeRow.overallCategory})
                            </div>
                          )}
                        </div>
                      )}

                      {/* Existing Wardrobe Pairing Note */}
                      {wardrobeMatch && (
                        <div className="text-[11px] text-slate-500 truncate">
                          Pairs with your <span className="font-medium text-slate-800">{wardrobeMatch.name.split('(')[0].trim()}</span>
                        </div>
                      )}

                      {/* Available Sizes */}
                      <div className="flex items-center gap-1 flex-wrap text-[11px] font-mono tabular-nums">
                        <span className="text-slate-400 font-sans mr-1">Sizes:</span>
                        {['XS', 'S', 'M', 'L', 'XL'].map((sz) => {
                          const inStock = product.availableSizes.includes(sz);
                          const isTrue = fitEval.trueSize === sz;
                          return (
                            <span
                              key={sz}
                              className={`px-1.5 py-0.5 rounded ${
                                !inStock
                                  ? 'text-slate-300 line-through'
                                  : isTrue
                                    ? 'bg-slate-900 text-white font-semibold'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {sz}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-3.5 pb-3.5 pt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTryOnShopProduct(product)}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shirt className="w-3.5 h-3.5" />
                      <span>Fit in 360°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveShopProductToWardrobe(product, fitEval.trueSize || 'M')
                      }
                      disabled={isSavedInCloset}
                      title="Save piece to your existing wardrobe"
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:text-emerald-700 transition-colors cursor-pointer"
                    >
                      {isSavedInCloset ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${product.title} store page`}
                      aria-label={`Open ${product.title} store page`}
                      className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
