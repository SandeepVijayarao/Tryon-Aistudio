import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  Camera,
  Palette,
} from 'lucide-react';
import { BodyMeasurements } from '../types/tryon.ts';
import { RenderCritiqueIteration } from '../utils/multiAgentOrchestrator.ts';

// Pre-allocated scratch math objects at module scope (zero GC inside animation/damping ticks)
const _camTargetPos = new THREE.Vector3(0, 1.55, 3.65);
const _camTargetLook = new THREE.Vector3(0, 1.22, 0);
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyColor = new THREE.Color();

export interface FabricSwatchOption {
  id: string;
  label: string;
  blazerHex: number;
  teeHex: number;
  trouserHex: number;
  swatchCss: string;
}

export const FABRIC_SWATCHES: FabricSwatchOption[] = [
  {
    id: 'sand-marl',
    label: 'Sand Marl (Ref. 4456/999)',
    blazerHex: 0xd6cbb9,
    teeHex: 0xf8fafc,
    trouserHex: 0x27303f,
    swatchCss: '#d6cbb9',
  },
  {
    id: 'navy-hopsack',
    label: 'Midnight Hopsack',
    blazerHex: 0x1e293b,
    teeHex: 0xf1f5f9,
    trouserHex: 0xcbd5e1,
    swatchCss: '#1e293b',
  },
  {
    id: 'olive-twill',
    label: 'Bay Laurel Twill',
    blazerHex: 0x5c6446,
    teeHex: 0xfefce8,
    trouserHex: 0x1f2937,
    swatchCss: '#5c6446',
  },
  {
    id: 'charcoal-merino',
    label: 'Anthracite Merino',
    blazerHex: 0x374151,
    teeHex: 0xe2e8f0,
    trouserHex: 0x111827,
    swatchCss: '#374151',
  },
];

interface CameraPreset {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'front-0', label: '0° Front', pos: [0, 1.48, 3.55], look: [0, 1.18, 0] },
  { id: 'oblique-45', label: '45° Lapel', pos: [2.45, 1.55, 2.45], look: [0, 1.22, 0] },
  { id: 'sagittal-90', label: '90° Sleeve', pos: [3.45, 1.48, 0.05], look: [0, 1.2, 0] },
  { id: 'rear-180', label: '180° Vents', pos: [0, 1.5, -3.55], look: [0, 1.18, 0] },
  { id: 'top-caliper', label: 'Caliper Orbit', pos: [1.9, 2.85, 2.3], look: [0, 1.1, 0] },
];

interface ThreeGarmentWorldSceneProps {
  measurements: BodyMeasurements;
  heightCm: number;
  recommendedSize: string;
  activePass: RenderCritiqueIteration;
  allPasses: RenderCritiqueIteration[];
  onSelectPass: (passNumber: number) => void;
}

/**
 * Generates a procedural textile cross-weave bump/roughness CanvasTexture (zero external URLs).
 */
function createProceduralWeaveTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#969696' : '#6b6b6b';
      ctx.fillRect(0, y, 256, 2);
    }
    for (let x = 0; x < 256; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, 0, 2, 256);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a razor-sharp 360° turntable degree chapter-ring dial texture in SRGBColorSpace.
 */
function createTurntableDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 232, 0, Math.PI * 2);
    ctx.stroke();

    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 45 === 0;
      const innerR = isMajor ? 204 : 220;
      const outerR = 232;
      ctx.strokeStyle = isMajor ? 'rgba(52, 211, 153, 0.9)' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
      ctx.lineTo(cx + Math.cos(rad) * outerR, cy + Math.sin(rad) * outerR);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft radial contact shadow texture so the pedestal & mannequin sit grounded on the studio floor.
 */
