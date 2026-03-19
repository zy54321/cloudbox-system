<template>
  <section class="cb-time-dock cb-dv-timeline cb-time-dock--overlay">
    <div class="cb-dv-title">
      <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
      <span class="cb-dv-title-text cb-dv-timeline-title">时间轴（T+ 回放）</span>
    </div>

    <div class="cb-time-actions">
      <button class="cb-time-btn" type="button" @click="$emit('togglePlay')">{{ playing ? '⏸ 暂停' : '▶ 播放' }}</button>
      <button class="cb-time-btn ghost" type="button" @click="$emit('reset')">⟲ 复位</button>
      <button class="cb-time-btn ghost" type="button">T+ {{ currentTimeLabel }}</button>
    </div>

    <div class="cb-time-marks" v-if="keyframeMarks.length">
      <div class="marks-group marks-yes" v-if="marksBySide.yes.length">
        <button
          v-for="(mark, i) in marksBySide.yes"
          :key="'yes-' + i"
          type="button"
          class="mark mark-yes"
          :title="mark.title"
          @click="$emit('update:modelValue', Number(mark.t))"
        >{{ mark.label }}</button>
      </div>
      <div class="marks-group marks-no" v-if="marksBySide.no.length">
        <button
          v-for="(mark, i) in marksBySide.no"
          :key="'no-' + i"
          type="button"
          class="mark mark-no"
          :title="mark.title"
          @click="$emit('update:modelValue', Number(mark.t))"
        >{{ mark.label }}</button>
      </div>
    </div>

    <div class="cb-time-slider" style="position: absolute;
    left: 495px;">
      <div class="compare-markers" v-show="isCompare" ref="compareMarkersEl">
        <div class="compare-marker marker-no" :class="`align-${markerNoAlign}`" :style="{ left: markerNoLeft + '%' }" :title="markerNoTitle">
          <span class="marker-label">{{ markerNoLabel }}</span>
        </div>
        <div class="compare-marker marker-yes" :class="`align-${markerYesAlign}`" :style="{ left: markerYesLeft + '%' }" :title="markerYesTitle">
          <span class="marker-label">{{ markerYesLabel }}</span>
        </div>
      </div>

      <!-- 保持 v-model 语义：用 modelValue + update:modelValue 来承接 v-model.number -->
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
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';

const compareMarkersEl = ref(null);

const props = defineProps({
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
  if (!props.isCompare) {
    return { yes, no: [] };
  }
  return { yes, no };
});

defineEmits(['togglePlay', 'reset', 'scrub', 'update:modelValue']);
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
  margin: 5px 0;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  transform: translateY(-10px);
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
.mark:hover {
  opacity: 0.9;
}

.cb-time-slider {
  transform: translateY(10px);
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
</style>
