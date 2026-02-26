// Cesium 1.137.0 初始化封装（最小可运行）
// 注意：Cesium 静态资源需设置 CESIUM_BASE_URL（否则控件/worker/资源可能404）
// TODO: 将 Cesium 资源拷贝到 public/cesium，并设置 window.CESIUM_BASE_URL='/cesium/'

export async function createCesiumViewer(el, creditContainer) {
  // 必须在 Viewer 创建前设置（资源/Workers/JSON 依赖此路径）
  if (typeof window.CESIUM_BASE_URL === 'undefined') {
    window.CESIUM_BASE_URL = '/cesium/';
  }

  const Cesium = await import('cesium');

  // 禁用 Ion 默认远程资源
  // Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNDc0ZWJmMC00NTgwLTRmNWMtODYwYS1kZjhhNGU4N2I1MWIiLCJpZCI6MTY4MTMsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzEyMTI5NTN9.7bkpJJq93yhGx6e8iukZBiO5Sg-JvVah9sMC2BHOifA';

  const viewer = new Cesium.Viewer(el, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    navigationHelpButton: false,
    homeButton: false,
    sceneModePicker: false,
    geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
    terrainShadows: Cesium.ShadowMode.DISABLED,
    shadows: false,
    requestRenderMode: true,
    // 搜索关闭
    geocoder: false,
    // logo关闭
    logo: false,
    creditContainer: creditContainer || undefined,
    maximumRenderTimeChange: Infinity,
    targetFrameRate: 60,
    depthTest: true,
    // 启用抗锯齿
    fxaa: true,
  });

  viewer.scene.shadowMap.enabled = false;

  // 设置相机初始位置（北京）
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
