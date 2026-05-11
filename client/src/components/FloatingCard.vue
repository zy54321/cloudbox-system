<template>
  <div
    :id="id"
    class="floating-card floating-card--dv"
    :class="{
      'is-collapsed': collapsed,
      'is-standby': isStandby
    }"
  >
    <div class="floating-card-header">
      <template v-if="isStandby && standbyContent">
        <span class="floating-card-title">
          {{ standbyContent.headline }} — {{ standbyContent.scenarioName }}
        </span>
      </template>
      <span v-else class="floating-card-title">{{ card?.phase }} · {{ card?.title }}</span>
      <button class="btn-icon floating-card-toggle" type="button" @click="$emit('toggle-collapsed')">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div
      class="floating-card-body floating-card-scroll"
      :class="{ 'floating-card-body--sectioned': detailsOpen }"
      v-show="!collapsed"
    >
      <!-- 未展开详情：简报或待命全宽 -->
      <template v-if="!detailsOpen">
        <template v-if="isStandby && standbyContent">
          <div class="floating-standby">
            <div class="card-meta">模式：{{ standbyContent.mode }}</div>
            <p class="standby-line">{{ standbyContent.cloudLine }}</p>
            <p class="standby-hint">{{ standbyContent.hint }}</p>
          </div>
        </template>
        <template v-else>
          <div class="card-meta">T+{{ card?.t }}s ｜ {{ card?.state }}</div>
          <div class="card-summary" v-if="card?.summary">{{ card.summary }}</div>
          <div class="card-desc" v-if="card?.desc">{{ card.desc }}</div>
        </template>
      </template>

      <!-- 展开详情：顶（当前/待命提示）+ 中（可滚动：列表+补充）+ 底（extra 插槽，可空） -->
      <div v-else class="card-details card-details--sectioned">
        <div class="card-details-layout">
          <div class="card-details-top">
            <div class="card-details-top-hd">当前关键时间点</div>
            <template v-if="!isStandby">
              <div class="card-meta">T+{{ card?.t ?? '—' }}s ｜ {{ card?.state ?? '—' }}</div>
              <div v-if="card?.summary" class="card-summary card-summary--top">{{ card.summary }}</div>
            </template>
            <template v-else-if="isStandby && standbyContent">
              <p class="standby-line standby-line--in-details">{{ standbyContent.cloudLine }}</p>
            </template>
          </div>

          <div class="card-details-scroll">
            <div v-if="timelineItems.length" class="floating-keyframe-list-wrap">
              <div class="card-section-title">关键时间点</div>
              <ul class="floating-keyframe-list" role="list">
                <li
                  v-for="(row, li) in timelineItems"
                  :key="keyPrefix + 'kf' + (row.markStepIndex ?? li)"
                  :class="[
                    'floating-keyframe-item',
                    { 'is-highlight': row.isHighlight, 'is-current': row.isListExpanded, 'is-clickable': canPreview }
                  ]"
                  :tabindex="canPreview ? 0 : -1"
                  @click="onKeyframeRowClick(row, li)"
                  @keydown.enter.prevent="onKeyframeRowClick(row, li)"
                  @keydown.space.prevent="onKeyframeRowClick(row, li)"
                >
                  <template v-if="row.isListExpanded && row.fullCard">
                    <div class="keyframe-item-head">{{ row.listHeadLabel }}</div>
                    <div class="keyframe-time">{{ row.timeLabel }} ｜ {{ row.name }}</div>
                    <div class="keyframe-body">
                      <div v-if="row.fullCard.phase" class="keyfield">
                        <span class="k">阶段</span>
                        <span class="v">{{ row.fullCard.phase }}</span>
                      </div>
                      <div v-if="row.fullCard.state" class="keyfield">
                        <span class="k">状态</span>
                        <span class="v">{{ row.fullCard.state }}</span>
                      </div>
                      <div v-if="row.fullCard.summary" class="keyfield keyfield-block">{{ row.fullCard.summary }}</div>
                      <div v-if="row.fullCard.desc" class="keyfield keyfield-block desc">{{ row.fullCard.desc }}</div>
                      <div v-if="row.fullCard.events?.length" class="keyblock">
                        <div class="k">事件 / 时序</div>
                        <ul>
                          <li v-for="(ev, ei) in row.fullCard.events" :key="keyPrefix + 'ev' + ei">{{ ev }}</li>
                        </ul>
                      </div>
                      <div v-if="row.fullCard.evidence?.length" class="keyblock">
                        <div class="k">证据 / 依据</div>
                        <ul>
                          <li v-for="(ev, ei) in row.fullCard.evidence" :key="keyPrefix + 'evd' + ei">{{ ev }}</li>
                        </ul>
                      </div>
                      <div v-if="row.fullCard.actions?.length" class="keyblock">
                        <div class="k">处置动作</div>
                        <ul>
                          <li v-for="(ac, ai) in row.fullCard.actions" :key="keyPrefix + 'ac' + ai">{{ ac }}</li>
                        </ul>
                      </div>
                      <div v-if="row.transferRows?.length" class="keyblock keyblock-transfer">
                        <div class="k">链路传递信息</div>
                        <ul class="transfer-list">
                          <li v-for="tr in row.transferRows" :key="keyPrefix + 'tr' + tr.id">
                            <div class="transfer-info-block">
                              <div
                                class="transfer-main-click"
                                role="button"
                                tabindex="0"
                                :aria-disabled="!canPreview"
                                title="聚焦整条链路"
                                @click.stop="onTransferRowClick(tr, row)"
                                @keydown.enter.stop.prevent="onTransferRowClick(tr, row)"
                                @keydown.space.stop.prevent="onTransferRowClick(tr, row)"
                              >
                                <div class="transfer-path">
                                  <span class="transfer-kind">{{ tr.flowLabel || (tr.kind === 'control' ? '控制流' : '信息流') }}</span>
                                  <span class="transfer-route">{{ tr.fromLabel }} → {{ tr.toLabel }}</span>
                                </div>

                                <div class="transfer-payload">传递内容：{{ tr.payload }}</div>
                              </div>

                              <div v-if="buildTransferNodes(tr).length" class="transfer-node-tail">
                                <span class="transfer-node-tail-label">所在链路节点</span>
                                <button
                                  v-for="node in buildTransferNodes(tr)"
                                  :key="keyPrefix + 'tr-node-' + tr.id + '-' + node.id"
                                  class="transfer-node-btn"
                                  type="button"
                                  :disabled="!canPreview"
                                  :title="'聚焦节点：' + node.label"
                                  @click.stop="onTransferNodeClick(tr, row, node)"
                                >
                                  {{ node.label }}
                                </button>
                              </div>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </template>
                  <div v-else class="keyframe-brief" :class="{ 'is-dim': !row.isHighlight }">
                    <span class="k-t">{{ row.timeLabel }}</span>
                    <span class="k-n">{{ row.name }}</span>
                  </div>
                </li>
              </ul>
            </div>

            <div v-else class="keyframe-empty is-muted">暂无本侧关键时间点</div>

            <div
              v-if="!isStandby && !timelineItems.length && card?.evidence?.length"
              class="card-section-title"
            >
              证据 / 依据
            </div>
            <ul
              v-if="!isStandby && !timelineItems.length && card?.evidence?.length"
              class="card-info-list"
            >
              <li v-for="(item, idx) in (card?.evidence || []).slice(0, 5)" :key="keyPrefix + 'e' + idx">{{ item }}</li>
            </ul>
            <div
              v-if="!isStandby && !timelineItems.length && card?.actions?.length"
              class="card-section-title"
            >
              处置动作
            </div>
            <ul
              v-if="!isStandby && !timelineItems.length && card?.actions?.length"
              class="card-info-list"
            >
              <li v-for="(item, idx) in (card?.actions || []).slice(0, 5)" :key="keyPrefix + 'a' + idx">{{ item }}</li>
            </ul>
          </div>

          <div v-if="$slots.extra" class="card-details-bottom">
            <div class="floating-card-extra">
              <slot name="extra" />
            </div>
          </div>
        </div>
      </div>

      <button
        class="btn-small btn-small--details-toggle"
        type="button"
        @click="$emit('toggle-details')"
      >
        {{ detailsOpen ? '收起详情' : '展开详情' }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  id: { type: String, default: '' },
  card: { type: Object, required: true },
  collapsed: { type: Boolean, required: true },
  detailsOpen: { type: Boolean, required: true },
  keyPrefix: { type: String, default: '' },
  /** 未到达本侧首帧或无条件目时，仅右下窗口展示待命文案 */
  isStandby: { type: Boolean, default: false },
  standbyContent: { type: Object, default: null },
  /** 由父页整理的本侧关键时间列表，子组件只展示 */
  timelineItems: { type: Array, default: () => [] },
  /** 为 true 时列表项可点击，仅向父级 emit 预览，不操作地图 */
  canPreview: { type: Boolean, default: true },
  /** 本列表所属侧：'yes' | 'no'，用于父页路由 previewKeyframe */
  previewSide: { type: String, default: 'yes' }
});

