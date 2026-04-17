# 回执：单侧 narrative 结束恢复本地自动续播（E3J / 17）

**日期**：2026-04-17

## 目标

- **单侧播放**（**`parentControlsNarrative=false`**）：子页仍由 **`playLoop`** 自动触发 narrative；叙事**正常结束**后应**自动恢复**本地 **`playLoop`**，避免停在关键点不再前进。
- **全局双屏父页裁决**（**`parentControlsNarrative=true`**）：保持现有行为——**`finishNarrative`** **仅**在存在有效 **`stepIndex`** 时 **`postToParent(MSG_NARRATIVE_DONE)`**，**不**本地自恢复；**不**改父页、**不**改 compare 桥接与协议、**不**改时间轴组件。

## 实际修改文件

- `public/dual-iframe-poc/js/scene.js`
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_17_single-side-narrative-auto-resume-restore_receipt.md`（本文件）

## 关键 diff 摘要

- **`enterNarrativePauseForStep`**：按 **`parentControlsNarrative`** 设置 **`narrativeResumePending`**（单侧 **`true`**，父页裁决 **`false`**），不再与收尾一刀切清掉混用。
- **`finishNarrative`**：先清理叙事状态并 **`updateSceneForTime` → `requestRender` → `postSideStateThrottled`**；若 **`parentControlsNarrative`** 则仅在有 **`doneIdx`** 时发 **`NARRATIVE_DONE`**；否则若 **`pendingLocalResume`**（进入暂停时单侧且 **`narrativeResumePending`**）则 **`setPlaying(true)`**、**`lastPlayMs = 0`**、**`requestAnimationFrame(playLoop)`**，**不**发 **`NARRATIVE_DONE`**。
- **`seekToTime`**：与 **`pause` / `reset` / `cancelNarrativeSequence`** 一致，显式 **`narrativeResumePending = false`**，避免拖拽/定位后误触发续播。
- **`playLoop`**：保留 **`externalScenarioActive && scenarioStepRows.length && !parentControlsNarrative`** 的自动 narrative 触发条件，**未**改动。

## 刻意未做项

- **未**修改父页 **`CompareIframeStage`** / **`compareFrameBridge`** / **`compareFrameProtocol`** 或全局双屏 narrative 调度模型。
- **未**修改时间轴 **`TimelineDock`** 等主应用时间轴逻辑。
- **未**改变 **`parentControlsNarrative=true`** 下「只发 **DONE**、不自恢复」的闭环语义。
