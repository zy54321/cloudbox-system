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
const unitBillboardImgUrl = new URL('../assets/img/planeBillBoardImg2.png', import.meta.url).href;

const emit = defineEmits(['marker-click', 'marker-move', 'marker-close', 'plane-screen-info']);

const props = defineProps({
  modelUrl: { type: String, default: '' },
  autoFocus: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  splitMode: { type: Boolean, default: false },
  leftModelUrl: { type: String, default: '' },
  rightModelUrl: { type: String, default: '' },
  splitPosition: { type: Number, default: 0.5 },
  /** PathPoint[]：{ lon, lat, alt, phase }，与画线/动画同源；起点/终点 alt 不覆写 */
  pathPoints: { type: Array, default: null },
  pathProgress: { type: Number, default: 0 },
  followPath: { type: Boolean, default: false },
  showClusterDepAirport: { type: Boolean, default: true },
  showClusterArrAirport: { type: Boolean, default: true }
});

const container = ref(null);
const creditEl = ref(null);

let viewer = null;
let modelEntity = null;
let billboardEntity = null;
let clickHandler = null;
let pickHandler = null;
let activeMarkerEntity = null;
const DEFAULT_HEADING_OFFSET_RAD = Cesium.Math.PI_OVER_TWO;
let winRafId = 0;

const UNIT_ENTITY_IDS = new Set();
const UNIT_ENTITY_CLUSTER = new Map();
const updateUnitEntitiesVisibility = () => {
  if (!viewer?.entities) return;
  UNIT_ENTITY_IDS.forEach((id) => {
    const e = viewer.entities.getById(id);
    const clusterId = UNIT_ENTITY_CLUSTER.get(id);
    if (!e || clusterId == null) return;
    if (clusterId === 'DEP_AIRPORT') e.show = props.showClusterDepAirport;
    else if (clusterId === 'ARR_AIRPORT') e.show = props.showClusterArrAirport;
  });
  viewer.scene.requestRender();
};

const loadAndAddUnits = async () => {
  if (!viewer?.entities) return;
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const res = await fetch(`${base}/config/units.json`);
    if (!res.ok) return;
    const data = await res.json();
    const imgUrl = unitBillboardImgUrl;

    const addBillboard = (unit, clusterId) => {
      const altM = unit.alt_m ?? 0;
      const e = viewer.entities.add({
        id: unit.id,
        position: Cesium.Cartesian3.fromDegrees(unit.lon, unit.lat, altM),
        billboard: {
          image: imgUrl,
          show: true,
          scale: 0.5,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: unit.name
          ? {
              text: unit.name,
              font: '14px sans-serif',
              show: true,
              showBackground: true,
              backgroundPadding: new Cesium.Cartesian2(6, 4),
              pixelOffset: new Cesium.Cartesian2(0, -28),
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, Number.POSITIVE_INFINITY),
              translucencyByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.0e9, 1.0),
              scaleByDistance: new Cesium.NearFarScalar(1.0, 1.0, 1.0e9, 1.0),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          : undefined
      });
      e.__meta = {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        lon: unit.lon,
        lat: unit.lat,
        alt_m: altM,
        clusterId: clusterId ?? null
      };
      UNIT_ENTITY_IDS.add(unit.id);
      if (clusterId) UNIT_ENTITY_CLUSTER.set(unit.id, clusterId);
    };

    const space = data.space;
    if (space?.star_based?.length) {
      space.star_based.forEach((u) => {
        addBillboard({ ...u, alt_m: u.alt_m ?? 0 }, null);
      });
    }

    const ground = data.ground;
    if (ground?.clusters?.length) {
      ground.clusters.forEach((cluster) => {
        const clusterId = cluster.clusterId;
        (cluster.units || []).forEach((u) => {
          addBillboard({ ...u, alt_m: 0 }, clusterId);
        });
      });
    }

    updateUnitEntitiesVisibility();
  } catch (e) {
    console.warn('[CesiumViewport] load units.json failed:', e);
  }
};

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
  if (!pts?.length) return null;
  const cps = pts.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt ?? 0));
  if (cps.length < 2) return null;
  const times = cps.map((_, i) => i);
  return new Cesium.CatmullRomSpline({ times, points: cps });
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const MODEL_HEADING_OFFSET = Cesium.Math.PI_OVER_TWO + Math.PI; // +90deg: fix glTF forward axis

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
  const headingFixed = heading + MODEL_HEADING_OFFSET;
  const q = Cesium.Transforms.headingPitchRollQuaternion(p, new Cesium.HeadingPitchRoll(headingFixed, pitch, 0));
  return { position: p, orientation: q };
};

const BILLBOARD_WORLD_OFFSET_M = 5;

/** 静态定位：按 pathPoints 下标设置飞机位姿，不启动任何动画；朝向与 getPoseOnSpline 一致 */
function setPlanePoseAtIndex(index) {
  const pathPoints = props.pathPoints;
  if (!viewer || !modelEntity || !Array.isArray(pathPoints) || pathPoints.length < 2) return;
  const i = Math.max(0, Math.min(index, pathPoints.length - 2));
  const pt = pathPoints[i];
  const pt2 = pathPoints[i + 1];
  const p = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt ?? 0);
  const p2 = Cesium.Cartesian3.fromDegrees(pt2.lon, pt2.lat, pt2.alt ?? 0);

  // 用 ConstantPositionProperty，避免直接赋 Cartesian3 后某些逻辑取不到 getValue
  modelEntity.position = new Cesium.ConstantPositionProperty(p);

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
  const headingFixed = heading + MODEL_HEADING_OFFSET;
  const q = Cesium.Transforms.headingPitchRollQuaternion(p, new Cesium.HeadingPitchRoll(headingFixed, pitch, 0));
  modelEntity.orientation = new Cesium.ConstantProperty(q);

  // billboard 跟随飞机：同步到同一点（带高度偏移）
  if (billboardEntity) {
    const c0 = Cesium.Cartographic.fromCartesian(p);
    const pBillboard = Cesium.Cartesian3.fromRadians(
      c0.longitude,
      c0.latitude,
      (c0.height ?? 0) + BILLBOARD_WORLD_OFFSET_M
    );
    billboardEntity.position = new Cesium.ConstantPositionProperty(pBillboard);
  }

  viewer.scene.requestRender();

  // 若启用跟随，相机重新锁定到飞机
  viewer.trackedEntity = modelEntity;
}

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

  // 尾迹线已取消，不再设置 modelEntity.path
  modelEntity.path = undefined;

  // 3) billboard 跟随
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

