<template>
  <header class="cb-topbar">
    <div class="cb-brand">
      <img class="cb-top-icon" src="../assets/staticPage/top_left_icon.png" alt="logo" />
      <span class="cb-top-title">云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <div class="cb-tab active">静态架构</div>
        <RouterLink class="cb-tab" to="/dynamic">动态交互</RouterLink>
      </div>
    </div>
  </header>

  <div class="cb-wrap cb-wrap--static">
    <div class="cb-main">
      <div class="cb-grid">
        <!-- 左侧主区域 -->
        <section class="cb-card cb-center-card" style="display:flex;flex-direction:column;min-height:0;">
          <div class="cb-card-hd" style="justify-content:flex-start;">
            <div class="cb-card-title">
              <img class="cb-center-icon" src="../assets/staticPage/center_left_icon.png" alt="" />
              <span class="cb-center-title">中央视图区</span>
              <span class="cb-model-tag">
                <span class="cb-model-text">模型：民航客机</span>
              </span>
            </div>
          </div>

          <div class="cb-tools">
            <button class="cb-btn" :class="{ active: activeTool === '起飞' }" type="button" @click="onTool('起飞')">起飞</button>
            <button class="cb-btn" :class="{ active: activeTool === '爬升' }" type="button" @click="onTool('爬升')">爬升</button>
            <button class="cb-btn" :class="{ active: activeTool === '巡航' }" type="button" @click="onTool('巡航')">巡航</button>
            <button class="cb-btn" :class="{ active: activeTool === '进近' }" type="button" @click="onTool('进近')">进近</button>
            <button class="cb-btn" :class="{ active: activeTool === '降落' }" type="button" @click="onTool('降落')">降落</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '放大' }" type="button" @click="onTool('放大')">放大</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '缩小' }" type="button" @click="onTool('缩小')">缩小</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '巡航故障' }" type="button" @click="onTool('巡航故障')">巡航故障</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '沿线飞行' }" type="button" @click="onTool('沿线飞行')">沿线飞行</button>
          </div>

          <div style="flex:1;min-height:0;padding:0 14px 14px;">
            <div class="cb-viewport">
              <div class="cb-overlay-tabs">
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'plane' }" type="button" @click="onMapMode('plane')">飞机</button>
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'ground' }" type="button" @click="onMapMode('ground')">地面</button>
              </div>
              <div class="cb-stage">阶段：{{ phaseText }} ｜ 层级：{{ levelText }} ｜ 缩放级别：4</div>

              <!-- Cesium 视口 -->
              <div class="cb-cesium-layer"><CesiumViewport ref="vpStatic" :model-url="boeingModelUrl" :auto-focus="true" :path-points="flightRouteXA_BJDX" :path-progress="planeProgress" :follow-path="true" /></div>

              <!-- 右上角悬浮信息 -->
              <div v-if="mapMode === 'plane'" class="cb-float cb-map-popup" :style="{ backgroundImage: `url(${mapPopup})` }">
                <div class="cb-float-hd">
                  <span>飞机：民航客机</span>
                  <span style="opacity:.8;margin-right: 10px;">×</span>
                </div>
                <div class="cb-float-bd">
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">航班号：</span>
                    <span class="cb-popup-value">MU0001</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">当前高度：</span>
                    <span class="cb-popup-value">10,000m</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">目标高度：</span>
                    <span class="cb-popup-value">10,500m</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">地速：</span>
                    <span class="cb-popup-value">780km/h</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">下一航点 / ETA：</span>
                    <span class="cb-popup-value">WPT-3 / 12:05</span>
                  </div>
                </div>
              </div>

              <div v-else class="cb-float cb-map-popup" :style="{ backgroundImage: `url(${mapPopup})` }">
                <div class="cb-float-hd">
                  <span>地面系统</span>
                  <span style="opacity:.8;margin-right: 10px;">×</span>
                </div>
                <div class="cb-float-bd">
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">系统名称：</span>
                    <span class="cb-popup-value">地面站-01</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">站点位置：</span>
                    <span class="cb-popup-value">济南</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">链路状态：</span>
                    <span class="cb-popup-value">正常</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">当前负载：</span>
                    <span class="cb-popup-value">37%</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">最近上报：</span>
                    <span class="cb-popup-value">12:05</span>
                  </div>
                </div>
              </div>

              <div v-if="showWarn" class="cb-warn">
                <div class="cb-warn-hd">
                  <span class="cb-warn-title">巡航故障提示</span>
                  <img class="cb-warn-icon" :src="warnIcon" alt="" />
                </div>
                <div class="cb-warn-bd">巡航阶段遇到故障时弹出或显著提示（脚本示例驱动）。</div>
              </div>
            </div>
          </div>

          <div style="padding:0 14px 14px;color:rgba(255,255,255,.75);font-size:12px;display:flex;gap:10px;align-items:center;">
            <span>i</span>
            <span>提示：地图点位（飞机/地面/天空等符号）已在主视图区提供信息框。</span>
          </div>
        </section>

        <!-- 右侧信息面板 -->
        <aside class="cb-card cb-panel cb-msg-panel">
          <div class="cb-card-hd">
            <div class="cb-card-title">
              <img class="cb-msg-icon" src="../assets/staticPage/msgpage_icon.png" alt="" />
              <span class="cb-msg-title">信息面板</span>
            </div>
          </div>
          <div class="cb-panel-tabs">
            <button class="cb-chip" :class="{ active: activeTab === 'base' }" type="button" @click="activeTab = 'base'">
              <span class="cb-chip-text">基本单元</span>
            </button>
            <button class="cb-chip" :class="{ active: activeTab === 'relation' }" type="button" @click="activeTab = 'relation'">
              <span class="cb-chip-text">交互关系</span>
            </button>
            <button class="cb-chip" :class="{ active: activeTab === 'modules' }" type="button" @click="activeTab = 'modules'">
              <span class="cb-chip-text">运行模块</span>
            </button>
          </div>
          <div class="cb-panel-body">
            <template v-if="activeTab === 'base'">
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">星基：</span>高通量通信卫星、低轨通信卫星</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">地面：</span>飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">机载：</span>机载监测与云匣子协同终端</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else-if="activeTab === 'relation'">
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">关联：</span>卫星链路与地面控制中心</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">关联：</span>飞行控制与应急处置执行</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">模块1：</span>运行监控</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">模块2：</span>协同决策</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import * as Cesium from 'cesium';
import CesiumViewport from '../components/CesiumViewport.vue';
import mapPopup from '../assets/staticPage/map_popup.png';
import warnIcon from '../assets/staticPage/map_warnicon.png';

