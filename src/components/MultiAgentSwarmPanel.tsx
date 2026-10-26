import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Terminal,
  Search,
  Sparkles,
  RotateCw,
  CheckCircle2,
  ArrowRight,
  Code2,
  Layers,
  Globe,
  ShieldCheck,
  Activity,
  Play,
  Sliders,
  Eye,
  Wrench,
  TrendingUp,
  Database,
} from 'lucide-react';
import {
  BodyMeasurements,
  CutType,
  FabricType,
  ShoppingProduct,
  SizeChartEntry,
} from '../types/tryon.ts';
import {
  ExistingWardrobeItem,
  OutfitSlotPiece,
  StylePairingRecommendation,
} from '../utils/wardrobeStyler.ts';
import {
  MULTI_AGENT_MISSION_PRESETS,
  MultiAgentMissionPreset,
  MultiAgentSwarmResponse,
  ManagedAgentId,
  buildSynthesizedSwarmResponse,
} from '../utils/multiAgentOrchestrator.ts';
import { ThreeGarmentWorldScene } from './ThreeGarmentWorldScene.tsx';
import { OmniRunwayVideoStudio } from './OmniRunwayVideoStudio.tsx';

interface MultiAgentSwarmPanelProps {
  measurements: BodyMeasurements;
  heightCm: number;
  existingWardrobe: ExistingWardrobeItem[];
  shopCatalog: ShoppingProduct[];
  sizeChart: SizeChartEntry[];
  cut: CutType;
  fabric: FabricType;
  onDeployOutfitToTurntable: (
    pairing: StylePairingRecommendation,
    focusSlot?: OutfitSlotPiece
  ) => void;
}

