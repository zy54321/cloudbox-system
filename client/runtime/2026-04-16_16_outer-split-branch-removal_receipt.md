# 回执：外层 legacy split 分支删除（16）

**日期**：2026-04-16

## 目标

- 在 **`const useIframeCompare === true`** 前提下，删除 **DynamicFlow** 中已不可达的 **split 时间轴浮层**（`#compare-overlays`）、**`vpCompare` / `bindVpCompare`** 及相关 **else** 分支。
- 删除父页面内 **仅服务旧 split 的 RAF / `setInterval` 沿线模拟**（`runGlobalFlightLoop`、`runLeftFlightLoop`、`runRightFlightLoop` 及 `tick*Scene` / `start*SceneTimer`），保留 **iframe 桥接**（`pushLoadScenarioToIframes`、`onSideState`、`playBoth` / `scrub` / `reset` 等）行为。
- **ViewerStage**：去掉 **双 Cesium split** 模板与 **仅 split 用的 props**（`useIframeCompare`、`bindVpCompare`、`left/right` 模型、`splitPosition` 等），**仅保留**单屏 **`CesiumViewport`** + **`CompareIframeStage`**。
- **CesiumViewport**：**不删** `splitMode` 实现；增加 **D3 候选清单**注释，供后续轮次处理。

## 实际修改文件

- `src/pages/DynamicFlow.vue`
- `src/components/ViewerStage.vue`
- `src/components/CesiumViewport.vue`（仅增加 D3 盘点注释块）
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_16_outer-split-branch-removal_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicFlow**：移除 **`useIframeCompare`** 变量与全部条件分支；**`shouldGateSceneInCompare`** 改为依赖 **`playingGlobal` / `playingLeft` / `playingRight`** 与 **pathProgress**（来自 iframe **`onSideState`**）；**`stopAllCompareFlightAndScene`** 简化为 **pauseBoth** + 重置播放态。
- **ViewerStage**：对比模式仅渲染 **iframe** 槽位；**props** 收口为单屏 + compare 所需字段。
- **CesiumViewport**：在 **`defineProps` 后**增加 **D3 候选**说明，**无**逻辑删除。

## 刻意未做项

- **未**删除 **`CesiumViewport.vue`** 内部 **`splitMode=true`** 的链路同步、双模型、**`splitPosition`** 等实现；**未**改动 **`public/dual-iframe-poc/js/scene.js`** 与 **compare 协议**。
