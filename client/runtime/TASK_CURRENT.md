# 当前任务状态（双 iframe compare + 静态架构）

**更新**：2026-04-23

## 本轮目标（静态架构）：交互关系数据与聚焦/面板/材质

- **传输内容显式化**：`public/config/links.json` 每条 relation 增加 **`transfers`**（`fromLabel`→`toLabel`：`payload`，与 `units.json` 显示名对齐）。
- **HTS 同时下传**：合并原四条细拆信息流为 **`link-info-hts-concurrent`**（`sat-hts-01` 同时指向重构与专家组），配 **`focusGroups`** 步进聚焦。
- **地面双源汇入**：**`link-info-ground-concurrent`**（重构与专家组同时汇入推演），配 **`focusGroups`**。
- **信息流/控制流视觉分离**：静态页 **`splitMode=false`** 时链路材质为单色冷/暖（信息流蓝青、控制流橙红）；双视口 **`splitMode=true`** 仍用左右分屏裁切材质。面板行 **`cb-relation--info` / `cb-relation--ctrl`** 与展开 **`transfers`** 列表；**「完整交互关系」** 播放改为逐条 **`playRelationFocusUnified`**（含组聚焦与收尾相机）。

## 今日收口（静态架构细节优化，非主链路重构）

- **关系节点切换前隐藏上一节点 popup**：**`focusRelationNode`** 非飞机分支在 **`flyCameraToUnitId`** 前先 **`clearMarkerPopupFromRelationFocus()`**，并短 **`waitMs(80)`** 再起飞，避免上一节点弹窗与相机运动叠在一起。
- **并发双节点（group）镜头收紧**：**`flyCameraToUnitIdsBoundingSphere`** 支持 **`rangeScale` / `minRange` / `pitchDeg`**；**`playRelationFocusGroupsSequence`** 的 group 步使用更近参数（当前 **`rangeScale: 1.6`**、**`minRange: 10000`**、**`pitchDeg: -30`**），其它调用方默认仍为原 **`2.8` / `25000` / `-35`**。
- **并发 group 多 popup（展示层）**：关系聚焦 **group** 步在相机同框后 **`emitMarkerPopupGroupForUnitIds`**，父页 **`activeGroupPopups`** 与 **`marker-group-show` / `marker-group-move` / `marker-group-close`** 同步多枚 **`marker-popup--group`** 并随 **`postRender`** 跟点；与单点 **`activePopup`** 分离。不涉及 **`links.json`** 或关系配置重构。

## 本轮真实问题（E4A）：双屏右下角卡片与关键点不同步 + 链路节点聚焦

- **A（根因）**：**`getCurrentNodeIndexByTime`** 在 compare 模式下仍用 **`compareNarrativeBaseT + ti`**（未压缩语义秒当 demo 秒）作阈值，而时间轴 scrub / 关键点 **`keyframeMarks.t`** 已用 **`semanticToDemoT(rawT)`**，导致点击 **10+40.3s** 等按钮后 **demo 时间**与 **currentCard** 所用 **step** 不一致。
- **B（交互）**：链路节点列表放在现有 **`FloatingCard`** 的 **`extra`** 插槽；父页用 **`activeRelations_*`** + 已 fetch 的 **`engine_failure_units.json` / `engine_failure_links.json`** 映射展开节点；点击通过 **`MSG_FOCUS_UNIT`（`compareFrameBridge.focusUnit`）** 让对应 iframe 内相机 **`narrativeFlyToUnit` / `resetCameraHome(plane)`**，不走 scrub / **`RUN_NARRATIVE`**。

## 本轮目标（E4B）：FloatingCard 视觉与滚动条统一

- **不改业务逻辑**：根节点增加稳定修饰类 **`floating-card--dv`**，正文区 **`floating-card-scroll`**，**`extra`** 仍由组件内层容器承接。
- **策略**：在 **`proto.css`** 将原「单屏 `.cb-wrap--dynamic .floating-card`」与「双屏 `.cb-split-col .floating-card`」两套视觉合并为 **`.floating-card.floating-card--dv`** 一套（背景、毛玻璃、边框、圆角、阴影、header 渐变、正文与按钮等）；**仅**保留布局差异：**A** **`.cb-dv-main-shell .floating-card--dv`**（单屏位置/z-index/宽度），**B1** **`.cb-viewer-split .cb-split-col .floating-card--dv`**，**B2** **`.cb-compare-side-overlay-inner .floating-card--dv`**（iframe 半屏）。滚动条统一挂在 **`.floating-card-scroll`** 与 **`.floating-card-extra` 内的 `.floating-card-extra-scroll` / `.relation-node-list`**。

