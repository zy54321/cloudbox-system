<template>
  <div ref="container" class="cesium-container">
    <div ref="creditEl" class="cb-cesium-credit"></div>
  </div>
</template>

<script setup>
import { defineExpose, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as Cesium from 'cesium';
import { createCesiumViewer, destroyCesiumViewer } from '../engine/cesium/viewer';

// 所有 billboard 图片统一从 public/img 加载，与 units.json 的 image 路径一致
const _base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const _publicImg = (path) => `${typeof window !== 'undefined' ? window.location.origin : ''}${_base ? _base + '/' : '/'}${String(path).replace(/^\//, '')}`;
const planeBillboardImgUrl = _publicImg('img/planeBillBoardImg2.png');
const unitBillboardImgUrl = _publicImg('img/planeBillBoardImg.png');

const emit = defineEmits(['marker-click', 'marker-move', 'marker-close', 'plane-screen-info', 'plane-billboard-click', 'module-highlight-screen']);

const props = defineProps({
  modelUrl: { type: String, default: '' },
  unitsUrl: { type: String, default: '/config/units.json' },
  autoFocus: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  splitMode: { type: Boolean, default: false },
  leftModelUrl: { type: String, default: '' },
  rightModelUrl: { type: String, default: '' },
  splitPosition: { type: Number, default: 0.5 },
  /** PathPoint[]：{ lon, lat, alt, phase }，与画线/动画同源；起点/终点 alt 不覆写 */
  pathPoints: { type: Array, default: null },
  pathProgress: { type: Number, default: 0 },
  followPath: { type: Boolean, default: false },
  showClusterDepAirport: { type: Boolean, default: true },
  showClusterArrAirport: { type: Boolean, default: true },
  /** 当前要显示的关联 id（来自 links.json relation.id），为 null 时所有链路隐藏；保留兼容：转为 Left */
  visibleRelationId: { type: String, default: null },
  /** 左/右视口要显示的关联 id 列表（透传自 ViewerStage，双屏时使用） */
  visibleRelationIdsLeft: { type: Array, default: () => [] },
  visibleRelationIdsRight: { type: Array, default: () => [] }
});

const container = ref(null);
const creditEl = ref(null);

let viewer = null;
let modelEntity = null;
let billboardEntity = null;
let clickHandler = null;
let pickHandler = null;
let activeMarkerEntity = null;
let _planeFaultFlashInterval = null;
let _moduleHighlightIndex = null;
let _moduleCubeEntity = null;
let _moduleCubeFlashInterval = null;
let _moduleCubeFlashOn = true;
const DEFAULT_HEADING_OFFSET_RAD = Cesium.Math.PI_OVER_TWO;
/** 七大模块各自立方体相对飞机的位置（机体系：forward=X, right=Y, up=Z，单位米） */
const MODULE_CUBE_OFFSETS = [
  { f: 8, r: 0, u: 2 },
  { f: 8, r: 0, u: 0 },
  { f: 6, r: 0, u: 0 },
  { f: 4, r: 0, u: 1.5 },
  { f: 2, r: 1, u: 1 },
  { f: 0, r: 0, u: 0 },
  { f: -2, r: -1, u: 0 }
];
let winRafId = 0;
let flowRaf = 0;
let flowStartMs = Date.now();

const startFlowLoop = () => {
  if (flowRaf || !viewer) return;
  flowStartMs = Date.now();
  const tick = () => {
    if (!viewer) {
      flowRaf = 0;
      return;
    }
    flowRaf = requestAnimationFrame(tick);
    viewer.scene.requestRender();
  };
  flowRaf = requestAnimationFrame(tick);
};

const stopFlowLoop = () => {
  if (flowRaf) {
    cancelAnimationFrame(flowRaf);
    flowRaf = 0;
  }
};

const UNIT_ENTITY_IDS = new Set();
const UNIT_ENTITY_CLUSTER = new Map();
const LINK_ENTITY_IDS = new Set();
const LINK_ENTITY_RELATION_IDS = new Map(); // linkEntityId -> relationId
/** relationId -> { parent, children[] }，用于聚焦时把两端标点纳入视野 */
const RELATION_UNIT_IDS = new Map();
/** relationId -> flowLabel（INFO/CTRL/信息流/控制流等），用于选择材质 */
const RELATION_FLOW_LABEL = new Map();
/** linkEntityId -> 'left' | 'right' | 'none'（用于 splitMode 下的 plane 链路） */
const LINK_ENTITY_SIDE = new Map();
/** linkId -> { parentId, childId }，用于阶段切换后按当前端点位置刷新链路（如飞机移动） */
const LINK_ENTITY_ENDPOINTS = new Map();
/** 飞机位置变量：起飞/巡航等阶段切换时更新，绘制与飞机连接的链路时用此坐标 */
let planePositionCartesian = null;
/** 含端点 "plane" 的关联 id 集合，这些链路在用户点击该关联时再按当前飞机位置重绘 */
const RELATIONS_WITH_PLANE = new Set();

// --- 卷帘专用 Polyline 双色智能材质 (纯 GLSL 实现) ---
const ensureSplitMaterials = () => {
  const cache = Cesium.Material._materialCache;
  
  // 1. 信息流：流动虚线
  if (!cache.getMaterial('SplitDash')) {
    cache.addMaterial('SplitDash', {
      fabric: {
        type: 'SplitDash',
        uniforms: {
          colorLeft: new Cesium.Color(0.2, 0.7, 1.0, 0.95),  // 有云匣子：偏蓝色
          colorRight: new Cesium.Color(1.0, 0.55, 0.1, 0.95),// 无云匣子：偏橙色
          time: 0.0,
          splitDir: 0.0,
          splitPos: 0.5
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            float fragX = gl_FragCoord.x / czm_viewport.z;
            
            // --- 裁切逻辑 ---
            if (splitDir < 0.0 && fragX > splitPos) discard; // 强制左屏时，丢弃右侧像素
            if (splitDir > 0.0 && fragX < splitPos) discard; // 强制右屏时，丢弃左侧像素

            // --- 智能颜色分配 ---
            // 默认：滑块左侧用蓝色，右侧用橙色
            vec4 baseColor = (fragX < splitPos) ? colorLeft : colorRight;
            // 如果明确指定了只在某一侧显示，强制统一颜色，防止边缘像素抖动
            if (splitDir < 0.0) baseColor = colorLeft;
            if (splitDir > 0.0) baseColor = colorRight;

            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            
            // --- 流动动画计算 ---
            float t = fract(st.s * 4.0 - time); 
            float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
            
            material.diffuse = baseColor.rgb;
            material.alpha = a * baseColor.a;
            return material;
          }
        `
      },
      translucent: () => true
    });
  }

  // 2. 控制流：流动箭头
  if (!cache.getMaterial('SplitArrow')) {
    cache.addMaterial('SplitArrow', {
      fabric: {
        type: 'SplitArrow',
        uniforms: {
          colorLeft: new Cesium.Color(0.2, 0.7, 1.0, 0.95), 
          colorRight: new Cesium.Color(1.0, 0.55, 0.1, 0.95),
          time: 0.0,
          splitDir: 0.0,
          splitPos: 0.5
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            float fragX = gl_FragCoord.x / czm_viewport.z;
            
            if (splitDir < 0.0 && fragX > splitPos) discard;
            if (splitDir > 0.0 && fragX < splitPos) discard;

            vec4 baseColor = (fragX < splitPos) ? colorLeft : colorRight;
            if (splitDir < 0.0) baseColor = colorLeft;
            if (splitDir > 0.0) baseColor = colorRight;

            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            
            float distFromCenter = abs(st.t - 0.5) * 2.0; 
            float s = fract(st.s * 4.0 - time); 
            
            float arrowHead = step(distFromCenter, (1.0 - s) * 2.0) * step(0.5, s);
            float arrowStem = step(distFromCenter, 0.2) * step(s, 0.5);
            float arrowShape = clamp(arrowHead + arrowStem, 0.0, 1.0);
            
            material.diffuse = baseColor.rgb;
            material.alpha = arrowShape * baseColor.a;
            return material;
          }
        `
      },
      translucent: () => true
    });
  }
};

// --- 自定义的 MaterialProperty 类 ---
class SplitLinkMaterialProperty {
  constructor(isArrow = false) {
    this._definitionChanged = new Cesium.Event();
    this.isArrow = isArrow;
    this.splitDir = 0.0; // -1(左), 1(右), 0(全屏)
    this._startMs = Date.now();
  }
  get isConstant() { return false; }
  get definitionChanged() { return this._definitionChanged; }
  getType(time) {
    ensureSplitMaterials();
    return this.isArrow ? 'SplitArrow' : 'SplitDash';
  }
  getValue(time, result) {
    if (!result) result = {};
    result.splitDir = this.splitDir;
    result.splitPos = viewer?.scene?.splitPosition ?? 0.5;
    result.time = ((Date.now() - this._startMs) / 1000) * 1.5; 
    return result;
  }
  equals(other) { return this === other; }
}

const getLinkMaterialByFlowLabel = (flowLabel) => {
  const f = String(flowLabel ?? '').toUpperCase();
  const isArrow = (f === 'CTRL');
  return new SplitLinkMaterialProperty(isArrow);
};

/** 根据实体 id 获取当前时刻的笛卡尔位置 */
const getEntityPosition = (entityId) => {
  if (!viewer?.entities) return null;
  const entity = viewer.entities.getById(entityId);
  if (!entity?.position) return null;
  const pos = entity.position.getValue(viewer.clock.currentTime);
  return pos ? Cesium.Cartesian3.clone(pos) : null;
};

/** 生成弧线点（起点、终点、中间抬升的二次贝塞尔），用于链路曲线 */
const computeArcPositions = (start, end, numPoints = 24, arcHeightRatio = 0.15) => {
  const distance = Cesium.Cartesian3.distance(start, end);
  const mid = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
  const midNorm = Cesium.Cartesian3.normalize(mid, new Cesium.Cartesian3());
  const lift = distance * arcHeightRatio;
  const control = Cesium.Cartesian3.add(mid, Cesium.Cartesian3.multiplyByScalar(midNorm, lift, new Cesium.Cartesian3()), new Cesium.Cartesian3());
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const t1 = 1 - t;
    const a = Cesium.Cartesian3.multiplyByScalar(start, t1 * t1, new Cesium.Cartesian3());
    const b = Cesium.Cartesian3.multiplyByScalar(control, 2 * t1 * t, new Cesium.Cartesian3());
    const c = Cesium.Cartesian3.multiplyByScalar(end, t * t, new Cesium.Cartesian3());
    points.push(Cesium.Cartesian3.add(Cesium.Cartesian3.add(a, b, new Cesium.Cartesian3()), c, new Cesium.Cartesian3()));
  }
  return points;
};

