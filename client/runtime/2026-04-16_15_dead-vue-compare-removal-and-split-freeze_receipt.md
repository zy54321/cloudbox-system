# 回执：废弃 Vue 双屏链路删除与 split 入口冻结（15）

**日期**：2026-04-16

## 目标

- **正式双屏**统一为 **`public/dual-iframe-poc/scene-*.html`**；**`CompareIframeStage`** 注释、DEV 校验与真实 **src** 一致，并标明 **Vue compare 多页已废弃**。
- **删除**错误路线产物：**`compare-left/right.html`**、**`src/compare-left.js`** / **`compare-right.js`**、**`DynamicSceneFrame.vue`**、**`compareFrameContext.js`**；**路由**去掉 **`/dynamic/compare-frame`**；**Vite** 去掉多页入口，仅 **`index.html`**。
- **`DynamicFlow`**：**`useIframeCompare`** 改为**常量 `true`**，去掉 **`VITE_USE_IFRAME_COMPARE`** 与「可切回 split」类说明。
- **`ViewerStage` / `CesiumViewport`**：仅**注释纠偏**（iframe 正式 vs legacy split 已冻结），**不**删 split 实现代码。

## 实际修改文件

- `src/components/CompareIframeStage.vue`
- `src/router/index.js`
- `vite.config.js`
- `src/pages/DynamicFlow.vue`
- `src/components/ViewerStage.vue`
- `src/components/CesiumViewport.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_15_dead-vue-compare-removal-and-split-freeze_receipt.md`（本文件）

## 删除的文件

- `compare-left.html`、`compare-right.html`
- `src/compare-left.js`、`src/compare-right.js`
- `src/pages/DynamicSceneFrame.vue`
- `src/utils/compareFrameContext.js`

## 关键 diff 摘要

- **CompareIframeStage**：**`buildCompareFrameSrc`** 仍为 **`dual-iframe-poc/scene-left|right.html`**；DEV 下仅在校验路径**非**预期 **`scene-(left|right).html`** 时 **`console.warn`**；移除与 **compare-left/right、compare-frame** 相关的旧误导性 warning。
- **Router**：仅 **`/`**、**`/dynamic`** 两路由。
- **Vite**：**`rollupOptions.input`** 仅 **`main: index.html`**。
- **DynamicFlow**：**`const useIframeCompare = true`**，脚本内原 **`.value`** 全部改为布尔常量用法。

## 刻意未做项

- **未**物理删除 **`CesiumViewport` / `ViewerStage` / `DynamicFlow`** 内部的 **split**（**`splitMode=true`** 双视口）实现与模板分支，仅通过 **`useIframeCompare === true`** **冻结入口**，避免误伤单屏、iframe 桥接与 **`scene.js`** 已跑通逻辑；**split 代码级删除**留待**后续单独一轮**。
