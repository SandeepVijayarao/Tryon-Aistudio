export type HumanWalkPhase =
  | 'walking_to_rack'
  | 'reaching_garment'
  | 'equipping_garment'
  | 'walking_to_mirror'
  | 'posing_inspection';

export interface WardrobeLineItem {
  id: string;
  indexOnRack: number;
  label: string;
  brand: string;
  category: 'top' | 'layering' | 'bottom';
  garmentColorHex: number;
  garmentRoughness: number;
  collarColorHex: number;
  /** World coordinates where the hanger sits on the line */
  rackPos: [number, number, number];
  /** World coordinates where the human stands to reach this hanger */
  standPos: [number, number, number];
  /** Yaw angle (radians) the human faces when reaching for the garment */
  faceRackYaw: number;
  /** Associated shop/closet product ID if linked */
  catalogProductId?: string;
}

export const WARDROBE_LINE_ITEMS: WardrobeLineItem[] = [
  {
    id: 'line-blazer-cream',
    indexOnRack: 0,
    label: 'Comfort Suit Blazer (Cream)',
    brand: 'ZARA',
    category: 'top',
    garmentColorHex: 0xebe3d2,
    garmentRoughness: 0.62,
    collarColorHex: 0xd6cbb5,
    rackPos: [-2.6, 0.82, 0.37],
    standPos: [-1.78, 0, 0.37],
    faceRackYaw: -Math.PI / 2,
    catalogProductId: 'closet-zara-blazer',
  },
  {
    id: 'line-overshirt-hemp',
    indexOnRack: 1,
    label: 'The Pacific Overshirt (Bay Leaf Hemp)',
    brand: 'Taylor Stitch',
    category: 'top',
    garmentColorHex: 0x4a5844,
    garmentRoughness: 0.72,
    collarColorHex: 0x334130,
    rackPos: [-2.6, 0.82, -0.04],
    standPos: [-1.78, 0, -0.04],
    faceRackYaw: -Math.PI / 2,
    catalogProductId: 'shop-ts-overshirt',
  },
  {
    id: 'line-overshirt-navy',
    indexOnRack: 2,
    label: 'The Cutter Overshirt (Navy Plaid Wool)',
    brand: 'Taylor Stitch',
    category: 'top',
    garmentColorHex: 0x1e293b,
    garmentRoughness: 0.68,
    collarColorHex: 0x0f172a,
    rackPos: [-2.6, 0.82, -0.45],
    standPos: [-1.78, 0, -0.45],
    faceRackYaw: -Math.PI / 2,
    catalogProductId: 'shop-ts-cutter',
  },
  {
    id: 'line-jacket-tobacco',
    indexOnRack: 3,
    label: 'Suede Atelier Chore Jacket (Tobacco)',
    brand: 'Loro Piana Inspiration',
    category: 'top',
    garmentColorHex: 0x7c4a2d,
    garmentRoughness: 0.78,
    collarColorHex: 0x5c3419,
    rackPos: [-2.6, 0.82, -0.86],
    standPos: [-1.78, 0, -0.86],
    faceRackYaw: -Math.PI / 2,
    catalogProductId: 'shop-ts-sunset',
  },
  {
    id: 'line-overcoat-charcoal',
    indexOnRack: 4,
    label: 'Double-Breasted Cashmere Coat (Charcoal)',
    brand: 'Savile Row Bespoke',
    category: 'top',
    garmentColorHex: 0x374151,
    garmentRoughness: 0.55,
    collarColorHex: 0x1e293b,
    rackPos: [-2.6, 0.82, -1.27],
    standPos: [-1.78, 0, -1.27],
    faceRackYaw: -Math.PI / 2,
    catalogProductId: 'shop-ts-haven',
  },
];

export const MIRROR_INSPECTION_POS: [number, number, number] = [-1.05, 0, -0.85];
export const MIRROR_INSPECTION_YAW = Math.PI; // Facing the back tri-fold mirror (-Z)

export interface HumanWalkerState {
  x: number;
  z: number;
  yaw: number;
  phase: HumanWalkPhase;
  phaseTime: number;
  gaitCycle: number;
  targetItemIndex: number;
  equippedItemIndex: number;
  autoCycleEnabled: boolean;
  /** 0 = hanging on line, 1 = pulled forward by human hand */
  activeHangerPull: number;
}

export interface HumanJointPose {
  pelvisBobY: number;
  torsoPitch: number;
  torsoTwistY: number;
  headYaw: number;
  headPitch: number;
  leftHipPitch: number;
  leftKneePitch: number;
  rightHipPitch: number;
  rightKneePitch: number;
  leftShoulderPitch: number;
  leftElbowPitch: number;
  rightShoulderPitch: number;
  rightShoulderRoll: number;
  rightElbowPitch: number;
}

