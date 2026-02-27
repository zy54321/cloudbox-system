
<template>
  <header class="cb-topbar">
    <div class="cb-brand">
      <img class="cb-top-icon" src="../assets/staticPage/top_left_icon.png" alt="logo" />
      <span class="cb-top-title">云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <RouterLink class="cb-tab" to="/">静态架构</RouterLink>
        <div class="cb-tab active">动态交互</div>
      </div>
    </div>
  </header>

  <div class="cb-wrap cb-wrap--dynamic">
    <section class="cb-scene-bar cb-scene-panel">
      <div class="cb-scene-head">
        <div class="cb-scene-title">
          <img class="cb-scene-title-icon" :src="dvTitleIconLeft" alt="" />
          <span class="cb-scene-title-text">场景选择</span>
        </div>
        <div class="cb-scene-current" :style="{ backgroundImage: `url(${dvTitleBkRight})` }">
          <span class="cb-scene-current-text">当前：{{ currentScenarioName }}</span>
        </div>
        <div class="cb-scene-mode">
          <img class="cb-scene-mode-icon" :src="dvModeIcon" alt="" />
          <span class="cb-scene-mode-text">模式：{{ isCompare ? '双屏对比' : '单屏演示' }}</span>
        </div>
      </div>
      <div class="cb-scene-body">
        <div class="cb-scene-btns cb-scene-actions">
          <button
            v-for="item in scenarios"
            :key="item.key"
            class="cb-action-btn"
            :class="{ active: activeScenario === item.key }"
            type="button"
            @click="loadScenario(item.key)"
          >
            {{ item.name }}
          </button>
        </div>
        <button class="cb-scene-switch cb-action-btn" :class="{ active: isCompare }" type="button" @click="toggleCompare">
          切换：{{ isCompare ? '双屏' : '单屏' }}
        </button>
      </div>
    </section>

    <div class="cb-main">
      <div class="cb-grid cb-grid--dynamic cb-dv-mainrow">
        <ViewerStage
          :isCompare="isCompare"
          :bindVpSingle="bindVpSingle"
          :bindVpCompare="bindVpCompare"
          :model-url="boeingModelUrl"
          :left-model-url="boeingModelUrl"
          :right-model-url="boeingModelUrl"
          :split-position="0.5"
          :readonly="false"
          :auto-focus="true"
          :path-points="flightRouteXA_BJDX"
          :path-progress="planeProgress"
          :follow-path="true"
        >
          <template #header>
            <div class="cb-view-hd">
              <div class="cb-dv-title">
                <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
                <span class="cb-dv-title-text">主视图区</span><span class="cb-title-hint">（单屏/双屏可切换，时间轴同步驱动）</span>
              </div>
              <div class="cb-view-title smallnote">当前节点：{{ currentNodeName }}</div>
            </div>
          </template>

          <template #single-overlays>
            <div class="cb-symbols cb-symbols--single">
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'plane' }" @click="selectSymbol('plane')">✈️ 飞机</button>
              <button class="cb-dv-symbtn ghost" type="button" @click.stop="togglePlanePath">{{ planePathEnabled ? '停止沿线' : '沿线运动' }}</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'flow' }" @click="selectSymbol('flow')">• 信息流</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'control' }" @click="selectSymbol('control')">➜ 控制流</button>
            </div>
            <div class="plane-symbol" :class="planeStateYesClass">✈</div>
            <div class="cb-overlay-plane" v-show="activeSymbol === 'plane'"></div>
            <div class="cb-overlay-flow" v-show="activeSymbol === 'flow'"></div>
            <div class="cb-overlay-control" v-show="activeSymbol === 'control'"></div>
            <FloatingCard
              id="disposalFloatingCard"
              :card="currentCardYes"
              :collapsed="floatingCardCollapsed"
              :detailsOpen="detailsOpen"
              keyPrefix=""
              @toggle-collapsed="floatingCardCollapsed = !floatingCardCollapsed"
              @toggle-details="detailsOpen = !detailsOpen"
            />
            <div class="cb-infobox cb-dv-infobox" v-show="infoBoxVisible">
              <div class="hd">
                <div class="title">{{ infoBoxTitle }}</div>
                <button class="btn-icon" type="button" @click="hideInfoBox">×</button>
              </div>
              <div class="bd">
                <ul>
                  <li v-for="(x, i) in infoBoxLines" :key="i">{{ x }}</li>
                </ul>
                <div class="compare" v-if="isCompare && infoBoxCompareLines.length">
                  <div class="small">对比信息（示意）</div>
                  <ul>
                    <li v-for="(x, i) in infoBoxCompareLines" :key="i">{{ x }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <template #compare-overlays>
            <div class="cb-split-col">
              <div class="cb-split-hint">双屏对比（有/无云匣子）｜左右同时间轴同步驱动</div>
              <div class="cb-symbols cb-symbols--compare">
                <div class="sym" :class="planeStateNoClass">✈️</div>
                <div class="sym sym-text flow-no">{{ noFlowText }}</div>
                <div class="sym sym-text">➜ 控制流</div>
                <div class="sym sym-text">{{ noNodeText }}</div>
              </div>
              <FloatingCard
                id="disposalFloatingCardNo"
                :card="currentCardNo"
                :collapsed="floatingCardNoCollapsed"
                :detailsOpen="detailsOpenNo"
                keyPrefix="no-"
                @toggle-collapsed="floatingCardNoCollapsed = !floatingCardNoCollapsed"
                @toggle-details="detailsOpenNo = !detailsOpenNo"
              />
            </div>
            <div class="cb-split-col">
              <div class="cb-symbols cb-symbols--compare">
                <div class="sym" :class="planeStateYesClass">✈️</div>
                <div class="sym sym-text flow-yes">{{ yesFlowText }}</div>
                <div class="sym sym-text">➜ 控制流</div>
                <div class="sym sym-text">{{ yesNodeText }}</div>
                <div class="sym sym-badge">{{ deltaBadgeText }}</div>
              </div>
              <FloatingCard
                id="disposalFloatingCardYes"
                :card="currentCardYes"
                :collapsed="floatingCardYesCollapsed"
                :detailsOpen="detailsOpenYes"
                keyPrefix="yes-"
                @toggle-collapsed="floatingCardYesCollapsed = !floatingCardYesCollapsed"
                @toggle-details="detailsOpenYes = !detailsOpenYes"
              >
                <template #extra>
                  <div class="card-section-title">对比结论（示意）</div>
                  <div class="compare-content">
                    <div class="compare-data-row">
                      <span class="compare-data-label">T_no / T_yes</span>
                      <span class="compare-data-value">{{ currentCompareMeta.t_no }} / {{ currentCompareMeta.t_yes }}</span>
                    </div>
                    <div class="compare-data-row">
                      <span class="compare-data-label">Δt</span>
                      <span class="compare-data-value compare-delta">{{ currentCompareMeta.dt }}</span>
                    </div>
                    <div class="compare-data-row">
                      <span class="compare-data-label">hops_no / hops_yes</span>
                      <span class="compare-data-value">{{ currentCompareMeta.hops_no }} / {{ currentCompareMeta.hops_yes }}</span>
                    </div>
                    <div class="compare-data-row">
                      <span class="compare-data-label">Δhops</span>
                      <span class="compare-data-value compare-delta">{{ currentCompareMeta.dhops }}</span>
                    </div>
                    <div class="compare-path">
                      <div class="compare-hint">路径（示意）</div>
                      <div>{{ currentCompareMeta.path_no }}</div>
                      <div>{{ currentCompareMeta.path_yes }}</div>
                    </div>
                  </div>
                </template>
              </FloatingCard>
            </div>
            <div class="cb-infobox cb-dv-infobox" v-show="infoBoxVisible">
              <div class="hd">
                <div class="title">{{ infoBoxTitle }}</div>
                <button class="btn-icon" type="button" @click="hideInfoBox">×</button>
              </div>
              <div class="bd">
                <ul>
                  <li v-for="(x, i) in infoBoxLines" :key="i">{{ x }}</li>
                </ul>
                <div class="compare" v-if="isCompare && infoBoxCompareLines.length">
                  <div class="small">对比信息（示意）</div>
                  <ul>
                    <li v-for="(x, i) in infoBoxCompareLines" :key="i">{{ x }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </template>
        </ViewerStage>

        <RightPanel
          :dvTitleIconLeft="dvTitleIconLeft"
          :dvMsgTabSelected="dvMsgTabSelected"
          :dvMsgTabSelect="dvMsgTabSelect"
          :rightTab="rightTab"
          :toggleRightTab="toggleRightTab"
          :infoFields="infoFields"
          :disposalCards="disposalCards"
          :currentNodeId="currentNodeId"
          :isCompare="isCompare"
          :steps="steps"
          :idxNo="idxNo"
          :idxYes="idxYes"
          @stepListReady="onStepListReady"
        />
      </div>

      <TimelineDock
        v-model.number="t"
        :dvTitleIconLeft="dvTitleIconLeft"
        :playing="playing"
        :currentTimeLabel="currentTimeLabel"
        :isCompare="isCompare"
        :markerNoAlign="markerNoAlign"
        :markerNoLeft="markerNoLeft"
        :markerNoTitle="markerNoTitle"
        :markerNoLabel="markerNoLabel"
        :markerYesAlign="markerYesAlign"
        :markerYesLeft="markerYesLeft"
        :markerYesTitle="markerYesTitle"
        :markerYesLabel="markerYesLabel"
        @togglePlay="togglePlay"
        @reset="onReset"
        @scrub="onScrub"
      />

      <AlertToast
        :visible="alertToastVisible"
        :title="alertTitle"
        :body="alertBody"
        @close="hideAlertToast"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import * as Cesium from 'cesium';
import ViewerStage from '../components/ViewerStage.vue';
import FloatingCard from '../components/FloatingCard.vue';
import AlertToast from '../components/AlertToast.vue';
import TimelineDock from '../components/TimelineDock.vue';
import RightPanel from '../components/RightPanel.vue';

const boeingModelUrl = new URL('../assets/model/boeing_737.glb', import.meta.url).href;
const dvTitleIconLeft = new URL('../assets/dynamicViewport/title_icon_left.png', import.meta.url).href;
const dvTitleBkRight = new URL('../assets/dynamicViewport/title_bk_right.png', import.meta.url).href;
const dvModeIcon = new URL('../assets/dynamicViewport/title_icon2.png', import.meta.url).href;
const dvMsgTabSelect = new URL('../assets/dynamicViewport/msgpage_button_select.png', import.meta.url).href;
const dvMsgTabSelected = new URL('../assets/dynamicViewport/msgpage_button_selected.png', import.meta.url).href;

const vpSingle = ref(null);
const vpCompare = ref(null);

const planeMoveEnabled = ref(false);
const planeProgress = ref(0);
let _planeMoveRaf = 0;

const planePathEnabled = ref(false);
let _dynTickUnsub1 = null;
let _dynTickUnsub2 = null;

// --- Flight route: Xi'an (XIY) -> Beijing Daxing (PKX) ---
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

const ROUTE_ENTITY_ID = 'flightRouteXA_BJDX';
const ROUTE_SAMPLES = 120;

const sampleCatmullRom = (route, samplesPerSeg = 30) => {
  const cps = route.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  if (cps.length < 2) return cps;
  const times = cps.map((_, i) => i);
  const spline = new Cesium.CatmullRomSpline({ times, points: cps });
  const out = [];
  const maxT = times[times.length - 1];
  const dt = 1 / samplesPerSeg;
  for (let t = 0; t <= maxT; t += dt) out.push(spline.evaluate(t));
  out.push(cps[cps.length - 1]);
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

const buildSampledPosition = (viewer, positions, secondsTotal = 300) => {
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

const startClock = (viewer, start, stop) => {
  viewer.clock.startTime = start;
  viewer.clock.stopTime = stop;
  viewer.clock.currentTime = start;
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
};

// --- Flowing trail material for polyline ---
const ensureTrailMaterial = (() => {
  const type = 'PolylineTrail';
  const source = `
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      float t = fract(st.s - time);
      float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
      material.diffuse = color.rgb;
      material.alpha = a * color.a;
      return material;
    }
  `;

  return () => {
    // Cesium 里材质缓存是全局的，注册一次即可
    const cache = Cesium.Material._materialCache;
    if (!cache.getMaterial(type)) {
      cache.addMaterial(type, {
        fabric: {
          type,
          uniforms: {
            color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
            time: 0.0,
          },
          source,
        },
        translucent: () => true,
      });
    }
    return type;
  };
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
  getType(time) { return ensureTrailMaterial(); }
  getValue(time, result) {
    if (!result) result = {};
    const t = ((performance.now() - this._start) / 1000) * this.speed;
    result.color = this.color;
    result.time = t;
    return result;
  }
  equals(other) { return this === other; }
}

const drawFlightRoute = (viewer) => {
  if (!viewer) return;
  if (viewer.entities?.getById?.(ROUTE_ENTITY_ID)) return;

  const positions = getRoutePositions();
  viewer.entities.add({
    id: ROUTE_ENTITY_ID,
    polyline: {
      positions,
      width: 2,
      clampToGround: false,
      material: new TrailMaterialProperty({
        color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
        speed: 0.8
      })
    }
  });
  viewer.scene?.requestRender?.();
};

const applyPlanePathToVp = (vp, unsubRefSetter) => {
  const viewer = vp?.getViewer?.();
  if (!viewer) return;

  if (!planePathEnabled.value) {
    viewer.clock.shouldAnimate = false;
    vp?.applyPathAnimation?.(null);
    if (unsubRefSetter.current) {
      unsubRefSetter.current();
      unsubRefSetter.current = null;
    }
    viewer.trackedEntity = undefined;
    viewer.scene?.requestRender?.();
    return;
  }

  const positions = getRoutePositions();
  const secondsTotal = 300 * 5;
  const { prop, start, stop } = buildSampledPosition(viewer, positions, secondsTotal);
  vp?.applyPathAnimation?.(prop, { trailSeconds: 12 / 40 });
  startClock(viewer, start, stop);

  const plane = vp?.getPlaneEntity?.();
  if (plane) viewer.trackedEntity = plane;

  const onTick = () => viewer.scene?.requestRender?.();
  viewer.clock.onTick.addEventListener(onTick);
  unsubRefSetter.current = () => viewer.clock.onTick.removeEventListener(onTick);
};

const _unsub1 = { current: null };
const _unsub2 = { current: null };

const togglePlanePath = () => {
  planePathEnabled.value = !planePathEnabled.value;
  applyPlanePathToVp(vpSingle.value, _unsub1);
  applyPlanePathToVp(vpCompare.value, _unsub2);
};

// 全局渲染驱动：单屏/双屏都持续刷新航线流动纹理
let _routeRafStarted = false;
const startRouteRenderLoop = () => {
  if (_routeRafStarted) return;
  _routeRafStarted = true;

  const loop = () => {
    // 单屏 viewer
    const v1 = vpSingle.value?.getViewer?.();
    if (v1 && v1.entities?.getById?.(ROUTE_ENTITY_ID)) {
      v1.scene?.requestRender?.();
    }

    // 双屏 viewer
    const v2 = vpCompare.value?.getViewer?.();
    if (v2 && v2.entities?.getById?.(ROUTE_ENTITY_ID)) {
      v2.scene?.requestRender?.();
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

const whenViewerReady = (vpEl, cb, maxFrames = 120) => {
  let n = 0;
  const tick = () => {
    const viewer = vpEl?.getViewer?.();
    if (viewer) { cb(viewer); return; }
    if (++n > maxFrames) return; // ~2s@60fps，避免死循环
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const bindVpSingle = (el) => {
  vpSingle.value = el;
  whenViewerReady(el, (viewer) => {
    drawFlightRoute(viewer);
    startRouteRenderLoop();
    if (planePathEnabled.value) applyPlanePathToVp(el, _unsub1);
  });
};

const bindVpCompare = (el) => {
  vpCompare.value = el;
  whenViewerReady(el, (viewer) => {
    drawFlightRoute(viewer);
    startRouteRenderLoop();
    if (planePathEnabled.value) applyPlanePathToVp(el, _unsub2);
  });
};
const compareMarkersEl = ref(null);
const stepListEl = ref(null);
const onStepListReady = (el) => {
  stepListEl.value = el;
};

const scenarios = [
  { key: 'engine', name: '单发失效' },
  { key: 'smoke', name: '烟雾异味' },
  { key: 'nav', name: '导航失效' },
  { key: 'hijack', name: '劫机' },
  { key: 'human', name: '人为误操作' }
];

const isCompare = ref(false);
const t = ref(0);
const lastNodeIdNo = ref(-1);
const lastNodeIdYes = ref(-1);
const lastNodeIdSingle = ref(-1);
const currentNodeId = ref(-1);
const activeScenario = ref('engine');
const steps = ref([]);
const disposalCards = ref([]);
const playing = ref(false);
const activeSymbol = ref('plane');
const rightTab = ref('info');

const infoBoxVisible = ref(false);
const infoBoxTitle = ref('');
const infoBoxLines = ref([]);
const infoBoxCompareLines = ref([]);
const currentNodeName = ref('起始');

const floatingCardCollapsed = ref(false);
const floatingCardNoCollapsed = ref(false);
const floatingCardYesCollapsed = ref(false);
const detailsOpen = ref(false);
const detailsOpenNo = ref(false);
const detailsOpenYes = ref(false);

const alertToastVisible = ref(false);
const alertTitle = ref('全局告警（示意）');
const alertBody = ref('');
let alertTimer = null;

const markerNoLeft = ref(0);
const markerYesLeft = ref(0);
const markerNoTitle = ref('');
const markerYesTitle = ref('');
const markerNoLabel = ref('T_no');
const markerYesLabel = ref('T_yes');
const markerNoAlign = ref('center');
const markerYesAlign = ref('center');

const noNodeText = ref('节点：—');
const yesNodeText = ref('节点：—');
const deltaBadgeText = ref('Δt：-0s（示意）');
const noFlowText = ref('• 信息流（较慢/缺失示意）');
const yesFlowText = ref('• 信息流（更快/更完整示意）');
const yesFlowColor = ref('#16a34a');
const noFlowColor = ref('#fff');

const planeStateNoClass = ref('');
const planeStateYesClass = ref('');

const infoFields = ref({
  f_no: 'MU0001',
  f_type: 'A320',
  f_route: 'WPT-1 → WPT-3',
  f_time: 'T+0 ~ T+100（示意）',
  f_state: '待证实',
  f_node: '起始'
});

const firedAlerts = reactive(new Set());

const currentScenarioName = computed(() => scenarios.find((s) => s.key === activeScenario.value)?.name || '单发失效');

const currentTimeLabel = computed(() => t.value);

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

function getCurrentNodeIndexByTime(time, side) {
  const arr = steps.value || [];
  if (!arr.length) return 0;
  const key = side === 'no' ? 't_no' : 't_yes';
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    const ti = Number(arr[i][key] ?? 0);
    if (time >= ti) idx = i;
  }
  return idx;
}

function getCurrentNodeByTime(time, side) {
  const idx = getCurrentNodeIndexByTime(time, side);
  return steps.value[idx];
}

const idxNo = computed(() => getCurrentNodeIndexByTime(t.value, 'no'));
const idxYes = computed(() => getCurrentNodeIndexByTime(t.value, 'yes'));

const getCompareMeta = (scenarioKey, nodeId) => {
  const node = steps.value.find((s) => s.nodeId === nodeId) || steps.value[nodeId];
  if (!node) {
    return { t_no: 0, t_yes: 0, dt: 0, hops_no: 3, hops_yes: 2, dhops: 1, path_no: '地面→中继→机载', path_yes: '地面→机载' };
  }
  const t_no = Number(node.t_no ?? 0);
  const t_yes = Number(node.t_yes ?? 0);
  const hops_no = Number(node.hops_no ?? 3);
  const hops_yes = Number(node.hops_yes ?? 2);
  return {
    t_no,
    t_yes,
    dt: Math.abs(t_no - t_yes),
    hops_no,
    hops_yes,
    dhops: hops_no - hops_yes,
    path_no: node.path_no || '地面→中继→机载',
    path_yes: node.path_yes || '地面→机载'
  };
};

const currentCardNo = computed(() => steps.value[getCurrentNodeIndexByTime(t.value, 'no')] || fallbackCard());
const currentCardYes = computed(() => steps.value[getCurrentNodeIndexByTime(t.value, 'yes')] || fallbackCard());
const currentCard = computed(() => currentCardYes.value || fallbackCard());
const currentCompareMeta = computed(() => getCompareMeta(activeScenario.value, currentCardYes.value?.nodeId ?? 0));

const fallbackCard = () => ({
  id: -1,
  nodeId: -1,
  name: '起始',
  phase: '起始',
  title: '起始',
  summary: '暂无数据',
  state: '待证实',
  t_no: 0,
  t_yes: 0,
  t: 0,
  alert: '',
  events: [],
  evidence: [],
  actions: [],
  compare: getCompareMeta(activeScenario.value, 0)
});

const setPlaneState = (side, state) => {
  let cls = '';
  if (state === '待证实' || state === '证实中') cls = 'yellow flash';
  else if (state === '已证实') cls = 'red flash';
  else if (state === '决策中' || state === '协调中' || state === '执行中') cls = 'blue';
  else if (state === '已完成') cls = 'green';
  if (side === 'no') planeStateNoClass.value = cls;
  if (side === 'yes') planeStateYesClass.value = cls;
};

const updateLinkPresentation = () => {
  if (!isCompare.value) return;
  const node = steps.value[idxYes.value];
  const meta = getCompareMeta(activeScenario.value, node?.nodeId ?? 0);
  noFlowText.value = `• 信息流（较慢/缺失示意）${meta.hops_no > 2 ? `（${meta.hops_no}段中继）` : ''}`;
  yesFlowText.value = `• 信息流（更快/更完整示意）${meta.hops_yes > 1 ? `（${meta.hops_yes}段中继）` : '（直连）'}`;
  yesFlowColor.value = '#16a34a';
};

const updateCompareMarkersAt = (time) => {
  if (!isCompare.value) return;
  const rangeMax = 100;
  const currentNode = getCurrentNodeByTime(time, 'yes');
  const nodeId = currentNode?.nodeId ?? 0;
  const meta = getCompareMeta(activeScenario.value, nodeId);
  const posNo = clamp((meta.t_no / rangeMax) * 100, 0, 100);
  const posYes = clamp((meta.t_yes / rangeMax) * 100, 0, 100);
  markerNoLeft.value = posNo;
  markerYesLeft.value = posYes;
  markerNoAlign.value = posNo < 8 ? 'left' : posNo > 92 ? 'right' : 'center';
  markerYesAlign.value = posYes < 8 ? 'left' : posYes > 92 ? 'right' : 'center';
  markerNoTitle.value = `无云匣子侧：T+${meta.t_no}s`;
  markerYesTitle.value = `有云匣子侧：T+${meta.t_yes}s`;
  markerNoLabel.value = `T_no: ${meta.t_no}s`;
  markerYesLabel.value = `T_yes: ${meta.t_yes}s`;
};

const updateCompareMarkers = () => updateCompareMarkersAt(t.value);

const render = () => {
  const nodeYes = steps.value[idxYes.value];
  if (!nodeYes) return;
  currentNodeName.value = nodeYes.title;
  infoFields.value.f_node = currentCard.value.title || '起始';
  infoFields.value.f_state = currentCard.value.state || '待证实';
  setPlaneState('no', currentCardNo.value.state);
  setPlaneState('yes', currentCardYes.value.state);
};

const updateFloatingCard = (node) => {
  if (!node) return;
  currentNodeId.value = node.id;
};

const highlightDisposalList = (node) => {
  currentNodeId.value = node?.id || -1;
};

const renderCompareStepsTable = () => {
  // compareStepsTable 由 steps 渲染
};

const showAlertToast = (title, message) => {
  alertTitle.value = title;
  alertBody.value = message;
  alertToastVisible.value = true;
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => {
    hideAlertToast();
  }, 5000);
};

const hideAlertToast = () => {
  alertToastVisible.value = false;
};

const maybeFireAlert = (side, card) => {
  if (!card?.alert) return;
  const key = `${activeScenario.value}|${side}|${card.nodeId}|${card.alert}`;
  if (firedAlerts.has(key)) return;
  showAlertToast('全局告警（示意）', card.alert);
  firedAlerts.add(key);
};

const autoScrollToCurrent = () => {
  if (!stepListEl.value) return;
  const cur = stepListEl.value.querySelector('.item.is-current');
  if (!cur) return;
  const box = stepListEl.value.getBoundingClientRect();
  const c = cur.getBoundingClientRect();
  const pad = 24;
  if (c.top < box.top + pad || c.bottom > box.bottom - pad) {
    cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
};

const refreshAll = (time, fromUser = false) => {
  render();
  const curIdxNo = getCurrentNodeIndexByTime(time, 'no');
  const curIdxYes = getCurrentNodeIndexByTime(time, 'yes');
  const nodeNo = steps.value[curIdxNo];
  const nodeYes = steps.value[curIdxYes];

  if (!isCompare.value) {
    if (nodeYes && curIdxYes !== lastNodeIdSingle.value) {
      updateFloatingCard(nodeYes);
      highlightDisposalList(nodeYes);
      lastNodeIdSingle.value = curIdxYes;
      maybeFireAlert('yes', steps.value[curIdxYes]);
      if (rightTab.value === 'steps') {
        nextTick(() => autoScrollToCurrent());
      }
    }
  } else {
    if (nodeNo && curIdxNo !== lastNodeIdNo.value) {
      lastNodeIdNo.value = curIdxNo;
      setPlaneState('no', nodeNo.state);
    }
    if (nodeYes && curIdxYes !== lastNodeIdYes.value) {
      updateFloatingCard(nodeYes);
      highlightDisposalList(nodeYes);
      lastNodeIdYes.value = curIdxYes;
      maybeFireAlert('yes', steps.value[curIdxYes]);
      if (rightTab.value === 'steps') {
        nextTick(() => autoScrollToCurrent());
      }
    }
  }

  if (isCompare.value) {
    const stNo = nodeNo || nodeYes;
    const stYes = nodeYes || nodeNo;
    if (stNo && stYes) {
      noNodeText.value = `节点：${stNo.name}（T+${stNo.t_no}s）`;
      yesNodeText.value = `节点：${stYes.name}（T+${stYes.t_yes}s）`;
      const dt = Math.max(0, stNo.t_no - stYes.t_yes);
      deltaBadgeText.value = `Δt：-${dt}s（示意）`;
      updateLinkPresentation();
    }
  }

  if (isCompare.value) renderCompareStepsTable();
  updateCompareMarkers();
};

let scrubRaf = 0;
let playTimer = 0;

const stopTimer = () => {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = 0;
  }
  playing.value = false;
};

const startTimer = () => {
  if (playTimer) return;
  playing.value = true;
  playTimer = setInterval(() => {
    if (t.value >= 100) {
      stopTimer();
      return;
    }
    t.value = clamp(t.value + 1, 0, 100);
    refreshAll(t.value, false);
  }, 200);
};

const jumpTo = (targetT) => {
  const nextT = clamp(Math.round(targetT), 0, 100);
  if (playing.value) {
    stopTimer();
  }
  if (nextT === t.value) {
    refreshAll(t.value, true);
    return;
  }
  t.value = nextT;
  refreshAll(nextT, true);
  console.log('[jumpTo]', nextT);
};

const togglePlay = () => {
  if (playing.value) {
    stopTimer();
  } else {
    startTimer();
  }
  console.log('[DynamicFlow] playing', playing.value);
};

const onReset = () => {
  stopTimer();
  t.value = 0;
  lastNodeIdNo.value = -1;
  lastNodeIdYes.value = -1;
  lastNodeIdSingle.value = -1;
  refreshAll(t.value, true);
  console.log('[DynamicFlow] reset');
};

const onScrub = (val) => {
  const nextT = clamp(Math.round(Number(val) || 0), 0, 100);
  updateCompareMarkersAt(nextT);
  t.value = nextT;
  if (scrubRaf) cancelAnimationFrame(scrubRaf);
  scrubRaf = requestAnimationFrame(() => {
    refreshAll(nextT, false);
  });
};

const hideInfoBox = () => {
  infoBoxVisible.value = false;
};

const showInfoBox = (type) => {
  infoBoxVisible.value = true;
  const card = currentCardYes.value;
  if (type === 'plane') {
    infoBoxTitle.value = '飞机状态（示意）';
    infoBoxLines.value = [
      '航班号：MU0001',
      `阶段：${card.phase}`,
      `节点：${card.title}`,
      `状态：${card.state}`
    ];
    infoBoxCompareLines.value = [];
  }
  if (type === 'flow') {
    infoBoxTitle.value = '信息流链路（示意）';
    const meta = isCompare.value ? getCompareMeta(activeScenario.value, card.nodeId) : null;
    infoBoxLines.value = ['采集 → 汇聚 → 分发', '链路健康：正常（示意）'];
    infoBoxCompareLines.value = meta
      ? [`无云匣子 hops：${meta.hops_no}`, `有云匣子 hops：${meta.hops_yes}`, `Δhops：${meta.hops_no - meta.hops_yes}`]
      : [];
  }
  if (type === 'control') {
    infoBoxTitle.value = '控制流链路（示意）';
    infoBoxLines.value = ['控制指令：下发中（示意）', '回执：已确认（示意）'];
    infoBoxCompareLines.value = [];
  }
};

const selectSymbol = (type) => {
  activeSymbol.value = type;
  console.log('[symbol]', type);
  showInfoBox(type);
};

const toggleRightTab = (tab) => {
  rightTab.value = tab;
  console.log('[DynamicFlow] rightTab', tab);
};

const buildSteps = (base) => {
  // base: [{ t, title, phase, summary, desc, events, evidence, actions, alert, state }]
  const saves = [0, 5, 10, 15, 20, 25, 35, 35, 35];
  return base.map((item, idx) => {
    const t_no = Number(item.t ?? 0);
    const t_yes = Math.max(0, t_no - (saves[idx] ?? 35));
    const hops_no = 3 + idx;
    const hops_yes = Math.max(1, hops_no - 1 - Math.floor(idx / 2));
    const path_no = `地面→中继${idx + 1}→中继${idx + 2}→机载`;
    const path_yes = hops_yes > 1 ? `地面→中继${idx + 1}→机载` : `地面→机载`;
    return {
      id: idx,
      nodeId: idx,
      name: item.title,
      title: item.title,
      phase: item.phase,
      summary: item.summary,
      desc: item.desc,
      events: item.events,
      evidence: item.evidence,
      actions: item.actions,
      alert: item.alert || '',
      state: item.state || '待证实',
      // 原型关键字段：
      t_no,
      t_yes,
      hops_no,
      hops_yes,
      path_no,
      path_yes
    };
  });
};

const buildDisposalCards = (items) => {
  return items.map((s) => ({
    id: s.id,
    nodeId: s.nodeId,
    phase: s.phase,
    title: s.title,
    summary: s.summary,
    state: s.state,
    t_no: s.t_no,
    t_yes: s.t_yes,
    t: s.t_no,
    events: s.events,
    evidence: s.evidence,
    actions: s.actions,
    alert: s.alert || '',
    compare: getCompareMeta(activeScenario.value, s.nodeId)
  }));
};

const loadScenario = (key) => {
  activeScenario.value = key;
  const base = [
    { t: 0, title: '起始', phase: '证实', summary: '确认告警与初始处置', desc: '确认告警与初始处置', events: ['告警触发', '初步通联', '系统自检'], evidence: ['机组报告', '监测数据'], actions: ['启动预案', '通知相关部门'], alert: '', state: '待证实' },
    { t: 10, title: '发现异常', phase: '证实', summary: '发现异常信号并研判', desc: '发现异常信号并研判', events: ['参数异常（示意）', '链路告警（示意）'], evidence: ['监测数据'], actions: ['发起研判'], alert: '巡航故障告警：请确认', state: '证实中' },
    { t: 25, title: '证实完成', phase: '证实', summary: '完成证实与定性', desc: '完成证实与定性', events: ['证实完成（示意）'], evidence: ['多源证据'], actions: ['确认结论'], alert: '', state: '已证实' },
    { t: 45, title: '决策', phase: '决策', summary: '评估影响与方案', desc: '评估影响与方案', events: ['方案比选（示意）'], evidence: ['航路限制'], actions: ['制定备选'], alert: '', state: '决策中' },
    { t: 65, title: '协调', phase: '协调', summary: '跨单位协调资源', desc: '跨单位协调资源', events: ['协调通联（示意）'], evidence: ['通联记录'], actions: ['协调资源'], alert: '', state: '协调中' },
    { t: 85, title: '指挥执行', phase: '处置', summary: '下发处置并监控', desc: '下发处置并监控', events: ['指令下发（示意）'], evidence: ['执行回执'], actions: ['下发指令'], alert: '', state: '执行中' },
    { t: 100, title: '闭环', phase: '回收', summary: '复盘与回收', desc: '复盘与回收', events: ['复盘总结', '数据归档'], evidence: ['复盘记录'], actions: ['归档数据'], alert: '', state: '完成' }
  ];
  steps.value = buildSteps(base);
  disposalCards.value = buildDisposalCards(steps.value);
  firedAlerts.clear();
  t.value = 0;
  lastNodeIdNo.value = -1;
  lastNodeIdYes.value = -1;
  lastNodeIdSingle.value = -1;
  refreshAll(0, true);
  console.log('[DynamicFlow] loadScenario', key);
};

const toggleCompare = () => {
  isCompare.value = !isCompare.value;
  if (isCompare.value) {
    hideInfoBox();
  }
  nextTick(() => {
    [vpSingle.value, vpCompare.value].forEach((v) => v?.resize?.());
    [vpSingle.value, vpCompare.value].forEach((v) => v?.requestRender?.());
    updateCompareMarkers();
    refreshAll(t.value);
  });
  console.log('[DynamicFlow] compare', isCompare.value);
};

loadScenario(activeScenario.value);
</script>