const updateUnitEntitiesVisibility = () => {
  if (!viewer?.entities) return;
  UNIT_ENTITY_IDS.forEach((id) => {
    const e = viewer.entities.getById(id);
    const clusterId = UNIT_ENTITY_CLUSTER.get(id);
    if (!e || clusterId == null) return;
    if (clusterId === 'DEP_AIRPORT') e.show = props.showClusterDepAirport;
    else if (clusterId === 'ARR_AIRPORT') e.show = props.showClusterArrAirport;
  });
  viewer.scene.requestRender();
};

const loadAndAddUnits = async () => {
  if (!viewer?.entities) return;
  try {
    const res = await fetch(props.unitsUrl);
    if (!res.ok) return;
    const data = await res.json();

    const addBillboard = (unit, clusterId) => {
      const altM = unit.alt_m ?? 0;
      const imgUrl = unit.image ? _publicImg(unit.image) : unitBillboardImgUrl;
      const scale = unit.size != null ? Number(unit.size) : 0.5;
      const offsetX = unit.offset?.[0] ?? 0;
      const offsetY = unit.offset?.[1] ?? -28;
      const e = viewer.entities.add({
        id: unit.id,
        position: Cesium.Cartesian3.fromDegrees(unit.lon, unit.lat, altM),
        billboard: {
          image: imgUrl,
          show: true,
          scale,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: unit.name
          ? {
              text: unit.name,
              font: '14px sans-serif',
              show: true,
              showBackground: true,
              backgroundPadding: new Cesium.Cartesian2(6, 4),
              pixelOffset: new Cesium.Cartesian2(offsetX, offsetY),
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, Number.POSITIVE_INFINITY),
              translucencyByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.0e9, 1.0),
              scaleByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.0e9, 1.0),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          : undefined
      });
      e.__meta = {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        lon: unit.lon,
        lat: unit.lat,
        alt_m: altM,
        clusterId: clusterId ?? null
      };
      UNIT_ENTITY_IDS.add(unit.id);
      if (clusterId) UNIT_ENTITY_CLUSTER.set(unit.id, clusterId);
    };

    const space = data.space;
    if (space?.star_based?.length) {
      space.star_based.forEach((u) => {
        addBillboard({ ...u, alt_m: u.alt_m ?? 0 }, null);
      });
    }

    const ground = data.ground;
    if (ground?.clusters?.length) {
      ground.clusters.forEach((cluster) => {
        const clusterId = cluster.clusterId;
        (cluster.units || []).forEach((u) => {
          addBillboard({ ...u, alt_m: 0 }, clusterId);
        });
      });
    }

    await loadAndAddLinks();
    updateUnitEntitiesVisibility();
  } catch (e) {
    console.warn('[CesiumViewport] load units.json failed:', e);
  }
};

