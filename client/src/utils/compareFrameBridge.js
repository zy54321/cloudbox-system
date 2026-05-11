import {
  COMPARE_CHANNEL,
  COMPARE_VERSION,
  MSG_CLEAR_ACTIVE_MARKER,
  MSG_ERROR,
  MSG_MARKER_CLICK,
  MSG_MARKER_MOVE,
  MSG_PAUSE,
  MSG_PLAY,
  MSG_READY,
  MSG_RESET,
  MSG_SCRUB,
  MSG_LOAD_SCENARIO,
  MSG_NARRATIVE_DONE,
  MSG_RUN_NARRATIVE,
  MSG_FOCUS_UNIT,
  MSG_FOCUS_RELATION,
  MSG_SET_ACTIVE_RELATIONS,
  MSG_SIDE_STATE
} from './compareFrameProtocol.js';

const LOG = '[compare-bridge]';

/**
 * @param {object} [options]
 * @param {(p: { side: 'left'|'right' } & Record<string, unknown>) => void} [options.onReady]
 * @param {(p: Record<string, unknown>) => void} [options.onMarkerClick]
 * @param {(p: Record<string, unknown>) => void} [options.onMarkerMove]
 * @param {(p: Record<string, unknown>) => void} [options.onSideState]
 * @param {(p: Record<string, unknown>) => void} [options.onNarrativeDone]
 * @param {(p: { side?: string, message?: string, code?: string }) => void} [options.onError]
 */
