<template>
  <div ref="container" class="cesium-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { createCesiumViewer, destroyCesiumViewer } from '../engine/cesium/viewer';

const container = ref(null);
let viewer = null;

onMounted(async () => {
  if (!container.value) return;
  viewer = await createCesiumViewer(container.value);
});

onBeforeUnmount(() => {
  if (viewer) destroyCesiumViewer(viewer);
});
</script>

<style scoped>
.cesium-container{width:100%;height:100%;}
</style>