/** 根据 visibleRelationId / visibleRelationIdsLeft|Right 更新链路显示/隐藏与 splitDirection */
const updateLinkVisibility = () => {
  if (!viewer?.entities) return;
  const leftArr = props.visibleRelationId != null ? [props.visibleRelationId] : (props.visibleRelationIdsLeft || []);
  const rightArr = props.visibleRelationIdsRight || [];
  const leftSet = new Set(leftArr.map(String).filter(Boolean));
  const rightSet = new Set(rightArr.map(String).filter(Boolean));
  const splitMode = props.splitMode;

  if (RELATIONS_WITH_PLANE.size) {
    const toRemove = [];
    LINK_ENTITY_IDS.forEach((linkId) => {
      const rid = LINK_ENTITY_RELATION_IDS.get(linkId);
      if (rid && RELATIONS_WITH_PLANE.has(rid)) toRemove.push(linkId);
    });
    toRemove.forEach((linkId) => {
      const e = viewer.entities.getById(linkId);
      if (e) viewer.entities.remove(e);
      LINK_ENTITY_IDS.delete(linkId);
      LINK_ENTITY_RELATION_IDS.delete(linkId);
      LINK_ENTITY_ENDPOINTS.delete(linkId);
      LINK_ENTITY_SIDE.delete(linkId);
    });

    if (!splitMode) {
      leftSet.forEach((rid) => {
        if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'none');
      });
    } else {
      leftSet.forEach((rid) => {
        if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'left');
      });
      rightSet.forEach((rid) => {
        if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'right');
      });
    }
  }

  LINK_ENTITY_IDS.forEach((linkId) => {
    const e = viewer.entities.getById(linkId);
    if (!e) return;
    const relId = LINK_ENTITY_RELATION_IDS.get(linkId);
    if (!relId) return;
    const rid = String(relId);
    const side = LINK_ENTITY_SIDE.get(linkId) || 'none';

    let dir = Cesium.SplitDirection.NONE;
    let show = false;

    if (!splitMode) {
      // 单屏模式：以左侧 (有云匣子) 数据为准
      show = leftSet.has(rid);
      dir = Cesium.SplitDirection.NONE;
    } else {
      // 双屏模式：精确判断归属
      const inLeft = leftSet.has(rid);
      const inRight = rightSet.has(rid);
      
      if (side === 'left') {
        show = inLeft;
        dir = inLeft ? Cesium.SplitDirection.LEFT : Cesium.SplitDirection.NONE;
      } else if (side === 'right') {
        show = inRight;
        dir = inRight ? Cesium.SplitDirection.RIGHT : Cesium.SplitDirection.NONE;
      } else {
        show = inLeft || inRight;
        // 如果左右同时包含这条链路，设为 NONE (全屏贯穿，Shader会自动左蓝右橙)
        if (inLeft && inRight) {
          dir = Cesium.SplitDirection.NONE;
        } else if (inLeft) {
          dir = Cesium.SplitDirection.LEFT;
        } else if (inRight) {
          dir = Cesium.SplitDirection.RIGHT;
        }
      }
    }

    e.show = show;
    e.splitDirection = dir;
    if (e.polyline) e.polyline.splitDirection = dir;

    // 【关键】：将计算好的方向传递给 Shader 的 splitDir 变量
    if (e.polyline && e.polyline.material && e.polyline.material.splitDir !== undefined) {
      if (!splitMode) {
        e.polyline.material.splitDir = 0.0;
      } else if (dir === Cesium.SplitDirection.LEFT) {
        e.polyline.material.splitDir = -1.0;
      } else if (dir === Cesium.SplitDirection.RIGHT) {
        e.polyline.material.splitDir = 1.0;
      } else {
        e.polyline.material.splitDir = 0.0;
      }
    }
  });
  let anyShown = false;
  LINK_ENTITY_IDS.forEach((linkId) => {
    const e = viewer.entities.getById(linkId);
    if (e?.show) anyShown = true;
  });
  if (anyShown) startFlowLoop();
  else stopFlowLoop();
  viewer.scene.requestRender();
};

/** 飞行聚焦到指定关联的链路范围（链路折点 + 父/子标点，并留足边距以看到完整内容） */
const flyToRelationBounds = (relationId) => {
  if (!viewer?.scene?.camera || !relationId) return;
  const points = [];
  const time = viewer.clock.currentTime;
  // 1) 该关联下所有链路的折点
  LINK_ENTITY_IDS.forEach((linkId) => {
    if (LINK_ENTITY_RELATION_IDS.get(linkId) !== relationId) return;
    const e = viewer.entities.getById(linkId);
    if (!e?.polyline?.positions) return;
    const positions = e.polyline.positions.getValue(time);
    if (Array.isArray(positions)) points.push(...positions);
  });
  // 2) 该关联所有边的端点（含 plane 则用飞机位置变量）
  const relData = RELATION_UNIT_IDS.get(relationId);
  if (relData?.edges?.length) {
    const getPos = (id) => (id === 'plane' ? getPlanePosition() : getEntityPosition(id));
    const seen = new Set();
    for (const [fromId, toId] of relData.edges) {
      if (!seen.has(fromId)) {
        seen.add(fromId);
        const p = getPos(fromId);
        if (p) points.push(p);
      }
      if (!seen.has(toId)) {
        seen.add(toId);
        const p = getPos(toId);
        if (p) points.push(p);
      }
    }
  }
  if (points.length < 2) return;
  const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
  const radius = Math.max(boundingSphere.radius, 50000);
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.2,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), radius * 3.5),
    easingFunction: Cesium.EasingFunction.CUBIC_OUT
  });
};

/**
 * 移除某关联下的所有链路实体（用于「与飞机连接的」关联切换时先清再画）
 */
