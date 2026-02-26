# CloudBox Platform 接口文档

**基础信息**

| 项目     | 说明           |
|----------|----------------|
| 基础路径 | `/api`         |
| 默认端口 | `8080`         |
| 完整地址 | `http://localhost:8080/api` |
| 请求格式 | JSON（`Content-Type: application/json`） |
| 响应格式 | 统一 JSON 封装 |

---

## 统一响应结构

所有接口返回格式一致：

```json
{
  "code": 200,
  "message": "成功",
  "data": { ... }
}
```

| 字段     | 类型   | 说明     |
|----------|--------|----------|
| code     | int    | 状态码，200 表示成功 |
| message  | string | 提示信息 |
| data     | object | 业务数据，具体结构见各接口 |

---

## 一、静态架构接口 `/static`

用于云匣子教学演示：体系结构与关联关系。**所有接口均为 POST**。

### 1.1 获取仪表数据（按飞行阶段）

**接口**：`POST /api/static/instrument`

**说明**：根据飞行阶段返回仪表数据。

**请求体**（可选，可传 `{}` 或省略）：

| 字段  | 类型   | 必填 | 说明 |
|-------|--------|------|------|
| stage | string | 否  | 飞行阶段，默认 `cruise`。可选：`takeoff` / `climb` / `cruise` / `approach` / `landing` |

**入参含义**：

| 参数   | 含义 |
|--------|------|
| stage  | 当前所处的飞行阶段，用于筛选该阶段下需要展示的仪表项。`takeoff` 起飞，`climb` 爬升，`cruise` 巡航，`approach` 进近，`landing` 着陆。不传或传空时按巡航阶段返回。 |

**请求示例**：
```json
{
  "stage": "cruise"
}
```

**响应 data**：仪表数据对象（当前阶段下的各项读数及航班/阶段/层级等）。

**返参说明**：

| 字段（key）   | 类型   | 含义 |
|---------------|--------|------|
| flightNo      | string | 航班号（如 MU0001） |
| currentAlt    | string | 当前高度（如 10,000 m） |
| targetAlt     | string | 目标高度（如 10,000 m） |
| nextWptEta    | string | 下一航点 / ETA（如 WPT-4 / 08:45） |
| stageCn       | string | 阶段中文：起飞 / 爬升 / 巡航 / 进近 / 着陆 |
| level         | string | 层级：地面 / 低空 / 中空 / 高空（根据当前高度动态生成，≤100m 地面，&lt;3000m 低空，&lt;6000m 中空，≥6000m 高空） |
| longitude     | number | 飞机当前经度 |
| latitude      | number | 飞机当前纬度 |
| range         | string | 距离/航程（如 50 km） |
| heading       | string | 航向（如 270 °） |
| speed         | string | 速度（如 780 km/h） |
| temp          | string | 温度（如 -35 ℃） |
| press         | string | 气压（如 23000 Pa） |
| wind          | string | 风速（如 12 m/s） |

*不同飞行阶段 currentAlt、targetAlt、nextWptEta、stageCn、level、longitude、latitude 会随之变化；飞机经纬度为该阶段示意位置（如京沪航线）。*

---

### 1.2 获取单元列表

**接口**：`POST /api/static/units`

**说明**：获取单元列表（星基/机载/链路/地面）。

**请求体**：可选，可传 `{}` 或省略。

**入参含义**：本接口无入参，请求体可省略或传空对象 `{}`，用于获取全部体系结构单元（星基、机载、链路、地面四类）的列表。

**响应 data**：单元列表，每项为对象。

**返参说明**（列表中每个元素）：

| 字段  | 类型   | 含义 |
|-------|--------|------|
| type  | string | 单元类型：星基 / 机载 / 链路 / 地面 |
| title | string | 单元标题（与 type 对应） |
| desc  | string | 单元简要描述 |

---

### 1.3 获取单元详情

**接口**：`POST /api/static/unit/detail`

**说明**：根据单元类型获取单元详情。

