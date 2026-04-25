# 五大动态场景：配置体系与维护说明

> 目的：在**不依赖阅读运行时代码**的前提下，说明 `public/config` 下动态场景相关 JSON 的分工、命名约定与后续改法。本文仅描述**当前工程约定**与维护规则，不改变任何程序行为。

**关联入口**：`public/config/dynamic_scenarios.json` 通过 `scenarios` 下各 key 挂接 units/links，右侧/双视口等页面按场景 key 拉取并驱动叙事与图元。

---

## 1. 三层配置分工

| 文件类型 | 职责 |
|----------|------|
| **`dynamic_scenarios.json`** | **时间轴与叙事主数据**：每场景的 `name`、`durationSec`、`narrativeMilestones`、**`nodes`** 中 yes/no 分支的标题/阶段/文案、**`activeRelations` 对链路 id 的引用**、以及 `postReview` 等。负责「什么时刻、讲什么、激活哪些关系 id」。 |
| **`*_units.json`** | **节点/标点（图元元数据）**：单位位置、显示名、是否 `attachToPlane`、与静态 ground 的复用关系等。负责「界面上点谁、点在哪」。 |
| **`*_links.json`** | **信息流/控制流（关系与链路）**：关系 id、端点 unit id、类型（信息/控制）等。负责「谁连谁、连线的语义类别」。 |

三者需 **id 一致**（如 `activeRelations` 里写的 id 必须在 `*_links.json` 存在；引用的 unit id 须在对应 `*_units.json` 存在）。

---

## 2. 五场景与资源文件对应表

`dynamic_scenarios.json` 中 `scenarios` 的 key 与 `public/config/dynamic/` 下文件一一对应（路径均以站点根为前缀 `/config/dynamic/`）：

| 场景 key | 说明（来自配置 name 字段，便于检索） | units 文件 | links 文件 |
|----------|--------------------------------------|------------|------------|
| `engine_failure` | 单发失效 | `engine_failure_units.json` | `engine_failure_links.json` |
| `smoke` | 烟雾异味 | `smoke_units.json` | `smoke_links.json` |
| `nav` | 导航失效 | `nav_units.json` | `nav_links.json` |
| `hijack` | 劫机 | `hijack_units.json` | `hijack_links.json` |
| `human` | 人为误操作 | `human_units.json` | `human_links.json` |

`dynamic_scenarios.json` 内各场景的 **`unitsUrl` / `linksUrl`** 为权威路径；上表为人工维护时的速查。

---

## 3. 动态 unit id 命名：`yes-*` / `no-*`

- 动态场景里 **参与链路与叙事分支的 unit id** 应使用 **`yes-`** 或 **`no-`** 前缀。
- 若未遵守，`scene.js` 一侧存在 **按此前缀过滤/区分分支** 的逻辑，可能导致 **链路不显示或行为异常**。
- 新增节点时务必与已有命名风格一致，并在 `*_links.json` 的端点中同步使用。

---

## 4. `attachToPlane` 约定

- **机载、舱内、本机**等与飞机本体绑定的节点：在对应 `*_units.json` 中设 **`attachToPlane: true`**（具体字段名以现网 JSON 为准）。
- **地面**节点：**不使用** `attachToPlane: true`（保持地面参照系）。

---

## 5. 静态 `ground` 复用（与 `units.json` 对齐）

- 当动态场景需要 **复用** 静态架构里的地面簇时：在动态 unit 上通过 **`name` 与 `public/config/units.json` 中 `ground.clusters` 下的名称精确匹配**。
- **id 仍使用动态场景自己的 id**（即不因复用而改成静态 id），仅 **展示/聚合语义** 与静态 ground 对齐。

---

## 6. `postReview` 与时间轴

- **`postReview`** 用于 **落地后 / 24h 内 / 事后复盘** 类文案，**不进入** `nodes` 主时间轴的逐步叙事。
- 调叙事节奏、主流程卡片时，以 **`nodes`** 为准；`postReview` 单独理解，不要混进主时间轴节点列表。

---

## 7. `effects` 字段

- 配置中如存在 **`effects`** 字段，当前为 **预留**；**场景侧视觉函数尚未实现**。
- 可随叙事结构一并维护，但 **不应假设** 会在画面中立竿见影。

---

## 8. 后续修改优先级

- 调整某一动态场景的叙事节奏、节点文案、**激活哪些链路**、点线关系：应 **优先改本指南涉及的 JSON 配置**。
- **非必要不要改** 如 `public/dual-iframe-poc/js/scene.js`、`src/pages/DynamicFlow.vue` 等运行代码，以免波及多场景与双视口协议。

---

## 9. 维护自检（可选）

- 改完某场景后：在 `dynamic_scenarios.json` 中核对 `activeRelations` 与 `*_links.json` 的 id；核对 `*_links.json` 端点与 `*_units.json` 的 id；动态 unit 是否保持 **`yes-` / `no-`** 规范及 `attachToPlane` 是否正确。

---

*文档版本随配置体系演进而更新；与 `runtime/TASK_CURRENT.md` 中阶段说明可交叉引用。*