const removeLinkEntitiesForRelation = (relationId) => {
  const toRemove = [];
  LINK_ENTITY_IDS.forEach((linkId) => {
    if (LINK_ENTITY_RELATION_IDS.get(linkId) === relationId) toRemove.push(linkId);
  });
  toRemove.forEach((linkId) => {
    const e = viewer.entities.getById(linkId);
    if (e) viewer.entities.remove(e);
    LINK_ENTITY_IDS.delete(linkId);
    LINK_ENTITY_RELATION_IDS.delete(linkId);
    LINK_ENTITY_ENDPOINTS.delete(linkId);
    LINK_ENTITY_SIDE.delete(linkId);
  });
  viewer?.scene?.requestRender();
};

/**
 * 绘制「与飞机连接的」关联链路：按 edges 每条边 [from,to] 取坐标（plane 用变量），画完即静态。
 */
const drawPlaneRelationLinks = (relationId, side = 'none') => {
  if (!viewer?.entities) return;
  const relData = RELATION_UNIT_IDS.get(relationId);
  if (!relData?.edges?.length) return;
  const material = getLinkMaterialByFlowLabel(RELATION_FLOW_LABEL.get(relationId));
  const getPos = (id) => (id === 'plane' ? getPlanePosition() : getEntityPosition(id));
  for (const [fromId, toId] of relData.edges) {
    const fromPos = getPos(fromId);
    const toPos = getPos(toId);
    if (!fromPos || !toPos) continue;
    const positions = computeArcPositions(fromPos, toPos, 24, 0.12);
    const suffix = side === 'left' ? 'L' : side === 'right' ? 'R' : 'N';
    const linkId = `link-${relationId}-${fromId}-${toId}-${suffix}`;
    viewer.entities.add({
      id: linkId,
      show: true,
      polyline: {
        positions,
        width: 3,
        material,
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
        classificationType: Cesium.ClassificationType.NONE,
        splitDirection: Cesium.SplitDirection.NONE
      },
      splitDirection: !props.splitMode
        ? Cesium.SplitDirection.NONE
        : side === 'left'
          ? Cesium.SplitDirection.LEFT
          : side === 'right'
            ? Cesium.SplitDirection.RIGHT
            : Cesium.SplitDirection.NONE
    });
    LINK_ENTITY_IDS.add(linkId);
    LINK_ENTITY_RELATION_IDS.set(linkId, relationId);
    LINK_ENTITY_ENDPOINTS.set(linkId, { parentId: fromId, childId: toId });
    LINK_ENTITY_SIDE.set(linkId, side);
  }
  viewer.scene.requestRender();
};

/** 将配置的一条关联规范为边列表 [[fromId, toId], ...]，兼容 edges 与旧版 parent+children */
const normalizeRelationEdges = (rel) => {
  if (Array.isArray(rel.edges) && rel.edges.length > 0) {
    return rel.edges.map((e) => (Array.isArray(e) ? [e[0], e[1]] : [e.from, e.to])).filter((e) => e[0] && e[1]);
  }
  const parent = rel.parent;
  const children = rel.children || [];
  if (!parent || !children.length) return [];
  return children.map((c) => [parent, c]);
};

/**
 * 加载并绘制链路。每条关联用 edges 表示多组 from→to（可多层级、多分支）；
 * 含「plane」的关联不在此画，等用户点击该关联时再 clear + drawPlaneRelationLinks。
 */
const loadAndAddLinks = async () => {
  if (!viewer?.entities) return;
  LINK_ENTITY_IDS.forEach((id) => {
    const e = viewer.entities.getById(id);
    if (e) viewer.entities.remove(e);
  });
  LINK_ENTITY_IDS.clear();
  LINK_ENTITY_RELATION_IDS.clear();
  LINK_ENTITY_SIDE.clear();
  LINK_ENTITY_ENDPOINTS.clear();
  RELATION_UNIT_IDS.clear();
  RELATION_FLOW_LABEL.clear();
  RELATIONS_WITH_PLANE.clear();
  try {
    const res = await fetch(`${_base ? _base + '/' : '/'}config/links.json`);
    if (!res.ok) return;
    const data = await res.json();
    const relations = data.relations || [];
    for (const rel of relations) {
      const edges = normalizeRelationEdges(rel);
      if (!edges.length) continue;
      RELATION_UNIT_IDS.set(rel.id, { edges: edges.map((e) => [...e]) });
      RELATION_FLOW_LABEL.set(rel.id, rel.flowLabel);
      const hasPlane = edges.some(([a, b]) => a === 'plane' || b === 'plane');
      if (hasPlane) {
        RELATIONS_WITH_PLANE.add(rel.id);
        continue;
      }
      for (const [fromId, toId] of edges) {
        const fromPos = getEntityPosition(fromId);
        const toPos = getEntityPosition(toId);
        if (!fromPos || !toPos) continue;
        const positions = computeArcPositions(fromPos, toPos, 24, 0.12);
        const linkId = `link-${rel.id}-${fromId}-${toId}`;
        const material = getLinkMaterialByFlowLabel(rel.flowLabel);
        viewer.entities.add({
          id: linkId,
          show: false,
          polyline: {
            positions,
            width: 3,
            material,
            arcType: Cesium.ArcType.NONE,
            clampToGround: false,
            classificationType: Cesium.ClassificationType.NONE,
            splitDirection: Cesium.SplitDirection.NONE
          }
        });
        LINK_ENTITY_IDS.add(linkId);
        LINK_ENTITY_RELATION_IDS.set(linkId, rel.id);
        LINK_ENTITY_ENDPOINTS.set(linkId, { parentId: fromId, childId: toId });
        LINK_ENTITY_SIDE.set(linkId, 'none');
      }
    }
    updateLinkVisibility();
  } catch (e) {
    console.warn('[CesiumViewport] load links.json failed:', e);
  }
};

const onWindowResize = () => {
  if (viewer) {
    if (winRafId) cancelAnimationFrame(winRafId);
    winRafId = requestAnimationFrame(() => {
      winRafId = 0;
      viewer.resize();
      viewer.scene.requestRender();
    });
  }
};

const resize = () => {
  viewer?.resize?.();
};

const requestRender = () => {
  viewer?.scene?.requestRender?.();
};

const getViewer = () => viewer;

