# 回执：三段式爬升路径、叙事 flyToBoundingSphere 与 scrub/marks 对齐（E3 / 05）

**日期**：2026-04-17

## 目标

- **A**：**`planePathTimeFromSceneTime`** 采用 **8s 爬升过场 + 2s 叙事前巡航 + 叙事后慢速匀速**（**`POST_CLIMB_PLANE_SPEED_RATE = 0.75`**），保留 **`narrativeT0`**、**`cruisePathProgressU`** 作为叙事起点路径锚点。
- **B**：**`narrativeFlyToUnit`** 改为 **`viewer.camera.flyToBoundingSphere`**（**`BoundingSphere(c3,1)`**、**duration≈0.85**、**HeadingPitchRange(0,-32°,range)**），保留 **`trackedEntity = undefined`**，不改动节点闪烁逻辑。
- **C**：**`handleScrub`** 在 **`seekToTime`** 之后 **`resetCameraHome()`** + **`requestRender`** + **`postSideStateThrottled`**；手动 scrub 不进入叙事序列。
- **D**：**`DynamicFlow.vue`** 双屏关键点 **marks**：**`t = compareNarrativeBaseT(10) + rawT`**；**label/title** 仍为 **T+ raw**；**`currentTimeLabel` / 浮标** 展示 **raw**，**`getCurrentNodeIndexByTime`** 在对比模式下用 **10+raw** 与父时间轴对齐。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `src/pages/DynamicFlow.vue`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_05_dual-iframe-climb-phase-scrub-and-flyto-refine_receipt.md`（本文件）

## 关键 diff 摘要

- **scene.js**：新增 **`INTRO_CLIMB_SCENE_SECONDS` / `PRE_NARRATIVE_CRUISE_SECONDS` / `POST_CLIMB_PLANE_SPEED_RATE`**；重写 **`planePathTimeFromSceneTime`**（三段 lerp + 叙事后匀速）；**`narrativeFlyToUnit`** 使用 **`flyToBoundingSphere`**；**`handleScrub`** 追加 **`resetCameraHome`**；**`postSideState().pathProgress`** 仍基于 **`planePathTimeFromSceneTime`**。
- **DynamicFlow.vue**：**`compareNarrativeBaseT`**；**`keyframeMarks`** 的 **`t`** 与 **raw 文案** 分离；**`currentTimeLabelYes/No`** 与 **marker 标签** 展示 **raw**；**`getCurrentNodeIndexByTime`** 在对比模式下使用 **base+raw** 阈值。

## 刻意未做项

- **未**修改 **compare 协议**、**`scene-left/right.html`**、**`compareFrameBridge.js`** 等外层 iframe 桥接。
- **未**改 **marker 样式体系**（仅时间与 scrub 语义）、**`narrativeFlyToUnit` 之外的 chase/home/keyframe** 相机链。
