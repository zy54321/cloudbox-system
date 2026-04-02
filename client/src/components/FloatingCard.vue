<template>
  <div :id="id" class="floating-card" :class="{ 'is-collapsed': collapsed }">
    <div class="floating-card-header">
      <span class="floating-card-title">{{ card?.phase }} · {{ card?.title }}</span>
      <button class="btn-icon floating-card-toggle" type="button" @click="$emit('toggle-collapsed')">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div class="floating-card-body" v-show="!collapsed">
      <div class="card-meta">T+{{ card?.t }}s ｜ {{ card?.state }}</div>
      <div class="card-summary" v-if="card?.summary">{{ card.summary }}</div>
      <div class="card-desc" v-if="card?.desc">{{ card.desc }}</div>

      <div class="card-details" v-show="detailsOpen">
        <div class="card-section-title" v-if="card?.evidence?.length">证据 / 依据</div>
        <ul class="card-info-list" v-if="card?.evidence?.length">
          <li v-for="(item, idx) in (card?.evidence || []).slice(0, 5)" :key="keyPrefix + 'e' + idx">{{ item }}</li>
        </ul>

        <div class="card-section-title" v-if="card?.actions?.length">处置动作</div>
        <ul class="card-info-list" v-if="card?.actions?.length">
          <li v-for="(item, idx) in (card?.actions || []).slice(0, 5)" :key="keyPrefix + 'a' + idx">{{ item }}</li>
        </ul>

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
