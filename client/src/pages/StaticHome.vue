<template>
  <header class="cb-topbar">
    <div class="cb-brand">
      <img class="cb-top-icon" src="../assets/staticPage/top_left_icon.png" alt="logo" />
      <span class="cb-top-title">云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <div class="cb-tab active">静态架构</div>
        <RouterLink class="cb-tab" to="/dynamic">动态交互</RouterLink>
      </div>
    </div>
  </header>

  <div class="cb-wrap cb-wrap--static">
    <div class="cb-main">
      <div class="cb-grid">
        <!-- 左侧主区域 -->
        <section class="cb-card cb-center-card" style="display:flex;flex-direction:column;min-height:0;">
          <div class="cb-card-hd" style="justify-content:flex-start;">
            <div class="cb-card-title">
              <img class="cb-center-icon" src="../assets/staticPage/center_left_icon.png" alt="" />
              <span class="cb-center-title">中央视图区</span>
              <span class="cb-model-tag">
                <span class="cb-model-text">模型：民航客机</span>
              </span>
            </div>
          </div>

          <div class="cb-tools">
            <button class="cb-btn" :class="{ active: activeTool === '起飞' }" type="button" @click="onTool('起飞')">起飞</button>
            <button class="cb-btn" :class="{ active: activeTool === '爬升' }" type="button" @click="onTool('爬升')">爬升</button>
            <button class="cb-btn" :class="{ active: activeTool === '巡航' }" type="button" @click="onTool('巡航')">巡航</button>
            <button class="cb-btn" :class="{ active: activeTool === '进近' }" type="button" @click="onTool('进近')">进近</button>
            <button class="cb-btn" :class="{ active: activeTool === '降落' }" type="button" @click="onTool('降落')">降落</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '放大' }" type="button" @click="onTool('放大')">放大</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '缩小' }" type="button" @click="onTool('缩小')">缩小</button>
            <button class="cb-btn ghost" :class="{ active: activeTool === '巡航故障' }" type="button" @click="onTool('巡航故障')">巡航故障</button>
          </div>

          <div style="flex:1;min-height:0;padding:0 14px 14px;">
            <div class="cb-viewport">
              <div class="cb-overlay-tabs">
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'plane' }" type="button" @click="onMapMode('plane')">飞机</button>
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'ground' }" type="button" @click="onMapMode('ground')">地面</button>
              </div>
              <div class="cb-stage">阶段：降落 ｜ 层级：太空 ｜ 缩放级别：4</div>

              <!-- Cesium 视口 -->
              <div class="cb-cesium-layer"><CesiumViewport :model-url="boeingModelUrl" :auto-focus="true" /></div>

              <!-- 右上角悬浮信息 -->
              <div v-if="mapMode === 'plane'" class="cb-float cb-map-popup" :style="{ backgroundImage: `url(${mapPopup})` }">
                <div class="cb-float-hd">
                  <span>飞机：民航客机</span>
                  <span style="opacity:.8;margin-right: 10px;">×</span>
                </div>
                <div class="cb-float-bd">
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">航班号：</span>
                    <span class="cb-popup-value">MU0001</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">当前高度：</span>
                    <span class="cb-popup-value">10,000m</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">目标高度：</span>
                    <span class="cb-popup-value">10,500m</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">地速：</span>
                    <span class="cb-popup-value">780km/h</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">下一航点 / ETA：</span>
                    <span class="cb-popup-value">WPT-3 / 12:05</span>
                  </div>
                </div>
              </div>

              <div v-else class="cb-float cb-map-popup" :style="{ backgroundImage: `url(${mapPopup})` }">
                <div class="cb-float-hd">
                  <span>地面系统</span>
                  <span style="opacity:.8;margin-right: 10px;">×</span>
                </div>
                <div class="cb-float-bd">
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">系统名称：</span>
                    <span class="cb-popup-value">地面站-01</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">站点位置：</span>
                    <span class="cb-popup-value">济南</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">链路状态：</span>
                    <span class="cb-popup-value">正常</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">当前负载：</span>
                    <span class="cb-popup-value">37%</span>
                  </div>
                  <div class="cb-popup-row">
                    <span class="cb-popup-label">最近上报：</span>
                    <span class="cb-popup-value">12:05</span>
                  </div>
                </div>
              </div>

              <div v-if="showWarn" class="cb-warn">
                <div class="cb-warn-hd">
                  <span class="cb-warn-title">巡航故障提示</span>
                  <img class="cb-warn-icon" :src="warnIcon" alt="" />
                </div>
                <div class="cb-warn-bd">巡航阶段遇到故障时弹出或显著提示（脚本示例驱动）。</div>
              </div>
            </div>
          </div>

          <div style="padding:0 14px 14px;color:rgba(255,255,255,.75);font-size:12px;display:flex;gap:10px;align-items:center;">
            <span>i</span>
            <span>提示：地图点位（飞机/地面/天空等符号）已在主视图区提供信息框。</span>
          </div>
        </section>

        <!-- 右侧信息面板 -->
        <aside class="cb-card cb-panel cb-msg-panel">
          <div class="cb-card-hd">
            <div class="cb-card-title">
              <img class="cb-msg-icon" src="../assets/staticPage/msgpage_icon.png" alt="" />
              <span class="cb-msg-title">信息面板</span>
            </div>
          </div>
          <div class="cb-panel-tabs">
            <button class="cb-chip" :class="{ active: activeTab === 'base' }" type="button" @click="activeTab = 'base'">
              <span class="cb-chip-text">基本单元</span>
            </button>
            <button class="cb-chip" :class="{ active: activeTab === 'relation' }" type="button" @click="activeTab = 'relation'">
              <span class="cb-chip-text">交互关系</span>
            </button>
            <button class="cb-chip" :class="{ active: activeTab === 'modules' }" type="button" @click="activeTab = 'modules'">
              <span class="cb-chip-text">运行模块</span>
            </button>
          </div>
          <div class="cb-panel-body">
            <template v-if="activeTab === 'base'">
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">星基：</span>高通量通信卫星、低轨通信卫星</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">地面：</span>飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">机载：</span>机载监测与云匣子协同终端</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else-if="activeTab === 'relation'">
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">关联：</span>卫星链路与地面控制中心</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">关联：</span>飞行控制与应急处置执行</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">模块1：</span>运行监控</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">模块2：</span>协同决策</h4>
                <p><span class="cb-link">点击查看详细信息</span></p>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import CesiumViewport from '../components/CesiumViewport.vue';
import mapPopup from '../assets/staticPage/map_popup.png';
import warnIcon from '../assets/staticPage/map_warnicon.png';

const boeingModelUrl = new URL('../assets/model/boeing_737.glb', import.meta.url).href;
const activeTab = ref('base');
const activeTool = ref('');
const mapMode = ref('plane');
const showWarn = ref(false);

const onTool = (name) => {
  activeTool.value = name;
  console.log('[StaticTool]', name);
  showWarn.value = name === '巡航故障';
};

const onMapMode = (m) => {
  mapMode.value = m;
  console.log('[StaticMapMode]', m);
};
</script>
