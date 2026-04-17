# 回执：compare 父页唯一裁判 narrative 闭环（E3H / 14）

**日期**：2026-04-17

## 目标

- 将 **双 iframe compare** 下的 **narrative 同步**收成 **父页唯一裁判** 的 **闭环**：子页在 **`parentControlsNarrative`** 下 **不**由 **`playLoop`** 自动进入 narrative；**`finishNarrative`** **不**再自动恢复播放，仅 **本地清理** 并 **`NARRATIVE_DONE`**；父页用 **`RUN_NARRATIVE`** 驱动 **`stepIndex` + `t`**，用 **`firedMarkStepIndex*`** 与 **`onNarrativeDone`** 恢复 **`playBoth`**。
- **关键点父页时间轴**：**`keyframeMarks.t`** 统一为压缩后的 **demo 时间**（**`semanticToDemoT(rawT)`**），**`semanticAbsT`** 仍为 **`compareNarrativeBaseT + rawT`**；全局播放时 **T:** 与 **关键点高亮** 以 **`compareGlobalDisplayT`** 为统一主时钟（含 narrative 轮次）。

## 实际修改文件

- `src/utils/compareFrameProtocol.js`（**`MSG_RUN_NARRATIVE`** / **`MSG_NARRATIVE_DONE`**）
- `src/utils/compareFrameBridge.js`（**`runNarrative`** / **`runNarrativeBoth`**、**`onNarrativeDone`**）
- `public/dual-iframe-poc/js/scene.js`（**`parentControlsNarrative`**、**`handleRunNarrative`**、**`playLoop`** 门控、**`finishNarrative`** 不发 resume、**`MSG_NARRATIVE_DONE`**）
- `src/pages/DynamicFlow.vue`（全局 narrative 状态、**`peekNextUnfiredMark`** + **`maybeStartGlobalNarrativeRound`**、**`onSideState`** / **`onNarrativeDone`**、**`keyframeMarks`**、**`compareGlobalDisplayT`**）
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_14_compare-parent-single-arbiter-closed-loop_receipt.md`（本文件）

## 关键 diff 摘要

- **协议与桥**：新增 **`RUN_NARRATIVE`**（父→子）、**`NARRATIVE_DONE`**（子→父）；桥接 **`runNarrative`/`runNarrativeBoth`**，**`onMessage`** 分发 **`onNarrativeDone`**；**READY** / **SIDE_STATE** 校验逻辑未改。
- **scene.js**：**`parentControlsNarrative`** 关闭 **`playLoop`** 自动 narrative；**`finishNarrative`** 去掉 **`setPlaying`/RAF resume**，**`postToParent(NARRATIVE_DONE, { stepIndex })`**；**`handleRunNarrative`** 对齐 **`payload.t`** 后 **`enterNarrativePauseForStep`**；**`getActiveRelationIdsAtTime`** 的 **base 前门控**保留。
- **DynamicFlow.vue**：移除旧 **barrier** 依赖；**`keyframeMarks`**：**`t = semanticToDemoT(rawT)`**，**`stepIndex`** 与 iframe **`scenarioStepRows`** 排序一致；**`maybeStartGlobalNarrativeRound`** 仅在 **全局播放** 且 **未在 narrative 轮** 时调度；**`onSideState`** 更新 **`compareGlobalDisplayT`**（narrative 轮用 **`globalNarrativeRoundDemoT`**）；**`onNarrativeDone`** 落账 **fired** 并在双侧 **pending** 清空后 **`playBoth({ parentControlsNarrative: true })`**；**`startGlobalPlayback`** 使用 **`parentControlsNarrative: true`**，**单侧播放** 使用 **`false`**。

## 刻意未做项

- **未**改 **手动 scrub** 语义（仍 **pause + seek**，**`RESET`** 等不变；**`silent` scrub** 不清 **firedNarrativeSteps** / 不 **resetCameraHome** 的约定保持由 scene 侧实现）。
- **未**改 **`scene-left.html` / `scene-right.html`** 等静态壳（若存在独立入口）。
- **未**改桥接对 **READY** / **SIDE_STATE** 的 **frameId** / **side** 校验规则。
- 本轮**只做一件事**：把 **compare narrative 同步模型**收成 **父页唯一裁判闭环**；不扩展业务 JSON、不调整时间压缩常数之外的叙事镜头细节。