function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ThreeGarmentWorldScene: React.FC<ThreeGarmentWorldSceneProps> = ({
  measurements,
  heightCm,
  recommendedSize,
  activePass,
  allPasses,
  onSelectPass,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [explodedRatio, setExplodedRatio] = useState<number>(0);
  const [selectedSwatchId, setSelectedSwatchId] = useState<string>(FABRIC_SWATCHES[0].id);
  const [selectedCamPresetId, setSelectedCamPresetId] = useState<string>(CAMERA_PRESETS[0].id);

  // Store mutable targets in refs so React UI updates never recreate the WebGL scene
  const explodedTargetRef = useRef<number>(0);
  const passParamsRef = useRef(activePass.meshParameters);
  const cameraTransitionActiveRef = useRef<boolean>(false);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const materialsRef = useRef<{
    blazer?: THREE.MeshPhysicalMaterial;
    tee?: THREE.MeshStandardMaterial;
    trouser?: THREE.MeshStandardMaterial;
    ventAlert?: THREE.MeshStandardMaterial;
  }>({});

  // Keyboard shortcut 'H' to collapse/expand bottom HUD dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  // Sync activePass mesh parameters into ref and trigger coalesced render
  useEffect(() => {
    passParamsRef.current = activePass.meshParameters;
    if (materialsRef.current.ventAlert) {
      // Highlight tension in amber during Pass 1, emerald in Pass 3
      materialsRef.current.ventAlert.emissive.setHex(
        activePass.iteration === 1 ? 0xd97706 : activePass.iteration === 2 ? 0x4f46e5 : 0x059669
      );
    }
    requestRenderRef.current?.();
  }, [activePass]);

  // Sync exploded ratio slider into ref
  const handleExplodedChange = (val: number) => {
    setExplodedRatio(val);
    explodedTargetRef.current = val;
    requestRenderRef.current?.();
  };

  // Sync fabric swatch selection into PBR materials
  const handleSelectSwatch = (swatch: FabricSwatchOption) => {
    setSelectedSwatchId(swatch.id);
    if (materialsRef.current.blazer) {
      materialsRef.current.blazer.color.setHex(swatch.blazerHex);
    }
    if (materialsRef.current.tee) {
      materialsRef.current.tee.color.setHex(swatch.teeHex);
    }
    if (materialsRef.current.trouser) {
      materialsRef.current.trouser.color.setHex(swatch.trouserHex);
    }
    requestRenderRef.current?.();
  };

  // Trigger smooth damped camera transition
  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setSelectedCamPresetId(preset.id);
    _camTargetPos.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    _camTargetLook.set(preset.look[0], preset.look[1], preset.look[2]);
    cameraTransitionActiveRef.current = true;
    requestRenderRef.current?.();
  };

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Detect software WebGL (SwiftShader / llvmpipe / Basic Render) from renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(320, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonHex = 0x0b0f19;
    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.065);

    // 2. Mandatory RoomEnvironment + PMREMGenerator studio reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 1.48, 3.55);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.18, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.7;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    // 3. Balanced 3-Point Studio Lighting Rig (Warm Key + Cool Hemisphere Fill + Rim)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(3.2, 4.8, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 2.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.35);
    rimLight.position.set(-3.0, 3.4, -3.2);
    scene.add(rimLight);

    // 4. Procedural Textures (Zero external URLs)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const weaveTex = createProceduralWeaveTexture(maxAniso);
    const dialTex = createTurntableDialTexture(maxAniso);
    const shadowTex = createRadialContactShadowTexture();

    // Ground Floor + Contact Shadow Grounding (offset Y to avoid Z-fighting)
    const floorGeo = new THREE.CircleGeometry(14, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.82,
      metalness: 0.12,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const contactShadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.position.y = 0.005;
    scene.add(contactShadowMesh);

    // ========================================================================
    // Composite 10-Part Procedural 3D Mannequin & 5-Piece Garment Assembly
    // Pivoted at bottom-center (y = 0) flush with the studio floor
    // ========================================================================
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Part 1: Stepped Turntable Pedestal (LatheGeometry) + Degree Chapter Ring
    const pedestalPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.08, 0),
      new THREE.Vector2(1.04, 0.06),
      new THREE.Vector2(0.92, 0.07),
      new THREE.Vector2(0.88, 0.14),
      new THREE.Vector2(0, 0.14),
    ];
    const pedestalGeo = new THREE.LatheGeometry(pedestalPoints, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;
    rootGroup.add(pedestalMesh);

    const dialPlaneGeo = new THREE.PlaneGeometry(2.15, 2.15);
    dialPlaneGeo.rotateX(-Math.PI / 2);
    const dialPlaneMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const dialPlaneMesh = new THREE.Mesh(dialPlaneGeo, dialPlaneMat);
    dialPlaneMesh.position.y = 0.143;
    rootGroup.add(dialPlaneMesh);

    // Anthropometric scaling factors derived from calibrated shopper measurements
    const chestRadius = Math.max(0.2, Math.min(0.28, (measurements.chest / (2 * Math.PI)) * 0.0145));
    const waistRadius = Math.max(0.18, Math.min(0.26, (measurements.waist / (2 * Math.PI)) * 0.0145));
    const hipRadius = Math.max(0.19, Math.min(0.27, (measurements.hip / (2 * Math.PI)) * 0.0145));

    // Part 2: Sculpted Anthropometric Torso Mannequin Core + Brushed Brass Neck Finial
    const mannequinGroup = new THREE.Group();
    rootGroup.add(mannequinGroup);

    const standPoleGeo = new THREE.CylinderGeometry(0.028, 0.036, 0.95, 24);
    const brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.6,
    });
    const standPole = new THREE.Mesh(standPoleGeo, brassMat);
    standPole.position.y = 0.14 + 0.475;
    mannequinGroup.add(standPole);

    const torsoProfilePoints = [
      new THREE.Vector2(0, 0.92),
      new THREE.Vector2(hipRadius * 0.92, 0.95),
      new THREE.Vector2(waistRadius * 0.9, 1.18),
      new THREE.Vector2(chestRadius * 0.94, 1.44),
      new THREE.Vector2(0.08, 1.62),
      new THREE.Vector2(0.065, 1.72),
      new THREE.Vector2(0, 1.74),
    ];
    const torsoCoreGeo = new THREE.LatheGeometry(torsoProfilePoints, 48);
    const mannequinCoreMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.62,
      metalness: 0.15,
    });
    const torsoCoreMesh = new THREE.Mesh(torsoCoreGeo, mannequinCoreMat);
    torsoCoreMesh.castShadow = true;
    mannequinGroup.add(torsoCoreMesh);

    const finialSphere = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 24), brassMat);
    finialSphere.position.y = 1.77;
    mannequinGroup.add(finialSphere);

    // Part 3: Slot [2] Layering Crewneck Supima Tee Group
    const layeringTeeGroup = new THREE.Group();
    rootGroup.add(layeringTeeGroup);

    const teePoints = [
      new THREE.Vector2(hipRadius * 0.97, 0.98),
      new THREE.Vector2(waistRadius * 0.96, 1.18),
      new THREE.Vector2(chestRadius * 0.99, 1.45),
      new THREE.Vector2(0.088, 1.61),
    ];
    const teeGeo = new THREE.LatheGeometry(teePoints, 48);
    const teeMat = new THREE.MeshStandardMaterial({
      color: FABRIC_SWATCHES[0].teeHex,
      roughness: 0.78,
      metalness: 0.04,
      bumpMap: weaveTex,
      bumpScale: 0.003,
      side: THREE.DoubleSide,
    });
    materialsRef.current.tee = teeMat;
    const teeMesh = new THREE.Mesh(teeGeo, teeMat);
    layeringTeeGroup.add(teeMesh);

    const collarRibGeo = new THREE.TorusGeometry(0.088, 0.012, 16, 36);
    collarRibGeo.rotateX(Math.PI / 2);
    const collarRibMesh = new THREE.Mesh(collarRibGeo, teeMat);
    collarRibMesh.position.y = 1.61;
    layeringTeeGroup.add(collarRibMesh);

    // Part 4, 5, 6, 7, 8: Slot [1] Structured Suit Blazer Group (Shell + Beveled Lapels + Sleeves + Vents + Buttons)
    const blazerGroup = new THREE.Group();
    rootGroup.add(blazerGroup);

    const blazerMat = new THREE.MeshPhysicalMaterial({
      color: FABRIC_SWATCHES[0].blazerHex,
      roughness: 0.52,
      metalness: 0.08,
      sheen: 0.65,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color(0xfef3c7),
      bumpMap: weaveTex,
      bumpScale: 0.008,
      side: THREE.DoubleSide,
    });
    materialsRef.current.blazer = blazerMat;

    // Open-front tailored jacket shell (phiLength < 2*PI so front V-opening reveals the layering tee)
    const blazerPoints = [
      new THREE.Vector2(hipRadius * 1.09, 0.88),
      new THREE.Vector2(waistRadius * 1.06, 1.18),
      new THREE.Vector2(chestRadius * 1.09, 1.46),
      new THREE.Vector2(0.11, 1.62),
    ];
    const blazerShellGeo = new THREE.LatheGeometry(
      blazerPoints,
      48,
      0.32,
      Math.PI * 2 - 0.64
    );
    // Rotate so the open V-gap faces +Z (0° Front Anterior)
    blazerShellGeo.rotateY(Math.PI / 2);
    const blazerShellMesh = new THREE.Mesh(blazerShellGeo, blazerMat);
    blazerShellMesh.castShadow = true;
    blazerShellMesh.receiveShadow = true;
    blazerGroup.add(blazerShellMesh);

    // Part 5: Left & Right Beveled Notched Lapels (ExtrudeGeometry)
    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(0, 0);
    lapelShape.lineTo(0.075, 0.18);
    lapelShape.lineTo(0.042, 0.22);
    lapelShape.lineTo(0.068, 0.36);
    lapelShape.lineTo(0.015, 0.42);
    lapelShape.lineTo(0, 0);

    const lapelGeo = new THREE.ExtrudeGeometry(lapelShape, {
      steps: 1,
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    });

    const leftLapelMesh = new THREE.Mesh(lapelGeo, blazerMat);
    leftLapelMesh.position.set(-0.045, 1.18, chestRadius * 1.07);
    leftLapelMesh.rotation.y = 0.22;
    blazerGroup.add(leftLapelMesh);

    const rightLapelMesh = new THREE.Mesh(lapelGeo, blazerMat);
    rightLapelMesh.scale.x = -1;
    rightLapelMesh.position.set(0.045, 1.18, chestRadius * 1.07);
    rightLapelMesh.rotation.y = -0.22;
    blazerGroup.add(rightLapelMesh);

    // Part 6: Articulated Left & Right Tailored Sleeves (TubeGeometry)
    const leftArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-chestRadius * 1.05, 1.52, 0),
      new THREE.Vector3(-chestRadius * 1.38, 1.26, 0.04),
      new THREE.Vector3(-chestRadius * 1.42, 0.94, 0.09),
    ]);
    const rightArmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(chestRadius * 1.05, 1.52, 0),
      new THREE.Vector3(chestRadius * 1.38, 1.26, 0.04),
      new THREE.Vector3(chestRadius * 1.42, 0.94, 0.09),
    ]);
    const leftSleeveGeo = new THREE.TubeGeometry(leftArmCurve, 28, 0.068, 18, false);
    const rightSleeveGeo = new THREE.TubeGeometry(rightArmCurve, 28, 0.068, 18, false);
    const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, blazerMat);
    const rightSleeveMesh = new THREE.Mesh(rightSleeveGeo, blazerMat);
    leftSleeveMesh.castShadow = true;
    rightSleeveMesh.castShadow = true;
    blazerGroup.add(leftSleeveMesh, rightSleeveMesh);

    // Part 7: Two Horn Fastener Buttons & Silk Pocket Square
    const hornButtonMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.25,
      metalness: 0.2,
    });
    const buttonGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.008, 20);
    buttonGeo.rotateX(Math.PI / 2);
    const topButton = new THREE.Mesh(buttonGeo, hornButtonMat);
    topButton.position.set(0, 1.18, waistRadius * 1.08);
    const bottomButton = new THREE.Mesh(buttonGeo, hornButtonMat);
    bottomButton.position.set(0, 1.06, waistRadius * 1.08);
    blazerGroup.add(topButton, bottomButton);

    const pocketWeltGeo = new THREE.BoxGeometry(0.085, 0.016, 0.012);
    const pocketWelt = new THREE.Mesh(pocketWeltGeo, hornButtonMat);
    pocketWelt.position.set(-0.11, 1.38, chestRadius * 1.06);
    blazerGroup.add(pocketWelt);

    // Part 8: Double Back-Vent Panels at 180° Rear + Pass Tension Status Ring
    const ventPanelGeo = new THREE.BoxGeometry(0.11, 0.24, 0.014);
    const leftVentPanel = new THREE.Mesh(ventPanelGeo, blazerMat);
    leftVentPanel.position.set(-0.09, 0.98, -hipRadius * 1.08);
    const rightVentPanel = new THREE.Mesh(ventPanelGeo, blazerMat);
    rightVentPanel.position.set(0.09, 0.98, -hipRadius * 1.08);
    blazerGroup.add(leftVentPanel, rightVentPanel);

    const waistCaliperRingGeo = new THREE.TorusGeometry(waistRadius * 1.12, 0.007, 12, 64);
    waistCaliperRingGeo.rotateX(Math.PI / 2);
    const waistCaliperMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: activePass.iteration === 1 ? 0xd97706 : 0x059669,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    materialsRef.current.ventAlert = waistCaliperMat;
    const waistCaliperRing = new THREE.Mesh(waistCaliperRingGeo, waistCaliperMat);
    waistCaliperRing.position.y = 1.18;
    blazerGroup.add(waistCaliperRing);

    // Part 9: Slot [3] Tapered Pleated Wool-Blend Trousers Group
    const trousersGroup = new THREE.Group();
    rootGroup.add(trousersGroup);

    const trouserMat = new THREE.MeshStandardMaterial({
      color: FABRIC_SWATCHES[0].trouserHex,
      roughness: 0.68,
      metalness: 0.08,
      bumpMap: weaveTex,
      bumpScale: 0.005,
    });
    materialsRef.current.trouser = trouserMat;

    const legPoints = [
      new THREE.Vector2(0.068, 0.22),
      new THREE.Vector2(0.082, 0.56),
      new THREE.Vector2(0.098, 0.92),
    ];
    const legGeo = new THREE.LatheGeometry(legPoints, 32);
    const leftLegMesh = new THREE.Mesh(legGeo, trouserMat);
    leftLegMesh.position.x = -0.105;
    leftLegMesh.castShadow = true;
    const rightLegMesh = new THREE.Mesh(legGeo, trouserMat);
    rightLegMesh.position.x = 0.105;
    rightLegMesh.castShadow = true;
    trousersGroup.add(leftLegMesh, rightLegMesh);

    // Part 10A: Slot [4] 40mm Brushed Steel Chronograph Watch Group on Left Wrist
    const watchGroup = new THREE.Group();
    rootGroup.add(watchGroup);

    const steelWatchMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.16,
      anisotropy: 0.8,
      clearcoat: 0.8,
    });
    const watchStrapGeo = new THREE.TorusGeometry(0.056, 0.012, 12, 28);
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.42,
      metalness: 0.1,
    });
    const watchStrap = new THREE.Mesh(watchStrapGeo, leatherMat);
    const watchCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.014, 24),
      steelWatchMat
    );
    watchCase.position.set(-0.055, 0, 0.015);
    watchCase.rotation.z = Math.PI / 2;
    watchGroup.position.set(-chestRadius * 1.42, 0.93, 0.09);
    watchGroup.add(watchStrap, watchCase);

    // Part 10B: Slot [5] Goodyear-Welted Espresso Loafers Group (Flush on Pedestal y=0.14)
    const shoesGroup = new THREE.Group();
    rootGroup.add(shoesGroup);

    const shoeShape = new THREE.Shape();
    shoeShape.moveTo(-0.048, -0.11);
    shoeShape.lineTo(0.048, -0.11);
    shoeShape.quadraticCurveTo(0.055, 0.08, 0.036, 0.14);
    shoeShape.quadraticCurveTo(0, 0.17, -0.036, 0.14);
    shoeShape.quadraticCurveTo(-0.055, 0.08, -0.048, -0.11);

    const shoeGeo = new THREE.ExtrudeGeometry(shoeShape, {
      steps: 1,
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
    });
    shoeGeo.rotateX(Math.PI / 2);

    const leftShoe = new THREE.Mesh(shoeGeo, leatherMat);
    leftShoe.position.set(-0.105, 0.21, 0.03);
    leftShoe.castShadow = true;
    const rightShoe = new THREE.Mesh(shoeGeo, leatherMat);
    rightShoe.position.set(0.105, 0.21, 0.03);
    rightShoe.castShadow = true;
    shoesGroup.add(leftShoe, rightShoe);

    // ========================================================================
    // InstancedMesh (>20 instances): 32 Radial Anthropometric Caliper Sensor Nodes
    // ========================================================================
    const sensorCount = 32;
    const sensorGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.09, 12);
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.8,
    });
    const sensorInstanced = new THREE.InstancedMesh(sensorGeo, sensorMat, sensorCount);
    for (let i = 0; i < sensorCount; i++) {
      const angle = (i / sensorCount) * Math.PI * 2;
      const radius = 1.02;
      _dummyPos.set(Math.cos(angle) * radius, 0.185, Math.sin(angle) * radius);
      _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      const scaleVar = 0.9 + (i % 4) * 0.06;
      _dummyScale.set(1, scaleVar, 1);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      sensorInstanced.setMatrixAt(i, _dummyMatrix);
      _dummyColor.setHex(i % 4 === 0 ? 0x34d399 : 0x818cf8);
      sensorInstanced.setColorAt(i, _dummyColor);
    }
    sensorInstanced.instanceMatrix.needsUpdate = true;
    if (sensorInstanced.instanceColor) sensorInstanced.instanceColor.needsUpdate = true;
    sensorInstanced.computeBoundingSphere();
    rootGroup.add(sensorInstanced);

    // Pre-warm shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ========================================================================
    // On-Demand Coalesced Render & Software-WebGL Fence Pacing
    // ========================================================================
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let currentExploded = 0;
    let currentLapelRoll = passParamsRef.current.lapelRollCurvature;
    let currentVentFlare = passParamsRef.current.backVentFlareDeg;
    let currentSleevePitch = passParamsRef.current.sleevePitchDeg;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const dt = Math.min(0.1, Math.max(0.016, clock.getDelta()));

        // Smoothly damp 5-piece exploded separation and Pass 1/2/3 cloth parameters
        const targetExploded = explodedTargetRef.current;
        const targetParams = passParamsRef.current;

        currentExploded = isSoftwareGl
          ? targetExploded
          : THREE.MathUtils.damp(currentExploded, targetExploded, 8, dt);
        currentLapelRoll = isSoftwareGl
          ? targetParams.lapelRollCurvature
          : THREE.MathUtils.damp(currentLapelRoll, targetParams.lapelRollCurvature, 8, dt);
        currentVentFlare = isSoftwareGl
          ? targetParams.backVentFlareDeg
          : THREE.MathUtils.damp(currentVentFlare, targetParams.backVentFlareDeg, 8, dt);
        currentSleevePitch = isSoftwareGl
          ? targetParams.sleevePitchDeg
          : THREE.MathUtils.damp(currentSleevePitch, targetParams.sleevePitchDeg, 8, dt);

        // Apply exploded-view spatial offsets across the 5 outfit slots
        blazerGroup.position.z = currentExploded * 0.34;
        blazerGroup.position.y = currentExploded * 0.14;
        layeringTeeGroup.position.y = currentExploded * 0.04;
        trousersGroup.position.y = -currentExploded * 0.08;
        watchGroup.position.set(
          -chestRadius * 1.42 - currentExploded * 0.28,
          0.93,
          0.09 + currentExploded * 0.18
        );
        shoesGroup.position.z = currentExploded * 0.22;

        // Apply Render -> Watch -> Critique -> Fix loop parameters to 3D garment parts
        const lapelAngle = 0.12 + (1 - currentLapelRoll) * 0.35;
        leftLapelMesh.rotation.y = lapelAngle;
        rightLapelMesh.rotation.y = -lapelAngle;

        const ventRad = (currentVentFlare * Math.PI) / 180;
        leftVentPanel.rotation.z = -ventRad;
        rightVentPanel.rotation.z = ventRad;

        const pitchRad = ((currentSleevePitch - 10) * Math.PI) / 180;
        leftSleeveMesh.rotation.x = pitchRad;
        rightSleeveMesh.rotation.x = pitchRad;

        // Smoothly damp camera preset transitions
        let camStillMoving = false;
        if (cameraTransitionActiveRef.current) {
          if (isSoftwareGl) {
            camera.position.copy(_camTargetPos);
            controls.target.copy(_camTargetLook);
            cameraTransitionActiveRef.current = false;
          } else {
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 7, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 7, dt);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, _camTargetLook.x, 7, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _camTargetLook.y, 7, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _camTargetLook.z, 7, dt);
            if (camera.position.distanceToSquared(_camTargetPos) < 0.0004) {
              cameraTransitionActiveRef.current = false;
            } else {
              camStillMoving = true;
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const transitionsActive =
          camStillMoving ||
          Math.abs(currentExploded - targetExploded) > 0.003 ||
          Math.abs(currentLapelRoll - targetParams.lapelRollCurvature) > 0.003;

        if (transitionsActive) {
          renderDirty = true;
        }

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    const onControlStart = () => {
      cameraTransitionActiveRef.current = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(320, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Initial render
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      weaveTex.dispose();
      dialTex.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [measurements.chest, measurements.waist, measurements.hip]);

  // Re-trigger resize when toggling full-bleed 100vw x 100vh mode
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  return (
    <section
      aria-label="Three.js 3D Procedural Anthropometric & 5-Piece Garment Atelier"
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 overflow-hidden'
          : 'relative w-full h-[620px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden'
      }
    >
      {/* Dedicated Empty WebGL Mount Container (Zero Sibling Re-render Interference) */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Minimal Top-Left Spec Badge (Solid rgba surface, no backdrop-filter over WebGL) */}
      <div
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        className="absolute top-4 left-4 z-10 px-3.5 py-2 rounded-xl border border-slate-700/80 text-white pointer-events-auto flex flex-wrap items-center gap-2.5 text-xs"
      >
        <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
          Three.js PBR 3D World · 10-Part Composite Rig
        </span>
        <span className="text-slate-500">·</span>
        <span className="font-mono text-slate-200">
          {heightCm}cm · {measurements.chest}/{measurements.waist}/{measurements.hip}cm · True Size{' '}
          {recommendedSize}
        </span>
        <span className="text-slate-500">·</span>
        <span className="font-mono font-bold text-emerald-400">
          Pass {activePass.iteration} ({activePass.overallScore}/100)
        </span>

        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          className="ml-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          title={isFullscreen ? 'Exit Full-Bleed 3D Viewport (Esc)' : 'Enter Full-Bleed 100vw×100vh 3D Viewport'}
        >
          {isFullscreen ? (
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

      {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Viewport Occlusion, <=15% Footprint) */}
      <div
        style={{
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(940px, 94vw)',
          width: '94vw',
        }}
        className="absolute z-10 flex flex-col items-center pointer-events-none"
      >
        {/* Collapse / Expand Toggle Tab ('H' shortcut) */}
        <button
          type="button"
          onClick={() => setIsDockCollapsed((c) => !c)}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
          className="pointer-events-auto px-3.5 py-1 rounded-t-xl border border-b-0 border-slate-700 text-[11px] font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>▴ Show 3D Atelier Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>▾ Hide Controls · Zen Mode (H)</span>
            </>
          )}
        </button>

        {!isDockCollapsed && (
          <div
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
            className="pointer-events-auto w-full rounded-2xl border border-slate-700 p-3 text-white shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            {/* 1. Closed-Loop Pass Morphing (Pass 1 -> Pass 2 -> Pass 3) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-indigo-400" />
                Loop Pass:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {allPasses.map((p) => {
                  const isCurrent = p.iteration === activePass.iteration;
                  return (
                    <button
                      key={p.iteration}
                      type="button"
                      onClick={() => onSelectPass(p.iteration)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Pass {p.iteration} ({p.overallScore})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Exploded 5-Piece Layer Separation Slider */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="exploded-5piece-slider"
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 whitespace-nowrap"
              >
                <Layers className="w-3 h-3 text-emerald-400" />
                5-Piece Explode:
              </label>
              <input
                id="exploded-5piece-slider"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodedRatio}
                onChange={(e) => handleExplodedChange( parseFloat(e.target.value) )}
                className="w-24 accent-indigo-500 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-emerald-300 w-9">
                {Math.round(explodedRatio * 100)}%
              </span>
            </div>

            {/* 3. Fabric Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Palette className="w-3 h-3 text-indigo-400" />
                Finish:
              </span>
              <div className="flex items-center gap-1.5">
                {FABRIC_SWATCHES.map((sw) => {
                  const isSel = sw.id === selectedSwatchId;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => handleSelectSwatch(sw)}
                      title={sw.label}
                      aria-label={sw.label}
                      style={{ backgroundColor: sw.swatchCss }}
                      className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                        isSel
                          ? 'border-white scale-110 ring-2 ring-indigo-400'
                          : 'border-slate-600 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 4. Damped Camera View Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                <Camera className="w-3 h-3 text-indigo-400" />
                Cam:
              </span>
              {CAMERA_PRESETS.map((preset) => {
                const isCamSel = preset.id === selectedCamPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectCameraPreset(preset)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      isCamSel
                        ? 'bg-slate-700 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
