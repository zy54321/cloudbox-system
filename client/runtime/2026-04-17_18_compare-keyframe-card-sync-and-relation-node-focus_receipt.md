# 回执：compare 关键点卡片同步与链路节点 FOCUS_UNIT（E4A / 18）

**日期**：2026-04-17

## 目标

- **修复**双屏模式下右下角 **FloatingCard** 与关键时间点按钮（**`semanticToDemoT`** 的 demo 时间）不一致：**`getCurrentNodeIndexByTime`** 在 compare 下与 **`keyframeMarks.t`** 使用同一套阈值。
- **在**不新增第二套 card 状态的前提下，用 **`extra` 插槽**展示当前关键帧对应 **链路节点**按钮；点击 **`focusUnit`** 发 **`MSG_FOCUS_UNIT`**，子页 **`narrativeFlyToUnit`** 或 **`plane` → resetCameraHome**。
- **不改**时间压缩常量语义、**不改**全局 narrative 父页裁决模型、**不改**子页 **`scene.js`** 相机 fly 参数与既有 LOAD/PLAY/SCRUB/NARRATIVE 行为。

## 实际修改文件

- `src/pages/DynamicFlow.vue`
- `src/components/FloatingCard.vue`
- `src/utils/compareFrameProtocol.js`
- `src/utils/compareFrameBridge.js`
- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_18_compare-keyframe-card-sync-and-relation-node-focus_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicFlow**：compare 下 **`getCurrentNodeIndexByTime`** 阈值改为 **`semanticToDemoT(ti)`**；**`toSideCard`** 附带 **`activeRelations_yes/no`**；**`fetchDynamicCompareMaps`** 拉取 **`dynamicLinksUrl` + `engineFailureUnitsUrl`** → **`dynamicRelationMap` / `dynamicUnitMap`**；**`buildRelationNodeList`** + **`compareCurrentRelationNodesYes/No`**；双屏 **FloatingCard** **`#extra`** 渲染节点按钮、**`onCompareRelationNodeClick`** → **`bridge.focusUnit`**。
- **compareFrameProtocol / Bridge**：新增 **`MSG_FOCUS_UNIT`**、**`focusUnit(side, payload)`**。
- **scene.js**：**`handleFocusUnit`** 接 **`MSG_FOCUS_UNIT`**（**`plane`** → **`resetCameraHome`**，否则 **`narrativeFlyToUnit`**，不 flash / 不改 **`narrativeBusy`** / 不改播放状态）。
- **FloatingCard**：**`extra`** 外包一层 **`floating-card-extra`** 与最简分隔样式。

## 刻意未做项

- **未**修改 **`SEMANTIC_TIME_COMPRESS`** / 子页 **`narrativeT0`** 等时间模型。
- **未**修改父页 **`maybeStartGlobalNarrativeRound`**、**`NARRATIVE_DONE`** 闭环与 **`parentControlsNarrative`** 裁决策略。
- **未**调整 **`narrativeFlyToUnit`** 的 **duration / offset** 等相机参数；**未**改子页对 **unitsUrl / linksUrl** 的加载方式（父页映射仅服务 UI）。