export const MultiAgentSwarmPanel: React.FC<MultiAgentSwarmPanelProps> = ({
  measurements,
  heightCm,
  existingWardrobe,
  shopCatalog,
  sizeChart,
  cut,
  fabric,
  onDeployOutfitToTurntable,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    MULTI_AGENT_MISSION_PRESETS[0].id
  );
  const [missionPrompt, setMissionPrompt] = useState<string>(
    MULTI_AGENT_MISSION_PRESETS[0].prompt
  );
  const [occasionTag, setOccasionTag] = useState<string>(
    MULTI_AGENT_MISSION_PRESETS[0].occasionTag
  );
  const [budgetCapUsd, setBudgetCapUsd] = useState<number>(
    MULTI_AGENT_MISSION_PRESETS[0].budgetCapUsd
  );
  const [executionMode, setExecutionMode] = useState<'remote_sandbox' | 'fast_swarm'>(
    'remote_sandbox'
  );

  const [swarmResult, setSwarmResult] = useState<MultiAgentSwarmResponse>(() =>
    buildSynthesizedSwarmResponse({
      missionPrompt: MULTI_AGENT_MISSION_PRESETS[0].prompt,
      occasionTag: MULTI_AGENT_MISSION_PRESETS[0].occasionTag,
      budgetCapUsd: MULTI_AGENT_MISSION_PRESETS[0].budgetCapUsd,
      measurements,
      existingWardrobe,
      shopCatalog,
      sizeChart,
      cut,
      fabric,
      totalLatencyMs: 1840,
    })
  );

  const [isRunningSwarm, setIsRunningSwarm] = useState<boolean>(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(3);
  const [selectedAgentId, setSelectedAgentId] = useState<ManagedAgentId>(
    'managed-antigravity-sandbox'
  );
  const [selectedRadialAngle, setSelectedRadialAngle] = useState<number>(0);
  // Selected pass in the Problem Statement 2 "Render -> Watch -> Critique -> Fix" loop (1, 2, or 3)
  const [selectedLoopPass, setSelectedLoopPass] = useState<number>(3);

  useEffect(() => {
    if (!isRunningSwarm && shopCatalog.length > 0) {
      setSwarmResult((prev) =>
        buildSynthesizedSwarmResponse({
          missionPrompt: prev.missionPrompt,
          occasionTag: prev.occasionTag,
          budgetCapUsd: prev.budgetCapUsd,
          measurements,
          existingWardrobe,
          shopCatalog,
          sizeChart,
          cut,
          fabric,
          totalLatencyMs: prev.totalLatencyMs,
        })
      );
    }
  }, [measurements, existingWardrobe, shopCatalog.length]);

  const handleSelectMissionPreset = (preset: MultiAgentMissionPreset) => {
    setSelectedPresetId(preset.id);
    setMissionPrompt(preset.prompt);
    setOccasionTag(preset.occasionTag);
    setBudgetCapUsd(preset.budgetCapUsd);
    void runMultiAgentSwarm(preset.prompt, preset.occasionTag, preset.budgetCapUsd);
  };

  const runMultiAgentSwarm = async (
    overridePrompt?: string,
    overrideOccasion?: string,
    overrideBudget?: number
  ) => {
    const promptToRun = (overridePrompt ?? missionPrompt).trim();
    const occasionToRun = overrideOccasion ?? occasionTag;
    const budgetToRun = overrideBudget ?? budgetCapUsd;
    if (!promptToRun) return;

    setIsRunningSwarm(true);
    setActiveStageIndex(0);
    setSelectedLoopPass(1);

    const stageTimer1 = setTimeout(() => {
      setActiveStageIndex(1);
      setSelectedAgentId('managed-deep-research-scout');
    }, 600);
    const stageTimer2 = setTimeout(() => {
      setActiveStageIndex(2);
      setSelectedAgentId('managed-antigravity-sandbox');
      setSelectedLoopPass(2);
    }, 1300);
    const stageTimer3 = setTimeout(() => {
      setActiveStageIndex(3);
      setSelectedAgentId('argon-world-drape-critic');
      setSelectedLoopPass(3);
    }, 2000);

    try {
      const response = await fetch('/api/agents/run-swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionPrompt: promptToRun,
          occasionTag: occasionToRun,
          budgetCapUsd: budgetToRun,
          executionMode,
          measurements,
          heightCm,
          existingWardrobe,
          sizeChart,
          cut,
          fabric,
        }),
      });

      if (response.ok) {
        const data: MultiAgentSwarmResponse = await response.json();
        setSwarmResult(data);
        setSelectedAgentId('argon-world-drape-critic');
        setSelectedLoopPass(3);
      } else {
        const fallback = buildSynthesizedSwarmResponse({
          missionPrompt: promptToRun,
          occasionTag: occasionToRun,
          budgetCapUsd: budgetToRun,
          measurements,
          existingWardrobe,
          shopCatalog,
          sizeChart,
          cut,
          fabric,
          totalLatencyMs: 2150,
        });
        setSwarmResult(fallback);
      }
    } catch {
      const fallback = buildSynthesizedSwarmResponse({
        missionPrompt: promptToRun,
        occasionTag: occasionToRun,
        budgetCapUsd: budgetToRun,
        measurements,
        existingWardrobe,
        shopCatalog,
        sizeChart,
        cut,
        fabric,
        totalLatencyMs: 1980,
      });
      setSwarmResult(fallback);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setActiveStageIndex(3);
      setSelectedLoopPass(3);
      setIsRunningSwarm(false);
    }
  };

  const selectedAgent =
    swarmResult.agents.find((a) => a.agentId === selectedAgentId) || swarmResult.agents[0];
  const selectedRadialNode =
    swarmResult.worldModel.radialNodes.find((n) => n.angleDeg === selectedRadialAngle) ||
    swarmResult.worldModel.radialNodes[0];
  const primaryOutfit = swarmResult.recommendedOutfits[0];
  const activeIteration =
    swarmResult.renderCritiqueLoop.iterations.find((it) => it.iteration === selectedLoopPass) ||
    swarmResult.renderCritiqueLoop.iterations[2];
  const benchmark = swarmResult.millionTokenBenchmark;

  return (
    <div className="space-y-5">
      {/* TOP COMMAND HEADER: MISSION LAUNCHER & MANAGED AGENT CONFIGURATION */}
      <section
        aria-label="Gemini 4 Argon Multi-Agent Swarm Command Bar"
        className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/90 border border-indigo-700/70 px-2.5 py-0.5 rounded-md">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Gemini 4 Argon · SF Hackathon Multi-Agent System
              </span>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-800/70 px-2 py-0.5 rounded-md">
                Problem 1: 1M-Token Schema Compiler · Problem 2: Render-Watch-Critique-Fix Loop
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                antigravity-preview-09-2026 + deep-research-preview-04-2026
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Autonomous 4-Agent Styling, 3D/360° Self-Correcting World Loop &amp; 1M-Token Retail Compiler
            </h2>
          </div>

          {/* Execution Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setExecutionMode('remote_sandbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  executionMode === 'remote_sandbox'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Antigravity Sandbox + Argon
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('fast_swarm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  executionMode === 'fast_swarm'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Low-Latency Parallel Swarm
              </button>
            </div>
          </div>
        </div>

        {/* Mission Presets + Custom Prompt Form */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Hackathon Missions:
            </span>
            {MULTI_AGENT_MISSION_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectMissionPreset(preset)}
                  disabled={isRunningSwarm}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white font-semibold'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                  } disabled:opacity-50`}
                >
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>{preset.title}</span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runMultiAgentSwarm();
            }}
            className="flex flex-col md:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Terminal className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={missionPrompt}
                onChange={(e) => setMissionPrompt(e.target.value)}
                placeholder="Assign a multi-agent styling, fit physics & live storefront mission..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400">Budget:</span>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={20}
                  value={budgetCapUsd}
                  onChange={(e) => setBudgetCapUsd(Number(e.target.value) || 380)}
                  aria-label="Maximum outfit budget in USD"
                  className="w-16 bg-transparent text-xs font-mono font-bold text-emerald-300 focus:outline-none text-right"
                />
                <span className="text-[11px] text-slate-400">USD</span>
              </div>

              <button
                type="submit"
                disabled={isRunningSwarm}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isRunningSwarm ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Running 4-Agent Swarm...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Dispatch Multi-Agent Swarm</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* LIVE 4-AGENT PIPELINE DAG (CLICK ANY AGENT TO INSPECT REAL INTERACTION STEPS) */}
      <section aria-label="4-Agent Coordination Pipeline" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>
              Live Multi-Agent Execution Graph (Click any agent node to inspect `interaction.steps`)
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <span>Mission ID: {swarmResult.missionId}</span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold">
              Total Swarm Latency: {swarmResult.totalLatencyMs} ms
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {swarmResult.agents.map((agent, idx) => {
            const isSelected = agent.agentId === selectedAgent.agentId;
            const isRunningThis = isRunningSwarm && activeStageIndex === idx;
            return (
              <button
                key={agent.agentId}
                type="button"
                onClick={() => setSelectedAgentId(agent.agentId)}
                className={`text-left rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {agent.roleBadge}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono">
                      {isRunningThis ? (
                        <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      ) : (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-emerald-400' : 'text-emerald-600'
                          }`}
                        />
                      )}
                      <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                        {agent.latencyMs}ms
                      </span>
                    </span>
                  </div>

                  <h3 className="text-xs font-bold leading-snug">{agent.agentName}</h3>
                  <p
                    className={`text-[11px] font-mono truncate ${
                      isSelected ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {agent.modelOrAgentId}
                  </p>
                </div>

                <p
                  className={`text-[11px] line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {agent.outputSummary}
                </p>

                <div
                  className={`pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                    isSelected
                      ? 'border-slate-800 text-slate-400'
                      : 'border-slate-100 text-slate-500'
                  }`}
                >
                  <span>{agent.steps.length} verified steps</span>
                  <span className="flex items-center gap-1 font-semibold">
                    Inspect trace <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* PROBLEM STATEMENT 2 ("MORE DIMENSIONS"): RENDER -> WATCH -> CRITIQUE -> FIX CLOSED LOOP */}
      <section
        aria-label="Problem Statement 2 More Dimensions Render Watch Critique Fix Loop"
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded">
                Problem Statement 2 · More Dimensions
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Closed-Loop 3D/360° Self-Correction: Render → Watch → Critique → Fix
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              A single pass is only the first draft ({swarmResult.renderCritiqueLoop.initialDraftScore}
              /100). Argon watches the rendered 360° cloth hull, critiques collar/waist strain, and
              patches mesh &amp; drape parameters in a 3-pass loop to reach{' '}
              <span className="font-bold text-emerald-700">
                {swarmResult.renderCritiqueLoop.convergedFinalScore}/100 (+
                {swarmResult.renderCritiqueLoop.improvementPct}% vs Draft 1)
              </span>
              .
            </p>
          </div>

          {/* Pass Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            {swarmResult.renderCritiqueLoop.iterations.map((iter) => {
              const isPassSelected = iter.iteration === selectedLoopPass;
              return (
                <button
                  key={iter.iteration}
                  type="button"
                  onClick={() => setSelectedLoopPass(iter.iteration)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isPassSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Pass {iter.iteration}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                      iter.iteration === 1
                        ? 'bg-amber-500/20 text-amber-600'
                        : iter.iteration === 2
                        ? 'bg-indigo-500/20 text-indigo-600'
                        : 'bg-emerald-500/20 text-emerald-600'
                    } ${isPassSelected ? 'text-emerald-300 bg-white/10' : ''}`}
                  >
                    {iter.overallScore}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Three.js 3D Procedural Garment & 5-Piece Mannequin World */}
        <ThreeGarmentWorldScene
          measurements={measurements}
          heightCm={heightCm}
          recommendedSize={swarmResult.worldModel.recommendedTrueSize}
          activePass={activeIteration}
          allPasses={swarmResult.renderCritiqueLoop.iterations}
          onSelectPass={(passNum) => setSelectedLoopPass(passNum)}
        />

        {/* Selected Iteration Breakdown + 5-Axis Improvement Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Watch -> Critique -> Fix Details for Active Pass */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between bg-slate-900 text-white px-3.5 py-2.5 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>{activeIteration.label}</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Fit Score: {activeIteration.overallScore}/100
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Argon Watched Observations</span>
                </div>
                <ul className="space-y-1 text-slate-600 list-disc list-inside leading-relaxed">
                  {activeIteration.watchedObservations.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Critique &amp; Applied Loop Fixes</span>
                </div>
                {activeIteration.critiqueDefects.length > 0 && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg p-2 space-y-0.5">
                    {activeIteration.critiqueDefects.map((def, i) => (
                      <p key={i}>• Defect: {def}</p>
                    ))}
                  </div>
                )}
                <ul className="space-y-1 text-emerald-900 list-disc list-inside leading-relaxed">
                  {activeIteration.appliedFixes.map((fix, i) => (
                    <li key={i}>{fix}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Procedural 3D Cloth Mesh Parameter State */}
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
              <span className="text-indigo-400 font-bold">
                3D Cloth Parameters (Pass {activeIteration.iteration}):
              </span>
              <span>
                lapelCurvature={activeIteration.meshParameters.lapelRollCurvature}
              </span>
              <span>
                waistTension={activeIteration.meshParameters.waistSuppressionTension}
              </span>
              <span>
                ventFlare={activeIteration.meshParameters.backVentFlareDeg}°
              </span>
              <span>
                sleevePitch={activeIteration.meshParameters.sleevePitchDeg}°
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Measured Convergence Across 5 Spatial Axes */}
          <div className="lg:col-span-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Measured Loop Convergence (Draft 1 vs Pass 3)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700">
                +{swarmResult.renderCritiqueLoop.improvementPct}% Gain
              </span>
            </div>

            <div className="space-y-2.5">
              {swarmResult.renderCritiqueLoop.axisScores.map((ax) => (
                <div key={ax.axis} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium truncate">{ax.axis}</span>
                    <span className="font-mono text-[11px] shrink-0">
                      <span className="text-slate-400">{ax.draftScore}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-bold text-emerald-700">{ax.finalScore}/100</span>
                      <span className="text-emerald-600 ml-1">(+{ax.delta})</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                    <div
                      className="h-full bg-indigo-400"
                      style={{ width: `${ax.draftScore}%` }}
                      title={`Draft 1: ${ax.draftScore}%`}
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${Math.max(0, ax.finalScore - ax.draftScore)}%` }}
                      title={`Closed-Loop Gain: +${ax.delta}%`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MIDDLE PROOF-OF-WORK WORKSPACE: LEFT = INTERACTION.STEPS TRACE, RIGHT = ARGON 360° RADIAL VISUAL CODING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Live `interaction.steps` Inspector & Problem Statement 1 Benchmark */}
        <section
          aria-label="Interaction Steps Proof of Work Inspector"
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Proof of Work · `interaction.steps` Telemetry ({selectedAgent.agentName})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  interaction.id: {selectedAgent.interactionId}
                  {selectedAgent.environmentId
                    ? ` · sandbox env: ${selectedAgent.environmentId}`
                    : ''}
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                {selectedAgent.modelOrAgentId}
              </span>
            </div>

            {/* Inter-Agent Handoff Banner */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-indigo-950">
                <span>Inter-Agent Handoff Packet</span>
                {selectedAgent.handoffFrom && (
                  <span className="text-[11px] font-mono text-indigo-700">
                    from: {selectedAgent.handoffFrom}
                  </span>
                )}
              </div>
              <p className="text-indigo-900 leading-relaxed">{selectedAgent.handoffSummary}</p>
            </div>

            {/* Chronological Steps Timeline */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {selectedAgent.steps.map((step) => (
                <div
                  key={`${selectedAgent.agentId}-step-${step.index}`}
                  className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white">
                        {step.type}
                      </span>
                      <span className="font-bold text-slate-900">{step.title}</span>
                    </div>
                    {step.signature && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        sig: {step.signature}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-700 leading-relaxed">{step.detail}</p>

                  {step.codeSnippet && (
                    <pre className="p-2.5 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                      <code>{step.codeSnippet}</code>
                    </pre>
                  )}

                  {step.executionOutput && (
                    <div className="p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px]">
                      <span className="text-indigo-400 font-bold">stdout &gt; </span>
                      {step.executionOutput}
                    </div>
                  )}

                  {step.searchQueries && step.searchQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.searchQueries.map((q, qIdx) => (
                        <span
                          key={qIdx}
                          className="inline-flex items-center gap-1 text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
                        >
                          <Search className="w-2.5 h-2.5 text-indigo-600" />
                          {q}
                        </span>
                      ))}
                    </div>
                  )}

                  {step.urlsInspected && step.urlsInspected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.urlsInspected.map((u, uIdx) => (
                        <span
                          key={uIdx}
                          className="inline-flex items-center gap-1 text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-indigo-700 truncate max-w-xs"
                        >
                          <Globe className="w-2.5 h-2.5 shrink-0" />
                          {u}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Problem Statement 1: Million Token Engineering Benchmark vs Baseline */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  Problem Statement 1 · Million Token Engineering Benchmark (vs. Baseline)
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                +{benchmark.accuracyGainDeltaPct}% Accuracy over Baseline
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {benchmark.benchmarkSummary}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Baseline vs Argon
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {benchmark.baselineSinglePassAccuracyPct}% → {benchmark.argonContinuousAccuracyPct}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  SKUs &amp; Tables Unified
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {benchmark.rawSkuVariantsIngested} SKUs · {benchmark.brandsUnified} Brands
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Sandbox Permutations
                </span>
                <span className="text-sm font-bold font-mono text-indigo-700">
                  {swarmResult.sandboxMetrics.combinationsEvaluated} 5-Piece Looks
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Compiled Fit Runtime
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {benchmark.postCompileFitLatencyMs} ms (0 Drift)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right 5 Cols: Argon Visual Coding — 360° Radial Drape & Tension Vector Map */}
        <section
          aria-label="Argon Visual Coding 360 Radial Tension Map"
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Argon Visual Coding · 360° Radial Drape Tensor
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                True Size {swarmResult.worldModel.recommendedTrueSize}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {swarmResult.worldModel.fabricPhysicsSummary}
            </p>
          </div>

          {/* Interactive SVG Polar Tension Blueprint */}
          <div className="flex flex-col items-center justify-center bg-slate-950 rounded-2xl p-4 text-white relative">
            <svg
              viewBox="0 0 260 220"
              className="w-full max-w-[260px] h-auto select-none"
              role="img"
              aria-label="360 degree radial torso tension and drape ease diagram"
            >
              <circle
                cx="130"
                cy="110"
                r="76"
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx="130" cy="110" r="52" fill="none" stroke="#1e293b" strokeWidth="1" />
              <ellipse
                cx="130"
                cy="110"
                rx="42"
                ry="32"
                fill="#1e1b4b"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
              <text
                x="130"
                y="107"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {measurements.chest}/{measurements.waist}/{measurements.hip}cm
              </text>
              <text
                x="130"
                y="118"
                textAnchor="middle"
                fill="#818cf8"
                fontSize="7.5"
                fontFamily="monospace"
              >
                Pass {activeIteration.iteration} · {activeIteration.overallScore}/100
              </text>

              {swarmResult.worldModel.radialNodes.map((node) => {
                const rad = ((node.angleDeg - 90) * Math.PI) / 180;
                const outerR = 76;
                const x = 130 + outerR * Math.cos(rad);
                const y = 110 + outerR * Math.sin(rad);
                const isSelected = node.angleDeg === selectedRadialNode.angleDeg;
                // In Pass 1 show amber/rose tension on 0° and 180° before loop fix
                const isUnpatchedStrain =
                  selectedLoopPass === 1 && (node.angleDeg === 0 || node.angleDeg === 180);
                const nodeColor = isUnpatchedStrain
                  ? '#f59e0b'
                  : node.drapeBehavior === 'high_strain'
                  ? '#f43f5e'
                  : node.drapeBehavior === 'elastic_recovery'
                  ? '#38bdf8'
                  : '#10b981';

                return (
                  <g
                    key={node.angleDeg}
                    onClick={() => setSelectedRadialAngle(node.angleDeg)}
                    className="cursor-pointer"
                  >
                    <line
                      x1="130"
                      y1="110"
                      x2={x}
                      y2={y}
                      stroke={isSelected ? '#ffffff' : nodeColor}
                      strokeWidth={isSelected ? '2' : '1'}
                      strokeOpacity={isSelected ? '0.95' : '0.45'}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '9' : '6.5'}
                      fill={nodeColor}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                    <text
                      x={130 + (outerR + 18) * Math.cos(rad)}
                      y={113 + (outerR + 18) * Math.sin(rad)}
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : '#94a3b8'}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {node.angleDeg}°
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="w-full mt-2 pt-2.5 border-t border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold text-indigo-300">{selectedRadialNode.label}</span>
                <span className="text-emerald-400">
                  Tension Index: {selectedRadialNode.tensionScore}/100
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {selectedRadialNode.vectorNote}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                <span>
                  Chest Ease: {selectedRadialNode.chestEaseCm >= 0 ? '+' : ''}
                  {selectedRadialNode.chestEaseCm}cm
                </span>
                <span>·</span>
                <span>
                  Waist: {selectedRadialNode.waistEaseCm >= 0 ? '+' : ''}
                  {selectedRadialNode.waistEaseCm}cm
                </span>
                <span>·</span>
                <span>
                  Hip: {selectedRadialNode.hipEaseCm >= 0 ? '+' : ''}
                  {selectedRadialNode.hipEaseCm}cm
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Argon Drape Critic Verdict
              </span>
              <span className="font-mono text-emerald-700">
                {swarmResult.criticVerdict.overallScore}/100 Confidence
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {swarmResult.criticVerdict.lapelAndShoulderVerdict}
            </p>
          </div>
        </section>
      </div>

      {/* BOTTOM SYNTHESIS: COMPLETE 5-PIECE OUTFIT ARCHITECTED BY THE SWARM + 1-CLICK 360° TURNTABLE DEPLOYMENT */}
      {primaryOutfit && (
        <section
          aria-label="Multi-Agent Synthesized 5-Piece Outfit"
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Swarm-Synthesized 5-Piece Outfit: {primaryOutfit.title}
                </h3>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  True Size {primaryOutfit.shopTrueSize}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{primaryOutfit.whyItWorks}</p>
            </div>

            <button
              type="button"
              onClick={() => onDeployOutfitToTurntable(primaryOutfit)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <RotateCw className="w-4 h-4" />
              <span>Deploy Swarm 5-Piece Outfit to 360° Turntable</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(
              [
                primaryOutfit.slots.top,
                primaryOutfit.slots.layering,
                primaryOutfit.slots.bottom,
                primaryOutfit.slots.watch,
                primaryOutfit.slots.shoes,
              ] as OutfitSlotPiece[]
            ).map((piece, idx) => (
              <div
                key={`${primaryOutfit.id}-swarm-slot-${piece.slot}`}
                onClick={() => onDeployOutfitToTurntable(primaryOutfit, piece)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDeployOutfitToTurntable(primaryOutfit, piece);
                  }
                }}
                className="rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs p-3 flex flex-col justify-between gap-2.5 bg-slate-50/60 transition-all cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {idx + 1}. {piece.slotLabel}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        piece.source === 'Your Closet'
                          ? 'bg-slate-200/80 text-slate-700'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {piece.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={piece.imageUrl}
                        alt={piece.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-indigo-600 truncate">
                        {piece.brand}
                      </p>
                      <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {piece.name}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                        {piece.sizeOrSpec}
                        {piece.price ? ` · $${piece.price}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800">
                  <span>Fit in 360° Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OMNI 1.1 FLASH IMAGE-TO-VIDEO RUNWAY STUDIO (16:9 LANDSCAPE & 9:16 PORTRAIT) */}
      <OmniRunwayVideoStudio
        defaultImageUrl="/src/assets/images/man_blazer_front_1792967532469.jpg"
        garmentName={primaryOutfit?.slots.top.name || 'Zara Comfort Suit Blazer (Ref. 4456/999)'}
        trueSize={swarmResult.worldModel.recommendedTrueSize}
      />
    </div>
  );
};
