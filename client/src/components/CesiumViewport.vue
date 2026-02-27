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
  splitPosition: { type: Number, default: 0.5 },
  pathPoints: { type: Array, default: null },
  pathProgress: { type: Number, default: 0 },
  followPath: { type: Boolean, default: false }
});

const container = ref(null);
const creditEl = ref(null);

let viewer = null;
let modelEntity = null;
let billboardEntity = null;
const DEFAULT_HEADING_OFFSET_RAD = Cesium.Math.PI_OVER_TWO; 
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

const buildSpline = (pts) => {
  const cps = (pts || []).map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt ?? 0));
  if (cps.length < 2) return null;
  const times = cps.map((_, i) => i);
  return new Cesium.CatmullRomSpline({ times, points: cps });
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const getPoseOnSpline = (spline, u) => {
  const maxT = spline.times[spline.times.length - 1];
  const t = clamp01(u) * maxT;
  const p = spline.evaluate(t);
  const dt = Math.min(0.02, 1 / Math.max(1, spline.times.length - 1));
  const p2 = spline.evaluate(Math.min(maxT, t + dt));

  const dirWC = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(p2, p, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(p);
  const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
  const dirLocal = Cesium.Cartesian3.normalize(
    Cesium.Matrix4.multiplyByPointAsVector(inv, dirWC, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const heading = Math.atan2(dirLocal.x, dirLocal.y);
  const horiz = Math.sqrt(dirLocal.x * dirLocal.x + dirLocal.y * dirLocal.y);
  const pitch = Math.atan2(dirLocal.z, horiz);
  const MODEL_HEADING_OFFSET = Cesium.Math.PI_OVER_TWO + Math.PI; // +90deg: fix glTF forward axis
  const headingFixed = heading + MODEL_HEADING_OFFSET;
  const q = Cesium.Transforms.headingPitchRollQuaternion(p, new Cesium.HeadingPitchRoll(headingFixed, pitch, 0));
  return { position: p, orientation: q };
};

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

  const spline = (props.followPath && props.pathPoints) ? buildSpline(props.pathPoints) : null;
  const basePosition = spline
    ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).position, false)
    : Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);

  const baseOrientation = spline
    ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).orientation, false)
    : undefined;

  const BILLBOARD_WORLD_OFFSET_M = 5;
  const billboardPosition = spline
    ? new Cesium.CallbackProperty(() => {
        const p = getPoseOnSpline(spline, props.pathProgress).position;
        const c0 = Cesium.Cartographic.fromCartesian(p);
        return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, (c0.height || 0) + BILLBOARD_WORLD_OFFSET_M);
      }, false)
    : (() => {
        const c0 = Cesium.Cartographic.fromCartesian(basePosition);
        return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, c0.height + BILLBOARD_WORLD_OFFSET_M);
      })();

  let initOrientation = baseOrientation;
  console.log('spline', spline);
  if (!spline) {
    const hpr = new Cesium.HeadingPitchRoll(DEFAULT_HEADING_OFFSET_RAD, 0, 0);
    initOrientation = Cesium.Transforms.headingPitchRollQuaternion(basePosition, hpr);
  }
  const planeEntity = viewer.entities.add({
    id: 'planeEntity',
    position: basePosition,
    orientation: initOrientation,
    model: {
      uri,
      scale: 1.0,
      shadows: Cesium.ShadowMode.DISABLED
    }
  });
  modelEntity = planeEntity;

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
      const focusPos = spline ? getPoseOnSpline(spline, props.pathProgress).position : basePosition;
      const transform = Cesium.Transforms.eastNorthUpToFixedFrame(focusPos);
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

const applyPathAnimation = (positionProp, opts = {}) => {
  if (!modelEntity) return;

  // 关闭动画
  if (!positionProp) {
    modelEntity.path = undefined;
    return;
  }

  const trailSeconds = opts.trailSeconds ?? 0.24;
  const billboardOffsetM = opts.billboardOffsetM ?? 2;
  const headingOffsetRad = 0; // 默认不额外偏置（需要时再加）

  // 1) 位置：直接用 path
  modelEntity.position = positionProp;

  // 2) 朝向：VelocityOrientationProperty + 固定 heading 偏置
  const velOri = new Cesium.VelocityOrientationProperty(positionProp);
  modelEntity.orientation = new Cesium.CallbackProperty((time, result) => {
    const q = velOri.getValue(time, new Cesium.Quaternion());
    if (!q) return q;
    const fix = Cesium.Quaternion.fromAxisAngle(
      Cesium.Cartesian3.UNIT_Z,
      headingOffsetRad,
      new Cesium.Quaternion()
    );
    return Cesium.Quaternion.multiply(q, fix, result || new Cesium.Quaternion());
  }, false);

  // 3) 尾迹
  modelEntity.path = new Cesium.PathGraphics({
    show: true,
    leadTime: 0,
    trailTime: trailSeconds,
    width: 3,
    material: Cesium.Color.CYAN.withAlpha(0.9),
    resolution: 1
  });

  // 4) billboard 跟随
  if (billboardEntity) {
    const offsetM = opts.billboardOffsetM ?? billboardOffsetM;
    billboardEntity.position = new Cesium.CallbackProperty((time) => {
      const p = positionProp.getValue(time);
      if (!p) return undefined;
      const c = Cesium.Cartographic.fromCartesian(p);
      return Cesium.Cartesian3.fromRadians(
        c.longitude,
        c.latitude,
        (c.height || 0) + offsetM
      );
    }, false);
  }
};

defineExpose({
  resize,
  requestRender,
  getViewer,
  setViewState,
  getViewState,
  getPlaneEntity: () => modelEntity,
  applyPathAnimation
});

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value, creditEl.value);

  const ctrl = viewer.scene?.screenSpaceCameraController;
  if (ctrl) ctrl.enableInputs = !props.readonly;

  if (props.splitMode) {
    viewer.scene.splitPosition = props.splitPosition;

    const spline = (props.followPath && props.pathPoints) ? buildSpline(props.pathPoints) : null;
    const basePosition = spline
      ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).position, false)
      : Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 2000);

    const baseOrientation = spline
      ? new Cesium.CallbackProperty(() => getPoseOnSpline(spline, props.pathProgress).orientation, false)
      : undefined;

    let initSplitOrientation = baseOrientation;
    if (!spline) {
      const hpr = new Cesium.HeadingPitchRoll(DEFAULT_HEADING_OFFSET_RAD, 0, 0);
      initSplitOrientation = Cesium.Transforms.headingPitchRollQuaternion(basePosition, hpr);
    }

    const BILLBOARD_WORLD_OFFSET_M = 5;
    const billboardPosition = spline
      ? new Cesium.CallbackProperty(() => {
          const p = getPoseOnSpline(spline, props.pathProgress).position;
          const c0 = Cesium.Cartographic.fromCartesian(p);
          return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, (c0.height || 0) + BILLBOARD_WORLD_OFFSET_M);
        }, false)
      : (() => {
          const c0 = Cesium.Cartographic.fromCartesian(basePosition);
          return Cesium.Cartesian3.fromRadians(c0.longitude, c0.latitude, c0.height + BILLBOARD_WORLD_OFFSET_M);
        })();

    viewer.entities.add({
      position: basePosition,
      orientation: initSplitOrientation,
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
      position: basePosition,
      orientation: initSplitOrientation,
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
          const focusPos = spline ? getPoseOnSpline(spline, props.pathProgress).position : basePosition;
          const transform = Cesium.Transforms.eastNorthUpToFixedFrame(focusPos);
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
