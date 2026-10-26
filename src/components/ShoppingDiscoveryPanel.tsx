import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Search,
  ExternalLink,
  Loader2,
  Shirt,
  Globe,
  RefreshCw,
} from 'lucide-react';
import {
  BodyMeasurements,
  LiveWebDiscoveryItem,
  ShoppingProduct,
} from '../types/tryon.ts';
import { evaluateProductFitForUser } from '../utils/shoppingMatcher.ts';

interface ShoppingDiscoveryPanelProps {
  measurements?: BodyMeasurements;
  activeGarmentUrl?: string;
  onSelectProductForTryOn: (product: ShoppingProduct) => void;
  onImportDiscoveryUrl: (url: string) => void;
  onCatalogLoaded?: (products: ShoppingProduct[]) => void;
}

const IDEA_PRESETS = [
  'Comfort Suit Blazer & Tailoring',
  'Relaxed Hemp & Canvas Overshirts',
  'Stretch Knit Crewnecks & Polos',
  'Smart Casual Jackets & Layers',
];

const BRAND_FILTERS = ['All', 'ZARA', 'Taylor Stitch', 'Percival London', 'Corridor NYC', 'Kotn'];

export const ShoppingDiscoveryPanel: React.FC<ShoppingDiscoveryPanelProps> = ({
  measurements,
  activeGarmentUrl,
  onSelectProductForTryOn,
  onImportDiscoveryUrl,
  onCatalogLoaded,
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
      const res = await fetch('/api/shop/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
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

  const toggleCardBackImage = (id: string) => {
    setFlippedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-label="Live Shopping & AI Garment Discovery"
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Official Storefront APIs</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold">Live Stock Verified</span>
            <span aria-hidden="true">·</span>
            <span>Pre-Fitted to Your Saved Body Profile (0ms)</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Live Shopping &amp; AI Garment Search
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every garment below is pre-fitted against your calibrated measurements ({measurements?.chest || 99} cm chest · {measurements?.waist || 95} cm waist · {measurements?.hip || 93} cm hip) with zero additional vision compute.
          </p>
        </div>

        {/* Low-Latency Runtime Readout */}
        {latencyMs !== null && (
          <div className="text-xs font-mono tabular-nums text-slate-500 self-start sm:self-center shrink-0">
            <span>Catalog feed: {latencyMs} ms</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">
              {cacheHit ? 'Edge Cache' : 'Live Feed'}
            </span>
          </div>
        )}
      </div>

      {/* AI Search Bar & Quick Idea Prompts */}
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
              placeholder="Search clothing ideas (e.g. 'unstructured blazer', 'hemp overshirt', 'stretch knit crew')..."
              aria-label="Search clothing ideas and available products"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAISearch()}
            disabled={isSearchingAI}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            {isSearchingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching Live Stock...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>AI Search Available Garments</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Idea Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Try Idea:</span>
          {IDEA_PRESETS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => handleAISearch(idea)}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* AI Styling & Grounded Web Discoveries Banner */}
      {(aiAdvice || webDiscoveries.length > 0) && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          {aiAdvice && (
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 space-y-1.5">
                <p className="font-bold text-slate-900">
                  AI Fit &amp; Style Recommendation for Your Saved Body Profile
                </p>
                <p className="leading-relaxed text-slate-700">{aiAdvice}</p>
                {recommendedIdeas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-slate-600">
                    {recommendedIdeas.map((idea, idx) => (
                      <span key={idx} className="text-xs">
                        {idx > 0 && <span className="mr-3 text-slate-300" aria-hidden="true">·</span>}
                        {idea}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {webDiscoveries.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Grounded Web Products (HTTP 200 Availability Verified)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {webDiscoveries.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-3 border border-slate-200 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                        <span className="font-semibold text-indigo-600 truncate">{item.brand}</span>
                        <span className="text-emerald-700 font-mono tabular-nums shrink-0">
                          Verified Live
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
                        Fit in 360° Studio &rarr;
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                      >
                        <span>Store</span>
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

      {/* Brand Filter Segmented Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
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
        <button
          type="button"
          onClick={() => loadCatalog(selectedBrand, searchQuery)}
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-medium cursor-pointer"
          title="Refresh live storefront stock"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
          <span>Refresh Feed ({products.length} in stock)</span>
        </button>
      </div>

      {/* Product Cards Grid */}
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
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No in-stock products matched that filter. Try clicking &ldquo;All&rdquo; or searching another style idea.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((product) => {
            const fitEval = measurements
              ? evaluateProductFitForUser(product, measurements)
              : null;
            const trueSizeRow = fitEval?.fitAnalysis.sizeResults.find(
              (s) => s.size === fitEval.trueSize
            );
            const isSelected = activeGarmentUrl === product.productUrl;
            const showBack = Boolean(flippedCardIds[product.id]);
            const displayImage = showBack ? product.backImage : product.frontImage;

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
                  {/* Product Image Viewport */}
                  <div className="relative aspect-3/4 bg-slate-100 overflow-hidden group">
                    <img
                      src={displayImage}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-103"
                    />

                    {/* Clean Top Overlay Bar */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                      <span className="bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded">
                        In Stock
                      </span>
                      <span className="bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2 py-0.5 rounded font-mono tabular-nums">
                        ${product.price}
                      </span>
                    </div>

                    {/* Front / Back Image Toggle */}
                    {product.backImage && product.backImage !== product.frontImage && (
                      <button
                        type="button"
                        onClick={() => toggleCardBackImage(product.id)}
                        className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-200 cursor-pointer"
                      >
                        {showBack ? 'Showing: Back' : 'View Back Photo'}
                      </button>
                    )}
                  </div>

                  {/* Card Details — Clean Unboxed Metadata */}
                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">{product.brand}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{product.cut}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{product.fabric.replace('_', ' ')}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                        {product.title}
                      </h3>
                    </div>

                    {/* Pre-Calculated True Size & Ease Readout (0ms from Saved Profile) */}
                    {fitEval && fitEval.trueSize && (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>True Size: {fitEval.trueSize}</span>
                          <span className={fitEval.trueSizeInStock ? 'text-emerald-700' : 'text-amber-700'}>
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

                    {/* Available Sizes Row */}
                    <div className="flex items-center gap-1 flex-wrap text-[11px] font-mono tabular-nums">
                      <span className="text-slate-400 font-sans mr-1">Sizes:</span>
                      {['XS', 'S', 'M', 'L', 'XL'].map((sz) => {
                        const inStock = product.availableSizes.includes(sz);
                        const isTrue = fitEval?.trueSize === sz;
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

                {/* Action Buttons Footer */}
                <div className="px-3.5 pb-3.5 pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectProductForTryOn(product)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Active in 360° Studio' : 'Fit in 360° Studio'}</span>
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
  );
};
