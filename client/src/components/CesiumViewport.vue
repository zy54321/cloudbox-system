<template>
  <div ref="container" class="cesium-container">
    <div class="cb-map-hud">
      <div class="cb-map-hud__tools">
        <button class="cb-map-tool cb-map-tool--home" type="button" title="复位" @click="resetCameraHome">复位</button>
        <button class="cb-map-tool cb-map-tool--compass" type="button" title="回正北" @click="resetCameraNorth">
          <span class="cb-map-tool__compass-ring"></span>
          <span class="cb-map-tool__compass-arrow" :style="{ transform: `translateX(-50%) rotate(${-compassHeadingDeg}deg)` }"></span>
          <span class="cb-map-tool__compass-text">N</span>
        </button>
      </div>
      <div class="cb-map-scale">
        <span class="cb-map-scale__label">{{ scaleBarLabel }}</span>
        <span class="cb-map-scale__bar" :style="{ width: `${scaleBarWidthPx || 40}px` }"></span>
      </div>
    </div>
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
const _publicAsset = (path) => encodeURI(`${typeof window !== 'undefined' ? window.location.origin : ''}${_base ? _base + '/' : '/'}${String(path).replace(/^\//, '')}`);
const planeBillboardImgUrl = _publicImg('img/planeBillBoardImg2.png');
const unitBillboardImgUrl = _publicImg('img/planeBillBoardImg.png');
const chinaAdminGeoJsonUrl = _publicAsset('json/中国_polyline.geojson');
const UNIT_LABEL_FADE_START = 60000;
const UNIT_LABEL_HIDE_DISTANCE = 90000;
const UNIT_LABEL_MIN_SCALE = 0.75;
const SCENE_LIGHT_INTENSITY = 3.4;
const MODEL_ENV_BRIGHTNESS = 30.35;
const MODEL_ENV_ATMOSPHERE_SCATTER = 3.1;
const FOG_MIN_BRIGHTNESS = 0.18;
const DEFAULT_DAYLIGHT_TIME_UTC = '2026-04-04T04:00:00Z';
const AIRPORT_LABEL_HEIGHT_OFFSET_M = 12;
const AIRPORT_LABEL_FADE_START = 1500000;
const AIRPORT_LABEL_HIDE_DISTANCE = 12000000;
const AIRPORT_LABEL_PIXEL_OFFSET = new Cesium.Cartesian2(0, -18);

const emit = defineEmits(['marker-click', 'marker-move', 'marker-close', 'plane-screen-info', 'plane-billboard-click', 'module-highlight-screen', 'camera-home']);

const props = defineProps({
  modelUrl: { type: String, default: '' },
  unitsUrl: { type: String, default: `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/config/units.json` },
  linksUrl: { type: String, default: `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/config/links.json` },
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
  depAirportLabel: { type: String, default: '' },
  arrAirportLabel: { type: String, default: '' },
  showClusterDepAirport: { type: Boolean, default: true },
  showClusterArrAirport: { type: Boolean, default: true },
  /** 当前要显示的关联 id（来自 links.json relation.id），为 null 时所有链路隐藏；保留兼容：转为 Left */
  visibleRelationId: { type: String, default: null },
  skipRelationNodeFocus: { type: Boolean, default: false },
  /** 左/右视口关联 id（透传自 ViewerStage；仅 splitMode=true 的 legacy 双视口使用，正式链路已冻结该入口） */
  visibleRelationIdsLeft: { type: Array, default: () => [] },
  visibleRelationIdsRight: { type: Array, default: () => [] },
  visibleUnitClusterIdsLeft: { type: Array, default: () => [] },
  visibleUnitClusterIdsRight: { type: Array, default: () => [] },
  /**
   * splitMode=false：iframe 子页（dual-iframe-poc scene.js）/ 单屏共用；本侧激活 relation.id。
   * 非空时优先于 visibleRelationId / visibleRelationIdsLeft（legacy 单屏仍可走后者）。
   */
  activeRelationIds: { type: Array, default: () => [] },
  /** splitMode=false：iframe 单侧 unit 簇（如 DYN_YES）；非空时优先于 *Left/Right */
  activeUnitClusterIds: { type: Array, default: () => [] }
});

/**
 * D3 候选清单（splitMode=true 专用；当前应用仅单屏 splitMode=false，以下仍为死代码保留）：
 * - props：splitMode、leftModelUrl、rightModelUrl、splitPosition（及 split 相关的 visibleRelationIds* 消费路径）
 * - 方法：updateUnitEntitiesVisibilitySplitLegacy、updateLinkVisibilitySplitMode；drawPlaneRelationLinks 在 split 下的侧别分支
 * - 调用点：load 后 watch 内 `if (props.splitMode) updateUnitEntitiesVisibilitySplitLegacy()`、`updateLinkVisibilitySplitMode`；
 *   syncRelationsFromActiveIds 的 `if (props.splitMode)` 早退；viewer.scene.splitPosition 与双模型加载分支（约 2639+）
 * - watcher：`[props.splitMode, props.splitPosition]`、pathPoints+splitMode 等
 * 本轮不删除，避免误伤单屏与静态页复用。
 */

const container = ref(null);
const creditEl = ref(null);
const compassHeadingDeg = ref(0);
const scaleBarLabel = ref('');
const scaleBarWidthPx = ref(0);

let viewer = null;
let chinaBoundaryDataSource = null;
let chinaBoundaryGeoJsonPromise = null;
let modelEntity = null;
let billboardEntity = null;
let depAirportLabelEntity = null;
let arrAirportLabelEntity = null;
let clickHandler = null;
let pickHandler = null;
let activeMarkerEntity = null;
let _planeFaultFlashInterval = null;
let _moduleHighlightIndex = null;
let _moduleCubeEntity = null;
let _moduleCubeFlashInterval = null;
let _moduleCubeFlashOn = true;
let _airborneDetailCubeEntity = null;
let _airborneDetailCubeFlashInterval = null;
let _airborneDetailCubeFlashOn = true;
let _staticAirborneDetailActive = false;
let _planeAttachedMarkersVisible = true;
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
let removeHudPostRender = null;
let lastHudUpdateMs = 0;
let _pendingBrightnessBoosts = new Map();
let _brightnessBoostPostRenderAttached = false;
const PLANE_ATTACHED_UNIT_OFFSETS = new Map();

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
const UNIT_TEXT_BILLBOARD_CACHE = new Map();
const UNIT_ENTITY_CLUSTER = new Map();
const LINK_ENTITY_IDS = new Set();
const LINK_ENTITY_RELATION_IDS = new Map(); // linkEntityId -> relationId
/** relationId -> { parent, children[] }，用于聚焦时把两端标点纳入视野 */
const RELATION_UNIT_IDS = new Map();
/** relationId -> flowLabel（INFO/CTRL/信息流/控制流等），用于选择材质 */
const RELATION_FLOW_LABEL = new Map();
/** relationId -> viewPreset，相机聚焦时优先采用配置预设 */
const RELATION_VIEW_PRESET = new Map();
/** relationId -> cam，全链路巡航结束后的全局视角 */
const RELATION_CAMERA_VIEW = new Map();
/** linkEntityId -> 'left' | 'right' | 'none'（用于 splitMode 下的 plane 链路） */
const LINK_ENTITY_SIDE = new Map();
/** linkId -> { parentId, childId }，用于阶段切换后按当前端点位置刷新链路（如飞机移动） */
const LINK_ENTITY_ENDPOINTS = new Map();
/** 飞机位置变量：起飞/巡航等阶段切换时更新，绘制与飞机连接的链路时用此坐标 */
let planePositionCartesian = null;
/** 含端点 "plane" 的关联 id 集合，这些链路在用户点击该关联时再按当前飞机位置重绘 */
const RELATIONS_WITH_PLANE = new Set();
let _relationFocusSeq = 0;

/** 静态架构页「运行模块」聚光灯：仅显示指定 unit id，可选是否显示飞机模型/billboard */
let staticSpotlightActive = false;
let staticSpotlightUnitIds = new Set();
let staticSpotlightShowPlane = false;
let _staticBillboardFlashInterval = null;
let _staticPlaneFlashInterval = null;

const getEntityBaseUnitId = (entity, rawId) => {
  if (entity?.__meta?.anchorId) return String(entity.__meta.anchorId);
  const s = String(rawId || '');
  if (s.endsWith('__text')) return s.slice(0, -7);
  return s;
};

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
  const isArrow = (f === 'CTRL' || f === '控制流');
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

const applyUnitSplitDirection = (entity, dir) => {
  entity.splitDirection = dir;
  if (entity.billboard) entity.billboard.splitDirection = dir;
  if (entity.point) entity.point.splitDirection = dir;
};

/**
 * splitMode=false 时正式 relation.id：优先 props.activeRelationIds（ViewerStage 注入 iframe 子页 / 单屏）；
 * 仅选单 id 的旧页（如 StaticHome）可只传 visibleRelationId，不读 visibleRelationIdsLeft/Right。
 */
