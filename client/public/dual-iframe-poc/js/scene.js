/**
 * 双 iframe 静态子页：PoC 场景 + compareFrameProtocol（与 Vue 主应用 postMessage）
 *
 * Stage-E1 / E1-Refine：B 文字牌 canvas 与 CesiumViewport 对齐；C narrative 聚焦距离减半。
 * Stage-E2：场景时间 1:1 真实秒；飞机路径时间单独映射。
 * Stage-E3：三段式路径映射；叙事相机 flyToBoundingSphere；手动 scrub 仅定位+链路+回 home 视角。
 * Stage-E4：state.currentTime 为 demo time；关键点/链路与 raw 语义秒比较时经 demoToSemanticAfterBase；航迹巡航段用语义推进；与父页 SEMANTIC_TIME_COMPRESS 一致。
 */
(function () {
  var COMPARE_CHANNEL = 'CLOUDBOX_COMPARE';
  var COMPARE_VERSION = 2;
  var MSG_READY = 'READY';
  var MSG_SIDE_STATE = 'SIDE_STATE';
  var MSG_LOAD_SCENARIO = 'LOAD_SCENARIO';
  var MSG_PLAY = 'PLAY';
  var MSG_PAUSE = 'PAUSE';
  var MSG_RESET = 'RESET';
  var MSG_SCRUB = 'SCRUB';
  var MSG_SET_ACTIVE_RELATIONS = 'SET_ACTIVE_RELATIONS';
  var MSG_CLEAR_ACTIVE_MARKER = 'CLEAR_ACTIVE_MARKER';
  var MSG_RUN_NARRATIVE = 'RUN_NARRATIVE';
  var MSG_NARRATIVE_DONE = 'NARRATIVE_DONE';
  var MSG_FOCUS_UNIT = 'FOCUS_UNIT';

  var params = new URLSearchParams(window.location.search);
  var frameIdFromUrl = String(params.get('frameId') || '');

  var scenarioName = document.body.getAttribute('data-scenario');
  var scenario = window.MockScenarioData && window.MockScenarioData[scenarioName];

  if (!window.Cesium || !scenario) {
    console.error('[dual-iframe-poc] Cesium or scenario data is missing.');
    return;
  }

  var compareSide = scenario.name === 'right' ? 'right' : 'left';

  var ionTok ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NWJhNGM0NC1jNWI1LTQ4OGItYWJmMS0yMmE1NjNmNmM2NWEiLCJpZCI6MTY4MTMsImlhdCI6MTc3MzM2NjQyMn0.do-dqwJ5RUbAK0Z6WyvKLKkSwzBEPFpB5CQRo7H0Slc';
  if (ionTok) {
    Cesium.Ion.defaultAccessToken = ionTok;
  }

  var viewerOptions = {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    shouldAnimate: false
  };

  var viewer = new Cesium.Viewer('cesium-container', viewerOptions);

  // 双屏子页：隐藏底部 Cesium logo / 数据归属等标识（与主应用单屏策略一致）
  var _creditEl = viewer.cesiumWidget && viewer.cesiumWidget.creditContainer;
  if (_creditEl) {
    _creditEl.style.display = 'none';
  }

  /** 父页收到 LOAD_SCENARIO 后停止重复发 READY，避免与 registerWindow 时序问题 */
  var parentLoadScenarioReceived = false;
  var readyRepeatTimeoutIds = [];
  function clearReadyRepeatTimeouts() {
    readyRepeatTimeoutIds.forEach(function (id) {
      clearTimeout(id);
    });
    readyRepeatTimeoutIds = [];
  }

  /** 与 CesiumViewport.vue 单屏一致：日光、雾、模型 environmentMap 亮度 */
  var SCENE_LIGHT_INTENSITY = 3.4;
  var MODEL_ENV_BRIGHTNESS = 30.35;
  var MODEL_ENV_ATMOSPHERE_SCATTER = 3.1;
  var FOG_MIN_BRIGHTNESS = 0.18;
  var DEFAULT_DAYLIGHT_TIME_UTC = '2026-04-04T04:00:00Z';

  var _pendingBrightnessBoosts = {};
  var _brightnessBoostAttached = false;

  function applySceneBrightnessBoost() {
    if (!viewer || !viewer.scene) return;
    try {
      viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(DEFAULT_DAYLIGHT_TIME_UTC);
    } catch (e) {}
    viewer.scene.light = new Cesium.SunLight({
      color: Cesium.Color.WHITE,
      intensity: SCENE_LIGHT_INTENSITY
    });
    if (viewer.scene.atmosphere) {
      viewer.scene.atmosphere.dynamicLighting = Cesium.DynamicAtmosphereLightingType.SUNLIGHT;
    }
    if (viewer.scene.fog) {
      viewer.scene.fog.minimumBrightness = Math.max(viewer.scene.fog.minimumBrightness || 0, FOG_MIN_BRIGHTNESS);
    }
    viewer.scene.requestRender();
  }

  function findModelForEntity(primitives, entity) {
    if (!primitives || typeof primitives.length !== 'number') return null;
    var i;
    for (i = 0; i < primitives.length; i++) {
      var p = primitives.get(i);
      if (!p) continue;
      if (p.environmentMapManager && p.id === entity) return p;
      if (typeof p.get === 'function' && p.length > 0) {
        var nested = findModelForEntity(p, entity);
        if (nested) return nested;
      }
    }
    return null;
  }

  function boostModelBrightness(runtimeModel) {
    if (!runtimeModel) return;
    try {
      runtimeModel.color = undefined;
      runtimeModel.colorBlendMode = undefined;
      runtimeModel.colorBlendAmount = undefined;
      if (runtimeModel.environmentMapManager) {
        runtimeModel.environmentMapManager.brightness = MODEL_ENV_BRIGHTNESS;
        runtimeModel.environmentMapManager.atmosphereScatteringIntensity = MODEL_ENV_ATMOSPHERE_SCATTER;
      }
    } catch (e) {}
  }

  function processPendingBrightnessBoosts() {
    if (!viewer || !viewer.scene) {
      return;
    }
    var keys = Object.keys(_pendingBrightnessBoosts);
    if (keys.length === 0) {
      if (_brightnessBoostAttached && viewer.scene.postRender) {
        try {
          viewer.scene.postRender.removeEventListener(processPendingBrightnessBoosts);
        } catch (e2) {}
        _brightnessBoostAttached = false;
      }
      return;
    }
    var toDelete = [];
    var ki;
    for (ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      var task = _pendingBrightnessBoosts[key];
      if (!task || !task.entity) {
        toDelete.push(key);
        continue;
      }
      var runtimeModel = findModelForEntity(viewer.scene.primitives, task.entity);
      if (runtimeModel) {
        boostModelBrightness(runtimeModel);
        task.holdFrames -= 1;
        if (task.holdFrames <= 0) {
          toDelete.push(key);
        }
        continue;
      }
      task.attempts += 1;
      if (task.attempts >= task.maxAttempts) {
        toDelete.push(key);
      }
    }
    for (ki = 0; ki < toDelete.length; ki++) {
      delete _pendingBrightnessBoosts[toDelete[ki]];
    }
    if (Object.keys(_pendingBrightnessBoosts).length === 0 && _brightnessBoostAttached && viewer.scene.postRender) {
      try {
        viewer.scene.postRender.removeEventListener(processPendingBrightnessBoosts);
      } catch (e3) {}
      _brightnessBoostAttached = false;
    }
  }

  function queueBrightnessBoost(entity, opts) {
    opts = opts || {};
    if (!viewer || !viewer.scene || !viewer.scene.postRender || !entity) return;
    var key = entity.id || Cesium.createGuid();
    _pendingBrightnessBoosts[key] = {
      entity: entity,
      attempts: 0,
      maxAttempts: opts.maxAttempts != null ? opts.maxAttempts : 600,
      holdFrames: opts.holdFrames != null ? opts.holdFrames : 90
    };
    if (_brightnessBoostAttached) return;
    viewer.scene.postRender.addEventListener(processPendingBrightnessBoosts);
    _brightnessBoostAttached = true;
  }

  function detachBrightnessBoostListener() {
    if (!_brightnessBoostAttached || !viewer || !viewer.scene || !viewer.scene.postRender) return;
    try {
      viewer.scene.postRender.removeEventListener(processPendingBrightnessBoosts);
    } catch (e4) {}
    _brightnessBoostAttached = false;
    _pendingBrightnessBoosts = {};
  }

  applySceneBrightnessBoost();

  var parentTimelineMax = scenario.duration;

  var state = {
    playing: false,
    currentTime: 0,
    duration: scenario.duration,
    triggeredKeyframes: {}
  };

  viewer.clock.shouldAnimate = false;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  /** 避免仅 requestRender 时漏帧导致链路不刷新；与单屏连续渲染一致 */
  viewer.scene.requestRenderMode = false;
  /** 对数深度与空中折线 + 每帧跟飞相机组合时，易出现折线被错误裁剪；与单屏常见配置对齐 */
  try {
    viewer.scene.logarithmicDepthBuffer = false;
  } catch (eLDB) {}

  var pointEntitiesById = {};
  var pointDataById = {};
  var linkEntities = [];
  /** 与单屏一致的航路插值样本：{ t, position: { lon, lat, height } } */
  var flightPathSamples = [];
  var externalScenarioActive = false;
  var routeEntity = null;
  var planeBillboardEntity = null;
  /** 点状飞机模式下的名称 text billboard（与 aircraft 分离） */
  var aircraftTextEntity = null;
  var engineUnitEntities = {};
  var engineLinkEdges = [];
  var engineRelations = [];
  var scenarioStepRows = [];
  /** 叙事起点：统一时间轴上 T 时刻（秒），T+0.0 = narrativeT0 + 0 */
  var narrativeT0 = 10;
  /** 与 DynamicFlow.vue 一致：双屏全节点 t_yes/t_no 的最大 raw，用于处置段与 phase B 航迹比例 */
  var maxSemanticRaw = 100;
  /** demo 时间：处置段结束 = narrativeT0 + maxSemanticRaw/SEMANTIC_TIME_COMPRESS；之后 10s 飞至终点 */
  var tDisposalEndDemo = 10;
  /** 与 DynamicFlow.vue semanticToDemoT(maxRaw)+10 一致；样条总时长 D 的末段留作「进近至终点」 */
  var PATH_FINAL_LEG_FRACTION = 0.08;
  /** 与 DynamicFlow.vue SEMANTIC_TIME_COMPRESS 一致：语义秒 ↔ demo 秒 */
  var SEMANTIC_TIME_COMPRESS = 10;
  var narrativeBusy = false;
  /** compare 父页裁决 narrative 时，子页 playLoop 不自触发；由父页 RUN_NARRATIVE */
  var parentControlsNarrative = false;
  /** 当前 narrative 对应 scenarioStepRows 下标，用于 NARRATIVE_DONE */
  var currentNarrativeStepIndex = null;
  /** 关键时间点进入叙事暂停后，叙事正常结束时是否应自动恢复本地播放（仅 parentControlsNarrative=false；父页裁决时始终 false） */
  var narrativeResumePending = false;
  var narrativeActiveRelationOverride = null;
  var firedNarrativeSteps = Object.create(null);
  var narrativeFlightTimeoutId = 0;
  var narrativeFlashIntervalId = 0;
  var narrativeIntroTimeoutId = 0;
  /** 与父页 CRUISE_PATH_PROGRESS 一致：叙事起点时刻飞机应到达的航迹弧长进度 u∈(0,1] */
  var cruisePathProgressU = 0.55;
  var ROUTE_ENTITY_ID = 'poc-flight-route-xa-bj';
  /** 与 CesiumViewport.vue 中 MODEL_HEADING_OFFSET 一致：修正 glTF 前向轴 */
  var MODEL_HEADING_OFFSET = Cesium.Math.PI_OVER_TWO + Cesium.Math.PI;
  /** 与飞机同链路「plane」邻接的单元：机载标点，位置绑定机体坐标偏移 */
  var planeAttachedLocalOffsets = {};

  /** 视觉型快速爬升段时长（场景秒）；不做真实气动计算 */
  var INTRO_CLIMB_SCENE_SECONDS = 8;
  /** 爬升结束 → 叙事起点（narrativeT0）之间的过渡段时长（场景秒） */
  var PRE_NARRATIVE_CRUISE_SECONDS = 2;
  /**
   * 叙事起点之后沿航迹样本的匀速系数（仅 path 时间；不改变 state.currentTime / 叙事触发 / 父页 timelineT）。
   * 沿用 E2 慢速档 0.75，不再额外调慢。
   */
  var POST_CLIMB_PLANE_SPEED_RATE = 0.75;
  /** B：标点 / 文字底板与单屏 CesiumViewport 对齐（集中常量，禁止散落魔法数） */
  var ICON_DEFAULT_SCALE = 0.5;
  var PLANE_ICON_PIXEL_OFFSET_Y = -8;
  var TEXT_FONT_SIZE = 14;
  var TEXT_FONT_WEIGHT = 600;
  var TEXT_FONT_FAMILY = '"Source Han Sans CN", "Source Han Sans", "Microsoft YaHei", sans-serif';
  /** 与 CesiumViewport.vue buildUnitTextBillboardImage 逐值一致 */
  var UNIT_TEXT_PANEL_FILL = 'rgba(14, 44, 123, 0.58)';
  var UNIT_TEXT_BORDER_STROKE = 'rgba(42, 116, 201, 0.55)';
  var UNIT_TEXT_GLOW_STROKE = 'rgba(0, 204, 255, 0.42)';
  var UNIT_TEXT_GLOW_LINE_WIDTH = 2.2;
  var UNIT_TEXT_FILL = 'rgba(235, 248, 255, 0.98)';
  var TEXT_PADDING_X = 10;
  var TEXT_PADDING_Y = 6;
  var TEXT_RADIUS = 10;
  var UNIT_LABEL_FADE_START_POC = 60000;
  var UNIT_LABEL_HIDE_DISTANCE_POC = 90000;
  var UNIT_LABEL_MIN_SCALE_POC = 0.75;
  var POC_TEXT_BILLBOARD_CACHE = {};

  function roundedRectPoc(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /**
   * 与 CesiumViewport.vue buildUnitTextBillboardImage 同一套 canvas 逻辑（底板→边框→glow strokeText→fillText）。
   * buildTextBillboardImagePoc / buildUnitTextBillboardImagePoc 仅别名，视觉无分叉。
   */
  function buildPocTextBillboardCanvas(text) {
    var key = String(text || '').trim();
    if (!key) return null;
    if (POC_TEXT_BILLBOARD_CACHE[key]) return POC_TEXT_BILLBOARD_CACHE[key];

    var dpr = Math.max(1, Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    var fontSize = TEXT_FONT_SIZE;
    var padX = TEXT_PADDING_X;
    var padY = TEXT_PADDING_Y;
    var radius = TEXT_RADIUS;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = TEXT_FONT_WEIGHT + ' ' + fontSize + 'px ' + TEXT_FONT_FAMILY;
    var metrics = ctx.measureText(key);
    var textWidth = Math.ceil(metrics.width);
    var width = textWidth + padX * 2;
    var height = fontSize + padY * 2 + 2;

    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.font = TEXT_FONT_WEIGHT + ' ' + fontSize + 'px ' + TEXT_FONT_FAMILY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    roundedRectPoc(ctx, 0.5, 0.5, width - 1, height - 1, radius);
    ctx.fillStyle = UNIT_TEXT_PANEL_FILL;
    ctx.fill();
    ctx.strokeStyle = UNIT_TEXT_BORDER_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.strokeStyle = UNIT_TEXT_GLOW_STROKE;
    ctx.lineWidth = UNIT_TEXT_GLOW_LINE_WIDTH;
    ctx.strokeText(key, width / 2, height / 2 + 0.5);

    ctx.fillStyle = UNIT_TEXT_FILL;
    ctx.fillText(key, width / 2, height / 2 + 0.5);

    var result = { image: canvas, width: width, height: height };
    POC_TEXT_BILLBOARD_CACHE[key] = result;
    return result;
  }

  function buildTextBillboardImagePoc(text) {
    return buildPocTextBillboardCanvas(text);
  }

  function buildUnitTextBillboardImagePoc(text) {
    return buildPocTextBillboardCanvas(text);
  }

  /** 与 CesiumViewport addBillboard：offsetX=offset[0]??0，offsetY=(offset[1]??-28)+25 */
  function getTextBillboardPixelOffsetFromUnitOffset(offset) {
    var o = offset;
    var ox = o && o[0] != null ? Number(o[0]) : 0;
    var oy = (o && o[1] != null ? Number(o[1]) : -28) + 25;
    return new Cesium.Cartesian2(ox, oy);
  }

  var keyframeEntries = Object.keys(scenario.keyframes)
    .map(function (key) {
      return {
        id: key,
        time: scenario.keyframes[key].time,
        camera: scenario.keyframes[key].camera
      };
    })
    .sort(function (a, b) {
      return a.time - b.time;
    });

  function getAppPublicBase() {
    return window.location.pathname.replace(/dual-iframe-poc\/[^/]+$/, '');
  }

  function resolvePublicUrl(relPath) {
    if (!relPath) return '';
    var s = String(relPath);
    if (/^https?:\/\//i.test(s)) return s;
    var base = getAppPublicBase().replace(/\/?$/, '/');
    return window.location.origin + base + s.replace(/^\//, '');
  }

  function samplesFromMockAirplane() {
    return scenario.airplane.path.map(function (pt) {
      return { t: pt.t, position: pt.position };
    });
  }

  /**
   * 与 flightPath.ts buildSampledPositionFromPath 一致：按航段累计距离分配时间 t∈[0,duration]
   */
  function buildSamplesFromPathPoints(pts, durationSec) {
    var n = pts.length;
    if (n < 2) return samplesFromMockAirplane();
    var d = Math.max(Number(durationSec) || 0, 1e-6);
    var positions = [];
    for (var pi = 0; pi < n; pi++) {
      var p0 = pts[pi];
      positions.push(
        Cesium.Cartesian3.fromDegrees(Number(p0.lon), Number(p0.lat), p0.alt != null ? Number(p0.alt) : 0)
      );
    }
    var cumDist = [0];
    for (var j = 1; j < n; j++) {
      cumDist[j] = cumDist[j - 1] + Cesium.Cartesian3.distance(positions[j - 1], positions[j]);
    }
    var totalDist = cumDist[n - 1] || 1;
    var out = [];
    for (var k = 0; k < n; k++) {
      var t = (cumDist[k] / totalDist) * d;
      var p = pts[k];
      out.push({
        t: t,
        position: {
          lon: Number(p.lon),
          lat: Number(p.lat),
          height: p.alt != null ? Number(p.alt) : 0
        }
      });
    }
    return out;
  }

  function ensureFlowMaterials() {
    var cache = Cesium.Material._materialCache;
    if (!cache.getMaterial('PocDashFlow')) {
      cache.addMaterial('PocDashFlow', {
        fabric: {
          type: 'PocDashFlow',
          uniforms: {
            color: new Cesium.Color(0.35, 0.88, 1.0, 0.95),
            time: 0.0
          },
          source:
            'czm_material czm_getMaterial(czm_materialInput materialInput){\n' +
            '  czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '  vec2 st = materialInput.st;\n' +
            '  float t = fract(st.s * 4.0 - time);\n' +
            '  float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));\n' +
            '  material.diffuse = color.rgb;\n' +
            '  material.alpha = a * color.a;\n' +
            '  return material;\n' +
            '}'
        },
        translucent: function () {
          return true;
        }
      });
    }
    if (!cache.getMaterial('PocArrowFlow')) {
      cache.addMaterial('PocArrowFlow', {
        fabric: {
          type: 'PocArrowFlow',
          uniforms: {
            color: new Cesium.Color(0.35, 0.88, 1.0, 0.95),
            time: 0.0
          },
          source:
            'czm_material czm_getMaterial(czm_materialInput materialInput){\n' +
            '  czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '  vec2 st = materialInput.st;\n' +
            '  float d = abs(st.t - 0.5) * 2.0;\n' +
            '  float s = fract(st.s * 4.0 - time);\n' +
            '  float head = step(d, (1.0 - s) * 2.0) * step(0.5, s);\n' +
            '  float body = step(d, 0.2) * step(s, 0.5);\n' +
            '  float shape = clamp(head + body, 0.0, 1.0);\n' +
            '  material.diffuse = color.rgb;\n' +
            '  material.alpha = shape * color.a;\n' +
            '  return material;\n' +
            '}'
        },
        translucent: function () {
          return true;
        }
      });
    }
  }

  function FlowLinkMaterialProperty(flowLabel) {
    this._definitionChanged = new Cesium.Event();
    this._startMs = Date.now();
    this._arrow = String(flowLabel || '').toUpperCase() === 'CTRL' || String(flowLabel || '') === '控制流';
  }
  Object.defineProperty(FlowLinkMaterialProperty.prototype, 'isConstant', { get: function () { return false; } });
  Object.defineProperty(FlowLinkMaterialProperty.prototype, 'definitionChanged', {
    get: function () { return this._definitionChanged; }
  });
  FlowLinkMaterialProperty.prototype.getType = function () {
    ensureFlowMaterials();
    return this._arrow ? 'PocArrowFlow' : 'PocDashFlow';
  };
  FlowLinkMaterialProperty.prototype.getValue = function (time, result) {
    if (!result) result = {};
    result.time = ((Date.now() - this._startMs) / 1000) * 1.5;
    return result;
  };
  FlowLinkMaterialProperty.prototype.equals = function (other) {
    return this === other;
  };

  function computeArcPositions(start, end, numPoints, arcHeightRatio) {
    var n = numPoints != null ? numPoints : 24;
    var ratio = arcHeightRatio != null ? arcHeightRatio : 0.15;
    var distance = Cesium.Cartesian3.distance(start, end);
    var mid = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
    var midNorm = Cesium.Cartesian3.normalize(mid, new Cesium.Cartesian3());
    var lift = distance * ratio;
    var control = Cesium.Cartesian3.add(
      mid,
      Cesium.Cartesian3.multiplyByScalar(midNorm, lift, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    var points = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var t1 = 1 - t;
      var a = Cesium.Cartesian3.multiplyByScalar(start, t1 * t1, new Cesium.Cartesian3());
      var b = Cesium.Cartesian3.multiplyByScalar(control, 2 * t1 * t, new Cesium.Cartesian3());
      var c = Cesium.Cartesian3.multiplyByScalar(end, t * t, new Cesium.Cartesian3());
      points.push(
        Cesium.Cartesian3.add(Cesium.Cartesian3.add(a, b, new Cesium.Cartesian3()), c, new Cesium.Cartesian3())
      );
    }
    return points;
  }

  flightPathSamples = samplesFromMockAirplane();

  var isDisposed = false;
  var playRaf = 0;
  var lastPlayMs = 0;
  var _sideStateThrottle = 0;
  var _lastSideStatePost = 0;

  function toCartesian(position) {
    return Cesium.Cartesian3.fromDegrees(position.lon, position.lat, position.height || 0);
  }

  function lerp(start, end, ratio) {
    return start + (end - start) * ratio;
  }

  function clampTime(timeSeconds) {
    return Math.max(0, Math.min(timeSeconds, state.duration));
  }

  function parentTToLocal(tParent) {
    var tm = Math.max(parentTimelineMax, 1e-6);
    return clampTime((Number(tParent) / tm) * state.duration);
  }

  function localTimeToParentT(localT) {
    var tm = Math.max(parentTimelineMax, 1e-6);
    return (clampTime(localT) / Math.max(state.duration, 1e-6)) * tm;
  }

  /** demo 时间（秒）→ 叙事起点之后的语义秒（与 steps 中 raw t 同语义） */
  function demoToSemanticAfterBase(demoT) {
    return Math.max(0, (demoT - narrativeT0) * SEMANTIC_TIME_COMPRESS);
  }

  /** 叙事起点之后的语义秒 → demo 时间 */
  function semanticAfterBaseToDemoT(semanticAfterBase) {
    return narrativeT0 + Number(semanticAfterBase) / SEMANTIC_TIME_COMPRESS;
  }

  /**
   * demo 时间 → 航迹弧长参数：与播放时间线性一致（由 state.currentTime 驱动），不再做分段语义映射。
   */
  function planePathTimeFromDemoTime(timeSeconds) {
    return clampTime(timeSeconds);
  }

  function getInterpolatedAircraftPosition(timeSeconds) {
    var path = flightPathSamples;
    if (!path || path.length === 0) {
      return scenario.airplane.path[0].position;
    }
    var ts = planePathTimeFromDemoTime(timeSeconds);
    if (ts <= path[0].t) {
      return path[0].position;
    }

    for (var index = 0; index < path.length - 1; index += 1) {
      var current = path[index];
      var next = path[index + 1];
      if (ts <= next.t) {
        var span = next.t - current.t;
        var ratio = span === 0 ? 0 : (ts - current.t) / span;
        return {
          lon: lerp(current.position.lon, next.position.lon, ratio),
          lat: lerp(current.position.lat, next.position.lat, ratio),
          height: lerp(current.position.height, next.position.height, ratio)
        };
      }
    }

    return path[path.length - 1].position;
  }

  /**
   * 与 CesiumViewport.vue setPlanePoseAtIndex 一致：用航线切向（含俯仰）+ MODEL_HEADING_OFFSET
   */
  function computePlaneOrientationQuat(timeSeconds) {
    var t0 = clampTime(timeSeconds);
    var dt = 0.12;
    var t1 = Math.min(t0 + dt, state.duration);
    var p0 = getInterpolatedAircraftPosition(t0);
    var p1 = getInterpolatedAircraftPosition(t1);
    if (t1 - t0 < 1e-8) {
      t1 = t0;
      t0 = Math.max(0, t0 - dt);
      p0 = getInterpolatedAircraftPosition(t0);
      p1 = getInterpolatedAircraftPosition(t1);
    }
    var c0 = toCartesian(p0);
    var c1 = toCartesian(p1);
    var dir = Cesium.Cartesian3.subtract(c1, c0, new Cesium.Cartesian3());
    if (Cesium.Cartesian3.magnitude(dir) < 1e-4) {
      return Cesium.Transforms.headingPitchRollQuaternion(c0, new Cesium.HeadingPitchRoll(0, 0, 0));
    }
    Cesium.Cartesian3.normalize(dir, dir);
    var enu = Cesium.Transforms.eastNorthUpToFixedFrame(c0);
    var inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
    var dirLocal = Cesium.Cartesian3.normalize(
      Cesium.Matrix4.multiplyByPointAsVector(inv, dir, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    var heading = Math.atan2(dirLocal.x, dirLocal.y);
    var horiz = Math.sqrt(dirLocal.x * dirLocal.x + dirLocal.y * dirLocal.y);
    var pitch = Math.atan2(dirLocal.z, horiz);
    var headingFixed = heading + MODEL_HEADING_OFFSET;
    return Cesium.Transforms.headingPitchRollQuaternion(
      c0,
      new Cesium.HeadingPitchRoll(headingFixed, pitch, 0)
    );
  }

  function isVisible(item, timeSeconds) {
    return timeSeconds >= item.visibleFrom && timeSeconds <= item.visibleTo;
  }

  var aircraftUsesModel = false;

  function removeEntityById(id) {
    var e = viewer.entities.getById(id);
    if (e) {
      viewer.entities.remove(e);
    }
  }

  function clearMockPointsAndLinks() {
    scenario.points.forEach(function (pd) {
      var e = pointEntitiesById[pd.id];
      if (e) {
        viewer.entities.remove(e);
      }
      var te = pointEntitiesById[pd.id + '__text'];
      if (te) {
        viewer.entities.remove(te);
      }
      delete pointEntitiesById[pd.id];
      delete pointEntitiesById[pd.id + '__text'];
      delete pointDataById[pd.id];
    });
    linkEntities.forEach(function (le) {
      viewer.entities.remove(le.entity);
    });
    linkEntities.length = 0;
  }

  function clearEngineOverlays() {
    clearAircraftNarrativeDim();
    Object.keys(engineUnitEntities).forEach(function (k) {
      var e = engineUnitEntities[k];
      if (e) viewer.entities.remove(e);
    });
    engineUnitEntities = {};
    planeAttachedLocalOffsets = {};
    engineLinkEdges.forEach(function (x) {
      if (x.entity) viewer.entities.remove(x.entity);
    });
    engineLinkEdges = [];
    engineRelations = [];
  }

  /**
   * 与 plane 直接相连的单元视为机载；另外「发动机」链上的下一跳（如机载感知预警系统）
   * 在 links 里只连 yes-engine、不连 plane，需一并算机体跟随。
   * 不对 no-crew 做同类扩展，否则会错误把塔台等地面节点绑到飞机上。
   */
  function collectPlaneLinkedUnitIds(relations) {
    var set = {};
    (relations || []).forEach(function (rel) {
      (rel.edges || []).forEach(function (pair) {
        if (!pair || pair.length < 2) return;
        var a = String(pair[0]);
        var b = String(pair[1]);
        if (a === 'plane') set[b] = true;
        else if (b === 'plane') set[a] = true;
      });
    });
    if (set['yes-engine']) {
      (relations || []).forEach(function (rel) {
        (rel.edges || []).forEach(function (pair) {
          if (!pair || pair.length < 2) return;
          var x = String(pair[0]);
          var y = String(pair[1]);
          if (x === 'yes-engine' && y !== 'plane') set[y] = true;
          if (y === 'yes-engine' && x !== 'plane') set[x] = true;
        });
      });
    }
    return set;
  }

  function resolvePlaneAttachedWorldPosition(unitId, initialCartesian, time, result) {
    var planePos;
    var planeOrientationQuat;
    if (externalScenarioActive && aircraftUsesModel) {
      planePos = toCartesian(getInterpolatedAircraftPosition(state.currentTime));
      planeOrientationQuat = computePlaneOrientationQuat(state.currentTime);
    } else if (aircraftEntity && aircraftEntity.position && aircraftEntity.orientation) {
      var evalTime = time || viewer.clock.currentTime;
      planePos = aircraftEntity.position.getValue(evalTime);
      planeOrientationQuat = aircraftEntity.orientation.getValue(evalTime);
    } else {
      return Cesium.Cartesian3.clone(initialCartesian, result || new Cesium.Cartesian3());
    }
    if (!planePos || !planeOrientationQuat) {
      return Cesium.Cartesian3.clone(initialCartesian, result || new Cesium.Cartesian3());
    }
    var localOff = planeAttachedLocalOffsets[unitId];
    if (!localOff) {
      var diff = Cesium.Cartesian3.subtract(initialCartesian, planePos, new Cesium.Cartesian3());
      var rot = Cesium.Matrix3.fromQuaternion(planeOrientationQuat, new Cesium.Matrix3());
      var invRot = Cesium.Matrix3.transpose(rot, new Cesium.Matrix3());
      localOff = Cesium.Matrix3.multiplyByVector(invRot, diff, new Cesium.Cartesian3());
      planeAttachedLocalOffsets[unitId] = localOff;
    }
    var rotNow = Cesium.Matrix3.fromQuaternion(planeOrientationQuat, new Cesium.Matrix3());
    var worldOff = Cesium.Matrix3.multiplyByVector(rotNow, localOff, new Cesium.Cartesian3());
    return Cesium.Cartesian3.add(planePos, worldOff, result || new Cesium.Cartesian3());
  }

  function removeRouteEntity() {
    removeEntityById(ROUTE_ENTITY_ID);
    routeEntity = null;
  }

  function addRoutePolyline(pathPoints) {
    removeRouteEntity();
    var positions = pathPoints.map(function (p) {
      return Cesium.Cartesian3.fromDegrees(Number(p.lon), Number(p.lat), p.alt != null ? Number(p.alt) : 0);
    });
    routeEntity = viewer.entities.add({
      id: ROUTE_ENTITY_ID,
      polyline: {
        positions: positions,
        width: 3,
        clampToGround: false,
        material: new Cesium.Color(0.35, 0.9, 1.0, 0.92)
      }
    });
  }

  function buildPointAircraftEntity() {
    aircraftUsesModel = false;
    removeEntityById('aircraft__text');
    aircraftTextEntity = null;
    removeEntityById('aircraft');
    var startPos = toCartesian(scenario.airplane.path[0].position);
    var main = viewer.entities.add({
      id: 'aircraft',
      position: startPos,
      billboard: {
        image: resolvePublicUrl('img/planeBillBoardImg2.png'),
        scale: ICON_DEFAULT_SCALE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, PLANE_ICON_PIXEL_OFFSET_Y),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      path: {
        positions: flightPathSamples.map(function (s) {
          return toCartesian(s.position);
        }),
        resolution: 1,
        material: Cesium.Color.fromCssColorString(scenario.airplane.color).withAlpha(0.35),
        width: 3
      }
    });
    aircraftEntity = main;
    var tb = buildTextBillboardImagePoc(scenario.airplane.label || '');
    var textOffAc = getTextBillboardPixelOffsetFromUnitOffset(scenario.airplane && scenario.airplane.offset);
    if (tb) {
      aircraftTextEntity = viewer.entities.add({
        id: 'aircraft__text',
        position: startPos,
        billboard: {
          image: tb.image,
          width: tb.width,
          height: tb.height,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: textOffAc,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    }
    return main;
  }

  function buildModelAircraftAndBillboard(modelUri) {
    removeEntityById('aircraft');
    removeEntityById('aircraft__text');
    aircraftTextEntity = null;
    if (planeBillboardEntity) {
      viewer.entities.remove(planeBillboardEntity);
      planeBillboardEntity = null;
    }
    aircraftUsesModel = true;
    var startPos = getInterpolatedAircraftPosition(0);
    aircraftEntity = viewer.entities.add({
      id: 'aircraft',
      position: toCartesian(startPos),
      orientation: computePlaneOrientationQuat(0),
      model: {
        uri: modelUri,
        scale: 1.0,
        shadows: Cesium.ShadowMode.DISABLED
      }
    });
    queueBrightnessBoost(aircraftEntity);
    planeBillboardEntity = viewer.entities.add({
      id: 'plane-billboard-poc',
      position: toCartesian(startPos),
      billboard: {
        image: resolvePublicUrl('img/planeBillBoardImg2.png'),
        scale: ICON_DEFAULT_SCALE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, PLANE_ICON_PIXEL_OFFSET_Y),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    return aircraftEntity;
  }

  function buildPointEntity(pointData) {
    pointDataById[pointData.id] = pointData;
    var pos = toCartesian(pointData.position);
    var img = pointData.image ? resolvePublicUrl(pointData.image) : resolvePublicUrl('img/planeBillBoardImg.png');
    var iconEnt = viewer.entities.add({
      id: pointData.id,
      position: pos,
      show: false,
      billboard: {
        image: img,
        scale: ICON_DEFAULT_SCALE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, PLANE_ICON_PIXEL_OFFSET_Y),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    var tb = buildTextBillboardImagePoc(pointData.label || '');
    var textOffPt = getTextBillboardPixelOffsetFromUnitOffset(pointData.offset);
    if (tb) {
      var textEnt = viewer.entities.add({
        id: pointData.id + '__text',
        position: pos,
        show: false,
        billboard: {
          image: tb.image,
          width: tb.width,
          height: tb.height,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: textOffPt,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      pointEntitiesById[pointData.id + '__text'] = textEnt;
    }
    pointEntitiesById[pointData.id] = iconEnt;
    return iconEnt;
  }

  function buildLinkEntity(linkData) {
    var entity = viewer.entities.add({
      id: linkData.id,
      show: false,
      polyline: {
        positions: [],
        width: 3,
        material: Cesium.Color.fromCssColorString(linkData.color)
      }
    });

    linkEntities.push({
      data: linkData,
      entity: entity
    });
    return entity;
  }

  // 启动时不再显示任何 PoC mock 圆点（按需求删除测试圆点）
  var aircraftEntity = viewer.entities.add({
    id: 'aircraft',
    show: false,
    position: toCartesian(scenario.airplane.path[0].position)
  });

  /**
   * 叙事期飞机 glTF 半透明：与 CesiumViewport.vue applyPlaneDimHighlightVisual / clearPlaneHighlightVisual 一致
   * （WHITE.withAlpha(0.4)、ColorBlendMode.MIX、colorBlendAmount 0.35）
   */
  function applyAircraftNarrativeDim() {
    if (!aircraftEntity || !aircraftEntity.model) return;
    try {
      aircraftEntity.model.color = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.4));
      aircraftEntity.model.colorBlendMode = new Cesium.ConstantProperty(Cesium.ColorBlendMode.MIX);
      aircraftEntity.model.colorBlendAmount = new Cesium.ConstantProperty(0.35);
    } catch (eDim) {}
    if (viewer && viewer.scene) viewer.scene.requestRender();
  }

  function clearAircraftNarrativeDim() {
    if (!aircraftEntity || !aircraftEntity.model) return;
    try {
      aircraftEntity.model.color = undefined;
      aircraftEntity.model.colorBlendMode = undefined;
      aircraftEntity.model.colorBlendAmount = undefined;
    } catch (eClr) {}
    if (viewer && viewer.scene) viewer.scene.requestRender();
  }

  function getUnitEntityPosition(entity) {
    if (!entity || !entity.position) return null;
    try {
      if (typeof entity.position.getValue === 'function') {
        var jd = viewer.clock && viewer.clock.currentTime;
        var p = jd ? entity.position.getValue(jd) : null;
        if (!p) p = entity.position.getValue(Cesium.JulianDate.now());
        return p;
      }
      return entity.position;
    } catch (_) {
      return null;
    }
  }

  function getActiveRelationIdsAtTime(localTimeSec) {
    if (narrativeActiveRelationOverride) {
      return narrativeActiveRelationOverride.slice();
    }
    if (!scenarioStepRows.length) return [];
    /** base 前：避免 demoToSemanticAfterBase(0)=0 命中 rawT=0 的首条关键点，出现「未开播先亮 10+0.0s 链路」 */
    if (externalScenarioActive && localTimeSec < narrativeT0 - 1e-6) {
      return [];
    }
    var tKey = compareSide === 'right' ? 't_no' : 't_yes';
    var relKey = compareSide === 'right' ? 'activeRelations_no' : 'activeRelations_yes';
    var sem = externalScenarioActive ? demoToSemanticAfterBase(localTimeSec) : localTimeSec;
    var current = null;
    for (var i = 0; i < scenarioStepRows.length; i++) {
      var row = scenarioStepRows[i];
      var rawT = Number(row[tKey]);
      if (!isFinite(rawT)) continue;
      var ok = externalScenarioActive ? rawT <= sem + 1e-6 : rawT <= localTimeSec + 1e-6;
      if (ok) {
        current = row;
      } else {
        break;
      }
    }
    var rels = (current && current[relKey]) || [];
    return Array.isArray(rels) ? rels.map(String) : [];
  }

  function cancelNarrativeTimers() {
    if (narrativeFlightTimeoutId) {
      clearTimeout(narrativeFlightTimeoutId);
      narrativeFlightTimeoutId = 0;
    }
    if (narrativeIntroTimeoutId) {
      clearTimeout(narrativeIntroTimeoutId);
      narrativeIntroTimeoutId = 0;
    }
    if (narrativeFlashIntervalId) {
      clearInterval(narrativeFlashIntervalId);
      narrativeFlashIntervalId = 0;
    }
  }

  function cancelNarrativeSequence() {
    cancelNarrativeTimers();
    clearAircraftNarrativeDim();
    narrativeBusy = false;
    currentNarrativeStepIndex = null;
    narrativeResumePending = false;
    narrativeActiveRelationOverride = null;
    Object.keys(engineUnitEntities).forEach(function (k) {
      if (k.indexOf('__') >= 0) return;
      var e = engineUnitEntities[k];
      if (!e) return;
      try {
        if (e.billboard) e.billboard.show = true;
        var te = engineUnitEntities[k + '__text'];
        if (te && te.billboard) te.billboard.show = true;
      } catch (e2) {}
    });
  }

  function buildNarrativeNodeOrder(relIds) {
    var seq = [];
    (relIds || []).forEach(function (rid) {
      var rel = null;
      var ri;
      for (ri = 0; ri < engineRelations.length; ri++) {
        if (String(engineRelations[ri].id) === String(rid)) {
          rel = engineRelations[ri];
          break;
        }
      }
      if (!rel) return;
      rel.edges.forEach(function (edge) {
        [edge.fromId, edge.toId].forEach(function (id) {
          id = String(id);
          if (id === 'plane') return;
          if (seq.indexOf(id) === -1) seq.push(id);
        });
      });
    });
    return seq;
  }

  function narrativeFlyToUnit(unitId, onDone) {
    if (narrativeFlightTimeoutId) {
      clearTimeout(narrativeFlightTimeoutId);
      narrativeFlightTimeoutId = 0;
    }
    if (!viewer || viewer.isDestroyed()) {
      onDone && onDone();
      return;
    }
    var c3 = null;
    if (String(unitId) === 'plane') {
      c3 = toCartesian(getInterpolatedAircraftPosition(state.currentTime));
    } else {
      var ent = engineUnitEntities[unitId];
      var gp = ent ? getUnitEntityPosition(ent) : null;
      if (gp) c3 = Cesium.Cartesian3.clone(gp);
    }
    if (!c3) {
      onDone && onDone();
      return;
    }
    try {
      viewer.trackedEntity = undefined;
    } catch (eTr2) {}
    /** C：关键时间点节点聚焦（仅 narrativeFlyToUnit；不改 chase / home / keyframe） */
    var offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-32), 28);
    var sphere = new Cesium.BoundingSphere(c3, 1);
    narrativeFlightTimeoutId = 0;
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 0.85,
      offset: offset,
      complete: function () {
        onDone && onDone();
      },
      cancel: function () {
        onDone && onDone();
      }
    });
  }

  function flashBillboardLabelThrice(unitId, onDone) {
    if (narrativeFlashIntervalId) {
      clearInterval(narrativeFlashIntervalId);
      narrativeFlashIntervalId = 0;
    }
    var ent = engineUnitEntities[unitId];
    var textEnt = engineUnitEntities[unitId + '__text'];
    if (!ent || !ent.billboard) {
      onDone && onDone();
      return;
    }
    var count = 0;
    narrativeFlashIntervalId = setInterval(function () {
      var on = (count % 2) === 0;
      try {
        ent.billboard.show = on;
        if (textEnt && textEnt.billboard) textEnt.billboard.show = on;
      } catch (e) {}
      count++;
      if (count >= 6) {
        clearInterval(narrativeFlashIntervalId);
        narrativeFlashIntervalId = 0;
        try {
          ent.billboard.show = true;
          if (textEnt && textEnt.billboard) textEnt.billboard.show = true;
        } catch (e2) {}
        if (viewer && viewer.scene) viewer.scene.requestRender();
        onDone && onDone();
      } else if (viewer && viewer.scene) viewer.scene.requestRender();
    }, 200);
  }

  /**
   * 关键时间点：先真实暂停播放循环，再进入叙事（不再靠 narrativeBusy 在 playLoop 中空转「伪暂停」）。
   */
  function enterNarrativePauseForStep(stepRow) {
    if (!externalScenarioActive || !viewer || viewer.isDestroyed()) return;
    setPlaying(false);
    stopPlayLoop();
    narrativeBusy = true;
    narrativeResumePending = !parentControlsNarrative;
    var relKey = compareSide === 'right' ? 'activeRelations_no' : 'activeRelations_yes';
    var relIds = stepRow[relKey] || [];
    narrativeActiveRelationOverride = Array.isArray(relIds) ? relIds.map(String) : [];
    updateSceneForTime(state.currentTime);
    applyAircraftNarrativeDim();
    if (viewer.scene) viewer.scene.requestRender();
    postSideStateThrottled();
    runNarrativeSequence();
  }

  /**
   * 在 narrativeBusy + override 已就绪且场景已 update 后，启动节点聚焦/闪烁序列。
   */
  function runNarrativeSequence() {
    var nodes = buildNarrativeNodeOrder(narrativeActiveRelationOverride);

    function finishNarrative() {
      cancelNarrativeTimers();
      clearAircraftNarrativeDim();
      narrativeActiveRelationOverride = null;
      narrativeBusy = false;
      var doneIdx = currentNarrativeStepIndex;
      var pendingLocalResume = !parentControlsNarrative && narrativeResumePending;
      currentNarrativeStepIndex = null;
      narrativeResumePending = false;
      updateSceneForTime(state.currentTime);
      if (viewer.scene) viewer.scene.requestRender();
      postSideStateThrottled();
      if (parentControlsNarrative) {
        if (doneIdx != null && isFinite(doneIdx)) {
          postToParent(MSG_NARRATIVE_DONE, { stepIndex: doneIdx });
        }
      } else if (pendingLocalResume) {
        setPlaying(true);
        lastPlayMs = 0;
        playRaf = requestAnimationFrame(playLoop);
      }
    }

    function afterAllNodes(nodeIdx) {
      if (nodeIdx >= nodes.length) {
        if (narrativeFlightTimeoutId) {
          clearTimeout(narrativeFlightTimeoutId);
          narrativeFlightTimeoutId = 0;
        }
        updateSceneForTime(state.currentTime);
        if (viewer && viewer.scene) viewer.scene.requestRender();
        /** 不强制叙事尾帧 lookAt 跟飞，避免与 finish 后时间轴/下一帧跟飞叠跳；父页裁决时由 playLoop+update 自然跟随机位 */
        finishNarrative();
        return;
      }
      updateSceneForTime(state.currentTime);
      if (viewer.scene) viewer.scene.requestRender();
      narrativeFlyToUnit(nodes[nodeIdx], function () {
        flashBillboardLabelThrice(nodes[nodeIdx], function () {
          var hasNext = nodeIdx + 1 < nodes.length;
          if (hasNext) {
            setTimeout(function () {
              afterAllNodes(nodeIdx + 1);
            }, 1000);
          } else {
            afterAllNodes(nodeIdx + 1);
          }
        });
      });
    }

    if (narrativeIntroTimeoutId) {
      clearTimeout(narrativeIntroTimeoutId);
      narrativeIntroTimeoutId = 0;
    }
    narrativeIntroTimeoutId = setTimeout(function () {
      narrativeIntroTimeoutId = 0;
      afterAllNodes(0);
    }, 350);
  }

  function updateEngineLinkPositions(aircraftPositionObj) {
    var activeSet = new Set(getActiveRelationIdsAtTime(state.currentTime));
    engineRelations.forEach(function (rel) {
      var relationVisible = activeSet.has(String(rel.id));
      rel.edges.forEach(function (edge) {
        if (!relationVisible) {
          edge.entity.show = false;
          return;
        }
        var a =
          edge.fromId === 'plane'
            ? toCartesian(aircraftPositionObj)
            : getUnitEntityPosition(engineUnitEntities[edge.fromId]);
        var b =
          edge.toId === 'plane'
            ? toCartesian(aircraftPositionObj)
            : getUnitEntityPosition(engineUnitEntities[edge.toId]);
        if (!a || !b) {
          edge.entity.show = false;
          return;
        }
        edge.entity.polyline.positions = computeArcPositions(a, b, 24, 0.12);
        edge.entity.show = true;
        try {
          edge.entity.polyline.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        } catch (e0) {}
      });
    });
  }

  function fetchEngineData(payload) {
    if (!payload.unitsUrl || !payload.linksUrl) {
      return Promise.resolve();
    }
    var clusterId = compareSide === 'right' ? 'DYN_NO' : 'DYN_YES';
    var mergeUrl = payload.staticGroundMergeUrl || '';
    var fetches = [fetch(payload.unitsUrl), fetch(payload.linksUrl)];
    if (mergeUrl) fetches.push(fetch(mergeUrl));
    return Promise.all(fetches)
      .then(function (rs) {
        var pUnits = rs[0].json();
        var pLinks = rs[1].json();
        var pStatic =
          mergeUrl && rs[2] && rs[2].ok ? rs[2].json() : Promise.resolve(null);
        return Promise.all([pUnits, pLinks, pStatic]);
      })
      .then(function (docs) {
        var unitsDoc = docs[0];
        var linksDoc = docs[1];
        var staticDoc = docs[2];
        clearEngineOverlays();
        var clusters = (unitsDoc.ground && unitsDoc.ground.clusters) || [];
        var cluster = null;
        for (var ci = 0; ci < clusters.length; ci++) {
          if (clusters[ci].clusterId === clusterId) {
            cluster = clusters[ci];
            break;
          }
        }
        var planeLinked = collectPlaneLinkedUnitIds(linksDoc.relations || []);
        var baseUnits = (cluster && cluster.units) || [];
        function groundNameKeyPoc(n) {
          return String(n || '').trim();
        }
        var staticByName = {};
        if (staticDoc) {
          var sClusters0 = (staticDoc.ground && staticDoc.ground.clusters) || [];
          for (var si0 = 0; si0 < sClusters0.length; si0++) {
            var suArr0 = sClusters0[si0].units || [];
            for (var sj0 = 0; sj0 < suArr0.length; sj0++) {
              var su0 = suArr0[sj0];
              var nk0 = groundNameKeyPoc(su0.name);
              if (nk0 && !staticByName[nk0]) staticByName[nk0] = su0;
            }
          }
        }
        function mergeUnitWithStaticByNamePoc(u) {
          var s = staticByName[groundNameKeyPoc(u.name)];
          if (!s) return u;
          var o = Object.assign({}, s, { id: u.id });
          if (u.attachToPlane != null) o.attachToPlane = u.attachToPlane;
          return o;
        }
        var dynamicNames = {};
        for (var di = 0; di < baseUnits.length; di++) {
          var nkDyn = groundNameKeyPoc(baseUnits[di].name);
          if (nkDyn) dynamicNames[nkDyn] = true;
        }
        var mergedBase = baseUnits.map(function (u) {
          return mergeUnitWithStaticByNamePoc(u);
        });

        function addEngineGroundUnit(u) {
          var isPlaneAttached =
            !!planeLinked[u.id] ||
            u.attachToPlane === true ||
            String(u.attachToPlane || '').toLowerCase() === 'true';
          var initialCartesian = Cesium.Cartesian3.fromDegrees(
            Number(u.lon),
            Number(u.lat),
            u.alt != null ? Number(u.alt) : 0
          );
          var offsetX = u.offset && u.offset[0] != null ? Number(u.offset[0]) : 0;
          var offsetY = (u.offset && u.offset[1] != null ? Number(u.offset[1]) : -28) + 25;
          var position = isPlaneAttached
            ? new Cesium.CallbackProperty(
                (function (uid, init) {
                  return function (t, res) {
                    return resolvePlaneAttachedWorldPosition(uid, init, t, res);
                  };
                })(u.id, initialCartesian),
                false
              )
            : initialCartesian;
          var planeOriCb = isPlaneAttached
            ? new Cesium.CallbackProperty(function (time, result) {
                if (externalScenarioActive && aircraftUsesModel) {
                  var q = computePlaneOrientationQuat(state.currentTime);
                  return result ? Cesium.Quaternion.clone(q, result) : q;
                }
                if (!aircraftEntity || !aircraftEntity.orientation) return undefined;
                return aircraftEntity.orientation.getValue(time, result || new Cesium.Quaternion());
              }, false)
            : undefined;
          var scale =
            u.scale != null
              ? Number(u.scale)
              : u.size != null
                ? Number(u.size)
                : ICON_DEFAULT_SCALE;
          var ent = viewer.entities.add({
            id: 'unit-' + u.id,
            position: position,
            billboard: {
              image: resolvePublicUrl(u.image || 'img/planeBillBoardImg.png'),
              scale: scale,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: isPlaneAttached ? new Cesium.Cartesian2(0, PLANE_ICON_PIXEL_OFFSET_Y) : Cesium.Cartesian2.ZERO,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          });
          engineUnitEntities[u.id] = ent;
          var tex = buildUnitTextBillboardImagePoc(String(u.name || u.id));
          if (tex) {
            var textEnt = viewer.entities.add({
              id: 'unit-' + u.id + '__text',
              position: position,
              billboard: {
                image: tex.image,
                width: tex.width,
                height: tex.height,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(offsetX, offsetY),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, UNIT_LABEL_HIDE_DISTANCE_POC),
                translucencyByDistance: new Cesium.NearFarScalar(
                  UNIT_LABEL_FADE_START_POC,
                  1.0,
                  UNIT_LABEL_HIDE_DISTANCE_POC,
                  0.0
                ),
                scaleByDistance: new Cesium.NearFarScalar(1000.0, 1.0, UNIT_LABEL_HIDE_DISTANCE_POC, UNIT_LABEL_MIN_SCALE_POC),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            });
            engineUnitEntities[u.id + '__text'] = textEnt;
          }
          if (isPlaneAttached) {
            var cubeEnt = viewer.entities.add({
              id: 'unit-' + u.id + '__cube',
              position: position,
              orientation: planeOriCb,
              box: {
                dimensions: new Cesium.Cartesian3(0.5, 0.5, 0.5),
                material: Cesium.Color.CYAN.withAlpha(0.95),
                outline: true,
                outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
                outlineWidth: 1
              }
            });
            engineUnitEntities[u.id + '__cube'] = cubeEnt;
          }
        }

        mergedBase.forEach(addEngineGroundUnit);
        if (staticDoc) {
          var extraNameSeen = {};
          var sClustersX = (staticDoc.ground && staticDoc.ground.clusters) || [];
          for (var six = 0; six < sClustersX.length; six++) {
            var suArrX = sClustersX[six].units || [];
            for (var sjx = 0; sjx < suArrX.length; sjx++) {
              var suX = suArrX[sjx];
              var nkX = groundNameKeyPoc(suX.name);
              if (!nkX || dynamicNames[nkX] || extraNameSeen[nkX]) continue;
              extraNameSeen[nkX] = true;
              addEngineGroundUnit(suX);
            }
          }
        }

        var relations = linksDoc.relations || [];
        engineRelations = [];
        relations.forEach(function (rel) {
          var relId = String(rel.id || '');
          if (!relId) return;
          var edges = [];
          (rel.edges || []).forEach(function (pair) {
            if (!pair || pair.length < 2) return;
            var a = String(pair[0]);
            var b = String(pair[1]);
            var ok = false;
            if (a === 'plane' || b === 'plane') ok = true;
            else if (clusterId === 'DYN_YES' && (a.indexOf('yes-') === 0 || b.indexOf('yes-') === 0))
              ok = true;
            else if (clusterId === 'DYN_NO' && (a.indexOf('no-') === 0 || b.indexOf('no-') === 0)) ok = true;
            if (!ok) return;
            var entLink = viewer.entities.add({
              show: false,
              polyline: {
                width: 3,
                material: new FlowLinkMaterialProperty(rel.flowLabel),
                positions: [],
                arcType: Cesium.ArcType.NONE,
                clampToGround: false,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            });
            var e = { fromId: a, toId: b, entity: entLink };
            edges.push(e);
            engineLinkEdges.push(e);
          });
          if (edges.length) engineRelations.push({ id: relId, edges: edges });
        });
        updateSceneForTime(state.currentTime);
        viewer.scene.requestRender();
      });
  }

  function applyExternalScenario(payload) {
    if (!payload || !payload.pathPoints || payload.pathPoints.length < 2) {
      return;
    }
    if (payload.narrativeT0 != null) {
      var nt = Number(payload.narrativeT0);
      if (isFinite(nt)) narrativeT0 = nt;
    }
    if (payload.maxSemanticRaw != null) {
      var mr = Number(payload.maxSemanticRaw);
      if (isFinite(mr) && mr >= 0) maxSemanticRaw = Math.max(mr, 1e-6);
    }
    tDisposalEndDemo = narrativeT0 + maxSemanticRaw / SEMANTIC_TIME_COMPRESS;
    if (payload.tDisposalEnd != null) {
      var te = Number(payload.tDisposalEnd);
      if (isFinite(te)) tDisposalEndDemo = te;
    }
    if (payload.pathFinalLegFraction != null) {
      var pf = Number(payload.pathFinalLegFraction);
      if (isFinite(pf) && pf > 0.02 && pf < 0.5) PATH_FINAL_LEG_FRACTION = pf;
    }
    if (payload.cruisePathProgress != null) {
      var cp = Number(payload.cruisePathProgress);
      if (isFinite(cp)) cruisePathProgressU = Math.max(0.05, Math.min(0.98, cp));
    }
    externalScenarioActive = true;
    (function buildScenarioStepRowsForSide() {
      var rawSteps = Array.isArray(payload.steps) ? payload.steps : [];
      var keyName = compareSide === 'right' ? 't_no' : 't_yes';
      var indexed = rawSteps.map(function (row, i) {
        return { row: row, orig: i };
      });
      var filtered = indexed.filter(function (x) {
        var v = x.row[keyName];
        if (v === null || v === undefined) return false;
        var n = Number(v);
        return Number.isFinite(n);
      });
      filtered.sort(function (a, b) {
        var ta = Number(a.row[keyName]);
        var tb = Number(b.row[keyName]);
        if (ta !== tb) return ta - tb;
        return a.orig - b.orig;
      });
      scenarioStepRows = filtered.map(function (x) {
        return x.row;
      });
    })();
    flightPathSamples = buildSamplesFromPathPoints(payload.pathPoints, state.duration);
    removeRouteEntity();
    addRoutePolyline(payload.pathPoints);
    clearMockPointsAndLinks();
    clearEngineOverlays();
    removeEntityById('aircraft__text');
    aircraftTextEntity = null;
    removeEntityById('aircraft');
    if (planeBillboardEntity) {
      viewer.entities.remove(planeBillboardEntity);
      planeBillboardEntity = null;
    }
    var modelUri = payload.modelUrl || resolvePublicUrl('models/boeing_737.glb');
    buildModelAircraftAndBillboard(modelUri);
    if (payload.parentControlsNarrative !== undefined) {
      parentControlsNarrative = !!payload.parentControlsNarrative;
    }
    fetchEngineData(payload).catch(function (err) {
      console.error('[dual-iframe-poc] fetchEngineData', err);
    });
    viewer.scene.requestRender();
  }

  /**
   * 与单屏 home / 复位一致的「看向飞机」相对位姿（ENU @ 机体位置）。
   * 子页用 RAF 驱动时间且 clock 不走时，trackedEntity 往往不更新相机，故播放时每帧显式调用本函数实现沿线跟飞。
   */
  function applyCameraChaseAtAircraftPosition(positionObj) {
    if (!viewer || viewer.isDestroyed() || !positionObj) return;
    /**
     * viewer.flyTo(entity)（如 HUD 复位）完成后往往会挂上 trackedEntity；
     * 每帧渲染阶段跟踪相机会覆盖本函数里的 lookAtTransform，导致与当帧写入的折线
     * 视锥不一致（常见表现：播放时链路「没了」，暂停清掉跟踪后又出现）。
     */
    try {
      viewer.trackedEntity = undefined;
    } catch (eTr) {}
    var p = toCartesian(positionObj);
    var transform = Cesium.Transforms.eastNorthUpToFixedFrame(p);
    var offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 100);
    viewer.camera.lookAtTransform(transform, offset);
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }

  function flyCameraToHome(positionObj, durationSec) {
    if (!positionObj) return;
    var p = toCartesian(positionObj);
    applyCameraChaseAtAircraftPosition(positionObj);
    if ((durationSec || 0) > 0) {
      viewer.camera.flyTo({
        destination: p,
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-25), roll: 0 },
        duration: durationSec
      });
    }
  }

  function setCameraToInitialView() {
    if (isDisposed) {
      return;
    }
    if (externalScenarioActive && flightPathSamples && flightPathSamples.length) {
      // 双屏子页初始相机参数与单屏 home 对齐
      flyCameraToHome(flightPathSamples[0].position, 0);
      return;
    }

    flyCameraToHome(scenario.initialView.destination, 0);
  }

  function updateDebugState() {}

  setCameraToInitialView();

  function updateSceneForTime(timeSeconds) {
    var aircraftPosition = getInterpolatedAircraftPosition(timeSeconds);
    aircraftEntity.position = toCartesian(aircraftPosition);
    if (aircraftUsesModel) {
      aircraftEntity.orientation = computePlaneOrientationQuat(timeSeconds);
      if (planeBillboardEntity) {
        var cart = Cesium.Cartographic.fromCartesian(toCartesian(aircraftPosition));
        planeBillboardEntity.position = Cesium.Cartesian3.fromRadians(
          cart.longitude,
          cart.latitude,
          (cart.height || 0) + 5
        );
      }
    } else if (aircraftTextEntity && aircraftEntity && aircraftEntity.position) {
      try {
        var jdAt = viewer.clock && viewer.clock.currentTime;
        var apTxt = aircraftEntity.position.getValue(jdAt || Cesium.JulianDate.now());
        if (apTxt) aircraftTextEntity.position = apTxt;
      } catch (eAT) {}
    }

    if (!externalScenarioActive) {
      scenario.points.forEach(function (pointData) {
        var vis = isVisible(pointData, timeSeconds);
        var entity = pointEntitiesById[pointData.id];
        if (entity) entity.show = vis;
        var te = pointEntitiesById[pointData.id + '__text'];
        if (te) te.show = vis;
      });

      linkEntities.forEach(function (linkItem) {
        var linkData = linkItem.data;
        var fromEntity = linkData.from === 'aircraft' ? aircraftEntity : pointEntitiesById[linkData.from];
        var toEntity = linkData.to === 'aircraft' ? aircraftEntity : pointEntitiesById[linkData.to];
        var shouldShow = isVisible(linkData, timeSeconds) && fromEntity && toEntity;

        linkItem.entity.show = shouldShow;
        if (!shouldShow) {
          return;
        }

        var fromPosition =
          linkData.from === 'aircraft' ? aircraftPosition : pointDataById[linkData.from].position;
        var toPosition =
          linkData.to === 'aircraft' ? aircraftPosition : pointDataById[linkData.to].position;

        linkItem.entity.polyline.positions = [toCartesian(fromPosition), toCartesian(toPosition)];
      });
    }

    /**
     * 播放跟飞时每帧先更新相机再写链路：否则同一帧内用「旧视锥」生成折线绘制命令，
     * 易出现播放时折线被剔除、暂停后相机不动才「突然出现」的现象。
     */
    if (state.playing && !narrativeBusy && aircraftEntity && aircraftEntity.show !== false) {
      applyCameraChaseAtAircraftPosition(aircraftPosition);
    }

    if (externalScenarioActive && engineRelations.length) {
      updateEngineLinkPositions(aircraftPosition);
    }

    updateDebugState();
    if (viewer && viewer.scene) {
      viewer.scene.requestRender();
    }
  }

  function flyToKeyframe(keyframeId) {
    if (isDisposed) {
      return;
    }
    if (externalScenarioActive) {
      return;
    }

    var keyframe = scenario.keyframes[keyframeId];
    if (!keyframe) {
      return;
    }

    viewer.camera.flyTo({
      destination: toCartesian(keyframe.camera.destination),
      duration: keyframe.camera.duration || 2
    });
  }

  function triggerKeyframesBetween(fromTime, toTime) {
    if (externalScenarioActive) {
      return;
    }
    keyframeEntries.forEach(function (entry) {
      if (fromTime < entry.time && toTime >= entry.time && !state.triggeredKeyframes[entry.id]) {
        state.triggeredKeyframes[entry.id] = true;
        flyToKeyframe(entry.id);
      }
    });
  }

  function markKeyframesTriggeredUpTo(timeSeconds) {
    state.triggeredKeyframes = {};
    keyframeEntries.forEach(function (entry) {
      if (entry.time <= timeSeconds) {
        state.triggeredKeyframes[entry.id] = true;
      }
    });
  }

  function stopPlayLoop() {
    if (playRaf) {
      cancelAnimationFrame(playRaf);
      playRaf = 0;
    }
    lastPlayMs = 0;
  }

  function setPlaying(playing) {
    state.playing = playing;
    updateDebugState();
  }

  function pause() {
    narrativeResumePending = false;
    cancelNarrativeSequence();
    setPlaying(false);
    stopPlayLoop();
    if (viewer && !viewer.isDestroyed()) {
      viewer.trackedEntity = undefined;
    }
  }

  function reset() {
    pause();
    firedNarrativeSteps = Object.create(null);
    state.currentTime = 0;
    state.triggeredKeyframes = {};
    updateSceneForTime(0);
    setCameraToInitialView();
    updateDebugState();
    postSideStateThrottled();
  }

  function seekToTime(timeSeconds, options) {
    currentNarrativeStepIndex = null;
    narrativeResumePending = false;
    var nextTime = clampTime(timeSeconds);
    var previousTime = state.currentTime;
    var isPlaybackSeek =
      options && options.reason === 'playback' && state.playing && nextTime >= previousTime;

    state.currentTime = nextTime;

    if (!isPlaybackSeek) {
      markKeyframesTriggeredUpTo(nextTime);
    }

    updateSceneForTime(nextTime);

    if (isPlaybackSeek) {
      triggerKeyframesBetween(previousTime, nextTime);
    }

    updateDebugState();
    postSideStateThrottled();
  }

  function postToParent(type, extra) {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      return;
    }
    if (!frameIdFromUrl) {
      return;
    }
    var payload = Object.assign({}, extra, {
      side: compareSide,
      frameId: frameIdFromUrl
    });
    window.parent.postMessage(
      {
        channel: COMPARE_CHANNEL,
        v: COMPARE_VERSION,
        type: type,
        payload: payload
      },
      window.location.origin
    );
  }

  function postSideState() {
    var d = Math.max(state.duration, 1e-6);
    var pathT = planePathTimeFromDemoTime(state.currentTime);
    var pathProgress = Math.max(0, Math.min(1, pathT / d));
    postToParent(MSG_SIDE_STATE, {
      timelineT: localTimeToParentT(state.currentTime),
      pathProgress: pathProgress,
      playing: state.playing,
      narrativeBusy: !!narrativeBusy
    });
  }

  function postSideStateThrottled() {
    var now = performance.now();
    if (now - _lastSideStatePost < 100) {
      if (_sideStateThrottle) {
        return;
      }
      _sideStateThrottle = requestAnimationFrame(function () {
        _sideStateThrottle = 0;
        _lastSideStatePost = performance.now();
        postSideState();
      });
      return;
    }
    _lastSideStatePost = now;
    postSideState();
  }

  function playLoop(now) {
    if (!state.playing) {
      return;
    }
    if (!lastPlayMs) {
      lastPlayMs = now;
      playRaf = requestAnimationFrame(playLoop);
      return;
    }
    var dt = Math.min((now - lastPlayMs) / 1000, 0.25);
    lastPlayMs = now;

    var prev = state.currentTime;
    var p0 = state.currentTime;
    var nextTime = Math.min(p0 + dt, state.duration);
    /** 在下一叙事触发点前截断本帧推进，避免 p1 越过 trigDemo 再被钳回，造成航迹微回跳/闪烁 */
    if (externalScenarioActive && scenarioStepRows.length && !parentControlsNarrative) {
      var nextTrigDemo = -1;
      for (var ti = 0; ti < scenarioStepRows.length; ti++) {
        if (firedNarrativeSteps[ti]) continue;
        var srow0 = scenarioStepRows[ti];
        var tKey0 = compareSide === 'right' ? 't_no' : 't_yes';
        var raw0 = Number(srow0[tKey0]);
        if (!isFinite(raw0)) continue;
        var trg0 = narrativeT0 + raw0 / SEMANTIC_TIME_COMPRESS;
        if (p0 < trg0 - 1e-9) {
          if (nextTrigDemo < 0 || trg0 < nextTrigDemo) nextTrigDemo = trg0;
        }
      }
      if (nextTrigDemo > 0) {
        nextTime = Math.min(nextTime, nextTrigDemo);
      }
    }
    /**
     * 父页裁决（parentControlsNarrative=true）：不在这里自触发 narrative，但同样必须在下一未过账关键点前截断
     * 并「钉在」已到达且尚未 RUN_NARRATIVE 的点的 demo 上，避免越过后再被 scrub/对齐造成沿航迹前/后瞬移。
     */
    if (externalScenarioActive && scenarioStepRows.length && parentControlsNarrative) {
      var nextUnfiredCap = -1;
      for (var tj = 0; tj < scenarioStepRows.length; tj++) {
        if (firedNarrativeSteps[tj]) continue;
        var srowA = scenarioStepRows[tj];
        var tKeyA = compareSide === 'right' ? 't_no' : 't_yes';
        var rawA = Number(srowA[tKeyA]);
        if (!isFinite(rawA)) continue;
        var trgA = narrativeT0 + rawA / SEMANTIC_TIME_COMPRESS;
        if (trgA + 1e-9 >= p0) {
          if (nextUnfiredCap < 0 || trgA < nextUnfiredCap) nextUnfiredCap = trgA;
        }
      }
      if (nextUnfiredCap > 0) {
        nextTime = Math.min(nextTime, nextUnfiredCap);
      }
    }

    if (externalScenarioActive && scenarioStepRows.length && !parentControlsNarrative) {
      var p1 = nextTime;
      if (p1 >= p0 - 1e-9) {
        var ni;
        for (ni = 0; ni < scenarioStepRows.length; ni++) {
          if (firedNarrativeSteps[ni]) continue;
          var srow = scenarioStepRows[ni];
          var tKeyN = compareSide === 'right' ? 't_no' : 't_yes';
          var rawN = Number(srow[tKeyN]);
          if (!isFinite(rawN)) continue;
          var trigDemo = narrativeT0 + rawN / SEMANTIC_TIME_COMPRESS;
          if (p0 < trigDemo - 1e-9 && p1 >= trigDemo - 1e-9) {
            state.currentTime = clampTime(trigDemo);
            firedNarrativeSteps[ni] = true;
            triggerKeyframesBetween(prev, state.currentTime);
            currentNarrativeStepIndex = ni;
            enterNarrativePauseForStep(srow);
            return;
          }
        }
      }
    }

    state.currentTime = nextTime;

    if (state.currentTime >= state.duration - 1e-9) {
      state.currentTime = state.duration;
      updateSceneForTime(state.currentTime);
      triggerKeyframesBetween(prev, state.currentTime);
      postSideStateThrottled();
      pause();
      return;
    }

    updateSceneForTime(state.currentTime);
    triggerKeyframesBetween(prev, state.currentTime);
    postSideStateThrottled();

    playRaf = requestAnimationFrame(playLoop);
  }

  function handleLoadScenario(payload) {
    parentLoadScenarioReceived = true;
    clearReadyRepeatTimeouts();
    if (payload && payload.timelineMax != null) {
      parentTimelineMax = Math.max(Number(payload.timelineMax) || 0, 1e-6);
    }
    pause();
    firedNarrativeSteps = Object.create(null);
    state.currentTime = 0;
    state.triggeredKeyframes = {};
    // 只要拿到 pathPoints 就接入正式场景（modelUrl 缺失时使用 public/models fallback）
    if (payload && payload.pathPoints && payload.pathPoints.length >= 2) {
      state.duration = parentTimelineMax;
      applyExternalScenario(payload);
    }
    updateSceneForTime(0);
    try {
      if (viewer && !viewer.isDestroyed()) {
        viewer.trackedEntity = undefined;
        if (viewer.camera && typeof viewer.camera.cancelFlight === 'function') {
          viewer.camera.cancelFlight();
        }
      }
    } catch (eLSCam) {}
    setCameraToInitialView();
    var raf0 =
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : function (cb) {
        return setTimeout(cb, 0);
      };
    raf0(function () {
      setCameraToInitialView();
      if (viewer && viewer.scene) {
        viewer.scene.requestRender();
      }
    });
    postSideStateThrottled();
  }

  function handlePlay(payload) {
    if (payload && payload.parentControlsNarrative !== undefined) {
      parentControlsNarrative = !!payload.parentControlsNarrative;
    }
    if (payload && payload.fromStart) {
      pause();
      state.currentTime = 0;
      state.triggeredKeyframes = {};
      updateSceneForTime(0);
      setCameraToInitialView();
    }
    if (state.playing) {
      stopPlayLoop();
      setPlaying(false);
    }
    try {
      if (viewer && !viewer.isDestroyed()) viewer.trackedEntity = undefined;
    } catch (eTr3) {}
    if (state.currentTime >= state.duration - 1e-9) {
      state.currentTime = 0;
      state.triggeredKeyframes = {};
      updateSceneForTime(0);
    }
    setPlaying(true);
    updateSceneForTime(state.currentTime);
    lastPlayMs = 0;
    playRaf = requestAnimationFrame(playLoop);
  }

  function handleScrub(payload) {
    var t = parentTToLocal(payload && payload.t != null ? payload.t : 0);
    pause();
    if (!payload || !payload.silent) {
      firedNarrativeSteps = Object.create(null);
    }
    seekToTime(t, { reason: 'scrub' });
    /** 随 scrub 对齐相机到当前时间样条机位，避免对实体 flyTo 造成与叙事 fly 叠跳的观感 */
    if (!payload || !payload.silent) {
      var apScrub = getInterpolatedAircraftPosition(state.currentTime);
      applyCameraChaseAtAircraftPosition(apScrub);
    }
    if (viewer && viewer.scene) viewer.scene.requestRender();
    postSideStateThrottled();
  }

  function handleFocusUnit(payload) {
    var uid = payload && payload.unitId != null ? String(payload.unitId).trim() : '';
    if (!uid) return;
    if (uid === 'plane') {
      var apPlane = getInterpolatedAircraftPosition(state.currentTime);
      applyCameraChaseAtAircraftPosition(apPlane);
      if (viewer && viewer.scene) viewer.scene.requestRender();
      return;
    }
    narrativeFlyToUnit(uid, function () {
      if (viewer && viewer.scene) viewer.scene.requestRender();
    });
  }

  function handleRunNarrative(payload) {
    pause();
    var stepIndex = Number(payload && payload.stepIndex);
    if (payload && payload.t != null && isFinite(Number(payload.t))) {
      var tSet = clampTime(Number(payload.t));
      if (Math.abs(state.currentTime - tSet) > 1e-5) {
        state.currentTime = tSet;
      }
      updateSceneForTime(state.currentTime);
    }
    if (!isFinite(stepIndex) || stepIndex < 0 || stepIndex >= scenarioStepRows.length) {
      return;
    }
    var step = scenarioStepRows[stepIndex];
    if (!step) return;
    firedNarrativeSteps[stepIndex] = true;
    currentNarrativeStepIndex = stepIndex;
    enterNarrativePauseForStep(step);
  }

  function onParentMessage(event) {
    if (event.source !== window.parent) {
      return;
    }
    var data = event.data || {};
    if (data.channel !== COMPARE_CHANNEL || data.v !== COMPARE_VERSION) {
      return;
    }
    if (!frameIdFromUrl) {
      return;
    }
    var p = data.payload || {};
    if (String(p.frameId || '') !== frameIdFromUrl) {
      return;
    }
    if (String(p.side || '') !== compareSide) {
      return;
    }

    switch (data.type) {
      case MSG_LOAD_SCENARIO:
        handleLoadScenario(p);
        break;
      case MSG_PLAY:
        handlePlay(p);
        break;
      case MSG_PAUSE:
        pause();
        postSideStateThrottled();
        break;
      case MSG_RESET:
        reset();
        break;
      case MSG_SCRUB:
        handleScrub(p);
        break;
      case MSG_RUN_NARRATIVE:
        handleRunNarrative(p);
        break;
      case MSG_FOCUS_UNIT:
        handleFocusUnit(p);
        break;
      case MSG_SET_ACTIVE_RELATIONS:
      case MSG_CLEAR_ACTIVE_MARKER:
        break;
      default:
        break;
    }
  }

  window.addEventListener('message', onParentMessage);

  updateSceneForTime(0);
  updateDebugState();

  function sendReady() {
    postToParent(MSG_READY, {
      capabilities: { activePlayer: true, sequencedPlayback: false, staticPoc: true }
    });
  }

  function scheduleReadyBurst() {
    clearReadyRepeatTimeouts();
    [0, 200, 500, 1000].forEach(function (ms) {
      var id = setTimeout(function () {
        if (parentLoadScenarioReceived) {
          return;
        }
        sendReady();
      }, ms);
      readyRepeatTimeoutIds.push(id);
    });
  }

  function scheduleReady() {
    var n = 0;
    function tick() {
      if (viewer && !viewer.isDestroyed()) {
        sendReady();
        scheduleReadyBurst();
        return;
      }
      if (++n > 120) {
        sendReady();
        scheduleReadyBurst();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  scheduleReady();

  // ===================== HUD: 复位 / 指北针 / 比例尺 =====================

  var btnHome = document.getElementById('btn-home');
  var btnCompass = document.getElementById('btn-compass');
  var compassArrow = document.getElementById('compass-arrow');
  var scaleLabel = document.getElementById('scale-label');
  var scaleBar = document.getElementById('scale-bar');

  function resetCameraHome() {
    if (!viewer || viewer.isDestroyed()) return;
    if (aircraftEntity) {
      viewer.flyTo(aircraftEntity, {
        duration: 0.8,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 70)
      });
    } else {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 1000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
        duration: 0.8
      });
    }
  }

  function resetCameraNorth() {
    if (!viewer || viewer.isDestroyed() || !viewer.camera) return;
    var dest = viewer.camera.positionWC ? viewer.camera.positionWC.clone() : viewer.camera.position.clone();
    viewer.camera.flyTo({
      destination: dest,
      orientation: { heading: 0, pitch: viewer.camera.pitch, roll: 0 },
      duration: 0.6
    });
  }

  if (btnHome) btnHome.addEventListener('click', resetCameraHome);
  if (btnCompass) btnCompass.addEventListener('click', resetCameraNorth);

  function formatScaleDistance(meters) {
    if (!isFinite(meters) || meters <= 0) return '';
    if (meters >= 1000) {
      var km = meters / 1000;
      return (km === Math.floor(km)) ? km + ' km' : km.toFixed(1) + ' km';
    }
    return Math.round(meters) + ' m';
  }

  function getNiceScaleDistance(meters) {
    if (!isFinite(meters) || meters <= 0) return 0;
    var exponent = Math.floor(Math.log10(meters));
    var unit = Math.pow(10, exponent);
    var normalized = meters / unit;
    var nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
    return nice * unit;
  }

  function updateCompassHeading() {
    if (!viewer || viewer.isDestroyed() || !viewer.camera || !compassArrow) return;
    var deg = Cesium.Math.toDegrees(viewer.camera.heading || 0);
    compassArrow.style.transform = 'translateX(-50%) rotate(' + (-deg) + 'deg)';
  }

  function updateScaleBarHud() {
    if (!viewer || viewer.isDestroyed() || !viewer.scene || !viewer.scene.canvas || !viewer.camera) return;
    var scene = viewer.scene;
    var canvas = scene.canvas;
    var width = canvas.clientWidth || canvas.width || 0;
    var height = canvas.clientHeight || canvas.height || 0;
    if (width < 120 || height < 80) return;

    var samplePx = Math.max(80, Math.min(140, Math.round(width * 0.12)));
    var y = Math.max(30, height - 56);
    var left = new Cesium.Cartesian2(Math.round(width / 2 - samplePx / 2), y);
    var right = new Cesium.Cartesian2(Math.round(width / 2 + samplePx / 2), y);
    var leftRay = viewer.camera.getPickRay(left);
    var rightRay = viewer.camera.getPickRay(right);
    if (!leftRay || !rightRay) return;

    var leftPos = scene.globe.pick(leftRay, scene);
    var rightPos = scene.globe.pick(rightRay, scene);
    if (!leftPos || !rightPos) return;

    var leftCarto = Cesium.Cartographic.fromCartesian(leftPos);
    var rightCarto = Cesium.Cartographic.fromCartesian(rightPos);
    var geodesic = new Cesium.EllipsoidGeodesic(leftCarto, rightCarto);
    var rawMeters = geodesic.surfaceDistance;
    if (!isFinite(rawMeters) || rawMeters <= 0) return;

    var niceMeters = getNiceScaleDistance(rawMeters);
    if (!niceMeters) return;

    if (scaleLabel) scaleLabel.textContent = formatScaleDistance(niceMeters);
    if (scaleBar) scaleBar.style.width = Math.max(36, Math.round(samplePx * (niceMeters / rawMeters))) + 'px';
  }

  var _lastHudUpdate = 0;
  function updateHud() {
    var now = Date.now();
    if (now - _lastHudUpdate < 120) return;
    _lastHudUpdate = now;
    updateCompassHeading();
    updateScaleBarHud();
  }

  if (viewer && !viewer.isDestroyed()) {
    viewer.scene.postRender.addEventListener(updateHud);
  }

  // ===================== / HUD =====================

  function cleanupScene() {
    if (isDisposed) {
      return;
    }

    isDisposed = true;
    pause();
    detachBrightnessBoostListener();
    window.removeEventListener('message', onParentMessage);
    if (btnHome) btnHome.removeEventListener('click', resetCameraHome);
    if (btnCompass) btnCompass.removeEventListener('click', resetCameraNorth);
    if (viewer && !viewer.isDestroyed()) {
      try { viewer.scene.postRender.removeEventListener(updateHud); } catch (_) {}
      viewer.destroy();
    }
  }

  window.addEventListener('beforeunload', cleanupScene);
  window.addEventListener('pagehide', cleanupScene);
})();
