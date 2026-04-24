<template>
  <section
    class="cb-time-dock cb-dv-timeline"
    :class="[
      embed ? 'cb-time-dock--embed' : 'cb-time-dock--overlay',
      embed && embedSubtitle ? 'cb-time-dock--embed-split' : ''
    ]"
  >
    <!-- 双屏 embed：单行 标题 | 播放/复位/T+ | 右侧轨道(关键帧在上、进度条略下移) -->
    <template v-if="embed && embedSubtitle">
      <div class="cb-time-dock__embed-split-row">
        <div class="cb-dv-title cb-dv-title--embed-split">
          <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
          <div class="cb-dv-title-stack">
            <span class="cb-dv-title-line1">{{ embedTitleMain }}</span>
            <span class="cb-dv-title-line2">{{ embedSubtitle }}</span>
          </div>
        </div>
        <div class="cb-time-actions cb-time-actions--embed-split">
          <button class="cb-time-btn" type="button" @click="$emit('togglePlay')">{{ playing ? '⏸ 暂停' : '▶ 播放' }}</button>
          <button class="cb-time-btn ghost" type="button" @click="$emit('reset')">⟲ 复位</button>
          <button class="cb-time-btn ghost" type="button">{{ currentTimeLabel }}</button>
        </div>
        <div
          class="cb-time-dock__embed-split-track"
          :class="{
            'cb-time-dock__embed-split-track--no-marks': embedSplitTrackNoUpperMarks
          }"
        >
          <div
            class="cb-time-embed-rail"
            :class="{ 'cb-time-embed-rail--milestones': milestoneList.length }"
          >
            <div
              v-if="milestoneList.length"
              class="cb-time-embed-tick-bg"
              aria-hidden="true"
            >
              <div
                v-for="(ms, mi) in milestoneList"
                :key="'ms-' + ms.key + '-' + mi"
                :class="['cb-time-tick', milestoneTickClass(ms.key)]"
                :style="milestoneTickStyle(ms.t, ms.key)"
              >
                <span
                  :class="['cb-time-milestone-label', milestoneTierClass(ms.key), milestoneLabelLayoutClass(ms.key)]"
                >{{ ms.label }}</span>
                <div class="cb-time-tick-line" />
              </div>
            </div>
            <!-- 关键时间点按钮：SHOW_KEYFRAME_UI 为 true 时恢复 -->
            <div
              v-if="SHOW_KEYFRAME_UI && sortedKeyframeMarksEmbed.length"
              class="cb-time-embed-tick-bg cb-time-embed-keyframe-ticks"
              aria-hidden="true"
            >
              <button
                v-for="(mark, i) in sortedKeyframeMarksEmbed"
                :key="'mk-' + i + '-' + mark.t"
                type="button"
                :class="[
                  'mark',
                  'mark-embed-keyframe',
                  mark.side === 'yes' ? 'mark-yes' : 'mark-no',
                  { 'mark--active': !!mark.active }
                ]"
                :style="keyframeTickStyle(mark.t)"
                :title="mark.title || mark.label"
                @click="onMarkClick(Number(mark.t))"
              >{{ mark.label }}</button>
            </div>
            <div class="cb-time-embed-rail-content">
              <div
                v-if="milestoneList.length"
                class="cb-time-milestone-spacer"
                aria-hidden="true"
              />
              <div class="cb-time-slider cb-time-slider--embed cb-time-slider--embed-split-inline">
                <div
                  class="compare-markers"
                  v-show="embedMarkerNoVisible || embedMarkerYesVisible"
                >
                  <div
                    v-show="embedMarkerNoVisible"
                    class="compare-marker marker-no"
                    :class="`align-${markerNoAlign}`"
                    :style="compareMarkerRailStyle(markerNoDemoT, markerNoLeft)"
                    :title="markerNoTitle"
                  >
                    <span class="marker-label">{{ markerNoLabel }}</span>
                  </div>
                  <div
                    v-show="embedMarkerYesVisible"
                    class="compare-marker marker-yes"
                    :class="`align-${markerYesAlign}`"
                    :style="compareMarkerRailStyle(markerYesDemoT, markerYesLeft)"
                    :title="markerYesTitle"
                  >
                    <span class="marker-label">{{ markerYesLabel }}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  :max="maxTime"
                  :step="step"
                  :value="modelValue"
                  class="cb-time-range-input"
                  @input="$emit('update:modelValue', Number($event.target.value)); $emit('scrub', Number($event.target.value))"
                  @change="$emit('scrub', Number($event.target.value))"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="cb-dv-title">
        <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
        <span class="cb-dv-title-text cb-dv-timeline-title">{{ dockTitle }}</span>
      </div>

      <div class="cb-time-actions">
        <button class="cb-time-btn" type="button" @click="$emit('togglePlay')">{{ playing ? '⏸ 暂停' : '▶ 播放' }}</button>
        <button class="cb-time-btn ghost" type="button" @click="$emit('reset')">⟲ 复位</button>
        <button class="cb-time-btn ghost" type="button">{{ currentTimeLabel }}</button>
      </div>

      <div
        v-if="milestoneList.length"
        class="cb-time-embed-rail cb-time-embed-rail--overlay-block cb-time-embed-rail--milestones"
      >
        <div class="cb-time-embed-tick-bg" aria-hidden="true">
          <div
            v-for="(ms, mi) in milestoneList"
            :key="'ms2-' + ms.key + '-' + mi"
            :class="['cb-time-tick', milestoneTickClass(ms.key)]"
            :style="milestoneTickStyle(ms.t, ms.key)"
          >
            <span
              :class="['cb-time-milestone-label', milestoneTierClass(ms.key), milestoneLabelLayoutClass(ms.key)]"
            >{{ ms.label }}</span>
            <div class="cb-time-tick-line" />
          </div>
        </div>
        <div class="cb-time-embed-rail-content">
          <div class="cb-time-milestone-spacer" aria-hidden="true" />
          <div v-if="SHOW_KEYFRAME_UI && keyframeMarks.length" class="cb-time-marks">
            <div class="marks-group marks-yes" v-if="marksBySide.yes.length">
              <button
                v-for="(mark, i) in marksBySide.yes"
                :key="'yes-' + i"
                type="button"
                :class="['mark', 'mark-yes', { 'mark--active': !!mark.active }]"
                :title="mark.title"
                @click="onMarkClick(Number(mark.t))"
              >{{ mark.label }}</button>
            </div>
            <div class="marks-group marks-no" v-if="marksBySide.no.length">
              <button
                v-for="(mark, i) in marksBySide.no"
                :key="'no-' + i"
                type="button"
                :class="['mark', 'mark-no', { 'mark--active': !!mark.active }]"
                :title="mark.title"
                @click="onMarkClick(Number(mark.t))"
              >{{ mark.label }}</button>
            </div>
          </div>
          <div class="cb-time-slider" :class="{ 'cb-time-slider--embed': embed, 'cb-time-embed-rail--slider': true }">
            <div
              class="compare-markers"
              v-show="embedMarkerNoVisible || embedMarkerYesVisible"
              ref="compareMarkersEl"
            >
              <div
                v-show="embedMarkerNoVisible"
                class="compare-marker marker-no"
                :class="`align-${markerNoAlign}`"
                :style="compareMarkerRailStyle(markerNoDemoT, markerNoLeft)"
                :title="markerNoTitle"
              >
                <span class="marker-label">{{ markerNoLabel }}</span>
              </div>
              <div
                v-show="embedMarkerYesVisible"
                class="compare-marker marker-yes"
                :class="`align-${markerYesAlign}`"
                :style="compareMarkerRailStyle(markerYesDemoT, markerYesLeft)"
                :title="markerYesTitle"
              >
                <span class="marker-label">{{ markerYesLabel }}</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              :max="maxTime"
              :step="step"
              :value="modelValue"
              @input="$emit('update:modelValue', Number($event.target.value)); $emit('scrub', Number($event.target.value))"
              @change="$emit('scrub', Number($event.target.value))"
            />
          </div>
        </div>
      </div>
      <template v-else>
        <div v-if="SHOW_KEYFRAME_UI && keyframeMarks.length" class="cb-time-marks">
          <div class="marks-group marks-yes" v-if="marksBySide.yes.length">
            <button
              v-for="(mark, i) in marksBySide.yes"
              :key="'yes-' + i"
              type="button"
              :class="['mark', 'mark-yes', { 'mark--active': !!mark.active }]"
              :title="mark.title"
              @click="onMarkClick(Number(mark.t))"
            >{{ mark.label }}</button>
          </div>
          <div class="marks-group marks-no" v-if="marksBySide.no.length">
            <button
              v-for="(mark, i) in marksBySide.no"
              :key="'no-' + i"
              type="button"
              :class="['mark', 'mark-no', { 'mark--active': !!mark.active }]"
              :title="mark.title"
              @click="onMarkClick(Number(mark.t))"
            >{{ mark.label }}</button>
          </div>
        </div>
        <div class="cb-time-slider" :class="{ 'cb-time-slider--embed': embed, 'cb-time-embed-rail--slider': true }">
          <div
            class="compare-markers"
            v-show="embedMarkerNoVisible || embedMarkerYesVisible"
            ref="compareMarkersEl"
          >
            <div
              v-show="embedMarkerNoVisible"
              class="compare-marker marker-no"
              :class="`align-${markerNoAlign}`"
              :style="compareMarkerRailStyle(markerNoDemoT, markerNoLeft)"
              :title="markerNoTitle"
            >
              <span class="marker-label">{{ markerNoLabel }}</span>
            </div>
            <div
              v-show="embedMarkerYesVisible"
              class="compare-marker marker-yes"
              :class="`align-${markerYesAlign}`"
              :style="compareMarkerRailStyle(markerYesDemoT, markerYesLeft)"
              :title="markerYesTitle"
            >
              <span class="marker-label">{{ markerYesLabel }}</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            :max="maxTime"
            :step="step"
            :value="modelValue"
            @input="$emit('update:modelValue', Number($event.target.value)); $emit('scrub', Number($event.target.value))"
            @change="$emit('scrub', Number($event.target.value))"
          />
        </div>
      </template>

      <div class="cb-time-hint">拖动后联动：视图区 / 处置步骤 / 事件列表 / 告警</div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';

