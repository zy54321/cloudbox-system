<template>
  <header class="cb-topbar">
    <div class="cb-brand">
      <span>☁</span>
      <span>云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <div class="cb-tab active">静态架构 <span style="opacity:.7;">×</span></div>
        <RouterLink class="cb-tab" to="/dynamic">动态交互 <span style="opacity:.7;">×</span></RouterLink>
      </div>
    </div>
    <div class="cb-right">
      <span>帮助</span>
      <span class="cb-pill">超级管理员 ▾</span>
    </div>
  </header>

  <div class="cb-wrap">
    <div class="cb-banner">
      <strong>静态架构目标：</strong>
      帮助理解“体系结构与关联关系”。本页使用占位视图模拟 Cesium；实际开发中替换为 Cesium Viewer
    </div>

    <div class="cb-main">
      <div class="cb-grid">
        <!-- 左侧主区域 -->
        <section class="cb-card" style="display:flex;flex-direction:column;min-height:0;">
          <div class="cb-card-hd">
            <div class="cb-card-title"><span class="cb-dot"></span>中央视图区 <span style="opacity:.75;font-weight:700;">· 模型：民航客机</span></div>
          </div>

          <div class="cb-tools">
            <button class="cb-btn" type="button">起飞</button>
            <button class="cb-btn" type="button">爬升</button>
            <button class="cb-btn" type="button">巡航</button>
            <button class="cb-btn" type="button">进近</button>
            <button class="cb-btn" type="button">降落</button>
            <button class="cb-btn ghost" type="button">放大</button>
            <button class="cb-btn ghost" type="button">缩小</button>
            <button class="cb-btn ghost" type="button">巡航故障提示</button>
          </div>

          <div style="flex:1;min-height:0;padding:0 14px 14px;">
            <div class="cb-viewport">
              <div class="cb-overlay-tabs">
                <button class="cb-mini active" type="button">飞机</button>
                <button class="cb-mini" type="button">航迹</button>
                <button class="cb-mini" type="button">卫星</button>
                <button class="cb-mini" type="button">地面</button>
              </div>
              <div class="cb-stage">阶段：降落 ｜ 层级：太空 ｜ 缩放级别：4</div>

              <!-- Cesium视口占位（后续叠加UI overlay） -->
              <CesiumViewport />

              <div class="cb-float">
                <div class="cb-float-hd">
                  <span>飞机：民航客机</span>
                  <span style="opacity:.8;">×</span>
                </div>
                <div class="cb-float-bd">
                  航班号：MU0001<br />
                  当前高度：10,000m<br />
                  目标高度：10,500m<br />
                  地速：780km/h<br />
                  下一航点/ETA：WPT-3 / 12:05
                </div>
              </div>

              <div class="cb-fault">
                <div style="font-weight:800;">巡航故障提示</div>
                <div style="margin-top:6px;color:rgba(255,255,255,.70);font-size:12px;">巡航阶段遇到故障时弹出或显著提示（脚本/示例驱动）</div>
              </div>
            </div>
          </div>

          <div style="padding:0 14px 14px;color:rgba(255,255,255,.75);font-size:12px;display:flex;gap:10px;align-items:center;">
            <span>i</span>
            <span>提示：地图点击（飞机/地面/天空等符号）已在主视图区提供信息框。</span>
          </div>
        </section>

        <!-- 右侧信息面板 -->
        <aside class="cb-card cb-panel">
          <div class="cb-card-hd">
            <div class="cb-card-title"><span class="cb-dot"></span>信息面板</div>
          </div>
          <div class="cb-panel-tabs">
            <button class="cb-chip active" type="button">基本单元</button>
            <button class="cb-chip" type="button">交互关系</button>
            <button class="cb-chip" type="button">运行模块1-7</button>
          </div>
          <div class="cb-panel-body">
            <div class="cb-item">
              <h4><span style="color:#ffd54a;">星基：</span>高通量卫星、低轨通信卫星</h4>
              <p><span class="cb-link">点击查看详细信息</span></p>
            </div>
            <div class="cb-item">
              <h4><span style="color:#ffd54a;">地面：</span>飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行</h4>
              <p><span class="cb-link">点击查看详细信息</span></p>
            </div>
            <div class="cb-item">
              <h4><span style="color:#ffd54a;">星基：</span>高通量卫星、低轨通信卫星</h4>
              <p><span class="cb-link">点击查看详细信息</span></p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import CesiumViewport from '../components/CesiumViewport.vue';
</script>