const emit = defineEmits([
  'toggle-collapsed',
  'toggle-details',
  'preview-keyframe',
  'focus-transfer',
  'focus-transfer-node'
]);

function onKeyframeRowClick(row, index) {
  if (!props.canPreview) return;
  if (!row?.fullCard) return;
  const t = row.demoT;
  if (!Number.isFinite(Number(t))) return;
  emit('preview-keyframe', {
    side: props.previewSide,
    index,
    markStepIndex: row.markStepIndex,
    demoT: Number(t),
    item: row
  });
}

function onTransferRowClick(tr, row) {
  if (!props.canPreview) return;
  if (!tr?.relationId) return;

  emit('focus-transfer', {
    side: props.previewSide,
    relationId: String(tr.relationId),
    transferId: tr.id,
    fromId: tr.fromId,
    toId: tr.toId,
    nodeIds: buildTransferNodes(tr).map((node) => node.id),
    item: row,
    transfer: tr
  });
}

function normalizeTransferNodeId(id) {
  const s = String(id ?? '').trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return s;
}

function buildTransferNodes(tr) {
  const out = [];
  const seen = new Set();

  function push(id, label) {
    const nodeId = normalizeTransferNodeId(id);
    if (!nodeId || seen.has(nodeId)) return;
    seen.add(nodeId);
    out.push({
      id: nodeId,
      label: String(label || nodeId)
    });
  }

  push(tr?.fromId, tr?.fromLabel);
  push(tr?.toId, tr?.toLabel);

  return out;
}

