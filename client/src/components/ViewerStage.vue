<template>
  <section class="cb-card cb-main cb-dv-main cb-dv-main-shell">
    <slot name="header" />

    <div class="cb-dv-main-stage">
      <div class="cb-viewport" :class="{ 'cb-viewport--split': isCompare }">
        <div
          v-if="!isCompare && useSingleIframe && singleIframeBridge"
          class="cb-viewport--single cb-viewer-single cb-viewport--single-iframe"
        >
          <SingleIframeStage :bridge="singleIframeBridge">
            <template #left-overlay>
              <slot name="single-iframe-left-overlay" />
            </template>
          </SingleIframeStage>
        </div>

        <div
          v-else-if="!isCompare && !useSingleIframe"
          class="cb-viewport--single cb-viewer-single"
        >
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
            :skip-relation-node-focus="skipRelationNodeFocus"
            @marker-click="$emit('marker-click', $event)"
            @marker-move="$emit('marker-move', $event)"
            @marker-close="$emit('marker-close')"
            @plane-screen-info="$emit('plane-screen-info', $event)"
            @plane-billboard-click="$emit('plane-billboard-click', $event)"
          />
          <slot name="single-overlays" />
        </div>

        <div v-if="isCompare" class="cb-viewer-split cb-viewer-split--iframe-absolute">
          <div class="cb-viewport cb-viewport--split-full cb-viewport--iframe-split-host">
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
 * 单屏：SingleIframeStage（scene-left）或 CesiumViewport。双屏：CompareIframeStage。
 */
import { computed } from 'vue';
import CesiumViewport from './CesiumViewport.vue';
import CompareIframeStage from './CompareIframeStage.vue';
import SingleIframeStage from './SingleIframeStage.vue';

const props = defineProps({
  isCompare: { type: Boolean, required: true },
  /** 为 true 时单屏用 scene-left iframe，不再内嵌 CesiumViewport */
  useSingleIframe: { type: Boolean, default: false },
  /** 单屏 iframe 用桥；与 compareBridge 互斥挂载 */
  singleIframeBridge: { type: Object, default: null },
  compareBridge: { type: Object, default: null },
  bindVpSingle: { type: Function, default: () => {} },
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
  visibleRelationId: { type: String, default: null },
  visibleRelationIdsLeft: { type: Array, default: () => [] },
  visibleRelationIdsRight: { type: Array, default: () => [] },
  visibleUnitClusterIdsLeft: { type: Array, default: () => [] },
  visibleUnitClusterIdsRight: { type: Array, default: () => [] },
  skipRelationNodeFocus: { type: Boolean, default: false }
});

const effectiveIdsLeft = computed(() =>
  props.visibleRelationId != null ? [props.visibleRelationId] : (props.visibleRelationIdsLeft || [])
);
const effectiveIdsRight = computed(() =>
  props.visibleRelationId != null ? [] : (props.visibleRelationIdsRight || [])
);
const effectiveVisibleRelationId = computed(() => props.visibleRelationId);
const effectiveActiveUnitClusterIds = computed(() => {
  const L = props.visibleUnitClusterIdsLeft || [];
  const R = props.visibleUnitClusterIdsRight || [];
  return [...new Set([...L, ...R].map(String).filter(Boolean))];
});

const vpSingleRef = (el) => {
  if (props.useSingleIframe) return;
  if (typeof props.bindVpSingle === 'function') props.bindVpSingle(el);
};
</script>