const getFormalRelationIdsNonSplit = () => {
  const a = (props.activeRelationIds || []).map(String).filter(Boolean);
  if (a.length) return a;
  if (props.visibleRelationId != null) return [String(props.visibleRelationId)];
  return [];
};

/**
 * iframe / 单屏主路径：簇可见性 + 与正式 relation 相关的 plane- 附件高亮；仅消费 activeUnitClusterIds + getFormalRelationIdsNonSplit。
 */
const syncUnitHighlightsFromActiveIds = () => {
  if (!viewer?.entities) return;
  const ac = props.activeUnitClusterIds || [];
  const activeUnitOnly = ac.length > 0;
  const singleClusterSet = activeUnitOnly ? new Set(ac.map(String).filter(Boolean)) : null;
  const hasDynamicFilter = activeUnitOnly && singleClusterSet.size > 0;

  const activeRelationPlaneUnitIds = new Set();
  getFormalRelationIdsNonSplit().forEach((rid) => {
    const relData = RELATION_UNIT_IDS.get(String(rid));
    relData?.edges?.forEach(([fromId, toId]) => {
      if (String(fromId || '').startsWith('plane-')) activeRelationPlaneUnitIds.add(String(fromId));
      if (String(toId || '').startsWith('plane-')) activeRelationPlaneUnitIds.add(String(toId));
    });
  });

  UNIT_ENTITY_IDS.forEach((id) => {
    const e = viewer.entities.getById(id);
    const clusterId = UNIT_ENTITY_CLUSTER.get(id);
    if (!e) return;

    if (!hasDynamicFilter) {
      let visible = true;
      if (clusterId === 'DEP_AIRPORT') visible = props.showClusterDepAirport;
      else if (clusterId === 'ARR_AIRPORT') visible = props.showClusterArrAirport;
      else if (clusterId === 'PLANE') visible = _planeAttachedMarkersVisible;
      if (e.__meta?.isPlaneAttachedCube) {
        const baseId = getEntityBaseUnitId(e, id);
        visible = _planeAttachedMarkersVisible && (_staticAirborneDetailActive || activeRelationPlaneUnitIds.has(baseId));
      }
      e.show = visible;
      applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
      return;
    }

    const cid = String(clusterId || '');
    e.show = singleClusterSet.has(cid);
    applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
  });

  if (staticSpotlightActive) {
    UNIT_ENTITY_IDS.forEach((id) => {
      const e = viewer.entities.getById(id);
      if (!e) return;
      if (e.__meta?.isPlaneAttachedCube) {
        const baseId = getEntityBaseUnitId(e, id);
        e.show = staticSpotlightUnitIds.has(baseId);
        applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
        return;
      }
      const baseId = getEntityBaseUnitId(e, id);
      e.show = staticSpotlightUnitIds.has(baseId);
      applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
    });
    if (modelEntity) modelEntity.show = staticSpotlightShowPlane;
    if (billboardEntity) billboardEntity.show = staticSpotlightShowPlane;
  }

  viewer.scene.requestRender?.();
};

/** legacy splitMode=true 双视口（已冻结非正式入口）：消费 visibleUnitClusterIdsLeft/Right 与 visibleRelationId */
const updateUnitEntitiesVisibilitySplitLegacy = () => {
  if (!viewer?.entities) return;
  const leftSet = new Set((props.visibleUnitClusterIdsLeft || []).map(String).filter(Boolean));
  const rightSet = new Set((props.visibleUnitClusterIdsRight || []).map(String).filter(Boolean));
  const hasDynamicFilter = leftSet.size > 0 || rightSet.size > 0;
  const activeRelationPlaneUnitIds = new Set();
  if (props.visibleRelationId) {
    const relData = RELATION_UNIT_IDS.get(props.visibleRelationId);
    relData?.edges?.forEach(([fromId, toId]) => {
      if (String(fromId || '').startsWith('plane-')) activeRelationPlaneUnitIds.add(String(fromId));
      if (String(toId || '').startsWith('plane-')) activeRelationPlaneUnitIds.add(String(toId));
    });
  }

  UNIT_ENTITY_IDS.forEach((id) => {
    const e = viewer.entities.getById(id);
    const clusterId = UNIT_ENTITY_CLUSTER.get(id);
    if (!e) return;

    if (!hasDynamicFilter) {
      let visible = true;
      if (clusterId === 'DEP_AIRPORT') visible = props.showClusterDepAirport;
      else if (clusterId === 'ARR_AIRPORT') visible = props.showClusterArrAirport;
      else if (clusterId === 'PLANE') visible = _planeAttachedMarkersVisible;
      if (e.__meta?.isPlaneAttachedCube) {
        const baseId = getEntityBaseUnitId(e, id);
        visible = _planeAttachedMarkersVisible && (_staticAirborneDetailActive || activeRelationPlaneUnitIds.has(baseId));
      }
      e.show = visible;
      applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
      return;
    }

    const cid = String(clusterId || '');
    const inLeft = leftSet.has(cid);
    const inRight = rightSet.has(cid);
    e.show = inLeft || inRight;

    let dir = Cesium.SplitDirection.NONE;
    if (inLeft && !inRight) dir = Cesium.SplitDirection.LEFT;
    else if (!inLeft && inRight) dir = Cesium.SplitDirection.RIGHT;

    applyUnitSplitDirection(e, dir);
  });

  if (staticSpotlightActive) {
    UNIT_ENTITY_IDS.forEach((id) => {
      const e = viewer.entities.getById(id);
      if (!e) return;
      if (e.__meta?.isPlaneAttachedCube) {
        const baseId = getEntityBaseUnitId(e, id);
        e.show = staticSpotlightUnitIds.has(baseId);
        applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
        return;
      }
      const baseId = getEntityBaseUnitId(e, id);
      e.show = staticSpotlightUnitIds.has(baseId);
      applyUnitSplitDirection(e, Cesium.SplitDirection.NONE);
    });
    if (modelEntity) modelEntity.show = staticSpotlightShowPlane;
    if (billboardEntity) billboardEntity.show = staticSpotlightShowPlane;
  }

  viewer.scene.requestRender?.();
};

const updateUnitEntitiesVisibility = () => {
  if (!viewer?.entities) return;
  if (props.splitMode) updateUnitEntitiesVisibilitySplitLegacy();
  else syncUnitHighlightsFromActiveIds();
};

const roundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const buildUnitTextBillboardImage = (text) => {
  const key = String(text || '').trim();
  if (!key) return null;
  if (UNIT_TEXT_BILLBOARD_CACHE.has(key)) return UNIT_TEXT_BILLBOARD_CACHE.get(key);

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const fontSize = 14;
  const fontWeight = 600;
  const fontFamily = '"Source Han Sans CN", "Source Han Sans", "Microsoft YaHei", sans-serif';
  const padX = 10;
  const padY = 6;
  const radius = 10;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(key);
  const textWidth = Math.ceil(metrics.width);
  const width = textWidth + padX * 2;
  const height = fontSize + padY * 2 + 2;

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  ctx.scale(dpr, dpr);
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, radius);
  ctx.fillStyle = 'rgba(14, 44, 123, 0.58)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(42, 116, 201, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 204, 255, 0.42)';
  ctx.lineWidth = 2.2;
  ctx.strokeText(key, width / 2, height / 2 + 0.5);

  ctx.fillStyle = 'rgba(235, 248, 255, 0.98)';
  ctx.fillText(key, width / 2, height / 2 + 0.5);

  const result = { image: canvas, width, height };
  UNIT_TEXT_BILLBOARD_CACHE.set(key, result);
  return result;
};

