<template>
  <div ref="container" class="cesium-container">
    <div ref="creditEl" class="cb-cesium-credit"></div>
  </div>
</template>

<script setup>
import { defineExpose, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { createCesiumViewer, destroyCesiumViewer } from '../engine/cesium/viewer';

const props = defineProps({
  modelUrl: { type: String, default: '' },
  autoFocus: { type: Boolean, default: false }
});

const container = ref(null);
const creditEl = ref(null);
let viewer = null;
let resizeObserver = null;
let modelEntity = null;

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

const loadGlbModelEntity = async (uri) => {
  if (!viewer || !uri) return;
  const Cesium = await import('cesium');
  // Clean previous entity model before reloading.
  if (modelEntity) {
    try { viewer.entities.remove(modelEntity); } catch {}
    modelEntity = null;
  }

  const position = Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);
  modelEntity = viewer.entities.add({
    position,
    name: 'boeing_737',
    model: {
      uri,
      scale: 1.0,
      minimumPixelSize: 64
    }
  });

  viewer.scene.requestRender?.();

  if (props.autoFocus) {
    try {
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
      const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
      viewer.camera.lookAtTransform(transform, offset);
    } catch (e) {
      console.warn('[autoFocus lookAt] failed:', e);
    }
    viewer.scene.requestRender?.();
  }
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
  if (props.modelUrl) {
    await loadGlbModelEntity(props.modelUrl);
  }

  resizeObserver = new ResizeObserver(() => {
    resize();
    requestRender();
  });
  resizeObserver.observe(container.value);
});

watch(() => props.modelUrl, async (v) => {
  if (viewer && v) await loadGlbModelEntity(v);
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
