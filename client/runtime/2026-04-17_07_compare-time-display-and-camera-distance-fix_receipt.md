# 回执：双屏时间显示语义与相机距离（E3B / 07）

**日期**：2026-04-17

## 目标

- **父页**：双屏主时钟 **`currentTimeLabelYes/No`** 显示 **绝对 demo**，格式 **`T:{demo}s`**；**keyframeMarks** 的 **label/title** 为 **`10+{raw}s`**，点击 **`t = compareNarrativeBaseT + rawT`**；**`updateCompareMarkers`** 浮标与标题同步为 **`T:{demo}s`**。
- **`getCurrentNodeIndexByTime`**：compare 模式恢复 **`time >= compareNarrativeBaseT + ti`**（与本轮前 E4「语义反算」区分，仅修显示造成的错觉）。
- **scene.js**：**`resetCameraHome`** **HeadingPitchRange** **range 140→100**；**`narrativeFlyToUnit`** **range 110→55**（不改 **heading/pitch/duration/flyToBoundingSphere/flash**）。

## 实际修改文件

- `src/pages/DynamicFlow.vue`
- `src/components/TimelineDock.vue`
- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_07_compare-time-display-and-camera-distance-fix_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicFlow**：**`currentTimeLabelYes/No`**；**keyframeMarks** **`t`/文案**；**`getCurrentNodeIndexByTime`** 阈值；**`updateCompareMarkers`**；单屏 **`currentTimeLabel`** 改为含 **`T+`** 前缀以配合 **TimelineDock** 去前缀。
- **TimelineDock**：时钟按钮由 **`T+ {{ currentTimeLabel }}`** 改为 **`{{ currentTimeLabel }}`**，避免双屏出现 **`T+ T:…`**。
- **scene.js**：两处 **range** 数值调整。

## 刻意未做项

- **未**改 **scene.js** 叙事 **自动触发**阈值公式、**`planePathTimeFromDemoTime`**、**`getActiveRelationIdsAtTime`** 的语义链（仍随 **E4**）。
- **未**改 **compare 协议**、**scene-left/right.html**、**桥接**。
