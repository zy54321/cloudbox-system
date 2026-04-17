# 回执：双 iframe 链路归属与单侧 props 分流（08）

**日期**：2026-04-16

## 目标

- **`CesiumViewport`**：`splitMode=false` 时增加 **`activeRelationIds` / `activeUnitClusterIds`**，与 legacy **`visibleRelationIdsLeft|Right`** 分流；**`updateLinkVisibility`** 拆为 **split / non-split** 两条路径，去除 non-split 下「单屏以左侧为准」及 **`visibleRelationIdsRight`** 参与 **`show`** 的逻辑。
- **`DynamicSceneFrame`**：模板仅传 **`active-relation-ids` / `active-unit-cluster-ids`**；脚本用 **`activeRelationIds` / `activeUnitClusterIds`** 替代 **`idsLeft`/`idsRight`/`unitsLeft`/`unitsRight`**；**`handlePause`** 在 idle 后 **`relOverride=null` + `applyVisibility` + `postSideState`**；**`beginStageForStep`** 将 **`clearDrawnRelationLinks` + `setPlaneCameraFollow(true)`** 推迟到 **`flight_resume` 前**（及 idle/结束分支），叙事聚焦全程保持链路可见。

## 实际修改文件

- `src/components/CesiumViewport.vue`
- `src/pages/DynamicSceneFrame.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_08_dual-iframe-link-ownership-cleanup_receipt.md`（本文件）

## 关键 diff 摘要

- **CesiumViewport**：新增 **`collectActiveRelationIdsForNonSplit`**；**`removeAllPlaneRelationLinkEntities`**；**`updateLinkVisibilitySplitMode` / `updateLinkVisibilityNonSplit` / `updateLinkVisibility`**；non-split 下 **`activeRelationIds` 非空优先**，否则 **legacy `visibleRelationId` / `visibleRelationIdsLeft`**；**`updateUnitEntitiesVisibility`** 在 non-split 且 **`activeUnitClusterIds` 非空** 时按单集合过滤簇，并扩展 **plane-** 单元高亮所依据的 relation 列表；**watcher** 增加 **`activeRelationIds` / `activeUnitClusterIds`**。
- **DynamicSceneFrame**：**`applyVisibility` / `handleSetActiveRelations` / 模板绑定** 全面切到 **`active*`**；**`beginStageForStep`** 去掉聚焦结束处的过早清理与跟飞恢复；**`handlePause`** 补 **`relOverride` 清空与可见性重算**。

## 刻意未做项

- 未执行自动化测试，未写验收结论。
- 未改 **`DynamicFlow`** / **`ViewerStage`** 的 legacy 传参（仍走 **`visibleRelationIds*`**）；未改 **public `dual-iframe-poc` 静态 `scene.js`**。
- 未消除 **`beginStageForStep` 内** `applyVisibility` 触发的 **`updateLinkVisibility`** 与 **手动 `drawPlaneRelationLinks`** 的潜在重复绘制（沿用既有编排结构）。