const loadAndAddUnits = async () => {
  if (!viewer?.entities) return;
  try {
    const res = await fetch(props.unitsUrl);
    if (!res.ok) return;
    const data = await res.json();

    const addBillboard = (unit, clusterId) => {
      const altM = unit.alt ?? unit.alt_m ?? 0;
      const imgUrl = unit.image ? _publicImg(unit.image) : unitBillboardImgUrl;
      const scale = unit.scale != null
        ? Number(unit.scale)
        : (unit.size != null ? Number(unit.size) : 0.5);
      const offsetX = unit.offset?.[0] ?? 0;
      const offsetY = (unit.offset?.[1] ?? -28) + 25;
      const initialCartesian = Cesium.Cartesian3.fromDegrees(unit.lon, unit.lat, altM);

      const baseMeta = {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        typeLabel: toUnitTypeLabel(unit.type),
        lon: unit.lon,
        lat: unit.lat,
        alt: altM,
        alt_m: altM,
        clusterId: clusterId ?? null,
        info: unit.info || '',
        infoSource: unit.infoSource || ''
      };

      const resolvePlaneAttachedPosition = (time, result) => {
        if (clusterId !== 'PLANE') {
          return Cesium.Cartesian3.clone(initialCartesian, result || new Cesium.Cartesian3());
        }
        if (!modelEntity?.position || !modelEntity?.orientation) {
          return Cesium.Cartesian3.clone(initialCartesian, result || new Cesium.Cartesian3());
        }
        const planePos = modelEntity.position.getValue(time);
        const planeOrientation = modelEntity.orientation.getValue(time);
        if (!planePos || !planeOrientation) {
          return Cesium.Cartesian3.clone(initialCartesian, result || new Cesium.Cartesian3());
        }

        let localOffset = PLANE_ATTACHED_UNIT_OFFSETS.get(unit.id);
        if (!localOffset) {
          const diff = Cesium.Cartesian3.subtract(initialCartesian, planePos, new Cesium.Cartesian3());
          const rot = Cesium.Matrix3.fromQuaternion(planeOrientation, new Cesium.Matrix3());
          const invRot = Cesium.Matrix3.transpose(rot, new Cesium.Matrix3());
          localOffset = Cesium.Matrix3.multiplyByVector(invRot, diff, new Cesium.Cartesian3());
          PLANE_ATTACHED_UNIT_OFFSETS.set(unit.id, localOffset);
        }

        const rotNow = Cesium.Matrix3.fromQuaternion(planeOrientation, new Cesium.Matrix3());
        const worldOffset = Cesium.Matrix3.multiplyByVector(rotNow, localOffset, new Cesium.Cartesian3());
        return Cesium.Cartesian3.add(planePos, worldOffset, result || new Cesium.Cartesian3());
      };

      const position = clusterId === 'PLANE'
        ? new Cesium.CallbackProperty(resolvePlaneAttachedPosition, false)
        : initialCartesian;
      const planeBillboardShow = clusterId === 'PLANE'
        ? new Cesium.CallbackProperty((time) => {
            if (!viewer?.camera || !viewer?.scene?.globe) return true;
            const pos = position?.getValue?.(time);
            if (!pos) return true;
            const occluder = new Cesium.EllipsoidalOccluder(
              viewer.scene.globe.ellipsoid,
              viewer.camera.positionWC
            );
            return occluder.isPointVisible(pos);
          }, false)
        : true;
      const planeAttachedOrientation = clusterId === 'PLANE'
        ? new Cesium.CallbackProperty((time, result) => {
            if (!modelEntity?.orientation) return undefined;
            return modelEntity.orientation.getValue(time, result || new Cesium.Quaternion());
          }, false)
        : undefined;

      const iconEntity = viewer.entities.add({
        id: unit.id,
        position,
        billboard: {
          image: imgUrl,
          show: planeBillboardShow,
          scale,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: clusterId === 'PLANE'
            ? new Cesium.Cartesian2(0, -8)
            : Cesium.Cartesian2.ZERO,
          splitDirection: Cesium.SplitDirection.NONE
        }
      });
      iconEntity.__meta = baseMeta;

      UNIT_ENTITY_IDS.add(iconEntity.id);
      if (clusterId) UNIT_ENTITY_CLUSTER.set(iconEntity.id, clusterId);

      if (clusterId === 'PLANE') {
        const cubeEntityId = `${unit.id}__cube`;
        const cubeEntity = viewer.entities.add({
          id: cubeEntityId,
          position,
          orientation: planeAttachedOrientation,
          box: {
            dimensions: new Cesium.Cartesian3(0.5, 0.5, 0.5),
            material: Cesium.Color.CYAN.withAlpha(0.95),
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
            outlineWidth: 1
          }
        });
        cubeEntity.__meta = { ...baseMeta, isPlaneAttachedCube: true, anchorId: unit.id };
        UNIT_ENTITY_IDS.add(cubeEntity.id);
        UNIT_ENTITY_CLUSTER.set(cubeEntity.id, clusterId);
      }

      const textTexture = buildUnitTextBillboardImage(unit.name);
      if (textTexture) {
        const textEntityId = `${unit.id}__text`;
        const textEntity = viewer.entities.add({
          id: textEntityId,
          position,
          billboard: {
            image: textTexture.image,
            show: planeBillboardShow,
            width: textTexture.width,
            height: textTexture.height,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(offsetX, offsetY),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, UNIT_LABEL_HIDE_DISTANCE),
            translucencyByDistance: new Cesium.NearFarScalar(UNIT_LABEL_FADE_START, 1.0, UNIT_LABEL_HIDE_DISTANCE, 0.0),
            scaleByDistance: new Cesium.NearFarScalar(1000.0, 1.0, UNIT_LABEL_HIDE_DISTANCE, UNIT_LABEL_MIN_SCALE),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            splitDirection: Cesium.SplitDirection.NONE
          }
        });
        textEntity.__meta = { ...baseMeta, isTextBillboard: true, anchorId: unit.id };
        UNIT_ENTITY_IDS.add(textEntity.id);
        if (clusterId) UNIT_ENTITY_CLUSTER.set(textEntity.id, clusterId);
      }
    };

    const space = data.space;
    if (space?.star_based?.length) {
      space.star_based.forEach((u) => {
        addBillboard({ ...u, alt: u.alt ?? u.alt_m ?? 0 }, null);
      });
    }

    const plane = data.plane;
    if (Array.isArray(plane) && plane.length) {
      plane.forEach((u) => {
        addBillboard({ ...u, alt: u.alt ?? u.alt_m ?? 0 }, 'PLANE');
      });
    }

    const ground = data.ground;
    if (ground?.clusters?.length) {
      ground.clusters.forEach((cluster) => {
        const clusterId = cluster.clusterId;
        (cluster.units || []).forEach((u) => {
          addBillboard({ ...u, alt: u.alt ?? 0 }, clusterId);
        });
      });
    }

    await loadAndAddLinks();
    updateUnitEntitiesVisibility();
    ensureChinaBoundaryDataSourceBehind();
  } catch (e) {
    console.warn('[CesiumViewport] load units.json failed:', e);
  }
};

/**
 * 仅移除「含 plane」正式链路几何（linkTier formal-plane-dynamic），供 syncRelationsFromActiveIds 在重画前对齐集合；
 * 不碰静态 links.json 载入的 formal-static 折线。
 */
/** @returns 移除的含 plane 动态链路实体数量 */
const removeAllPlaneRelationLinkEntities = () => {
  if (!RELATIONS_WITH_PLANE.size || !viewer?.entities) return 0;
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
  return toRemove.length;
};

/**
 * legacy splitMode=true 双视口分屏（已冻结，非正式链路）。
 * 消费 visibleRelationIdsLeft/Right；正式双屏 iframe（splitMode=false）不得进入此分支。
 */
