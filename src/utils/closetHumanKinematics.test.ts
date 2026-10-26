import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WARDROBE_LINE_ITEMS,
  createInitialHumanWalkerState,
  stepHumanWalkerState,
  computeHumanJointPose,
  commandHumanSelectLineItem,
} from './closetHumanKinematics';

test('3D human walks from spawn to the target clothing rack station and transitions to reaching_garment', () => {
  let state = createInitialHumanWalkerState(1); // Target: The Pacific Overshirt
  assert.equal(state.phase, 'walking_to_rack');

  // Step forward in 50ms increments for up to 3 seconds
  for (let i = 0; i < 60; i++) {
    state = stepHumanWalkerState(state, 0.05);
    if (state.phase === 'reaching_garment') break;
  }

  assert.equal(state.phase, 'reaching_garment');
  const [targetX, , targetZ] = WARDROBE_LINE_ITEMS[1].standPos;
  assert.ok(Math.abs(state.x - targetX) < 0.07);
  assert.ok(Math.abs(state.z - targetZ) < 0.07);
});

test('3D human raises right arm during reaching_garment and equips the selected garment from the line', () => {
  let state = createInitialHumanWalkerState(2); // Target: The Cutter Overshirt
  // Jump to reaching_garment phase at the rack
  state = {
    ...state,
    x: WARDROBE_LINE_ITEMS[2].standPos[0],
    z: WARDROBE_LINE_ITEMS[2].standPos[2],
    phase: 'reaching_garment',
    phaseTime: 0,
  };

  // Advance halfway through reach (15 frames * 0.05s = 0.75s)
  for (let i = 0; i < 15; i++) {
    state = stepHumanWalkerState(state, 0.05);
  }
  const reachPose = computeHumanJointPose(state);
  // Right shoulder pitch should be strongly negative (arm raised overhead toward hanger)
  assert.ok(reachPose.rightShoulderPitch < -1.0);
  assert.ok(state.activeHangerPull > 0.1);

  // Finish reach -> transitions to equipping_garment and updates equippedItemIndex
  for (let i = 0; i < 20; i++) {
    state = stepHumanWalkerState(state, 0.05);
    if (state.phase === 'equipping_garment') break;
  }

  assert.equal(state.phase, 'equipping_garment');
  assert.equal(state.equippedItemIndex, 2);

  // Finish equipping -> walks to mirror
  for (let i = 0; i < 25; i++) {
    state = stepHumanWalkerState(state, 0.05);
    if (state.phase === 'walking_to_mirror') break;
  }
  assert.equal(state.phase, 'walking_to_mirror');
});

test('commandHumanSelectLineItem redirects the 3D human to any selected garment on the line', () => {
  const initial = createInitialHumanWalkerState(0);
  const redirected = commandHumanSelectLineItem(initial, 4, false);
  assert.equal(redirected.targetItemIndex, 4);
  assert.equal(redirected.phase, 'walking_to_rack');
  assert.equal(redirected.autoCycleEnabled, false);
});
