# 回执：第一次关键时间点链路同步时序（12）

**日期**：2026-04-16

## 目标

- **`DynamicSceneFrame.beginStageForStep`**：在 **`phase='relation_reveal'`**、**`currentStageStepIndex=stepIndex`**、**`applyVisibility()`** 之后 **`await nextTick()`**，再视情况调用 **`vpRef.requestRender()`**，使 **`activeRelationIds` / `activeUnitClusterIds`** 先下发到 **`CesiumViewport`** 并完成 watcher 驱动的 **`syncRelationsFromActiveIds`**，再进入 **`node_focus_sequence`**。
- **调试**：**`syncRelationsFromActiveIds`** 内 **`[compare-link-sync]`**；**`beginStageForStep` / `handlePause`** 内 **`[compare-stage]`**（phase、sceneT、step 或 currentStageStepIndex、**`applyVisibility` 后** 的 **activeRelationIds**）。
- **`getPlanePosition`**：优先 **`modelEntity.position.getValue(viewer.clock.currentTime)`**，成功则回写 **`planePositionCartesian`**，否则再回退缓存 / **`planeEntity`**。

## 实际修改文件

- `src/pages/DynamicSceneFrame.vue`
- `src/components/CesiumViewport.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_12_compare-link-first-sync-timing-fix_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicSceneFrame**：**`beginStageForStep`** 在 **`applyVisibility`** 与切到 **`node_focus_sequence`** 之间增加 **`nextTick` + `requestRender`（若存在）**；**`[compare-stage]`** 日志；**`handlePause`** 在 **`applyVisibility`** 后 **`[compare-stage]`**。
- **CesiumViewport**：**`removeAllPlaneRelationLinkEntities`** 返回移除数量；**`syncRelationsFromActiveIds`** 打 **`[compare-link-sync]`**（formal ids、含 plane 的 active 数量、移除数、**anyShown**）；**`getPlanePosition`** 优先级调整。

## 刻意未做项

- **不做测试执行、不做最终验收结论**；本轮仅验证 **第一次关键时间点同步时序** 假设。
- 未改 **`requestRenderMode`** 全局策略；未扩散日志到 **`DynamicFlow`** / 静态 PoC **`scene.js`**。