const updateLinkVisibilitySplitMode = () => {
  if (!viewer?.entities) return;
  const leftArr = props.visibleRelationId != null ? [props.visibleRelationId] : (props.visibleRelationIdsLeft || []);
  const rightArr = props.visibleRelationIdsRight || [];
  const leftSet = new Set(leftArr.map(String).filter(Boolean));
  const rightSet = new Set(rightArr.map(String).filter(Boolean));

  removeAllPlaneRelationLinkEntities();
  if (RELATIONS_WITH_PLANE.size) {
    leftSet.forEach((rid) => {
      if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'left');
    });
    rightSet.forEach((rid) => {
      if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'right');
    });
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
      if (inLeft && inRight) {
        dir = Cesium.SplitDirection.NONE;
      } else if (inLeft) {
        dir = Cesium.SplitDirection.LEFT;
      } else if (inRight) {
        dir = Cesium.SplitDirection.RIGHT;
      }
    }

    e.show = show;
    e.splitDirection = dir;
    if (e.polyline) e.polyline.splitDirection = dir;

    if (e.polyline && e.polyline.material && e.polyline.material.splitDir !== undefined) {
      if (dir === Cesium.SplitDirection.LEFT) {
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

/**
 * iframe / 单屏主路径（splitMode=false）：正式链路来自 getFormalRelationIdsNonSplit()（activeRelationIds 优先）；
 * 含 plane 的边在此重建几何，静态边仅切换 show。不读取 visibleRelationIdsLeft/Right。
 */
const syncRelationsFromActiveIds = () => {
  if (!viewer?.entities) return;
  const formalIds = getFormalRelationIdsNonSplit();
  const activeSet = new Set(formalIds);
  let relationsWithPlaneInActiveSet = 0;
  activeSet.forEach((rid) => {
    if (RELATIONS_WITH_PLANE.has(rid)) relationsWithPlaneInActiveSet += 1;
  });

  const removedPlaneLinkEntities = removeAllPlaneRelationLinkEntities();
  if (RELATIONS_WITH_PLANE.size) {
    activeSet.forEach((rid) => {
      if (RELATIONS_WITH_PLANE.has(rid)) drawPlaneRelationLinks(rid, 'none');
    });
  }

  LINK_ENTITY_IDS.forEach((linkId) => {
    const e = viewer.entities.getById(linkId);
    if (!e) return;
    const relId = LINK_ENTITY_RELATION_IDS.get(linkId);
    if (!relId) return;
    const rid = String(relId);

    const show = activeSet.has(rid);
    const dir = Cesium.SplitDirection.NONE;

    e.show = show;
    e.splitDirection = dir;
    if (e.polyline) e.polyline.splitDirection = dir;

    if (e.polyline && e.polyline.material && e.polyline.material.splitDir !== undefined) {
      e.polyline.material.splitDir = 0.0;
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

  console.debug('[compare-link-sync]', 'syncRelationsFromActiveIds', {
    activeRelationIds: formalIds.slice(),
    relationsWithPlaneInActiveSet,
    removedPlaneLinkEntities,
    anyShown
  });
};

const updateLinkVisibility = () => {
  if (!viewer?.entities) return;
  if (props.splitMode) updateLinkVisibilitySplitMode();
  else syncRelationsFromActiveIds();
};

/** 飞行聚焦到指定关联的链路范围（链路折点 + 父/子标点，并留足边距以看到完整内容） */
const getRelationCameraOffsetByPreset = (preset, points) => {
  const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
  const radius = Math.max(boundingSphere.radius, 1);
  switch (String(preset || '').trim()) {
    case 'space-ground':
      return null;
    case 'plane-sat':
      return new Cesium.HeadingPitchRange(
        viewer?.camera?.heading ?? 0,
        Cesium.Math.toRadians(-68),
        Math.max(radius * 2.4, 120000)
      );
    case 'ground-local':
      return new Cesium.HeadingPitchRange(
        viewer?.camera?.heading ?? 0,
        Cesium.Math.toRadians(-74),
        Math.min(Math.max(radius * 1.75, 18000), 180000)
      );
    case 'plane-local':
      return new Cesium.HeadingPitchRange(
        viewer?.camera?.heading ?? 0,
        Cesium.Math.toRadians(-28),
        Math.min(Math.max(radius * 3.2, 1200), 24000)
      );
    default:
      return null;
  }
};

const flyToSpaceGroundRelation = (points) => {
  if (!viewer?.camera || !Array.isArray(points) || points.length < 2) return false;

  const cartographics = points
    .map((p) => Cesium.Cartographic.fromCartesian(p))
    .filter(Boolean);
  if (!cartographics.length) return false;

  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let maxHeight = 0;

  cartographics.forEach((c) => {
    west = Math.min(west, c.longitude);
    south = Math.min(south, c.latitude);
    east = Math.max(east, c.longitude);
    north = Math.max(north, c.latitude);
    maxHeight = Math.max(maxHeight, Math.max(0, Number(c.height) || 0));
  });

  const lonSpan = Math.max(east - west, Cesium.Math.toRadians(0.35));
  const latSpan = Math.max(north - south, Cesium.Math.toRadians(0.28));
  const lonPad = lonSpan * 0.32;
  const latPad = latSpan * 0.4;
  const rectangle = Cesium.Rectangle.fromRadians(
    west - lonPad,
    south - latPad,
    east + lonPad,
    north + latPad
  );

  const rectDestination = viewer.camera.getRectangleCameraCoordinates(rectangle);
  const rectCartographic = rectDestination
    ? Cesium.Cartographic.fromCartesian(rectDestination)
    : null;
  const centerLon = (rectangle.west + rectangle.east) / 2;
  const centerLat = (rectangle.south + rectangle.north) / 2;
  const rectHeight = Math.max(0, rectCartographic?.height || 0);
  const cameraHeight = Math.max(rectHeight * 1.08, maxHeight * 2.6, 320000);

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(centerLon, centerLat, cameraHeight),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-88.5),
      roll: 0
    },
    duration: 1.2,
    easingFunction: Cesium.EasingFunction.CUBIC_OUT
  });
  return true;
};

const getRelationCameraOffset = (points, preset) => {
  if (!Array.isArray(points) || points.length < 2) {
    return new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 180000);
  }

  const presetOffset = getRelationCameraOffsetByPreset(preset, points);
  if (presetOffset) return presetOffset;

  const cartographics = points
    .map((p) => Cesium.Cartographic.fromCartesian(p))
    .filter(Boolean);

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = 0;
  cartographics.forEach((c) => {
    const h = Math.max(0, Number(c.height) || 0);
    minHeight = Math.min(minHeight, h);
    maxHeight = Math.max(maxHeight, h);
  });
  const heightSpan = Math.max(0, maxHeight - (Number.isFinite(minHeight) ? minHeight : 0));

  let maxDistance = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Cesium.Cartesian3.distance(points[i], points[j]);
      if (d > maxDistance) maxDistance = d;
    }
  }

  const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
  const radius = Math.max(boundingSphere.radius, 1);
  const isSpaceGroundLink = maxHeight >= 100000 || heightSpan >= 80000;
  const isShortGroundLink = maxHeight < 30000 && maxDistance <= 250000;

  let pitchDeg = -58;
  let range = Math.max(radius * 2.4, maxDistance * 1.05, 45000);

  if (isSpaceGroundLink) {
    // 高差很大时改为更俯视并增大留白，保证卫星到地面的整条链路能完整进框。
    pitchDeg = -72;
    range = Math.max(radius * 2.8, maxDistance * 1.1, heightSpan * 1.8, 180000);
  } else if (isShortGroundLink) {
    // 纯地面短链路时收近视角，避免“看得到但太远不清楚”。
    pitchDeg = -74;
    range = Math.max(radius * 1.8, maxDistance * 1.35, 12000);
    range = Math.min(range, 180000);
  } else {
    range = Math.max(radius * 2.2, maxDistance * 1.0, 60000);
  }

  return new Cesium.HeadingPitchRange(
    viewer?.camera?.heading ?? 0,
    Cesium.Math.toRadians(pitchDeg),
    range
  );
};

