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
            :auto-focus="autoFocus"
            :split-mode="false"
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
import CesiumViewport from './CesiumViewport.vue';

const props = defineProps({
  isCompare: { type: Boolean, required: true },
  bindVpSingle: { type: Function, required: true },
  bindVpCompare: { type: Function, required: true },
  modelUrl: { type: String, default: '' },
  leftModelUrl: { type: String, default: '' },
  rightModelUrl: { type: String, default: '' },
  splitPosition: { type: Number, default: 0.5 },
  readonly: { type: Boolean, default: false },
  autoFocus: { type: Boolean, default: true }
});

const vpSingleRef = (el) => {
  if (typeof props.bindVpSingle === 'function') props.bindVpSingle(el);
};
const vpCompareRef = (el) => {
  if (typeof props.bindVpCompare === 'function') props.bindVpCompare(el);
};
</script>
