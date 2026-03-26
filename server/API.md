# CloudBox Platform 接口文档

**基础信息**

| 项目     | 说明           |
|----------|----------------|
| 基础路径 | `/api`         |
| 默认端口 | `7223`         |
| 完整地址 | `http://localhost:7223/api` |
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

用于云匣子教学演示：体系结构与关联关系。

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

**说明**：返回空间节点（来源数据库 `spatial_facility`，数据结构贴近 `units.json`）。

- 不传 `category`：返回 **ground + satellite 全量**
- 传 `category=ground`：只返回地面集群
- 传 `category=satellite`：只返回卫星节点列表

**请求体**（可选）：

| 字段      | 类型   | 必填 | 说明 |
|-----------|--------|------|------|
| category  | string | 否  | **ground**（地面）/ **satellite**（卫星）。不传则返回全部 |

**入参含义**：

| 参数      | 含义 |
|-----------|------|
| category  | 大类型。`ground` 返回地面集群（`clusters`）；`satellite` 返回卫星节点（`star_based`）；不传返回 `space + ground` 全量。 |

**请求示例**（返回全部）：
```json
{}
```

**请求示例**（仅地面）：
```json
{ "category": "ground" }
```

**请求示例**（仅卫星）：
```json
{ "category": "satellite" }
```

**响应 data**：

- **不传 category** 时：

```json
{
  "space": { "star_based": [ /* 卫星节点 */ ] },
  "ground": { "clusters": [ /* 地面集群 */ ] }
}
```

- **category=ground** 时：

```json
{ "clusters": [ /* 地面集群 */ ] }
```

- **category=satellite** 时：

```json
{ "star_based": [ /* 卫星节点 */ ] }
```

**返参说明**

- **卫星节点（space.star_based[]） / 地面节点（ground.clusters[].units[]）通用字段**

| 字段        | 类型      | 含义 |
|-------------|-----------|------|
| id          | string    | 节点 id（数据库 code，对齐 units.json 的 id） |
| type        | string    | 节点类型（如 satellite/ground_unit） |
| longitude   | number    | 经度 |
| latitude    | number    | 纬度 |
| name        | string    | 名称 |
| alt_m       | number    | 高度（米，可选） |
| image       | string    | 图标路径（相对 static，可选） |
| size        | number    | 图标缩放（可选） |
| offset      | number[]  | 标注偏移 `[x,y]`（可选） |
| info        | string    | 说明（可选） |
| infoSource  | string    | 说明来源（可选） |

- **地面集群（ground.clusters[]）**

| 字段      | 类型   | 含义 |
|-----------|--------|------|
| clusterId | string | 集群 id |
| name      | string | 集群名称 |
| center    | object | 集群中心点 `{lon,lat}`（可选） |
| units     | array  | 集群单位列表（字段见上表） |

---

### 1.6 链路关系/拓扑（relations 结构）

**接口**：`POST /api/static/link`

**说明**：统一返回 `{relations:[...]}` 结构，供前端按 edges 画线。

- 不传 `from/to/type`：返回数据库 `spatial_relation` 中配置的 `relations`（等价于原 `links.json`）
- 传 `from/to/type`：返回按入参动态生成的一组拓扑 relations（同样是 `{relations:[...]}`）

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

**响应 data**：

```json
{
  "relations": [
    {
      "id": "xxx",
      "flowLabel": "信息流",
      "name": "链路名称",
      "edges": [["fromId","toId"], ["fromId2","toId2"]]
    }
  ]
}
```

**返参说明**（relations[] 元素）：

| 字段      | 类型       | 含义 |
|-----------|------------|------|
| id        | string     | 关系组 id |
| flowLabel | string     | 流标签（如 信息流/控制流/TOPOLOGY） |
| name      | string     | 关系组名称 |
| edges     | string[][] | 边集合，每条边为 `[fromId,toId]` |

---

### 1.7 返回中国边界折线（GeoJSON）

**接口**：

- `POST /api/static/china/polyline`

**说明**：返回 `resources/static/china_polyline.geojson` 的完整 GeoJSON 内容。

**请求体**：可选，可传 `{}` 或省略（POST）。

**响应 data**：GeoJSON 对象（结构取决于文件内容）。

---

## 二、动态交互接口 `/dynamic`

用于云匣子教学演示：动态场景配置与事件配置 JSON 下发。

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

### 2.2 返回 dynamic_scenarios.json 完整配置

**接口**：`POST /api/dynamic/scenarios/config`

**说明**：支持两种返回方式：

- 不传事件 key：返回 `resources/static/dynamic_scenarios.json` 的完整解析结果
- 传事件 key：返回 `dynamic_scenarios.json` 的 `scenarios.<key>` 对象

**请求体**（可选）：

| 字段        | 类型   | 必填 | 说明 |
|-------------|--------|------|------|
| eventKey    | string | 否   | 事件 key，例如 `engine_failure` |

**请求示例**（返回完整配置）：

```json
{}
```

**请求示例**（返回单个事件对象）：

```json
{
  "eventKey": "engine_failure"
}
```

**响应 data**：

- 不传 key：完整 `dynamic_scenarios.json` 对象
- 传 key：`scenarios.<key>` 对象（例如 `scenarios.engine_failure`）

---

### 2.3 返回某个事件的 units 配置（JSON）

**接口**：

- `POST /api/dynamic/event/units`

**说明**：用于把静态目录下的“事件单位配置 JSON”直接返回给前端。

读取规则：`resources/static/<eventKey>_units.json`

例如：`eventKey=engine_failure` → `static/engine_failure_units.json`

**请求体**（可选）：

| 字段     | 类型   | 必填 | 说明 |
|----------|--------|------|------|
| eventKey | string | 否   | 事件 key，默认 `engine_failure`。仅允许 `a-z0-9_` |

**请求示例（POST）**：

```json
{
  "eventKey": "engine_failure"
}
```

**响应 data**：对应 JSON 文件的完整内容（结构不做强约束，由前端按需解析）。

---

## 接口汇总表

| 模块   | 方法 | 路径                      | 说明                 |
|--------|------|---------------------------|----------------------|
| 静态   | POST | /api/static/instrument    | 获取仪表数据         |
| 静态   | POST | /api/static/units         | 获取单元列表         |
| 静态   | POST | /api/static/unit/detail   | 获取单元详情         |
| 静态   | POST | /api/static/modules       | 获取模块列表         |
| 静态   | POST | /api/static/spatial       | 获取空间节点（不传 category 返回全部） |
| 静态   | POST | /api/static/link          | 获取链路关系/拓扑（relations 结构） |
| 静态   | POST | /api/static/china/polyline| 返回中国边界折线（GeoJSON） |
| 动态   | POST | /api/dynamic/scenarios    | 获取场景列表         |
| 动态   | POST | /api/dynamic/scenarios/config | 返回 dynamic_scenarios.json 完整配置 |
| 动态   | POST | /api/dynamic/event/units  | 返回事件 units 配置（JSON） |

---

*文档版本与代码一致，如有变更请同步更新。*
