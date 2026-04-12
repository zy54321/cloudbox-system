# Billboard Occlusion Receipt

Date: 2026-04-05

Scope: `静态架构 -> 信息面板 -> 交互关系` 选中后，飞机模型半透明时，`plane` 机载标点/名字与飞机模型的遮挡关系排查。

## 1. Viewer 初始化位置

File: `src/engine/cesium/viewer.js`

- 当前 `new Cesium.Viewer(...)` 没有显式设置 `orderIndependentTranslucency`
- 当前显式传入的 viewer 参数只有：
  - `timeline: false`
  - `animation: false`
  - `baseLayerPicker: false`
  - `fullscreenButton: false`
  - `navigationHelpButton: false`
  - `homeButton: false`
  - `sceneModePicker: false`
  - `selectionIndicator: false`
  - `infoBox: false`
  - `geocoder: false`
  - `terrainShadows: Cesium.ShadowMode.DISABLED`
  - `shadows: false`
  - `requestRenderMode: true`
  - `logo: false`
  - `creditContainer`
  - `maximumRenderTimeChange: Infinity`
  - `targetFrameRate: 60`
  - `depthTest: true`
  - `fxaa: true`

结论：

- 代码层面当前值是“未显式设置，走 Cesium 默认行为”
- 这一步的 `false vs 当前值` 截图 A/B 在当前终端环境里未执行，因为这里没有图形界面可直接出图

建议的临时 A/B 切换点：

- 在 `src/engine/cesium/viewer.js` 的 `new Cesium.Viewer(el, { ... })` 里临时加入：
  - `orderIndependentTranslucency: false`
- 对照组则保持当前不写该参数

## 2. 飞机实体创建与透明通道

File: `src/components/CesiumViewport.vue`

排查结果：

- 正常状态下会清空：
  - `modelEntity.model.color = undefined`
  - `modelEntity.model.colorBlendMode = undefined`
  - `modelEntity.model.colorBlendAmount = undefined`
- 在交互关系选中时，会调用 `applyPlaneDimHighlightVisual()`，显式改成：
  - `model.color = WHITE.withAlpha(0.4)`
  - `model.colorBlendMode = MIX`
  - `model.colorBlendAmount = 0.35`

结论：

- 飞机模型在该交互下确实进入了半透明/混合渲染路径
- 所以问题与“模型变半透明后和 billboard 的渲染顺序/混合关系变化”直接相关，不是普通不透明模型遮挡问题

## 3. Billboard 实体真实参数

File: `src/components/CesiumViewport.vue`

`plane` 机载图标：

- `disableDepthTestDistance = Infinity`
- `pixelOffset = Cartesian2(0, -8)`
- `eyeOffset = 未设置`
- `scale = unit.size ?? 0.5`
- `scaleByDistance = 未设置`
- `translucencyByDistance = 未设置`
- `show = CallbackProperty(EllipsoidalOccluder.isPointVisible(pos))`

`plane` 机载文字 billboard：

- `disableDepthTestDistance = Infinity`
- `pixelOffset = Cartesian2(offsetX, offsetY)`
- `offsetX = unit.offset?.[0] ?? 0`
- `offsetY = (unit.offset?.[1] ?? -28) + 25`
- `scaleByDistance = NearFarScalar(1000.0, 1.0, 90000, 0.75)`
- `translucencyByDistance = NearFarScalar(60000, 1.0, 90000, 0.0)`
- `eyeOffset = 未设置`
- `show = CallbackProperty(EllipsoidalOccluder.isPointVisible(pos))`

说明：

- 当前已经不是“普通 depth test 遮挡”
- 逻辑上已经做成了：
  - 不受飞机/场景深度测试压制
  - 但如果在地球背面，则通过 `EllipsoidalOccluder` 手动隐藏

## 4. 最小复现实验

未直接落到业务页面，避免引入大范围调试代码；这里记录两个最小场景定义。

场景 A：不透明飞机 + billboard

- 飞机：
  - `model.color = undefined`
  - `model.colorBlendMode = undefined`
  - `model.colorBlendAmount = undefined`
- billboard：
  - `disableDepthTestDistance = Infinity`
  - 与当前 `plane` 标点完全一致

场景 B：半透明飞机 + 同一 billboard

- 飞机：
  - `model.color = WHITE.withAlpha(0.4)`
  - `model.colorBlendMode = MIX`
  - `model.colorBlendAmount = 0.35`
- billboard：
  - 与场景 A 完全一致

实验控制变量：

- 只改飞机 alpha / blend 参数
- billboard 位置、尺寸、offset、show 回调全部保持一致

预期观察点：

- A 中若无遮挡，B 中出现“名字/图标阅读性下降或视觉上被盖住”，则根因可继续锁定在“半透明模型混合通道与 billboard 合成结果”

## 5. 现象与初步结论

现象：

- 飞机未进入半透明状态时，机载标点问题不明显
- 飞机进入半透明状态后，用户观察到 `plane` 标点/名字可读性明显下降，表现为“像被飞机挡住”

参数：

- viewer 未显式设置 `orderIndependentTranslucency`
- 飞机选中链路时显式用了 `withAlpha(0.4) + ColorBlendMode.MIX`
- `plane` 标点和文字都已设置 `disableDepthTestDistance = Infinity`
- 地球遮挡不是靠深度测试，而是靠 `EllipsoidalOccluder` 手动隐藏

初步结论：

- 当前主要矛盾不是“billboard 被地球挡住”
- 也不太像“billboard 普通深度测试没关”
- 更像是“飞机模型进入半透明通道后，视觉合成结果仍然压住了贴得很近的机载标点/文字”
- `orderIndependentTranslucency` 值值得单独做一次图像对照
- 如果 A/B 证明问题只在半透明模型出现，后续更靠谱的方向不是继续加大 `eyeOffset`，而是二选一：
  - 让机载名字切到 `label` 管线单独验证
  - 保持 billboard，但在选中链路时不要把整机做半透明，改成轮廓高亮/局部发光/材质提亮

## 限制说明

- 本次 receipt 基于本地源码和终端可执行范围完成
- `orderIndependentTranslucency: false` 与当前值的截图对比没有在本环境直接产出
- 没有把最小实验挂进正式页面，避免把一次排查变成业务代码污染