const buildSpline = (pts) => {
  if (!pts?.length) return null;
  const cps = pts.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt ?? 0));
  if (cps.length < 2) return null;
  const times = cps.map((_, i) => i);
  return new Cesium.CatmullRomSpline({ times, points: cps });
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const MODEL_HEADING_OFFSET = Cesium.Math.PI_OVER_TWO + Math.PI; // +90deg: fix glTF forward axis

const getPoseOnSpline = (spline, u) => {
  const maxT = spline.times[spline.times.length - 1];
  const t = clamp01(u) * maxT;
  const p = spline.evaluate(t);
  const dt = Math.min(0.02, 1 / Math.max(1, spline.times.length - 1));
  const p2 = spline.evaluate(Math.min(maxT, t + dt));

  const dirWC = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(p2, p, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(p);
  const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
  const dirLocal = Cesium.Cartesian3.normalize(
    Cesium.Matrix4.multiplyByPointAsVector(inv, dirWC, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const heading = Math.atan2(dirLocal.x, dirLocal.y);
  const horiz = Math.sqrt(dirLocal.x * dirLocal.x + dirLocal.y * dirLocal.y);
  const pitch = Math.atan2(dirLocal.z, horiz);
  const headingFixed = heading + MODEL_HEADING_OFFSET;
  const q = Cesium.Transforms.headingPitchRollQuaternion(p, new Cesium.HeadingPitchRoll(headingFixed, pitch, 0));
  return { position: p, orientation: q };
};

const BILLBOARD_WORLD_OFFSET_M = 5;

/** 静态定位：按 pathPoints 下标设置飞机位姿，不启动任何动画；朝向与 getPoseOnSpline 一致 */
function setPlanePoseAtIndex(index) {
  const pathPoints = props.pathPoints;
  if (!viewer || !modelEntity || !Array.isArray(pathPoints) || pathPoints.length < 2) return;
  const i = Math.max(0, Math.min(index, pathPoints.length - 2));
  const pt = pathPoints[i];
  const pt2 = pathPoints[i + 1];
  const p = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt ?? 0);
  const p2 = Cesium.Cartesian3.fromDegrees(pt2.lon, pt2.lat, pt2.alt ?? 0);

  // 用 ConstantPositionProperty，避免直接赋 Cartesian3 后某些逻辑取不到 getValue
  modelEntity.position = new Cesium.ConstantPositionProperty(p);

  const dirWC = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(p2, p, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(p);
  const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
  const dirLocal = Cesium.Cartesian3.normalize(
    Cesium.Matrix4.multiplyByPointAsVector(inv, dirWC, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const heading = Math.atan2(dirLocal.x, dirLocal.y);
  const horiz = Math.sqrt(dirLocal.x * dirLocal.x + dirLocal.y * dirLocal.y);
  const pitch = Math.atan2(dirLocal.z, horiz);
  const headingFixed = heading + MODEL_HEADING_OFFSET;
  const q = Cesium.Transforms.headingPitchRollQuaternion(p, new Cesium.HeadingPitchRoll(headingFixed, pitch, 0));
  modelEntity.orientation = new Cesium.ConstantProperty(q);

  // billboard 跟随飞机：同步到同一点（带高度偏移）
  if (billboardEntity) {
    const c0 = Cesium.Cartographic.fromCartesian(p);
    const pBillboard = Cesium.Cartesian3.fromRadians(
      c0.longitude,
      c0.latitude,
      (c0.height ?? 0) + BILLBOARD_WORLD_OFFSET_M
    );
    billboardEntity.position = new Cesium.ConstantPositionProperty(pBillboard);
  }

  viewer.scene.requestRender();

  // 同步飞机位置变量，供「与飞机连接的链路」使用
  planePositionCartesian = Cesium.Cartesian3.clone(p);

  // 若启用跟随，相机重新锁定到飞机
  viewer.trackedEntity = modelEntity;
}

/** 取飞机当前坐标：优先用变量，否则从实体取（如尚未点过阶段按钮） */
const getPlanePosition = () => planePositionCartesian ?? getEntityPosition('planeEntity');

const getViewState = () => {
  if (!viewer?.camera) return null;
  const camera = viewer.camera;
  return {
    position: camera.positionWC?.clone?.() || camera.position?.clone?.() || null,
    heading: camera.heading,
    pitch: camera.pitch,
    roll: camera.roll
  };
};

const setViewState = (state) => {
  if (!viewer?.camera || !state?.position) return;
  viewer.camera.setView({
    destination: state.position,
    orientation: {
      heading: state.heading ?? viewer.camera.heading,
      pitch: state.pitch ?? viewer.camera.pitch,
      roll: state.roll ?? viewer.camera.roll
    }
  });
};

const loadGlbModelEntity = async (uri) => {
  if (!viewer || !uri) return;
  if (modelEntity) {
    try { viewer.entities.remove(modelEntity); } catch {}
    modelEntity = null;
  }
  if (billboardEntity) {
    try { viewer.entities.remove(billboardEntity); } catch {}
    billboardEntity = null;
  }

  const spline = (props.followPath && props.pathPoints) ? buildSpline(props.pathPoints) : null;
  const basePosition = spline
    ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).position, false)
    : Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);

  const baseOrientation = spline
    ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).orientation, false)
    : undefined;

  const BILLBOARD_WORLD_OFFSET_M = 5;
  const billboardPosition = spline
    ? new Cesium.CallbackProperty(() => {
        const p = getPoseOnSpline(spline, props.pathProgress).position;
        const c0 = Cesium.Cartographic.fromCartesian(p);
        return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, (c0.height || 0) + BILLBOARD_WORLD_OFFSET_M);
      }, false)
    : (() => {
        const c0 = Cesium.Cartographic.fromCartesian(basePosition);
        return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, c0.height + BILLBOARD_WORLD_OFFSET_M);
      })();

  let initOrientation = baseOrientation;
  if (!spline) {
    const hpr = new Cesium.HeadingPitchRoll(DEFAULT_HEADING_OFFSET_RAD, 0, 0);
    initOrientation = Cesium.Transforms.headingPitchRollQuaternion(basePosition, hpr);
  }
  const planeEntity = viewer.entities.add({
    id: 'planeEntity',
    position: basePosition,
    orientation: initOrientation,
    model: {
      uri,
      scale: 1.0,
      shadows: Cesium.ShadowMode.DISABLED
    }
  });
  modelEntity = planeEntity;

  billboardEntity = viewer.entities.add({
    id: 'planeBillboard',
    position: billboardPosition,
    billboard: {
      image: planeBillboardImgUrl,
      show: true,
      scale: 0.5,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  // 模型实体已就绪：若当前选中的是「含 plane 端点」链路，此时才能拿到 plane 坐标完成绘制
  try {
    const pNow = planeEntity.position?.getValue?.(viewer.clock.currentTime);
    if (pNow) planePositionCartesian = Cesium.Cartesian3.clone(pNow);
  } catch (_) {}
  if (props.visibleRelationId != null && RELATIONS_WITH_PLANE.has(props.visibleRelationId)) {
    removeLinkEntitiesForRelation(props.visibleRelationId);
    drawPlaneRelationLinks(props.visibleRelationId);
  }

  viewer.scene.requestRender?.();

  if (props.autoFocus) {
    try {
      const focusPos = spline ? getPoseOnSpline(spline, props.pathProgress).position : basePosition;
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(focusPos);
      const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
      viewer.camera.lookAtTransform(transform, offset);
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    } catch (e) {
      console.warn('[autoFocus lookAt] failed:', e);
    }
    viewer.scene.requestRender?.();
  }
  return planeEntity;
};

const applyPathAnimation = (positionProp, opts = {}) => {
  if (!modelEntity) return;

  // 关闭动画
  if (!positionProp) {
    modelEntity.path = undefined;
    return;
  }

  const billboardOffsetM = opts.billboardOffsetM ?? 2;
  const headingOffsetRad = 0; // 默认不额外偏置（需要时再加）

  // 1) 位置：直接用 path
  modelEntity.position = positionProp;

  // 2) 朝向：VelocityOrientationProperty + 固定 heading 偏置
  const velOri = new Cesium.VelocityOrientationProperty(positionProp);
  modelEntity.orientation = new Cesium.CallbackProperty((time, result) => {
    const q = velOri.getValue(time, new Cesium.Quaternion());
    if (!q) return q;
    const fix = Cesium.Quaternion.fromAxisAngle(
      Cesium.Cartesian3.UNIT_Z,
      headingOffsetRad,
      new Cesium.Quaternion()
    );
    return Cesium.Quaternion.multiply(q, fix, result || new Cesium.Quaternion());
  }, false);

  // 尾迹线已取消，不再设置 modelEntity.path
  modelEntity.path = undefined;

  // 3) billboard 跟随
  if (billboardEntity) {
    const offsetM = opts.billboardOffsetM ?? billboardOffsetM;
    billboardEntity.position = new Cesium.CallbackProperty((time) => {
      const p = positionProp.getValue(time);
      if (!p) return undefined;
      const c = Cesium.Cartographic.fromCartesian(p);
      return Cesium.Cartesian3.fromRadians(
        c.longitude,
        c.latitude,
        (c.height || 0) + offsetM
      );
    }, false);
  }
};

/** 获取飞机屏幕信息：位置(屏幕坐标)、经纬高、朝向、速度等，供 popup 使用 */
const getPlaneScreenInfo = () => {
  if (!viewer?.scene || !modelEntity) return null;
  const time = viewer.clock.currentTime;
  const cartesian = modelEntity.position?.getValue?.(time);
  if (!cartesian) return null;
  const scene = viewer.scene;
  const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, cartesian);
  if (!win) return null;
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);
  const alt = carto.height ?? 0;
  let heading = 0;
  const q = modelEntity.orientation?.getValue?.(time);
  if (q) {
    const m3 = Cesium.Matrix3.fromQuaternion(q);
    const forwardWC = Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(forwardWC, forwardWC);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
    const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
    const forwardLocal = Cesium.Matrix4.multiplyByPointAsVector(inv, forwardWC, new Cesium.Cartesian3());
    heading = Cesium.Math.toDegrees(Math.atan2(forwardLocal.x, forwardLocal.y));
    if (heading < 0) heading += 360;
  }
  const cameraHeight = getCameraHeight();
  return {
    x: win.x,
    y: win.y,
    lon,
    lat,
    alt: Number.isFinite(alt) ? alt : 0,
    heading,
    speed: 450,
    cameraHeight: cameraHeight ?? 0
  };
};

