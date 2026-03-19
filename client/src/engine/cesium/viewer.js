import * as CesiumModule from 'cesium';

// Cesium 初始化封装（子路径部署版）
export async function createCesiumViewer(el, creditContainer) {
  if (typeof window.CESIUM_BASE_URL === 'undefined') {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.CESIUM_BASE_URL = base ? `${base}/cesium/` : '/cesium/';
  }

  const Cesium =
    (typeof window !== 'undefined' && window.Cesium)
      ? window.Cesium
      : CesiumModule;

  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  }

  const viewer = new Cesium.Viewer(el, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    navigationHelpButton: false,
    homeButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    infoBox: false,
    geocoder: false,
    terrainShadows: Cesium.ShadowMode.DISABLED,
    shadows: false,
    requestRenderMode: true,
    logo: false,
    creditContainer: creditContainer || undefined,
    maximumRenderTimeChange: Infinity,
    targetFrameRate: 60,
    depthTest: true,
    fxaa: true
  });

  viewer.scene.shadowMap.enabled = false;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0.0
    }
  });

  return viewer;
}

export function destroyCesiumViewer(viewer) {
  try {
    viewer?.destroy?.();
  } catch {
    // ignore
  }
}