import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFullOutputFromSteps,
  parseAgentJsonSafely,
  normalizeInteractionSteps,
  computeAnthropometricWorldModel,
  buildRenderWatchCritiqueLoop,
  computeMillionTokenBenchmark,
  buildSynthesizedSwarmResponse,
} from './multiAgentOrchestrator.ts';
import { DEFAULT_SIZE_CHART } from './fitMath.ts';
import { DEFAULT_EXISTING_WARDROBE } from './wardrobeStyler.ts';
import { BodyMeasurements, ShoppingProduct } from '../types/tryon.ts';

const MOCK_MEASUREMENTS: BodyMeasurements = {
  chest: 99,
  waist: 95,
  hip: 93,
  chestSource: 'front+back photos',
  waistSource: 'front+back photos',
  hipSource: 'front+back photos',
  confidence: 0.94,
  uncertaintyCm: 1.5,
};

const MOCK_CATALOG: ShoppingProduct[] = [
  {
    id: 'zara-comfort-suit-blazer-04456999',
    title: 'Comfort Suit Blazer (Ref. 4456/999)',
    brand: 'ZARA',
    category: 'Blazers & Tailoring',
    price: '129.00',
    currency: 'USD',
    productUrl: 'https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html',
    frontImage: '/assets/aistudio/1859546-800w_3767735c.jpg',
    backImage: '/assets/aistudio/1859546-800w_3767735c.jpg',
    cut: 'regular',
    fabric: 'stretch_knit',
    details: 'Single-breasted comfort suit blazer in Sand/Cream Marl.',
    available: true,
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    variants: [],
    sizeChart: DEFAULT_SIZE_CHART,
    apiSource: 'https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html',
    verifiedAt: '2026-10-25T16:00:00.000Z',
  },
];