const flyToRelationBounds = (relationId) => {
  if (!viewer?.scene?.camera || !relationId) return;
  const points = [];
  const time = viewer.clock.currentTime;
  const preset = RELATION_VIEW_PRESET.get(relationId);
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
  if (preset === 'space-ground' && flyToSpaceGroundRelation(points)) {
    return;
  }
  const boundingSphere = Cesium.BoundingSphere.fromPoints(points);
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.2,
    offset: getRelationCameraOffset(points, preset),
    easingFunction: Cesium.EasingFunction.CUBIC_OUT
  });
};

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRelationNodeOrder = (relationId) => {
  const relData = RELATION_UNIT_IDS.get(relationId);
  const edges = relData?.edges || [];
  const order = [];
  const seen = new Set();
  edges.forEach(([fromId, toId]) => {
    [fromId, toId].forEach((nodeId) => {
      const id = String(nodeId || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      order.push(id);
    });
  });
  return order;
};

const isValidRelationCameraView = (cam) => {
  if (!cam || typeof cam !== 'object') return false;
  return ['lon', 'lat', 'height', 'heading', 'pitch', 'roll'].every((key) => Number.isFinite(Number(cam[key])));
};

const flyCameraToRelationCameraView = (relationId, opts = {}) => {
  if (!viewer?.camera) return false;
  const cam = RELATION_CAMERA_VIEW.get(relationId);
  if (!isValidRelationCameraView(cam)) return false;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(Number(cam.lon), Number(cam.lat), Number(cam.height)),
    orientation: {
      heading: Cesium.Math.toRadians(Number(cam.heading)),
      pitch: Cesium.Math.toRadians(Number(cam.pitch)),
      roll: Cesium.Math.toRadians(Number(cam.roll))
    },
    duration: opts.duration ?? 1.2,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
  return true;
};

const flyCameraToPlaneNode = (opts = {}) => {
  if (!viewer?.camera || !modelEntity) return false;
  viewer.flyTo(modelEntity, {
    duration: opts.duration ?? 0.9,
    offset: new Cesium.HeadingPitchRange(
      opts.heading ?? 0,
      Cesium.Math.toRadians(opts.pitchDeg ?? -24),
      opts.range ?? 5
    )
  });
  return true;
};

const focusRelationNode = async (nodeId, seq) => {
  if (seq !== _relationFocusSeq) return;
  const isPlaneNode = nodeId === 'plane';
  if (isPlaneNode) {
    if (!flyCameraToPlaneNode()) return;
    await waitMs(1100);
    if (seq !== _relationFocusSeq) return;
    await flashPlaneModelBrief(3);
    return;
  }

  const entity = viewer?.entities?.getById(nodeId);
  if (!entity?.position) return;
  flyCameraToUnitId(nodeId, {
    duration: 0.9,
    pitchDeg: -24,
    range: 30
  });
  await waitMs(1100);
  if (seq !== _relationFocusSeq) return;
  await flashUnitBillboards([nodeId], 3);
};

const playRelationNodeFocusSequence = async (relationId, opts = {}) => {
  if (!relationId) return;
  const seq = ++_relationFocusSeq;
  const order = getRelationNodeOrder(relationId);
  if (!order.length) return;

  for (const nodeId of order) {
    if (seq !== _relationFocusSeq) return;
    await focusRelationNode(nodeId, seq);
    if (seq !== _relationFocusSeq) return;
    await waitMs(180);
  }
  if (seq !== _relationFocusSeq) return;
  if (!opts.skipFinalRelationCameraView) {
    flyCameraToRelationCameraView(relationId);
  }
};

/** 多条链路同一聚焦代际：按 relationIds 顺序，每条内按节点顺序（compare 子页阶段机用） */
const playRelationIdsNodeFocusSequence = async (relationIds, opts = {}) => {
  if (!Array.isArray(relationIds) || !relationIds.length) return;
  const seq = ++_relationFocusSeq;
  for (const relationId of relationIds) {
    if (!relationId || seq !== _relationFocusSeq) return;
    const order = getRelationNodeOrder(relationId);
    for (const nodeId of order) {
      if (seq !== _relationFocusSeq) return;
      await focusRelationNode(nodeId, seq);
      if (seq !== _relationFocusSeq) return;
      await waitMs(180);
    }
  }
  if (seq !== _relationFocusSeq) return;
  if (!opts.skipFinalRelationCameraView && relationIds.length) {
    const last = relationIds[relationIds.length - 1];
    flyCameraToRelationCameraView(last);
  }
};

const cancelRelationFocusSequence = () => {
  _relationFocusSeq++;
};

/** 沿线/恢复巡航时跟随飞机；链路节点序列时由子页关闭 */
const setPlaneCameraFollow = (enabled) => {
  if (!viewer) return;
  viewer.trackedEntity = enabled && modelEntity ? modelEntity : undefined;
  viewer.scene?.requestRender?.();
};

/**
 * 按 relationId 删除所有匹配链路实体（粗暴）；仅保留给 legacy 与 load 重建等内部路径。
 * 正式 iframe/单屏链路集合变更请走 syncRelationsFromActiveIds，避免与闪烁等临时效果误伤（若未来共用 entity）。
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
 * 内部：绘制「与飞机连接的」正式链路几何（Tier A：formal-plane-dynamic）。
 * 仅供 viewport 内 syncRelationsFromActiveIds / legacy split 调用；外部页面勿直接调用。
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
    const linkEnt = viewer.entities.add({
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
    try {
      linkEnt.__meta = { ...(linkEnt.__meta || {}), linkTier: 'formal-plane-dynamic' };
    } catch (_) {}
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
 * 含「plane」的关联不在此画，由 syncRelationsFromActiveIds / legacy split 内 drawPlaneRelationLinks 动态挂载。
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
  RELATION_VIEW_PRESET.clear();
  RELATION_CAMERA_VIEW.clear();
  RELATIONS_WITH_PLANE.clear();
  try {
    const res = await fetch(props.linksUrl || `${_base ? _base + '/' : '/'}config/links.json`);
    if (!res.ok) return;
    const data = await res.json();
    const relations = data.relations || [];
    for (const rel of relations) {
      const edges = normalizeRelationEdges(rel);
      if (!edges.length) continue;
      RELATION_UNIT_IDS.set(rel.id, { edges: edges.map((e) => [...e]) });
      RELATION_FLOW_LABEL.set(rel.id, rel.flowLabel);
      RELATION_VIEW_PRESET.set(rel.id, rel.viewPreset || '');
      if (isValidRelationCameraView(rel.cam)) {
        RELATION_CAMERA_VIEW.set(rel.id, {
          lon: Number(rel.cam.lon),
          lat: Number(rel.cam.lat),
          height: Number(rel.cam.height),
          heading: Number(rel.cam.heading),
          pitch: Number(rel.cam.pitch),
          roll: Number(rel.cam.roll)
        });
      }
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
        const staticLinkEnt = viewer.entities.add({
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
        try {
          staticLinkEnt.__meta = { ...(staticLinkEnt.__meta || {}), linkTier: 'formal-static' };
        } catch (_) {}
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

/**
 * 取飞机当前坐标：优先 modelEntity + clock（含跟飞/动画时的最新位置），成功则回写 planePositionCartesian；
 * 避免含 plane 的 relation 同步仍吃旧缓存。
 */
const getPlanePosition = () => {
  if (viewer && modelEntity?.position?.getValue) {
    try {
      const jd = viewer.clock?.currentTime;
      const p = jd
        ? modelEntity.position.getValue(jd)
        : modelEntity.position.getValue(Cesium.JulianDate.now());
      if (p) {
        planePositionCartesian = Cesium.Cartesian3.clone(p);
        return p;
      }
    } catch (_) {}
  }
  return planePositionCartesian ?? getEntityPosition('planeEntity');
};

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

/** 递归查找与 entity 绑定的 Model（ModelVisualizer 会在 model.id 上挂载 entity） */
const findModelForEntity = (primitives, entity) => {
  if (!primitives?.length) return null;
  for (let i = 0; i < primitives.length; i++) {
    const p = primitives.get(i);
    if (!p) continue;
    if (p.environmentMapManager && p.id === entity) return p;
    if (typeof p.get === 'function' && p.length > 0) {
      const nested = findModelForEntity(p, entity);
      if (nested) return nested;
    }
  }
  return null;
};

const detachBrightnessBoostWatcher = () => {
  if (!_brightnessBoostPostRenderAttached || !viewer?.scene?.postRender) return;
  try { viewer.scene.postRender.removeEventListener(processPendingBrightnessBoosts); } catch (_) {}
  _brightnessBoostPostRenderAttached = false;
};

function processPendingBrightnessBoosts() {
  if (!viewer?.scene || _pendingBrightnessBoosts.size === 0) {
    detachBrightnessBoostWatcher();
    return;
  }

  for (const [key, task] of _pendingBrightnessBoosts.entries()) {
    const entity = task?.entity;
    if (!entity) {
      _pendingBrightnessBoosts.delete(key);
      continue;
    }

    const runtimeModel = findModelForEntity(viewer.scene.primitives, entity);
    if (runtimeModel) {
      boostModelBrightness(runtimeModel);
      task.holdFrames -= 1;
      if (task.holdFrames <= 0) {
        _pendingBrightnessBoosts.delete(key);
      }
      continue;
    }

    task.attempts += 1;
    if (task.attempts >= task.maxAttempts) {
      _pendingBrightnessBoosts.delete(key);
    }
  }

  if (_pendingBrightnessBoosts.size === 0) {
    detachBrightnessBoostWatcher();
  }
}

const queueBrightnessBoost = (entity, opts = {}) => {
  if (!viewer?.scene?.postRender || !entity) return;
  const key = entity.id || Cesium.createGuid();
  _pendingBrightnessBoosts.set(key, {
    entity,
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 600,
    holdFrames: opts.holdFrames ?? 90
  });
  if (_brightnessBoostPostRenderAttached) return;
  viewer.scene.postRender.addEventListener(processPendingBrightnessBoosts);
  _brightnessBoostPostRenderAttached = true;
};

const loadGlbModelEntity = async (uri) => {
  if (!viewer || !uri) return;
  PLANE_ATTACHED_UNIT_OFFSETS.clear();
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
  // ModelVisualizer 挂 runtime model 存在异步时序，这里改为统一排队并连续补几帧亮度，避免偶发失效。
  queueBrightnessBoost(planeEntity);
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
  if (!props.splitMode) {
    syncRelationsFromActiveIds();
  } else if (props.visibleRelationId != null && RELATIONS_WITH_PLANE.has(props.visibleRelationId)) {
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

const toUnitTypeLabel = (type) => {
  if (type === 'satellite') return '卫星节点';
  if (type === 'ground_unit') return '地面节点';
  if (type === 'aircraft') return '机载节点';
  if (type === 'airport') return '机场节点';
  return type || '未知类型';
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

const loadChinaBoundaryGeoJsonObject = async () => {
  if (!chinaBoundaryGeoJsonPromise) {
    chinaBoundaryGeoJsonPromise = fetch(chinaAdminGeoJsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`[china boundary] load failed: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        chinaBoundaryGeoJsonPromise = null;
        throw err;
      });
  }
  return chinaBoundaryGeoJsonPromise;
};

/** 将行政区划数据源置于 dataSources 最底层，避免折线遮挡后续 entities（标点、飞机等） */
const ensureChinaBoundaryDataSourceBehind = () => {
  if (!viewer || !chinaBoundaryDataSource) return;
  try {
    viewer.dataSources.lowerToBottom(chinaBoundaryDataSource);
  } catch (_) {}
  viewer.scene?.requestRender?.();
};

/** 行政区划最远可见距离（米）：避免掠射角下远处国界仍被画出；太空俯视仍大致可见全国轮廓 */
const CHINA_BOUNDARY_MAX_VIEW_DISTANCE_M = 9_000_000;

const styleChinaBoundaryDataSource = (dataSource) => {
  if (!dataSource?.entities) return;
  const mainColor = Cesium.Color.fromCssColorString('#49D8FF').withAlpha(0.72);
  const outlineColor = Cesium.Color.fromCssColorString('#0A2A66').withAlpha(0.88);
  const entities = dataSource.entities.values;
  for (const entity of entities) {
    if (entity.label) entity.label.show = false;
    if (entity.billboard) entity.billboard.show = false;
    if (entity.point) entity.point.show = false;

    if (entity.polyline) {
      entity.polyline.width = 2.8;
      entity.polyline.material = new Cesium.PolylineOutlineMaterialProperty({
        color: mainColor,
        outlineColor,
        outlineWidth: 2.0
      });
      // 不设 depthFailMaterial：掠射角/地平线附近失败深度时不应再画一条「透过地表」的线，否则远处边界会不合理出现
      entity.polyline.depthFailMaterial = undefined;
      entity.polyline.clampToGround = true;
      entity.polyline.arcType = Cesium.ArcType.GEODESIC;
      entity.polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        0.0,
        CHINA_BOUNDARY_MAX_VIEW_DISTANCE_M
      );
    }

    if (entity.polygon) {
      entity.polygon.fill = false;
      entity.polygon.outline = true;
      entity.polygon.outlineColor = mainColor;
      entity.polygon.material = Cesium.Color.TRANSPARENT;
      entity.polygon.height = 0;
      entity.polygon.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
        0.0,
        CHINA_BOUNDARY_MAX_VIEW_DISTANCE_M
      );
    }
  }
};

const loadChinaBoundaryLayer = async () => {
  if (!viewer || chinaBoundaryDataSource) return;
  try {
    const geojson = await loadChinaBoundaryGeoJsonObject();
    const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
      clampToGround: true,
      stroke: Cesium.Color.fromCssColorString('#49D8FF').withAlpha(0.72),
      fill: Cesium.Color.TRANSPARENT,
      strokeWidth: 2.8,
      markerSize: 0
    });
    styleChinaBoundaryDataSource(dataSource);
    chinaBoundaryDataSource = dataSource;
    await viewer.dataSources.add(dataSource);
    ensureChinaBoundaryDataSourceBehind();
    viewer.scene.requestRender?.();
  } catch (err) {
    console.warn('[china boundary] load failed:', err);
  }
};

const removeAirportEndpointLabels = () => {
  if (!viewer) return;
  if (depAirportLabelEntity) {
    try { viewer.entities.remove(depAirportLabelEntity); } catch (_) {}
    depAirportLabelEntity = null;
  }
  if (arrAirportLabelEntity) {
    try { viewer.entities.remove(arrAirportLabelEntity); } catch (_) {}
    arrAirportLabelEntity = null;
  }
};

const VIEWPORT_ROUTE_POLYLINE_ID = 'cbViewportPathRoute';

const removeViewportRoutePolyline = () => {
  if (!viewer?.entities) return;
  try {
    viewer.entities.removeById(VIEWPORT_ROUTE_POLYLINE_ID);
  } catch (_) {}
};

/** 单屏 iframe：由 props.pathPoints 驱动航线折线；split 双卷帘仍由父页 ROUTE_ENTITY_ID 等处理，此处不叠加 */
const syncViewportRoutePolyline = () => {
  if (!viewer?.entities) return;
  removeViewportRoutePolyline();
  if (props.splitMode) {
    viewer.scene?.requestRender?.();
    return;
  }
  const pts = props.pathPoints;
  if (!Array.isArray(pts) || pts.length < 2) {
    viewer.scene?.requestRender?.();
    return;
  }
  const positions = pts.map((p) =>
    Cesium.Cartesian3.fromDegrees(Number(p.lon), Number(p.lat), Number(p.alt ?? 0))
  );
  viewer.entities.add({
    id: VIEWPORT_ROUTE_POLYLINE_ID,
    polyline: {
      positions,
      width: 2,
      clampToGround: false,
      material: Cesium.Color.fromCssColorString('#59E8FF').withAlpha(0.9)
    }
  });
  viewer.scene?.requestRender?.();
};

const syncAirportEndpointLabels = () => {
  if (!viewer) return;
  removeAirportEndpointLabels();
  const pts = props.pathPoints;
  if (!Array.isArray(pts) || pts.length < 2) return;

  const start = pts[0];
  const end = pts[pts.length - 1];
  const depName = (props.depAirportLabel || '').trim();
  const arrName = (props.arrAirportLabel || '').trim();

  const buildLabelEntity = (id, point, text) => {
    if (!point || !text) return null;
    const altitude = Math.max(0, Number(point.alt ?? 0)) + AIRPORT_LABEL_HEIGHT_OFFSET_M;
    return viewer.entities.add({
      id,
      position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, altitude),
      label: {
        text,
        font: '600 18px "Microsoft YaHei", "PingFang SC", sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString('#7EE7FF').withAlpha(0.96),
        outlineColor: Cesium.Color.fromCssColorString('#08214D').withAlpha(0.98),
        outlineWidth: 4,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0A1F4D').withAlpha(0.46),
        backgroundPadding: new Cesium.Cartesian2(10, 6),
        pixelOffset: AIRPORT_LABEL_PIXEL_OFFSET,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 1e10)
      }
    });
  };

  depAirportLabelEntity = buildLabelEntity('depAirportLabel', start, depName);
  arrAirportLabelEntity = buildLabelEntity('arrAirportLabel', end, arrName);
  viewer.scene.requestRender?.();
};

const applySceneBrightnessBoost = () => {
  if (!viewer?.scene) return;
  try {
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(DEFAULT_DAYLIGHT_TIME_UTC);
  } catch (_) {}
  viewer.scene.light = new Cesium.SunLight({
    color: Cesium.Color.WHITE,
    intensity: SCENE_LIGHT_INTENSITY
  });
  if (viewer.scene.atmosphere) {
    viewer.scene.atmosphere.dynamicLighting = Cesium.DynamicAtmosphereLightingType.SUNLIGHT;
  }
  if (viewer.scene.fog) {
    viewer.scene.fog.minimumBrightness = Math.max(viewer.scene.fog.minimumBrightness || 0, FOG_MIN_BRIGHTNESS);
  }
  viewer.scene.requestRender?.();
};

const boostModelBrightness = (runtimeModel) => {
  if (!runtimeModel) return;
  try {
    runtimeModel.color = undefined;
    runtimeModel.colorBlendMode = undefined;
    runtimeModel.colorBlendAmount = undefined;
    if (runtimeModel.environmentMapManager) {
      runtimeModel.environmentMapManager.brightness = MODEL_ENV_BRIGHTNESS;
      runtimeModel.environmentMapManager.atmosphereScatteringIntensity = MODEL_ENV_ATMOSPHERE_SCATTER;
    }
  } catch (_) {}
};

const clearPlaneHighlightVisual = () => {
  if (!modelEntity?.model) return;
  modelEntity.model.color = undefined;
  modelEntity.model.colorBlendMode = undefined;
  modelEntity.model.colorBlendAmount = undefined;
  viewer?.scene?.requestRender?.();
};

const applyPlaneDimHighlightVisual = () => {
  if (!modelEntity?.model) return;
  modelEntity.model.color = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.4));
  modelEntity.model.colorBlendMode = new Cesium.ConstantProperty(Cesium.ColorBlendMode.MIX);
  modelEntity.model.colorBlendAmount = new Cesium.ConstantProperty(0.35);
  viewer?.scene?.requestRender?.();
};

const setPlaneDimmed = (active) => {
  if (active) applyPlaneDimHighlightVisual();
  else clearPlaneHighlightVisual();
};

const setPlaneAttachedMarkersVisible = (visible) => {
  _planeAttachedMarkersVisible = visible !== false;
  updateUnitEntitiesVisibility();
};

const formatScaleDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return '';
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const getNiceScaleDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  const exponent = Math.floor(Math.log10(meters));
  const unit = Math.pow(10, exponent);
  const normalized = meters / unit;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return nice * unit;
};

const updateCompassHeading = () => {
  if (!viewer?.camera) return;
  compassHeadingDeg.value = Cesium.Math.toDegrees(viewer.camera.heading || 0);
};

const updateScaleBar = () => {
  if (!viewer?.scene?.canvas || !viewer?.camera) {
    return;
  }
  const scene = viewer.scene;
  const canvas = scene.canvas;
  const width = canvas.clientWidth || canvas.width || 0;
  const height = canvas.clientHeight || canvas.height || 0;
  if (width < 120 || height < 80) {
    return;
  }
  const samplePx = Math.max(80, Math.min(140, Math.round(width * 0.12)));
  const y = Math.max(30, height - 56);
  const left = new Cesium.Cartesian2(Math.round(width / 2 - samplePx / 2), y);
  const right = new Cesium.Cartesian2(Math.round(width / 2 + samplePx / 2), y);
  const leftRay = viewer.camera.getPickRay(left);
  const rightRay = viewer.camera.getPickRay(right);
  if (!leftRay || !rightRay) {
    return;
  }
  const leftPos = scene.globe.pick(leftRay, scene);
  const rightPos = scene.globe.pick(rightRay, scene);
  if (!leftPos || !rightPos) {
    return;
  }
  const leftCarto = Cesium.Cartographic.fromCartesian(leftPos);
  const rightCarto = Cesium.Cartographic.fromCartesian(rightPos);
  const geodesic = new Cesium.EllipsoidGeodesic(leftCarto, rightCarto);
  const rawMeters = geodesic.surfaceDistance;
  if (!Number.isFinite(rawMeters) || rawMeters <= 0) {
    return;
  }
  const niceMeters = getNiceScaleDistance(rawMeters);
  if (!niceMeters) {
    return;
  }
  scaleBarLabel.value = formatScaleDistance(niceMeters);
  scaleBarWidthPx.value = Math.max(36, Math.round(samplePx * (niceMeters / rawMeters)));
};

const updateMapHud = (force = false) => {
  const now = Date.now();
  if (!force && now - lastHudUpdateMs < 120) return;
  lastHudUpdateMs = now;
  updateCompassHeading();
  updateScaleBar();
};

const exitStaticAirborneOrbit = () => {
  if (!viewer?.camera) return;
  try {
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  } catch (_) {}
};

const enterStaticAirborneOrbit = (range = 70) => {
  if (!viewer?.camera || !modelEntity?.position) return false;
  const time = viewer.clock.currentTime;
  const pos = modelEntity.position.getValue(time);
  if (!pos) return false;
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
  viewer.trackedEntity = undefined;
  viewer.camera.lookAtTransform(
    transform,
    new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), range)
  );
  viewer.scene.requestRender?.();
  return true;
};

const resetCameraHome = () => {
  if (!viewer) return;
  emit('camera-home');
  if (_staticAirborneDetailActive) {
    clearStaticAirborneDetailCube();
    clearPlaneHighlightVisual();
    _staticAirborneDetailActive = false;
    exitStaticAirborneOrbit();
  }
  if (modelEntity) {
    viewer.flyTo(modelEntity, {
      duration: 0.8,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 140)
    });
    viewer.scene.requestRender?.();
    return;
  }
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 1000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 0.8
  });
  viewer.scene.requestRender?.();
};

const resetCameraNorth = () => {
  if (!viewer?.camera) return;
  const destination = viewer.camera.positionWC?.clone?.() || viewer.camera.position?.clone?.();
  if (!destination) return;
  viewer.camera.flyTo({
    destination,
    orientation: {
      heading: 0,
      pitch: viewer.camera.pitch,
      roll: 0
    },
    duration: 0.6
  });
  viewer.scene.requestRender?.();
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
  clearPlaneHighlightVisual();

  if (_moduleHighlightIndex === null) return;

  if (!viewer?.entities || !modelEntity) return;

  applyPlaneDimHighlightVisual();

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

const clearStaticBillboardFlashTimers = () => {
  if (_staticBillboardFlashInterval) {
    clearInterval(_staticBillboardFlashInterval);
    _staticBillboardFlashInterval = null;
  }
  if (_staticPlaneFlashInterval) {
    clearInterval(_staticPlaneFlashInterval);
    _staticPlaneFlashInterval = null;
  }
};

const clearStaticAirborneDetailCube = () => {
  if (_airborneDetailCubeFlashInterval) {
    clearInterval(_airborneDetailCubeFlashInterval);
    _airborneDetailCubeFlashInterval = null;
  }
  if (_airborneDetailCubeEntity && viewer?.entities) {
    viewer.entities.remove(_airborneDetailCubeEntity);
    _airborneDetailCubeEntity = null;
  }
  _staticAirborneDetailActive = false;
};

/** 结束静态页模块聚光灯并恢复标点/飞机显示 */
const clearStaticModuleSpotlight = () => {
  clearStaticBillboardFlashTimers();
  clearStaticAirborneDetailCube();
  staticSpotlightActive = false;
  staticSpotlightUnitIds.clear();
  staticSpotlightShowPlane = false;
  if (modelEntity?.model) {
    clearPlaneHighlightVisual();
    modelEntity.model.silhouetteColor = undefined;
    modelEntity.model.silhouetteSize = undefined;
  }
  UNIT_ENTITY_IDS.forEach((id) => {
    const e = viewer?.entities?.getById(id);
    if (e?.billboard && e.billboard.color) {
      try { e.billboard.color = undefined; } catch (_) {}
    }
  });
  if (modelEntity) modelEntity.show = true;
  if (billboardEntity) billboardEntity.show = true;
  updateUnitEntitiesVisibility();
  viewer?.scene?.requestRender?.();
};

/**
 * 静态页：仅显示给定 unit id 的标点（含 __text），可选显示飞机实体
 * @param {boolean} active
 * @param {string[]} unitIds
 * @param {boolean} showPlane
 */
const setStaticModuleSpotlight = (active, unitIds = [], showPlane = false) => {
  if (!active) {
    clearStaticModuleSpotlight();
    return;
  }
  clearStaticBillboardFlashTimers();
  staticSpotlightActive = true;
  staticSpotlightUnitIds = new Set((unitIds || []).map(String).filter(Boolean));
  staticSpotlightShowPlane = !!showPlane;
  updateUnitEntitiesVisibility();
};

/** 静态页：机载详情高亮，仅保持当前相机，飞机半透明并显示持续闪烁的小立方体 */
const setStaticAirborneDetailHighlight = (active, unitIds = []) => {
  if (!active) {
    clearStaticAirborneDetailCube();
    _staticAirborneDetailActive = false;
    clearPlaneHighlightVisual();
    exitStaticAirborneOrbit();
    updateUnitEntitiesVisibility();
    viewer?.scene?.requestRender?.();
    return;
  }
  clearStaticAirborneDetailCube();
  _staticAirborneDetailActive = true;
  applyPlaneDimHighlightVisual();
  updateUnitEntitiesVisibility();
  viewer?.scene?.requestRender?.();
};

/** 与静态页「太空」按钮一致的相机视角 */
const flyCameraStaticSpaceView = (opts = {}) => {
  if (!viewer?.camera) return;
  const duration = opts.duration ?? 1.0;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(120.901020, 26.363403, 3394682.08),
    orientation: {
      heading: Cesium.Math.toRadians(341.06),
      pitch: Cesium.Math.toRadians(-59.67),
      roll: Cesium.Math.toRadians(359.98)
    },
    duration,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
};

const flyCameraToUnitId = (unitId, opts = {}) => {
  if (!viewer?.camera) return;
  const e = viewer.entities.getById(unitId);
  if (!e?.position) return;
  const time = viewer.clock.currentTime;
  const pos = e.position.getValue(time);
  if (!pos) return;
  const carto = Cesium.Cartographic.fromCartesian(pos);
  const h = carto.height ?? 0;
  const range = h > 100000 ? Math.max(h * 0.35, 400000) : Math.max(h + 8000, 12000);
  viewer.flyTo(e, {
    duration: opts.duration ?? 0.9,
    offset: new Cesium.HeadingPitchRange(
      opts.heading ?? 0,
      Cesium.Math.toRadians(opts.pitchDeg ?? -40),
      opts.range ?? range
    )
  });
};

const flyCameraToUnitIdsBoundingSphere = (unitIds, opts = {}) => {
  if (!viewer?.camera) return;
  const time = viewer.clock.currentTime;
  const points = [];
  for (const uid of unitIds || []) {
    const e = viewer.entities.getById(uid);
    const p = e?.position?.getValue?.(time);
    if (p) points.push(Cesium.Cartesian3.clone(p));
  }
  if (opts.includePlane && modelEntity?.position) {
    const p = modelEntity.position.getValue(time);
    if (p) points.push(Cesium.Cartesian3.clone(p));
  }
  if (points.length === 0) return;
  const bs = Cesium.BoundingSphere.fromPoints(points);
  const r = Math.max(bs.radius * 2.8, 25000);
  viewer.camera.flyToBoundingSphere(bs, {
    duration: opts.duration ?? 1.1,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), r)
  });
};

/** 指定 unit 的图标/文字 billboard 闪烁若干次（整组同步明灭） */
const flashUnitBillboards = (unitIds, flashCount = 3) => {
  return new Promise((resolve) => {
    if (!viewer) {
      resolve();
      return;
    }
    clearStaticBillboardFlashTimers();
    const entities = [];
    for (const uid of unitIds || []) {
      const icon = viewer.entities.getById(uid);
      const text = viewer.entities.getById(`${uid}__text`);
      if (icon?.billboard) entities.push(icon);
      if (text?.billboard) entities.push(text);
    }
    if (entities.length === 0) {
      resolve();
      return;
    }
    let step = 0;
    const total = Math.max(1, flashCount) * 2;
    const textBillboardRestore = new Map();
    entities.forEach((ent) => {
      if (!ent?.billboard || !ent.__meta?.isTextBillboard) return;
      textBillboardRestore.set(ent.id, {
        distanceDisplayCondition: ent.billboard.distanceDisplayCondition,
        translucencyByDistance: ent.billboard.translucencyByDistance,
        scaleByDistance: ent.billboard.scaleByDistance
      });
      ent.billboard.distanceDisplayCondition = undefined;
      ent.billboard.translucencyByDistance = undefined;
      ent.billboard.scaleByDistance = undefined;
    });
    _staticBillboardFlashInterval = setInterval(() => {
      const on = step % 2 === 0;
      entities.forEach((ent) => {
        if (!ent?.billboard) return;
        ent.billboard.color = on
          ? Cesium.Color.WHITE.withAlpha(1)
          : Cesium.Color.YELLOW.withAlpha(0.45);
      });
      viewer.scene.requestRender?.();
      step++;
      if (step >= total) {
        clearInterval(_staticBillboardFlashInterval);
        _staticBillboardFlashInterval = null;
        entities.forEach((ent) => {
          if (!ent?.billboard) return;
          try { ent.billboard.color = undefined; } catch (_) {}
          const restore = textBillboardRestore.get(ent.id);
          if (!restore) return;
          ent.billboard.distanceDisplayCondition = restore.distanceDisplayCondition;
          ent.billboard.translucencyByDistance = restore.translucencyByDistance;
          ent.billboard.scaleByDistance = restore.scaleByDistance;
        });
        viewer.scene.requestRender?.();
        resolve();
      }
    }, 240);
  });
};

/** 飞机模型轮廓短暂闪烁若干次（用于应急处置模块） */
const flashPlaneModelBrief = (flashCount = 3) => {
  return new Promise((resolve) => {
    if (!viewer || !modelEntity?.model) {
      resolve();
      return;
    }
    clearStaticBillboardFlashTimers();
    const model = modelEntity.model;
    model.silhouetteColor = new Cesium.ConstantProperty(Cesium.Color.RED);
    let step = 0;
    const total = Math.max(1, flashCount) * 2;
    _staticPlaneFlashInterval = setInterval(() => {
      const on = step % 2 === 0;
      model.silhouetteSize = new Cesium.ConstantProperty(on ? 2.8 : 0);
      viewer.scene.requestRender?.();
      step++;
      if (step >= total) {
        clearInterval(_staticPlaneFlashInterval);
        _staticPlaneFlashInterval = null;
        model.silhouetteColor = undefined;
        model.silhouetteSize = undefined;
        viewer.scene.requestRender?.();
        resolve();
      }
    }, 260);
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
  setPlaneDimmed,
  setPlaneAttachedMarkersVisible,
  flyCameraToRelationCameraView,
  setModuleHighlight,
  flyToModuleCube,
  clearStaticModuleSpotlight,
  setStaticModuleSpotlight,
  setStaticAirborneDetailHighlight,
  enterStaticAirborneOrbit,
  exitStaticAirborneOrbit,
  flyCameraStaticSpaceView,
  flyCameraToUnitId,
  flyCameraToUnitIdsBoundingSphere,
  flashUnitBillboards,
  flashPlaneModelBrief,
  playRelationNodeFocusSequence,
  playRelationIdsNodeFocusSequence,
  cancelRelationFocusSequence,
  setPlaneCameraFollow,
  clearActiveMarker: () => { activeMarkerEntity = null; },
  resetCameraHome
});

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value, creditEl.value);
  await loadChinaBoundaryLayer();
  applySceneBrightnessBoost();

  const hudPostRender = () => updateMapHud(false);
  viewer.scene.postRender.addEventListener(hudPostRender);
  removeHudPostRender = () => {
    try { viewer?.scene?.postRender?.removeEventListener(hudPostRender); } catch (_) {}
  };
  updateMapHud(true);

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
  syncAirportEndpointLabels();

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

    const splitLeftPlaneEntity = viewer.entities.add({
      id: 'planeEntitySplitLeft',
      position: basePosition,
      orientation: initSplitOrientation,
      model: {
        uri: props.leftModelUrl,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });
    const splitLeftBillboardEntity = viewer.entities.add({
      id: 'planeBillboardSplitLeft',
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });

    const splitRightPlaneEntity = viewer.entities.add({
      id: 'planeEntitySplitRight',
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
      id: 'planeBillboardSplitRight',
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.RIGHT
    });

    // 双屏模式下仍复用“主飞机实体”给复位按钮、飞机跟随信息等通用逻辑。
    modelEntity = splitLeftPlaneEntity;
    billboardEntity = splitLeftBillboardEntity;
    queueBrightnessBoost(splitLeftPlaneEntity);
    queueBrightnessBoost(splitRightPlaneEntity);

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
  () => [
    props.showClusterDepAirport,
    props.showClusterArrAirport,
    props.visibleUnitClusterIdsLeft,
    props.visibleUnitClusterIdsRight,
    props.activeUnitClusterIds,
    props.splitMode
  ],
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
  () => [
    props.splitMode,
    props.activeRelationIds,
    props.visibleRelationId,
    props.visibleRelationIdsLeft,
    props.visibleRelationIdsRight
  ],
  () => {
    updateLinkVisibility();
  },
  { deep: true }
);

watch(
  () => props.visibleRelationId,
  (newVal) => {
    _relationFocusSeq++;
    if (newVal == null) {
      clearPlaneHighlightVisual();
      updateLinkVisibility();
      updateUnitEntitiesVisibility();
      return;
    }
    applyPlaneDimHighlightVisual();
    updateLinkVisibility();
    updateUnitEntitiesVisibility();
    if (!props.skipRelationNodeFocus) {
      playRelationNodeFocusSequence(newVal);
    }
  }
);

let _focusTimerIdsLeft = 0;
watch(
  () => (props.visibleRelationIdsLeft || []).map(String).join(','),
  () => {
    if (props.splitMode || props.skipRelationNodeFocus) return;
    const ids = props.visibleRelationIdsLeft || [];
    if (!ids.length) return;
    const last = ids[ids.length - 1];
    clearTimeout(_focusTimerIdsLeft);
    _focusTimerIdsLeft = setTimeout(() => {
      playRelationNodeFocusSequence(last);
    }, 120);
  }
);

let _focusTimerIdsRight = 0;
watch(
  () => (props.visibleRelationIdsRight || []).map(String).join(','),
  () => {
    if (props.splitMode || props.skipRelationNodeFocus) return;
    const ids = props.visibleRelationIdsRight || [];
    if (!ids.length) return;
    const last = ids[ids.length - 1];
    clearTimeout(_focusTimerIdsRight);
    _focusTimerIdsRight = setTimeout(() => {
      playRelationNodeFocusSequence(last);
    }, 120);
  }
);

watch(
  () => [props.pathPoints, props.depAirportLabel, props.arrAirportLabel],
  () => syncAirportEndpointLabels(),
  { deep: true }
);

watch(
  () => [props.pathPoints, props.splitMode],
  () => syncViewportRoutePolyline(),
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  _relationFocusSeq++;
  clearStaticModuleSpotlight();
  stopFlowLoop();
  PLANE_ATTACHED_UNIT_OFFSETS.clear();
  _pendingBrightnessBoosts.clear();
  detachBrightnessBoostWatcher();
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
  if (removeHudPostRender) {
    removeHudPostRender();
    removeHudPostRender = null;
  }
  clickHandler?.destroy();
  clickHandler = null;
  pickHandler?.destroy();
  pickHandler = null;
  removeViewportRoutePolyline();
  removeAirportEndpointLabels();
  if (viewer) {
    if (chinaBoundaryDataSource) {
      try { viewer.dataSources.remove(chinaBoundaryDataSource, true); } catch (_) {}
      chinaBoundaryDataSource = null;
    }
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
  position: relative;
}

.cb-map-hud {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 36;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.cb-map-hud__tools {
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.cb-map-tool {
  pointer-events: auto;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(0, 197, 255, 0.62);
  background: rgba(7, 22, 50, 0.58);
  box-shadow: inset 0 0 16px rgba(0, 197, 255, 0.22), 0 8px 18px rgba(0, 0, 0, 0.18);
  color: #EAFBFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  user-select: none;
}

.cb-map-tool--home {
  width: 56px;
  font-size: 13px;
  font-weight: 700;
}

.cb-map-tool--compass {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
}

.cb-map-tool__compass-ring {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.26);
}

.cb-map-tool__compass-arrow {
  position: absolute;
  left: 50%;
  top: 9px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 18px solid #00E5FF;
  transform-origin: 50% 17px;
}

.cb-map-tool__compass-text {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 800;
  color: #FFFFFF;
  text-shadow: 0 0 8px rgba(0, 197, 255, 0.6);
}

.cb-map-scale {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 197, 255, 0.42);
  background: rgba(7, 22, 50, 0.52);
  box-shadow: inset 0 0 16px rgba(0, 197, 255, 0.16), 0 8px 18px rgba(0, 0, 0, 0.18);
  color: #EAFBFF;
  backdrop-filter: blur(8px);
}

.cb-map-scale__label {
  font-size: 12px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
}

.cb-map-scale__bar {
  display: block;
  height: 0;
  border-top: 3px solid #00E5FF;
  border-left: 2px solid #00E5FF;
  border-right: 2px solid #00E5FF;
  box-sizing: border-box;
}
</style>