function onTransferNodeClick(tr, row, node) {
  if (!props.canPreview) return;

  const unitId = normalizeTransferNodeId(node?.id);
  if (!unitId) return;

  emit('focus-transfer-node', {
    side: props.previewSide,
    unitId,
    label: node?.label,
    item: row,
    transfer: tr
  });
}
</script>

<style scoped>
/* 展开详情：抬高整体可展示高度（与 proto 全局 280px 解耦；折叠态无此类） */
.floating-card-body.floating-card-body--sectioned {
  max-height: min(65vh, 560px) !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-height: 820px) {
  .floating-card-body.floating-card-body--sectioned {
    max-height: min(48vh, 420px) !important;
  }
}

@media (max-height: 720px) {
  .floating-card-body.floating-card-body--sectioned {
    max-height: min(40vh, 340px) !important;
  }
}

.card-details--sectioned {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 0;
}
.card-details-layout {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.card-details-top {
  flex: 0 0 auto;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(42, 116, 201, 0.35);
}
.card-details-top-hd {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 230, 255, 0.78);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}
.card-summary--top {
  margin-top: 6px;
  max-height: 3.2em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 12px;
  line-height: 1.45;
}
.card-details-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0 6px;
}
.card-details-scroll .floating-keyframe-list-wrap .card-section-title {
  margin-top: 0;
  margin-bottom: 6px;
}
.card-details-bottom {
  flex: 0 0 auto;
  border-top: 1px solid rgba(42, 116, 201, 0.35);
  padding-top: 8px;
  margin-top: 0;
}
.card-details-bottom :deep(.floating-card-extra) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.floating-standby {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  line-height: 1.6;
}
.standby-line,
.standby-hint {
  margin: 6px 0 0;
}
.standby-hint {
  color: rgba(180, 220, 255, 0.9);
  font-size: 11px;
}
.standby-line--in-details {
  margin: 0;
  line-height: 1.5;
  font-size: 12px;
}
.floating-keyframe-list-wrap {
  margin-bottom: 0;
}
.floating-keyframe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(42, 116, 201, 0.35);
  background: rgba(8, 32, 72, 0.35);
}
.floating-card-body--sectioned > .btn-small--details-toggle {
  flex-shrink: 0;
  margin-top: 6px;
  align-self: flex-start;
}
.floating-keyframe-item {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(42, 116, 201, 0.22);
}
.floating-keyframe-item:last-child {
  border-bottom: none;
}
.floating-keyframe-item.is-highlight:not(.is-current) {
  background: rgba(60, 120, 255, 0.1);
}
.floating-keyframe-item.is-current {
  background: rgba(60, 120, 255, 0.2);
  border-left: 3px solid rgba(100, 200, 255, 0.9);
  padding-left: 7px;
}
.floating-keyframe-item:not(.is-clickable) {
  cursor: default;
  opacity: 0.88;
}
.floating-keyframe-item.is-clickable {
  cursor: pointer;
  outline: none;
}
.floating-keyframe-item.is-clickable:hover {
  background: rgba(50, 110, 220, 0.18);
}
.floating-keyframe-item.is-clickable:focus-visible {
  box-shadow: inset 0 0 0 1px rgba(150, 210, 255, 0.7);
}
.keyframe-item-head {
  font-size: 10px;
  color: #9fefff;
  font-weight: 600;
  margin-bottom: 4px;
}
.keyframe-time {
  font-size: 12px;
  font-weight: 600;
  color: #eaf4ff;
  margin-bottom: 6px;
}
.keyframe-brief {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.88);
}
.keyframe-brief.is-dim {
  color: rgba(255, 255, 255, 0.5);
}
.keyframe-brief .k-t {
  font-weight: 600;
  min-width: 4.2em;
}
.keyframe-brief .k-n {
  flex: 1;
  min-width: 0;
}
.keyfield {
  display: flex;
  gap: 8px;
  font-size: 11px;
  margin-bottom: 4px;
}
.keyfield .k {
  color: rgba(180, 220, 255, 0.8);
  flex-shrink: 0;
}
.keyfield .v {
  color: #eaf4ff;
}
.keyfield-block {
  display: block;
  padding: 6px 8px;
  background: rgba(8, 48, 109, 0.45);
  border-radius: 6px;
  border: 1px solid rgba(42, 116, 201, 0.28);
  margin: 4px 0 6px;
  line-height: 1.55;
}
.keyfield-block.desc {
  font-size: 11px;
}
.keyblock {
  margin: 6px 0;
  font-size: 11px;
}
.keyblock .k {
  color: rgba(180, 220, 255, 0.85);
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
}
.keyblock ul {
  margin: 0;
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}
.keyblock-transfer {
  margin-top: 8px;
}