describe('Multi-Agent Orchestrator & Interactions API Helpers', () => {
  test('extractFullOutputFromSteps concatenates all incremental model_output steps', () => {
    const rawSteps = [
      { type: 'thought', summary: 'Analyzing torso measurements', signature: 'sig1' },
      {
        type: 'model_output',
        content: [{ type: 'text', text: 'Section 1: Anthropometric Ease. ' }],
      },
      { type: 'code_execution_call', code: 'print(42)' },
      {
        type: 'model_output',
        content: [{ type: 'text', text: 'Section 2: 5-Piece Wardrobe Solution.' }],
      },
    ];

    const combined = extractFullOutputFromSteps(rawSteps);
    assert.equal(
      combined,
      'Section 1: Anthropometric Ease. Section 2: 5-Piece Wardrobe Solution.'
    );
  });

  test('parseAgentJsonSafely extracts fenced JSON and handles trailing commas', () => {
    const rawAgentOutput = `Here is the sandbox result:\n\`\`\`json\n{\n  "overallScore": 97.2,\n  "silhouetteBalance": "Crisp 3:5 ratio",\n}\n\`\`\`\nCompleted.`;
    const parsed = parseAgentJsonSafely(rawAgentOutput, {
      overallScore: 0,
      silhouetteBalance: 'fallback',
    });

    assert.equal(parsed.overallScore, 97.2);
    assert.equal(parsed.silhouetteBalance, 'Crisp 3:5 ratio');
  });

  test('normalizeInteractionSteps preserves thought, code_execution, search, and model_output', () => {
    const rawSteps = [
      { type: 'thought', summary: 'Checking chest ease', signature: 'sig_abc123' },
      { type: 'google_search_call', queries: ['Zara 4456/999 stock'] },
      { type: 'code_execution_call', code: 'print("ok")', language: 'python' },
      { type: 'code_execution_result', output: 'ok\n' },
      { type: 'model_output', content: [{ type: 'text', text: 'Final synthesis' }] },
    ];

    const normalized = normalizeInteractionSteps(rawSteps, 1000);
    assert.equal(normalized.length, 5);
    assert.equal(normalized[0].type, 'thought');
    assert.equal(normalized[1].type, 'google_search_call');
    assert.equal(normalized[2].type, 'code_execution_call');
    assert.equal(normalized[3].type, 'code_execution_result');
    assert.equal(normalized[4].type, 'model_output');
  });

  test('computeAnthropometricWorldModel generates 8 turntable radial tension nodes (0° to 315°)', () => {
    const report = computeAnthropometricWorldModel(
      MOCK_MEASUREMENTS,
      DEFAULT_SIZE_CHART,
      'regular',
      'stretch_knit'
    );

    assert.equal(report.recommendedTrueSize, 'L');
    assert.equal(report.shoulderToWaistDropCm, 4);
    assert.equal(report.radialNodes.length, 8);
    assert.deepEqual(
      report.radialNodes.map((n) => n.angleDeg),
      [0, 45, 90, 135, 180, 225, 270, 315]
    );
  });

  test('buildRenderWatchCritiqueLoop executes 3-pass closed-loop improvement (More Dimensions)', () => {
    const worldModel = computeAnthropometricWorldModel(
      MOCK_MEASUREMENTS,
      DEFAULT_SIZE_CHART,
      'regular',
      'stretch_knit'
    );
    const loop = buildRenderWatchCritiqueLoop(MOCK_MEASUREMENTS, worldModel);

    assert.equal(loop.totalPasses, 3);
    assert.equal(loop.iterations.length, 3);
    assert.ok(loop.convergedFinalScore > loop.initialDraftScore);
    assert.equal(loop.iterations[0].status, 'draft_rendered');
    assert.equal(loop.iterations[1].status, 'critiqued_patched');
    assert.equal(loop.iterations[2].status, 'converged_verified');
  });

  test('computeMillionTokenBenchmark quantifies continuous Argon accuracy gain over baseline', () => {
    const benchmark = computeMillionTokenBenchmark(MOCK_CATALOG, DEFAULT_EXISTING_WARDROBE);
    assert.ok(benchmark.argonContinuousAccuracyPct > benchmark.baselineSinglePassAccuracyPct);
    assert.ok(benchmark.accuracyGainDeltaPct > 30);
    assert.equal(benchmark.schemaConsistencyPct, 100);
  });

  test('buildSynthesizedSwarmResponse coordinates all 4 agents and outputs 5-piece outfits', () => {
    const swarm = buildSynthesizedSwarmResponse({
      missionPrompt: 'Shack15 SF Hackathon Pitch Outfit',
      occasionTag: 'Shack15 SF Founder Pitch',
      budgetCapUsd: 380,
      measurements: MOCK_MEASUREMENTS,
      existingWardrobe: DEFAULT_EXISTING_WARDROBE,
      shopCatalog: MOCK_CATALOG,
      sizeChart: DEFAULT_SIZE_CHART,
      cut: 'regular',
      fabric: 'stretch_knit',
      totalLatencyMs: 2400,
    });

    assert.equal(swarm.agents.length, 4);
    assert.equal(swarm.agents[0].agentId, 'argon-anthropometric-architect');
    assert.equal(swarm.agents[1].agentId, 'managed-deep-research-scout');
    assert.equal(swarm.agents[2].agentId, 'managed-antigravity-sandbox');
    assert.equal(swarm.agents[3].agentId, 'argon-world-drape-critic');
    assert.equal(swarm.renderCritiqueLoop.totalPasses, 3);
    assert.ok(swarm.millionTokenBenchmark.accuracyGainDeltaPct > 30);
    assert.ok(swarm.recommendedOutfits.length > 0);
    const firstOutfit = swarm.recommendedOutfits[0];
    assert.ok(firstOutfit.slots.top);
    assert.ok(firstOutfit.slots.layering);
    assert.ok(firstOutfit.slots.bottom);
    assert.ok(firstOutfit.slots.watch);
    assert.ok(firstOutfit.slots.shoes);
  });
});
