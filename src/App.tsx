import React, { useState, useEffect } from 'react';
import { Header, WorkspaceTab } from './components/Header.tsx';
import { Turntable360Viewer } from './components/Turntable360Viewer.tsx';
import { FitResultsCard } from './components/FitResultsCard.tsx';
import { CompareView } from './components/CompareView.tsx';
import { HomeStyleAndShopFeed } from './components/HomeStyleAndShopFeed.tsx';
import { BodyProfileWorkspace } from './components/BodyProfileWorkspace.tsx';
import { GarmentSpecDrawer } from './components/GarmentSpecDrawer.tsx';
import { MultiAgentSwarmPanel } from './components/MultiAgentSwarmPanel.tsx';
import { HackathonPresentationView } from './components/HackathonPresentationView.tsx';
import {
  CutType,
  FabricType,
  SizeChartEntry,
  ValidationResult,
  FitAnalysis,
  SpinFrame,
  ShoppingProduct,
} from './types/tryon.ts';
import { DEMO_PRESETS, DemoPreset } from './utils/demoPresets.ts';
import { DEFAULT_SIZE_CHART } from './utils/fitMath.ts';
import {
  SavedBodyProfile,
  buildReusableBodyProfile,
  fitGarmentWithSavedProfile,
  getGarmentSpinCacheKey,
} from './utils/bodyProfileStore.ts';
import {
  DEFAULT_EXISTING_WARDROBE,
  ExistingWardrobeItem,
  OutfitSlotPiece,
  OutfitSlotType,
  StylePairingRecommendation,
  buildStyleAndShopPairings,
} from './utils/wardrobeStyler.ts';
import {
  RotateCw,
  ShoppingBag,
  UserCheck,
  Settings,
  ArrowLeft,
  Layers,
  Cpu,
  ArrowRight,
  Presentation,
} from 'lucide-react';

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function App() {
  // Primary workspace navigation: 'home' (Style + Shop + AI Search), 'studio' (360° Fitting Room), 'settings' (Photo Setup & Fit Settings)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [isInitialSetupMode, setIsInitialSetupMode] = useState<boolean>(false);

  // Preset selection
  const [currentPresetId, setCurrentPresetId] = useState<string>(DEMO_PRESETS[0].id);

  // Calibrated Body Profile (Built Once during setup, editable anytime in Settings)
  const [savedProfile, setSavedProfile] = useState<SavedBodyProfile>(() =>
    buildReusableBodyProfile({
      id: DEMO_PRESETS[0].id,
      name: 'Calibrated Shopper Profile',
      heightCm: DEMO_PRESETS[0].heightCm,
      frontImage: DEMO_PRESETS[0].shopperFrontImage,
      backImage: DEMO_PRESETS[0].shopperBackImage,
      sideImage: DEMO_PRESETS[0].shopperSideImage,
      frontLandmarks: DEMO_PRESETS[0].frontLandmarks,
      backLandmarks: DEMO_PRESETS[0].backLandmarks,
      sideLandmarks: DEMO_PRESETS[0].sideLandmarks,
      previousComputeCount: 1,
    })
  );

  // User's Existing Wardrobe (used on the Home Page to pair existing clothing with shop recommendations)
  const [existingWardrobe, setExistingWardrobe] = useState<ExistingWardrobeItem[]>(
    DEFAULT_EXISTING_WARDROBE
  );

  // Active 5-Piece Outfit equipped in the 360° Studio
  const [activeOutfit, setActiveOutfit] = useState<StylePairingRecommendation | null>(null);
  const [activeOutfitSlotType, setActiveOutfitSlotType] = useState<OutfitSlotType>('top');

  // Counter of how many garment fits have reused the calibrated body profile with 0 vision compute
  const [fittedGarmentsCount, setFittedGarmentsCount] = useState<number>(2);
  const [lastFitComputeMs, setLastFitComputeMs] = useState<number>(0.3);

  // Compute Saver Mode: 'low' (Instant 0ms math + keyframes) vs 'full' (8-angle AI turntable synthesis)
  const [computeMode, setComputeMode] = useState<'low' | 'full'>('low');

  // Active Garment in 360° Studio
  const [activeGarmentId, setActiveGarmentId] = useState<string>(DEMO_PRESETS[0].id);
  const [garmentFront, setGarmentFront] = useState<string | undefined>(
    DEMO_PRESETS[0].garmentFrontImage
  );
  const [garmentBack, setGarmentBack] = useState<string | undefined>(
    DEMO_PRESETS[0].garmentBackImage
  );
  const [garmentUrl, setGarmentUrl] = useState<string>(
    DEMO_PRESETS[0].garmentUrl || 'https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html'
  );
  const [garmentName, setGarmentName] = useState<string>(DEMO_PRESETS[0].garmentName);
  const [garmentDetails, setGarmentDetails] = useState<string>(
    DEMO_PRESETS[0].garmentDetails || ''
  );
  const [cut, setCut] = useState<CutType>(DEMO_PRESETS[0].cut);
  const [fabric, setFabric] = useState<FabricType>(DEMO_PRESETS[0].fabric);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>(DEMO_PRESETS[0].sizeChart);
  const [isImportingUrl, setIsImportingUrl] = useState<boolean>(false);

  // Quick-Switch Catalog Garments for the 1-Click Studio Bar
  const [quickCatalog, setQuickCatalog] = useState<ShoppingProduct[]>([]);

  // Photo Validations
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({
    front: {
      valid: true,
      peopleCount: 1,
      fullBodyVisible: true,
      feedback: 'Front view extracted from 3-view portrait: full body head-to-toe visible.',
    },
    back: {
      valid: true,
      peopleCount: 1,
      fullBodyVisible: true,
      feedback: 'Back view extracted from 3-view portrait: rear torso & shoulder span verified.',
    },
    side: {
      valid: true,
      peopleCount: 1,
      fullBodyVisible: true,
      feedback: 'Side profile extracted from 3-view portrait: chest, waist & hip depth measured.',
    },
    garment_front: {
      valid: true,
      peopleCount: 1,
      fullBodyVisible: true,
      feedback: 'Zara Comfort Suit Blazer (Ref. 4456/999) front verified.',
    },
    garment_back: {
      valid: true,
      peopleCount: 1,
      fullBodyVisible: true,
      feedback: 'Zara Comfort Suit Blazer double back vent structure verified.',
    },
  });
  const [validatingSlot, setValidatingSlot] = useState<string | null>(null);

  // Fit Analysis & Spin Frames
  const [analysis, setAnalysis] = useState<FitAnalysis>(() =>
    fitGarmentWithSavedProfile(savedProfile, {
      sizeChart: DEMO_PRESETS[0].sizeChart,
      cut: DEMO_PRESETS[0].cut,
      fabric: DEMO_PRESETS[0].fabric,
    })
  );
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Spins Cache namespaced by garment + size (garmentSpinKey -> SpinFrame[])
  const [spinsCache, setSpinsCache] = useState<Record<string, SpinFrame[]>>({});

  useEffect(() => {
    loadPreset(DEMO_PRESETS[0]);
    fetch('/api/shop/catalog')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          setQuickCatalog(data.products.slice(0, 6));
          const initialOutfits = buildStyleAndShopPairings(
            DEFAULT_EXISTING_WARDROBE,
            data.products,
            savedProfile.measurements
          );
          if (initialOutfits.length > 0) {
            setActiveOutfit(initialOutfits[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Whenever garment specs or savedProfile change, recompute FitAnalysis in <1ms pure client math
  useEffect(() => {
    const t0 = performance.now();
    const updatedAnalysis = fitGarmentWithSavedProfile(savedProfile, {
      sizeChart,
      cut,
      fabric,
    });
    const elapsed = Math.max(0.2, Math.round((performance.now() - t0) * 10) / 10);
    setLastFitComputeMs(elapsed);
    setAnalysis(updatedAnalysis);
    if (updatedAnalysis.trueSize) {
      setSelectedSize(updatedAnalysis.trueSize);
    }
  }, [savedProfile, sizeChart, cut, fabric]);

  const scrollToTopSmooth = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPreset = (preset: DemoPreset) => {
    setCurrentPresetId(preset.id);
    const gId = preset.id;
    setActiveGarmentId(gId);
    setActiveOutfitSlotType('top');
    setGarmentFront(preset.garmentFrontImage);
    setGarmentBack(preset.garmentBackImage);
    setGarmentUrl(preset.garmentUrl || '');
    setGarmentName(preset.garmentName);
    setGarmentDetails(preset.garmentDetails || '');
    setCut(preset.cut);
    setFabric(preset.fabric);
    setSizeChart(preset.sizeChart);

    const profile = buildReusableBodyProfile({
      id: preset.id,
      name: 'Calibrated Shopper Profile',
      heightCm: preset.heightCm,
      frontImage: preset.shopperFrontImage,
      backImage: preset.shopperBackImage,
      sideImage: preset.shopperSideImage,
      frontLandmarks: preset.frontLandmarks,
      backLandmarks: preset.backLandmarks,
      sideLandmarks: preset.sideLandmarks,
      previousComputeCount: 1,
    });
    setSavedProfile(profile);

    const fitAnalysis = fitGarmentWithSavedProfile(profile, {
      sizeChart: preset.sizeChart,
      cut: preset.cut,
      fabric: preset.fabric,
    });
    setAnalysis(fitAnalysis);
    setSelectedSize(fitAnalysis.trueSize || 'M');

    setSpinsCache((prev) => {
      const next = { ...prev };
      for (const [sz, frames] of Object.entries(preset.framesBySize)) {
        const key = getGarmentSpinCacheKey(gId, sz);
        next[key] = ANGLES.map((angle, idx) => ({
          angle,
          label: `${angle}°`,
          imageUrl: frames[idx],
          status: 'ready',
        }));
      }
      return next;
    });
  };

  // Clicking Reset opens the initial Setup flow so user can upload fresh photos
  const resetToSetupFlow = () => {
    setIsInitialSetupMode(true);
    setActiveTab('settings');
    scrollToTopSmooth();
  };

  // Instant 0ms Body Profile update when Height or tape-measure Overrides change in Settings
  const handleUpdateBodyNumbers = (updates: {
    heightCm?: number;
    overrideChest?: number;
    overrideWaist?: number;
    overrideHip?: number;
  }) => {
    setSavedProfile((prev) =>
      buildReusableBodyProfile({
        id: prev.id,
        name: prev.name,
        heightCm: updates.heightCm !== undefined ? updates.heightCm : prev.heightCm,
        frontImage: prev.frontImage,
        backImage: prev.backImage,
        sideImage: prev.sideImage,
        frontLandmarks: prev.frontLandmarks,
        backLandmarks: prev.backLandmarks,
        sideLandmarks: prev.sideLandmarks,
        overrideChest: 'overrideChest' in updates ? updates.overrideChest : prev.overrideChest,
        overrideWaist: 'overrideWaist' in updates ? updates.overrideWaist : prev.overrideWaist,
        overrideHip: 'overrideHip' in updates ? updates.overrideHip : prev.overrideHip,
        previousComputeCount: prev.computeCount,
      })
    );
  };

  // Map category to outfit slot type for proper anatomical positioning on the 360° model
  const mapCategoryToSlotType = (cat: ExistingWardrobeItem['category']): OutfitSlotType => {
    if (cat === 'Layering Tee' || cat === 'Knitwear') return 'layering';
    if (cat === 'Bottom') return 'bottom';
    if (cat === 'Watch') return 'watch';
    if (cat === 'Shoes') return 'shoes';
    return 'top';
  };

  // High-Speed Parallel 360° Spin Generation (supports explicit garment overrides for instant Try-On)
  const generateSpinForSize = async (
    size: string,
    currentAnalysis: FitAnalysis,
    forceRegenerate = false,
    overrideGarment?: {
      id: string;
      frontImage?: string;
      backImage?: string;
      details?: string;
    }
  ) => {
    const targetId = overrideGarment?.id || activeGarmentId;
    const targetFront = overrideGarment?.frontImage || garmentFront;
    const targetBack = overrideGarment?.backImage || garmentBack || targetFront;
    const targetDetails = overrideGarment?.details !== undefined ? overrideGarment.details : garmentDetails;

    const cacheKey = getGarmentSpinCacheKey(targetId, size);
    if (
      !forceRegenerate &&
      spinsCache[cacheKey] &&
      spinsCache[cacheKey].every((f) => f.status === 'ready')
    ) {
      return;
    }

    const sizeResult = currentAnalysis.sizeResults.find((s) => s.size === size);
    const promptFitText = sizeResult?.promptFitText || `Fit: fitted for size ${size}.`;
    const activePreset = DEMO_PRESETS.find((p) => p.id === currentPresetId) || DEMO_PRESETS[0];

    const initialFrames: SpinFrame[] = ANGLES.map((angle, idx) => ({
      angle,
      label: `${angle}°`,
      imageUrl: activePreset.framesBySize[size]?.[idx] || savedProfile.frontImage,
      status: computeMode === 'low' && angle !== 0 && angle !== 180 ? 'ready' : 'generating',
    }));
    setSpinsCache((prev) => ({ ...prev, [cacheKey]: initialFrames }));

    try {
      const [frontData, backData] = await Promise.all([
        fetch('/api/generate-spin-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angle: 0,
            shopperFrontImage: savedProfile.frontImage,
            shopperBackImage: savedProfile.backImage || savedProfile.frontImage,
            shopperSideImage: savedProfile.sideImage,
            garmentFrontImage: targetFront || savedProfile.frontImage,
            garmentBackImage: targetBack || targetFront || savedProfile.frontImage,
            promptFitText,
            garmentDetails: targetDetails,
            size,
            fallbackSvg: activePreset.framesBySize[size]?.[0] || savedProfile.frontImage,
          }),
        }).then((r) => r.json()),
        fetch('/api/generate-spin-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angle: 180,
            shopperFrontImage: savedProfile.frontImage,
            shopperBackImage: savedProfile.backImage || savedProfile.frontImage,
            shopperSideImage: savedProfile.sideImage,
            garmentFrontImage: targetFront || savedProfile.frontImage,
            garmentBackImage: targetBack || targetFront || savedProfile.frontImage,
            promptFitText,
            garmentDetails: targetDetails,
            size,
            fallbackSvg:
              activePreset.framesBySize[size]?.[4] ||
              savedProfile.backImage ||
              savedProfile.frontImage,
          }),
        }).then((r) => r.json()),
      ]);

      const frontKeyframeUrl = frontData.imageUrl;
      const backKeyframeUrl = backData.imageUrl;

      setSpinsCache((prev) => {
        const updated = [...(prev[cacheKey] || initialFrames)];
        const idx0 = updated.findIndex((f) => f.angle === 0);
        if (idx0 !== -1)
          updated[idx0] = { ...updated[idx0], imageUrl: frontKeyframeUrl, status: 'ready' };
        const idx180 = updated.findIndex((f) => f.angle === 180);
        if (idx180 !== -1)
          updated[idx180] = { ...updated[idx180], imageUrl: backKeyframeUrl, status: 'ready' };
        return { ...prev, [cacheKey]: updated };
      });

      if (computeMode === 'low') {
        return;
      }

      const inBetweenAngles = [45, 90, 135, 225, 270, 315];
      await Promise.all(
        inBetweenAngles.map(async (angle) => {
          const frameIdx = ANGLES.indexOf(angle);
          const fallback = activePreset.framesBySize[size]?.[frameIdx] || frontKeyframeUrl;

          const res = await fetch('/api/generate-spin-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              angle,
              shopperFrontImage: savedProfile.frontImage,
              shopperBackImage: savedProfile.backImage || savedProfile.frontImage,
              shopperSideImage: savedProfile.sideImage,
              garmentFrontImage: targetFront || savedProfile.frontImage,
              garmentBackImage: targetBack || targetFront || savedProfile.frontImage,
              frontKeyframe: frontKeyframeUrl,
              backKeyframe: backKeyframeUrl,
              promptFitText,
              garmentDetails: targetDetails,
              size,
              fallbackSvg: fallback,
            }),
          });
          const frameData = await res.json();

          setSpinsCache((prev) => {
            const updated = [...(prev[cacheKey] || initialFrames)];
            const idx = updated.findIndex((f) => f.angle === angle);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], imageUrl: frameData.imageUrl, status: 'ready' };
            }
            return { ...prev, [cacheKey]: updated };
          });
        })
      );
    } catch (frameErr) {
      console.warn('Error during parallel frame generation:', frameErr);
    }
  };

  // Try on an Existing Wardrobe Item in 360° Studio
  const handleTryOnExistingItem = (item: ExistingWardrobeItem) => {
    const t0 = performance.now();
    setActiveGarmentId(item.id);
    setActiveOutfitSlotType(mapCategoryToSlotType(item.category));
    setGarmentFront(item.frontImage);
    setGarmentBack(item.backImage || item.frontImage);
    setGarmentUrl(item.garmentUrl || '');
    const fullName = `${item.brand} — ${item.name}`;
    const detailsText = `${fullName}. ${item.notes || `${item.category} (${item.color})`}`;
    setGarmentName(fullName);
    setGarmentDetails(detailsText);
    setCut(item.cut);
    setFabric(item.fabric);
    setSizeChart(item.sizeChart);

    const newAnalysis = fitGarmentWithSavedProfile(savedProfile, {
      sizeChart: item.sizeChart,
      cut: item.cut,
      fabric: item.fabric,
    });
    const elapsed = Math.max(0.2, Math.round((performance.now() - t0) * 10) / 10);
    setLastFitComputeMs(elapsed);
    setAnalysis(newAnalysis);
    const recSize = newAnalysis.trueSize || 'M';
    setSelectedSize(recSize);
    setFittedGarmentsCount((c) => c + 1);

    setActiveTab('studio');
    scrollToTopSmooth();

    // If it's one of the two pre-baked studio presets, use pre-baked frames; otherwise dress the model via AI
    if (item.id === 'wardrobe-zara-blazer' || item.id === 'wardrobe-linen-overshirt') {
      const basePreset = item.id === 'wardrobe-linen-overshirt' ? DEMO_PRESETS[1] : DEMO_PRESETS[0];
      setSpinsCache((prev) => {
        const next = { ...prev };
        for (const [sz, frames] of Object.entries(basePreset.framesBySize)) {
          const key = getGarmentSpinCacheKey(item.id, sz);
          next[key] = ANGLES.map((angle, idx) => ({
            angle,
            label: `${angle}°`,
            imageUrl: frames[idx],
            status: 'ready',
          }));
        }
        return next;
      });
    } else {
      void generateSpinForSize(recSize, newAnalysis, false, {
        id: item.id,
        frontImage: item.frontImage,
        backImage: item.backImage || item.frontImage,
        details: detailsText,
      });
    }
  };

  // Instant 1-Click Shop Garment Fit + Live AI Model Dressing
  const handleSelectShoppingProduct = (product: ShoppingProduct, outfitContext?: string) => {
    const t0 = performance.now();
    setActiveGarmentId(product.id);
    const isLayering =
      !product.title.toLowerCase().includes('blazer') &&
      !product.title.toLowerCase().includes('overshirt') &&
      (product.fabric === 'stretch_knit' ||
        product.title.toLowerCase().includes('tee') ||
        product.title.toLowerCase().includes('crew'));
    setActiveOutfitSlotType(isLayering ? 'layering' : 'top');
    setGarmentFront(product.frontImage);
    setGarmentBack(product.backImage || product.frontImage);
    setGarmentUrl(product.productUrl);
    const fullName = `${product.brand} — ${product.title}`;
    const fullDetails = outfitContext
      ? `${fullName}. ${product.details}. Styled in complete 5-piece outfit: ${outfitContext}`
      : `${fullName}. ${product.details}`;
    setGarmentName(fullName);
    setGarmentDetails(fullDetails);
    setCut(product.cut);
    setFabric(product.fabric);
    setSizeChart(product.sizeChart);

    if (!outfitContext) {
      const matchingOutfits = buildStyleAndShopPairings(
        existingWardrobe,
        [product, ...quickCatalog],
        savedProfile.measurements
      );
      if (matchingOutfits.length > 0) {
        setActiveOutfit(matchingOutfits[0]);
      }
    }

    setValidations((prev) => ({
      ...prev,
      garment_front: {
        valid: true,
        peopleCount: 1,
        fullBodyVisible: true,
        feedback: `${product.brand} front product photo loaded (${product.availableSizes.join(', ')} in stock).`,
      },
      garment_back: {
        valid: true,
        peopleCount: 1,
        fullBodyVisible: true,
        feedback: `${product.brand} rear/detail product photo verified.`,
      },
    }));

    const newAnalysis = fitGarmentWithSavedProfile(savedProfile, {
      sizeChart: product.sizeChart,
      cut: product.cut,
      fabric: product.fabric,
    });
    const elapsed = Math.max(0.2, Math.round((performance.now() - t0) * 10) / 10);
    setLastFitComputeMs(elapsed);
    setAnalysis(newAnalysis);
    const recSize = newAnalysis.trueSize || 'M';
    setSelectedSize(recSize);
    setFittedGarmentsCount((c) => c + 1);

    setActiveTab('studio');
    scrollToTopSmooth();

    if (product.id.includes('zara-comfort-suit-blazer')) {
      const basePreset = DEMO_PRESETS[0];
      setSpinsCache((prev) => {
        const next = { ...prev };
        for (const [sz, frames] of Object.entries(basePreset.framesBySize)) {
          const key = getGarmentSpinCacheKey(product.id, sz);
          next[key] = ANGLES.map((angle, idx) => ({
            angle,
            label: `${angle}°`,
            imageUrl: frames[idx],
            status: 'ready',
          }));
        }
        return next;
      });
    } else {
      void generateSpinForSize(recSize, newAnalysis, false, {
        id: product.id,
        frontImage: product.frontImage,
        backImage: product.backImage || product.frontImage,
        details: fullDetails,
      });
    }
  };

  // Switch between any of the 5 slots (Top, Layering Tee, Bottom, Watch, Shoes) of an equipped outfit
  const handleSelectOutfitSlotPiece = (
    piece: OutfitSlotPiece,
    pairingOverride?: StylePairingRecommendation
  ) => {
    const activePairing = pairingOverride || activeOutfit;
    const outfitSummary = activePairing
      ? `Top: ${activePairing.slots.top.brand} ${activePairing.slots.top.name}, Layering Tee: ${activePairing.slots.layering.brand} ${activePairing.slots.layering.name}, Bottom: ${activePairing.slots.bottom.brand} ${activePairing.slots.bottom.name}, Watch: ${activePairing.slots.watch.brand} ${activePairing.slots.watch.name}, Shoes: ${activePairing.slots.shoes.brand} ${activePairing.slots.shoes.name}`
      : undefined;

    setActiveOutfitSlotType(piece.slot);
    if (piece.shopProduct) {
      handleSelectShoppingProduct(piece.shopProduct, outfitSummary);
      return;
    }
    if (piece.closetItem) {
      handleTryOnExistingItem(piece.closetItem);
      return;
    }

    // Curated slot piece (e.g., Shop Match Chinos, Selvedge Denim, Field Watch, or Suede Loafers)
    const slotId = `outfit-slot-${piece.slot}-${piece.brand.toLowerCase().replace(/\s+/g, '-')}`;
    const fullName = `${piece.brand} — ${piece.name}`;
    const fullDetails = `${fullName} (${piece.slotLabel} · ${piece.sizeOrSpec} · ${piece.fitNote}). ${
      outfitSummary ? `Complete 5-piece outfit: ${outfitSummary}` : ''
    }`;
    setActiveGarmentId(slotId);
    setGarmentFront(piece.imageUrl);
    setGarmentBack(piece.imageUrl);
    setGarmentUrl(piece.productUrl || '');
    setGarmentName(fullName);
    setGarmentDetails(fullDetails);
    const slotCut: CutType = 'regular';
    const slotFabric: FabricType = piece.slot === 'layering' ? 'stretch_knit' : 'woven';
    setCut(slotCut);
    setFabric(slotFabric);
    setSizeChart(DEFAULT_SIZE_CHART);

    const newAnalysis = fitGarmentWithSavedProfile(savedProfile, {
      sizeChart: DEFAULT_SIZE_CHART,
      cut: slotCut,
      fabric: slotFabric,
    });
    const recSize = newAnalysis.trueSize || 'M';
    setAnalysis(newAnalysis);
    setSelectedSize(recSize);

    void generateSpinForSize(recSize, newAnalysis, false, {
      id: slotId,
      frontImage: piece.imageUrl,
      backImage: piece.imageUrl,
      details: fullDetails,
    });
  };

  // Try on a Complete 5-Piece Outfit Recommendation from the Home screen
  const handleTryOnCompleteOutfit = (
    pairing: StylePairingRecommendation,
    focusSlot?: OutfitSlotPiece
  ) => {
    setActiveOutfit(pairing);
    const targetPiece =
      focusSlot ||
      (pairing.slots.top.source === 'Shop Match' ? pairing.slots.top : pairing.slots.layering);
    handleSelectOutfitSlotPiece(targetPiece, pairing);
    setActiveTab('studio');
    scrollToTopSmooth();
  };

  const handleImportGarmentUrl = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || garmentUrl;
    if (!targetUrl) return;
    if (overrideUrl) setGarmentUrl(overrideUrl);

    setActiveTab('studio');
    scrollToTopSmooth();
    setIsImportingUrl(true);
    try {
      const res = await fetch('/api/parse-garment-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      setActiveGarmentId(targetUrl);
      setActiveOutfitSlotType('top');
      if (data.garmentName) setGarmentName(data.garmentName);
      if (data.details) setGarmentDetails(data.details);
      if (data.cut) setCut(data.cut as CutType);
      if (data.fabric) setFabric(data.fabric as FabricType);
      if (data.frontImage) setGarmentFront(data.frontImage);
      if (data.backImage) setGarmentBack(data.backImage);
      const nextChart =
        Array.isArray(data.sizeChart) && data.sizeChart.length > 0 ? data.sizeChart : sizeChart;
      if (Array.isArray(data.sizeChart) && data.sizeChart.length > 0) {
        setSizeChart(data.sizeChart);
      }
      const nextAnalysis = fitGarmentWithSavedProfile(savedProfile, {
        sizeChart: nextChart,
        cut: (data.cut as CutType) || cut,
        fabric: (data.fabric as FabricType) || fabric,
      });
      const recSize = nextAnalysis.trueSize || 'M';
      setAnalysis(nextAnalysis);
      setSelectedSize(recSize);
      setFittedGarmentsCount((c) => c + 1);
      void generateSpinForSize(recSize, nextAnalysis, false, {
        id: targetUrl,
        frontImage: data.frontImage || garmentFront,
        backImage: data.backImage || data.frontImage || garmentBack,
        details: `${data.garmentName || 'Imported Garment'}. ${data.details || ''}`,
      });
    } catch (err) {
      console.warn('Failed to import garment URL:', err);
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Validate photo with Gemini when uploaded during Setup or in Settings
  const handlePhotoUpload = async (slot: string, dataUrl: string | undefined) => {
    if (slot === 'front') {
      setSavedProfile((prev) => ({ ...prev, frontImage: dataUrl }));
    } else if (slot === 'back') {
      setSavedProfile((prev) => ({ ...prev, backImage: dataUrl }));
    } else if (slot === 'side') {
      setSavedProfile((prev) => ({ ...prev, sideImage: dataUrl }));
    } else if (slot === 'garment_front') {
      setGarmentFront(dataUrl);
    } else if (slot === 'garment_back') {
      setGarmentBack(dataUrl);
    }

    if (!dataUrl) {
      setValidations((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      return;
    }

    setValidatingSlot(slot);
    try {
      const res = await fetch('/api/validate-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, slotType: slot }),
      });
      const data = await res.json();
      setValidations((prev) => ({
        ...prev,
        [slot]: {
          valid: data.valid !== false,
          peopleCount: data.peopleCount ?? 1,
          fullBodyVisible: data.fullBodyVisible !== false,
          detectedFacing: data.detectedFacing,
          feedback: data.feedback || (data.valid ? 'Verified' : 'Retake recommended'),
        },
      }));
    } catch {
      setValidations((prev) => ({
        ...prev,
        [slot]: {
          valid: true,
          peopleCount: 1,
          fullBodyVisible: true,
          feedback: 'Photo uploaded and ready.',
        },
      }));
    } finally {
      setValidatingSlot(null);
    }
  };

  // Recalibrate Body Landmarks from Shopper Photos
  const handleRecalibrateBodyProfile = async () => {
    if (!savedProfile.heightCm || !savedProfile.frontImage) return;

    setIsProcessing(true);
    setProcessingMessage('Calibrating torso landmarks once with Gemini 4 Argon...');

    try {
      const measureRes = await fetch('/api/measure-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontImage: savedProfile.frontImage,
          backImage: savedProfile.backImage || savedProfile.frontImage,
          sideImage: savedProfile.sideImage,
          heightCm: savedProfile.heightCm,
          cut,
          fabric,
          sizeChart,
          userOverrides: {
            chest: savedProfile.overrideChest,
            waist: savedProfile.overrideWaist,
            hip: savedProfile.overrideHip,
          },
        }),
      });

      const measureData = await measureRes.json();
      if (measureData.fitAnalysis) {
        setSavedProfile((prev) => ({
          ...prev,
          frontLandmarks: measureData.landmarks?.front || prev.frontLandmarks,
          backLandmarks: measureData.landmarks?.back || prev.backLandmarks,
          sideLandmarks: measureData.landmarks?.side || prev.sideLandmarks,
          measurements: measureData.fitAnalysis.measurements,
          calibratedAt: new Date().toISOString(),
          computeCount: prev.computeCount + 1,
        }));
        setAnalysis(measureData.fitAnalysis);
        if (measureData.fitAnalysis.trueSize) {
          setSelectedSize(measureData.fitAnalysis.trueSize);
        }
      }
      setIsInitialSetupMode(false);
      setActiveTab('home');
      scrollToTopSmooth();
    } catch (err) {
      console.error('Body profile calibration failed:', err);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleSelectSize = (newSize: string) => {
    setSelectedSize(newSize);
    const cacheKey = getGarmentSpinCacheKey(activeGarmentId, newSize);
    if (!spinsCache[cacheKey]) {
      const basePreset = DEMO_PRESETS[0];
      const fallbackFrames = basePreset.framesBySize[newSize] || basePreset.framesBySize['M'];
      setSpinsCache((prev) => ({
        ...prev,
        [cacheKey]: ANGLES.map((angle, idx) => ({
          angle,
          label: `${angle}°`,
          imageUrl: fallbackFrames[idx],
          status: 'ready',
        })),
      }));
    }
  };

  const handleRegenerateCurrentSize = async () => {
    setIsProcessing(true);
    setProcessingMessage(
      computeMode === 'low'
        ? `Synthesizing Front & Back keyframes for Size ${selectedSize} (Minimal Compute Mode)...`
        : `Synthesizing all 8 turntable angles in parallel for Size ${selectedSize}...`
    );
    try {
      await generateSpinForSize(selectedSize, analysis, true);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const activeCacheKey = getGarmentSpinCacheKey(activeGarmentId, selectedSize);
  const defaultPresetFrames =
    DEMO_PRESETS[0].framesBySize[selectedSize] || DEMO_PRESETS[0].framesBySize['M'];
  const activeFrames: SpinFrame[] =
    spinsCache[activeCacheKey] ||
    ANGLES.map((angle, idx) => ({
      angle,
      label: `${angle}°`,
      imageUrl: defaultPresetFrames[idx],
      status: 'ready',
    }));

  const activeSizeFitResult = analysis.sizeResults.find((s) => s.size === selectedSize);

  const activeGarmentFramesBySize: Record<string, SpinFrame[]> = {};
  for (const s of sizeChart) {
    const k = getGarmentSpinCacheKey(activeGarmentId, s.size);
    const fallback = DEMO_PRESETS[0].framesBySize[s.size] || DEMO_PRESETS[0].framesBySize['M'];
    activeGarmentFramesBySize[s.size] =
      spinsCache[k] ||
      ANGLES.map((angle, idx) => ({
        angle,
        label: `${angle}°`,
        imageUrl: fallback[idx],
        status: 'ready',
      }));
  }

  const cachedSizesForActiveGarment = sizeChart
    .map((s) => s.size)
    .filter((sz) => Boolean(spinsCache[getGarmentSpinCacheKey(activeGarmentId, sz)]));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header
        activeTab={activeTab}
        onTabChange={(t) => {
          setIsInitialSetupMode(false);
          setActiveTab(t);
          scrollToTopSmooth();
        }}
        measurements={savedProfile.measurements}
        heightCm={savedProfile.heightCm}
        fittedGarmentsCount={fittedGarmentsCount}
        onSelectPreset={loadPreset}
        onReset={resetToSetupFlow}
        currentPresetId={currentPresetId}
        isProcessing={isProcessing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Processing Status Banner */}
        {(isProcessing || isImportingUrl) && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center gap-3">
            <RotateCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-indigo-900">
                {isImportingUrl ? 'Importing Garment Specs & Photos...' : 'Processing Fit & Studio Render'}
              </p>
              <p className="text-indigo-700 mt-0.5">
                {isImportingUrl
                  ? `Extracting size chart and product imagery from ${garmentUrl}`
                  : processingMessage}
              </p>
            </div>
          </div>
        )}

        {/* VIEW 1 (DEFAULT HOME): STYLE RECOMMENDATIONS WITH EXISTING CLOTHING + LIVE SHOP RECOMMENDATIONS + AI SEARCH */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Compact Argon SF Hackathon Multi-Agent Launch Strip */}
            <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 px-2 py-0.5 rounded">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Gemini 4 Argon SF Hackathon
                </span>
                <span className="font-semibold text-white">
                  4-Agent Swarm + Three.js 3D World Loop + Omni 1.1 Flash Video Runway
                </span>
                <span className="text-slate-400 font-mono text-[11px] hidden xl:inline">
                  (antigravity-preview-09-2026 · deep-research-preview-04-2026 · gemini-omni-1.1-flash)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pitch');
                    scrollToTopSmooth();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Shack15 Pitch Deck</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('agents');
                    scrollToTopSmooth();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Open Argon Swarm + 3D + Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <HomeStyleAndShopFeed
              measurements={savedProfile.measurements}
              heightCm={savedProfile.heightCm}
              existingWardrobe={existingWardrobe}
              onAddWardrobeItem={(item) => setExistingWardrobe((prev) => [item, ...prev])}
              onTryOnExistingItem={handleTryOnExistingItem}
              onTryOnShopProduct={handleSelectShoppingProduct}
              onTryOnCompleteOutfit={handleTryOnCompleteOutfit}
              onImportDiscoveryUrl={(url) => handleImportGarmentUrl(url)}
              onOpenSettings={() => {
                setIsInitialSetupMode(false);
                setActiveTab('settings');
                scrollToTopSmooth();
              }}
              onCatalogLoaded={(items) => setQuickCatalog(items.slice(0, 6))}
              activeGarmentUrl={garmentUrl}
            />
          </div>
        )}

        {/* VIEW 1B: GEMINI 4 ARGON MULTI-AGENT SWARM, THREE.JS 3D WORLD & OMNI VIDEO STUDIO */}
        {activeTab === 'agents' && (
          <MultiAgentSwarmPanel
            measurements={savedProfile.measurements}
            heightCm={savedProfile.heightCm}
            existingWardrobe={existingWardrobe}
            shopCatalog={quickCatalog}
            sizeChart={sizeChart}
            cut={cut}
            fabric={fabric}
            onDeployOutfitToTurntable={(pairing, focusSlot) =>
              handleTryOnCompleteOutfit(pairing, focusSlot)
            }
          />
        )}

        {/* VIEW 1C: SHACK15 SF HACKATHON PRESENTATION DECK */}
        {activeTab === 'pitch' && (
          <HackathonPresentationView
            measurements={savedProfile.measurements}
            heightCm={savedProfile.heightCm}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              scrollToTopSmooth();
            }}
          />
        )}

        {/* VIEW 2: 360° FITTING STUDIO */}
        {activeTab === 'studio' && (
          <div className="space-y-5">
            {/* Top Instant Garment Switcher & Minimal-Compute Control Strip */}
            <section
              aria-label="Instant Garment Switcher and Compute Controls"
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3.5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('home');
                      scrollToTopSmooth();
                    }}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Style &amp; Shop Home</span>
                  </button>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Saved Body Profile Active</span>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-slate-600 font-mono tabular-nums">
                    {savedProfile.heightCm} cm · Chest {savedProfile.measurements.chest} cm · Waist {savedProfile.measurements.waist} cm · Hip {savedProfile.measurements.hip} cm
                  </span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium font-mono tabular-nums">
                    Fit computed in {lastFitComputeMs} ms (0 vision calls)
                  </span>
                </div>

                {/* Compute Saver Mode Selector + Settings shortcut */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setComputeMode('low')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        computeMode === 'low'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Minimal Compute (0ms Fit + Keyframes)
                    </button>
                    <button
                      type="button"
                      onClick={() => setComputeMode('full')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        computeMode === 'full'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Full 8-Angle AI Turntable
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      scrollToTopSmooth();
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Fit Settings</span>
                  </button>
                </div>
              </div>

              {/* Active 5-Piece Outfit Layer Switcher Bar */}
              {activeOutfit && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Active 5-Piece Outfit: {activeOutfit.occasion}</span>
                      <span className="text-slate-400 font-normal hidden sm:inline">
                        (Click any slot below to inspect &amp; drape on 360° model)
                      </span>
                    </div>
                    <span className="text-emerald-700 font-mono text-[11px] font-semibold">
                      True Size {activeOutfit.shopTrueSize}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        activeOutfit.slots.top,
                        activeOutfit.slots.layering,
                        activeOutfit.slots.bottom,
                        activeOutfit.slots.watch,
                        activeOutfit.slots.shoes,
                      ] as OutfitSlotPiece[]
                    ).map((slotPiece) => {
                      const isCurrent =
                        activeOutfitSlotType === slotPiece.slot &&
                        garmentName.includes(slotPiece.name);
                      return (
                        <button
                          key={slotPiece.slot}
                          type="button"
                          onClick={() => handleSelectOutfitSlotPiece(slotPiece)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                          }`}
                        >
                          <img
                            src={slotPiece.imageUrl}
                            alt={slotPiece.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-10 rounded object-cover bg-white border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[9px] font-bold uppercase tracking-wider truncate ${
                                isCurrent ? 'text-indigo-300' : 'text-slate-500'
                              }`}
                            >
                              {slotPiece.slotLabel}
                            </div>
                            <div className="text-xs font-semibold truncate">{slotPiece.name}</div>
                            <div
                              className={`text-[10px] font-mono truncate ${
                                isCurrent ? 'text-emerald-300' : 'text-slate-500'
                              }`}
                            >
                              {slotPiece.sizeOrSpec}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1-Click Garment Switcher Strip */}
              {quickCatalog.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">
                    Instant Catalog Switcher:
                  </span>
                  {quickCatalog.map((item) => {
                    const isCurrent = activeGarmentId === item.id;
                    const quickFit = fitGarmentWithSavedProfile(savedProfile, {
                      sizeChart: item.sizeChart,
                      cut: item.cut,
                      fabric: item.fabric,
                    });
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectShoppingProduct(item)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                        }`}
                      >
                        <img
                          src={item.frontImage}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-7 h-9 rounded object-cover bg-slate-200 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-semibold line-clamp-1 max-w-[150px]">
                            {item.title}
                          </div>
                          <div
                            className={`text-[10px] font-mono tabular-nums ${
                              isCurrent ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          >
                            {item.brand} · True Size {quickFit.trueSize || 'M'}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('home');
                      scrollToTopSmooth();
                    }}
                    className="px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/50 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>All Style &amp; Shop Recommendations &rarr;</span>
                  </button>
                </div>
              )}
            </section>

            {/* Main 360° Studio Split View */}
            {isComparing ? (
              <CompareView
                availableSizes={sizeChart.map((s) => s.size)}
                sizeFitResults={analysis.sizeResults}
                framesBySize={activeGarmentFramesBySize}
                initialSizeA={selectedSize}
                initialSizeB={sizeChart.find((s) => s.size !== selectedSize)?.size || 'S'}
                onClose={() => setIsComparing(false)}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                  <div className="sticky top-20">
                    <Turntable360Viewer
                      frames={activeFrames}
                      sizeLabel={selectedSize}
                      sizeFitResult={activeSizeFitResult}
                      garmentName={garmentName}
                      activeGarmentId={activeGarmentId}
                      garmentFrontImage={garmentFront}
                      garmentBackImage={garmentBack}
                      activeOutfitSlots={activeOutfit?.slots}
                      activeOutfitSlotType={activeOutfitSlotType}
                      onSelectOutfitSlot={handleSelectOutfitSlotPiece}
                      isGenerating={isProcessing}
                      onRegenerateWithAI={handleRegenerateCurrentSize}
                    />
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <FitResultsCard
                    analysis={analysis}
                    selectedSize={selectedSize}
                    onSelectSize={handleSelectSize}
                    cachedSizes={
                      cachedSizesForActiveGarment.length > 0
                        ? cachedSizesForActiveGarment
                        : sizeChart.map((s) => s.size)
                    }
                    isComparing={isComparing}
                    onToggleCompare={() => setIsComparing(!isComparing)}
                    onOpenBodyProfile={() => {
                      setActiveTab('settings');
                      scrollToTopSmooth();
                    }}
                    onOpenShopCatalog={() => {
                      setActiveTab('home');
                      scrollToTopSmooth();
                    }}
                  />

                  <GarmentSpecDrawer
                    garmentName={garmentName}
                    garmentDetails={garmentDetails}
                    garmentUrl={garmentUrl}
                    onGarmentUrlChange={setGarmentUrl}
                    onImportGarmentUrl={() => handleImportGarmentUrl()}
                    isImportingUrl={isImportingUrl}
                    garmentFront={garmentFront}
                    garmentBack={garmentBack}
                    validations={validations}
                    validatingSlot={validatingSlot}
                    onPhotoUpload={handlePhotoUpload}
                    cut={cut}
                    onCutChange={setCut}
                    fabric={fabric}
                    onFabricChange={setFabric}
                    sizeChart={sizeChart}
                    onSizeChartChange={setSizeChart}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SETUP & SETTINGS (Upload User Photos During Setup or Edit Anytime) */}
        {activeTab === 'settings' && (
          <BodyProfileWorkspace
            isSetupMode={isInitialSetupMode}
            shopperFront={savedProfile.frontImage}
            shopperBack={savedProfile.backImage}
            shopperSide={savedProfile.sideImage}
            validations={validations}
            validatingSlot={validatingSlot}
            onPhotoUpload={handlePhotoUpload}
            heightCm={savedProfile.heightCm}
            onHeightChange={(h) => handleUpdateBodyNumbers({ heightCm: h })}
            overrideChest={savedProfile.overrideChest}
            overrideWaist={savedProfile.overrideWaist}
            overrideHip={savedProfile.overrideHip}
            onOverrideChange={(field, val) => {
              if (field === 'chest') handleUpdateBodyNumbers({ overrideChest: val });
              if (field === 'waist') handleUpdateBodyNumbers({ overrideWaist: val });
              if (field === 'hip') handleUpdateBodyNumbers({ overrideHip: val });
            }}
            measurements={savedProfile.measurements}
            fittedGarmentsCount={fittedGarmentsCount}
            visionComputeCount={savedProfile.computeCount}
            computeMode={computeMode}
            onComputeModeChange={setComputeMode}
            isProcessing={isProcessing}
            onRecalibrateFromPhotos={handleRecalibrateBodyProfile}
            onCompleteSetupOrSave={() => {
              setIsInitialSetupMode(false);
              setActiveTab('home');
              scrollToTopSmooth();
            }}
            onOpenStudio={() => {
              setIsInitialSetupMode(false);
              setActiveTab('studio');
              scrollToTopSmooth();
            }}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          Tryon · Reusable Anthropometric Body Profile · Wardrobe Style Synergy &amp; Official Storefront APIs · 360° Fit Studio
        </p>
      </footer>
    </div>
  );
}
