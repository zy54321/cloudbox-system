
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
        <section class="cb-card cb-dv-viewer" style="display:flex;flex-direction:column;min-height:0;">
          <div class="cb-view-hd">
            <div class="cb-dv-title">
              <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
              <span class="cb-dv-title-text">主视图区</span>
            </div>
            <div class="cb-view-title smallnote">当前节点：{{ currentNodeName }}</div>
          </div>

          <div style="flex:1;min-height:0;padding:14px;">
            <div class="cb-viewport">
              <div class="cb-togglebar">
                <button class="cb-toggle" :class="{ active: activeSymbol === 'plane' }" type="button" @click="selectSymbol('plane')">✈ 飞机</button>
                <button class="cb-toggle" :class="{ active: activeSymbol === 'flow' }" type="button" @click="selectSymbol('flow')">▦ 信息流</button>
                <button class="cb-toggle" :class="{ active: activeSymbol === 'control' }" type="button" @click="selectSymbol('control')">⌁ 控制流</button>
              </div>
              <div class="cb-overlay-note">* 单屏/双屏可切换，时间轴同步驱动</div>

              <div class="cb-viewer-single" v-show="!isCompare">
                <CesiumViewport ref="vpSingle" :key="'vp-single'" />
                <div class="cb-symbols cb-symbols--single">
                  <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'plane' }" @click="selectSymbol('plane')">✈️ 飞机</button>
                  <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'flow' }" @click="selectSymbol('flow')">• 信息流</button>
                  <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'control' }" @click="selectSymbol('control')">➜ 控制流</button>
                </div>
                <div class="plane-symbol" :class="planeStateYesClass">✈</div>
                <div class="cb-overlay-plane" v-show="activeSymbol === 'plane'"></div>
                <div class="cb-overlay-flow" v-show="activeSymbol === 'flow'"></div>
                <div class="cb-overlay-control" v-show="activeSymbol === 'control'"></div>

                <div id="disposalFloatingCard" class="floating-card" :class="{ 'is-collapsed': floatingCardCollapsed }">
                  <div class="floating-card-header">
                    <span>{{ currentCardYes.phase }} · {{ currentCardYes.title }}</span>
                    <button class="btn-icon" type="button" @click="floatingCardCollapsed = !floatingCardCollapsed">
                      {{ floatingCardCollapsed ? '展开' : '收起' }}
                    </button>
                  </div>
                  <div class="floating-card-body" v-show="!floatingCardCollapsed">
                    <div class="card-summary">{{ currentCardYes.summary }}</div>
                    <div class="card-details" v-show="detailsOpen">
                      <div class="card-section-title">证据/依据</div>
                      <ul class="card-info-list">
                        <li v-for="(item, idx) in currentCardYes.evidence.slice(0, 5)" :key="'e' + idx">{{ item }}</li>
                      </ul>
                      <div class="card-section-title">处置动作</div>
                      <ul class="card-info-list">
                        <li v-for="(item, idx) in currentCardYes.actions.slice(0, 5)" :key="'a' + idx">{{ item }}</li>
                      </ul>
                      <div class="card-section-title">本节点信息（示意）</div>
                      <ul class="card-info-list">
                        <li v-for="(ev, idx) in currentCardYes.events.slice(0, 5)" :key="'n' + idx">{{ ev }}</li>
                      </ul>
                    </div>
                    <button class="btn-small" type="button" @click="detailsOpen = !detailsOpen">
                      {{ detailsOpen ? '收起详情' : '展开详情' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="cb-viewer-split" v-show="isCompare">
                <div class="cb-split-col">
                  <div class="cb-split-hint">双屏对比（有/无云匣子）｜左右同时间轴同步驱动</div>
                  <CesiumViewport ref="vpNo" :key="'vp-no'" />
                  <div class="cb-symbols cb-symbols--compare">
                    <div class="sym" :class="planeStateNoClass">✈️</div>
                    <div class="sym sym-text flow-no">{{ noFlowText }}</div>
                    <div class="sym sym-text">➜ 控制流</div>
                    <div class="sym sym-text">{{ noNodeText }}</div>
                  </div>

                  <div id="disposalFloatingCardNo" class="floating-card" :class="{ 'is-collapsed': floatingCardNoCollapsed }">
                    <div class="floating-card-header">
                      <span>{{ currentCardNo.phase }} · {{ currentCardNo.title }}</span>
                      <button class="btn-icon" type="button" @click="floatingCardNoCollapsed = !floatingCardNoCollapsed">
                        {{ floatingCardNoCollapsed ? '展开' : '收起' }}
                      </button>
                    </div>
                    <div class="floating-card-body" v-show="!floatingCardNoCollapsed">
                      <div class="card-summary">{{ currentCardNo.summary }}</div>
                      <div class="card-details" v-show="detailsOpenNo">
                        <div class="card-section-title">证据/依据</div>
                        <ul class="card-info-list">
                          <li v-for="(item, idx) in currentCardNo.evidence.slice(0, 5)" :key="'eno' + idx">{{ item }}</li>
                        </ul>
                        <div class="card-section-title">处置动作</div>
                        <ul class="card-info-list">
                          <li v-for="(item, idx) in currentCardNo.actions.slice(0, 5)" :key="'ano' + idx">{{ item }}</li>
                        </ul>
                        <div class="card-section-title">本节点信息（示意）</div>
                        <ul class="card-info-list">
                          <li v-for="(ev, idx) in currentCardNo.events.slice(0, 5)" :key="'nno' + idx">{{ ev }}</li>
                        </ul>
                      </div>
                      <button class="btn-small" type="button" @click="detailsOpenNo = !detailsOpenNo">
                        {{ detailsOpenNo ? '收起详情' : '展开详情' }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="cb-split-col">
                  <CesiumViewport ref="vpYes" :key="'vp-yes'" />
                  <div class="cb-symbols cb-symbols--compare">
                    <div class="sym" :class="planeStateYesClass">✈️</div>
                    <div class="sym sym-text flow-yes">{{ yesFlowText }}</div>
                    <div class="sym sym-text">➜ 控制流</div>
                    <div class="sym sym-text">{{ yesNodeText }}</div>
                    <div class="sym sym-badge">{{ deltaBadgeText }}</div>
                  </div>

                  <div id="disposalFloatingCardYes" class="floating-card" :class="{ 'is-collapsed': floatingCardYesCollapsed }">
                    <div class="floating-card-header">
                      <span>{{ currentCardYes.phase }} · {{ currentCardYes.title }}</span>
                      <button class="btn-icon" type="button" @click="floatingCardYesCollapsed = !floatingCardYesCollapsed">
                        {{ floatingCardYesCollapsed ? '展开' : '收起' }}
                      </button>
                    </div>
                    <div class="floating-card-body" v-show="!floatingCardYesCollapsed">
                      <div class="card-summary">{{ currentCardYes.summary }}</div>
                      <div class="card-details" v-show="detailsOpenYes">
                        <div class="card-section-title">证据/依据</div>
                        <ul class="card-info-list">
                          <li v-for="(item, idx) in currentCardYes.evidence.slice(0, 5)" :key="'eyes' + idx">{{ item }}</li>
                        </ul>
                        <div class="card-section-title">处置动作</div>
                        <ul class="card-info-list">
                          <li v-for="(item, idx) in currentCardYes.actions.slice(0, 5)" :key="'ayes' + idx">{{ item }}</li>
                        </ul>
                        <div class="card-section-title">本节点信息（示意）</div>
                        <ul class="card-info-list">
                          <li v-for="(ev, idx) in currentCardYes.events.slice(0, 5)" :key="'nyes' + idx">{{ ev }}</li>
                        </ul>
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
                      </div>
                      <button class="btn-small" type="button" @click="detailsOpenYes = !detailsOpenYes">
                        {{ detailsOpenYes ? '收起详情' : '展开详情' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cb-infobox" v-show="infoBoxVisible">
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
            </div>
          </div>
        </section>

        <aside class="cb-card cb-panel cb-dv-panel">
          <div class="cb-card-hd">
            <div class="cb-dv-title">
              <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
              <span class="cb-dv-title-text">信息面板</span>
            </div>
          </div>
          <div class="cb-panel-tabs tabs">
            <button
              class="cb-msg-tab"
              :class="{ active: rightTab === 'info' }"
              :style="{ backgroundImage: `url(${rightTab === 'info' ? dvMsgTabSelected : dvMsgTabSelect})` }"
              type="button"
              @click="toggleRightTab('info')"
            >
              <span>信息</span>
            </button>
            <button
              class="cb-msg-tab"
              :class="{ active: rightTab === 'steps' }"
              :style="{ backgroundImage: `url(${rightTab === 'steps' ? dvMsgTabSelected : dvMsgTabSelect})` }"
              type="button"
              @click="toggleRightTab('steps')"
            >
              <span>处置卡片</span>
            </button>
          </div>
          <div class="cb-panel-body">
            <div class="tabpanel" :class="{ active: rightTab === 'info' }" data-panel="info">
              <div class="scroll">
                <div class="cb-info-box">
                  <div class="cb-info-row">
                    <span class="cb-info-k">航班号</span>
                    <span id="f_no" class="cb-info-v">{{ infoFields.f_no }}</span>
                  </div>
                  <div class="cb-info-row">
                    <span class="cb-info-k">机型</span>
                    <span id="f_type" class="cb-info-v">{{ infoFields.f_type }}</span>
                  </div>
                  <div class="cb-info-row">
                    <span class="cb-info-k">航路</span>
                    <span id="f_route" class="cb-info-v">{{ infoFields.f_route }}</span>
                  </div>
                  <div class="cb-info-row">
                    <span class="cb-info-k">关键时间</span>
                    <span id="f_time" class="cb-info-v">{{ infoFields.f_time }}</span>
                  </div>
                  <div class="cb-info-row">
                    <span class="cb-info-k">处置状态</span>
                    <span id="f_state" class="cb-info-v">{{ infoFields.f_state }}</span>
                  </div>
                  <div class="cb-info-row">
                    <span class="cb-info-k">当前节点</span>
                    <span id="nodeName" class="cb-info-v">{{ infoFields.f_node }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="tabpanel" :class="{ active: rightTab === 'steps' }" data-panel="steps">
              <div class="scroll">
                <div class="list" id="stepList" ref="stepListEl">
                  <div
                    class="item"
                    :class="{ highlight: card.nodeId === currentNodeId, 'is-current': card.nodeId === currentNodeId }"
                    v-for="card in disposalCards"
                    :key="card.nodeId"
                    :data-node-id="card.nodeId"
                  >
                    <b class="cb-card-title">{{ card.phase }} · {{ card.title }}</b>
                    <div class="meta cb-card-sub">T+{{ card.t }} | {{ card.state }}</div>
                    <div class="small" style="margin-top:6px;">{{ card.summary }}</div>
                    <div class="card-node-info" v-if="card.events && card.events.length">
                      <div class="card-section-title">本节点信息（示意）</div>
                      <ul class="card-info-list">
                        <li v-for="(ev, idx) in card.events.slice(0, 5)" :key="idx" class="cb-card-item">{{ ev }}</li>
                      </ul>
                    </div>
                    <div class="compare-content" v-if="isCompare">
                      <div class="compare-data-row">
                        <span class="compare-data-label">T_no / T_yes</span>
                        <span class="compare-data-value">{{ card.compare.t_no }} / {{ card.compare.t_yes }}</span>
                      </div>
                      <div class="compare-data-row">
                        <span class="compare-data-label">Δt</span>
                        <span class="compare-data-value compare-delta">{{ card.compare.dt }}</span>
                      </div>
                      <div class="compare-data-row">
                        <span class="compare-data-label">hops_no / hops_yes</span>
                        <span class="compare-data-value">{{ card.compare.hops_no }} / {{ card.compare.hops_yes }}</span>
                      </div>
                      <div class="compare-data-row">
                        <span class="compare-data-label">Δhops</span>
                        <span class="compare-data-value compare-delta">{{ card.compare.dhops }}</span>
                      </div>
                      <div class="compare-path">
                        <div class="compare-hint">路径（示意）</div>
                        <div>{{ card.compare.path_no }}</div>
                        <div>{{ card.compare.path_yes }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- <hr /> -->
                <div class="small" v-show="isCompare">对比模式：左右两套进度随同一时间轴同步更新（示意）。</div>
                <div class="list compare-steps-table" v-show="isCompare">
                  <div class="item" :class="{ highlight: i === idxNo || i === idxYes }" v-for="(s, i) in steps" :key="s.nodeId">
                    <b>{{ s.name }}</b>
                    <div class="meta">无云匣子：{{ i <= idxNo ? '已到达' : '未到达' }}（T+{{ s.t_no }}s） ｜ 有云匣子：{{ i <= idxYes ? '已到达' : '未到达' }}（T+{{ s.t_yes }}s）</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section class="cb-time-dock cb-dv-timeline">
        <div class="cb-dv-title">
          <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
          <span class="cb-dv-title-text cb-dv-timeline-title">时间轴（T+ 回放）</span>
        </div>
        <div class="cb-time-actions">
          <button class="cb-time-btn" type="button" @click="togglePlay">{{ playing ? '⏸ 暂停' : '▶ 播放' }}</button>
          <button class="cb-time-btn ghost" type="button" @click="onReset">⟲ 复位</button>
          <button class="cb-time-btn ghost" type="button">T+ {{ currentTimeLabel }}</button>
        </div>
        <div class="cb-time-slider" style="position:relative;">
          <div class="compare-markers" v-show="isCompare" ref="compareMarkersEl">
            <div class="compare-marker marker-no" :class="`align-${markerNoAlign}`" :style="{ left: markerNoLeft + '%' }" :title="markerNoTitle">
              <span class="marker-label">{{ markerNoLabel }}</span>
            </div>
            <div class="compare-marker marker-yes" :class="`align-${markerYesAlign}`" :style="{ left: markerYesLeft + '%' }" :title="markerYesTitle">
              <span class="marker-label">{{ markerYesLabel }}</span>
            </div>
          </div>
          <input type="range" min="0" max="100" v-model.number="t" @input="onScrub(t)" @change="onScrub(t)" />
        </div>
        <div class="cb-time-hint">拖动后联动：视图区 / 处置步骤 / 事件列表 / 告警</div>
      </section>

      <div id="globalAlertToast" class="alert-toast" :class="{ hidden: !alertToastVisible }">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <div id="alertTitle" class="alert-title">{{ alertTitle }}</div>
          <div id="alertBody" class="alert-body">{{ alertBody }}</div>
        </div>
        <button class="alert-close" type="button" @click="hideAlertToast">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CesiumViewport from '../components/CesiumViewport.vue';

const dvTitleIconLeft = new URL('../assets/dynamicViewport/title_icon_left.png', import.meta.url).href;
const dvTitleBkRight = new URL('../assets/dynamicViewport/title_bk_right.png', import.meta.url).href;
const dvModeIcon = new URL('../assets/dynamicViewport/title_icon2.png', import.meta.url).href;
const dvMsgTabSelect = new URL('../assets/dynamicViewport/msgpage_button_select.png', import.meta.url).href;
const dvMsgTabSelected = new URL('../assets/dynamicViewport/msgpage_button_selected.png', import.meta.url).href;

const vpSingle = ref(null);
const vpNo = ref(null);
const vpYes = ref(null);
const viewStateNo = ref(null);
const compareMarkersEl = ref(null);
const stepListEl = ref(null);

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
  if (isCompare.value) {
    viewStateNo.value = vpNo.value?.getViewState?.();
    vpNo.value?.requestRender?.();
    vpYes.value?.requestRender?.();
  } else {
    vpSingle.value?.requestRender?.();
  }
  isCompare.value = !isCompare.value;
  if (isCompare.value) {
    hideInfoBox();
  }
  nextTick(() => {
    [vpSingle.value, vpNo.value, vpYes.value].forEach((v) => v?.resize?.());
    [vpSingle.value, vpNo.value, vpYes.value].forEach((v) => v?.requestRender?.());
    updateCompareMarkers();
    refreshAll(t.value);
  });
  console.log('[DynamicFlow] compare', isCompare.value);
};

loadScenario(activeScenario.value);
</script>
