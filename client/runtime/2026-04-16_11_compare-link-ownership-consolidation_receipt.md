# 回执：动态双屏链路 ownership 收口（11）

**日期**：2026-04-16

## 目标

- **动态双屏**：`DynamicSceneFrame` 只做播放编排与 **`activeRelationIds` / `activeUnitClusterIds`**，**删除**本文件内所有 **`drawPlaneRelationLinks` / `clearDrawnRelationLinks` / `lastDrawnRelationIds`** 及对 **`removeLinkEntitiesForRelation`** 的间接依赖。
- **CesiumViewport**：**`splitMode=false`** 正式链路以 **`syncRelationsFromActiveIds`**（基于 **`getFormalRelationIdsNonSplit`**：优先 **`activeRelationIds`**，否则仅回退 **`visibleRelationId`** 供 StaticHome 类单 id 页）与 **`syncUnitHighlightsFromActiveIds`**（**`activeUnitClusterIds`**）为唯一收口；**`splitMode=true`** 单独封装为 **legacy split**，与 iframe 主路径隔离。
- **分层**：正式链路实体标记 **`linkTier: formal-plane-dynamic` / `formal-static`**；**`removeLinkEntitiesForRelation`** 标为内部遗留/粗暴路径，**`defineExpose` 不再导出** `drawPlaneRelationLinks` / `removeLinkEntitiesForRelation`。
- **ViewerStage**：单屏 **`CesiumViewport`** 增加 **`active-relation-ids`**（=`effectiveIdsLeft`）与 **`active-unit-cluster-ids`**（左右簇 id 去重合并），保证 **`DynamicFlow`** 仍无需改模板即可驱动正式 id。

## 实际修改文件

- `src/pages/DynamicSceneFrame.vue`
- `src/components/CesiumViewport.vue`
- `src/components/ViewerStage.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_11_compare-link-ownership-consolidation_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicSceneFrame**：**`cancelOrchestration`** 不再清链路；**`beginStageForStep`** 仅 **`applyVisibility` + 相机/聚焦序列**，进入 **`flight_resume` / idle** 时 **`applyVisibility`** 驱动链路关闭；移除 **`lastDrawnRelationIds`** 与 **`clearDrawnRelationLinks`**。
- **CesiumViewport**：**`syncRelationsFromActiveIds`** / **`syncUnitHighlightsFromActiveIds`**；**`updateUnitEntitiesVisibilitySplitLegacy`**；**`visibleRelationId` watch** 不再 **`removeLinkEntitiesForRelation` / `drawPlaneRelationLinks`**；**`loadGlbModelEntity`** 非 split 时走 **`syncRelationsFromActiveIds`**；**`defineExpose`** 去掉链路直接操作 API。
- **ViewerStage**：单屏注入 **`activeRelationIds` / `activeUnitClusterIds`**。

## 刻意未做项

- **本轮不做测试、不做最终验收判断**；仅做 **ownership 收口与路径去混杂**。
- 未改 **`public/dual-iframe-poc/js/scene.js`**；未将 **`removeAllPlaneRelationLinkEntities`** 改为仅按 **`linkTier`** 删除（仍为「含 plane 的 LINK 集合」策略）。
- 未要求 **`StaticHome`** 模板显式增加 **`active-relation-ids`**（依赖 **`visibleRelationId` 回退**）。
