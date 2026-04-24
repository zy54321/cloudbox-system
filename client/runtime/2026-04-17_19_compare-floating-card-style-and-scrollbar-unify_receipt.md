# 回执：FloatingCard 双屏/单屏视觉与滚动条收口（E4B / 19）

**日期**：2026-04-17

## 目标

- **仅样式与结构挂载点**：统一动态页右下角 **FloatingCard** 的玻璃拟态视觉与内部排版节奏；**`floating-card-scroll`** 与 **extra** 内列表滚动条风格一致（6px、track 略淡、thumb 蓝青渐变）。
- **单/双屏不再维护两套窗口视觉**：共享 **`.floating-card--dv`** 基础样式；**只**在 **A/B1/B2** 上区分 **position / width / z-index**。

## 实际修改文件

- `src/components/FloatingCard.vue`
- `src/styles/proto.css`
- `src/pages/DynamicFlow.vue`（链路节点容器增加 **`relation-node-list` / `floating-card-extra-scroll`** class；移除已迁入 **`proto.css`** 的局部样式）
- `runtime/TASK_CURRENT.md`
- `runtime/2026-04-17_19_compare-floating-card-style-and-scrollbar-unify_receipt.md`（本文件）

## 关键 diff 摘要

- **FloatingCard**：根 **`floating-card floating-card--dv`**；**`floating-card-body floating-card-scroll`**；**`extra`** 外包 **`floating-card-extra`**（与 E4A 一致）；去掉组件内 scoped 视觉。
- **proto.css**：删除旧「单屏黑底小卡 + 双屏重复一整套 header/body/按钮/滚动条」；新增 **`.floating-card.floating-card--dv`** 全量共享视觉 + **A / B1 / B2** 布局；滚动条规则提升到 **`.cb-wrap--dynamic`** 下 **`.floating-card-scroll`** 与 **`.floating-card-extra`** 内 **`.floating-card-extra-scroll` / `.relation-node-list`**；**extra** 内 **链路节点**按钮样式迁入 **`.floating-card--dv .floating-card-extra .cb-floating-relation-*`**。
- **DynamicFlow**：节点按钮区增加可滚动 class，删除重复的 **scoped** 按钮/title 规则。

## 刻意未做项

- **未**修改 **`DynamicFlow.vue`** 业务逻辑（时间轴、compare、**`focusUnit`** 等）。
- **未**修改 **`scene.js`**、**compare 协议/桥接**。
- **未**改动 **FloatingCard** 标题、折叠/详情交互与文案结构。