export function createCompareFrameBridge(options = {}) {
  const { onReady, onMarkerClick, onMarkerMove, onSideState, onNarrativeDone, onError } = options;

  /** @type {{ left: Window | null, right: Window | null }} */
  const windows = { left: null, right: null };
  /** @type {{ left: string | null, right: string | null }} */
  const frameIds = { left: null, right: null };
  /** @type {{ left: boolean, right: boolean }} */
  const ready = { left: false, right: false };

  /** 每次 iframe 完成 load 且 registerWindow(side, win非空) 时递增 */
  const iframeLoadCounts = { left: 0, right: 0 };

  const diag = {
    ready: { accepted: 0, rejected: 0 },
    sideState: { accepted: 0, rejected: 0 },
    markerMove: { accepted: 0, rejected: 0 },
    markerClick: { accepted: 0, rejected: 0 },
    narrativeDone: { accepted: 0, rejected: 0 }
  };

  let destroyed = false;

  function registerWindow(side, win, frameId) {
    if (destroyed) return;
    windows[side] = win;
    if (!win) {
      ready[side] = false;
      frameIds[side] = null;
      return;
    }
    frameIds[side] = frameId != null ? String(frameId) : null;
    iframeLoadCounts[side] += 1;
  }

  /** 必须与 windows[side] 引用一致，禁止仅信 payload.side */
  function sideForRegisteredSource(win) {
    if (win === windows.left) return 'left';
    if (win === windows.right) return 'right';
    return null;
  }

  function resetReady() {
    ready.left = false;
    ready.right = false;
  }

  function targetOrigin() {
    return typeof window !== 'undefined' ? window.location.origin : '*';
  }

  /**
   * 父→子：统一注入当前侧 frameId，忽略调用方传入的 frameId，避免漏传或旧值。
   */
  function postToSide(side, body) {
    const w = windows[side];
    const fid = frameIds[side];
    if (!w || destroyed || fid == null) return;
    try {
      const raw = body.payload || {};
      const { frameId: _ignoreFrameId, ...rest } = raw;
      const pl = { ...rest, side, frameId: fid };
      w.postMessage({ ...body, payload: pl }, targetOrigin());
    } catch (_) {
      /* ignore */
    }
  }

  function play(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_PLAY,
      payload: { ...payload }
    });
  }

  function playBoth(payload = {}) {
    play('left', payload);
    play('right', payload);
  }

  function pause(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_PAUSE,
      payload: { side, ...payload }
    });
  }

  function pauseBoth(payload = {}) {
    pause('left', payload);
    pause('right', payload);
  }

  function reset(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_RESET,
      payload: { side, ...payload }
    });
  }

  function resetBoth(payload = {}) {
    reset('left', payload);
    reset('right', payload);
  }

  function scrub(side, t, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_SCRUB,
      payload: { side, t: Number(t), ...payload }
    });
  }

  function loadScenario(side, scenarioPayload) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_LOAD_SCENARIO,
      payload: { ...scenarioPayload }
    });
  }

  function loadScenarioBoth(leftPayload, rightPayload) {
    loadScenario('left', leftPayload);
    loadScenario('right', rightPayload);
  }

  function setActiveRelations(side, payload) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_SET_ACTIVE_RELATIONS,
      payload: { side, ...payload }
    });
  }

  function setActiveRelationsBoth(leftPayload, rightPayload) {
    setActiveRelations('left', leftPayload);
    setActiveRelations('right', rightPayload);
  }

  function clearActiveMarker(side) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_CLEAR_ACTIVE_MARKER,
      payload: { side }
    });
  }

  function clearActiveMarkerBoth() {
    clearActiveMarker('left');
    clearActiveMarker('right');
  }

  function runNarrative(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_RUN_NARRATIVE,
      payload: { ...payload }
    });
  }

  function runNarrativeBoth(leftPayload, rightPayload) {
    runNarrative('left', leftPayload || {});
    runNarrative('right', rightPayload || {});
  }

  function focusUnit(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_FOCUS_UNIT,
      payload: { ...payload }
    });
  }

  function focusRelation(side, payload = {}) {
    postToSide(side, {
      channel: COMPARE_CHANNEL,
      v: COMPARE_VERSION,
      type: MSG_FOCUS_RELATION,
      payload: { ...payload }
    });
  }

  function logChildRejected(kind, reason, detail) {
    diag[kind].rejected += 1;
    if (kind === 'narrativeDone') {
      console.warn(LOG, 'NARRATIVE_DONE rejected', { reason, detail });
    } else {
      console.log(LOG, kind, 'rejected', reason, detail);
    }
  }

  function logChildAccepted(kind, detail) {
    diag[kind].accepted += 1;
    // console.log(LOG, kind, 'accepted', detail);
  }

  /**
   * 子→父：READY / SIDE_STATE / MARKER_* 必须同时满足
   * ev.source === windows[side] 且 payload.frameId === frameIds[side]
   */
  function validateChildMessage(ev, d) {
    const srcSide = sideForRegisteredSource(ev.source);
    const p = d.payload || {};
    const declaredSide = String(p.side ?? '');
    const fid = String(p.frameId ?? '');

    if (!srcSide) {
      return {
        ok: false,
        kind: null,
        reason: 'source_not_registered',
        detail: { declaredSide, frameId: fid, sourceMatch: false }
      };
    }

    if (declaredSide !== srcSide) {
      return {
        ok: false,
        kind: null,
        reason: 'payload_side_mismatch',
        detail: { side: srcSide, declaredSide, frameId: fid, sourceMatch: true }
      };
    }

    const expect = frameIds[srcSide];
    if (expect == null || fid !== expect) {
      return {
        ok: false,
        kind: null,
        reason: 'frame_id_mismatch',
        detail: {
          side: srcSide,
          expect,
          got: fid,
          sourceMatch: true
        }
      };
    }

    return {
      ok: true,
      srcSide,
      detail: { side: srcSide, frameId: fid, sourceMatch: true }
    };
  }

  function onMessage(ev) {
    if (destroyed) return;
    const d = ev.data;
    if (!d || d.channel !== COMPARE_CHANNEL || d.v !== COMPARE_VERSION) return;

    if (d.type === MSG_ERROR) {
      onError?.(d.payload || {});
      return;
    }

    const childTypes = [MSG_READY, MSG_MARKER_CLICK, MSG_MARKER_MOVE, MSG_SIDE_STATE, MSG_NARRATIVE_DONE];
    if (!childTypes.includes(d.type)) {
      return;
    }

    const v = validateChildMessage(ev, d);
    const kindMap = {
      [MSG_READY]: 'ready',
      [MSG_SIDE_STATE]: 'sideState',
      [MSG_MARKER_MOVE]: 'markerMove',
      [MSG_MARKER_CLICK]: 'markerClick',
      [MSG_NARRATIVE_DONE]: 'narrativeDone'
    };
    const kind = kindMap[d.type];

    if (!v.ok) {
      if (kind) logChildRejected(kind, v.reason, v.detail);
      return;
    }

    logChildAccepted(kind, v.detail);

    switch (d.type) {
      case MSG_READY: {
        const side = d.payload?.side;
        if (side === 'left' || side === 'right') {
          ready[side] = true;
          onReady?.(d.payload);
        }
        break;
      }
      case MSG_MARKER_CLICK:
        onMarkerClick?.(d.payload || {});
        break;
      case MSG_MARKER_MOVE:
        onMarkerMove?.(d.payload || {});
        break;
      case MSG_SIDE_STATE:
        onSideState?.(d.payload || {});
        break;
      case MSG_NARRATIVE_DONE:
        onNarrativeDone?.(d.payload || {});
        break;
      default:
        break;
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', onMessage);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', onMessage);
    }
    windows.left = null;
    windows.right = null;
    frameIds.left = null;
    frameIds.right = null;
    resetReady();
  }

  function isBothReady() {
    return ready.left && ready.right;
  }

  function getFrameId(side) {
    return frameIds[side] ?? null;
  }

  let getPushLoadScenarioCount = () => null;

  function getObservationSnapshot() {
    return {
      iframeLoadCounts: { ...iframeLoadCounts },
      bridgeDiag: JSON.parse(JSON.stringify(diag)),
      pushLoadScenarioCount: getPushLoadScenarioCount()
    };
  }

  function setPushLoadScenarioCountGetter(fn) {
    getPushLoadScenarioCount = typeof fn === 'function' ? fn : () => null;
  }

  return {
    registerWindow,
    resetReady,
    play,
    playBoth,
    pause,
    pauseBoth,
    reset,
    resetBoth,
    scrub,
    loadScenario,
    loadScenarioBoth,
    setActiveRelations,
    setActiveRelationsBoth,
    clearActiveMarker,
    clearActiveMarkerBoth,
    runNarrative,
    runNarrativeBoth,
    focusUnit,
    focusRelation,
    destroy,
    isBothReady,
    getFrameId,
    getObservationSnapshot,
    setPushLoadScenarioCountGetter,
    /** @internal */
    _ready: ready
  };
}