/** 为 false 时隐藏关键时间点按钮（可再打开） */
const SHOW_KEYFRAME_UI = false;

const compareMarkersEl = ref(null);

const props = defineProps({
  dockTitle: { type: String, default: '时间轴（T+ 回放）' },
  /** 嵌入双屏列内：不占底部浮层、进度条全宽 */
  embed: { type: Boolean, default: false },
  /** 双屏 embed：与 embedTitleMain 组成两行标题（有云匣子侧 / 无云匣子侧）；空则走默认单行 dockTitle */
  embedSubtitle: { type: String, default: '' },
  embedTitleMain: { type: String, default: '时间轴' },
  dvTitleIconLeft: { type: String, required: true },
  playing: { type: Boolean, required: true },
  currentTimeLabel: { type: String, required: true },
  isCompare: { type: Boolean, required: true },
  markerNoAlign: { type: String, required: true },
  markerNoLeft: { type: Number, required: true },
  markerNoTitle: { type: String, required: true },
  markerNoLabel: { type: String, required: true },
  markerYesAlign: { type: String, required: true },
  markerYesLeft: { type: Number, required: true },
  markerYesTitle: { type: String, required: true },
  markerYesLabel: { type: String, required: true },
  modelValue: { type: Number, required: true },
  maxTime: { type: Number, required: true },
  step: { type: Number, default: 0.1 },
  keyframeMarks: { type: Array, default: () => [] },
  /** embed-split：叙事阶段标牌 [{ key, label, t }] t 为 demo 秒，相对 maxTime 定水平位置 */
  milestones: { type: Array, default: () => [] },
  /** 双屏 embed 列：仅显示本侧 T 标（'yes'|'no'）；非 embed 勿传 */
  perSideTimeMarker: {
    type: String,
    default: '',
    validator: (v) => v === '' || v === 'yes' || v === 'no'
  },
  /**
   * 对比标 T 的 demo 秒：传入时 left 与里程碑/range（padding 8px 可拖区）同尺，避免 0% 与滑块气泡错位。
   * 未传时回退 markerYesLeft/markerNoLeft 的百分比（旧行为）。
   */
  markerYesDemoT: { type: Number, default: undefined },
  markerNoDemoT: { type: Number, default: undefined }
});