.transfer-list {
  list-style: none;
  padding: 0;
  margin: 6px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transfer-list li {
  padding: 0;
  border: 1px solid rgba(120, 180, 255, 0.22);
  border-radius: 8px;
  background: rgba(8, 35, 70, 0.28);
}

.transfer-info-block {
  width: 100%;
  display: block;
  text-align: left;
  border-radius: 8px;
  padding: 6px 8px;
  background: transparent;
  color: inherit;
  user-select: text;
  -webkit-user-select: text;
}

.transfer-main-click {
  border-radius: 7px;
  padding: 2px 2px;
  cursor: pointer;
  user-select: text;
  -webkit-user-select: text;
}

.transfer-main-click:hover {
  background: rgba(51, 142, 219, 0.16);
}

.transfer-main-click[aria-disabled='true'] {
  cursor: default;
  opacity: 0.82;
}

.transfer-node-tail {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.transfer-node-tail-label {
  font-size: 11px;
  color: rgba(180, 210, 235, 0.72);
}

.transfer-node-btn {
  border: 1px solid rgba(80, 170, 240, 0.42);
  background: rgba(8, 48, 109, 0.48);
  color: rgba(220, 242, 255, 0.96);
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 11px;
  cursor: pointer;
}

.transfer-node-btn:hover:not(:disabled) {
  background: rgba(24, 108, 186, 0.72);
}

.transfer-node-btn:disabled {
  cursor: default;
  opacity: 0.62;
}

.transfer-path {
  display: flex;
  gap: 6px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 3px;
}

.transfer-kind {
  color: rgba(255, 213, 74, 0.92);
  font-weight: 700;
  font-size: 11px;
}

.transfer-route {
  color: rgba(220, 240, 255, 0.96);
  font-weight: 600;
}

.transfer-payload {
  color: rgba(220, 235, 250, 0.82);
  line-height: 1.45;
  font-size: 12px;
}

.keyframe-empty {
  font-size: 11px;
  padding: 6px 0 10px;
}
.is-muted {
  color: rgba(200, 220, 255, 0.55);
}
</style>
