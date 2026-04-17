# 回执：同刻 trigger 的 barrier 顺序修复与开播前链路门控（E3F / 11）

**日期**：2026-04-17

## 目标

- **Barrier**：重写「单侧 busy 停对侧」的判定，**不再依赖纯先后顺序**；以父页 **`toCompareSemanticAbsT`** 与 **`keyframeMarks`** 的 **语义绝对时间** 判断对侧是否**已到达自身下一关键点**（或已落在关键点上），避免 **`onSideState`** 逐条到达时**同刻 T** 误拦对侧。**双 busy 并发**、**先完成者等后完成者**（规则三）**总体语义**保留。
- **Pre-play 链路**：子页 **`getActiveRelationIdsAtTime`** 在 **base 前**硬门控，避免 **`localTimeSec=0`** 时 **`rawT=0`** 被当作已激活而提前显示 **10+0.0s** 链路。**`narrativeActiveRelationOverride`** 仍优先。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `src/pages/DynamicFlow.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_11_compare-trigger-order-fix-and-preplay-link-gate_receipt.md`（本文件）

## 关键 diff 摘要

- **scene.js**：**`getActiveRelationIdsAtTime`** 在 **`narrativeActiveRelationOverride`** 与空表检查之后，若 **`externalScenarioActive && localTimeSec < narrativeT0 - 1e-6`** 则 **`return []`**。
- **DynamicFlow.vue**：**`getNextPendingSemanticAbsT(side, demoT)`**（**`semanticAbsT > currentSemanticAbsT + 1e-6`** 的首个 mark）；**`isAtOwnSemanticKeyframe`** + **`shouldAllowBarrierPauseOther`** 供 **`syncCompareNarrativeBarrierFromSideState`** 规则一使用；barrier 判断一律经 **`toCompareSemanticAbsT`**，**不**直接用 **demo** 时间互比。

## 刻意未做项

- **未**改 **时间压缩模型**、**未**改关键时间点**显示文案**、**未**改**相机**逻辑。
- **未**改 narrative 过程中 **override** 与关键点叙事内部逻辑（仅 base 前误显示与父页 barrier 触发判定）。