export function createInitialHumanWalkerState(initialTargetIndex = 1): HumanWalkerState {
  return {
    x: -0.88,
    z: 0.45,
    yaw: -Math.PI / 2,
    phase: 'walking_to_rack',
    phaseTime: 0,
    gaitCycle: 0,
    targetItemIndex: initialTargetIndex,
    equippedItemIndex: 0,
    autoCycleEnabled: true,
    activeHangerPull: 0,
  };
}

/**
 * Shortest signed angular difference in [-PI, PI]
 */
export function shortestAngleDiff(fromRad: number, toRad: number): number {
  let diff = (toRad - fromRad) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Advances the 3D human walker state machine by dt seconds.
 */
export function stepHumanWalkerState(
  state: HumanWalkerState,
  dt: number,
  walkSpeed = 1.25
): HumanWalkerState {
  const clampedDt = Math.min(Math.max(dt, 0), 0.1);
  const next: HumanWalkerState = { ...state, phaseTime: state.phaseTime + clampedDt };
  const targetItem =
    WARDROBE_LINE_ITEMS[next.targetItemIndex] || WARDROBE_LINE_ITEMS[0];

  if (next.phase === 'walking_to_rack') {
    const [tx, , tz] = targetItem.standPos;
    const dx = tx - next.x;
    const dz = tz - next.z;
    const dist = Math.hypot(dx, dz);
    next.activeHangerPull = 0;

    if (dist <= 0.06) {
      next.x = tx;
      next.z = tz;
      next.phase = 'reaching_garment';
      next.phaseTime = 0;
    } else {
      const moveStep = Math.min(dist, walkSpeed * clampedDt);
      next.x += (dx / dist) * moveStep;
      next.z += (dz / dist) * moveStep;
      const desiredYaw = Math.atan2(dx, dz);
      next.yaw += shortestAngleDiff(next.yaw, desiredYaw) * Math.min(1, clampedDt * 8);
      next.gaitCycle += moveStep * 4.4;
    }
    return next;
  }

  if (next.phase === 'reaching_garment') {
    // Rotate smoothly toward the rack hanger
    next.yaw +=
      shortestAngleDiff(next.yaw, targetItem.faceRackYaw) * Math.min(1, clampedDt * 9);
    // Reach up (0..0.7s) and pull hanger forward off the line (0.5..1.4s)
    const reachProgress = Math.min(1, next.phaseTime / 1.35);
    next.activeHangerPull =
      reachProgress < 0.35 ? 0 : Math.sin(((reachProgress - 0.35) / 0.65) * (Math.PI / 2));

    if (next.phaseTime >= 1.45) {
      next.phase = 'equipping_garment';
      next.phaseTime = 0;
      next.equippedItemIndex = next.targetItemIndex;
    }
    return next;
  }

  if (next.phase === 'equipping_garment') {
    next.yaw +=
      shortestAngleDiff(next.yaw, targetItem.faceRackYaw) * Math.min(1, clampedDt * 8);
    const equipProgress = Math.min(1, next.phaseTime / 0.9);
    next.activeHangerPull = Math.max(0, 1 - equipProgress);

    if (next.phaseTime >= 0.95) {
      next.activeHangerPull = 0;
      next.phase = 'walking_to_mirror';
      next.phaseTime = 0;
    }
    return next;
  }

  if (next.phase === 'walking_to_mirror') {
    const [mx, , mz] = MIRROR_INSPECTION_POS;
    const dx = mx - next.x;
    const dz = mz - next.z;
    const dist = Math.hypot(dx, dz);
    next.activeHangerPull = 0;

    if (dist <= 0.06) {
      next.x = mx;
      next.z = mz;
      next.phase = 'posing_inspection';
      next.phaseTime = 0;
    } else {
      const moveStep = Math.min(dist, walkSpeed * clampedDt);
      next.x += (dx / dist) * moveStep;
      next.z += (dz / dist) * moveStep;
      const desiredYaw = Math.atan2(dx, dz);
      next.yaw += shortestAngleDiff(next.yaw, desiredYaw) * Math.min(1, clampedDt * 8);
      next.gaitCycle += moveStep * 4.4;
    }
    return next;
  }

  // 'posing_inspection' at the Tri-Fold Atelier Mirror
  next.yaw +=
    shortestAngleDiff(next.yaw, MIRROR_INSPECTION_YAW) * Math.min(1, clampedDt * 6);
  next.activeHangerPull = 0;

  if (next.autoCycleEnabled && next.phaseTime >= 2.2) {
    next.targetItemIndex = (next.targetItemIndex + 1) % WARDROBE_LINE_ITEMS.length;
    next.phase = 'walking_to_rack';
    next.phaseTime = 0;
  }

  return next;
}

/**
 * Computes articulated joint rotations (in radians) for the 3D human character
 * based on the current state machine phase and gait cycle.
 */
export function computeHumanJointPose(state: HumanWalkerState): HumanJointPose {
  const isWalking =
    state.phase === 'walking_to_rack' || state.phase === 'walking_to_mirror';

  if (isWalking) {
    const g = state.gaitCycle;
    const leftSwing = Math.sin(g);
    const rightSwing = Math.sin(g + Math.PI);

    return {
      pelvisBobY: Math.abs(Math.cos(g)) * 0.032,
      torsoPitch: 0.05,
      torsoTwistY: Math.sin(g) * 0.08,
      headYaw: 0,
      headPitch: 0.02,
      leftHipPitch: -leftSwing * 0.48,
      leftKneePitch: Math.max(0, -leftSwing) * 0.65 + 0.06,
      rightHipPitch: -rightSwing * 0.48,
      rightKneePitch: Math.max(0, -rightSwing) * 0.65 + 0.06,
      leftShoulderPitch: rightSwing * 0.36,
      leftElbowPitch: -0.28 - Math.max(0, rightSwing) * 0.22,
      rightShoulderPitch: leftSwing * 0.36,
      rightShoulderRoll: 0,
      rightElbowPitch: -0.28 - Math.max(0, leftSwing) * 0.22,
    };
  }

  if (state.phase === 'reaching_garment') {
    // Smooth bell curve reach up toward the high brass garment rail
    const t = Math.min(1, state.phaseTime / 1.35);
    const lift = Math.sin(t * (Math.PI * 0.85));
    return {
      pelvisBobY: 0.01 * lift,
      torsoPitch: -0.06 * lift,
      torsoTwistY: -0.14 * lift,
      headYaw: -0.08 * lift,
      headPitch: -0.24 * lift, // Looking up at the hanger on the line
      leftHipPitch: 0,
      leftKneePitch: 0.03,
      rightHipPitch: 0,
      rightKneePitch: 0.03,
      leftShoulderPitch: -0.18 * lift,
      leftElbowPitch: -0.45 * lift,
      // Right arm reaches up and forward to grab the hanger from the line
      rightShoulderPitch: -1.68 * lift,
      rightShoulderRoll: -0.12 * lift,
      rightElbowPitch: -0.52 * lift,
    };
  }

  if (state.phase === 'equipping_garment') {
    const t = Math.min(1, state.phaseTime / 0.9);
    const drawIn = Math.sin(t * Math.PI);
    return {
      pelvisBobY: 0,
      torsoPitch: 0.04 * drawIn,
      torsoTwistY: 0.06 * Math.sin(t * Math.PI * 2),
      headYaw: 0,
      headPitch: 0.15 * drawIn, // Looking down at chest while fitting jacket
      leftHipPitch: 0,
      leftKneePitch: 0.04,
      rightHipPitch: 0,
      rightKneePitch: 0.04,
      leftShoulderPitch: -0.75 * drawIn,
      leftElbowPitch: -1.1 * drawIn,
      rightShoulderPitch: -0.85 * drawIn,
      rightShoulderRoll: 0.18 * drawIn,
      rightElbowPitch: -1.15 * drawIn,
    };
  }

  // 'posing_inspection' at the Tri-Fold Brass Atelier Mirror
  const t = state.phaseTime;
  const checkTurn = Math.sin(t * 2.4);
  return {
    pelvisBobY: 0,
    torsoPitch: -0.02,
    torsoTwistY: checkTurn * 0.22,
    headYaw: -checkTurn * 0.16, // Keeping eyes toward the mirror reflection
    headPitch: 0.04,
    leftHipPitch: 0,
    leftKneePitch: 0.02,
    rightHipPitch: 0,
    rightKneePitch: 0.02,
    leftShoulderPitch: -0.22 * Math.abs(checkTurn),
    leftElbowPitch: -0.55 * Math.abs(checkTurn),
    rightShoulderPitch: -0.28,
    rightShoulderRoll: -0.08,
    rightElbowPitch: -0.65,
  };
}

/**
 * Directs the human walker to immediately walk toward a specific garment on the line.
 */
export function commandHumanSelectLineItem(
  state: HumanWalkerState,
  itemIndex: number,
  keepAutoCycle = false
): HumanWalkerState {
  const safeIndex =
    ((itemIndex % WARDROBE_LINE_ITEMS.length) + WARDROBE_LINE_ITEMS.length) %
    WARDROBE_LINE_ITEMS.length;
  return {
    ...state,
    targetItemIndex: safeIndex,
    phase: 'walking_to_rack',
    phaseTime: 0,
    activeHangerPull: 0,
    autoCycleEnabled: keepAutoCycle,
  };
}