/** 相机高度（米），用于缩放阈值 */
const getCameraHeight = () => {
  if (!viewer?.camera) return null;
  const cam = viewer.camera;
  const pos = cam.positionWC || cam.position;
  if (!pos) return null;
  const carto = Cesium.Cartographic.fromCartesian(pos);
  return carto.height;
};

/** 飞机模型巡航故障红色闪烁：true 开启，false 关闭 */
const setPlaneFaultFlash = (enable) => {
  if (_planeFaultFlashInterval) {
    clearInterval(_planeFaultFlashInterval);
    _planeFaultFlashInterval = null;
  }
  if (!modelEntity?.model) return;
  const model = modelEntity.model;
  if (!enable) {
    model.silhouetteColor = undefined;
    model.silhouetteSize = undefined;
    viewer?.scene?.requestRender?.();
    return;
  }
  model.silhouetteColor = new Cesium.ConstantProperty(Cesium.Color.RED);
  let flashOn = true;
  model.silhouetteSize = new Cesium.ConstantProperty(2.5);
  _planeFaultFlashInterval = setInterval(() => {
    if (!modelEntity?.model) return;
    flashOn = !flashOn;
    modelEntity.model.silhouetteSize = new Cesium.ConstantProperty(flashOn ? 2.5 : 0);
    viewer?.scene?.requestRender?.();
  }, 280);
};

