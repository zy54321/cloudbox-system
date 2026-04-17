# 回执：双屏标点文字牌与单屏最终对齐（2026-04-17-03）

**日期**：2026-04-17

## 目标

- **`buildPocTextBillboardCanvas`**：绘制步骤与 **`CesiumViewport.vue` `buildUnitTextBillboardImage`** **逐值一致**（底板 **rgba(14, 44, 123, 0.58)**、边框 **rgba(42, 116, 201, 0.55)**、**glow** **strokeText** **rgba(0, 204, 255, 0.42)** **lineWidth=2.2**、最终 **fill** **rgba(235, 248, 255, 0.98)**）；移除黑底白描边那套独立色值。
- **`buildTextBillboardImagePoc` / `buildUnitTextBillboardImagePoc`**：保留两名，**内部仅**调用 **`buildPocTextBillboardCanvas`**，无第二套绘制。
- **`buildPointEntity`**：文字牌 **pixelOffset** 使用 **`getTextBillboardPixelOffsetFromUnitOffset(pointData.offset)`**（无 **offset** 时仍用 **(offset[1]??-28)+25**）。
- **`buildPointAircraftEntity`**：飞机降级为 **billboard（同 plane 图体系）+ path**；**aircraft__text** 偏移同上辅助函数（**`scenario.airplane.offset`**）；不再用 **point** 圆点作主表现。
- **`fetchEngineData`**：仅复核 **scale / (0,-8) / 文字 offset** 未被旧色常量覆盖，**不大改**逻辑。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_03_dual-iframe-marker-style-final-align_receipt.md`（本文件）

## 关键 diff 摘要

- 常量：**`UNIT_TEXT_PANEL_FILL` / `UNIT_TEXT_BORDER_STROKE` / `UNIT_TEXT_GLOW_*` / `UNIT_TEXT_FILL`** 替代原 **`TEXT_BG` / `TEXT_STROKE` / `TEXT_FILL`**；**canvas** 顺序与单屏一致（**无**额外白描边层）。
- 新增 **`getTextBillboardPixelOffsetFromUnitOffset`**，**mock 点**与**降级飞机**文字牌均复用。

## 刻意未做项

- **未**修改 **`scene-left.html` / `scene-right.html`**；**未**改 **compare postMessage 协议**；**未**改 **DynamicFlow / ViewerStage / CesiumViewport** 源码；**未**做独立测试验收。
