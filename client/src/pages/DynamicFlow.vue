
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
          :units-url="engineFailureUnitsUrl"
          :left-model-url="boeingModelUrl"
          :right-model-url="boeingModelUrl"
          :split-position="0.5"
          :readonly="false"
          :auto-focus="true"
          :path-points="pathPointsForViewer"
          :path-progress="planeProgress"
          :follow-path="true"
          :visible-relation-id="null"
          :visible-relation-ids-left="visibleRelationIdsLeft"
          :visible-relation-ids-right="visibleRelationIdsRight"
          @marker-click="onMarkerClick"
          @marker-move="onMarkerMove"
          @plane-screen-info="onPlaneScreenInfo"
          @plane-billboard-click="onPlaneBillboardClick"
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
            <!-- 与静态架构页完全一致：仅根据 plane-screen-info 刷新 popup，不参与飞机运动逻辑 -->
            <div class="cb-dv-cesium-layer-with-popup">
              <div
                v-if="showPlanePopup && planeScreenInfo"
                class="cb-plane-follow-popup"
                :style="planePopupStyle"
              >
                <div class="cb-plane-follow-popup-hd">飞机</div>
                <div class="cb-plane-follow-popup-bd">
                  <div class="cb-plane-follow-row">高度：{{ planeScreenInfo.alt.toFixed(0) }} m</div>
                  <div class="cb-plane-follow-row">航向：{{ planeScreenInfo.heading.toFixed(0) }}°</div>
                  <div class="cb-plane-follow-row">地速：{{ planeScreenInfo.speed }} km/h</div>
                  <div class="cb-plane-follow-row">状态：{{ planeEnvText }}</div>
                </div>
              </div>
            </div>
            <div class="cb-symbols cb-symbols--single">
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'plane' }" @click="onPlaneButtonClick">飞机</button>
              <button class="cb-dv-symbtn ghost" type="button" @click.stop="togglePlanePath">{{ planePathEnabled ? '停止沿线' : '沿线运动' }}</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'flow' }" @click="selectSymbol('flow')">• 信息流</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'control' }" @click="selectSymbol('control')">➜ 控制流</button>
            </div>
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

        <!-- 机载弹窗（点击飞机 billboard 显示，随飞机位置同步，位于 billboard 右上角） -->
        <div v-if="showAirbornePopup && planeScreenInfo" class="marker-popup airborne-popup cb-airborne-popup-follow" :style="airbornePopupStyle">
          <div class="marker-popup-header">
            <div class="marker-popup-title">机载</div>
            <button type="button" class="marker-popup-close" aria-label="关闭" @click="closeAirbornePopup">×</button>
          </div>
          <div class="marker-popup-body">
            <ul class="airborne-popup-list">
              <li>机组</li>
              <li>国产黑匣子</li>
              <li>通感算一体机载感知预警设备</li>
            </ul>
          </div>
        </div>
        <div v-if="activePopup" class="marker-popup" :style="popupStyle">
          <div class="marker-popup-header">
            <div class="marker-popup-title">{{ activePopup.meta.name }}</div>
            <button type="button" class="marker-popup-close" @click="closePopup">×</button>
          </div>
          <div class="marker-popup-body">
            <div>类型：{{ activePopup.meta.type }}</div>
            <div>经度：{{ activePopup.meta.lon.toFixed(6) }}</div>
            <div>纬度：{{ activePopup.meta.lat.toFixed(6) }}</div>
            <div>高度：{{ activePopup.meta.alt_m }} m</div>
          </div>
        </div>

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
        :maxTime="timelineMax"
        :step="0.1"
        :keyframeMarks="keyframeMarks"
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
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import * as Cesium from 'cesium';
import { buildFlightPathFromRunways, buildSampledPositionFromPath } from '../utils/flightPath';
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

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const engineFailureUnitsUrl = `${baseUrl}/config/dynamic/engine_failure_units.json`;

const vpSingle = ref(null);
const vpCompare = ref(null);

const planeMoveEnabled = ref(false);
const planeProgress = ref(0.55);
let _planeMoveRaf = 0;

const planePathEnabled = ref(false);
const activePopup = ref(null);
const showAirbornePopup = ref(false);

