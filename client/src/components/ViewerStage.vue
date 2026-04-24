<template>
  <section class="cb-card cb-main cb-dv-main cb-dv-main-shell">
    <slot name="header" />

    <div class="cb-dv-main-stage">
      <div class="cb-viewport" :class="{ 'cb-viewport--split': isCompare }">
        <div v-show="!isCompare" class="cb-viewport--single cb-viewer-single">
          <CesiumViewport
            :ref="vpSingleRef"
            class="cb-dv-cesium"
            :model-url="modelUrl"
            :units-url="unitsUrl"
            :static-ground-merge-url="staticGroundMergeUrl"
            :links-url="linksUrl"
            :auto-focus="autoFocus"
            :split-mode="false"
            :path-points="pathPoints"
            :path-progress="pathProgress"
            :follow-path="followPath"
            :dep-airport-label="depAirportLabel"
            :arr-airport-label="arrAirportLabel"
            :visible-relation-id="effectiveVisibleRelationId"
            :visible-relation-ids-left="effectiveIdsLeft"
            :visible-relation-ids-right="effectiveIdsRight"
            :active-relation-ids="effectiveIdsLeft"
            :active-unit-cluster-ids="effectiveActiveUnitClusterIds"
            :visible-unit-cluster-ids-left="visibleUnitClusterIdsLeft"
            :visible-unit-cluster-ids-right="visibleUnitClusterIdsRight"
            @marker-click="$emit('marker-click', $event)"
            @marker-move="$emit('marker-move', $event)"
            @marker-close="$emit('marker-close')"
            @plane-screen-info="$emit('plane-screen-info', $event)"
          />
          <slot name="single-overlays" />
        </div>

        <div v-show="isCompare" class="cb-viewer-split cb-viewer-split--iframe-absolute">
          <div class="cb-viewport cb-viewport--split-full cb-viewport--iframe-split-host">
            <!-- iframe 由 compareBridge 挂载；勿用 tYes/tNo/marker 等作 key，避免重载 -->
            <CompareIframeStage v-if="compareBridge" :bridge="compareBridge">
              <template #left-overlay>
                <slot name="compare-left-overlay" />
              </template>
              <template #right-overlay>
                <slot name="compare-right-overlay" />
              </template>
            </CompareIframeStage>
            <div class="cb-compare-map-overlays">
              <slot name="compare-map-overlays" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 单屏：CesiumViewport。双屏：仅 CompareIframeStage（dual-iframe-poc/scene-*.html）；不再内嵌双视口 Cesium split。
 */
import { computed } from 'vue';
import CesiumViewport from './CesiumViewport.vue';
import CompareIframeStage from './CompareIframeStage.vue';

const props = defineProps({
  isCompare: { type: Boolean, required: true },
  compareBridge: { type: Object, default: null },
  bindVpSingle: { type: Function, required: true },
  modelUrl: { type: String, default: '' },
  unitsUrl: { type: String, default: '' },
  staticGroundMergeUrl: { type: String, default: '' },
  linksUrl: { type: String, default: '' },
  autoFocus: { type: Boolean, default: true },
  pathPoints: { type: Array, default: null },
  pathProgress: { type: Number, default: 0 },
  followPath: { type: Boolean, default: false },
  depAirportLabel: { type: String, default: '' },
  arrAirportLabel: { type: String, default: '' },
  /** 旧 API：单 id，传入时自动转为 visibleRelationIdsLeft=[id]、visibleRelationIdsRight=[] */
  visibleRelationId: { type: String, default: null },
  visibleRelationIdsLeft: { type: Array, default: () => [] },
  visibleRelationIdsRight: { type: Array, default: () => [] },
  visibleUnitClusterIdsLeft: { type: Array, default: () => [] },
  visibleUnitClusterIdsRight: { type: Array, default: () => [] }
});

const effectiveIdsLeft = computed(() =>
  props.visibleRelationId != null ? [props.visibleRelationId] : (props.visibleRelationIdsLeft || [])
);
const effectiveIdsRight = computed(() =>
  props.visibleRelationId != null ? [] : (props.visibleRelationIdsRight || [])
);
const effectiveVisibleRelationId = computed(() => props.visibleRelationId);
/** 单屏：簇可见性经 activeUnitClusterIds（合并左右 prop） */
const effectiveActiveUnitClusterIds = computed(() => {
  const L = props.visibleUnitClusterIdsLeft || [];
  const R = props.visibleUnitClusterIdsRight || [];
  return [...new Set([...L, ...R].map(String).filter(Boolean))];
});

const vpSingleRef = (el) => {
  if (typeof props.bindVpSingle === 'function') props.bindVpSingle(el);
};
</script>