const boeingModelUrl = new URL('../assets/model/boeing_737.glb', import.meta.url).href;
const activeTab = ref('base');
const activeTool = ref('');
const mapMode = ref('plane');
const showWarn = ref(false);
const vpStatic = ref(null);
const phaseText = ref('起飞');
const levelText = ref('机场级');
const planeMoveEnabled = ref(false);
const planeProgress = ref(0);
let _planeMoveRaf = 0;
const planePathEnabled = ref(false);
let _tickUnsub = null;

const FOLLOW_RANGE_M = 400;
const FOLLOW_UP_M = 60;
let _camPos = null;

const lerpCartesian = (a, b, t) => {
  return Cesium.Cartesian3.add(
    Cesium.Cartesian3.multiplyByScalar(a, 1 - t, new Cesium.Cartesian3()),
    Cesium.Cartesian3.multiplyByScalar(b, t, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
};

const followPlaneOnce = () => {
  const viewer = vpStatic.value?.getViewer?.();
  const plane = vpStatic.value?.getPlaneEntity?.();
  if (!viewer || !plane) return;

  const time = viewer.clock.currentTime;
  const p = plane.position?.getValue?.(time);
  const q = plane.orientation?.getValue?.(time);
  if (!p || !q) return;

  const m3 = Cesium.Matrix3.fromQuaternion(q);
  const forwardWC = Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());
  Cesium.Cartesian3.normalize(forwardWC, forwardWC);

  const back = Cesium.Cartesian3.multiplyByScalar(forwardWC, -FOLLOW_RANGE_M, new Cesium.Cartesian3());
  const up = Cesium.Cartesian3.multiplyByScalar(
    Cesium.Cartesian3.normalize(p, new Cesium.Cartesian3()),
    FOLLOW_UP_M,
    new Cesium.Cartesian3()
  );
  const desired = Cesium.Cartesian3.add(
    Cesium.Cartesian3.add(p, back, new Cesium.Cartesian3()),
    up,
    new Cesium.Cartesian3()
  );

  if (!_camPos) _camPos = desired;
  _camPos = lerpCartesian(_camPos, desired, 0.12);

  const dir = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(p, _camPos, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const right = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(dir, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const upWC = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(right, dir, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  viewer.camera.setView({
    destination: _camPos,
    orientation: { direction: dir, up: upWC }
  });
};

const togglePlanePath = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;

  planePathEnabled.value = !planePathEnabled.value;

  if (!planePathEnabled.value) {
    viewer.clock.shouldAnimate = false;
    vpStatic.value?.applyPathAnimation?.(null);
    if (_tickUnsub) {
      _tickUnsub();
      _tickUnsub = null;
    }
    viewer.trackedEntity = undefined;
    viewer.scene?.requestRender?.();
    return;
  }

  const positions = getRoutePositions();
  const baseSeconds = 60 * 5;
  const secondsTotal = baseSeconds * 5;
  const { prop, start, stop } = buildSampledPosition(viewer, positions, secondsTotal);

  vpStatic.value?.applyPathAnimation?.(prop, { trailSeconds: 12 / 50 });

  viewer.clock.startTime = start;
  viewer.clock.stopTime = stop;
  viewer.clock.currentTime = start;
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;

  const plane = vpStatic.value?.getPlaneEntity?.();
  if (plane) viewer.trackedEntity = plane;

  const onTick = () => viewer.scene?.requestRender?.();
  viewer.clock.onTick.addEventListener(onTick);
  _tickUnsub = () => viewer.clock.onTick.removeEventListener(onTick);
};

const togglePlaneMove = () => {
  planeMoveEnabled.value = !planeMoveEnabled.value;
  if (!planeMoveEnabled.value) {
    if (_planeMoveRaf) cancelAnimationFrame(_planeMoveRaf);
    _planeMoveRaf = 0;
    return;
  }
  const start = performance.now();
  const durationMs = 60000 * 5; // 更慢速度跑完全程
  const tick = () => {
    if (!planeMoveEnabled.value) return;
    const u = ((performance.now() - start) % durationMs) / durationMs;
    planeProgress.value = u;
    followPlaneOnce();
    _planeMoveRaf = requestAnimationFrame(tick);
  };
  _planeMoveRaf = requestAnimationFrame(tick);
};

let _trailTickBound = false;
let _trailTickViewer = null;

const ROUTE_SAMPLES = 120;

const flightRouteXA_BJDX = [
  { phase: 'takeoff',  lon: 108.751, lat: 34.447, alt:    0 },
  { phase: 'climb',    lon: 109.250, lat: 34.900, alt: 2500 },
  { phase: 'climb',    lon: 110.300, lat: 35.650, alt: 8200 },
  { phase: 'cruise',   lon: 111.800, lat: 36.650, alt: 10500 },
  { phase: 'cruise',   lon: 113.400, lat: 37.500, alt: 10700 },
  { phase: 'cruise',   lon: 114.900, lat: 38.300, alt: 10600 },
  { phase: 'approach', lon: 115.750, lat: 39.050, alt:  3200 },
  { phase: 'approach', lon: 116.200, lat: 39.350, alt:   900 },
  { phase: 'landing',  lon: 116.410, lat: 39.510, alt:    0 },
];

const phaseConfig = {
  takeoff:  { name: '起飞', level: '机场级' },
  climb:    { name: '爬升', level: '区域级' },
  cruise:   { name: '巡航', level: '航路级' },
  approach: { name: '进近', level: '城市级' },
  landing:  { name: '降落', level: '机场级' }
};

const sampleCatmullRom = (route, samplesPerSeg = 28) => {
  const cps = route.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  if (cps.length < 2) return cps;
  const times = cps.map((_, i) => i);
  const spline = new Cesium.CatmullRomSpline({ times, points: cps });

  const out = [];
  const maxT = times[times.length - 1];
  const dt = 1 / samplesPerSeg;
  for (let t = 0; t <= maxT; t += dt) out.push(spline.evaluate(t));
  out.push(cps[cps.length - 1]);
  // clamp height >= 0 to avoid spline overshoot below ground
  for (let i = 0; i < out.length; i++) {
    const c = Cesium.Cartographic.fromCartesian(out[i]);
    const h = Math.max(0, c.height || 0);
    out[i] = Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, h);
  }
  return out;
};

let _routePositionsCache = null;
const getRoutePositions = () => {
  if (_routePositionsCache) return _routePositionsCache;
  _routePositionsCache = sampleCatmullRom(flightRouteXA_BJDX, ROUTE_SAMPLES);
  return _routePositionsCache;
};

const buildSampledPosition = (viewer, positions, secondsTotal = 60) => {
  const prop = new Cesium.SampledPositionProperty();
  const start = Cesium.JulianDate.now();
  const n = positions.length;
  const dt = secondsTotal / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) {
    const t = Cesium.JulianDate.addSeconds(start, i * dt, new Cesium.JulianDate());
    prop.addSample(t, positions[i]);
  }
  prop.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation
  });
  return {
    prop,
    start,
    stop: Cesium.JulianDate.addSeconds(start, secondsTotal, new Cesium.JulianDate())
  };
};

