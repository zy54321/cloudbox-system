# 回执：bridge/source/frameId 硬隔离与父层收口（阶段0）

**日期**：2026-04-16

## 目标

- **`compareFrameBridge`**：处理 **READY / SIDE_STATE / MARKER_CLICK / MARKER_MOVE** 时同时满足 **`ev.source === windows[side]`**（注册侧窗口引用）与 **`payload.frameId === frameIds[side]`**；**父→子** 所有 **`postToSide`** 统一注入当前侧 **frameId**，忽略调用方传入的 **frameId**；**`[compare-bridge]`** 最小 accept/reject 日志（含 side、frameId、source 命中）。
- **`CompareIframeStage`**：确认 **leftSrc/rightSrc** 仅 **compare-left/right.html**；**`[compare-stage]`** 记录 **load：side + frameId + src + 左右 load 计数**。
- **`DynamicSceneFrame`**：保留 **`ev.source === window.parent`**；子→父消息经 **`postToParent`** 统一带 **frameId**。
- **`DynamicFlow`**：**`useIframeCompare && isCompare`** 下 **`onSideState`** 不进入 **`refreshAll`**；**marker** 经 bridge 仅更新浮层；**READY→push** 维持 **frame 对 + scenarioKey** 去重；**`[compare-obs]`** 输出 **iframeLoadCounts + bridgeDiag + pushLoadScenarioCount**。
- **路由注释**：明确 **`/dynamic/compare-frame`** 仅调试。

## 实际修改文件

- `src/utils/compareFrameBridge.js`
- `src/components/CompareIframeStage.vue`
- `src/pages/DynamicSceneFrame.vue`
- `src/pages/DynamicFlow.vue`
- `src/router/index.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_07_dual-iframe-bridge-hardening_receipt.md`（本文件）

## 关键 diff 摘要

- **Bridge**：**`validateChildMessage`**（source 注册侧 + frameId）；**`postToSide`** 剥离入参 **frameId** 后注入；**`iframeLoadCounts`**、**`diag` accept/reject**、**`getObservationSnapshot` / `setPushLoadScenarioCountGetter`**；**MSG_ERROR** 不走子消息硬校验。
- **CompareIframeStage**：**`[compare-stage]`**、左右 **load** 计数、dev 下 **compare-frame** 路径告警。
- **DynamicFlow**：**`onSideState`** 双 iframe 分支 **return**；**`onCompareBridgeMarkerClick/Move`**；**push** 后 **`[compare-obs]`**。
- **DynamicSceneFrame**：**parseSideFromLocation** / **onParentMessage** 注释。

## 刻意未做项

- 未写测试执行与人工验收结果。
- 未改动单屏 **splitMode**、全页样式与链路动画细节。
- 未再改双独立 HTML 入口结构。
