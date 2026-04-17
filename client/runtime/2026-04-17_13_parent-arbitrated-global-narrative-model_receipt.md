# 回执：父页统一裁决全局 narrative 模型（E3H / 13）

**日期**：2026-04-17

## 目标

- **同步模型切换**：放弃「子页 playLoop 先自动进 narrative、父页用 barrier 事后协调」；改为「**父页裁决触发**、子页**只执行** narrative、**正常结束显式 `NARRATIVE_DONE`**」。
- **子页**：**`parentControlsNarrative`** 为 true 时 **playLoop 不**再自触发 narrative；**`RUN_NARRATIVE`** 对齐 **`triggerDemoT`** 后按 **`stepIndex`** 取 **`scenarioStepRows[stepIndex]`** 进入既有流程；**`finishNarrative`** 末尾 **`NARRATIVE_DONE`**（**`cancel`/`reset`/`pause` 路径不发**）。
- **父页**：**`globalNarrativeRunning` / `globalNarrativePending*` / `globalNarrativeStepIndex*` / `globalFiredNarrative*`**；**`getNextPendingMark(side)`**；**`maybeStartGlobalNarrativeRound()`**；**`onSideState`** 仅更新 UI 与时间，在 **`!globalNarrativeRunning`** 且全局播放时尝试启动一轮；**`keyframeMarks`** 增加 **`stepIndex`/`rawT`**（与 iframe 排序一致）。

## 实际修改文件

- `src/utils/compareFrameProtocol.js`
- `src/utils/compareFrameBridge.js`
- `src/pages/DynamicFlow.vue`
- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_13_parent-arbitrated-global-narrative-model_receipt.md`（本文件）

## 关键 diff 摘要

- **协议**：**`MSG_RUN_NARRATIVE`**、**`MSG_NARRATIVE_DONE`**（既有 PLAY/PAUSE/SCRUB 等结构不变）。
- **Bridge**：**`runNarrative` / `runNarrativeBoth`**；**`onNarrativeDone`** 回调。
- **scene.js**：**`parentControlsNarrative`**；**`handleRunNarrative`**；**`enterNarrativePauseForStep(..., narrativeSemanticAbsT, stepIndex)`**；**`postSideState`** 含 **`narrativeSemanticAbsT`**；**`getActiveRelationIdsAtTime`** 的 **base 前**门控 **保留**。
- **DynamicFlow**：移除 **`syncCompareNarrativeBarrierFromSideState`** 与 **`pausedByBarrier*`**；**`LOAD_SCENARIO`/`playBoth`/`play`** 携带 **`parentControlsNarrative`**（全局 true，单侧 play false）。

## 刻意未做项

- **未**改时间**压缩**与关键点**显示**文案、**未**改**相机**逻辑。
- **未**将**手动 scrub / 关键帧点击**纳入父页裁决（仅**全局自动播放**走新路径）；**未**继续修补旧 barrier 条件分支。
