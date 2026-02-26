<template>
  <aside class="cb-card cb-panel cb-dv-panel">
    <div class="cb-card-hd">
      <div class="cb-dv-title">
        <img class="cb-dv-title-icon" :src="dvTitleIconLeft" alt="" />
        <span class="cb-dv-title-text">信息面板</span>
      </div>
    </div>

    <div class="cb-panel-tabs tabs">
      <button
        class="cb-msg-tab"
        :class="{ active: rightTab === 'info' }"
        :style="{ backgroundImage: `url(${rightTab === 'info' ? dvMsgTabSelected : dvMsgTabSelect})` }"
        type="button"
        @click="toggleRightTab('info')"
      >
        <span>信息</span>
      </button>
      <button
        class="cb-msg-tab"
        :class="{ active: rightTab === 'steps' }"
        :style="{ backgroundImage: `url(${rightTab === 'steps' ? dvMsgTabSelected : dvMsgTabSelect})` }"
        type="button"
        @click="toggleRightTab('steps')"
      >
        <span>处置卡片</span>
      </button>
    </div>

    <div class="cb-panel-body">
      <div class="tabpanel" :class="{ active: rightTab === 'info' }" data-panel="info">
        <div class="scroll">
          <div class="cb-info-box">
            <div class="cb-info-row">
              <span class="cb-info-k">航班号</span>
              <span id="f_no" class="cb-info-v">{{ infoFields.f_no }}</span>
            </div>
            <div class="cb-info-row">
              <span class="cb-info-k">机型</span>
              <span id="f_type" class="cb-info-v">{{ infoFields.f_type }}</span>
            </div>
            <div class="cb-info-row">
              <span class="cb-info-k">航路</span>
              <span id="f_route" class="cb-info-v">{{ infoFields.f_route }}</span>
            </div>
            <div class="cb-info-row">
              <span class="cb-info-k">关键时间</span>
              <span id="f_time" class="cb-info-v">{{ infoFields.f_time }}</span>
            </div>
            <div class="cb-info-row">
              <span class="cb-info-k">处置状态</span>
              <span id="f_state" class="cb-info-v">{{ infoFields.f_state }}</span>
            </div>
            <div class="cb-info-row">
              <span class="cb-info-k">当前节点</span>
              <span id="nodeName" class="cb-info-v">{{ infoFields.f_node }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tabpanel" :class="{ active: rightTab === 'steps' }" data-panel="steps">
        <div class="scroll">
          <div class="list" id="stepList" :ref="bindStepListRef">
            <div
              class="item"
              :class="{ highlight: card.nodeId === currentNodeId, 'is-current': card.nodeId === currentNodeId }"
              v-for="card in disposalCards"
              :key="card.nodeId"
              :data-node-id="card.nodeId"
            >
              <b class="cb-card-title">{{ card.phase }} · {{ card.title }}</b>
              <div class="meta cb-card-sub">T+{{ card.t }} | {{ card.state }}</div>
              <div class="small" style="margin-top:6px;">{{ card.summary }}</div>

              <div class="card-node-info" v-if="card.events && card.events.length">
                <div class="card-section-title">本节点信息（示意）</div>
                <ul class="card-info-list">
                  <li v-for="(ev, idx) in card.events.slice(0, 5)" :key="idx" class="cb-card-item">{{ ev }}</li>
                </ul>
              </div>

              <div class="compare-content" v-if="isCompare">
                <div class="compare-data-row">
                  <span class="compare-data-label">T_no / T_yes</span>
                  <span class="compare-data-value">{{ card.compare.t_no }} / {{ card.compare.t_yes }}</span>
                </div>
                <div class="compare-data-row">
                  <span class="compare-data-label">Δt</span>
                  <span class="compare-data-value compare-delta">{{ card.compare.dt }}</span>
                </div>
                <div class="compare-data-row">
                  <span class="compare-data-label">hops_no / hops_yes</span>
                  <span class="compare-data-value">{{ card.compare.hops_no }} / {{ card.compare.hops_yes }}</span>
                </div>
                <div class="compare-data-row">
                  <span class="compare-data-label">Δhops</span>
                  <span class="compare-data-value compare-delta">{{ card.compare.dhops }}</span>
                </div>
                <div class="compare-path">
                  <div class="compare-hint">路径（示意）</div>
                  <div>{{ card.compare.path_no }}</div>
                  <div>{{ card.compare.path_yes }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- <hr /> -->
          <div class="small" v-show="isCompare">对比模式：左右两套进度随同一时间轴同步更新（示意）。</div>
          <div class="list compare-steps-table" v-show="isCompare">
            <div class="item" :class="{ highlight: i === idxNo || i === idxYes }" v-for="(s, i) in steps" :key="s.nodeId">
              <b>{{ s.name }}</b>
              <div class="meta">无云匣子：{{ i <= idxNo ? '已到达' : '未到达' }}（T+{{ s.t_no }}s） ｜ 有云匣子：{{ i <= idxYes ? '已到达' : '未到达' }}（T+{{ s.t_yes }}s）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
const emit = defineEmits(['stepListReady']);

const props = defineProps({
  dvTitleIconLeft: { type: String, required: true },
  dvMsgTabSelected: { type: String, required: true },
  dvMsgTabSelect: { type: String, required: true },
  rightTab: { type: String, required: true },
  toggleRightTab: { type: Function, required: true },
  infoFields: { type: Object, required: true },
  disposalCards: { type: Array, required: true },
  currentNodeId: { type: Number, required: true },
  isCompare: { type: Boolean, required: true },
  steps: { type: Array, required: true },
  idxNo: { type: Number, required: true },
  idxYes: { type: Number, required: true }
});

const bindStepListRef = (el) => {
  emit('stepListReady', el);
};
</script>