// --- Trail material for polyline (flowing texture) ---
const PolylineTrailMaterial = (() => {
  const type = 'PolylineTrail';

  const source = `
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      // st.s : along the line [0..1]
      float t = fract(st.s - time);
      // soft head-tail
      float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
      material.diffuse = color.rgb;
      material.alpha = a * color.a;
      return material;
    }
  `;

  if (!Cesium.Material._materialCache.getMaterial(type)) {
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type,
        uniforms: {
          color: new Cesium.Color(0.2, 0.8, 1.0, 0.9),
          time: 0.0,
        },
        source,
      },
      translucent: () => true,
    });
  }

  return { type };
})();

class TrailMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color ?? new Cesium.Color(0.35, 0.9, 1.0, 0.95);
    this.speed = options.speed ?? 0.8;
    this._start = performance.now();
  }

  get isConstant() { return false; }
  get definitionChanged() { return this._definitionChanged; }

  getType(time) { return PolylineTrailMaterial.type; }

  getValue(time, result) {
    if (!result) result = {};
    const t = ((performance.now() - this._start) / 1000) * this.speed;
    result.color = this.color;
    result.time = t;
    return result;
  }

  equals(other) {
    return this === other;
  }
}

const createTrailMaterialProperty = (opts = {}) => new TrailMaterialProperty(opts);

