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
          :class="{ 'cb-time-dock__embed-split-track--no-marks': !sortedKeyframeMarksEmbed.length }"
        >
          <div v-if="sortedKeyframeMarksEmbed.length" class="cb-time-marks cb-time-marks--embed-split-seq">
            <button
              v-for="(mark, i) in sortedKeyframeMarksEmbed"
              :key="'mk-' + i"
              type="button"
              :class="[
                'mark',
                'mark--embed-seq',
                mark.side === 'yes' ? 'mark-yes' : 'mark-no',
                { 'mark--active': !!mark.active }
              ]"
              :title="mark.title || mark.label"
              @click="onMarkClick(Number(mark.t))"
            >{{ mark.label }}</button>
          </div>
          <div class="cb-time-slider cb-time-slider--embed cb-time-slider--embed-split-inline">
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

      <div class="cb-time-marks" v-if="keyframeMarks.length">
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

      <div class="cb-time-slider" :class="{ 'cb-time-slider--embed': embed }">
        <div class="compare-markers" v-show="isCompare && !embed" ref="compareMarkersEl">
          <div class="compare-marker marker-no" :class="`align-${markerNoAlign}`" :style="{ left: markerNoLeft + '%' }" :title="markerNoTitle">
            <span class="marker-label">{{ markerNoLabel }}</span>
          </div>
          <div class="compare-marker marker-yes" :class="`align-${markerYesAlign}`" :style="{ left: markerYesLeft + '%' }" :title="markerYesTitle">
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

      <div class="cb-time-hint">拖动后联动：视图区 / 处置步骤 / 事件列表 / 告警</div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';

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
  keyframeMarks: { type: Array, default: () => [] }
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

/** 双屏 embed-split：关键帧按 t 排序，不随进度条比例定位 */
const sortedKeyframeMarksEmbed = computed(() => {
  const list = [...(props.keyframeMarks || [])];
  return list.sort((a, b) => Number(a.t) - Number(b.t));
});

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
</style>
