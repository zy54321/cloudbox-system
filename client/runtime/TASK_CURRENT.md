# 当前任务状态（双 iframe compare）

**更新**：2026-04-17

## 本轮真实问题（E3J）：单侧 narrative 收尾与全局双屏分流

- **现象**：单侧播放仍由子页 **`playLoop`** 在 **`parentControlsNarrative=false`** 时自动触发 narrative；此前为全局双屏父页裁决移除了 **`finishNarrative`** 的本地 **auto-resume**，导致单侧模式下 narrative 结束后时间轴停住、不再继续。
- **修正策略**：按 **`parentControlsNarrative`** 分流收尾——**全局模式**（**`true`**）**只发 `MSG_NARRATIVE_DONE`**，不自恢复；**单侧模式**（**`false`**）在叙事正常结束时 **`narrativeResumePending`** 为真则 **恢复本地 `playLoop`**，**不**发 **`NARRATIVE_DONE`**。人工 **pause / reset / cancelNarrative / seek** 仍清除 **`narrativeResumePending`**，避免误续播。

## 当前判断：E3H — 父页唯一裁判的 narrative 闭环（ClosedLoop）

- **旧 barrier 模型已弃用**：不再在 **`onSideState`** 中按 **`narrativeBusy`** / 消息到达顺序去 **pause 对侧**。父页只做状态同步（**`tYes`/`tNo`**、**`playing*`**、**`narrativeBusy*`** 等观察字段）与 **`maybeStartGlobalNarrativeRound()`** 调度。
- **唯一 narrative 入口（全局双屏）**：全局自动播放下仅 **`maybeStartGlobalNarrativeRound()`** 可 **`pauseBoth` → `scrub(..., { silent: true })` → `runNarrative` / `runNarrativeBoth`**；**`firedMarkStepIndexYes/No`** 仅在子页 **`MSG_NARRATIVE_DONE`** 经 **`onNarrativeDone`** 显式落账；结束后 **`playBoth({ parentControlsNarrative: true })`** 恢复。
- **子页配合（分流）**：**`parentControlsNarrative=true`** 时 **`playLoop`** 不自动命中 narrative；**`finishNarrative`** 仅 **`MSG_NARRATIVE_DONE`**（有 **`stepIndex`** 时），**不**本地 **resume**。**`parentControlsNarrative=false`** 时子页可自动触发 narrative，**`finishNarrative`** **不**发 **`NARRATIVE_DONE`**，正常结束时本地 **auto-resume**。协议：**`RUN_NARRATIVE`** / **`NARRATIVE_DONE`**（见 **`compareFrameProtocol.js`** / **`compareFrameBridge.js`**）。
- **父页时间与关键点**：**`keyframeMarks.t`** 为 **`semanticToDemoT(rawT)`**；**`semanticAbsT`** 仍为 **`compareNarrativeBaseT + rawT`**；**`compareGlobalDisplayT`** 在 compare+global 下非 narrative 时为 **`max(tYes,tNo)`**，narrative 期间为 **`globalNarrativeRoundDemoT`**。
- **pre-play 链路门控（保留）**：子页 **`getActiveRelationIdsAtTime`** 在 **`externalScenarioActive && localTimeSec < narrativeT0 - 1e-6`** 时 **`return []`**，避免未播放先亮 **10+0.0s** 链路。

## 本轮关闭的四类旧残留（历史）

1. 子页 **`playLoop`** 在 compare **父页裁决**模式下的 **自动 narrative 触发**（由 **`parentControlsNarrative`** 门控）；**单侧模式**仍保留自动触发。
2. 子页 **`finishNarrative`** 在 **父页裁决**下 **不**自动 **resume**（**E3J** 恢复单侧下的 **auto-resume**）。
3. 父页关键点 **`t = base + rawT`** 的旧 **demo 时间**（已改为 **`semanticToDemoT(rawT)`**）。
4. 父页 **`onSideState`** 依赖 **barrier** 的 **事后 pause 对侧**。

## 历史：E3F — barrier 与 pre-base 门控

- 同刻 trigger、**`getActiveRelationIdsAtTime`** base 前门控等（已由 E3H 父页裁判模型替代 barrier 语义）。

## 历史：E3E / E3D / E3C / E3B / E4

- 叙事 busy 上报、语义时钟、关键点 active、demo/语义映射等。

## 历史：外层 split 已删（D2）

- 主应用双屏仅 **iframe + dual-iframe-poc**。