**请求体**（可选）：

| 字段  | 类型   | 必填 | 说明 |
|-------|--------|------|------|
| type  | string | 是  | 单元类型：星基/机载/链路/地面 |

**入参含义**：

| 参数 | 含义 |
|------|------|
| type | 体系结构中的单元分类。`星基` 星基增强相关单元，`机载` 机载系统单元，`链路` 通信/数据链路单元，`地面` 地面站/地面系统单元。指定后返回该类型下的详细构成与属性。 |

**请求示例**：
```json
{
  "type": "机载"
}
```

**响应 data**：单元详情对象。

**返参说明**：

| 字段       | 类型     | 含义 |
|------------|----------|------|
| name       | string   | 单元名称（如「机载元素」） |
| type       | string   | 单元类型：星基 / 机载 / 链路 / 地面 |
| elements   | string[] | 该类型下的组成元素列表 |
| desc       | string   | 单元功能描述 |
| functions  | string[] | 功能项列表 |
| relations  | string[] | 与其他单元的关联关系描述 |
| role       | string   | 在体系中的角色说明 |

---

### 1.4 获取模块列表

**接口**：`POST /api/static/modules`

**说明**：获取模块列表（模块 1～7）。

**请求体**：可选，可传 `{}` 或省略。

**入参含义**：本接口无入参，请求体可省略或传空对象 `{}`，用于获取静态架构下所有模块（模块 1 至模块 7）的简要列表。

**响应 data**：模块列表，每项为对象。

**返参说明**（列表中每个元素）：

| 字段    | 类型   | 含义 |
|---------|--------|------|
| title   | string | 模块标题（如「模块一：数据采集系统」） |
| content | string | 模块内容/概述说明 |

---

### 1.5 获取空间设施数据（地面/卫星合一）

**接口**：`POST /api/static/spatial`

**说明**：按入参 **category**（大类型）返回地面或卫星数据。地面：操作塔、航站楼、信号塔；卫星：通信卫星、导航卫星、遥感卫星。每项含 id（业务 code）、经纬度、名称、备注。

**请求体**（可选）：

| 字段      | 类型   | 必填 | 说明 |
|-----------|--------|------|------|
| category  | string | 否  | 大类型：**ground**（地面）/ **satellite**（卫星），默认 `ground` |

**入参含义**：

| 参数      | 含义 |
|-----------|------|
| category  | 大类型。`ground` 返回操作塔、航站楼、信号塔；`satellite` 返回通信卫星、导航卫星、遥感卫星。不传或传空时按 `ground` 返回。 |

**请求示例**：
```json
{ "category": "ground" }
```
```json
{ "category": "satellite" }
```

**响应 data**：**最外层 key 为中文**（按 category 不同为 操作塔/航站楼/信号塔 或 通信卫星/导航卫星/遥感卫星），每类为数组；**数组元素字段 key 为英文**（id、longitude、latitude、name、remark）。不返回「地面类型」「卫星类型」等 key。

**返参说明**（数组元素统一）：

| 字段        | 类型   | 含义 |
|-------------|--------|------|
| id          | string | 业务唯一标识（code） |
| longitude   | number | 经度（卫星为星下点） |
| latitude    | number | 纬度 |
| name        | string | 名称 |
| remark      | string | 备注 |

---

### 1.6 链路拓扑（树状结构）

**接口**：`POST /api/static/link`

**说明**：按起点端、终点端、关联类型生成「起点 → 链路 → 终点」的树状拓扑。星基取数据库卫星数据（经纬度），机载端取当前飞机位置（一个点），地面端取数据库地面设施（经纬度）；链路为虚拟节点，名称根据起止端自动区分为「卫星链路」或「5G ATG链路」。

**请求体**（可选）：

