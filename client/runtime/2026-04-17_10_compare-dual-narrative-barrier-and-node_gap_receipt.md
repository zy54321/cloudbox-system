# 回执：双侧 narrative 屏障升级与节点闪烁后间隔（E3E / 10）

**日期**：2026-04-17

## 目标

- **屏障语义**：从「单侧 narrative 时另一侧一律等待」升级为 **双侧可并发 narrative**；**双 busy** 时 **叙事优先于等待**，不额外 pause 任一侧、避免因旧状态误触发 resume/pause **抖动**。
- **先完等待后完**：一侧 narrative 已结束并恢复播放、对侧仍在 narrative 时，**pause 先结束侧**，直至 **双不 busy** 再按 **`pausedByBarrier*` + `playing*`** 解除并 **play**。
- **节点节奏**：**`flashBillboardLabelThrice`** 完成后，若仍有下一节点，**延迟 1s** 再进入 **`afterAllNodes(nodeIdx+1)`**；最后一节点保持原收尾；**不**改三次闪烁本身（200ms toggle × 6）。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `src/pages/DynamicFlow.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_10_compare-dual-narrative-barrier-and-node_gap_receipt.md`（本文件）

## 关键 diff 摘要

- **scene.js**：**`postSideState` / `postSideStateThrottled`** 的 **`SIDE_STATE`** payload 含 **`narrativeBusy: !!narrativeBusy`**（消息类型与 compare bridge channel 不变）。**`runNarrativeSequence`**：**`hasNext`** 时在 flash 回调内 **`setTimeout(..., 1000)`** 再 **`afterAllNodes(nodeIdx+1)`**，否则直接 **`afterAllNodes(nodeIdx+1)`**（末节点仍走原 **`finishNarrative`** 路径）。
- **DynamicFlow.vue**：**`pausedByBarrierLeft/Right`** 与 **`narrativeBusyLeft/Right`**；**`onSideState`** 同步 **`narrativeBusy`** 与各侧 **`playing`/进度/时间**；**`syncCompareNarrativeBarrierFromSideState`** 实现规则一至四；**`clearCompareNarrativeBarrierState`** 清空四类 ref；全局播放相关入口调用 **`clearCompareNarrativeBarrierState`**。

## 刻意未做项

- **未**修改关键点 **触发阈值**、**时间轴/时间显示语义**、**路径与 demo 时间映射**。
- **未**改变 **`flashBillboardLabelThrice`** 内部闪烁次数或间隔；**未**改变 **`narrativeFlyToUnit`** 等飞行方式。