const ROUTE_ENTITY_ID = 'flightRouteXA_BJDX';
const drawFlightRoute = (viewer) => {
  if (!viewer) return;
  // 已存在则不重复添加
  const existed = viewer.entities.getById?.(ROUTE_ENTITY_ID);
  if (existed) return;

  const positions = getRoutePositions();
  viewer.entities.add({
    id: ROUTE_ENTITY_ID,
    polyline: {
      positions,
      width: 2,
      clampToGround: false,
      material: createTrailMaterialProperty({
        color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
        speed: 0.8
      })
    }
  });
  viewer.scene?.requestRender?.();
  // If requestRenderMode is enabled, keep requesting render so animated material updates.
  if (!_trailTickBound) {
    _trailTickBound = true;
    _trailTickViewer = viewer;
    const tick = () => {
      // 仅当这条航线实体仍存在时才持续刷新，避免无意义耗电
      const v = _trailTickViewer;
      if (!v || v.isDestroyed?.()) return;
      const alive = v.entities?.getById?.(ROUTE_ENTITY_ID);
      if (!alive) return;
      v.scene?.requestRender?.();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

const flyZoom = (dir) => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer?.camera) return;

  const cam = viewer.camera;
  // 当前相机世界坐标
  const pos = cam.positionWC;
  // 当前高度用于自适应步长
  const carto = Cesium.Cartographic.fromCartesian(pos);
  const h = Math.max(1, carto.height || 1);

  // 步长：高度越高，一次缩放越大
  const step = Math.max(80, h * 0.18) * 5;

  // 沿视线方向推进/拉远
  const dirWC = Cesium.Cartesian3.normalize(cam.directionWC, new Cesium.Cartesian3());
  const offset = Cesium.Cartesian3.multiplyByScalar(dirWC, dir > 0 ? step : -step, new Cesium.Cartesian3());
  const dest = Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3());

  cam.flyTo({
    destination: dest,
    orientation: {
      heading: cam.heading,
      pitch: cam.pitch,
      roll: cam.roll
    },
    duration: 0.6,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
};

const setPhase = (phaseKey) => {
  const cfg = phaseConfig[phaseKey];
  if (!cfg) return;
  phaseText.value = cfg.name;
  levelText.value = cfg.level;
};

const focusPlane = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;
  const plane = viewer.entities.getById('planeEntity');
  if (!plane) return;
  viewer.flyTo(plane, {
    duration: 0.8,
    offset: new Cesium.HeadingPitchRange(
      viewer.camera.heading,
      Cesium.Math.toRadians(-25),
      2500
    )
  });
};

const viewChina = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 6500000.0),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    },
    duration: 1.0,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
};