const marksBySide = computed(() => {
  const list = props.keyframeMarks || [];
  const yes = list.filter((m) => m.side === 'yes');
  const no = list.filter((m) => m.side === 'no');
  if (props.embed) {
    return { yes, no };
  }
  if (!props.isCompare) {
    return { yes, no: [] };
  }
  return { yes, no };
});

/** 双屏 embed-split：关键帧按 t 排序；水平位置由 keyframeTickStyle 与里程碑同尺度 */
const sortedKeyframeMarksEmbed = computed(() => {
  const list = [...(props.keyframeMarks || [])];
  return list.sort((a, b) => Number(a.t) - Number(b.t));
});

const embedMarkerNoVisible = computed(() => {
  const ps = props.perSideTimeMarker;
  if (props.embed && (ps === 'yes' || ps === 'no')) return ps === 'no';
  return props.isCompare && !props.embed;
});

const embedMarkerYesVisible = computed(() => {
  const ps = props.perSideTimeMarker;
  if (props.embed && (ps === 'yes' || ps === 'no')) return ps === 'yes';
  return props.isCompare && !props.embed;
});

const milestoneList = computed(() => (props.milestones || []).filter((m) => m && Number.isFinite(Number(m.t))));

const embedSplitTrackNoUpperMarks = computed(() => {
  const noMile = !milestoneList.value.length;
  const noKf = !SHOW_KEYFRAME_UI || !sortedKeyframeMarksEmbed.value.length;
  return noMile && noKf;
});

