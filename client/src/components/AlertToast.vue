<template>
  <div id="globalAlertToast" class="alert-toast" :class="{ hidden: !visible }">
    <div class="alert-icon">⚠️</div>
    <div class="alert-content">
      <div id="alertTitle" class="alert-title">{{ title }}</div>
      <div id="alertBody" class="alert-body">{{ body }}</div>
    </div>
    <button class="alert-close" type="button" @click="$emit('close')">×</button>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true }
});

defineEmits(['close']);
</script>
