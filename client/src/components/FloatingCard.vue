<template>
  <div :id="id" class="floating-card" :class="{ 'is-collapsed': collapsed }">
    <div class="floating-card-header">
      <span>{{ card?.phase }} · {{ card?.title }}</span>
      <button class="btn-icon" type="button" @click="$emit('toggle-collapsed')">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div class="floating-card-body" v-show="!collapsed">
      <div class="card-summary">{{ card?.summary }}</div>

      <div class="card-details" v-show="detailsOpen">
        <div class="card-section-title">证据/依据</div>
        <ul class="card-info-list">
          <li v-for="(item, idx) in (card?.evidence || []).slice(0, 5)" :key="keyPrefix + 'e' + idx">{{ item }}</li>
        </ul>

        <div class="card-section-title">处置动作</div>
        <ul class="card-info-list">
          <li v-for="(item, idx) in (card?.actions || []).slice(0, 5)" :key="keyPrefix + 'a' + idx">{{ item }}</li>
        </ul>

        <div class="card-section-title">本节点信息（示意）</div>
        <ul class="card-info-list">
          <li v-for="(ev, idx) in (card?.events || []).slice(0, 5)" :key="keyPrefix + 'n' + idx">{{ ev }}</li>
        </ul>

        <!-- 额外内容：比如右侧 Yes 卡片的对比结论 -->
        <slot name="extra" />
      </div>

      <button class="btn-small" type="button" @click="$emit('toggle-details')">
        {{ detailsOpen ? '收起详情' : '展开详情' }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, default: '' },
  card: { type: Object, required: true },
  collapsed: { type: Boolean, required: true },
  detailsOpen: { type: Boolean, required: true },
  keyPrefix: { type: String, default: '' }
});

defineEmits(['toggle-collapsed', 'toggle-details']);
</script>