function onMarkerClick(payload) {
  activePopup.value = payload;
}
function onMarkerMove(p) {
  if (activePopup.value) activePopup.value.screen = { x: p.x, y: p.y };
}
function closePopup() {
  activePopup.value = null;
  vpSingle.value?.clearActiveMarker?.();
  vpCompare.value?.clearActiveMarker?.();
}
function onPlaneBillboardClick() {
  showAirbornePopup.value = true;
}
function closeAirbornePopup() {
  showAirbornePopup.value = false;
}
// 与跟随飞机的 popup 同源：用 planeScreenInfo 实时定位，放在 billboard 右上角
const airbornePopupStyle = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return {};
  const offsetX = 54;
  const offsetY = -8;
  return {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${info.x + offsetX}px, ${info.y + offsetY}px)`
  };
});
const popupStyle = computed(() => {
  const s = activePopup.value?.screen;
  if (!s) return { position: 'fixed', right: '16px', top: '80px' };
  return { position: 'fixed', left: `${s.x + 12}px`, top: `${s.y - 12}px` };
});

let _dynTickUnsub1 = null;
let _dynTickUnsub2 = null;

// --- 与 StaticHome 同一套：跑道贴地 -> buildFlightPathFromRunways ---
const startRunway = { a: { lon: 108.742455, lat: 34.439922 }, b: { lon: 108.761345, lat: 34.453589 } };
const endRunway = { a: { lon: 116.430944, lat: 39.473803 }, b: { lon: 116.427175, lat: 39.497722 } };

const flightPath = buildFlightPathFromRunways(startRunway, endRunway, { cruiseAlt: 10000 });

const ROUTE_ENTITY_ID = 'flightRouteXA_BJDX';
const pathPointsForViewer = flightPath;

const startClock = (viewer, start, stop) => {
  viewer.clock.startTime = start;
  viewer.clock.stopTime = stop;
  viewer.clock.currentTime = start;
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 0.1; // 与静态页一致，使动画平滑跑完
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

  const positions = flightPath.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
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

  const { prop, start, stop } = buildSampledPositionFromPath(flightPath, 300);
  vp?.applyPathAnimation?.(prop, { trailSeconds: 12 / 50 });
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
    const v1 = vpSingle.value?.getViewer?.();
    const v2 = vpCompare.value?.getViewer?.();
    if (v1 && v1.entities?.getById?.(ROUTE_ENTITY_ID)) {
      v1.scene?.requestRender?.();
    }
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
  if (vpSingle.value === el) return;
  vpSingle.value = el;
  whenViewerReady(el, (viewer) => {
    drawFlightRoute(viewer);
    startRouteRenderLoop();
    if (planePathEnabled.value) applyPlanePathToVp(el, _unsub1);
  });
};

const bindVpCompare = (el) => {
  if (vpCompare.value === el) return;
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
// 以下与静态架构页完全一致：仅接收 plane-screen-info 刷新 popup，与沿线运动无耦合
const planeScreenInfo = ref(null);
const POPUP_CAMERA_HEIGHT_THRESHOLD = 500000;
function onPlaneScreenInfo(info) {
  planeScreenInfo.value = info;
}
const showPlanePopup = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return false;
  return info.cameraHeight != null && info.cameraHeight <= POPUP_CAMERA_HEIGHT_THRESHOLD;
});
const planePopupStyle = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return {};
  const offsetX = 14;
  const offsetY = 8;
  return {
    transform: `translate(${info.x + offsetX}px, ${info.y + offsetY}px)`
  };
});
const planeEnvText = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return '—';
  const h = info.alt;
  if (h < 100) return '起飞/滑跑';
  if (h < 3000) return '爬升';
  if (h < 8000) return '巡航';
  return '进近/下降';
});

const timelineMax = ref(100);
const t = ref(0);
const lastNodeIdNo = ref(-1);
const lastNodeIdYes = ref(-1);
const lastNodeIdSingle = ref(-1);
const currentNodeId = ref(-1);
const activeScenario = ref('engine');
const steps = ref([]);
const scenarioNodes = ref([]);
const disposalCards = ref([]);
const playing = ref(false);
const activeSymbol = ref('plane');
/** 当前选中的链路关联 id（保留兼容，不再作为主驱动；主驱动为 visibleRelationIdsLeft/Right） */
const selectedRelationId = ref(null);
const visibleRelationIdsLeft = ref([]);
const visibleRelationIdsRight = ref([]);
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

const currentTimeLabel = computed(() => t.value.toFixed(1));

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

const keyframeMarks = computed(() => {
  const nodes = scenarioNodes.value || [];

  const YES_ALLOWED = new Set(['0.0', '0.3', '10.3', '40.3']);
  const NO_ALLOWED = new Set([0, 60, 180, 600, 1800]);

  const yesTimes = Array.from(
    new Set(
      nodes
        .map((n) => n?.yes?.t)
        .filter((v) => v != null)
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
        .map((v) => v.toFixed(1))
        .filter((s) => YES_ALLOWED.has(s))
    )
  )
    .map((s) => Number(s))
    .sort((a, b) => a - b);

  const noTimes = Array.from(
    new Set(
      nodes
        .map((n) => n?.no?.t)
        .filter((v) => v != null)
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
        .filter((v) => NO_ALLOWED.has(v))
    )
  ).sort((a, b) => a - b);

  const yesMarks = yesTimes.map((t) => ({
    side: 'yes',
    t,
    label: `T+${t.toFixed(1)}s`,
    title: `T+${t.toFixed(1)}s`
  }));

  const noMarks = noTimes.map((t) => ({
    side: 'no',
    t,
    label: t === 0 ? 'T+0.0s' : `T+${(t / 60).toFixed(1)}min`,
    title: t === 0 ? 'T+0.0s' : `T+${t.toFixed(1)}s`
  }));

  return [...yesMarks, ...noMarks];
});

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
  const rangeMax = timelineMax.value;
  if (rangeMax <= 0) return;
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
    visibleRelationIdsLeft.value = nodeYes?.activeRelations_yes ?? [];
    visibleRelationIdsRight.value = [];
  } else {
    visibleRelationIdsLeft.value = nodeYes?.activeRelations_yes ?? [];
    visibleRelationIdsRight.value = nodeNo?.activeRelations_no ?? [];
  }

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
  const step = 0.1;
  playTimer = setInterval(() => {
    const max = timelineMax.value;
    if (t.value >= max) {
      stopTimer();
      return;
    }
    t.value = clamp(t.value + step, 0, max);
    refreshAll(t.value, false);
  }, 200);
};

const jumpTo = (targetT) => {
  const max = timelineMax.value;
  const nextT = clamp(Number(targetT) || 0, 0, max);
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
  const max = timelineMax.value;
  const nextT = clamp(Number(val) ?? 0, 0, max);
  updateCompareMarkersAt(nextT);
  t.value = nextT;
  if (scrubRaf) cancelAnimationFrame(scrubRaf);
  scrubRaf = requestAnimationFrame(() => {
    refreshAll(nextT, false);
  });
};

// 关键帧按钮仅更新 t（v-model），这里统一监听 t 变化并刷新链路/卡片
watch(t, (newT, oldT) => {
  if (Number(newT) === Number(oldT)) return;
  const max = timelineMax.value;
  const nextT = clamp(Number(newT) ?? 0, 0, max);
  updateCompareMarkersAt(nextT);
  refreshAll(nextT, false);
});

const hideInfoBox = () => {
  infoBoxVisible.value = false;
};

const showInfoBox = (type) => {
  if (type === 'plane' || type === 'flow' || type === 'control') {
    infoBoxVisible.value = false;
    return;
  }
  const card = currentCardYes.value;
  infoBoxVisible.value = true;
};

/** links.json 中信息流、控制流对应的 relation.id */
const RELATION_ID_FLOW = 'link-sat-ground';
const RELATION_ID_CONTROL = 'link-flight-emergency';

const selectSymbol = (type) => {
  activeSymbol.value = type;
  if (type === 'flow') {
    selectedRelationId.value = selectedRelationId.value === RELATION_ID_FLOW ? null : RELATION_ID_FLOW;
    console.log('[symbol] 信息流', selectedRelationId.value ? '显示链路' : '隐藏链路');
  } else if (type === 'control') {
    selectedRelationId.value = selectedRelationId.value === RELATION_ID_CONTROL ? null : RELATION_ID_CONTROL;
    console.log('[symbol] 控制流', selectedRelationId.value ? '显示链路' : '隐藏链路');
  }
  showInfoBox(type);
};

/** 飞机按钮：与静态架构页一致，相机飞行聚焦飞机 */
const onPlaneButtonClick = () => {
  activeSymbol.value = 'plane';
  const v = vpSingle.value?.getViewer?.();
  const plane = vpSingle.value?.getPlaneEntity?.();
  if (v && plane) {
    v.flyTo(plane, {
      duration: 0.8,
      offset: new Cesium.HeadingPitchRange(
        v.camera.heading,
        Cesium.Math.toRadians(-25),
        200
      )
    });
  }
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

const loadScenario = async (key) => {
  activeScenario.value = key;
  const scenarioKey = key === 'engine' ? 'engine_failure' : key;
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const url = base ? `${base}/config/dynamic_scenarios.json` : '/config/dynamic_scenarios.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch scenarios failed');
    const data = await res.json();
    const scenario = data?.scenarios?.[scenarioKey];
    if (!scenario) {
      console.warn('[DynamicFlow] scenario not found:', scenarioKey);
      return;
    }
    timelineMax.value = Number(scenario.durationSec) || 100;
    const nodes = scenario.nodes || [];
    scenarioNodes.value = nodes;
    steps.value = nodes.map((node, idx) => {
      const y = node.yes || {};
      const n = node.no || {};
      return {
        id: idx,
        nodeId: node.nodeId ?? idx,
        t_yes: Number(y.t) ?? 0,
        t_no: Number(n.t) ?? 0,
        name: y.title ?? '',
        title: y.title ?? '',
        phase: y.phase ?? '',
        summary: y.summary ?? '',
        desc: y.desc ?? '',
        events: y.events ?? [],
        evidence: y.evidence ?? [],
        actions: y.actions ?? [],
        alert: y.alert ?? '',
        state: y.state ?? '待证实',
        title_no: n.title ?? '',
        phase_no: n.phase ?? '',
        summary_no: n.summary ?? '',
        desc_no: n.desc ?? '',
        events_no: n.events ?? [],
        evidence_no: n.evidence ?? [],
        actions_no: n.actions ?? [],
        alert_no: n.alert ?? '',
        state_no: n.state ?? '待证实',
        activeRelations_yes: y.activeRelations ?? [],
        activeRelations_no: n.activeRelations ?? [],
        hops_no: 3,
        hops_yes: 2,
        path_no: '地面→中继→机载',
        path_yes: '地面→机载'
      };
    });
    disposalCards.value = buildDisposalCards(steps.value);
    t.value = 0;
    planeProgress.value = 0.55;
    lastNodeIdNo.value = -1;
    lastNodeIdYes.value = -1;
    lastNodeIdSingle.value = -1;
    refreshAll(0, true);
    selectedRelationId.value = steps.value[0]?.activeRelations_yes?.[0] ?? null;
    console.log('[DynamicFlow] loadScenario', key);
  } catch (e) {
    console.warn('[DynamicFlow] loadScenario failed:', e);
  }
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

onBeforeUnmount(() => {
  planeScreenInfo.value = null;
});
</script>

<style scoped>
/* 与静态架构页 .cb-cesium-layer--with-popup 内 popup 一致，仅定位层 */
.cb-dv-cesium-layer-with-popup {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}
.cb-plane-follow-popup {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  min-width: 140px;
  padding: 6px 10px;
  background: rgba(0, 20, 40, 0.92);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 6px;
  font-size: 12px;
  color: #e0f0ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.cb-plane-follow-popup-hd {
  font-weight: 600;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}
.cb-plane-follow-popup-bd {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cb-plane-follow-row {
  white-space: nowrap;
}

.marker-popup {
  z-index: 100;
  min-width: 200px;
  padding: 0;
  background: rgba(0, 20, 40, 0.95);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 8px;
  font-size: 13px;
  color: #e0f0ff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.marker-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.marker-popup-title { font-weight: 600; }
.marker-popup-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.marker-popup-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.airborne-popup-list {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}
.airborne-popup-list li {
  margin: 4px 0;
}
.cb-airborne-popup-follow {
  pointer-events: auto;
}
</style>
