# 回执：compare 语义时钟、关键点 active 与相机距离（E3C / 08）

**日期**：2026-04-17

## 目标

- **父页**：**`toCompareSemanticAbsT(demoT)`**；**`currentTimeLabelYes/No`**、**`updateCompareMarkers`** 显示语义绝对时间；**`keyframeMarks`** 增加 **`semanticAbsT`**，点击 **`t`** 仍为 **demo**（**`base + rawT`**）；**`keyframeMarksYes/No`** 计算 **`active`**（按 **`semanticAbsT`** 与当前语义时刻比较，不按 **demo t**）。
- **TimelineDock**：embed / 非 embed 关键点按钮支持 **`mark--active`** 与样式。
- **scene.js**：**`resetCameraHome`** **range 100→70**；**`narrativeFlyToUnit`** **range 55→28**。

## 实际修改文件

- `src/pages/DynamicFlow.vue`
- `src/components/TimelineDock.vue`
- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_08_compare-semantic-clock-and-mark-highlight_receipt.md`（本文件）

## 关键 diff 摘要

- **DynamicFlow**：**`toCompareSemanticAbsT`**、**`marksWithActive`**；时钟与浮标 **T:{semanticAbs}s**；**keyframe** 带 **`semanticAbsT`** 与 **`active`**。
- **TimelineDock**：**`:class`** 绑定 **`mark--active`**；**`.mark--active`** 浅色底 + 描边/光晕。
- **scene.js**：仅两处 **HeadingPitchRange** **range** 数值。

## 刻意未做项

- **未**改 **scene.js** 叙事跨越阈值、**`SEMANTIC_TIME_COMPRESS`**、**`planePathTimeFromDemoTime`** 与桥接 **payload**。
- **未**改 **applyCameraChase** 等处其它 **range**（仍为 **100**）。
