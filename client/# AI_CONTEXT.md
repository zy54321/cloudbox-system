# AI_CONTEXT

## 项目名称
云匣子系统（客户项目）

## 目标（当前阶段）
- 搭建 Vue3 + Vite 项目框架
- 集成 Cesium 1.137.0（先跑通视口）
- 路由对齐原型：/ /static /dynamic

## 边界
- 仅搭框架与页面壳
- 不接真实数据/外部系统
- 不确定信息用 TODO: 标注

## 目录约定
- src/pages: 页面
- src/components: 通用组件
- src/router: 路由
- src/engine/cesium: Cesium封装
- proto/: 原型参照（不参与业务逻辑）
# AI_CHANGELOG

## 2026-02-07
- 初始化 code 目录结构
- 增加 AI_CONTEXT/AI_INDEX/AI_CHANGELOG
- 创建 Vue3+Vite 基础代码骨架
- Cesium 1.137.0 视口占位接入（TODO: 资源拷贝）
html,body{height:100%;margin:0;}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;}
*{box-sizing:border-box;}