/** 与原生 range 可拖动区左右 inset 一致，使竖线对齐滑块中心 */
const RAIL_INSET_PX = 8;

function milestoneStyle(tSec) {
  const tm = Math.max(Number(props.maxTime) || 1, 1e-6);
  const r = Math.max(0, Math.min(Number(tSec), tm)) / tm;
  const g = 2 * RAIL_INSET_PX;
  return {
    left: `calc(${RAIL_INSET_PX}px + (100% - ${g}px) * ${r})`
  };
}

/** 三枚阶段里程碑同刻或近刻时上下错行（与 ms.key 绑定，避免水平叠字） */
const MILESTONE_STAGGER_PX = { alarm: 0, disposal: 20, complete: 40, other: 58 };

function milestoneTickStyle(tSec, key) {
  const k = String(key || 'other');
  const py = MILESTONE_STAGGER_PX[k] != null ? MILESTONE_STAGGER_PX[k] : MILESTONE_STAGGER_PX.other;
  return Object.assign({}, milestoneStyle(tSec), {
    top: `${py}px`,
    bottom: '0'
  });
}

function compareMarkerRailStyle(demoT, leftPercent) {
  if (demoT != null && Number.isFinite(Number(demoT))) {
    return milestoneStyle(Number(demoT));
  }
  return { left: `${Number(leftPercent) || 0}%` };
}

function keyframeTickStyle(tSec) {
  return Object.assign({}, milestoneStyle(tSec), {
    position: 'absolute',
    top: '4px',
    transform: 'translateX(-50%)',
    zIndex: 2
  });
}

function milestoneTierClass(key) {
  const k = String(key || '');
  if (k === 'alarm') return 'cb-time-milestone--alarm';
  if (k === 'disposal') return 'cb-time-milestone--disposal';
  if (k === 'complete') return 'cb-time-milestone--complete';
  return 'cb-time-milestone--other';
}

/** 开始告警=竖线左侧文案，开始处置=右侧；完成/其他=中线 */
function milestoneLabelLayoutClass(key) {
  const k = String(key || '');
  if (k === 'alarm') return 'cb-time-milestone-label--l';
  if (k === 'disposal') return 'cb-time-milestone-label--r';
  return 'cb-time-milestone-label--c';
}

/** 与竖线同锚（侧排 label）或中线叠放（开始完成等） */
function milestoneTickClass(key) {
  const k = String(key || '');
  if (k === 'alarm' || k === 'disposal') return 'cb-time-tick--side';
  return 'cb-time-tick--stack';
}

const emit = defineEmits(['togglePlay', 'reset', 'scrub', 'update:modelValue']);

