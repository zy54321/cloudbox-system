<template>
  <div
    class="cb-compare-iframe-stage cb-compare-iframe-stage--single"
    aria-label="单屏 iframe 云匣子侧"
  >
    <div class="cb-compare-iframe-col">
      <div class="cb-compare-iframe-hd">左</div>
      <div class="cb-compare-iframe-map-wrap">
        <iframe
          ref="iframeRef"
          class="cb-compare-iframe"
          title="compare-left"
          :src="leftSrc"
          loading="eager"
          @load="onFrameLoad"
        />
        <div
          class="cb-compare-iframe-overlay cb-compare-iframe-overlay--left"
          aria-hidden="true"
        >
          <slot name="left-overlay" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, nextTick } from 'vue';

const LOG = '[single-iframe-stage]';

const props = defineProps({
  /** @type {{ registerWindow: (s: 'left'|'right', w: Window | null, frameId?: string | null) => void, resetReady?: () => void }} */
  bridge: { type: Object, required: true }
});

function makeFrameId() {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 10);
  return `left-${ts}-${rnd}`;
}

const leftFrameId = ref(makeFrameId());

/**
 * 与 CompareIframeStage 一致：仅 public/dual-iframe-poc/scene-left.html
 */
function buildCompareFrameSrcForLeft(frameId) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const name = 'dual-iframe-poc/scene-left.html';
  if (typeof window === 'undefined') {
    return `${base}${name}?frameId=${encodeURIComponent(frameId)}`;
  }
  const u = new URL(name, window.location.origin + base);
  u.searchParams.set('frameId', String(frameId));
  const href = u.href;
  if (import.meta.env.DEV) {
    const pathOnly = href.split(/[?#]/)[0];
    if (!/\/dual-iframe-poc\/scene-left\.html$/i.test(pathOnly)) {
      console.warn(LOG, '应仅使用 dual-iframe-poc/scene-left.html', href);
    }
  }
  return href;
}

const leftSrc = ref(buildCompareFrameSrcForLeft(leftFrameId.value));
const iframeRef = ref(null);

function onFrameLoad(ev) {
  const win = ev?.target?.contentWindow ?? null;
  console.log(LOG, 'onFrameLoad', { frameId: leftFrameId.value, src: leftSrc.value });
  props.bridge.registerWindow('left', win, leftFrameId.value);
  props.bridge.registerWindow('right', null, null);
}

onBeforeUnmount(() => {
  props.bridge.registerWindow('left', null, null);
  props.bridge.registerWindow('right', null, null);
  props.bridge.resetReady?.();
});

onMounted(() => {
  console.log(LOG, 'mounted', { leftFrameId: leftFrameId.value, leftSrc: leftSrc.value });
  nextTick(() => {
    const w = iframeRef.value?.contentWindow ?? null;
    if (w) {
      console.log(LOG, 'registerWindow(early)', { leftFrameId: leftFrameId.value });
      props.bridge.registerWindow('left', w, leftFrameId.value);
      props.bridge.registerWindow('right', null, null);
    }
  });
});
</script>
