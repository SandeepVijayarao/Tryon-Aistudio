import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Maximize2,
  Minimize2,
  Sliders,
  Eye,
  Sparkles,
  Camera,
  Layers,
  Compass,
  UserCheck,
  Play,
  Pause,
  Upload,
  Scan,
  RotateCw,
  Lock,
  Unlock,
  ArrowDown,
} from 'lucide-react';
import {
  BodyMeasurements,
  PhotoLandmarks,
  SideLandmarks,
  ShoppingProduct,
  SpinFrame,
} from '../types/tryon.ts';
import {
  ExistingWardrobeItem,
  OutfitSlotPiece,
  StylePairingRecommendation,
} from '../utils/wardrobeStyler.ts';
import {
  WARDROBE_LINE_ITEMS,
  HumanWalkerState,
  createInitialHumanWalkerState,
  stepHumanWalkerState,
  commandHumanSelectLineItem,
} from '../utils/closetHumanKinematics.ts';
import {
  Reconstructed3DBodySpec,
  STUDIO_TURNTABLE_ANGLES,
  Studio3DAngleSpec,
  build3DBodySpecFromUserPhotos,
  computeActiveStudioAngleFromCamera,
  computeMannequinVerticalLockCameraSpec,
  keyOutStudioBackdropFromRgba,
  resolveStudioTurntableFramesFor3D,
} from '../utils/photoTo3DBuilder.ts';
import { DEMO_PRESETS } from '../utils/demoPresets.ts';

export type ClosetSectionId =
  | 'overview'
  | 'mannequin'
  | 'human'
  | 'blazers'
  | 'knitwear'
  | 'trousers'
  | 'watches'
  | 'footwear';

export type Photo3DDisplayMode = 'photo_twin_dressed' | 'raw_photo_scan';

interface ThreeGarmentWorldSceneProps {
  measurements: BodyMeasurements;
  heightCm: number;
  userFrontImage?: string;
  userBackImage?: string;
  userSideImage?: string;
  frontLandmarks?: PhotoLandmarks;
  backLandmarks?: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  studioFrames?: SpinFrame[];
  activeGarmentName?: string;
  activeGarmentId?: string;
  garmentFrontImage?: string;
  garmentBackImage?: string;
  onPhotoUpload?: (slot: 'front' | 'back' | 'side', dataUrl: string) => void;
  onOpenPhotoSetup?: () => void;
  trueSize?: string;
  recommendedSize?: string;
  activeOutfit?: StylePairingRecommendation;
  existingWardrobe?: ExistingWardrobeItem[];
  shopCatalog?: ShoppingProduct[];
  onTryOnClosetItem?: (item: ExistingWardrobeItem) => void;
  onTryOnShopProduct?: (product: ShoppingProduct) => void;
  onTryOnOutfitSlot?: (piece: OutfitSlotPiece) => void;
  initialSection?: ClosetSectionId;
  verticalScreenLocked?: boolean;
  onToggleVerticalScreenLock?: (locked: boolean) => void;
  onScrollToFeedBelow?: () => void;
}

interface FabricSwatch {
  id: string;
  name: string;
  blazerHex: number;
  trouserHex: number;
  teeHex: number;
  roughness: number;
}

const FABRIC_SWATCHES: FabricSwatch[] = [
  {
    id: 'ecru-marl',
    name: 'Sand / Ecru Bi-Stretch',
    blazerHex: 0xebe3d2,
    trouserHex: 0x24272c,
    teeHex: 0xf8fafc,
    roughness: 0.62,
  },
  {
    id: 'midnight-navy',
    name: 'Midnight Worsted Wool',
    blazerHex: 0x1e293b,
    trouserHex: 0x334155,
    teeHex: 0xf1f5f9,
    roughness: 0.54,
  },
  {
    id: 'bay-leaf-hemp',
    name: 'Bay Leaf Hemp Canvas',
    blazerHex: 0x4a5844,
    trouserHex: 0x27272a,
    teeHex: 0xfefce8,
    roughness: 0.74,
  },
  {
    id: 'charcoal-flannel',
    name: 'Charcoal Italian Flannel',
    blazerHex: 0x374151,
    trouserHex: 0x18181b,
    teeHex: 0xe2e8f0,
    roughness: 0.66,
  },
];

interface ClosetBayMeta {
  id: ClosetSectionId;
  label: string;
  zoneTitle: string;
  subtitle: string;
  camPos: [number, number, number];
  lookAt: [number, number, number];
}

const CLOSET_BAYS: ClosetBayMeta[] = [
  {
    id: 'mannequin',
    label: '360° Mannequin Focus',
    zoneTitle: 'Center Stage · 360° Studio Mannequin',
    subtitle: 'Full-body photorealistic model from the 360° Fitting Studio centered and vertically locked on the degree pedestal',
    camPos: [0.0, -0.01, 3.02],
    lookAt: [0.0, -0.06, 0.0],
  },
  {
    id: 'overview',
    label: 'Room Overview',
    zoneTitle: 'Architectural Walk-In Closet & 360° Fitting Studio',
    subtitle: 'Full 6-zone bespoke dressing room featuring your live 8-angle 360° Fitting Studio photo on the central turntable',
    camPos: [0.0, 0.72, 3.65],
    lookAt: [0.0, 0.08, -0.15],
  },
  {
    id: 'human',
    label: 'Wardrobe Line & Fit',
    zoneTitle: 'Wardrobe Rail & 360° Studio Fit Presentation',
    subtitle: 'Select any hanging garment on the brass wardrobe rail to pull it forward and preview on the 360° Fitting Studio photo',
    camPos: [-0.45, 0.82, 2.68],
    lookAt: [-0.75, 0.18, -0.25],
  },
  {
    id: 'blazers',
    label: 'Blazers Bay',
    zoneTitle: 'Left Wing · Outerwear, Blazers & Overshirts Bay',
    subtitle: 'Illuminated walnut wardrobe rail with brushed brass rod & tailored outerwear collection',
    camPos: [-0.85, 0.85, 1.55],
    lookAt: [-2.35, 0.65, -0.45],
  },
  {
    id: 'knitwear',
    label: 'Tee & Knit Cubbies',
    zoneTitle: 'North-West Bay · Layering Tees & Merino Knitwear Shelving',
    subtitle: 'Backlit walnut cubbies with folded 240gsm Supima tees, ribbed jersey & merino crewnecks',
    camPos: [-0.75, 0.9, 0.85],
    lookAt: [-1.65, 0.65, -2.15],
  },
  {
    id: 'trousers',
    label: 'Trousers Rack',
    zoneTitle: 'North-East Bay · Tailored Trousers, Chinos & Selvedge Rack',
    subtitle: 'Brushed steel pull-out valet bars holding pleated wool trousers, twill chinos & 14oz selvedge',
    camPos: [0.75, 0.85, 0.85],
    lookAt: [1.65, 0.55, -2.15],
  },
  {
    id: 'watches',
    label: 'Watch Island',
    zoneTitle: 'Center Island · Optical Glass Horology Vitrine',
    subtitle: 'Bespoke walnut & glass boutique island displaying 40mm Chronograph, 38mm Field & 39mm Dress watches',
    camPos: [0.55, 0.72, 2.25],
    lookAt: [1.35, -0.18, 0.75],
  },
  {
    id: 'footwear',
    label: 'Footwear Wall',
    zoneTitle: 'Right Wing · Goodyear-Welted Footwear Plinths',
    subtitle: 'Angled LED-lit walnut shoe shelves with Espresso Suede Loafers, Calfskin Sneakers & Service Boots',
    camPos: [0.85, 0.75, 1.55],
    lookAt: [2.35, 0.45, -0.45],
  },
];

function createFabricWeaveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const isWarp = ((x + y) / 4) % 2 === 0;
      ctx.fillStyle = isWarp ? '#969696' : '#6b6b6b';
      ctx.fillRect(x, y, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

function createWalnutParquetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d1e14';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 64;
  const plankW = 256;
  for (let row = 0; row < 512 / plankH; row++) {
    for (let col = 0; col < 512 / plankW + 1; col++) {
      const offsetX = (row % 2) * (plankW / 2);
      const x = col * plankW - offsetX;
      const y = row * plankH;

      const shade = 38 + ((row * 7 + col * 13) % 14);
      ctx.fillStyle = `rgb(${shade + 14}, ${shade}, ${Math.max(18, shade - 10)})`;
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);

      // Subtle wood grain fibers
      ctx.strokeStyle = 'rgba(20, 12, 8, 0.26)';
      ctx.lineWidth = 1;
      for (let g = 6; g < plankH - 4; g += 9) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + g);
        ctx.bezierCurveTo(
          x + plankW * 0.33,
          y + g + ((g % 3) - 1) * 2,
          x + plankW * 0.66,
          y + g - ((g % 2) - 0.5) * 2,
          x + plankW - 4,
          y + g
        );
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function createTurntableDialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  for (const r of [110, 165, 215, 242]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 45 === 0;
    const rInner = isMajor ? 198 : 210;
    const rOuter = 224;
    ctx.strokeStyle = isMajor ? '#818cf8' : '#475569';
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * rInner, cy + Math.sin(rad) * rInner);
    ctx.lineTo(cx + Math.cos(rad) * rOuter, cy + Math.sin(rad) * rOuter);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds 8-angle full-body CanvasTextures from the 360° Fitting Studio photos
 * (with edge-connected studio cyclorama removal so the person from the 360° Fitting Studio
 * stands directly on the 3D Walk-In Closet turntable pedestal).
 */
function createStudio360TurntableTextures(
  dressedSpecs: Studio3DAngleSpec[],
  rawSpecs: Studio3DAngleSpec[],
  drapeFrontUrl: string | undefined,
  drapeBackUrl: string | undefined,
  shouldDrapeOverlay: boolean,
  maxAnisotropy: number,
  onLoaded: () => void
): {
  dressedTextures: THREE.CanvasTexture[];
  rawTextures: THREE.CanvasTexture[];
  applyBlazerTintHex: (targetHex: number | null) => void;
  dispose: () => void;
} {
  const TEX_W = 768;
  const TEX_H = 1024;

  const dressedCanvases: HTMLCanvasElement[] = [];
  const dressedBaseImageData: (ImageData | null)[] = new Array(8).fill(null);
  const dressedTextures: THREE.CanvasTexture[] = [];
  const rawTextures: THREE.CanvasTexture[] = [];

  for (let i = 0; i < 8; i++) {
    const dCanvas = document.createElement('canvas');
    dCanvas.width = TEX_W;
    dCanvas.height = TEX_H;
    dressedCanvases.push(dCanvas);

    const dTex = new THREE.CanvasTexture(dCanvas);
    dTex.colorSpace = THREE.SRGBColorSpace;
    dTex.anisotropy = maxAnisotropy;
    dressedTextures.push(dTex);

    const rCanvas = document.createElement('canvas');
    rCanvas.width = TEX_W;
    rCanvas.height = TEX_H;
    const rTex = new THREE.CanvasTexture(rCanvas);
    rTex.colorSpace = THREE.SRGBColorSpace;
    rTex.anisotropy = maxAnisotropy;
    rawTextures.push(rTex);
  }

  let cancelled = false;
  const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

  const loadImg = (url?: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    if (imageCache.has(url)) return imageCache.get(url)!;
    const p = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    imageCache.set(url, p);
    return p;
  };

  const renderSpecToCanvas = (
    canvas: HTMLCanvasElement,
    spec: Studio3DAngleSpec,
    img: HTMLImageElement,
    drapeImg: HTMLImageElement | null
  ): ImageData => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;

    if (spec.isCompositeSheet && spec.sheetCrop) {
      sx = Math.round(spec.sheetCrop.sxNorm * iw);
      sw = Math.round(spec.sheetCrop.swNorm * iw);
    }

    const scale = Math.min((TEX_W * 0.96) / sw, (TEX_H * 0.98) / sh);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const dx = Math.round((TEX_W - dw) / 2);
    // Align bottom so shoes sit right near the bottom edge of the 3D plane on the turntable
    const dy = Math.round(TEX_H - dh);

    ctx.save();
    if (spec.mirrorHorizontally) {
      ctx.translate(TEX_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, TEX_W, TEX_H);
    keyOutStudioBackdropFromRgba(imgData.data, TEX_W, TEX_H);
    ctx.putImageData(imgData, 0, 0);

    // If a custom shop/closet garment is being tried on that isn't pre-baked into the studio frame,
    // drape it onto the upper torso just like Turntable360Viewer does
    if (drapeImg) {
      const gw = drapeImg.naturalWidth || drapeImg.width;
      const gh = drapeImg.naturalHeight || drapeImg.height;
      if (gw > 8 && gh > 8) {
        const isProfile = spec.angle === 90 || spec.angle === 270;
        const drapeW = Math.round(TEX_W * (isProfile ? 0.34 : 0.46));
        const drapeH = Math.round(TEX_H * 0.36);
        const drapeX = Math.round((TEX_W - drapeW) / 2);
        const drapeY = Math.round(TEX_H * 0.175);
        ctx.save();
        ctx.drawImage(drapeImg, 0, 0, gw, gh, drapeX, drapeY, drapeW, drapeH);
        ctx.restore();
      }
    }

    return ctx.getImageData(0, 0, TEX_W, TEX_H);
  };

  Promise.all([
    Promise.all(dressedSpecs.map((s) => loadImg(s.imageUrl))),
    Promise.all(rawSpecs.map((s) => loadImg(s.imageUrl))),
    shouldDrapeOverlay ? loadImg(drapeFrontUrl) : Promise.resolve(null),
    shouldDrapeOverlay ? loadImg(drapeBackUrl || drapeFrontUrl) : Promise.resolve(null),
  ]).then(([dressedImgs, rawImgs, frontDrapeImg, backDrapeImg]) => {
    if (cancelled) return;

    for (let i = 0; i < 8; i++) {
      const dSpec = dressedSpecs[i];
      const dImg = dressedImgs[i] || dressedImgs[0];
      if (dImg) {
        const isRear = dSpec.angle === 135 || dSpec.angle === 180 || dSpec.angle === 225;
        const activeDrape = shouldDrapeOverlay
          ? isRear
            ? backDrapeImg || frontDrapeImg
            : frontDrapeImg
          : null;
        dressedBaseImageData[i] = renderSpecToCanvas(
          dressedCanvases[i],
          dSpec,
          dImg,
          activeDrape
        );
        dressedTextures[i].needsUpdate = true;
      }

      const rSpec = rawSpecs[i];
      const rImg = rawImgs[i] || dImg;
      if (rImg) {
        const rCanvas = rawTextures[i].image as HTMLCanvasElement;
        renderSpecToCanvas(rCanvas, rSpec, rImg, null);
        rawTextures[i].needsUpdate = true;
      }
    }

    onLoaded();
  });

  // Allows subtle tailoring swatch / wardrobe line garment tinting on the blazer region
  // while keeping the original studio photo 100% untouched when targetHex is null or default cream (0xebe3d2)
  const applyBlazerTintHex = (targetHex: number | null) => {
    if (cancelled) return;
    const isDefaultCream = targetHex === null || targetHex === 0xebe3d2;
    const tR = targetHex ? (targetHex >> 16) & 255 : 235;
    const tG = targetHex ? (targetHex >> 8) & 255 : 227;
    const tB = targetHex ? targetHex & 255 : 210;

    for (let i = 0; i < 8; i++) {
      const baseData = dressedBaseImageData[i];
      if (!baseData) continue;
      const ctx = dressedCanvases[i].getContext('2d', { willReadFrequently: true })!;
      if (isDefaultCream) {
        ctx.putImageData(baseData, 0, 0);
        dressedTextures[i].needsUpdate = true;
        continue;
      }

      const working = new ImageData(
        new Uint8ClampedArray(baseData.data),
        TEX_W,
        TEX_H
      );
      const buf = working.data;
      const yMin = Math.floor(TEX_H * 0.165);
      const yMax = Math.floor(TEX_H * 0.545);

      for (let y = yMin; y <= yMax; y++) {
        for (let x = 0; x < TEX_W; x++) {
          const idx = (y * TEX_W + x) * 4;
          const a = buf[idx + 3];
          if (a < 30) continue;
          const r = buf[idx];
          const g = buf[idx + 1];
          const b = buf[idx + 2];
          const lum = (r + g + b) / 3;
          // Match the cream/sand blazer fabric (warm ecru: r > g > b, high luminance, low red-green delta so skin is excluded)
          if (lum >= 145 && r - b >= 12 && r - g <= 17 && g >= b) {
            const shade = lum / 222;
            buf[idx] = Math.min(255, Math.round(r * 0.25 + tR * shade * 0.75));
            buf[idx + 1] = Math.min(255, Math.round(g * 0.25 + tG * shade * 0.75));
            buf[idx + 2] = Math.min(255, Math.round(b * 0.25 + tB * shade * 0.75));
          }
        }
      }
      ctx.putImageData(working, 0, 0);
      dressedTextures[i].needsUpdate = true;
    }
    onLoaded();
  };

  return {
    dressedTextures,
    rawTextures,
    applyBlazerTintHex,
    dispose: () => {
      cancelled = true;
      dressedTextures.forEach((t) => t.dispose());
      rawTextures.forEach((t) => t.dispose());
    },
  };
}

export const ThreeGarmentWorldScene: React.FC<ThreeGarmentWorldSceneProps> = ({
  measurements,
  heightCm,
  userFrontImage,
  userBackImage,
  userSideImage,
  frontLandmarks,
  backLandmarks,
  sideLandmarks,
  studioFrames,
  activeGarmentName,
  activeGarmentId,
  garmentFrontImage,
  garmentBackImage,
  onPhotoUpload,
  onOpenPhotoSetup,
  trueSize,
  recommendedSize,
  activeOutfit,
  existingWardrobe = [],
  shopCatalog = [],
  onTryOnClosetItem,
  onTryOnShopProduct,
  onTryOnOutfitSlot,
  initialSection = 'mannequin',
  verticalScreenLocked,
  onToggleVerticalScreenLock,
  onScrollToFeedBelow,
}) => {
  const effectiveTrueSize = trueSize || recommendedSize || 'M';
  const effectivePassIndex = 2;

  // Fallback to calibrated 3-view user portrait preset when explicit photo props are omitted
  const defaultPreset = DEMO_PRESETS[0];
  const [localFrontPhoto, setLocalFrontPhoto] = useState<string | undefined>(undefined);
  const [localBackPhoto, setLocalBackPhoto] = useState<string | undefined>(undefined);
  const [localSidePhoto, setLocalSidePhoto] = useState<string | undefined>(undefined);

  const effectiveFrontPhoto =
    localFrontPhoto || userFrontImage || defaultPreset.shopperFrontImage;
  const effectiveBackPhoto =
    localBackPhoto || userBackImage || defaultPreset.shopperBackImage;
  const effectiveSidePhoto =
    localSidePhoto || userSideImage || defaultPreset.shopperSideImage;

  const effectiveFrontLandmarks = frontLandmarks || defaultPreset.frontLandmarks;
  const effectiveBackLandmarks = backLandmarks || defaultPreset.backLandmarks;
  const effectiveSideLandmarks = sideLandmarks || defaultPreset.sideLandmarks;

  const bodySpec3D = build3DBodySpecFromUserPhotos({
    heightCm,
    measurements,
    frontLandmarks: effectiveFrontLandmarks,
    backLandmarks: effectiveBackLandmarks,
    sideLandmarks: effectiveSideLandmarks,
    hasFrontImage: Boolean(effectiveFrontPhoto),
    hasBackImage: Boolean(effectiveBackPhoto),
    hasSideImage: Boolean(effectiveSidePhoto),
  });

  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedSwatch, setSelectedSwatch] = useState<FabricSwatch>(FABRIC_SWATCHES[0]);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<ClosetSectionId>(initialSection);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isFullBleed, setIsFullBleed] = useState<boolean>(false);
  const [isVerticalLocked, setIsVerticalLocked] = useState<boolean>(
    verticalScreenLocked !== undefined ? verticalScreenLocked : true
  );
  const [showBayInventoryDrawer, setShowBayInventoryDrawer] = useState<boolean>(false);
  const [photo3DMode, setPhoto3DMode] = useState<Photo3DDisplayMode>('photo_twin_dressed');
  const [showPhoto3DInspector, setShowPhoto3DInspector] = useState<boolean>(false);

  // Sync controlled verticalScreenLocked prop if provided by parent
  useEffect(() => {
    if (verticalScreenLocked !== undefined) {
      setIsVerticalLocked(verticalScreenLocked);
    }
  }, [verticalScreenLocked]);

  // 360° Fitting Studio Turntable Angle & Wardrobe Line Selection State
  const [activeStudioAngle, setActiveStudioAngle] = useState<number>(0);
  const [isAutoSpin360, setIsAutoSpin360] = useState<boolean>(false);
  const [humanTargetIndex, setHumanTargetIndex] = useState<number>(0);
  const [humanEquippedIndex, setHumanEquippedIndex] = useState<number>(0);
  const [humanPhase, setHumanPhase] = useState<string>('inspecting_at_mirror');
  const [humanAutoWalk, setHumanAutoWalk] = useState<boolean>(false);

  const sceneRefs = useRef<{
    requestRender?: () => void;
    updateMaterials?: (swatch: FabricSwatch) => void;
    updatePassGeometry?: (passIdx: number, explode: number) => void;
    setCameraTarget?: (pos: [number, number, number], lookAt: [number, number, number], sectionId?: ClosetSectionId) => void;
    applyVerticalLockConstraints?: (locked: boolean, dockCollapsed: boolean, recenterMannequin?: boolean) => void;
    highlightBay?: (section: ClosetSectionId) => void;
    commandHumanSelect?: (itemIdx: number, keepAuto?: boolean) => void;
    setHumanAutoCycle?: (auto: boolean) => void;
    setPhoto3DDisplayMode?: (mode: Photo3DDisplayMode) => void;
    setManualStudioAngleDeg?: (deg: number) => void;
    setAutoSpinStudio360?: (auto: boolean) => void;
  }>({});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Renderer + ACESFilmicToneMapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Software WebGL detection for headless screenshot reliability
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(rendererName);
    if (isSoftwareGl) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
    }

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d111a);
    scene.fog = new THREE.FogExp2(0x0d111a, 0.045);

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    const startBay = CLOSET_BAYS.find((b) => b.id === initialSection) || CLOSET_BAYS[0];
    const initialLockSpec = computeMannequinVerticalLockCameraSpec({
      verticalLocked: isVerticalLocked && startBay.id === 'mannequin',
      statureScaleY: bodySpec3D.scales.statureY,
      isDockCollapsed,
    });
    if (startBay.id === 'mannequin') {
      camera.position.set(...initialLockSpec.camPos);
    } else {
      camera.position.set(...startBay.camPos);
    }

    // 3. PMREM RoomEnvironment for realistic metallic/fabric/glass reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. OrbitControls with vertical polar lock when Mannequin Focus Lock is enabled
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    if (startBay.id === 'mannequin') {
      controls.target.set(...initialLockSpec.lookAt);
    } else {
      controls.target.set(...startBay.lookAt);
    }
    controls.minDistance = initialLockSpec.minDistance;
    controls.maxDistance = initialLockSpec.maxDistance;
    controls.minPolarAngle = initialLockSpec.minPolarAngle;
    controls.maxPolarAngle = initialLockSpec.maxPolarAngle;
    controls.enablePan = initialLockSpec.enablePan;
    controls.enableZoom = initialLockSpec.enableZoom;
    let verticalLockActiveInScene = isVerticalLocked;

    // 5. Warm Architectural Closet Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x1e1b18, 0.85);
    scene.add(hemiLight);

    const mainChandelierSpot = new THREE.SpotLight(0xfff1e0, 4.8, 16, Math.PI / 3, 0.5, 1);
    mainChandelierSpot.position.set(0, 3.8, 1.5);
    mainChandelierSpot.castShadow = !isSoftwareGl;
    mainChandelierSpot.shadow.mapSize.width = 1024;
    mainChandelierSpot.shadow.mapSize.height = 1024;
    scene.add(mainChandelierSpot);

    const leftWardrobeLight = new THREE.PointLight(0xffedd5, 2.2, 6.5);
    leftWardrobeLight.position.set(-2.0, 1.65, -0.4);
    scene.add(leftWardrobeLight);

    const rightWardrobeLight = new THREE.PointLight(0xffedd5, 2.2, 6.5);
    rightWardrobeLight.position.set(2.0, 1.65, -0.4);
    scene.add(rightWardrobeLight);

    const backAtelierLight = new THREE.PointLight(0xe0e7ff, 2.0, 6.5);
    backAtelierLight.position.set(0, 1.85, -2.1);
    scene.add(backAtelierLight);

    // Shared procedural textures & architectural materials
    const weaveTex = createFabricWeaveTexture();
    const parquetTex = createWalnutParquetTexture();
    const dialTex = createTurntableDialTexture();
    parquetTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    dialTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const walnutCabinetMat = new THREE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.42,
      metalness: 0.06,
    });
    const darkWalnutTrimMat = new THREE.MeshStandardMaterial({
      color: 0x23160d,
      roughness: 0.35,
      metalness: 0.1,
    });
    const brushedBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.88,
    });
    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.22,
      metalness: 0.9,
    });
    const warmLedStripMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });

    // Interactive bay glow indicators
    const bayGlowMeshes: Record<string, THREE.Mesh> = {};
    const clickableGroups: Array<{ group: THREE.Object3D; sectionId: ClosetSectionId }> = [];

    // ========================================================================
    // A. WALK-IN CLOSET ROOM ARCHITECTURE (Floor, Rug, Fluted Walls, Ceiling Cove)
    // ========================================================================
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // 1. Walnut Parquet Floor
    const floorGeo = new THREE.PlaneGeometry(11, 9);
    const floorMat = new THREE.MeshStandardMaterial({
      map: parquetTex,
      roughness: 0.48,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.9;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // 2. Woven Wool Atelier Area Rug beneath the central pedestal & island
    const rugGeo = new THREE.BoxGeometry(4.2, 0.018, 3.6);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      bumpMap: weaveTex,
      bumpScale: 0.008,
      roughness: 0.88,
    });
    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.position.set(0, -0.89, 0.1);
    roomGroup.add(rugMesh);

    const rugBorderGeo = new THREE.BoxGeometry(4.32, 0.014, 3.72);
    const rugBorderMesh = new THREE.Mesh(rugBorderGeo, brushedBrassMat);
    rugBorderMesh.position.set(0, -0.893, 0.1);
    roomGroup.add(rugBorderMesh);

    // 3. Perimeter Architectural Walls (Back wall + Left & Right Wing walls)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x141923,
      roughness: 0.72,
      metalness: 0.12,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.3, 0.14), wallMat);
    backWall.position.set(0, 0.75, -2.95);
    roomGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 5.2), wallMat);
    leftWall.position.set(-3.55, 0.75, -0.4);
    roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 5.2), wallMat);
    rightWall.position.set(3.55, 0.75, -0.4);
    roomGroup.add(rightWall);

    // Ceiling Crown Moulding & Warm Cove LED Strip
    const crownBack = new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 0.12, 0.25),
      darkWalnutTrimMat
    );
    crownBack.position.set(0, 2.32, -2.8);
    roomGroup.add(crownBack);

    const crownLedBack = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.025, 0.04),
      warmLedStripMat
    );
    crownLedBack.position.set(0, 2.25, -2.68);
    roomGroup.add(crownLedBack);

    // ========================================================================
    // SECTION 1 (LEFT WING): OUTERWEAR, BLAZERS & OVERSHIRTS WARDROBE BAY
    // ========================================================================
    const blazersBayGroup = new THREE.Group();
    blazersBayGroup.position.set(-2.65, -0.9, -0.45);
    blazersBayGroup.rotation.y = Math.PI / 2;
    scene.add(blazersBayGroup);
    clickableGroups.push({ group: blazersBayGroup, sectionId: 'blazers' });

    // Wardrobe Cabinet Frame
    const blazerCabinetBack = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 2.45, 0.08),
      walnutCabinetMat
    );
    blazerCabinetBack.position.set(0, 1.225, -0.32);
    blazersBayGroup.add(blazerCabinetBack);

    for (const sideX of [-1.15, 1.15]) {
      const sidePanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 2.45, 0.68),
        walnutCabinetMat
      );
      sidePanel.position.set(sideX, 1.225, 0);
      blazersBayGroup.add(sidePanel);
    }

    for (const shelfY of [0.06, 1.92, 2.42]) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 0.06, 0.68),
        walnutCabinetMat
      );
      shelf.position.set(0, shelfY, 0);
      blazersBayGroup.add(shelf);
    }

    // Top LED Light Strip inside Blazer Bay
    const blazerLed = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.02, 0.04),
      warmLedStripMat
    );
    blazerLed.position.set(0, 1.88, 0.22);
    blazersBayGroup.add(blazerLed);

    // Brushed Brass Hanging Rail
    const hangingRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 2.22, 16),
      brushedBrassMat
    );
    hangingRod.rotation.z = Math.PI / 2;
    hangingRod.position.set(0, 1.72, 0.05);
    blazersBayGroup.add(hangingRod);

    // 5 Hanging Tailored Blazers & Overshirts on Sculpted Hangers (Interactive Clothing Line)
    const coatUnitGroups: THREE.Group[] = [];
    const garmentLineHitGroups: { group: THREE.Group; itemIndex: number }[] = [];

    WARDROBE_LINE_ITEMS.forEach((lineItem, idx) => {
      const xPos = -0.82 + idx * 0.41;
      const coatUnit = new THREE.Group();
      coatUnit.position.set(xPos, 1.72, 0.05);
      // Angled boutique rack hang (~52 degrees)
      coatUnit.rotation.y = 0.88;

      // Brass hook + walnut hanger shoulders
      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.006, 8, 16, Math.PI * 1.3),
        brushedBrassMat
      );
      hook.position.set(0, 0.02, 0);
      coatUnit.add(hook);

      const hangerBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.03, 0.04),
        darkWalnutTrimMat
      );
      hangerBar.position.set(0, -0.05, 0);
      coatUnit.add(hangerBar);

      // Sculpted Hanging Garment Body + Sleeves
      const coatMat = new THREE.MeshStandardMaterial({
        color: lineItem.garmentColorHex,
        bumpMap: weaveTex,
        bumpScale: 0.004,
        roughness: lineItem.garmentRoughness,
      });
      const coatBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.82, 0.11),
        coatMat
      );
      coatBody.position.set(0, -0.46, 0);
      coatUnit.add(coatBody);

      const leftSlv = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.04, 0.68, 12),
        coatMat
      );
      leftSlv.position.set(-0.19, -0.42, 0.01);
      leftSlv.rotation.z = 0.08;
      coatUnit.add(leftSlv);

      const rightSlv = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.04, 0.68, 12),
        coatMat
      );
      rightSlv.position.set(0.19, -0.42, 0.01);
      rightSlv.rotation.z = -0.08;
      coatUnit.add(rightSlv);

      blazersBayGroup.add(coatUnit);
      coatUnitGroups.push(coatUnit);
      garmentLineHitGroups.push({ group: coatUnit, itemIndex: idx });
    });

    // Top-shelf Hat Boxes / Valet Cases in Blazer Bay
    for (const bx of [-0.6, 0.1, 0.7]) {
      const boxMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.28, 24),
        new THREE.MeshStandardMaterial({ color: 0xded6c6, roughness: 0.55 })
      );
      boxMesh.position.set(bx, 2.1, 0);
      blazersBayGroup.add(boxMesh);
    }

    const blazerBayGlow = new THREE.Mesh(
      new THREE.BoxGeometry(2.38, 0.04, 0.72),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.0 })
    );
    blazerBayGlow.position.set(0, 0.02, 0);
    blazersBayGroup.add(blazerBayGlow);
    bayGlowMeshes.blazers = blazerBayGlow;

    // ========================================================================
    // SECTION 2 (NORTH-WEST CORNER): LAYERING TEES & KNITWEAR CUBBY SHELVING
    // ========================================================================
    const knitwearBayGroup = new THREE.Group();
    knitwearBayGroup.position.set(-1.75, -0.9, -2.42);
    scene.add(knitwearBayGroup);
    clickableGroups.push({ group: knitwearBayGroup, sectionId: 'knitwear' });

    const knitBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 2.35, 0.07),
      walnutCabinetMat
    );
    knitBack.position.set(0, 1.175, -0.28);
    knitwearBayGroup.add(knitBack);

    for (const sx of [-0.74, 0, 0.74]) {
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.35, 0.56),
        walnutCabinetMat
      );
      divider.position.set(sx, 1.175, 0);
      knitwearBayGroup.add(divider);
    }

    const stackPalette = [
      [0xf8fafc, 0xe2e8f0, 0xcbd5e1], // Optic White & Grey Supima Tees
      [0x334155, 0x475569, 0x1e293b], // Mercerized Slate Ribbed Tees
      [0xd6d3d1, 0xa8a29e, 0xf5f5f4], // Heather Oat Terry Crewnecks
      [0x3f4f3e, 0x1e3a5f, 0x57534e], // Merino Sweaters
    ];

    [0.06, 0.62, 1.18, 1.74, 2.3].forEach((sy, tierIdx) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.05, 0.56),
        walnutCabinetMat
      );
      shelf.position.set(0, sy, 0);
      knitwearBayGroup.add(shelf);

      if (tierIdx < 4) {
        // LED strip under shelf
        const cubbyLed = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.015, 0.03),
          warmLedStripMat
        );
        cubbyLed.position.set(0, sy + 0.52, 0.2);
        knitwearBayGroup.add(cubbyLed);

        // Folded garment stacks in Left and Right cubbies
        for (const colIdx of [0, 1]) {
          const cx = colIdx === 0 ? -0.37 : 0.37;
          const colors = stackPalette[(tierIdx + colIdx) % stackPalette.length];
          colors.forEach((cHex, stackIdx) => {
            const foldedPiece = new THREE.Mesh(
              new THREE.BoxGeometry(0.46, 0.065, 0.38),
              new THREE.MeshStandardMaterial({
                color: cHex,
                bumpMap: weaveTex,
                bumpScale: 0.004,
                roughness: 0.72,
              })
            );
            foldedPiece.position.set(cx, sy + 0.065 + stackIdx * 0.072, 0.02);
            knitwearBayGroup.add(foldedPiece);
          });
        }
      }
    });

    const knitBayGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.04, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.0 })
    );
    knitBayGlow.position.set(0, 0.02, 0);
    knitwearBayGroup.add(knitBayGlow);
    bayGlowMeshes.knitwear = knitBayGlow;

    // ========================================================================
    // SECTION 3 (CENTER-BACK): TRI-FOLD BRASS ATELIER MIRROR
    // ========================================================================
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(0, -0.9, -2.55);
    scene.add(mirrorGroup);

    const mirrorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      metalness: 0.92,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    // Center mirror panel + 2 angled wing panels
    const mirrorConfigs = [
      { x: 0, z: 0, rotY: 0, w: 0.92 },
      { x: -0.76, z: 0.18, rotY: 0.36, w: 0.56 },
      { x: 0.76, z: 0.18, rotY: -0.36, w: 0.56 },
    ];
    mirrorConfigs.forEach((mc) => {
      const panelGroup = new THREE.Group();
      panelGroup.position.set(mc.x, 1.18, mc.z);
      panelGroup.rotation.y = mc.rotY;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(mc.w + 0.06, 2.24, 0.045),
        brushedBrassMat
      );
      panelGroup.add(frame);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(mc.w, 2.16, 0.052),
        mirrorGlassMat
      );
      panelGroup.add(glass);
      mirrorGroup.add(panelGroup);
    });

    // ========================================================================
    // SECTION 4 (NORTH-EAST CORNER): TAILORED TROUSERS & SELVEDGE DENIM RACK
    // ========================================================================
    const trousersBayGroup = new THREE.Group();
    trousersBayGroup.position.set(1.75, -0.9, -2.42);
    scene.add(trousersBayGroup);
    clickableGroups.push({ group: trousersBayGroup, sectionId: 'trousers' });

    const trouserBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 2.35, 0.07),
      walnutCabinetMat
    );
    trouserBack.position.set(0, 1.175, -0.28);
    trousersBayGroup.add(trouserBack);

    for (const sx of [-0.74, 0.74]) {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.35, 0.56),
        walnutCabinetMat
      );
      side.position.set(sx, 1.175, 0);
      trousersBayGroup.add(side);
    }

    for (const sy of [0.06, 1.25, 2.3]) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.05, 0.56),
        walnutCabinetMat
      );
      shelf.position.set(0, sy, 0);
      trousersBayGroup.add(shelf);
    }

    // Upper & Lower Trouser Valet Rails with Draped Trousers, Chinos & Selvedge Denim
    const trouserColors = [0x27272a, 0x4d5d4b, 0x1e3a5f, 0x3f3f46, 0xd6d3d1];
    [1.12, 2.12].forEach((railY, tier) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 1.44, 16),
        brushedSteelMat
      );
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, railY, 0.06);
      trousersBayGroup.add(rail);

      trouserColors.forEach((tHex, idx) => {
        const tx = -0.52 + idx * 0.26;
        const pMat = new THREE.MeshStandardMaterial({
          color: tier === 1 && idx === 2 ? 0x172554 : tHex,
          bumpMap: weaveTex,
          bumpScale: 0.005,
          roughness: 0.68,
        });
        const trouserFold = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.78, 0.34),
          pMat
        );
        trouserFold.position.set(tx, railY - 0.39, 0.05);
        trousersBayGroup.add(trouserFold);

        // Red-line selvedge cuff accent on denim pairs
        if (idx === 2) {
          const selvedgeCuff = new THREE.Mesh(
            new THREE.BoxGeometry(0.086, 0.06, 0.345),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
          );
          selvedgeCuff.position.set(tx, railY - 0.74, 0.05);
          trousersBayGroup.add(selvedgeCuff);
        }
      });
    });

    const trouserBayGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.04, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.0 })
    );
    trouserBayGlow.position.set(0, 0.02, 0);
    trousersBayGroup.add(trouserBayGlow);
    bayGlowMeshes.trousers = trouserBayGlow;

    // ========================================================================
    // SECTION 5 (RIGHT WING): GOODYEAR-WELTED FOOTWEAR DISPLAY PLINTHS
    // ========================================================================
    const footwearBayGroup = new THREE.Group();
    footwearBayGroup.position.set(2.65, -0.9, -0.45);
    footwearBayGroup.rotation.y = -Math.PI / 2;
    scene.add(footwearBayGroup);
    clickableGroups.push({ group: footwearBayGroup, sectionId: 'footwear' });

    const shoeCabinetBack = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 2.45, 0.08),
      walnutCabinetMat
    );
    shoeCabinetBack.position.set(0, 1.225, -0.32);
    footwearBayGroup.add(shoeCabinetBack);

    for (const sideX of [-1.15, 1.15]) {
      const sidePanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 2.45, 0.68),
        walnutCabinetMat
      );
      sidePanel.position.set(sideX, 1.225, 0);
      footwearBayGroup.add(sidePanel);
    }

    const shoeTierStyles = [
      { y: 0.45, color: 0x5c381c, sole: 0x1c110a, isBoot: false }, // Espresso Suede Penny Loafers
      { y: 0.98, color: 0xf8fafc, sole: 0xe2e8f0, isBoot: false }, // Minimalist White Calfskin Sneakers
      { y: 1.51, color: 0x452210, sole: 0x180e07, isBoot: true }, // Chromexcel Service Boots
      { y: 2.04, color: 0x18181b, sole: 0x09090b, isBoot: false }, // Black Box-Calf Wholecut Oxfords
    ];

    shoeTierStyles.forEach((tier) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(2.26, 0.045, 0.58),
        walnutCabinetMat
      );
      shelf.position.set(0, tier.y, 0);
      shelf.rotation.x = 0.12; // Boutique angled shoe display shelf
      footwearBayGroup.add(shelf);

      const ledBar = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.016, 0.03),
        warmLedStripMat
      );
      ledBar.position.set(0, tier.y + 0.42, 0.18);
      footwearBayGroup.add(ledBar);

      // 3 pairs of sculpted shoes per shelf
      for (const pairX of [-0.68, 0.0, 0.68]) {
        for (const footOffset of [-0.085, 0.085]) {
          const shoeGroup = new THREE.Group();
          shoeGroup.position.set(pairX + footOffset, tier.y + 0.055, 0.02);
          shoeGroup.rotation.x = 0.12;

          const sole = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.026, 0.3),
            new THREE.MeshStandardMaterial({ color: tier.sole, roughness: 0.6 })
          );
          shoeGroup.add(sole);

          const vamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.102, tier.isBoot ? 0.15 : 0.085, 0.27),
            new THREE.MeshStandardMaterial({
              color: tier.color,
              roughness: tier.color === 0xf8fafc ? 0.35 : 0.52,
              metalness: 0.08,
            })
          );
          vamp.position.set(0, tier.isBoot ? 0.08 : 0.05, -0.01);
          shoeGroup.add(vamp);

          // Brass cedar shoe-tree knob
          const knob = new THREE.Mesh(
            new THREE.SphereGeometry(0.016, 12, 12),
            brushedBrassMat
          );
          knob.position.set(0, tier.isBoot ? 0.17 : 0.11, -0.07);
          shoeGroup.add(knob);

          footwearBayGroup.add(shoeGroup);
        }
      }
    });

    const footwearBayGlow = new THREE.Mesh(
      new THREE.BoxGeometry(2.38, 0.04, 0.72),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.0 })
    );
    footwearBayGlow.position.set(0, 0.02, 0);
    footwearBayGroup.add(footwearBayGlow);
    bayGlowMeshes.footwear = footwearBayGlow;

    // ========================================================================
    // SECTION 6 (FRONT-RIGHT BOUTIQUE ISLAND): ILLUMINATED HOROLOGY WATCH VITRINE
    // ========================================================================
    const watchIslandGroup = new THREE.Group();
    watchIslandGroup.position.set(1.88, -0.9, 0.45);
    watchIslandGroup.rotation.y = -0.35;
    scene.add(watchIslandGroup);
    clickableGroups.push({ group: watchIslandGroup, sectionId: 'watches' });

    const islandBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.74, 0.68),
      walnutCabinetMat
    );
    islandBase.position.set(0, 0.37, 0);
    islandBase.castShadow = true;
    watchIslandGroup.add(islandBase);

    // Brass Drawer Pulls on Island Front
    for (const dy of [0.22, 0.44, 0.62]) {
      const pull = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.018, 0.025),
        brushedBrassMat
      );
      pull.position.set(0, dy, 0.35);
      watchIslandGroup.add(pull);
    }

    // Velvet Horology Tray
    const velvetTray = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.03, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    velvetTray.position.set(0, 0.755, 0);
    watchIslandGroup.add(velvetTray);

    // 3 Sculpted Watches on Pillows (Chronograph, Titanium Field, Sunray Dress)
    const watchSpecs = [
      { x: -0.32, dial: 0x0f172a, strap: 0x5c3a21, caseMat: brushedSteelMat },
      { x: 0.0, dial: 0xf8fafc, strap: 0x3f4f3e, caseMat: brushedSteelMat },
      { x: 0.32, dial: 0x1e3a8a, strap: 0x94a3b8, caseMat: brushedBrassMat },
    ];
    watchSpecs.forEach((ws) => {
      const wUnit = new THREE.Group();
      wUnit.position.set(ws.x, 0.81, 0);

      const pillow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
      );
      pillow.rotation.z = Math.PI / 2;
      wUnit.add(pillow);

      const strapRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.016, 12, 24),
        new THREE.MeshStandardMaterial({ color: ws.strap, roughness: 0.55 })
      );
      strapRing.rotation.y = Math.PI / 2;
      wUnit.add(strapRing);

      const watchCase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.018, 24),
        ws.caseMat
      );
      watchCase.position.set(0, 0.068, 0.015);
      watchCase.rotation.x = 0.35;
      wUnit.add(watchCase);

      const watchDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.02, 24),
        new THREE.MeshStandardMaterial({ color: ws.dial, roughness: 0.2, metalness: 0.4 })
      );
      watchDial.position.set(0, 0.069, 0.016);
      watchDial.rotation.x = 0.35;
      wUnit.add(watchDial);

      watchIslandGroup.add(wUnit);
    });

    // Optical Glass Vitrine Hood over Watch Island
    const vitrineGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.24, 0.62),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.28,
        roughness: 0.06,
        metalness: 0.1,
        clearcoat: 1.0,
      })
    );
    vitrineGlass.position.set(0, 0.88, 0);
    watchIslandGroup.add(vitrineGlass);

    const watchIslandGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.04, 0.74),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.0 })
    );
    watchIslandGlow.position.set(0, 0.02, 0);
    watchIslandGroup.add(watchIslandGlow);
    bayGlowMeshes.watches = watchIslandGlow;

    // ========================================================================
    // SECTION 7 (CENTER STAGE): 360° FITTING STUDIO PHOTO MODEL & TURNTABLE
    // ========================================================================
    const mannequinGroup = new THREE.Group();
    scene.add(mannequinGroup);
    clickableGroups.push({ group: mannequinGroup, sectionId: 'mannequin' });

    const waistScale = bodySpec3D.scales.waistX;
    const statureScaleY = bodySpec3D.scales.statureY;
    const depthRatioZ = Number(
      Math.min(
        Math.max(bodySpec3D.chestDepthCm / Math.max(bodySpec3D.chestWidthCm, 24), 0.58),
        0.95
      ).toFixed(3)
    );

    const isPrebakedZaraOrLinen =
      !activeGarmentId ||
      activeGarmentId.includes('zara-comfort') ||
      activeGarmentId === 'wardrobe-zara-blazer' ||
      activeGarmentId === 'relaxed-linen-overshirt' ||
      activeGarmentId === 'wardrobe-linen-overshirt' ||
      activeGarmentId === 'jordan-linen';

    const firstFrameUrl = studioFrames?.[0]?.imageUrl || '';
    const isAiSynthesizedFrame =
      firstFrameUrl.startsWith('data:image/png') ||
      firstFrameUrl.startsWith('data:image/jpeg') ||
      firstFrameUrl.startsWith('data:image/webp');

    const shouldDrapeCustomGarment =
      !isPrebakedZaraOrLinen && !isAiSynthesizedFrame && Boolean(garmentFrontImage);

    const dressedAngleSpecs = resolveStudioTurntableFramesFor3D({
      studioFrames,
      presetFramesBySize: defaultPreset.framesBySize,
      selectedSize: effectiveTrueSize,
      fallbackFrontUrl: effectiveFrontPhoto,
    });

    const rawAngleSpecs = resolveStudioTurntableFramesFor3D({
      studioFrames: STUDIO_TURNTABLE_ANGLES.map((angle) => ({
        angle,
        label: `${angle}°`,
        imageUrl:
          angle === 135 || angle === 180 || angle === 225
            ? effectiveBackPhoto
            : angle === 90 || angle === 270
              ? effectiveSidePhoto || effectiveFrontPhoto
              : effectiveFrontPhoto,
        status: 'ready' as const,
      })),
      presetFramesBySize: defaultPreset.framesBySize,
      selectedSize: effectiveTrueSize,
      fallbackFrontUrl: effectiveFrontPhoto,
    });

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const studioTurntableTextures = createStudio360TurntableTextures(
      dressedAngleSpecs,
      rawAngleSpecs,
      garmentFrontImage,
      garmentBackImage,
      shouldDrapeCustomGarment,
      maxAniso,
      () => {
        renderer.render(scene, camera);
      }
    );

    // Part 1: Illuminated Turntable Degree Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.08, 1.16, 0.11, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      roughness: 0.28,
      metalness: 0.62,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -0.84;
    pedestalMesh.receiveShadow = true;
    mannequinGroup.add(pedestalMesh);

    const brassRimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.11, 0.016, 16, 96),
      brushedBrassMat
    );
    brassRimMesh.rotation.x = Math.PI / 2;
    brassRimMesh.position.y = -0.79;
    mannequinGroup.add(brassRimMesh);

    // Soft radial contact shadow under the 360° Fitting Studio model's shoes on the turntable
    const footShadowGeo = new THREE.CircleGeometry(0.42, 32);
    const footShadowMat = new THREE.MeshBasicMaterial({
      color: 0x05070c,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const footShadowDisc = new THREE.Mesh(footShadowGeo, footShadowMat);
    footShadowDisc.rotation.x = -Math.PI / 2;
    footShadowDisc.position.set(0, -0.781, 0);
    mannequinGroup.add(footShadowDisc);

    // Part 2: Full-Body Photorealistic 360° Fitting Studio Model on the Central Turntable
    const photoPlaneHeight = 1.56 * statureScaleY;
    const photoPlaneWidth = photoPlaneHeight * 0.75;
    const studioPhotoGeo = new THREE.PlaneGeometry(photoPlaneWidth, photoPlaneHeight);
    const studioPhotoMat = new THREE.MeshBasicMaterial({
      map: studioTurntableTextures.dressedTextures[0],
      transparent: true,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const studioPhotoMesh = new THREE.Mesh(studioPhotoGeo, studioPhotoMat);
    // Position so the model's shoes at the bottom of the frame rest squarely on the turntable top (y = -0.785)
    studioPhotoMesh.position.set(0, -0.785 + photoPlaneHeight * 0.5, 0);
    mannequinGroup.add(studioPhotoMesh);

    // Part 3: Tri-Fold Atelier Mirror Reflection of the 360° Fitting Studio Photo (Rear 180° View)
    const mirrorReflectionMat = new THREE.MeshBasicMaterial({
      map: studioTurntableTextures.dressedTextures[4], // 180° Back view
      transparent: true,
      opacity: 0.58,
      alphaTest: 0.04,
      depthWrite: false,
      toneMapped: false,
    });
    const mirrorReflectionMesh = new THREE.Mesh(studioPhotoGeo, mirrorReflectionMat);
    mirrorReflectionMesh.position.set(0, -0.785 + photoPlaneHeight * 0.48, -2.46);
    mirrorReflectionMesh.scale.set(0.92, 0.92, 1);
    scene.add(mirrorReflectionMesh);

    // Part 4: Illuminated 3D Photo-Landmark Cross-Section Rings (Shoulders, Chest, Waist, Hip)
    // Shown when inspecting Raw 3D Photo Scan + Slices or when Fit Caliper slider > 0
    const landmarkRingsGroup = new THREE.Group();
    landmarkRingsGroup.visible = false;
    const ringStations = bodySpec3D.slices.filter((s) =>
      ['hip', 'waist', 'chest', 'shoulders'].includes(s.stationId)
    );
    ringStations.forEach((st) => {
      const ringColor =
        st.stationId === 'chest'
          ? 0x38bdf8
          : st.stationId === 'waist'
            ? 0x10b981
            : st.stationId === 'hip'
              ? 0xa855f7
              : 0xf59e0b;
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(st.radiusWidthX * 1.85, 0.0055, 12, 64),
        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.82 })
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.scale.set(1.0, depthRatioZ, 1.0);
      ringMesh.position.y = st.yMeters;
      landmarkRingsGroup.add(ringMesh);
    });
    mannequinGroup.add(landmarkRingsGroup);

    // Waist Caliper Ease Ring around the 360° Studio Model
    const caliperMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.0,
    });
    const caliperRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.285 * waistScale, 0.006, 12, 64),
      caliperMat
    );
    caliperRing.rotation.x = Math.PI / 2;
    caliperRing.position.y = 0.16;
    caliperRing.visible = false;
    mannequinGroup.add(caliperRing);

    // 32-Instance Anthropometric Sensor Ring around Pedestal
    const sensorCount = 32;
    const sensorRing = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12),
      new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        emissive: 0x4f46e5,
        emissiveIntensity: 0.6,
      }),
      sensorCount
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < sensorCount; i++) {
      const angle = (i / sensorCount) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 0.94, -0.76, Math.sin(angle) * 0.94);
      dummy.updateMatrix();
      sensorRing.setMatrixAt(i, dummy.matrix);
    }
    sensorRing.instanceMatrix.needsUpdate = true;
    mannequinGroup.add(sensorRing);

    // ========================================================================
    // WARDROBE LINE SELECTION & 360° STUDIO TURNTABLE CONTROLLER
    // ========================================================================
    let walkerState: HumanWalkerState = {
      ...createInitialHumanWalkerState(0),
      autoCycleEnabled: false,
    };
    let manualStudioAngleDeg = 0;
    let autoSpinStudioEnabled = false;
    let currentDisplayMode: Photo3DDisplayMode = 'photo_twin_dressed';
    let lastSyncedEquippedIdx = walkerState.equippedItemIndex;
    let lastSyncedAngle = -1;
    let lastUiSyncTime = 0;

    const updateStudioModelAndLine = (state: HumanWalkerState, nowMs: number) => {
      // 1. Billboard the 360° Fitting Studio photo horizontally toward the active 3D camera
      const camYaw = Math.atan2(camera.position.x, camera.position.z);
      studioPhotoMesh.rotation.y = camYaw;

      // 2. Compute which of the 8 360° Fitting Studio angles [0, 45, 90, 135, 180, 225, 270, 315]
      // matches the camera orbit + manual/auto turntable angle
      const resolvedAngle = computeActiveStudioAngleFromCamera(
        camera.position.x,
        camera.position.z,
        0,
        0,
        manualStudioAngleDeg
      );
      const activeTexArray =
        currentDisplayMode === 'raw_photo_scan'
          ? studioTurntableTextures.rawTextures
          : studioTurntableTextures.dressedTextures;

      const nextMainTex = activeTexArray[resolvedAngle.index] || activeTexArray[0];
      if (studioPhotoMat.map !== nextMainTex) {
        studioPhotoMat.map = nextMainTex;
        studioPhotoMat.needsUpdate = true;
      }

      // Update rear reflection in the Tri-Fold Atelier Mirror ((index + 4) % 8 = opposite 180° hemisphere)
      const mirrorIdx = (resolvedAngle.index + 4) % 8;
      const nextMirrorTex = activeTexArray[mirrorIdx] || activeTexArray[4];
      if (mirrorReflectionMat.map !== nextMirrorTex) {
        mirrorReflectionMat.map = nextMirrorTex;
        mirrorReflectionMat.needsUpdate = true;
      }

      // Rotate the degree dial pedestal to match the manual/auto turntable spin
      pedestalMesh.rotation.y = (-manualStudioAngleDeg * Math.PI) / 180;

      // 3. Animate the targeted hanger on the brass clothing line when selected
      coatUnitGroups.forEach((coatGrp, idx) => {
        const isSelectedHanger = idx === state.targetItemIndex;
        const pullAmount =
          state.autoCycleEnabled
            ? idx === state.targetItemIndex
              ? state.activeHangerPull
              : 0
            : isSelectedHanger
              ? 0.85
              : 0;
        if (pullAmount > 0.01) {
          coatGrp.position.z = 0.05 + pullAmount * 0.24;
          coatGrp.rotation.x = -pullAmount * 0.16;
        } else {
          coatGrp.position.z = 0.05;
          coatGrp.rotation.x = 0;
        }
      });

      // 4. Update blazer tint when a new garment is equipped from the wardrobe line
      if (state.equippedItemIndex !== lastSyncedEquippedIdx) {
        lastSyncedEquippedIdx = state.equippedItemIndex;
        const equippedItem = WARDROBE_LINE_ITEMS[state.equippedItemIndex];
        if (equippedItem) {
          studioTurntableTextures.applyBlazerTintHex(
            state.equippedItemIndex === 0 ? null : equippedItem.garmentColorHex
          );
        }
      }

      // 5. Throttle React HUD state updates to <= 5Hz
      if (nowMs - lastUiSyncTime > 200 || resolvedAngle.angle !== lastSyncedAngle) {
        lastUiSyncTime = nowMs;
        lastSyncedAngle = resolvedAngle.angle;
        setActiveStudioAngle(resolvedAngle.angle);
        setHumanTargetIndex(state.targetItemIndex);
        setHumanEquippedIndex(state.equippedItemIndex);
        setHumanPhase(state.phase);
      }
    };

    updateStudioModelAndLine(walkerState, 0);

    // ========================================================================
    // RAYCASTING CLICK-TO-FOCUS ON ANY 3D CLOSET BAY OR HANGING GARMENT ON LINE
    // ========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: MouseEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Check if the user clicked directly on one of the 5 hanging garments on the line
      for (const lineHit of garmentLineHitGroups) {
        const hits = raycaster.intersectObjects(lineHit.group.children, true);
        if (hits.length > 0) {
          sceneRefs.current.commandHumanSelect?.(lineHit.itemIndex, false);
          return;
        }
      }

      // 2. Otherwise focus the clicked closet bay
      for (const item of clickableGroups) {
        const hits = raycaster.intersectObjects(item.group.children, true);
        if (hits.length > 0) {
          const bay = CLOSET_BAYS.find((b) => b.id === item.sectionId);
          if (bay) {
            setActiveSection(bay.id);
            sceneRefs.current.setCameraTarget?.(bay.camPos, bay.lookAt, bay.id);
            sceneRefs.current.highlightBay?.(bay.id);
          }
          break;
        }
      }
    };

    // When Vertical Screen Lock is active, intercept wheel events on the 3D stage
    // to prevent vertical page drift and instead spin the 360° Mannequin horizontally
    const handleCanvasWheel = (e: WheelEvent) => {
      if (!verticalLockActiveInScene) return;
      e.preventDefault();
      e.stopPropagation();
      autoSpinStudioEnabled = false;
      setIsAutoSpin360(false);
      const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      manualStudioAngleDeg = (((manualStudioAngleDeg + dominantDelta * 0.22) % 360) + 360) % 360;
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    renderer.domElement.addEventListener('mousedown', handlePointerDown);
    renderer.domElement.addEventListener('mouseup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleCanvasWheel, { passive: false });

    // ========================================================================
    // RENDER LOOP & SOFTWARE-GL FENCE SYNC (THREE.JS SKILL PATTERN)
    // ========================================================================
    let frameId = 0;
    let isDisposed = false;
    let lastFrameTime = performance.now();

    const afterDraw = (cb: () => void) => {
      if (isDisposed) return;
      if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          if (!sync) {
            frameId = window.setTimeout(cb, 80);
            return;
          }
          const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        gl.finish();
        frameId = window.setTimeout(cb, 80);
      }
    };

    const drawFrame = () => {
      renderer.render(scene, camera);
    };

    const tick = () => {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.08);
      lastFrameTime = now;

      if (autoSpinStudioEnabled) {
        manualStudioAngleDeg = (manualStudioAngleDeg + dt * 32) % 360;
      }

      if (walkerState.autoCycleEnabled) {
        walkerState = stepHumanWalkerState(walkerState, dt);
      }
      updateStudioModelAndLine(walkerState, now);

      if (!isSoftwareGl) {
        controls.update();
      }
      drawFrame();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    controls.update();
    drawFrame();
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Scene state updaters
    sceneRefs.current.requestRender = () => {
      drawFrame();
    };

    sceneRefs.current.setManualStudioAngleDeg = (deg: number) => {
      autoSpinStudioEnabled = false;
      setIsAutoSpin360(false);
      // Align manualStudioAngleDeg so that relative to current camera azimuth, the requested studio angle is shown
      const camDeg = (Math.atan2(camera.position.x, camera.position.z) * 180) / Math.PI;
      manualStudioAngleDeg = (((deg - camDeg) % 360) + 360) % 360;
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.setAutoSpinStudio360 = (auto: boolean) => {
      autoSpinStudioEnabled = auto;
      setIsAutoSpin360(auto);
    };

    sceneRefs.current.commandHumanSelect = (itemIdx: number, keepAuto = false) => {
      walkerState = {
        ...commandHumanSelectLineItem(walkerState, itemIdx, keepAuto),
        equippedItemIndex: itemIdx,
        phase: 'posing_inspection',
      };
      setHumanTargetIndex(itemIdx);
      setHumanEquippedIndex(itemIdx);
      setHumanPhase('posing_inspection');
      setHumanAutoWalk(keepAuto);
      const selectedItem = WARDROBE_LINE_ITEMS[itemIdx];
      if (selectedItem) {
        studioTurntableTextures.applyBlazerTintHex(
          itemIdx === 0 ? null : selectedItem.garmentColorHex
        );
      }
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.setHumanAutoCycle = (auto: boolean) => {
      walkerState = { ...walkerState, autoCycleEnabled: auto };
      setHumanAutoWalk(auto);
    };

    sceneRefs.current.setPhoto3DDisplayMode = (mode: Photo3DDisplayMode) => {
      currentDisplayMode = mode;
      const isRawScan = mode === 'raw_photo_scan';
      landmarkRingsGroup.visible = isRawScan;
      caliperRing.visible = isRawScan;
      caliperMat.opacity = isRawScan ? 0.85 : 0.0;
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.updateMaterials = (swatch: FabricSwatch) => {
      studioTurntableTextures.applyBlazerTintHex(
        swatch.id === 'ecru-marl' ? null : swatch.blazerHex
      );
      drawFrame();
    };

    sceneRefs.current.updatePassGeometry = (passIdx: number, explode: number) => {
      caliperMat.color.setHex(passIdx === 0 ? 0xf43f5e : passIdx === 1 ? 0xf59e0b : 0x10b981);
      const showRings = explode > 0.02 || currentDisplayMode === 'raw_photo_scan';
      landmarkRingsGroup.visible = showRings;
      caliperRing.visible = showRings;
      caliperMat.opacity = showRings ? Math.max(0.45, explode) : 0.0;
      drawFrame();
    };

    sceneRefs.current.applyVerticalLockConstraints = (
      locked: boolean,
      dockCollapsed: boolean,
      recenterMannequin = false
    ) => {
      verticalLockActiveInScene = locked;
      const lockSpec = computeMannequinVerticalLockCameraSpec({
        verticalLocked: locked,
        statureScaleY: bodySpec3D.scales.statureY,
        isDockCollapsed: dockCollapsed,
      });

      if (locked || recenterMannequin) {
        // Preserve horizontal azimuth angle around the mannequin if already orbiting,
        // or reset to front 0° when explicitly recentering
        const currentAzimuth = recenterMannequin
          ? 0
          : Math.atan2(camera.position.x, camera.position.z);
        const dist = lockSpec.camPos[2];
        camera.position.set(
          Math.sin(currentAzimuth) * dist,
          lockSpec.camPos[1],
          Math.cos(currentAzimuth) * dist
        );
        controls.target.set(...lockSpec.lookAt);
      }

      controls.minPolarAngle = lockSpec.minPolarAngle;
      controls.maxPolarAngle = lockSpec.maxPolarAngle;
      controls.enablePan = lockSpec.enablePan;
      controls.enableZoom = lockSpec.enableZoom;
      controls.minDistance = lockSpec.minDistance;
      controls.maxDistance = lockSpec.maxDistance;
      controls.update();
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.setCameraTarget = (pos, lookAt, sectionId) => {
      if (sectionId === 'mannequin') {
        const lockSpec = computeMannequinVerticalLockCameraSpec({
          verticalLocked: verticalLockActiveInScene,
          statureScaleY: bodySpec3D.scales.statureY,
          isDockCollapsed,
        });
        camera.position.set(...lockSpec.camPos);
        controls.target.set(...lockSpec.lookAt);
        controls.minPolarAngle = lockSpec.minPolarAngle;
        controls.maxPolarAngle = lockSpec.maxPolarAngle;
        controls.enablePan = lockSpec.enablePan;
        controls.enableZoom = lockSpec.enableZoom;
        controls.minDistance = lockSpec.minDistance;
        controls.maxDistance = lockSpec.maxDistance;
      } else {
        // Allow camera to frame the selected architectural closet bay
        controls.minPolarAngle = Math.PI * 0.14;
        controls.maxPolarAngle = Math.PI * 0.52;
        controls.minDistance = 1.25;
        controls.maxDistance = 7.5;
        camera.position.set(...pos);
        controls.target.set(...lookAt);
      }
      controls.update();
      updateStudioModelAndLine(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.highlightBay = (sectionId: ClosetSectionId) => {
      Object.entries(bayGlowMeshes).forEach(([key, mesh]) => {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = key === sectionId ? 0.85 : 0.0;
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      drawFrame();
    });
    resizeObserver.observe(container);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') {
        setIsDockCollapsed((prev) => !prev);
      } else if (key === 'l') {
        setIsVerticalLocked((prev) => {
          const next = !prev;
          onToggleVerticalScreenLock?.(next);
          return next;
        });
      } else if (key >= '1' && key <= '5') {
        const idx = Number(key) - 1;
        sceneRefs.current.commandHumanSelect?.(idx, false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isDisposed = true;
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      renderer.domElement.removeEventListener('mouseup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleCanvasWheel);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      weaveTex.dispose();
      parquetTex.dispose();
      dialTex.dispose();
      studioPhotoGeo.dispose();
      studioPhotoMat.dispose();
      mirrorReflectionMat.dispose();
      footShadowGeo.dispose();
      footShadowMat.dispose();
      studioTurntableTextures.dispose();
      renderer.dispose();
    };
  }, [
    measurements.chest,
    measurements.waist,
    measurements.hip,
    heightCm,
    effectiveFrontPhoto,
    effectiveBackPhoto,
    effectiveSidePhoto,
    studioFrames,
    activeGarmentId,
    garmentFrontImage,
    garmentBackImage,
    effectiveTrueSize,
  ]);

  useEffect(() => {
    sceneRefs.current.applyVerticalLockConstraints?.(
      isVerticalLocked,
      isDockCollapsed,
      activeSection === 'mannequin'
    );
  }, [isVerticalLocked, isDockCollapsed, activeSection]);

  useEffect(() => {
    sceneRefs.current.updateMaterials?.(selectedSwatch);
  }, [selectedSwatch]);

  useEffect(() => {
    sceneRefs.current.updatePassGeometry?.(effectivePassIndex, explodeFactor);
  }, [effectivePassIndex, explodeFactor]);

  const handleToggleVerticalLock = () => {
    const nextLocked = !isVerticalLocked;
    setIsVerticalLocked(nextLocked);
    if (nextLocked) {
      setActiveSection('mannequin');
      sceneRefs.current.applyVerticalLockConstraints?.(true, isDockCollapsed, true);
      sceneRefs.current.highlightBay?.('mannequin');
    } else {
      sceneRefs.current.applyVerticalLockConstraints?.(false, isDockCollapsed, false);
    }
    onToggleVerticalScreenLock?.(nextLocked);
  };

  const handleSelectClosetBay = (bay: ClosetBayMeta) => {
    setActiveSection(bay.id);
    if (bay.id === 'mannequin') {
      setShowBayInventoryDrawer(false);
    } else if (['blazers', 'knitwear', 'trousers', 'watches', 'footwear'].includes(bay.id)) {
      setShowBayInventoryDrawer(true);
    }
    sceneRefs.current.setCameraTarget?.(bay.camPos, bay.lookAt, bay.id);
    sceneRefs.current.highlightBay?.(bay.id);
  };

  const handleTogglePhoto3DMode = (nextMode: Photo3DDisplayMode) => {
    setPhoto3DMode(nextMode);
    sceneRefs.current.setPhoto3DDisplayMode?.(nextMode);
  };

  const handleInlinePhotoFileChange = (
    slot: 'front' | 'back' | 'side',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (slot === 'front') setLocalFrontPhoto(reader.result);
        if (slot === 'back') setLocalBackPhoto(reader.result);
        if (slot === 'side') setLocalSidePhoto(reader.result);
        onPhotoUpload?.(slot, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentBayMeta = CLOSET_BAYS.find((b) => b.id === activeSection) || CLOSET_BAYS[0];

  // Filter matching real wardrobe & storefront pieces for the currently focused 3D Closet Bay
  const focusedClosetItems = existingWardrobe.filter((item) => {
    if (activeSection === 'blazers') {
      return item.category === 'Blazer' || item.category === 'Overshirt' || item.category === 'Shirt';
    }
    if (activeSection === 'knitwear') {
      return item.category === 'Layering Tee' || item.category === 'Knitwear';
    }
    if (activeSection === 'trousers') {
      return item.category === 'Bottom';
    }
    if (activeSection === 'watches') {
      return item.category === 'Watch';
    }
    if (activeSection === 'footwear') {
      return item.category === 'Shoes';
    }
    return true;
  });

  const focusedShopProducts = shopCatalog
    .filter((prod) => {
      const t = `${prod.title} ${prod.category}`.toLowerCase();
      if (activeSection === 'blazers') {
        return t.includes('blazer') || t.includes('overshirt') || t.includes('jacket') || t.includes('shirt');
      }
      if (activeSection === 'knitwear') {
        return prod.fabric === 'stretch_knit' || t.includes('crew') || t.includes('sweater') || t.includes('tee');
      }
      return activeSection === 'overview' || activeSection === 'mannequin';
    })
    .slice(0, 2);

  return (
    <div
      data-testid="three-closet-stage"
      data-vertical-lock={isVerticalLocked ? 'locked' : 'unlocked'}
      data-active-bay={activeSection}
      className={
        isFullBleed
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#0d111a]'
          : isVerticalLocked
            ? 'relative w-full h-[calc(100vh-92px)] min-h-[600px] max-h-[820px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0d111a]'
            : 'relative w-full h-[640px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0d111a]'
      }
    >
      {/* Full-Canvas 3D Walk-In Closet WebGL Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Single-Line Top Bar: Mannequin Focus Status, Vertical Screen Lock Toggle, and Inspector Triggers */}
      <div
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.92)' }}
        className="absolute top-2.5 inset-x-3 z-10 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-slate-200 flex items-center justify-between gap-2 overflow-x-auto"
      >
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="font-bold text-amber-300 tracking-wide uppercase text-[10px] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>360° Mannequin Stage ({activeStudioAngle}°)</span>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-semibold text-white">{currentBayMeta.zoneTitle}</span>
          <span className="text-slate-600 hidden xl:inline" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[11px] text-emerald-400 hidden xl:inline">
            {heightCm}cm · {measurements.chest}/{measurements.waist}/{measurements.hip}cm · Size {effectiveTrueSize}
          </span>
        </div>

        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          {/* Primary Vertical Screen Lock Toggle (Mannequin Focus) */}
          <button
            type="button"
            onClick={handleToggleVerticalLock}
            aria-pressed={isVerticalLocked}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              isVerticalLocked
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
            title="Lock or unlock vertical camera tilt and viewport vertical scroll around the 360° Studio Mannequin (Shortcut: L)"
          >
            {isVerticalLocked ? (
              <>
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Vertical Screen Lock: ON (Mannequin Focus)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3 text-slate-400" />
                <span>Vertical Screen Lock: OFF (Free Scroll)</span>
              </>
            )}
          </button>

          {/* Toggle 360° Fitting Studio Photo & User Pictures Inspector */}
          <button
            type="button"
            onClick={() => setShowPhoto3DInspector((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              showPhoto3DInspector
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/60'
            }`}
            title="Inspect the 360° Fitting Studio photo frames and user calibration photos"
          >
            <Scan className="w-3 h-3" />
            <span>360° Photo &amp; Slices</span>
          </button>

          {/* Toggle Bay Inventory Drawer on demand so Mannequin center stays 100% unobstructed */}
          {(onTryOnClosetItem || onTryOnShopProduct || onTryOnOutfitSlot) && (
            <button
              type="button"
              onClick={() => setShowBayInventoryDrawer((prev) => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                showBayInventoryDrawer
                  ? 'bg-indigo-600 border-indigo-400 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600/80'
              }`}
              title="Show or hide closet & shop garments for the active bay"
            >
              <Layers className="w-3 h-3 text-indigo-300" />
              <span>{showBayInventoryDrawer ? 'Hide Drawer' : 'Closet Drawer'}</span>
            </button>
          )}

          {onScrollToFeedBelow && (
            <button
              type="button"
              onClick={onScrollToFeedBelow}
              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 border border-indigo-400/60 cursor-pointer whitespace-nowrap shrink-0"
              title="Unlock vertical screen lock and jump down to AI Search, 5-Piece Lookbook & Live Shop Feed"
            >
              <ArrowDown className="w-3 h-3" />
              <span>Shop &amp; Outfit Feed</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullBleed((prev) => !prev)}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 border border-slate-600/70 cursor-pointer whitespace-nowrap shrink-0"
            title="Toggle 100vw x 100vh full-bleed 3D Mannequin Stage"
          >
            {isFullBleed ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>Full-Bleed</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline 360° Fitting Studio Photo & User Pictures Inspector Drawer */}
      {showPhoto3DInspector && (
        <div
          style={{ backgroundColor: 'rgba(13, 17, 26, 0.96)' }}
          className="absolute top-14 left-3 z-20 w-80 sm:w-96 rounded-xl border border-emerald-500/60 p-3.5 text-slate-200 space-y-2.5 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                360° Fitting Studio Photo in 3D Closet
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPhoto3DInspector(false)}
              className="text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            The central pedestal renders your live{' '}
            <span className="text-emerald-300 font-semibold">8-angle 360° Fitting Studio photo</span>{' '}
            ({activeGarmentName || 'Zara Comfort Suit Blazer'} · Size {effectiveTrueSize}) with
            studio cyclorama cutout and tri-fold mirror reflection.
          </p>

          {/* 3 Source User Pictures with Inline Upload */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { slot: 'front' as const, label: '1. Front Photo', img: effectiveFrontPhoto },
                { slot: 'back' as const, label: '2. Back Photo', img: effectiveBackPhoto },
                { slot: 'side' as const, label: '3. Side Profile', img: effectiveSidePhoto },
              ] as const
            ).map((viewItem) => (
              <div
                key={viewItem.slot}
                className="rounded-lg bg-slate-900/90 border border-slate-800 p-1.5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[9px] font-bold uppercase text-slate-400">
                  <span>{viewItem.label}</span>
                  <span className="text-emerald-400">360°</span>
                </div>
                <div className="aspect-3/4 rounded bg-slate-950 overflow-hidden border border-slate-800 relative">
                  {viewItem.img ? (
                    <img
                      src={viewItem.img}
                      alt={viewItem.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                      No Photo
                    </div>
                  )}
                </div>
                <label className="mt-0.5 px-1.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-[9px] font-semibold text-center text-slate-200 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-2.5 h-2.5" />
                  <span>Upload {viewItem.slot}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleInlinePhotoFileChange(viewItem.slot, e)}
                    className="hidden"
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Extracted 3D Elliptical Cross-Section Geometry Readout */}
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2 space-y-1 font-mono text-[10px]">
            <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
              <span>Calibrated Fit Cross-Sections</span>
              <span className="text-emerald-400 font-mono">Angle {activeStudioAngle}°</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 pt-0.5">
              <div>
                Shoulders: <span className="text-white font-bold">{bodySpec3D.shoulderWidthCm}cm</span> W
              </div>
              <div>
                Chest: <span className="text-white font-bold">{bodySpec3D.chestWidthCm}×{bodySpec3D.chestDepthCm}cm</span>
              </div>
              <div>
                Waist: <span className="text-white font-bold">{bodySpec3D.waistWidthCm}×{bodySpec3D.waistDepthCm}cm</span>
              </div>
              <div>
                Hip: <span className="text-white font-bold">{bodySpec3D.hipWidthCm}×{bodySpec3D.hipDepthCm}cm</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() =>
                handleTogglePhoto3DMode(
                  photo3DMode === 'photo_twin_dressed' ? 'raw_photo_scan' : 'photo_twin_dressed'
                )
              }
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Scan className="w-3 h-3" />
              <span>
                {photo3DMode === 'raw_photo_scan'
                  ? 'Switch to Dressed 360° Studio Photo'
                  : 'Inspect Before Photo + 3D Fit Slices'}
              </span>
            </button>
            {onOpenPhotoSetup && (
              <button
                type="button"
                onClick={onOpenPhotoSetup}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700 cursor-pointer"
              >
                Full Photo Setup &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* On-Demand Right Section Inspector Drawer (Hidden by default in Mannequin Focus for zero viewport occlusion) */}
      {showBayInventoryDrawer && (onTryOnClosetItem || onTryOnShopProduct || onTryOnOutfitSlot) && (
        <div
          style={{ backgroundColor: 'rgba(13, 17, 26, 0.94)' }}
          className="absolute top-14 right-3 z-20 w-72 rounded-xl border border-slate-700/80 p-3 text-slate-200 space-y-2 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              {currentBayMeta.label} Inventory
            </span>
            <button
              type="button"
              onClick={() => setShowBayInventoryDrawer(false)}
              className="text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {focusedClosetItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={item.frontImage}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-9 rounded object-cover bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.brand} · <span className="text-amber-300">Your Closet</span>
                    </div>
                    <div className="text-[11px] font-semibold text-white truncate">{item.name}</div>
                  </div>
                </div>
                {onTryOnClosetItem && (
                  <button
                    type="button"
                    onClick={() => onTryOnClosetItem(item)}
                    className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Try 360°
                  </button>
                )}
              </div>
            ))}

            {focusedShopProducts.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={prod.frontImage}
                    alt={prod.title}
                    referrerPolicy="no-referrer"
                    className="w-8 h-9 rounded object-cover bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 truncate">
                      {prod.brand} · <span className="text-emerald-400">${prod.price}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-white truncate">{prod.title}</div>
                  </div>
                </div>
                {onTryOnShopProduct && (
                  <button
                    type="button"
                    onClick={() => onTryOnShopProduct(prod)}
                    className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Fit 360°
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sleek Compact Bottom Control Dock (<= 13% viewport height so Mannequin feet & pedestal are 100% unobstructed) */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-5xl">
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={() => setIsDockCollapsed((prev) => !prev)}
              style={{ backgroundColor: 'rgba(13, 17, 26, 0.92)' }}
              className="px-3 py-0.5 rounded-full border border-slate-700 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              title="Toggle 3D Walk-In Closet Controls (Shortcut: H)"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>
                {isDockCollapsed
                  ? 'Show 360° Mannequin & Closet Controls (H)'
                  : 'Hide Controls · Zen Mode (H)'}
              </span>
            </button>
          </div>

          {!isDockCollapsed && (
            <div
              style={{ backgroundColor: 'rgba(13, 17, 26, 0.94)' }}
              className="rounded-xl border border-slate-700/90 px-3.5 py-2 text-xs text-slate-200 flex flex-col gap-1.5"
            >
              {/* Row 1: 360° Studio Mannequin Angle Controls + Closet Bay Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1 mr-0.5 whitespace-nowrap">
                    <RotateCw className="w-3 h-3 text-indigo-400" />
                    <span>360° Mannequin Angle:</span>
                  </span>
                  {([0, 45, 90, 135, 180, 225, 270, 315] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => sceneRefs.current.setManualStudioAngleDeg?.(deg)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        activeStudioAngle === deg && !isAutoSpin360
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => sceneRefs.current.setAutoSpinStudio360?.(!isAutoSpin360)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border cursor-pointer whitespace-nowrap shrink-0 ${
                      isAutoSpin360
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAutoSpin360 ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    <span>Auto 360°</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1 mr-0.5 whitespace-nowrap">
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>Bay:</span>
                  </span>
                  {CLOSET_BAYS.map((bay) => {
                    const isActive = activeSection === bay.id;
                    return (
                      <button
                        key={bay.id}
                        type="button"
                        onClick={() => handleSelectClosetBay(bay)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {bay.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Wardrobe Line Fit + Tailoring Swatches + Before/Slices Mode */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/90">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1 mr-0.5 whitespace-nowrap">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>Wardrobe Line:</span>
                  </span>
                  {WARDROBE_LINE_ITEMS.map((item, idx) => {
                    const isEquipped = humanEquippedIndex === idx;
                    const shortTitle =
                      idx === 0
                        ? '1. Cream Blazer'
                        : idx === 1
                          ? '2. Hemp Overshirt'
                          : idx === 2
                            ? '3. Navy Plaid'
                            : idx === 3
                              ? '4. Suede Jacket'
                              : '5. Cashmere Coat';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          sceneRefs.current.commandHumanSelect?.(idx, false);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                          isEquipped
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={`Select ${item.label} from the brass clothing line to preview on the 360° Studio Mannequin`}
                      >
                        <span
                          className="w-2 h-2 rounded-full border border-white/40 shrink-0"
                          style={{
                            backgroundColor: `#${item.garmentColorHex.toString(16).padStart(6, '0')}`,
                          }}
                        />
                        <span>{shortTitle}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Fabric Swatch Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 whitespace-nowrap">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Swatch:</span>
                    </span>
                    {FABRIC_SWATCHES.map((sw) => (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => setSelectedSwatch(sw)}
                        title={sw.name}
                        className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                          selectedSwatch.id === sw.id
                            ? 'border-white scale-110 ring-2 ring-indigo-500'
                            : 'border-slate-600 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: `#${sw.blazerHex.toString(16).padStart(6, '0')}`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Dressed vs Before Photo + 3D Slices */}
                  <button
                    type="button"
                    onClick={() =>
                      handleTogglePhoto3DMode(
                        photo3DMode === 'photo_twin_dressed' ? 'raw_photo_scan' : 'photo_twin_dressed'
                      )
                    }
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      photo3DMode === 'raw_photo_scan'
                        ? 'bg-cyan-600 border-cyan-300 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>
                      {photo3DMode === 'raw_photo_scan'
                        ? 'Showing: Before + 3D Slices'
                        : 'Before + 3D Slices'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