/** 运行模块高亮：飞机半透明 + 相对飞机位置的闪烁立方体，并每帧 emit 立方体屏幕坐标 */
const setModuleHighlight = (index) => {
  _moduleHighlightIndex = index !== undefined && index !== null ? index : null;

  if (_moduleCubeFlashInterval) {
    clearInterval(_moduleCubeFlashInterval);
    _moduleCubeFlashInterval = null;
  }
  if (_moduleCubeEntity && viewer?.entities) {
    viewer.entities.remove(_moduleCubeEntity);
    _moduleCubeEntity = null;
  }
  if (modelEntity?.model) {
    modelEntity.model.color = undefined;
  }

  if (_moduleHighlightIndex === null) return;

  if (!viewer?.entities || !modelEntity) return;

  modelEntity.model.color = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.4));

  const scratchForward = new Cesium.Cartesian3();
  const scratchRight = new Cesium.Cartesian3();
  const scratchUp = new Cesium.Cartesian3();
  const scratchVec = new Cesium.Cartesian3();
  const cubePosition = new Cesium.CallbackProperty((time, result) => {
    if (!viewer || !modelEntity) return undefined;
    const pos = modelEntity.position?.getValue?.(time);
    const q = modelEntity.orientation?.getValue?.(time);
    if (!pos || !q) return undefined;
    const idx = _moduleHighlightIndex ?? 0;
    const off = MODULE_CUBE_OFFSETS[idx] ?? MODULE_CUBE_OFFSETS[0];
    const m3 = Cesium.Matrix3.fromQuaternion(q);
    Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_X, scratchForward);
    Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_Y, scratchRight);
    Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_Z, scratchUp);
    Cesium.Cartesian3.multiplyByScalar(scratchForward, off.f, scratchForward);
    Cesium.Cartesian3.multiplyByScalar(scratchRight, off.r, scratchRight);
    Cesium.Cartesian3.multiplyByScalar(scratchUp, off.u, scratchUp);
    Cesium.Cartesian3.add(scratchForward, scratchRight, scratchVec);
    Cesium.Cartesian3.add(scratchVec, scratchUp, scratchVec);
    return Cesium.Cartesian3.add(pos, scratchVec, result || new Cesium.Cartesian3());
  }, false);

  _moduleCubeFlashOn = true;
  const cubeOrientation = new Cesium.CallbackProperty((time, result) => {
    if (!modelEntity?.orientation) return undefined;
    return modelEntity.orientation.getValue(time, result || new Cesium.Quaternion());
  }, false);
  const boxColor = new Cesium.CallbackProperty((time, result) => {
    return (_moduleCubeFlashOn ? Cesium.Color.CYAN.withAlpha(0.95) : Cesium.Color.YELLOW.withAlpha(0.9)).clone(result);
  }, false);
  const boxEntity = viewer.entities.add({
    position: cubePosition,
    orientation: cubeOrientation,
    box: {
      dimensions: new Cesium.Cartesian3(0.5, 0.5, 0.5),
      material: new Cesium.ColorMaterialProperty(boxColor),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1
    }
  });
  _moduleCubeEntity = boxEntity;
};

/** 相机飞行聚焦到运行模块高亮立方体，distance 为相机与立方体的距离（米） */
const flyToModuleCube = (distance = 100) => {
  if (!viewer?.camera || !_moduleCubeEntity) return;
  viewer.flyTo(_moduleCubeEntity, {
    duration: 0.8,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), distance)
  });
};

defineExpose({
  resize,
  requestRender,
  getViewer,
  setViewState,
  getViewState,
  getPlaneEntity: () => modelEntity,
  applyPathAnimation,
  setPlanePoseAtIndex,
  getPlaneScreenInfo,
  getCameraHeight,
  setPlaneFaultFlash,
  setModuleHighlight,
  flyToModuleCube,
  clearActiveMarker: () => { activeMarkerEntity = null; }
});

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value, creditEl.value);

  viewer.scene.splitPosition = props.splitMode ? props.splitPosition : 1.0;

  const ctrl = viewer.scene?.screenSpaceCameraController;
  if (ctrl) ctrl.enableInputs = !props.readonly;

  // --- 地图点击拾取经纬度（控制台输出）---
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  clickHandler.setInputAction((movement) => {
    const scene = viewer.scene;
    const pos = movement.position;
    let cartesian = null;

    // 1) 优先使用 pickPosition（需要深度检测支持，3D Tiles/模型上也更准）
    if (scene.pickPositionSupported) {
      cartesian = scene.pickPosition(pos);
    }

    // 2) 回退：拾取地球椭球面（影像/地形场景也可用）
    if (!cartesian) {
      cartesian = viewer.camera.pickEllipsoid(pos, scene.globe.ellipsoid);
    }

    if (!cartesian) return;

    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const h = carto.height;

    // 相机参数：经纬高 + heading/pitch/roll（度）
    const cam = viewer.camera;
    const camCarto = Cesium.Cartographic.fromCartesian(cam.positionWC);
    const camLon = Cesium.Math.toDegrees(camCarto.longitude);
    const camLat = Cesium.Math.toDegrees(camCarto.latitude);
    const camH = camCarto.height ?? 0;
    const camHeading = Cesium.Math.toDegrees(cam.heading);
    const camPitch = Cesium.Math.toDegrees(cam.pitch);
    const camRoll = Cesium.Math.toDegrees(cam.roll);

    console.log(
      `[Pick] lon=${lon.toFixed(6)}, lat=${lat.toFixed(6)}, h=${Number.isFinite(h) ? h.toFixed(2) : '0.00'}m | ` +
        `cam lon=${camLon.toFixed(6)}, lat=${camLat.toFixed(6)}, h=${Number.isFinite(camH) ? camH.toFixed(2) : '0.00'}m | ` +
        `heading=${camHeading.toFixed(2)}°, pitch=${camPitch.toFixed(2)}°, roll=${camRoll.toFixed(2)}°`
    );
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  await loadAndAddUnits();

  /** 将 canvas 内坐标转为视口坐标，供静态/动态页 marker-popup 统一使用 position:fixed 定位 */
  const canvasToViewport = (canvasX, canvasY) => {
    const canvas = viewer.scene.canvas;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + canvasX, y: rect.top + canvasY };
  };

  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  pickHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position);
    if (!Cesium.defined(picked) || !picked.id) return;
    const ent = picked.id;
    if (ent.id === 'planeBillboard') {
      const pos = ent.position?.getValue(viewer.clock.currentTime);
      const win = pos ? Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos) : null;
      const screen = win ? canvasToViewport(win.x, win.y) : null;
      emit('plane-billboard-click', { screen });
      return;
    }
    const meta = ent.__meta;
    if (!meta) return;
    activeMarkerEntity = ent;
    viewer.selectedEntity = undefined;
    const pos = ent.position?.getValue(viewer.clock.currentTime);
    const win = pos ? Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos) : null;
    const screen = win ? canvasToViewport(win.x, win.y) : null;
    emit('marker-click', { meta, screen });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  const scratchCartesian2 = new Cesium.Cartesian2();
  viewer.scene.postRender.addEventListener(() => {
    if (!activeMarkerEntity) return;
    const pos = activeMarkerEntity.position?.getValue(viewer.clock.currentTime);
    if (!pos) return;
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos, scratchCartesian2);
    if (!win) return;
    const screen = canvasToViewport(win.x, win.y);
    emit('marker-move', screen);
  });

  // 输出飞机屏幕坐标，供父组件飞机跟随 popup 使用（仅静态页监听；动态页不监听以免干扰沿线运动）
  viewer.scene.postRender.addEventListener(() => {
    const info = getPlaneScreenInfo();
    if (info) emit('plane-screen-info', info);
  });

  const scratchCartesian2Module = new Cesium.Cartesian2();
  let _moduleHighlightFrameCount = 0;
  viewer.scene.postRender.addEventListener(() => {
    if (_moduleHighlightIndex == null || !_moduleCubeEntity) return;
    _moduleHighlightFrameCount++;
    _moduleCubeFlashOn = (_moduleHighlightFrameCount % 20) < 10;
    const pos = _moduleCubeEntity.position?.getValue?.(viewer.clock.currentTime);
    if (!pos) return;
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos, scratchCartesian2Module);
    if (!win) return;
    emit('module-highlight-screen', { x: win.x, y: win.y });
  });

  if (props.splitMode) {
    viewer.scene.splitPosition = props.splitPosition ?? 0.5;

    const spline = (props.followPath && props.pathPoints) ? buildSpline(props.pathPoints) : null;
    const basePosition = spline
      ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).position, false)
      : Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);

    const baseOrientation = spline
      ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).orientation, false)
      : undefined;

    let initSplitOrientation = baseOrientation;
    if (!spline) {
      const hpr = new Cesium.HeadingPitchRoll(DEFAULT_HEADING_OFFSET_RAD, 0, 0);
      initSplitOrientation = Cesium.Transforms.headingPitchRollQuaternion(basePosition, hpr);
    }

    const BILLBOARD_WORLD_OFFSET_M = 5;
    const billboardPosition = spline
      ? new Cesium.CallbackProperty(() => {
          const p = getPoseOnSpline(spline, props.pathProgress).position;
          const c0 = Cesium.Cartographic.fromCartesian(p);
          return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, (c0.height || 0) + BILLBOARD_WORLD_OFFSET_M);
        }, false)
      : (() => {
          const c0 = Cesium.Cartographic.fromCartesian(basePosition);
          return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, c0.height + BILLBOARD_WORLD_OFFSET_M);
        })();

    viewer.entities.add({
      position: basePosition,
      orientation: initSplitOrientation,
      model: {
        uri: props.leftModelUrl,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });
    viewer.entities.add({
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });

    viewer.entities.add({
      position: basePosition,
      orientation: initSplitOrientation,
      model: {
        uri: props.rightModelUrl,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      },
      splitDirection: Cesium.SplitDirection.RIGHT
    });
    viewer.entities.add({
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.RIGHT
    });

    viewer.scene.requestRender();
    window.addEventListener('resize', onWindowResize, { passive: true });
    requestAnimationFrame(() => {
      if (!viewer) return;
      viewer.resize();
      if (props.autoFocus) {
        try {
          const focusPos = spline ? getPoseOnSpline(spline, props.pathProgress).position : basePosition;
          const transform = Cesium.Transforms.eastNorthUpToFixedFrame(focusPos);
          const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
          viewer.camera.lookAtTransform(transform, offset);
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        } catch (e) {
          console.warn('[autoFocus lookAt] failed:', e);
        }
      }
      viewer.scene.requestRender();
    });
    return;
  }

  if (props.modelUrl) {
    await loadGlbModelEntity(props.modelUrl);
  }

  window.addEventListener('resize', onWindowResize, { passive: true });
  requestAnimationFrame(() => {
    if (!viewer) return;
    viewer.resize();
    viewer.scene.requestRender();
  });
});