/** 获取飞机屏幕信息：位置(屏幕坐标)、经纬高、朝向、速度等，供 popup 使用 */
const getPlaneScreenInfo = () => {
  if (!viewer?.scene || !modelEntity) return null;
  const time = viewer.clock.currentTime;
  const cartesian = modelEntity.position?.getValue?.(time);
  if (!cartesian) return null;
  const scene = viewer.scene;
  const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, cartesian);
  if (!win) return null;
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);
  const alt = carto.height ?? 0;
  let heading = 0;
  const q = modelEntity.orientation?.getValue?.(time);
  if (q) {
    const m3 = Cesium.Matrix3.fromQuaternion(q);
    const forwardWC = Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(forwardWC, forwardWC);
    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian);
    const inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
    const forwardLocal = Cesium.Matrix4.multiplyByPointAsVector(inv, forwardWC, new Cesium.Cartesian3());
    heading = Cesium.Math.toDegrees(Math.atan2(forwardLocal.x, forwardLocal.y));
    if (heading < 0) heading += 360;
  }
  const cameraHeight = getCameraHeight();
  return {
    x: win.x,
    y: win.y,
    lon,
    lat,
    alt: Number.isFinite(alt) ? alt : 0,
    heading,
    speed: 450,
    cameraHeight: cameraHeight ?? 0
  };
};

/** 相机高度（米），用于缩放阈值 */
const getCameraHeight = () => {
  if (!viewer?.camera) return null;
  const cam = viewer.camera;
  const pos = cam.positionWC || cam.position;
  if (!pos) return null;
  const carto = Cesium.Cartographic.fromCartesian(pos);
  return carto.height;
};

defineExpose({
  resize,
  requestRender,
  getViewer,
  setViewState,
  getViewState,
  getPlaneEntity: () => modelEntity,
  applyPathAnimation,
  setPlanePoseAtIndex,
  getPlaneScreenInfo,
  getCameraHeight,
  clearActiveMarker: () => { activeMarkerEntity = null; }
});

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value, creditEl.value);

  const ctrl = viewer.scene?.screenSpaceCameraController;
  if (ctrl) ctrl.enableInputs = !props.readonly;

  // --- 地图点击拾取经纬度（控制台输出）---
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  clickHandler.setInputAction((movement) => {
    const scene = viewer.scene;
    const pos = movement.position;
    let cartesian = null;

    // 1) 优先使用 pickPosition（需要深度检测支持，3D Tiles/模型上也更准）
    if (scene.pickPositionSupported) {
      cartesian = scene.pickPosition(pos);
    }

    // 2) 回退：拾取地球椭球面（影像/地形场景也可用）
    if (!cartesian) {
      cartesian = viewer.camera.pickEllipsoid(pos, scene.globe.ellipsoid);
    }

    if (!cartesian) return;

    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const h = carto.height;

    console.log(`[Pick] lon=${lon.toFixed(6)}, lat=${lat.toFixed(6)}, h=${Number.isFinite(h) ? h.toFixed(2) : '0.00'}m`);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  await loadAndAddUnits();

  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  pickHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position);
    if (!Cesium.defined(picked) || !picked.id) return;
    const ent = picked.id;
    const meta = ent.__meta;
    if (!meta) return;
    activeMarkerEntity = ent;
    viewer.selectedEntity = undefined;
    const pos = ent.position?.getValue(viewer.clock.currentTime);
    const win = pos ? Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos) : null;
    emit('marker-click', { meta, screen: win ? { x: win.x, y: win.y } : null });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  const scratchCartesian2 = new Cesium.Cartesian2();
  viewer.scene.postRender.addEventListener(() => {
    if (!activeMarkerEntity) return;
    const pos = activeMarkerEntity.position?.getValue(viewer.clock.currentTime);
    if (!pos) return;
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos, scratchCartesian2);
    if (!win) return;
    emit('marker-move', { x: win.x, y: win.y });
  });

  // 每帧输出飞机屏幕坐标，供父组件飞机跟随 popup 使用，避免轮询延迟
  viewer.scene.postRender.addEventListener(() => {
    const info = getPlaneScreenInfo();
    if (info) emit('plane-screen-info', info);
  });

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

watch(
  () => [props.showClusterDepAirport, props.showClusterArrAirport],
  () => updateUnitEntitiesVisibility(),
  { deep: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  if (winRafId) {
    cancelAnimationFrame(winRafId);
    winRafId = 0;
  }
  clickHandler?.destroy();
  clickHandler = null;
  pickHandler?.destroy();
  pickHandler = null;
  if (viewer) {
    UNIT_ENTITY_IDS.forEach((id) => {
      try {
        viewer.entities.removeById(id);
      } catch (_) {}
    });
    UNIT_ENTITY_IDS.clear();
    UNIT_ENTITY_CLUSTER.clear();
    destroyCesiumViewer(viewer);
  }
  viewer = null;
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
