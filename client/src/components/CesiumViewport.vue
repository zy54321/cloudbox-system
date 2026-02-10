<template>
  <div ref="container" class="cesium-container">
    <div ref="creditEl" class="cb-cesium-credit"></div>
  </div>
</template>

<script setup>
import { defineExpose, onMounted, onBeforeUnmount, ref } from 'vue';
import { createCesiumViewer, destroyCesiumViewer } from '../engine/cesium/viewer';

const container = ref(null);
const creditEl = ref(null);
let viewer = null;
let resizeObserver = null;

const resize = () => {
  viewer?.resize?.();
};

const requestRender = () => {
  viewer?.scene?.requestRender?.();
};

const getViewer = () => viewer;

const getViewState = () => {
  if (!viewer?.camera) return null;
  const camera = viewer.camera;
  return {
    position: camera.positionWC?.clone?.() || camera.position?.clone?.() || null,
    heading: camera.heading,
    pitch: camera.pitch,
    roll: camera.roll
  };
};

const setViewState = (state) => {
  if (!viewer?.camera || !state?.position) return;
  viewer.camera.setView({
    destination: state.position,
    orientation: {
      heading: state.heading ?? viewer.camera.heading,
      pitch: state.pitch ?? viewer.camera.pitch,
      roll: state.roll ?? viewer.camera.roll
    }
  });
};

defineExpose({
  resize,
  requestRender,
  getViewer,
  setViewState,
  getViewState
});

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value, creditEl.value);
  resizeObserver = new ResizeObserver(() => {
    resize();
    requestRender();
  });
  resizeObserver.observe(container.value);
});

onBeforeUnmount(() => {
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
  }
  resizeObserver = null;
  if (viewer) destroyCesiumViewer(viewer);
});
</script>

<style scoped>
.cesium-container{width:100%;height:100%;}
</style>
