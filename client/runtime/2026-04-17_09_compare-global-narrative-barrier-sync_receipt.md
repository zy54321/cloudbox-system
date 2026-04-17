# 回执：全局叙事屏障与 narrativeBusy 上报（E3D / 09）

**日期**：2026-04-17

## 目标

- **scene.js**：**`postSideState`** 在原有 **`timelineT` / `pathProgress` / `playing`** 上增加 **`narrativeBusy: !!narrativeBusy`**（不新设消息类型）。
- **DynamicFlow**：**`narrativeBusyLeft` / `narrativeBusyRight`**、**`compareNarrativeBarrierSide`**；**`onSideState`** 同步 busy 与播放态后调用 **`syncCompareNarrativeBarrierFromSideState`**：全局播放时一侧叙事且对侧仍在播则 **pause** 对侧；叙事结束且满足条件则 **play** 等待侧并清屏障；**`stopAllCompareFlightAndScene` / `startGlobalPlayback` / `pauseGlobalPlayback` / `startSidePlayback` / `resetCompareSide`** 等调用 **`clearCompareNarrativeBarrierState`**。**`playingGlobal`** 语义不变。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `src/pages/DynamicFlow.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_09_compare-global-narrative-barrier-sync_receipt.md`（本文件）

## 关键 diff 摘要

- **scene.js**：**`postSideState`** payload 增加 **`narrativeBusy`**。
- **DynamicFlow**：屏障与 **`onSideState`** 联动；**`clearCompareNarrativeBarrierState`** 在多处播放/复位入口调用。

## 刻意未做项

- **未**改 **scene.js** 关键点**触发**与 **SEMANTIC_TIME_COMPRESS** 等时间模型。
- **未**改 **compareFrameProtocol** 消息枚举；仅扩展 **`SIDE_STATE`** payload 字段。
- **未**改 **`shouldGateSceneInCompare`**、**时间标签**、**keyframe active** 与阈值逻辑。
