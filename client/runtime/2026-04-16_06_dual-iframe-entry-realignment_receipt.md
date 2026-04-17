# 回执：双独立页面入口与 PoC 对齐（阶段0）

**日期**：2026-04-16

## 目标

- **停止**以 **`/dynamic/compare-frame?side=…&frameId=…`** 经 **vue-router resolve** 作为双屏 iframe 的正式子页入口。
- **新增** Vite 多页 **`compare-left.html` / `compare-right.html`**，各配 **最小 bootstrap**（`compare-left.js` / `compare-right.js`）：只 **`createApp(DynamicSceneFrame)`** + **`provide`** 侧别 + Cesium/样式依赖，**不经 `App.vue`、`DynamicFlow.vue`、主路由切换**。
- **`CompareIframeStage`**：左右 iframe **`src` 固定**为上述静态入口，仅附加 **`frameId`** query；延续稳定 **`frameId` ref** 与单次赋值策略。
- **`DynamicSceneFrame`**：保留既有沿线飞行、链路绘制、节点聚焦等本地播放器逻辑；**侧别**来自 **`COMPARE_FRAME_SIDE_KEY` inject**（独立页）或 **`route.query` / URL**（主应用内调试路由）；**脱离主 SPA 作为唯一正式入口**。
- **通信**：延续 **`compareFrameProtocol` / `compareFrameBridge`**，仅适配新 URL。
- **`/dynamic/compare-frame`**：保留为 **开发调试**，注释标明非正式双屏依赖。

## 实际修改文件

- `compare-left.html`、`compare-right.html`
- `src/compare-left.js`、`src/compare-right.js`
- `src/utils/compareFrameContext.js`（新建）
- `vite.config.js`（`build.rollupOptions.input` 多页入口）
- `src/components/CompareIframeStage.vue`
- `src/pages/DynamicSceneFrame.vue`
- `src/router/index.js`（compare-frame 注释）
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-16_06_dual-iframe-entry-realignment_receipt.md`（本文件）

## 关键 diff 摘要

- **Vite**：**`index.html` + `compare-left.html` + `compare-right.html`** 三入口参与 **`rollupOptions.input`**。
- **CompareIframeStage**：**`buildCompareFrameSrc`** 改为 **`new URL('compare-left.html'|'compare-right.html', origin + base)`** + **`frameId`**；移除 **`useRouter` / `router.resolve`**。
- **DynamicSceneFrame**：**`inject(COMPARE_FRAME_SIDE_KEY)`** 与 **`useRoute()`**（无 Router 时为 **undefined**，回退 **URL**）共同解析 **侧别** 与 **frameId**。
- **Router**：**`/dynamic/compare-frame`** 标注为调试用。

## 刻意未做项

- 未写测试执行与人工验收结果。
- 未改动单屏 **`splitMode`** 与 **`DynamicFlow`** 内既有命令桥接以外的逻辑。
- 未在 **`/dynamic/compare-frame`** 上继续堆业务补丁；未重做 postMessage 协议。