const onTool = (name) => {
  activeTool.value = name;
  console.log('[StaticTool]', name);
  showWarn.value = false;
  if (name === '起飞') setPhase('takeoff');
  if (name === '爬升') setPhase('climb');
  if (name === '巡航') setPhase('cruise');
  if (name === '进近') setPhase('approach');
  if (name === '降落') setPhase('landing');
  if (name === '巡航故障') showWarn.value = true;
  if (name === '放大') flyZoom(1);
  if (name === '缩小') flyZoom(-1);
  if (name === '飞机') focusPlane();
  if (name === '地面') viewChina();
  if (name === '沿线飞行') togglePlanePath();
};

const onMapMode = (m) => {
  mapMode.value = m;
  console.log('[StaticMapMode]', m);

  if (m === 'plane') {
    const viewer = vpStatic.value?.getViewer?.();
    const plane = vpStatic.value?.getPlaneEntity?.();
    if (viewer && plane) {
      viewer.flyTo(plane, {
        duration: 0.8,
        offset: new Cesium.HeadingPitchRange(
          viewer.camera.heading,
          Cesium.Math.toRadians(-25),
          200
        )
      });
    }
  }

  if (m === 'ground') {
    const viewer = vpStatic.value?.getViewer?.();
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 6500000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0
        },
        duration: 1.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
      });
    }
  }
};

onMounted(() => {
  // CesiumViewport 内部 onMounted 才创建 viewer，这里用 raf 等待一次就绪
  const tick = () => {
    const viewer = vpStatic.value?.getViewer?.();
    if (viewer) {
      drawFlightRoute(viewer);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
</script>

