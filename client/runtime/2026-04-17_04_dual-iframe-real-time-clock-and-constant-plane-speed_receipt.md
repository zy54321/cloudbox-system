# 回执：双 iframe 场景时间真实秒 + 飞机路径匀速倍率（E2 / 04）

**日期**：2026-04-17

## 目标

- **A**：**T+ / 场景时间**按**真实秒**推进，不再因全局 **`POC_PLAYBACK_RATE`** 导致「显示 1 秒、真实远慢于 1 秒」。
- **B**：飞机沿航迹**更慢且全程匀速**；删除 **`planePathTimeFromSceneTime`** 内 **`narrativeT0` / `cruisePathProgressU`** 分段赶路逻辑，改用单独常量 **`POC_PLANE_SPEED_RATE`** 仅控制路径时间映射。
- **父页 `pathProgress`**：与飞机真实位置一致，不再用 **`state.currentTime / state.duration`**（解耦后后者表示场景进度，非路径进度）。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_04_dual-iframe-real-time-clock-and-constant-plane-speed_receipt.md`（本文件）

## 关键 diff 摘要

- **移除** **`POC_PLAYBACK_RATE`** 对 **`playLoop`** 中 **`nextTime`** 的影响；**`nextTime = Math.min(state.currentTime + dt, state.duration)`**。
- **新增** **`POC_PLANE_SPEED_RATE = 0.75`**，仅用于 **`planePathTimeFromSceneTime`** → **`getInterpolatedAircraftPosition`** 链。
- **`planePathTimeFromSceneTime`**：**`return clampTime(timeSeconds * POC_PLANE_SPEED_RATE)`**，并更新函数注释（场景时间 1x、路径时间单独倍率）。
- **`postSideState`**：**`pathProgress = clamp01(planePathTimeFromSceneTime(state.currentTime) / max(duration, ε))`**。

## 刻意未做项

- **未**修改 **`scene-left.html` / `scene-right.html`**。
- **未**修改 **compare 协议**、**父页**（Vue / `compareFrame*`）。
- **未**改 **marker 样式**、**narrative 相机**（**`narrativeFlyToUnit`** 等既有跑通逻辑除时间轴语义澄清外未动）。
- **`cruisePathProgressU`** 仍可从父消息写入（协议兼容），**路径映射**已不再依赖该字段。