| 字段                | 类型   | 必填 | 说明 |
|---------------------|--------|------|------|
| from                | string | 否   | 起点端，默认 `satellite`。可选：`satellite`（星基）、`aircraft`（机载端）、`ground`（地面端） |
| to                  | string | 否   | 终点端，默认 `ground`。可选：`satellite`、`aircraft`、`ground` |
| type                | string | 否   | 关联类型，默认 `one_to_many`。可选：`one_to_one`（一对一）、`one_to_many`（一对多）、`many_to_one`（多对一）、`many_to_many`（多对多） |
| aircraftLongitude   | number | 否   | 机载端经度，不传时默认 116.58 |
| aircraftLatitude    | number | 否   | 机载端纬度，不传时默认 40.08 |

**入参含义**：

| 参数   | 含义 |
|--------|------|
| from   | 拓扑起点：星基（卫星）、机载端（飞机）、地面端（地面设施）。 |
| to     | 拓扑终点：同上。 |
| type   | 一对一：1 个起点 → 链路 → 1 个终点；一对多：1 个起点 → 链路 → 多个终点；多对一：多个起点 → 各自链路 → 1 个终点；多对多：多个起点 → 各自链路 → 全部终点。 |

**请求示例**：
```json
{
  "from": "satellite",
  "to": "ground",
  "type": "one_to_many"
}
```

**响应 data**：树形数组。每个根节点为起点端节点，其 `children` 下为链路节点，链路节点的 `children` 为终点端节点。

**返参说明**（树节点通用）：

| 字段       | 类型    | 含义 |
|------------|---------|------|
| id         | string  | 节点 id（星基/地面端为 code，机载端为 aircraft-1，链路为 link-xxx） |
| name       | string  | 节点名称（中文，如设施名、当前航班描述、卫星链路/5G ATG链路） |
| type       | string  | 节点类型：`satellite` / `aircraft` / `ground` / `link` |
| longitude  | number  | 经度（链路节点无或可选） |
| latitude   | number  | 纬度（链路节点无或可选） |
| children   | array   | 子节点列表，叶子为 `[]` |

---

## 二、动态交互接口 `/dynamic`

用于云匣子教学演示：五大场景脚本回放、处置卡片、事件/消息、时间轴、双屏对比。**所有接口均为 POST**。

### 2.1 获取场景列表

**接口**：`POST /api/dynamic/scenarios`

**说明**：获取场景列表。

**请求体**：可选，可传 `{}` 或省略。

**入参含义**：本接口无入参，请求体可省略或传空对象 `{}`，用于获取教学演示中所有可用场景（如发动机、烟雾、导航、劫持、误操作、通用等）的列表。

**响应 data**：场景列表，每项为对象。

**返参说明**（列表中每个元素）：

| 字段  | 类型   | 含义 |
|-------|--------|------|
| key   | string | 场景唯一标识（如 engine、smoke、nav、hijack、misop、generic） |
| name  | string | 场景中文名称（如 单发失效、烟雾异味、导航失效 等） |

---

### 2.2 获取场景步骤与处置卡片

**接口**：`POST /api/dynamic/scenario/steps`

**说明**：根据场景 key 获取场景步骤与处置卡片。

**请求体**（可选）：

| 字段         | 类型   | 必填 | 说明 |
|--------------|--------|------|------|
| scenarioKey  | string | 否  | 场景 key，默认 `engine`。可选：`engine` / `smoke` / `nav` / `hijack` / `misop` / `generic` 等 |

**入参含义**：

| 参数         | 含义 |
|--------------|------|
| scenarioKey  | 场景唯一标识。`engine` 发动机相关，`smoke` 烟雾/火情，`nav` 导航，`hijack` 劫持，`misop` 误操作，`generic` 通用等。指定后返回该场景的脚本步骤及对应处置卡片内容。不传时默认按 `engine`。 |

**请求示例**：
```json
{
  "scenarioKey": "engine"
}
```

**响应 data**：包含 `steps`（场景步骤列表）和 `disposalCards`（处置卡片列表）。

**返参说明**：

- **data.steps**（数组）：每个元素为一步脚本步骤。

