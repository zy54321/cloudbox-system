<template>
  <div class="cb-compare-iframe-stage" aria-label="双 iframe 对比视图">
    <div class="cb-compare-iframe-col">
      <div class="cb-compare-iframe-hd">左</div>
      <div class="cb-compare-iframe-map-wrap">
        <iframe
          ref="iframeLeft"
          class="cb-compare-iframe"
          title="compare-left"
          :src="leftSrc"
          loading="eager"
          @load="onFrameLoad('left', $event)"
        />
        <div class="cb-compare-iframe-overlay cb-compare-iframe-overlay--left" aria-hidden="true">
          <slot name="left-overlay" />
        </div>
      </div>
    </div>
    <div class="cb-compare-iframe-col">
      <div class="cb-compare-iframe-hd">右</div>
      <div class="cb-compare-iframe-map-wrap">
        <iframe
          ref="iframeRight"
          class="cb-compare-iframe"
          title="compare-right"
          :src="rightSrc"
          loading="eager"
          @load="onFrameLoad('right', $event)"
        />
        <div class="cb-compare-iframe-overlay cb-compare-iframe-overlay--right" aria-hidden="true">
          <slot name="right-overlay" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue';

const LOG = '[compare-stage]';

const props = defineProps({
  /** @type {{ registerWindow: (s: 'left'|'right', w: Window | null, frameId?: string | null) => void, resetReady?: () => void }} */
  bridge: { type: Object, required: true }
});

/** setup 一次性生成，生命周期内不变（禁止 computed / 模板里现算） */
function makeFrameId(side) {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${side}-${ts}-${rnd}`;
}

const leftFrameId = ref(makeFrameId('left'));
const rightFrameId = ref(makeFrameId('right'));

/**
 * 正式双屏：仅加载 public/dual-iframe-poc/scene-left.html / scene-right.html（?frameId=）。
 * 原 Vue compare 多页（compare-left/right.html + DynamicSceneFrame）已废弃，不得再作为正式子页。
 */
function buildCompareFrameSrc(side, frameId) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const name =
    side === 'right' ? 'dual-iframe-poc/scene-right.html' : 'dual-iframe-poc/scene-left.html';
  if (typeof window === 'undefined') {
    return `${base}${name}?frameId=${encodeURIComponent(frameId)}`;
  }
  const u = new URL(name, window.location.origin + base);
  u.searchParams.set('frameId', String(frameId));
  const href = u.href;
  if (import.meta.env.DEV) {
    const pathOnly = href.split(/[?#]/)[0];
    if (!/\/dual-iframe-poc\/scene-(left|right)\.html$/i.test(pathOnly)) {
      console.warn(LOG, '正式双屏 iframe 应仅使用 dual-iframe-poc/scene-left|right.html', href);
    }
  }
  return href;
}

/** 仅基于稳定 frameId 各算一次，非响应式重算 */
const leftSrc = ref(buildCompareFrameSrc('left', leftFrameId.value));
const rightSrc = ref(buildCompareFrameSrc('right', rightFrameId.value));

const leftIframeLoadCount = ref(0);
const rightIframeLoadCount = ref(0);

function onFrameLoad(side, ev) {
  const frameId = side === 'right' ? rightFrameId.value : leftFrameId.value;
  const src = side === 'right' ? rightSrc.value : leftSrc.value;
  if (side === 'right') {
    rightIframeLoadCount.value += 1;
  } else {
    leftIframeLoadCount.value += 1;
  }
  console.log(LOG, 'onFrameLoad', {
    side,
    frameId,
    src,
    leftLoads: leftIframeLoadCount.value,
    rightLoads: rightIframeLoadCount.value
  });
  const el = ev?.target;
  const win = el?.contentWindow ?? null;
  props.bridge.registerWindow(side, win, frameId);
}

onMounted(() => {
  const l = leftSrc.value;
  const r = rightSrc.value;
  console.log(LOG, 'mounted', {
    leftFrameId: leftFrameId.value,
    rightFrameId: rightFrameId.value,
    leftSrc: l,
    rightSrc: r
  });
});

onBeforeUnmount(() => {
  props.bridge.registerWindow('left', null, null);
  props.bridge.registerWindow('right', null, null);
  props.bridge.resetReady?.();
});

defineExpose({
  leftFrameId,
  rightFrameId,
  leftSrc,
  rightSrc,
  leftIframeLoadCount,
  rightIframeLoadCount
});
</script>