## 本轮真实问题（E3J）：单侧 narrative 收尾与全局双屏分流

- **现象**：单侧播放仍由子页 **`playLoop`** 在 **`parentControlsNarrative=false`** 时自动触发 narrative；此前为全局双屏父页裁决移除了 **`finishNarrative`** 的本地 **auto-resume**，导致单侧模式下 narrative 结束后时间轴停住、不再继续。
- **修正策略**：按 **`parentControlsNarrative`** 分流收尾——**全局模式**（**`true`**）**只发 `MSG_NARRATIVE_DONE`**，不自恢复；**单侧模式**（**`false`**）在叙事正常结束时 **`narrativeResumePending`** 为真则 **恢复本地 `playLoop`**，**不**发 **`NARRATIVE_DONE`**。人工 **pause / reset / cancelNarrative / seek** 仍清除 **`narrativeResumePending`**，避免误续播。

## 当前判断：E3H — 父页唯一裁判的 narrative 闭环（ClosedLoop）

- **旧 barrier 模型已弃用**：不再在 **`onSideState`** 中按 **`narrativeBusy`** / 消息到达顺序去 **pause 对侧**。父页只做状态同步（**`tYes`/`tNo`**、**`playing*`**、**`narrativeBusy*`** 等观察字段）与 **`maybeStartGlobalNarrativeRound()`** 调度。
- **唯一 narrative 入口（全局双屏）**：全局自动播放下仅 **`maybeStartGlobalNarrativeRound()`** 可 **`pauseBoth` → `scrub(..., { silent: true })` → `runNarrative` / `runNarrativeBoth`**；**`firedMarkStepIndexYes/No`** 仅在子页 **`MSG_NARRATIVE_DONE`** 经 **`onNarrativeDone`** 显式落账；结束后 **`playBoth({ parentControlsNarrative: true })`** 恢复。
- **子页配合（分流）**：**`parentControlsNarrative=true`** 时 **`playLoop`** 不自动命中 narrative；**`finishNarrative`** 仅 **`MSG_NARRATIVE_DONE`**（有 **`stepIndex`** 时），**不**本地 **resume**。**`parentControlsNarrative=false`** 时子页可自动触发 narrative，**`finishNarrative`** **不**发 **`NARRATIVE_DONE`**，正常结束时本地 **auto-resume**。协议：**`RUN_NARRATIVE`** / **`NARRATIVE_DONE`**（见 **`compareFrameProtocol.js`** / **`compareFrameBridge.js`**）。
- **父页时间与关键点**：**`keyframeMarks.t`** 为 **`semanticToDemoT(rawT)`**；**`semanticAbsT`** 仍为 **`compareNarrativeBaseT + rawT`**；**`compareGlobalDisplayT`** 在 compare+global 下非 narrative 时为 **`max(tYes,tNo)`**，narrative 期间为 **`globalNarrativeRoundDemoT`**。
- **pre-play 链路门控（保留）**：子页 **`getActiveRelationIdsAtTime`** 在 **`externalScenarioActive && localTimeSec < narrativeT0 - 1e-6`** 时 **`return []`**，避免未播放先亮 **10+0.0s** 链路。

## 本轮关闭的四类旧残留（历史）

1. 子页 **`playLoop`** 在 compare **父页裁决**模式下的 **自动 narrative 触发**（由 **`parentControlsNarrative`** 门控）；**单侧模式**仍保留自动触发。
2. 子页 **`finishNarrative`** 在 **父页裁决**下 **不**自动 **resume**（**E3J** 恢复单侧下的 **auto-resume**）。
3. 父页关键点 **`t = base + rawT`** 的旧 **demo 时间**（已改为 **`semanticToDemoT(rawT)`**）。
4. 父页 **`onSideState`** 依赖 **barrier** 的 **事后 pause 对侧**。

## 历史：E3F — barrier 与 pre-base 门控

- 同刻 trigger、**`getActiveRelationIdsAtTime`** base 前门控等（已由 E3H 父页裁判模型替代 barrier 语义）。

## 历史：E3E / E3D / E3C / E3B / E4

- 叙事 busy 上报、语义时钟、关键点 active、demo/语义映射等。

## 历史：外层 split 已删（D2）

- 主应用双屏仅 **iframe + dual-iframe-poc**。