| 字段       | 类型     | 含义 |
|------------|----------|------|
| id         | number   | 步骤序号 |
| nodeId     | number   | 节点 ID（与 id 一致） |
| t          | number   | 该步时间点 T+（0～100） |
| t_no       | number   | 未使用体系时的处置时间 T+ |
| t_yes      | number   | 使用体系时的处置时间 T+ |
| name       | string   | 步骤名称（如 起始、发现异常、证实完成） |
| title      | string   | 步骤标题 |
| phase      | string   | 阶段：证实 / 决策 / 协调 / 指挥 |
| summary    | string   | 步骤摘要 |
| state      | string   | 状态：待证实 / 证实中 / 已证实 / 决策中 / 协调中 / 执行中 / 完成 |
| alert      | boolean  | 是否有告警 |
| events     | string[] | 该步关联的事件描述列表 |
| evidence   | string[] | 证据项列表 |
| actions    | string[] | 处置动作列表 |
| hops_no    | number   | 未使用体系时的跳数 |
| hops_yes   | number   | 使用体系时的跳数 |
| path_no    | string   | 未使用体系时的路径描述 |
| path_yes   | string   | 使用体系时的路径描述 |

- **data.disposalCards**（数组）：每个元素为一张处置卡片，字段包含上述步骤字段，以及：

| 字段    | 类型   | 含义 |
|---------|--------|------|
| compare | object | 双屏对比数据：`t_no`、`t_yes`、`dt`（时间差）、`hops_no`、`hops_yes`、`dhops`（跳数差）、`path_no`、`path_yes` |

---

### 2.3 获取航班/任务信息

**接口**：`POST /api/dynamic/flight/info`

**说明**：根据场景获取航班/任务信息。

**请求体**（可选）：

| 字段         | 类型   | 必填 | 说明        |
|--------------|--------|------|-------------|
| scenarioKey  | string | 否  | 场景 key，默认 `engine` |

**入参含义**：

| 参数         | 含义 |
|--------------|------|
| scenarioKey  | 场景唯一标识，与 2.2 中取值一致。用于按场景获取当前演示对应的航班号、任务类型、航线等航班/任务信息。不传时默认 `engine`。 |

**请求示例**：
```json
{
  "scenarioKey": "engine"
}
```

**响应 data**：航班/任务信息对象。

**返参说明**：

| 字段          | 类型   | 含义 |
|---------------|--------|------|
| f_no          | string | 航班号（如 MU0001） |
| f_type        | string | 机型（如 A320（示意）） |
| f_route       | string | 航线（如 WPT-1 → WPT-3（示意）） |
| f_time        | string | 时间范围（如 T+0 ~ T+100（示意）） |
| f_state       | string | 当前状态（如 待证实） |
| f_node        | string | 当前节点名称（如 起始） |
| scenarioKey   | string | 场景 key |
| scenarioName  | string | 场景中文名称 |

---

### 2.4 获取事件列表（按当前时间 T+ 过滤）

**接口**：`POST /api/dynamic/events`

**说明**：按场景与当前时间 T+ 获取事件列表。

**请求体**（可选）：

| 字段         | 类型   | 必填 | 说明              |
|--------------|--------|------|-------------------|
| scenarioKey  | string | 否  | 场景 key，默认 `engine` |
| currentTime  | int    | 否  | 当前时间 T+，0～100，默认 `0` |

**入参含义**：

| 参数         | 含义 |
|--------------|------|
| scenarioKey  | 场景唯一标识，指定要查看哪个场景下的事件。不传时默认 `engine`。 |
| currentTime  | 时间轴上的“当前时刻”T+，取值 0～100，表示脚本时间进度（如 0 为开始、100 为结束）。接口返回该时刻之前（或该时刻范围内）已发生的事件，用于时间轴/回放展示。不传时默认 `0`。 |

**请求示例**：
```json
{
  "scenarioKey": "engine",
  "currentTime": 50
}
```

**响应 data**：事件列表，每项为当前时间 T+ 之前已发生的事件。

**返参说明**（列表中每个元素）：