watch(() => props.modelUrl, async (v) => {
  if (viewer && v) await loadGlbModelEntity(v);
});

watch(
  () => props.pathPoints,
  (pts) => {
    if (planePositionCartesian != null || !viewer || !Array.isArray(pts) || pts.length === 0) return;
    const p0 = pts[0];
    planePositionCartesian = Cesium.Cartesian3.fromDegrees(p0.lon, p0.lat, p0.alt ?? 0);
  },
  { immediate: true }
);

watch(
  () => [props.showClusterDepAirport, props.showClusterArrAirport],
  () => updateUnitEntitiesVisibility(),
  { deep: true }
);

watch(
  () => [props.splitMode, props.splitPosition],
  () => {
    if (!viewer?.scene) return;
    viewer.scene.splitPosition = props.splitMode ? (props.splitPosition ?? 0.5) : 1.0;
    viewer.scene.requestRender();
  }
);

watch(
  () => [props.visibleRelationId, props.visibleRelationIdsLeft, props.visibleRelationIdsRight, props.splitMode],
  () => {
    updateLinkVisibility();
  },
  { deep: true }
);

watch(
  () => props.visibleRelationId,
  (newVal) => {
    if (newVal == null) {
      RELATIONS_WITH_PLANE.forEach((rid) => removeLinkEntitiesForRelation(rid));
      updateLinkVisibility();
      return;
    }
    if (RELATIONS_WITH_PLANE.has(newVal)) {
      removeLinkEntitiesForRelation(newVal);
      drawPlaneRelationLinks(newVal);
      flyToRelationBounds(newVal);
    } else {
      updateLinkVisibility();
      flyToRelationBounds(newVal);
    }
  }
);

onBeforeUnmount(() => {
  stopFlowLoop();
  if (_planeFaultFlashInterval) {
    clearInterval(_planeFaultFlashInterval);
    _planeFaultFlashInterval = null;
  }
  if (_moduleCubeFlashInterval) {
    clearInterval(_moduleCubeFlashInterval);
    _moduleCubeFlashInterval = null;
  }
  if (_moduleCubeEntity && viewer?.entities) {
    viewer.entities.remove(_moduleCubeEntity);
    _moduleCubeEntity = null;
  }
  _moduleHighlightIndex = null;
  if (modelEntity?.model) modelEntity.model.color = undefined;
  window.removeEventListener('resize', onWindowResize);
  if (winRafId) {
    cancelAnimationFrame(winRafId);
    winRafId = 0;
  }
  clickHandler?.destroy();
  clickHandler = null;
  pickHandler?.destroy();
  pickHandler = null;
  if (viewer) {
    UNIT_ENTITY_IDS.forEach((id) => {
      try {
        viewer.entities.removeById(id);
      } catch (_) {}
    });
    UNIT_ENTITY_IDS.clear();
    UNIT_ENTITY_CLUSTER.clear();
    destroyCesiumViewer(viewer);
  }
  viewer = null;
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
