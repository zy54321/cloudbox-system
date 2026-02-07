<template>
  <!-- 顶部导航（对齐设计稿） -->
  <header class="cb-topbar">
    <div class="cb-brand">
      <span>☁</span>
      <span>云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <RouterLink class="cb-tab" to="/">静态架构 <span style="opacity:.7;">×</span></RouterLink>
        <div class="cb-tab active">动态交互 <span style="opacity:.7;">×</span></div>
      </div>
    </div>
    <div class="cb-right">
      <span>帮助</span>
      <span class="cb-pill">超级管理员 ▾</span>
    </div>
  </header>

  <div class="cb-wrap">
    <!-- 场景选择条（对齐设计稿） -->
    <section class="cb-scene-bar">
      <div class="cb-scene-hd">
        <div class="cb-scene-title"><span class="cb-dot"></span>场景选择 <span class="tag">当前：单发失效</span></div>
      </div>
      <div class="cb-scene-body">
        <div class="cb-scene-btns">
          <button class="cb-scene-btn active" type="button">单发失效</button>
          <button class="cb-scene-btn" type="button">烟雾异味</button>
          <button class="cb-scene-btn" type="button">导航失效</button>
          <button class="cb-scene-btn" type="button">劫机</button>
          <button class="cb-scene-btn" type="button">人为误操作</button>
        </div>
        <button class="cb-scene-switch" type="button">⇄ 切换：双屏演示</button>
      </div>
    </section>

    <div class="cb-main">
      <div class="cb-grid">
        <!-- 左侧主视图区 -->
        <section class="cb-card" style="display:flex;flex-direction:column;min-height:0;">
          <div class="cb-view-hd">
            <div class="cb-view-title"><span class="cb-dot"></span>主视图区</div>
          </div>

          <div style="flex:1;min-height:0;padding:14px;">
            <div class="cb-viewport">
              <div class="cb-togglebar">
                <button class="cb-toggle active" type="button">✈ 飞机</button>
                <button class="cb-toggle" type="button">▦ 信息流</button>
                <button class="cb-toggle" type="button">⌁ 控制流</button>
              </div>
              <div class="cb-overlay-note">* 单屏演示（可切换到双屏对比）</div>

              <!-- Cesium视口 -->
              <CesiumViewport />

              <!-- 飞机信息浮窗（对齐设计稿位置） -->
              <div class="cb-float small">
                <div class="cb-float-hd">
                  <span>飞机</span>
                  <span style="opacity:.8;">×</span>
                </div>
                <div class="cb-float-bd">
                  <div class="kv">
                    <div class="k">机型：</div><div>民航客机</div>
                    <div class="k">状态颜色：</div><div>● <span style="color:#ffd54a;font-weight:900;">黄色</span></div>
                  </div>
                </div>
              </div>

              <!-- 处置步骤浮窗（单屏UI占位） -->
              <div class="cb-disposal-float">
                <div class="cb-disposal-hd">
                  <span>证实 · 起始</span>
                  <span style="opacity:.85;">×</span>
                </div>
                <div class="cb-disposal-bd">
                  <div class="line">进入场景：<span>单发失效</span></div>
                  <ul>
                    <li>证实/核查</li>
                    <li>进入场景：<span>单发失效</span></li>
                    <li>处置动作</li>
                    <li>进入场景：<span>单发失效</span></li>
                    <li>本节点信息</li>
                    <li>进入场景：<span>单发失效</span></li>
                  </ul>
                </div>
                <div class="cb-disposal-foot">
                  <button type="button">收起详情</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 右侧信息面板 -->
        <aside class="cb-card cb-panel">
          <div class="cb-card-hd">
            <div class="cb-card-title"><span class="cb-dot"></span>信息面板</div>
          </div>
          <div class="cb-panel-tabs">
            <button class="cb-chip active" type="button">信息</button>
            <button class="cb-chip" type="button">处置卡片</button>
          </div>
          <div class="cb-panel-body">
            <div class="cb-item" style="min-height:240px;">
              <div class="kv" style="grid-template-columns: 90px 1fr;">
                <div class="k">航班号：</div><div style="color:#1fe3ff;font-weight:900;">MU0001</div>
                <div class="k">机型：</div><div>A320</div>
                <div class="k">航路：</div><div style="color:#1fe3ff;font-weight:900;">WPT-1 → WPT-3</div>
                <div class="k">关键时间：</div><div>T+0 ~ T+0</div>
                <div class="k">处置状态：</div><div style="color:#1fe3ff;font-weight:900;">待证实</div>
                <div class="k">当前节点：</div><div>起始</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- 底部时间轴Dock（对齐设计稿） -->
      <section class="cb-time-dock">
        <div class="cb-time-title"><span class="cb-dot"></span>时间轴（T+ 回放）</div>
        <div class="cb-time-actions">
          <button class="cb-time-btn" type="button">▶ 播放</button>
          <button class="cb-time-btn ghost" type="button">⟲ 复位</button>
          <button class="cb-time-btn ghost" type="button">T+ 8s</button>
        </div>
        <div class="cb-time-slider">
          <input type="range" min="0" max="100" value="25" />
        </div>
        <div class="cb-time-hint">拖动后联动：视图区 / 处置步骤 / 事件列表 / 告警</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import CesiumViewport from '../components/CesiumViewport.vue';
</script>
