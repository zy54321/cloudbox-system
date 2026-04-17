# 回执：PoC 关键时间点真实暂停式叙事编排（14）

**日期**：2026-04-16

## 目标

- **`scene.js`**：关键时间点命中后**不再**用 **`narrativeBusy` + 继续 `requestAnimationFrame(playLoop)`** 充当暂停；改为 **`enterNarrativePauseForStep`**：**`setPlaying(false)` + `stopPlayLoop()`**，再按固定顺序进入叙事（**busy → override → `updateSceneForTime` → `requestRender` → 节点序列**）。
- 引入 **`narrativeResumePending`**：叙事**正常结束**且**未被用户 `pause()` 清掉**时，才 **`setPlaying(true)` + `lastPlayMs=0` + `requestAnimationFrame(playLoop)`**。
- **`finishNarrative`**：清理定时器、**`narrativeBusy` / override**、**`updateSceneForTime` + `requestRender`**，再按 **`narrativeResumePending`** 决定是否恢复播放。
- **`pause()`**：在原有 **`cancelNarrativeSequence` / `setPlaying(false)` / `stopPlayLoop`** 之外**显式** **`narrativeResumePending=false`**，保证用户暂停优先级最高。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_14_poc-narrative-real-pause-refactor_receipt.md`（本文件）

## 关键 diff 摘要

- **`playLoop`**：命中步骤行触发点后 **`enterNarrativePauseForStep(srow)`** 并 **`return`**，**不**再挂下一帧 RAF；**删除**原 **`narrativeBusy`** 分支中对 **`playLoop` 的自递归。
- **原 `beginNarrativeForStep`** 拆为 **`enterNarrativePauseForStep`**（真实暂停 + 叙事入口顺序）与 **`runNarrativeSequence`**（聚焦/闪烁序列 + **`finishNarrative`** 恢复逻辑）。

## 刻意未做项

- **不**修改 **`src/pages/DynamicSceneFrame.vue`**、**`CesiumViewport.vue`** 等 Vue compare 子页；**不**改 split 模式与链路 JSON 结构；**不**在本轮对 **`getActiveRelationIdsAtTime` / `updateEngineLinkPositions` / `narrativeFlyToUnit` / `flashBillboardLabelThrice`** 做算法级重写，仅调整**关键时间点暂停与恢复状态机**。