| 字段   | 类型   | 含义 |
|--------|--------|------|
| text   | string | 事件描述内容 |
| time   | number | 事件发生时间点 T+（0～100） |
| step   | string | 所属步骤名称 |
| state  | string | 该步状态（待证实 / 证实中 / 已证实 等） |

---

### 2.5 获取风险与对比指标

**接口**：`POST /api/dynamic/risk-kpi`

**说明**：根据场景获取风险与对比指标。

**请求体**（可选）：

| 字段         | 类型   | 必填 | 说明        |
|--------------|--------|------|-------------|
| scenarioKey  | string | 否  | 场景 key，默认 `engine` |

**入参含义**：

| 参数         | 含义 |
|--------------|------|
| scenarioKey  | 场景唯一标识，指定要查看哪个场景下的风险等级与 KPI 对比数据（如双屏对比、指标看板等）。不传时默认 `engine`。 |

**请求示例**：
```json
{
  "scenarioKey": "engine"
}
```

**响应 data**：风险与对比指标对象。

**返参说明**：

| 字段     | 类型   | 含义 |
|----------|--------|------|
| riskType | string | 风险类型/场景名称（如 单发失效） |
| riskPos  | string | 风险位置描述（如 WPT-2 附近（示意）） |
| riskTime | string | 风险时间（如 T+10s（示意）） |
| riskCmd  | string | 处置建议摘要（如 建议：证实 → 决策 → 协调 → 指挥（示意）） |
| kpi1     | string | 对比指标 1（如 +15%（示意）） |
| kpi2     | string | 对比指标 2（如 处置链路缩短（示意）） |
| kpi3     | string | 对比指标 3（如 -35s（示意）） |

---

### 2.6 历史回看 - 事件列表（完整时间线）

**接口**：`POST /api/dynamic/history`

**说明**：历史回看，获取完整时间线事件列表。

**请求体**（可选）：

| 字段         | 类型   | 必填 | 说明        |
|--------------|--------|------|-------------|
| scenarioKey  | string | 否  | 场景 key，默认 `engine` |

**入参含义**：

| 参数         | 含义 |
|--------------|------|
| scenarioKey  | 场景唯一标识，指定要回看哪个场景的完整事件时间线（不按 T+ 截断，返回该场景下全部事件）。不传时默认 `engine`。 |

**请求示例**：
```json
{
  "scenarioKey": "engine"
}
```

**响应 data**：该场景完整时间线上的事件列表（等价于 T+ 取 100 时的 events）。

**返参说明**（列表中每个元素）：与 **2.4 获取事件列表** 相同。

| 字段   | 类型   | 含义 |
|--------|--------|------|
| text   | string | 事件描述内容 |
| time   | number | 事件发生时间点 T+ |
| step   | string | 所属步骤名称 |
| state  | string | 该步状态 |

---

## 接口汇总表

| 模块   | 方法 | 路径                      | 说明                 |
|--------|------|---------------------------|----------------------|
| 静态   | POST | /api/static/instrument    | 获取仪表数据         |
| 静态   | POST | /api/static/units         | 获取单元列表         |
| 静态   | POST | /api/static/unit/detail   | 获取单元详情         |
| 静态   | POST | /api/static/modules       | 获取模块列表         |
| 静态   | POST | /api/static/spatial       | 获取空间设施数据（入参 category：ground/satellite） |
| 动态   | POST | /api/dynamic/scenarios    | 获取场景列表         |
| 动态   | POST | /api/dynamic/scenario/steps | 获取场景步骤与处置卡片 |
| 动态   | POST | /api/dynamic/flight/info | 获取航班/任务信息    |
| 动态   | POST | /api/dynamic/events       | 获取事件列表（T+ 过滤） |
| 动态   | POST | /api/dynamic/risk-kpi     | 获取风险与对比指标   |
| 动态   | POST | /api/dynamic/history      | 历史回看事件列表     |

---

*文档版本与代码一致，如有变更请同步更新。*
