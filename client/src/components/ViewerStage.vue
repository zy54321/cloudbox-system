<template>
  <section class="cb-card cb-main cb-dv-main" style="display:flex;flex-direction:column;min-height:0;">
    <slot name="header" />

    <div style="flex:1;min-height:0;padding:14px;">
      <div class="cb-viewport" :class="{ 'cb-viewport--split': isCompare }">
        <div v-show="!isCompare" class="cb-viewport--single cb-viewer-single">
          <CesiumViewport
            :ref="vpSingleRef"
            class="cb-dv-cesium"
            :model-url="modelUrl"
            :units-url="unitsUrl"
            :auto-focus="autoFocus"
            :split-mode="false"
            :path-points="pathPoints"
            :path-progress="pathProgress"
            :follow-path="followPath"
            :visible-relation-id="effectiveVisibleRelationId"
            :visible-relation-ids-left="effectiveIdsLeft"
            :visible-relation-ids-right="effectiveIdsRight"
            @marker-click="$emit('marker-click', $event)"
            @marker-move="$emit('marker-move', $event)"
            @plane-screen-info="$emit('plane-screen-info', $event)"
          />
          <slot name="single-overlays" />
        </div>

        <div v-show="isCompare" class="cb-viewer-split">
          <div class="cb-viewport cb-viewport--split-full">
            <div class="cb-cesium-layer">
              <CesiumViewport
                :ref="vpCompareRef"
                :split-mode="true"
                :left-model-url="leftModelUrl"
                :right-model-url="rightModelUrl"
                :split-position="splitPosition"
                :readonly="readonly"
                :auto-focus="autoFocus"
                :units-url="unitsUrl"
                :path-points="pathPoints"
                :path-progress="pathProgress"
                :follow-path="followPath"
                :visible-relation-id="effectiveVisibleRelationId"
                :visible-relation-ids-left="effectiveIdsLeft"
                :visible-relation-ids-right="effectiveIdsRight"
                @marker-click="$emit('marker-click', $event)"
                @marker-move="$emit('marker-move', $event)"
              />
            </div>
          </div>
          <slot name="compare-overlays" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import CesiumViewport from './CesiumViewport.vue';

const props = defineProps({
  isCompare: { type: Boolean, required: true },
  bindVpSingle: { type: Function, required: true },
  bindVpCompare: { type: Function, required: true },
  modelUrl: { type: String, default: '' },
  unitsUrl: { type: String, default: '' },
  leftModelUrl: { type: String, default: '' },
  rightModelUrl: { type: String, default: '' },
  splitPosition: { type: Number, default: 0.5 },
  readonly: { type: Boolean, default: false },
  autoFocus: { type: Boolean, default: true },
  pathPoints: { type: Array, default: null },
  pathProgress: { type: Number, default: 0 },
  followPath: { type: Boolean, default: false },
  /** 旧 API：单 id，传入时自动转为 visibleRelationIdsLeft=[id]、visibleRelationIdsRight=[] */
  visibleRelationId: { type: String, default: null },
  visibleRelationIdsLeft: { type: Array, default: () => [] },
  visibleRelationIdsRight: { type: Array, default: () => [] }
});

const effectiveIdsLeft = computed(() =>
  props.visibleRelationId != null ? [props.visibleRelationId] : (props.visibleRelationIdsLeft || [])
);
const effectiveIdsRight = computed(() =>
  props.visibleRelationId != null ? [] : (props.visibleRelationIdsRight || [])
);
const effectiveVisibleRelationId = computed(() => props.visibleRelationId);

const vpSingleRef = (el) => {
  if (typeof props.bindVpSingle === 'function') props.bindVpSingle(el);
};
const vpCompareRef = (el) => {
  if (typeof props.bindVpCompare === 'function') props.bindVpCompare(el);
};
</script>