function onMarkClick(tVal) {
  emit('update:modelValue', tVal);
  emit('scrub', tVal);
}
</script>

<style scoped>
.cb-time-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cb-time-marks {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin: 6px 0 4px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}
.cb-time-marks .marks-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
}
.mark {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  color: #fff;
}
.mark-yes {
  border: 1px solid #4CAF50;
}
.mark-no {
  border: 1px solid #3B82F6;
}
.mark--active {
  background: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.22),
    0 0 10px rgba(80, 180, 255, 0.28);
}
.mark:hover {
  opacity: 0.9;
}

/** embed 关键帧：与里程碑同 left 计算，可点击 */
.cb-time-embed-keyframe-ticks {
  pointer-events: none;
  z-index: 2;
}
.cb-time-embed-keyframe-ticks .mark-embed-keyframe {
  pointer-events: auto;
  max-width: min(8rem, 36vw);
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.2;
  padding: 2px 5px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb-time-slider {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.cb-time-slider--embed {
  width: 100%;
  min-width: 0;
}

/* compare 标签：从进度条上方移到下方 */
.compare-markers {
  overflow: visible;
  top: 0;
  height: 0;
}

.compare-marker .marker-label {
  top: calc(100% + 8px);
  bottom: auto;
}

/* 双屏 embed-split：标题栈（详细尺寸在 proto.css） */
.cb-dv-title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}
.cb-dv-title-line1,
.cb-dv-title-line2 {
  display: block;
  text-align: left;
}
.cb-time-dock__embed-split-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.cb-time-dock__embed-split-track {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  flex: 1 1 auto;
  min-width: 48px;
  align-self: center;
}
.cb-time-dock__embed-split-track--no-marks .cb-time-slider--embed-split-inline {
  margin-top: 0;
}
.cb-time-slider--embed-split-inline {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-top: 9px;
}
.cb-time-range-input {
  width: 100%;
  min-width: 0;
}
.cb-time-marks--embed-split-seq {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 0;
  width: 100%;
  line-height: 1;
}
.mark--embed-seq {
  flex: 0 0 auto;
}

.cb-time-embed-rail {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.cb-time-embed-rail--overlay-block {
  margin: 4px 0 0;
}
.cb-time-embed-tick-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: visible;
}
.cb-time-embed-rail-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cb-time-milestone-spacer {
  flex: 0 0 auto;
  min-height: 1.15em;
  height: 18px;
  pointer-events: none;
}
.cb-time-embed-rail--milestones .cb-time-milestone-spacer {
  min-height: 64px;
  height: auto;
}
.cb-time-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  overflow: visible;
}
/* 竖线锚点对齐时间比例；宽 0，文案相对 line 中心左右排布 */
.cb-time-tick--side {
  left: 0;
  width: 0;
  transform: none;
}
.cb-time-tick--side .cb-time-tick-line {
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 0;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(120, 200, 255, 0.85), rgba(80, 160, 255, 0.32));
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(80, 180, 255, 0.22);
}
.cb-time-tick--side .cb-time-milestone-label--l {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(calc(-100% - 4px));
  text-align: right;
  max-width: 6.5em;
}
.cb-time-tick--side .cb-time-milestone-label--r {
  position: absolute;
  top: 0;
  left: 4px;
  transform: none;
  text-align: left;
  max-width: 6.5em;
}
/* 开始完成等：文案压中，竖线自上而下 */
.cb-time-tick--stack {
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  max-width: min(8.5em, 48vw);
  min-width: 0;
  transform: translateX(-50%);
}
.cb-time-tick--stack .cb-time-milestone-label--c {
  text-align: center;
  max-width: 100%;
}
.cb-time-tick--stack .cb-time-tick-line {
  width: 1px;
  flex: 1 1 auto;
  min-height: 8px;
  margin-top: 2px;
  background: linear-gradient(180deg, rgba(120, 200, 255, 0.8), rgba(80, 160, 255, 0.35));
  border-radius: 1px;
  align-self: center;
}
.cb-time-milestone-label {
  font-size: 11px;
  line-height: 1.15;
  color: rgba(235, 248, 255, 0.92);
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.65);
}
</style>
