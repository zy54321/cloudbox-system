# 回执：demo time 与语义时间统一（E4 / 06）

**日期**：2026-04-17

## 目标

- **父页**：引入 **`SEMANTIC_TIME_COMPRESS = 10`** 与 **`semanticToDemoT` / `demoToSemanticAfterBase`**；主时钟只显示 **demo**；关键点 **marks** 文案为 **10+语义**，点击值为 **`semanticToDemoT(raw)`**；**`getCurrentNodeIndexByTime`**、**`updateCompareMarkers`** 在对比模式下用 **语义** 与 **raw** 比较。
- **scene.js**：**`state.currentTime`** 明确为 **demo**；补充 **`demoToSemanticAfterBase` / `semanticAfterBaseToDemoT`**；叙事跨越、**`getActiveRelationIdsAtTime`** 与 **raw** 对齐；**`planePathTimeFromDemoTime`**（原 **`planePathTimeFromSceneTime`**）叙事后段用语义推进弧长；**`handleScrub`** 仍收 **demo**；**`postSideState`** 仍发 **`timelineT`**，**未**扩 **`semanticT`**。

## 实际修改文件

- `src/pages/DynamicFlow.vue`
- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_06_demo-time-vs-semantic-time-unification_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicFlow**：**`SEMANTIC_TIME_COMPRESS`**、双映射函数；**keyframeMarks** 的 **`t`**、**label/title**；**currentTimeLabelYes/No`** 为 **`tYes`/`tNo` 的 demo 字符串**；节点索引与浮标 **语义** 展示。
- **scene.js**：**`SEMANTIC_TIME_COMPRESS`**；**`playLoop`** 叙事触发 **`trigDemo = narrativeT0 + raw/SEMATIC_TIME_COMPRESS`**；**`getActiveRelationIdsAtTime`** 在正式场景下用 **`rawT <= demoToSemanticAfterBase(local)`**；航迹 **`planePathTimeFromDemoTime`** 叙事后 **`sem * (POST_CLIMB/SEMATIC_TIME_COMPRESS)`**（与旧 **`(demo-narrativeT0)*POST_CLIMB`** 等价）。

## 刻意未做项

- **未**修改 **compare 协议** 字段集合（**未**加 **`semanticT`**）、**scene-left/right.html**、**compareFrameBridge** 外层桥接。
- **未**改 **CesiumViewport**、单屏非对比时间轴行为（**`getCurrentNodeIndexByTime`** 在非 **compare** 仍为 **`time` 与 raw 直接比**）。
