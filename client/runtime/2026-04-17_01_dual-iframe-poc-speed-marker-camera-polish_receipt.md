# 回执：dual-iframe-poc 巡航倍率 / 标点 / 叙事相机（2026-04-17-01）

**日期**：2026-04-17

## 目标

- **`playLoop`**：在计算 **`nextTime`** 时使用 **`POC_PLAYBACK_RATE`**（默认 **0.5**），使巡航时间推进为原速一半且**全程恒定**；**不**改叙事触发与 **`narrativePause` / `finishNarrative`** 路径。
- **标点**：引入集中样式常量；实现 **`buildTextBillboardImagePoc` / `buildUnitTextBillboardImagePoc`**（共用 canvas 生成）；**`buildPointEntity`**、**`fetchEngineData` 单元**、点状飞机名称等改为 **图标 billboard + 文字 billboard**；飞机模型侧 **plane billboard** 的 **scale / pixelOffset** 对齐单屏常用值。
- **`narrativeFlyToUnit`**：将 **range** 从 **220** 改为 **110**（**heading/pitch** 不变）。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_01_dual-iframe-poc-speed-marker-camera-polish_receipt.md`（本文件）

## 关键 diff 摘要

- **`POC_PLAYBACK_RATE`**：**`nextTime = state.currentTime + dt * POC_PLAYBACK_RATE`**（仍 **`Math.min(..., state.duration)`**）。
- **文字纹理**：圆角底板 **`TEXT_BG`**，描边 **`TEXT_STROKE`**，填充 **`TEXT_FILL`**，与单屏 **canvas 标签**思路一致。
- **引擎单元**：**`engineUnitEntities[id]`** 为图标；**`engineUnitEntities[id + '__text']`** 为文字；**`flashBillboardLabelThrice` / `cancelNarrativeSequence`** 同步两者 **show**。

## 刻意未做项

- **未**修改 **`scene-left.html` / `scene-right.html`**；**未**改 **compare postMessage 协议**；**未**改 **DynamicFlow / ViewerStage / CesiumViewport**；**未**执行自动化测试或正式验收结论。
