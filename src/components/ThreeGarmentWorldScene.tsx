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
  Shirt,
  Layers,
  Watch,
  Footprints,
  Compass,
  UserCheck,
  Play,
  Pause,
} from 'lucide-react';
import { BodyMeasurements, ShoppingProduct } from '../types/tryon.ts';
import {
  ExistingWardrobeItem,
  OutfitSlotPiece,
  StylePairingRecommendation,
} from '../utils/wardrobeStyler.ts';
import { RenderCritiqueIteration } from '../utils/multiAgentOrchestrator.ts';
import {
  WARDROBE_LINE_ITEMS,
  HumanWalkerState,
  createInitialHumanWalkerState,
  stepHumanWalkerState,
  computeHumanJointPose,
  commandHumanSelectLineItem,
} from '../utils/closetHumanKinematics.ts';

export type ClosetSectionId =
  | 'overview'
  | 'human'
  | 'mannequin'
  | 'blazers'
  | 'knitwear'
  | 'trousers'
  | 'watches'
  | 'footwear';

interface ThreeGarmentWorldSceneProps {
  measurements: BodyMeasurements;
  heightCm: number;
  trueSize?: string;
  recommendedSize?: string;
  activePassIndex?: number;
  onSelectPassIndex?: (idx: number) => void;
  iterations?: RenderCritiqueIteration[];
  activePass?: RenderCritiqueIteration;
  allPasses?: RenderCritiqueIteration[];
  onSelectPass?: (passNum: number) => void;
  activeOutfit?: StylePairingRecommendation;
  existingWardrobe?: ExistingWardrobeItem[];
  shopCatalog?: ShoppingProduct[];
  onTryOnClosetItem?: (item: ExistingWardrobeItem) => void;
  onTryOnShopProduct?: (product: ShoppingProduct) => void;
  onTryOnOutfitSlot?: (piece: OutfitSlotPiece) => void;
  initialSection?: ClosetSectionId;
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
    id: 'overview',
    label: 'Room Overview',
    zoneTitle: 'Architectural Walk-In Closet & 360° Atelier',
    subtitle: 'Full 6-zone bespoke dressing room with 3D human walking & selecting clothing from the line',
    camPos: [0.0, 2.15, 4.35],
    lookAt: [-0.45, 0.35, -0.5],
  },
  {
    id: 'human',
    label: '3D Human & Line',
    zoneTitle: '3D Shopper · Walking & Selecting Clothing from the Line',
    subtitle: 'Articulated 3D human walking to the brass wardrobe rail, reaching for hangers & inspecting fit',
    camPos: [0.25, 1.18, 2.78],
    lookAt: [-1.75, 0.18, -0.35],
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
  {
    id: 'mannequin',
    label: '360° Mannequin',
    zoneTitle: 'Center Stage · Calibrated 360° Mannequin & Render-Critique Loop',
    subtitle: '10-part anthropometric rig with 32-node biometric sensor ring & tri-fold atelier mirror',
    camPos: [0.0, 0.62, 2.35],
    lookAt: [0.0, 0.28, 0.0],
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

export const ThreeGarmentWorldScene: React.FC<ThreeGarmentWorldSceneProps> = ({
  measurements,
  heightCm,
  trueSize,
  recommendedSize,
  activePassIndex,
  onSelectPassIndex,
  iterations,
  activePass,
  allPasses,
  onSelectPass,
  activeOutfit,
  existingWardrobe = [],
  shopCatalog = [],
  onTryOnClosetItem,
  onTryOnShopProduct,
  onTryOnOutfitSlot,
  initialSection = 'overview',
}) => {
  const effectiveTrueSize = trueSize || recommendedSize || 'M';
  const effectiveIterations = iterations || allPasses;
  const effectivePassIndex =
    activePassIndex !== undefined
      ? activePassIndex
      : activePass
        ? Math.max(0, activePass.iteration - 1)
        : 2;
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedSwatch, setSelectedSwatch] = useState<FabricSwatch>(FABRIC_SWATCHES[0]);
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<ClosetSectionId>(initialSection);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isFullBleed, setIsFullBleed] = useState<boolean>(false);

  // 3D Human Walker UI state (throttled updates from animation loop)
  const [humanTargetIndex, setHumanTargetIndex] = useState<number>(1);
  const [humanEquippedIndex, setHumanEquippedIndex] = useState<number>(0);
  const [humanPhase, setHumanPhase] = useState<string>('walking_to_rack');
  const [humanAutoWalk, setHumanAutoWalk] = useState<boolean>(true);

  const sceneRefs = useRef<{
    requestRender?: () => void;
    updateMaterials?: (swatch: FabricSwatch) => void;
    updatePassGeometry?: (passIdx: number, explode: number) => void;
    setCameraTarget?: (pos: [number, number, number], lookAt: [number, number, number]) => void;
    highlightBay?: (section: ClosetSectionId) => void;
    commandHumanSelect?: (itemIdx: number, keepAuto?: boolean) => void;
    setHumanAutoCycle?: (auto: boolean) => void;
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
    camera.position.set(...startBay.camPos);

    // 3. PMREM RoomEnvironment for realistic metallic/fabric/glass reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. OrbitControls with smooth damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(...startBay.lookAt);
    controls.minDistance = 1.25;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.51;

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
    watchIslandGroup.position.set(1.38, -0.9, 0.78);
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
    // SECTION 7 (CENTER STAGE): 10-PART CALIBRATED 360° MANNEQUIN & TURNTABLE
    // ========================================================================
    const mannequinGroup = new THREE.Group();
    scene.add(mannequinGroup);
    clickableGroups.push({ group: mannequinGroup, sectionId: 'mannequin' });

    const chestScale = (measurements.chest || 99) / 99;
    const waistScale = (measurements.waist || 95) / 95;
    const hipScale = (measurements.hip || 93) / 93;

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

    // Part 2: Sculpted Mannequin Torso Core (LatheGeometry)
    const torsoPoints = [
      new THREE.Vector2(0.0, -0.15),
      new THREE.Vector2(0.21 * hipScale, -0.12),
      new THREE.Vector2(0.195 * waistScale, 0.14),
      new THREE.Vector2(0.235 * chestScale, 0.44),
      new THREE.Vector2(0.255 * chestScale, 0.62),
      new THREE.Vector2(0.095, 0.72),
      new THREE.Vector2(0.085, 0.85),
      new THREE.Vector2(0.0, 0.86),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 48);
    const mannequinCoreMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.45,
      metalness: 0.1,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, mannequinCoreMat);
    torsoMesh.scale.set(1.18, 1.0, 0.78);
    torsoMesh.castShadow = true;
    mannequinGroup.add(torsoMesh);

    // Part 3: Brushed Brass Neck Finial
    const finialMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 32, 24),
      brushedBrassMat
    );
    finialMesh.position.set(0, 0.92, 0);
    mannequinGroup.add(finialMesh);

    // Part 4: Slot 2 — Layering Crewneck Tee
    const teeMat = new THREE.MeshStandardMaterial({
      color: selectedSwatch.teeHex,
      bumpMap: weaveTex,
      bumpScale: 0.004,
      roughness: 0.75,
    });
    const teePoints = [
      new THREE.Vector2(0.205 * hipScale, -0.05),
      new THREE.Vector2(0.202 * waistScale, 0.15),
      new THREE.Vector2(0.242 * chestScale, 0.44),
      new THREE.Vector2(0.26 * chestScale, 0.63),
      new THREE.Vector2(0.105, 0.73),
    ];
    const teeMesh = new THREE.Mesh(new THREE.LatheGeometry(teePoints, 48), teeMat);
    teeMesh.scale.set(1.19, 1.0, 0.79);
    mannequinGroup.add(teeMesh);

    // Part 5: Slot 1 — Structured Blazer Shell + Beveled Lapels
    const blazerGroup = new THREE.Group();
    const blazerMat = new THREE.MeshStandardMaterial({
      color: selectedSwatch.blazerHex,
      bumpMap: weaveTex,
      bumpScale: 0.006,
      roughness: selectedSwatch.roughness,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });

    const blazerPoints = [
      new THREE.Vector2(0.235 * hipScale, -0.18),
      new THREE.Vector2(0.222 * waistScale, 0.14),
      new THREE.Vector2(0.262 * chestScale, 0.44),
      new THREE.Vector2(0.282 * chestScale, 0.64),
      new THREE.Vector2(0.125, 0.74),
    ];
    const blazerShell = new THREE.Mesh(
      new THREE.LatheGeometry(blazerPoints, 48, 0.35, Math.PI * 2 - 0.7),
      blazerMat
    );
    blazerShell.rotation.y = Math.PI / 2;
    blazerShell.scale.set(0.82, 1.0, 1.22);
    blazerShell.castShadow = true;
    blazerGroup.add(blazerShell);

    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(0, 0);
    lapelShape.lineTo(0.085, 0.24);
    lapelShape.lineTo(0.035, 0.28);
    lapelShape.lineTo(0.065, 0.48);
    lapelShape.lineTo(0, 0.52);
    lapelShape.closePath();

    const lapelGeo = new THREE.ExtrudeGeometry(lapelShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 3,
    });

    const leftLapel = new THREE.Mesh(lapelGeo, blazerMat);
    leftLapel.position.set(-0.09, 0.18, 0.215 * chestScale);
    leftLapel.rotation.z = 0.14;
    blazerGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeo, blazerMat);
    rightLapel.scale.x = -1;
    rightLapel.position.set(0.09, 0.18, 0.215 * chestScale);
    rightLapel.rotation.z = -0.14;
    blazerGroup.add(rightLapel);

    // Part 6 & 7: Left & Right Articulated Sleeves (TubeGeometry)
    const buildSleeveMesh = (sign: 1 | -1) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sign * 0.31 * chestScale, 0.58, 0.0),
        new THREE.Vector3(sign * 0.36 * chestScale, 0.3, 0.03),
        new THREE.Vector3(sign * 0.35 * chestScale, -0.02, 0.06),
      ]);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.072, 18, false),
        blazerMat
      );
      mesh.castShadow = true;
      return mesh;
    };
    const leftSleeve = buildSleeveMesh(-1);
    const rightSleeve = buildSleeveMesh(1);
    blazerGroup.add(leftSleeve);
    blazerGroup.add(rightSleeve);
    mannequinGroup.add(blazerGroup);

    // Part 8: Slot 4 — 40mm Brushed Steel Chronograph on Left Wrist
    const watchGroup = new THREE.Group();
    watchGroup.position.set(-0.35 * chestScale, -0.01, 0.06);
    watchGroup.add(
      new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.015, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 })
      )
    );
    const wristCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.016, 24),
      brushedSteelMat
    );
    wristCase.position.set(-0.055, 0, 0.03);
    wristCase.rotation.z = Math.PI / 2;
    watchGroup.add(wristCase);
    mannequinGroup.add(watchGroup);

    // Part 9: Slot 3 — Tailored Pleated Trousers
    const trouserGroup = new THREE.Group();
    const trouserMat = new THREE.MeshStandardMaterial({
      color: selectedSwatch.trouserHex,
      bumpMap: weaveTex,
      bumpScale: 0.005,
      roughness: 0.68,
    });
    const leftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115 * hipScale, 0.088, 0.62, 24),
      trouserMat
    );
    leftLeg.position.set(-0.125 * hipScale, -0.44, 0);
    const rightLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115 * hipScale, 0.088, 0.62, 24),
      trouserMat
    );
    rightLeg.position.set(0.125 * hipScale, -0.44, 0);
    trouserGroup.add(leftLeg);
    trouserGroup.add(rightLeg);
    mannequinGroup.add(trouserGroup);

    // Part 10: Slot 5 — Goodyear-Welted Loafers on Pedestal
    const shoeGroup = new THREE.Group();
    const loaferMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c18,
      roughness: 0.48,
      metalness: 0.1,
    });
    for (const sign of [-1, 1]) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), loaferMat);
      shoe.position.set(sign * 0.125 * hipScale, -0.76, 0.04);
      shoeGroup.add(shoe);
    }
    mannequinGroup.add(shoeGroup);

    // Waist Caliper Tension Ring (Pass 1 = red strain, Pass 2 = amber, Pass 3 = emerald)
    const caliperMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const caliperRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.285 * waistScale, 0.006, 12, 64),
      caliperMat
    );
    caliperRing.rotation.x = Math.PI / 2;
    caliperRing.position.y = 0.16;
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
    // SECTION 7: ARTICULATED 3D HUMAN WALKING & SELECTING CLOTHING FROM THE LINE
    // ========================================================================
    let walkerState: HumanWalkerState = createInitialHumanWalkerState(1);
    // Advance initial pose slightly so first paint shows human mid-stride approaching the line
    walkerState = stepHumanWalkerState(walkerState, 0.08);
    walkerState = stepHumanWalkerState(walkerState, 0.08);

    const humanRootGroup = new THREE.Group();
    humanRootGroup.position.set(walkerState.x, -0.9, walkerState.z);
    humanRootGroup.rotation.y = walkerState.yaw;
    scene.add(humanRootGroup);
    clickableGroups.push({ group: humanRootGroup, sectionId: 'human' });

    // Soft radial contact shadow disc under the walking 3D human
    const humanShadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 24),
      new THREE.MeshBasicMaterial({
        color: 0x05070b,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      })
    );
    humanShadowDisc.rotation.x = -Math.PI / 2;
    humanShadowDisc.position.y = 0.015;
    humanRootGroup.add(humanShadowDisc);

    // Subtle selection target ring on the floor beneath the human
    const humanTargetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      })
    );
    humanTargetRing.rotation.x = -Math.PI / 2;
    humanTargetRing.position.y = 0.018;
    humanRootGroup.add(humanTargetRing);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdab496,
      roughness: 0.58,
      metalness: 0.04,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1e1815,
      roughness: 0.72,
    });
    const humanTrouserMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      bumpMap: weaveTex,
      bumpScale: 0.004,
      roughness: 0.68,
    });
    const initialEquipped = WARDROBE_LINE_ITEMS[walkerState.equippedItemIndex];
    const humanJacketMat = new THREE.MeshStandardMaterial({
      color: initialEquipped.garmentColorHex,
      bumpMap: weaveTex,
      bumpScale: 0.005,
      roughness: initialEquipped.garmentRoughness,
    });
    const humanShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
    });
    const humanShoeMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.42,
      metalness: 0.12,
    });

    // Pelvis Root at y = 0.86m above closet floor
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.86, 0);
    humanRootGroup.add(pelvisGroup);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.145, 0.14, 20),
      humanTrouserMat
    );
    pelvisGroup.add(pelvisMesh);

    // Left & Right Articulated Legs (Hip Pivot -> Thigh -> Knee Pivot -> Calf -> Loafer)
    const buildLegHierarchy = (sideSign: -1 | 1) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(sideSign * 0.095, -0.04, 0);

      const thighMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.058, 0.4, 16),
        humanTrouserMat
      );
      thighMesh.position.set(0, -0.2, 0);
      thighMesh.castShadow = !isSoftwareGl;
      hipPivot.add(thighMesh);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.4, 0);
      hipPivot.add(kneePivot);

      const calfMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.044, 0.38, 16),
        humanTrouserMat
      );
      calfMesh.position.set(0, -0.19, 0);
      calfMesh.castShadow = !isSoftwareGl;
      kneePivot.add(calfMesh);

      const footGroup = new THREE.Group();
      footGroup.position.set(0, -0.39, 0.035);
      const shoeBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.088, 0.055, 0.21),
        humanShoeMat
      );
      footGroup.add(shoeBase);
      kneePivot.add(footGroup);

      pelvisGroup.add(hipPivot);
      return { hipPivot, kneePivot };
    };

    const leftLegRig = buildLegHierarchy(-1);
    const rightLegRig = buildLegHierarchy(1);

    // Articulated Torso Pivot
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.06, 0);
    pelvisGroup.add(torsoPivot);

    // Tailored Jacket Torso + Inner Supima Crewneck + Lapels
    const torsoJacketMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.155, 0.52, 24),
      humanJacketMat
    );
    torsoJacketMesh.scale.set(1.06, 1.0, 0.72);
    torsoJacketMesh.position.set(0, 0.26, 0);
    torsoJacketMesh.castShadow = !isSoftwareGl;
    torsoPivot.add(torsoJacketMesh);

    const innerShirtV = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.11, 0.53, 16),
      humanShirtMat
    );
    innerShirtV.scale.set(0.65, 1.0, 0.76);
    innerShirtV.position.set(0, 0.265, 0.012);
    torsoPivot.add(innerShirtV);

    // Left & Right Jacket Lapels on the 3D Human
    for (const lSign of [-1, 1] as const) {
      const lapelStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.34, 0.025),
        humanJacketMat
      );
      lapelStrip.position.set(lSign * 0.065, 0.32, 0.13);
      lapelStrip.rotation.z = -lSign * 0.16;
      torsoPivot.add(lapelStrip);
    }

    // Articulated Head & Styled Hair
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.55, 0);
    torsoPivot.add(headPivot);

    const neckCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.06, 0.09, 16),
      skinMat
    );
    neckCyl.position.set(0, 0.03, 0);
    headPivot.add(neckCyl);

    const headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 24, 24),
      skinMat
    );
    headSphere.scale.set(0.92, 1.08, 0.96);
    headSphere.position.set(0, 0.14, 0);
    headSphere.castShadow = !isSoftwareGl;
    headPivot.add(headSphere);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.109, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairCap.scale.set(0.95, 1.09, 1.0);
    hairCap.position.set(0, 0.148, -0.014);
    hairCap.rotation.x = 0.28;
    headPivot.add(hairCap);

    // Sculpted Sunglasses / Brow Frame on the Front (+Z) Face
    const glassesBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.135, 0.026, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.8 })
    );
    glassesBridge.position.set(0, 0.155, 0.095);
    headPivot.add(glassesBridge);

    // Articulated Left & Right Arms (Shoulder Pivot -> Upper Sleeve -> Elbow Pivot -> Forearm -> Hand)
    const buildArmHierarchy = (sideSign: -1 | 1) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(sideSign * 0.215, 0.47, 0);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.054, 0.046, 0.28, 16),
        humanJacketMat
      );
      upperArm.position.set(0, -0.13, 0);
      upperArm.castShadow = !isSoftwareGl;
      shoulderPivot.add(upperArm);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.27, 0);
      shoulderPivot.add(elbowPivot);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.036, 0.26, 16),
        humanJacketMat
      );
      forearm.position.set(0, -0.12, 0);
      forearm.castShadow = !isSoftwareGl;
      elbowPivot.add(forearm);

      if (sideSign === -1) {
        // Left wrist chronograph watch
        const wristWatch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.041, 0.041, 0.022, 16),
          brushedBrassMat
        );
        wristWatch.position.set(0, -0.22, 0);
        elbowPivot.add(wristWatch);
      }

      const handSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 14, 14),
        skinMat
      );
      handSphere.scale.set(0.85, 1.15, 0.65);
      handSphere.position.set(0, -0.27, 0);
      elbowPivot.add(handSphere);

      torsoPivot.add(shoulderPivot);
      return { shoulderPivot, elbowPivot, handSphere };
    };

    const leftArmRig = buildArmHierarchy(-1);
    const rightArmRig = buildArmHierarchy(1);

    // Held Garment Hanger attached to the human's right hand when pulling a garment off the line
    const heldGarmentGroup = new THREE.Group();
    heldGarmentGroup.position.set(0, -0.31, 0.06);
    heldGarmentGroup.visible = false;
    const heldHangerBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.025, 0.035),
      darkWalnutTrimMat
    );
    heldGarmentGroup.add(heldHangerBar);
    const heldGarmentMat = new THREE.MeshStandardMaterial({
      color: WARDROBE_LINE_ITEMS[1].garmentColorHex,
      bumpMap: weaveTex,
      bumpScale: 0.004,
      roughness: 0.65,
    });
    const heldGarmentFold = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.52, 0.08),
      heldGarmentMat
    );
    heldGarmentFold.position.set(0, -0.26, 0);
    heldGarmentGroup.add(heldGarmentFold);
    rightArmRig.elbowPivot.add(heldGarmentGroup);

    // Apply pose helper for the 3D human character and the wardrobe line hangers
    let lastSyncedEquippedIdx = walkerState.equippedItemIndex;
    let lastUiSyncTime = 0;

    const applyHumanPoseToMeshes = (state: HumanWalkerState, nowMs: number) => {
      const pose = computeHumanJointPose(state);
      humanRootGroup.position.set(state.x, -0.9, state.z);
      humanRootGroup.rotation.y = state.yaw;

      pelvisGroup.position.y = 0.86 + pose.pelvisBobY;
      torsoPivot.rotation.x = pose.torsoPitch;
      torsoPivot.rotation.y = pose.torsoTwistY;
      headPivot.rotation.y = pose.headYaw;
      headPivot.rotation.x = pose.headPitch;

      leftLegRig.hipPivot.rotation.x = pose.leftHipPitch;
      leftLegRig.kneePivot.rotation.x = pose.leftKneePitch;
      rightLegRig.hipPivot.rotation.x = pose.rightHipPitch;
      rightLegRig.kneePivot.rotation.x = pose.rightKneePitch;

      leftArmRig.shoulderPivot.rotation.x = pose.leftShoulderPitch;
      leftArmRig.elbowPivot.rotation.x = pose.leftElbowPitch;

      rightArmRig.shoulderPivot.rotation.x = pose.rightShoulderPitch;
      rightArmRig.shoulderPivot.rotation.z = pose.rightShoulderRoll;
      rightArmRig.elbowPivot.rotation.x = pose.rightElbowPitch;

      // Animate the targeted hanger on the brass clothing line being pulled forward by the human
      const targetItem = WARDROBE_LINE_ITEMS[state.targetItemIndex];
      coatUnitGroups.forEach((coatGrp, idx) => {
        if (idx === state.targetItemIndex && state.activeHangerPull > 0.01) {
          coatGrp.position.z = 0.05 + state.activeHangerPull * 0.24;
          coatGrp.rotation.x = -state.activeHangerPull * 0.18;
        } else {
          coatGrp.position.z = 0.05;
          coatGrp.rotation.x = 0;
        }
      });

      // Show held garment in the human's hand during equipping transition
      if (state.phase === 'equipping_garment' && targetItem) {
        heldGarmentGroup.visible = true;
        heldGarmentMat.color.setHex(targetItem.garmentColorHex);
      } else {
        heldGarmentGroup.visible = false;
      }

      // Update human's worn jacket & central mannequin when a new garment is equipped from the line
      if (state.equippedItemIndex !== lastSyncedEquippedIdx) {
        lastSyncedEquippedIdx = state.equippedItemIndex;
        const equippedItem = WARDROBE_LINE_ITEMS[state.equippedItemIndex];
        if (equippedItem) {
          humanJacketMat.color.setHex(equippedItem.garmentColorHex);
          humanJacketMat.roughness = equippedItem.garmentRoughness;
          blazerMat.color.setHex(equippedItem.garmentColorHex);
          blazerMat.roughness = equippedItem.garmentRoughness;
        }
      }

      // Throttle React HUD state updates to <= 5Hz so we never trigger 60Hz re-renders
      if (nowMs - lastUiSyncTime > 220) {
        lastUiSyncTime = nowMs;
        setHumanTargetIndex(state.targetItemIndex);
        setHumanEquippedIndex(state.equippedItemIndex);
        setHumanPhase(state.phase);
      }
    };

    applyHumanPoseToMeshes(walkerState, 0);

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
          walkerState = commandHumanSelectLineItem(
            walkerState,
            lineHit.itemIndex,
            walkerState.autoCycleEnabled
          );
          setHumanTargetIndex(lineHit.itemIndex);
          setHumanPhase('walking_to_rack');
          applyHumanPoseToMeshes(walkerState, performance.now());
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
            camera.position.set(...bay.camPos);
            controls.target.set(...bay.lookAt);
            controls.update();
            sceneRefs.current.highlightBay?.(bay.id);
          }
          break;
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handlePointerDown);
    renderer.domElement.addEventListener('mouseup', handlePointerUp);

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

      walkerState = stepHumanWalkerState(walkerState, dt);
      applyHumanPoseToMeshes(walkerState, now);

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

    sceneRefs.current.commandHumanSelect = (itemIdx: number, keepAuto = true) => {
      walkerState = commandHumanSelectLineItem(walkerState, itemIdx, keepAuto);
      setHumanTargetIndex(walkerState.targetItemIndex);
      setHumanPhase(walkerState.phase);
      setHumanAutoWalk(keepAuto);
      applyHumanPoseToMeshes(walkerState, performance.now());
      drawFrame();
    };

    sceneRefs.current.setHumanAutoCycle = (auto: boolean) => {
      walkerState = { ...walkerState, autoCycleEnabled: auto };
      setHumanAutoWalk(auto);
    };

    sceneRefs.current.updateMaterials = (swatch: FabricSwatch) => {
      blazerMat.color.setHex(swatch.blazerHex);
      blazerMat.roughness = swatch.roughness;
      trouserMat.color.setHex(swatch.trouserHex);
      teeMat.color.setHex(swatch.teeHex);
      humanJacketMat.color.setHex(swatch.blazerHex);
      humanJacketMat.roughness = swatch.roughness;
      drawFrame();
    };

    sceneRefs.current.updatePassGeometry = (passIdx: number, explode: number) => {
      const squeeze = passIdx === 0 ? 0.94 : passIdx === 1 ? 0.98 : 1.02;
      blazerGroup.scale.set(squeeze, 1.0, squeeze);
      caliperMat.color.setHex(passIdx === 0 ? 0xf43f5e : passIdx === 1 ? 0xf59e0b : 0x10b981);

      blazerGroup.position.z = explode * 0.28;
      teeMesh.position.z = -explode * 0.14;
      trouserGroup.position.y = -explode * 0.18;
      watchGroup.position.x = -0.35 * chestScale - explode * 0.25;
      shoeGroup.position.y = -explode * 0.3;

      drawFrame();
    };

    sceneRefs.current.setCameraTarget = (pos, lookAt) => {
      camera.position.set(...pos);
      controls.target.set(...lookAt);
      controls.update();
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
      } else if (key >= '1' && key <= '5') {
        const idx = Number(key) - 1;
        sceneRefs.current.commandHumanSelect?.(idx, walkerState.autoCycleEnabled);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isDisposed = true;
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      renderer.domElement.removeEventListener('mouseup', handlePointerUp);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      weaveTex.dispose();
      parquetTex.dispose();
      dialTex.dispose();
      renderer.dispose();
    };
  }, [measurements.chest, measurements.waist, measurements.hip]);

  useEffect(() => {
    sceneRefs.current.updateMaterials?.(selectedSwatch);
  }, [selectedSwatch]);

  useEffect(() => {
    sceneRefs.current.updatePassGeometry?.(effectivePassIndex, explodeFactor);
  }, [effectivePassIndex, explodeFactor]);

  const handleSelectClosetBay = (bay: ClosetBayMeta) => {
    setActiveSection(bay.id);
    sceneRefs.current.setCameraTarget?.(bay.camPos, bay.lookAt);
    sceneRefs.current.highlightBay?.(bay.id);
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
      className={
        isFullBleed
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#0d111a]'
          : 'relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0d111a]'
      }
    >
      {/* Full-Canvas 3D Walk-In Closet WebGL Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Brand & Active Closet Bay Pill */}
      <div
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.9)' }}
        className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-slate-200 flex flex-wrap items-center gap-2.5"
      >
        <span className="font-bold text-amber-300 tracking-wide uppercase text-[10px] flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>3D Walk-In Closet &amp; Atelier</span>
        </span>
        <span className="text-slate-600" aria-hidden="true">·</span>
        <span className="font-semibold text-white">{currentBayMeta.zoneTitle}</span>
        <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
        <span className="font-mono text-[11px] text-emerald-400 hidden sm:inline">
          {heightCm}cm · {measurements.chest}/{measurements.waist}/{measurements.hip}cm · Size {effectiveTrueSize}
        </span>
        <button
          type="button"
          onClick={() => setIsFullBleed((prev) => !prev)}
          className="ml-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 border border-slate-600/70 cursor-pointer"
          title="Toggle 100vw x 100vh full-bleed 3D Walk-In Closet Room"
        >
          {isFullBleed ? (
            <>
              <Minimize2 className="w-3 h-3" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3 h-3" />
              <span>Full-Bleed 100vw×100vh</span>
            </>
          )}
        </button>
      </div>

      {/* Top-Right Dedicated Section Inspector Drawer (Click any item to Try in 360° Studio) */}
      {(onTryOnClosetItem || onTryOnShopProduct || onTryOnOutfitSlot) && (
        <div
          style={{ backgroundColor: 'rgba(13, 17, 26, 0.92)' }}
          className="absolute top-14 right-3 z-10 w-68 rounded-xl border border-slate-700/80 p-3 text-slate-200 space-y-2 hidden md:block"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              {currentBayMeta.label} Inventory
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Click to Fit in 360°</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
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

      {/* Unified Bottom Control Dock (<= 15% viewport height, solid rgba surface, collapsible with H) */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-5xl">
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setIsDockCollapsed((prev) => !prev)}
              style={{ backgroundColor: 'rgba(13, 17, 26, 0.92)' }}
              className="px-3 py-1 rounded-full border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              title="Toggle 3D Walk-In Closet Controls (Shortcut: H)"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span>
                {isDockCollapsed
                  ? 'Show 3D Closet Bays & Controls (H)'
                  : 'Hide Controls · Zen Mode (H)'}
              </span>
            </button>
          </div>

          {!isDockCollapsed && (
            <div
              style={{ backgroundColor: 'rgba(13, 17, 26, 0.94)' }}
              className="rounded-2xl border border-slate-700/90 px-4 py-2.5 text-xs text-slate-200 flex flex-col gap-2"
            >
              {/* Row 1: Dedicated Walk-In Closet Section Camera Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1 mr-1">
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>Closet Bays:</span>
                  </span>
                  {CLOSET_BAYS.map((bay) => {
                    const isActive = activeSection === bay.id;
                    return (
                      <button
                        key={bay.id}
                        type="button"
                        onClick={() => handleSelectClosetBay(bay)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
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

                {/* Fabric Swatch Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Tailoring Swatch:</span>
                  </span>
                  {FABRIC_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => setSelectedSwatch(sw)}
                      title={sw.name}
                      className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
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
              </div>

              {/* Row 2: 3D Human Walking & Selecting Clothing from the Line */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/90">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1 mr-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>3D Human Select from Line:</span>
                  </span>
                  {WARDROBE_LINE_ITEMS.map((item, idx) => {
                    const isTarget = humanTargetIndex === idx;
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
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isTarget
                            ? 'bg-emerald-600 text-white'
                            : isEquipped
                              ? 'bg-slate-800 text-emerald-300 border border-emerald-500/50'
                              : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={`Command 3D human to walk & select ${item.label} from the brass clothing line`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                          style={{
                            backgroundColor: `#${item.garmentColorHex.toString(16).padStart(6, '0')}`,
                          }}
                        />
                        <span>{shortTitle}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {humanPhase === 'walking_to_rack'
                      ? `Walking to Hanger #${humanTargetIndex + 1}`
                      : humanPhase === 'reaching_garment'
                        ? `Reaching Hanger #${humanTargetIndex + 1} on Line`
                        : humanPhase === 'equipping_garment'
                          ? `Putting on ${WARDROBE_LINE_ITEMS[humanTargetIndex]?.brand || 'Garment'}`
                          : humanPhase === 'walking_to_mirror'
                            ? 'Walking to Atelier Mirror'
                            : 'Inspecting Fit at Mirror'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const nextAuto = !humanAutoWalk;
                      sceneRefs.current.setHumanAutoCycle?.(nextAuto);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer ${
                      humanAutoWalk
                        ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="Toggle automatic 3D human walking & browsing along the clothing line"
                  >
                    {humanAutoWalk ? (
                      <>
                        <Pause className="w-2.5 h-2.5" />
                        <span>Auto-Walk ON</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5" />
                        <span>Auto-Walk PAUSED</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 3: Render-Watch-Critique-Fix Loop Pass + 5-Piece Explode Slider */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-slate-800/90">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-indigo-400" />
                    <span>3D Loop Pass:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {[0, 1, 2].map((idx) => {
                      const passObj = effectiveIterations?.[idx];
                      const active = effectivePassIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onSelectPassIndex?.(idx);
                            onSelectPass?.(idx + 1);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Pass {idx + 1} ({passObj ? passObj.overallScore : idx === 0 ? 73.4 : idx === 1 ? 89.2 : 97.4})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-400" />
                    <span>5-Piece Explode:</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={explodeFactor}
                    onChange={(e) => setExplodeFactor(Number(e.target.value))}
                    aria-label="Explode 5-piece outfit layers"
                    className="w-24 accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-300 w-8">
                    {Math.round(explodeFactor * 100)}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate max-w-xs hidden lg:block">
                  <span className="text-slate-500">Wearing from Line:</span>{' '}
                  <span className="text-emerald-300 font-semibold">
                    {WARDROBE_LINE_ITEMS[humanEquippedIndex]?.label || activeOutfit?.title}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
