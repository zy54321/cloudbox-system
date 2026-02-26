<template>
  <div ref="container" class="cesium-container">
    <div ref="creditEl" class="cb-cesium-credit"></div>
  </div>
</template>

<script setup>
import { defineExpose, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as Cesium from 'cesium';
import { createCesiumViewer, destroyCesiumViewer } from '../engine/cesium/viewer';

const planeBillboardImgUrl = new URL('../assets/img/planeBillBoardImg.png', import.meta.url).href;

const props = defineProps({
  modelUrl: { type: String, default: '' },
  autoFocus: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  splitMode: { type: Boolean, default: false },
  leftModelUrl: { type: String, default: '' },
  rightModelUrl: { type: String, default: '' },
  splitPosition: { type: Number, default: 0.5 }
});

const container = ref(null);
const creditEl = ref(null);

let viewer = null;
let modelEntity = null;
let billboardEntity = null;
let winRafId = 0;

const onWindowResize = () => {
  if (viewer) {
    if (winRafId) cancelAnimationFrame(winRafId);
    winRafId = requestAnimationFrame(() => {
      winRafId = 0;
      viewer.resize();
      viewer.scene.requestRender();
    });
  }
};

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
  if (modelEntity) {
    try { viewer.entities.remove(modelEntity); } catch {}
    modelEntity = null;
  }
  if (billboardEntity) {
    try { viewer.entities.remove(billboardEntity); } catch {}
    billboardEntity = null;
  }

  const position = Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);
  const planeEntity = viewer.entities.add({
    position,
    model: {
      uri,
      scale: 1.0,
      shadows: Cesium.ShadowMode.DISABLED
    }
  });
  modelEntity = planeEntity;

  const BILLBOARD_WORLD_OFFSET_M = 5;
  const c0 = Cesium.Cartographic.fromCartesian(position);
  const billboardPosition = Cesium.Cartesian3.fromRadians(
    c0.longitude,
    c0.latitude,
    c0.height + BILLBOARD_WORLD_OFFSET_M
  );
  billboardEntity = viewer.entities.add({
    position: billboardPosition,
    billboard: {
      image: planeBillboardImgUrl,
      show: true,
      scale: 0.5,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM
    }
  });

  viewer.scene.requestRender?.();

  if (props.autoFocus) {
    try {
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
      const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
      viewer.camera.lookAtTransform(transform, offset);
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    } catch (e) {
      console.warn('[autoFocus lookAt] failed:', e);
    }
    viewer.scene.requestRender?.();
  }
  return planeEntity;
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

  const ctrl = viewer.scene?.screenSpaceCameraController;
  if (ctrl) ctrl.enableInputs = !props.readonly;

  if (props.splitMode) {
    viewer.scene.splitPosition = props.splitPosition;

    const position = Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);
    const BILLBOARD_WORLD_OFFSET_M = 5;
    const c0 = Cesium.Cartographic.fromCartesian(position);
    const billboardPosition = Cesium.Cartesian3.fromRadians(
      c0.longitude,
      c0.latitude,
      c0.height + BILLBOARD_WORLD_OFFSET_M
    );

    viewer.entities.add({
      position,
      model: {
        uri: props.leftModelUrl,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });
    viewer.entities.add({
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.LEFT
    });

    viewer.entities.add({
      position,
      model: {
        uri: props.rightModelUrl,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      },
      splitDirection: Cesium.SplitDirection.RIGHT
    });
    viewer.entities.add({
      position: billboardPosition,
      billboard: {
        image: planeBillboardImgUrl,
        show: true,
        scale: 0.5,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      },
      splitDirection: Cesium.SplitDirection.RIGHT
    });

    viewer.scene.requestRender();
    window.addEventListener('resize', onWindowResize, { passive: true });
    requestAnimationFrame(() => {
      if (!viewer) return;
      viewer.resize();
      if (props.autoFocus) {
        try {
          const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
          const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
          viewer.camera.lookAtTransform(transform, offset);
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        } catch (e) {
          console.warn('[autoFocus lookAt] failed:', e);
        }
      }
      viewer.scene.requestRender();
    });
    return;
  }

  if (props.modelUrl) {
    await loadGlbModelEntity(props.modelUrl);
  }

  window.addEventListener('resize', onWindowResize, { passive: true });
  requestAnimationFrame(() => {
    if (!viewer) return;
    viewer.resize();
    viewer.scene.requestRender();
  });
});

watch(() => props.modelUrl, async (v) => {
  if (viewer && v) await loadGlbModelEntity(v);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  if (winRafId) {
    cancelAnimationFrame(winRafId);
    winRafId = 0;
  }
  if (viewer) destroyCesiumViewer(viewer);
  viewer = null;
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
