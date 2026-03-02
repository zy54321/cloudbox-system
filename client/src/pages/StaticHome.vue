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
            <button class="cb-btn ghost" :class="{ active: activeTool === '沿线飞行' }" type="button" @click="onTool('沿线飞行')">沿线飞行</button>
          </div>

          <div style="flex:1;min-height:0;padding:0 14px 14px;">
            <div class="cb-viewport">
              <div class="cb-overlay-tabs">
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'plane' }" type="button" @click="onMapMode('plane')">飞机</button>
                <button class="cb-mini cb-map-mini" :class="{ active: mapMode === 'ground' }" type="button" @click="onMapMode('ground')">地面</button>
              </div>
              <div class="cb-stage">阶段：{{ phaseText }} ｜ 层级：{{ levelText }} ｜ 缩放级别：4</div>

              <!-- Cesium 视口 + 飞机跟随 popup（相机高度≤阈值时显示） -->
              <div class="cb-cesium-layer cb-cesium-layer--with-popup">
                <CesiumViewport ref="vpStatic" :model-url="boeingModelUrl" :auto-focus="true" :path-points="pathPointsForViewer" :path-progress="planeProgress" :follow-path="true" :visible-relation-id="selectedRelationId" @marker-click="onMarkerClick" @marker-move="onMarkerMove" @plane-screen-info="onPlaneScreenInfo" @module-highlight-screen="onModuleHighlightScreen" />
                <div
                  v-if="showPlanePopup && planeScreenInfo"
                  class="cb-plane-follow-popup"
                  :style="planePopupStyle"
                >
                  <div class="cb-plane-follow-popup-hd">飞机</div>
                  <div class="cb-plane-follow-popup-bd">
                    <div class="cb-plane-follow-row">高度：{{ planeScreenInfo.alt.toFixed(0) }} m</div>
                    <div class="cb-plane-follow-row">航向：{{ planeScreenInfo.heading.toFixed(0) }}°</div>
                    <div class="cb-plane-follow-row">地速：{{ planeScreenInfo.speed }} km/h</div>
                    <div class="cb-plane-follow-row">状态：{{ planeEnvText }}</div>
                  </div>
                </div>
                <!-- 运行模块高亮 popup（与飞机 popup 同层、同定位方式） -->
                <div
                  v-if="selectedModuleIndex !== null && moduleHighlightScreen"
                  class="cb-module-highlight-popup"
                  :style="moduleHighlightPopupStyle"
                >
                  <div class="cb-module-highlight-popup-hd">
                    <span>{{ moduleHighlightTitle }}</span>
                    <button type="button" class="cb-module-highlight-popup-close" aria-label="关闭" @click="closeModuleHighlight">×</button>
                  </div>
                  <div class="cb-module-highlight-popup-bd">{{ moduleHighlightContent }}</div>
                </div>
              </div>

              <!-- 标点弹窗（点击地面/星基点位显示，同一时间只一个） -->
              <div v-if="activePopup" class="marker-popup" :style="popupStyle">
                <div class="marker-popup-header">
                  <div class="marker-popup-title">{{ activePopup.meta.name }}</div>
                  <button type="button" class="marker-popup-close" @click="closePopup">×</button>
                </div>
                <div class="marker-popup-body">
                  <div>类型：{{ activePopup.meta.type }}</div>
                  <div>经度：{{ activePopup.meta.lon.toFixed(6) }}</div>
                  <div>纬度：{{ activePopup.meta.lat.toFixed(6) }}</div>
                  <div>高度：{{ activePopup.meta.alt_m }} m</div>
                </div>
              </div>

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

              <div v-else class="cb-float cb-map-popup cb-map-popup--units">
                <div class="cb-map-popup-units-hd">
                  <span>地图标点</span>
                  <span class="cb-map-popup-units-close">×</span>
                </div>
                <div class="cb-float-bd cb-units-list-bd">
                  <template v-if="unitsGroups.length">
                    <div v-for="grp in unitsGroups" :key="grp.name" class="cb-units-group">
                      <div class="cb-units-group-title">{{ grp.name }}</div>
                      <div
                        v-for="u in grp.units"
                        :key="u.id"
                        class="cb-units-item"
                        @click="flyToUnit(u)"
                      >
                        {{ u.name }}
                      </div>
                    </div>
                  </template>
                  <div v-else class="cb-units-empty">加载中…</div>
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
                <p><span class="cb-link" @click="openDetailModal('star')">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">地面：</span>飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行</h4>
                <p><span class="cb-link" @click="openDetailModal('ground')">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">机载：</span>机载监测与云匣子协同终端</h4>
                <p><span class="cb-link" @click="openDetailModal('airborne')">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else-if="activeTab === 'relation'">
              <div v-for="rel in (linksConfig?.relations || [])" :key="rel.id" class="cb-item" :class="{ 'cb-item--relation-selected': selectedRelationId === rel.id }">
                <h4><span style="color:#ffd54a;">关联：</span>{{ rel.name }}</h4>
                <p><span class="cb-link" @click="toggleRelationDetail(rel.id)">点击查看详细信息</span></p>
              </div>
            </template>
            <template v-else-if="activeTab === 'modules'">
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">1，数据采集系统：</span></h4>
                <p>记录民用航空器飞行数据和舱音数据。</p>
                <p><span class="cb-link" @click="openModuleHighlight(0)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">2，通感算一体机载感知预警系统：</span></h4>
                <p>融合通信和感知能力，获得航空器位置和轨迹信息。</p>
                <p><span class="cb-link" @click="openModuleHighlight(1)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">3，HTS/5G ATG 通信系统：</span></h4>
                <p>实现飞机数据和地面的双向同步传输。</p>
                <p><span class="cb-link" @click="openModuleHighlight(2)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">4，地面飞行场景实时重构系统：</span></h4>
                <p>识别潜在安全隐患，为突发紧急场景下地面实时获取航空器安全态势提供数据分析手段。</p>
                <p><span class="cb-link" @click="openModuleHighlight(3)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">5，地面运营控制中心应急专家组系统：</span></h4>
                <p>专家组讨论直接制定应急处置方案，并提出相关意见。</p>
                <p><span class="cb-link" @click="openModuleHighlight(4)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">6，体系应急决策推演系统：</span></h4>
                <p>基于航空器风险状态生成动态决策方案，模拟处置过程并提供推演结果。</p>
                <p><span class="cb-link" @click="openModuleHighlight(5)">点击查看详细信息</span></p>
              </div>
              <div class="cb-item">
                <h4><span style="color:#ffd54a;">7，应急处置系统：</span></h4>
                <p>协调机组、航司、空管、机场等应急部门，实现紧急事态的下达和通知。</p>
                <p><span class="cb-link" @click="openModuleHighlight(6)">点击查看详细信息</span></p>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </div>

  <!-- 单元详情弹窗（基本单元 tab 内点击「点击查看详细信息」） -->
  <Teleport to="body">
    <div v-if="detailModalType" class="cb-detail-modal-backdrop" @click.self="closeDetailModal">
      <div class="cb-detail-modal">
        <div class="cb-detail-modal-hd">
          <h2 class="cb-detail-modal-title">{{ detailModalTitle }}</h2>
          <button type="button" class="cb-detail-modal-close" aria-label="关闭" @click="closeDetailModal">×</button>
        </div>
        <div class="cb-detail-modal-bd">
          <!-- 星基 -->
          <template v-if="detailModalType === 'star'">
            <div class="cb-detail-section">
              <div class="cb-detail-label">单元类型：</div>
              <div class="cb-detail-value">星基元素</div>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-label">包含元素：</div>
              <ul class="cb-detail-list cb-detail-list--inline">
                <li>高通量卫星（HTS）</li>
                <li>低轨通信卫星（LEO）</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">功能说明：</div>
              <p class="cb-detail-para">
                星基元素是“云匣子”体系通信网络的天基层组成部分，面向民航飞行全程提供广域覆盖的数据中继能力，与 5G ATG 宽带链路共同构成空地数据同步传输的关键通道，用于支撑飞行数据下传、态势共享与应急协同处置。
              </p>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">主要功能：</div>
              <ul class="cb-detail-list">
                <li><strong>提供卫星通信链路能力：</strong>支撑“星-机”“星-地”数据传输与转发（地图缩小时以连线+标注示意）</li>
                <li><strong>承载飞行过程数据下传：</strong>与机载数据采集（FDR/CVR）及通感算一体机载感知预警系统协同，保障飞行时间、速度、高度、姿态、告警等关键数据传输至地面系统</li>
                <li><strong>保障空地数据同步：</strong>作为 HTS/5G ATG 通信系统的卫星侧媒介之一，实现飞机数据与地面数据的同步传输</li>
                <li><strong>应急通信支撑：</strong>在通信网络故障/链路异常场景下，为关键业务数据提供可用的广域传输通道（故障类型包含高通量卫星通信故障等）</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">关联关系：</div>
              <ul class="cb-detail-list">
                <li><strong>与链路元素连接：</strong>通过卫星通信链路形成“卫星-飞机”“卫星-地面”连接关系（以连线+标注形式体现）</li>
                <li><strong>与机载元素连接：</strong>承载通感算机载感知预警系统与机载数据采集系统的关键数据上报与告警信息传输</li>
                <li><strong>与地面元素连接：</strong>向地面飞行场景实时重构系统、专家组、仿真推演与运行控制中心等模块下传数据并支持共享</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">在体系中的作用：</div>
              <p class="cb-detail-para">
                星基元素作为空-天-地三层网络中的天基支撑层，为云匣子体系提供跨区域、广覆盖的数据中继与链路保障能力，确保机载感知与地面重构、专家研判、决策推演之间的数据流转连续可靠，是实现“数据采集—感知识别—处置协同”链路闭环的重要基础。
              </p>
            </div>
          </template>
          <!-- 地面 -->
          <template v-else-if="detailModalType === 'ground'">
            <div class="cb-detail-section">
              <div class="cb-detail-label">单元类型：</div>
              <div class="cb-detail-value">地面元素</div>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-label">包含元素：</div>
              <ul class="cb-detail-list">
                <li>地面飞行场景实时重构系统</li>
                <li>地面运营控制中心应急专家组系统</li>
                <li>体系应急决策推演系统</li>
                <li>地面运行控制中心</li>
                <li>应急处置执行 / 应急处置系统</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">功能说明：</div>
              <p class="cb-detail-para">
                地面元素是云匣子体系的“态势获取—专家研判—推演决策—协同指挥—处置执行”闭环核心，负责接收机载数据与告警，完成飞行场景重构与风险识别，组织专家组研讨并借助推演系统生成处置方案，最终协调各相关部门执行落地。
              </p>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">主要功能：</div>
              <ul class="cb-detail-list">
                <li><strong>1）飞行场景实时重构：</strong>地面侧快速完成飞行态势数字化重构，为突发紧急场景下获取航空器安全态势提供分析手段与风险识别能力。</li>
                <li><strong>2）应急专家组研判：</strong>基于告警与态势信息组织讨论，直接制定应急处置方案并提出处置意见。</li>
                <li><strong>3）应急决策推演：</strong>依据航空器风险状态生成多个动态决策方案，在仿真场景中开展平行推演，模拟处置过程并输出推演结果，辅助专家组制定最终方案，并支持方案分发至机组、航司、空管、机场等部门。</li>
                <li><strong>4）运行控制与协同调度：</strong>作为地面侧运行与指挥中枢，承接方案落地过程中的组织协调与资源调度（与空管/机场/航司等联动在动态示例中体现）。</li>
                <li><strong>5）应急处置执行：</strong>根据推演结果与专家组方案，协调机组、航司、空管、机场等应急部门各分支，完成紧急事态的下达、通知与执行。</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">关联关系：</div>
              <ul class="cb-detail-list">
                <li><strong>与链路元素连接：</strong>通过 5G ATG / HTS 卫星链路接入空地数据通道，接收告警包与飞行态势数据。</li>
                <li><strong>与机载元素连接：</strong>接收机载感知预警系统/机载通感算一体设备上报的状态信息与告警数据，并向机组下发处置方案与指令（控制流在动态示例中体现）。</li>
                <li><strong>地面内部关联：</strong>信息流可从机载感知预警系统进入地面专家组、推演系统；控制流由推演系统回到专家组，再分发至空管、机场、航司等部门执行。</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">在体系中的作用：</div>
              <p class="cb-detail-para">
                地面元素是云匣子体系的决策与处置中枢，通过“实时重构 + 专家研判 + 推演决策 + 协同执行”形成可追踪、可闭环的应急处置链条，把机载侧的主动感知预警转化为地面侧可落地的组织调度与处置行动。
              </p>
            </div>
          </template>
          <!-- 机载 -->
          <template v-else-if="detailModalType === 'airborne'">
            <div class="cb-detail-section">
              <div class="cb-detail-label">单元类型：</div>
              <div class="cb-detail-value">机载元素</div>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-label">包含元素：</div>
              <ul class="cb-detail-list">
                <li>机载监测与云匣子协同终端（统称：机载侧协同能力）</li>
                <li>关联设备/系统（文档定义的机载端）：黑匣子（FDR/CVR）、通感算一体机载感知预警设备、机组</li>
                <li>数据采集系统（FDR/CVR）与通感算一体机载感知预警系统（模块表）</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">功能说明：</div>
              <p class="cb-detail-para">
                机载监测与云匣子协同终端是云匣子体系的空中侧“数据采集—态势感知—告警上报—指令协同”的入口单元：一方面采集并记录飞行数据与舱音数据，另一方面通过通感算一体机载感知预警能力融合通信与感知获取航空器位置与轨迹信息，并在异常发生时将告警包经空地链路快速传递至地面系统，支撑后续研判与处置。
              </p>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">主要功能：</div>
              <ul class="cb-detail-list">
                <li><strong>1）机载数据采集与留存：</strong>由 FDR/CVR 记录飞行过程中的关键参数（时间、速度、高度、飞机倾斜度、发动机参数等）与驾驶舱话音数据，确保机上数据安全留存。</li>
                <li><strong>2）机载主动感知预警：</strong>通感算一体机载感知预警系统融合通信与感知能力，获取航空器位置与轨迹信息，并在异常场景触发预警（动态示例中以节点高亮/拖尾表现）。</li>
                <li><strong>3）告警与状态上报：</strong>将机载侧告警与状态信息通过 5G ATG / HTS 卫星链路快速同步到地面专家组与推演系统，支撑地面实时重构与决策推演启动。</li>
                <li><strong>4）协同处置承接：</strong>接收地面专家组/推演系统形成的处置方案与指令，在机组侧执行/确认并反馈，形成处置闭环（控制流在动态示例中体现）。</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">关联关系：</div>
              <ul class="cb-detail-list">
                <li><strong>与链路元素连接：</strong>通过 5G ATG 链路与 HTS 卫星链路实现空地双向同步传输（动态示例明确出现“5G ATG/HTS”链路）。</li>
                <li><strong>与地面元素连接：</strong>上行数据流进入地面专家组与体系推演系统；下行控制流由地面系统分发到相关部门并回到机组侧执行。</li>
                <li><strong>与星基元素连接：</strong>在卫星链路场景下，通过星—机通信完成数据中继与广域覆盖支撑（静态架构中明确卫星-飞机链路关系）。</li>
              </ul>
            </div>
            <div class="cb-detail-section">
              <div class="cb-detail-sectitle">在体系中的作用：</div>
              <p class="cb-detail-para">
                机载监测与云匣子协同终端是云匣子体系“主动预警”的起点：把机载侧的实时监测、感知与告警转化为可传输的数据包，并通过空地链路驱动地面侧的场景重构、专家研判与推演决策，从而实现“感知—识别—处置”的全链条闭环。
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';
import * as Cesium from 'cesium';
import CesiumViewport from '../components/CesiumViewport.vue';
import { buildFlightPathFromRunways, buildSampledPositionFromPath } from '../utils/flightPath';
import mapPopup from '../assets/staticPage/map_popup.png';
import warnIcon from '../assets/staticPage/map_warnicon.png';

const boeingModelUrl = new URL('../assets/model/boeing_737.glb', import.meta.url).href;
const activeTab = ref('base');
const activeTool = ref('');
const mapMode = ref('plane');
const showWarn = ref(false);
const vpStatic = ref(null);
const phaseText = ref('起飞');
const levelText = ref('机场级');
const planeMoveEnabled = ref(false);
const planeProgress = ref(0);
let _planeMoveRaf = 0;
const planePathEnabled = ref(false);
let _tickUnsub = null;

const planeScreenInfo = ref(null);
const activePopup = ref(null);
const detailModalType = ref(null); // 'star' | 'ground' | 'airborne' | null
const POPUP_CAMERA_HEIGHT_THRESHOLD = 500000;

/** 运行模块七大模块标题与说明（点击「点击查看详细信息」时高亮飞机并显示此内容） */
const MODULE_DESCRIPTIONS = [
  { title: '1，数据采集系统', content: '记录民用航空器飞行数据和舱音数据。' },
  { title: '2，通感算一体机载感知预警系统', content: '融合通信和感知能力，获得航空器位置和轨迹信息。' },
  { title: '3，HTS/5G ATG 通信系统', content: '实现飞机数据和地面的双向同步传输。' },
  { title: '4，地面飞行场景实时重构系统', content: '识别潜在安全隐患，为突发紧急场景下地面实时获取航空器安全态势提供数据分析手段。' },
  { title: '5，地面运营控制中心应急专家组系统', content: '专家组讨论直接制定应急处置方案，并提出相关意见。' },
  { title: '6，体系应急决策推演系统', content: '基于航空器风险状态生成动态决策方案，模拟处置过程并提供推演结果。' },
  { title: '7，应急处置系统', content: '协调机组、航司、空管、机场等应急部门，实现紧急事态的下达和通知。' }
];
const selectedModuleIndex = ref(null);
const moduleHighlightScreen = ref(null);

function openModuleHighlight(index) {
  selectedModuleIndex.value = index;
  vpStatic.value?.setModuleHighlight?.(index);
  vpStatic.value?.flyToModuleCube?.(20);
}
function closeModuleHighlight() {
  selectedModuleIndex.value = null;
  moduleHighlightScreen.value = null;
  vpStatic.value?.setModuleHighlight?.(null);
}
function onModuleHighlightScreen(pos) {
  if (selectedModuleIndex.value !== null) moduleHighlightScreen.value = pos;
}
const moduleHighlightPopupStyle = computed(() => {
  const s = moduleHighlightScreen.value;
  if (!s) return {};
  const offsetX = 14;
  const offsetY = 8;
  return { transform: `translate(${s.x + offsetX}px, ${s.y + offsetY}px)` };
});
const moduleHighlightTitle = computed(() => {
  const i = selectedModuleIndex.value;
  return i !== null && MODULE_DESCRIPTIONS[i] ? MODULE_DESCRIPTIONS[i].title : '';
});
const moduleHighlightContent = computed(() => {
  const i = selectedModuleIndex.value;
  return i !== null && MODULE_DESCRIPTIONS[i] ? MODULE_DESCRIPTIONS[i].content : '';
});

/** 地图标点配置（来自 units.json），分组后供地面弹窗列表使用 */
const unitsConfig = ref(null);
/** 链路关联配置（来自 links.json），交互关系 tab 与地图曲线数据源 */
const linksConfig = ref(null);
/** 当前选中的关联 id，用于显示对应链路并高亮该项；再次点击同一项则隐藏 */
const selectedRelationId = ref(null);
function toggleRelationDetail(relationId) {
  selectedRelationId.value = selectedRelationId.value === relationId ? null : relationId;
}
const unitsGroups = computed(() => {
  const cfg = unitsConfig.value;
  if (!cfg) return [];
  const groups = [];
  const ground = cfg.ground;
  if (ground?.clusters?.length) {
    ground.clusters.forEach((c) => {
      groups.push({ name: c.name, units: c.units || [] });
    });
  }
  const star = cfg.space?.star_based;
  if (star?.length) {
    groups.push({ name: '星基元素', units: star });
  }
  return groups;
});

function openDetailModal(kind) {
  detailModalType.value = kind;
}
function closeDetailModal() {
  detailModalType.value = null;
}
const detailModalTitle = computed(() => {
  const t = detailModalType.value;
  if (t === 'star') return '星基元素 - 详细信息';
  if (t === 'ground') return '地面元素 - 详细信息';
  if (t === 'airborne') return '机载元素 - 详细信息';
  return '';
});

function onMarkerClick(payload) {
  activePopup.value = payload;
}
function onMarkerMove(p) {
  if (activePopup.value) activePopup.value.screen = { x: p.x, y: p.y };
}
function closePopup() {
  activePopup.value = null;
  vpStatic.value?.clearActiveMarker?.();
}
const popupStyle = computed(() => {
  const s = activePopup.value?.screen;
  if (!s) return { position: 'fixed', right: '16px', top: '80px' };
  return { position: 'fixed', left: `${s.x + 12}px`, top: `${s.y - 12}px` };
}); // 相机高度 > 500km 时隐藏 popup，显示航迹线+起点

function onPlaneScreenInfo(info) {
  planeScreenInfo.value = info;
}

const showPlanePopup = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return false;
  return info.cameraHeight != null && info.cameraHeight <= POPUP_CAMERA_HEIGHT_THRESHOLD;
});

const planePopupStyle = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return {};
  const offsetX = 14;
  const offsetY = 8;
  return {
    transform: `translate(${info.x + offsetX}px, ${info.y + offsetY}px)`
  };
});

const planeEnvText = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return '—';
  const h = info.alt;
  if (h < 100) return '起飞/滑跑';
  if (h < 3000) return '爬升';
  if (h < 8000) return '巡航';
  return '进近/下降';
});

const FOLLOW_RANGE_M = 400;
const FOLLOW_UP_M = 60;
let _camPos = null;

const lerpCartesian = (a, b, t) => {
  return Cesium.Cartesian3.add(
    Cesium.Cartesian3.multiplyByScalar(a, 1 - t, new Cesium.Cartesian3()),
    Cesium.Cartesian3.multiplyByScalar(b, t, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
};

const followPlaneOnce = () => {
  const viewer = vpStatic.value?.getViewer?.();
  const plane = vpStatic.value?.getPlaneEntity?.();
  if (!viewer || !plane) return;

  const time = viewer.clock.currentTime;
  const p = plane.position?.getValue?.(time);
  const q = plane.orientation?.getValue?.(time);
  if (!p || !q) return;

  const m3 = Cesium.Matrix3.fromQuaternion(q);
  const forwardWC = Cesium.Matrix3.multiplyByVector(m3, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());
  Cesium.Cartesian3.normalize(forwardWC, forwardWC);

  const back = Cesium.Cartesian3.multiplyByScalar(forwardWC, -FOLLOW_RANGE_M, new Cesium.Cartesian3());
  const up = Cesium.Cartesian3.multiplyByScalar(
    Cesium.Cartesian3.normalize(p, new Cesium.Cartesian3()),
    FOLLOW_UP_M,
    new Cesium.Cartesian3()
  );
  const desired = Cesium.Cartesian3.add(
    Cesium.Cartesian3.add(p, back, new Cesium.Cartesian3()),
    up,
    new Cesium.Cartesian3()
  );

  if (!_camPos) _camPos = desired;
  _camPos = lerpCartesian(_camPos, desired, 0.12);

  const dir = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.subtract(p, _camPos, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const right = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(dir, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );
  const upWC = Cesium.Cartesian3.normalize(
    Cesium.Cartesian3.cross(right, dir, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  viewer.camera.setView({
    destination: _camPos,
    orientation: { direction: dir, up: upWC }
  });
};

const togglePlanePath = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;

  planePathEnabled.value = !planePathEnabled.value;

  if (!planePathEnabled.value) {
    viewer.clock.shouldAnimate = false;
    vpStatic.value?.applyPathAnimation?.(null);
    if (_tickUnsub) {
      _tickUnsub();
      _tickUnsub = null;
    }
    viewer.trackedEntity = undefined;
    viewer.scene?.requestRender?.();
    return;
  }

  const { prop, start, stop } = buildSampledPositionFromPath(flightPath, 300);

  vpStatic.value?.applyPathAnimation?.(prop, { trailSeconds: 12 / 50 });

  viewer.clock.startTime = start;
  viewer.clock.stopTime = stop;
  viewer.clock.currentTime = start;
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 0.1; // 仿真 2 倍速，配合 secondsTotal 减半使动画约一半时间跑完
  viewer.clock.shouldAnimate = true;

  const plane = vpStatic.value?.getPlaneEntity?.();
  if (plane) viewer.trackedEntity = plane;

  const onTick = () => viewer.scene?.requestRender?.();
  viewer.clock.onTick.addEventListener(onTick);
  _tickUnsub = () => viewer.clock.onTick.removeEventListener(onTick);
};

const togglePlaneMove = () => {
  planeMoveEnabled.value = !planeMoveEnabled.value;
  if (!planeMoveEnabled.value) {
    if (_planeMoveRaf) cancelAnimationFrame(_planeMoveRaf);
    _planeMoveRaf = 0;
    return;
  }
  const start = performance.now();
  const durationMs = (60000 * 5) / 2; // 总时长减半，动画约 2.5 分钟跑完全程
  const tick = () => {
    if (!planeMoveEnabled.value) return;
    const u = ((performance.now() - start) % durationMs) / durationMs;
    planeProgress.value = u;
    followPlaneOnce();
    _planeMoveRaf = requestAnimationFrame(tick);
  };
  _planeMoveRaf = requestAnimationFrame(tick);
};

let _trailTickBound = false;
let _trailTickViewer = null;

// 跑道贴地点位（唯一数据源 -> buildFlightPathFromRunways）
const startRunway = { a: { lon: 108.742455, lat: 34.439922 }, b: { lon: 108.761345, lat: 34.453589 } };
const endRunway = { a: { lon: 116.430944, lat: 39.473803 }, b: { lon: 116.427175, lat: 39.497722 } };

const flightPath = buildFlightPathFromRunways(startRunway, endRunway, { cruiseAlt: 10000 });

const phaseConfig = {
  takeoff:  { name: '起飞', level: '机场级' },
  climb:    { name: '爬升', level: '区域级' },
  cruise:   { name: '巡航', level: '航路级' },
  descent:  { name: '下降', level: '航路级' },
  approach: { name: '进近', level: '城市级' },
  landing:  { name: '降落', level: '机场级' }
};

const pathPointsForViewer = flightPath;

const phaseIndexMap = computed(() => {
  const len = flightPath.length;
  return {
    takeoff: 0,
    climb: Math.floor(len * 0.12),
    cruise: Math.floor(len * 0.55),
    approach: Math.floor(len * 0.85),
    landing: Math.max(0, len - 2)
  };
});

// --- Trail material for polyline (flowing texture) ---
const PolylineTrailMaterial = (() => {
  const type = 'PolylineTrail';

  const source = `
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      // st.s : along the line [0..1]
      float t = fract(st.s - time);
      // soft head-tail
      float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
      material.diffuse = color.rgb;
      material.alpha = a * color.a;
      return material;
    }
  `;

  if (!Cesium.Material._materialCache.getMaterial(type)) {
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type,
        uniforms: {
          color: new Cesium.Color(0.2, 0.8, 1.0, 0.9),
          time: 0.0,
        },
        source,
      },
      translucent: () => true,
    });
  }

  return { type };
})();

class TrailMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color ?? new Cesium.Color(0.35, 0.9, 1.0, 0.95);
    this.speed = options.speed ?? 0.8;
    this._start = performance.now();
  }

  get isConstant() { return false; }
  get definitionChanged() { return this._definitionChanged; }

  getType(time) { return PolylineTrailMaterial.type; }

  getValue(time, result) {
    if (!result) result = {};
    const t = ((performance.now() - this._start) / 1000) * this.speed;
    result.color = this.color;
    result.time = t;
    return result;
  }

  equals(other) {
    return this === other;
  }
}

const createTrailMaterialProperty = (opts = {}) => new TrailMaterialProperty(opts);

const ROUTE_ENTITY_ID = 'flightRouteXA_BJDX';
const drawFlightRoute = (viewer) => {
  if (!viewer) return;
  // 已存在则不重复添加
  const existed = viewer.entities.getById?.(ROUTE_ENTITY_ID);
  if (existed) return;

  const positions = flightPath.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  viewer.entities.add({
    id: ROUTE_ENTITY_ID,
    polyline: {
      positions,
      width: 2,
      clampToGround: false,
      material: createTrailMaterialProperty({
        color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
        speed: 0.8
      })
    }
  });
  viewer.scene?.requestRender?.();
  // If requestRenderMode is enabled, keep requesting render so animated material updates.
  if (!_trailTickBound) {
    _trailTickBound = true;
    _trailTickViewer = viewer;
    const tick = () => {
      // 仅当这条航线实体仍存在时才持续刷新，避免无意义耗电
      const v = _trailTickViewer;
      if (!v || v.isDestroyed?.()) return;
      const alive = v.entities?.getById?.(ROUTE_ENTITY_ID);
      if (!alive) return;
      v.scene?.requestRender?.();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

const flyZoom = (dir) => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer?.camera) return;

  const cam = viewer.camera;
  // 当前相机世界坐标
  const pos = cam.positionWC;
  // 当前高度用于自适应步长
  const carto = Cesium.Cartographic.fromCartesian(pos);
  const h = Math.max(1, carto.height || 1);

  // 步长：高度越高，一次缩放越大
  const step = Math.max(80, h * 0.18) * 5;

  // 沿视线方向推进/拉远
  const dirWC = Cesium.Cartesian3.normalize(cam.directionWC, new Cesium.Cartesian3());
  const offset = Cesium.Cartesian3.multiplyByScalar(dirWC, dir > 0 ? step : -step, new Cesium.Cartesian3());
  const dest = Cesium.Cartesian3.add(pos, offset, new Cesium.Cartesian3());

  cam.flyTo({
    destination: dest,
    orientation: {
      heading: cam.heading,
      pitch: cam.pitch,
      roll: cam.roll
    },
    duration: 0.6,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
};

const setPhase = (phaseKey) => {
  const cfg = phaseConfig[phaseKey];
  if (!cfg) return;
  phaseText.value = cfg.name;
  levelText.value = cfg.level;
};

const focusPlane = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;
  const plane = viewer.entities.getById('planeEntity');
  if (!plane) return;
  viewer.flyTo(plane, {
    duration: 0.8,
    offset: new Cesium.HeadingPitchRange(
      viewer.camera.heading,
      Cesium.Math.toRadians(-25),
      2500
    )
  });
};

const viewChina = () => {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 6500000.0),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    },
    duration: 1.0,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
};

const onTool = (name) => {
  activeTool.value = name;
  console.log('[StaticTool]', name);
  showWarn.value = false;
  vpStatic.value?.setPlaneFaultFlash?.(false);

  if (name === '起飞') { setPhase('takeoff'); vpStatic.value?.setPlanePoseAtIndex(phaseIndexMap.value.takeoff); }
  if (name === '爬升') { setPhase('climb'); vpStatic.value?.setPlanePoseAtIndex(phaseIndexMap.value.climb); }
  if (name === '巡航') { setPhase('cruise'); vpStatic.value?.setPlanePoseAtIndex(phaseIndexMap.value.cruise); }
  if (name === '进近') { setPhase('approach'); vpStatic.value?.setPlanePoseAtIndex(phaseIndexMap.value.approach); }
  if (name === '降落') { setPhase('landing'); vpStatic.value?.setPlanePoseAtIndex(phaseIndexMap.value.landing); }
  if (['起飞', '爬升', '巡航', '进近', '降落'].includes(name)) {
    const v = vpStatic.value?.getViewer?.();
    const plane = vpStatic.value?.getPlaneEntity?.();
    if (v && plane) v.flyTo(plane, { duration: 0.6 });
  }
  if (name === '巡航故障') {
    showWarn.value = true;
    vpStatic.value?.setPlaneFaultFlash?.(true);
    const v = vpStatic.value?.getViewer?.();
    const plane = vpStatic.value?.getPlaneEntity?.();
    if (v && plane) {
      v.flyTo(plane, {
        duration: 0.8,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 200)
      });
    }
  }
  if (name === '放大') flyZoom(1);
  if (name === '缩小') flyZoom(-1);
  if (name === '飞机') focusPlane();
  if (name === '地面') viewChina();
  if (name === '沿线飞行') togglePlanePath();
};

/** 相机飞行聚焦到指定标点（地面弹窗列表点击） */
function flyToUnit(unit) {
  const viewer = vpStatic.value?.getViewer?.();
  if (!viewer || !unit) return;
  const lon = unit.lon;
  const lat = unit.lat;
  const alt = unit.alt_m ?? 0;
  const camHeight = Math.max(alt + 2000, 5000);
  const destination = Cesium.Cartesian3.fromDegrees(lon, lat, camHeight);
  viewer.camera.flyTo({
    destination,
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    },
    duration: 0.8,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
  });
}

const onMapMode = (m) => {
  mapMode.value = m;
  console.log('[StaticMapMode]', m);

  if (m === 'plane') {
    const viewer = vpStatic.value?.getViewer?.();
    const plane = vpStatic.value?.getPlaneEntity?.();
    if (viewer && plane) {
      viewer.flyTo(plane, {
        duration: 0.8,
        offset: new Cesium.HeadingPitchRange(
          viewer.camera.heading,
          Cesium.Math.toRadians(-25),
          200
        )
      });
    }
  }

  if (m === 'ground') {
    const viewer = vpStatic.value?.getViewer?.();
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(105.0, 35.0, 6500000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0
        },
        duration: 1.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
      });
    }
  }
};

watch(activeTab, (tab) => {
  if (tab !== 'modules') closeModuleHighlight();
});

onMounted(() => {
  // CesiumViewport 内部 onMounted 才创建 viewer，这里用 raf 等待一次就绪
  const tick = () => {
    const viewer = vpStatic.value?.getViewer?.();
    if (viewer) {
      drawFlightRoute(viewer);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // 加载地图标点配置与链路关联配置
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const baseUrl = base ? `${base}/` : '/';
  fetch(`${baseUrl}config/units.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) unitsConfig.value = data;
    })
    .catch(() => {});
  fetch(`${baseUrl}config/links.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) linksConfig.value = data;
    })
    .catch(() => {});
});

onBeforeUnmount(() => {
  planeScreenInfo.value = null;
});
</script>

<style scoped>
/* 交互关系 tab：选中项高亮，便于识别当前显示的链路 */
.cb-item.cb-item--relation-selected {
  background: rgba(0, 80, 140, 0.25);
  border-left: 3px solid #ffd54a;
  padding-left: 10px;
  margin-left: -10px;
  border-radius: 4px;
}
.cb-item.cb-item--relation-selected .cb-link {
  color: #7dd3fc;
  font-weight: 600;
}

/* 让 cb-viewport 与地图层铺满可用高度，地图铺满 viewport */
.cb-viewport {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cb-viewport .cb-cesium-layer {
  flex: 1;
  min-height: 0;
  position: relative;
  inset: unset;
}
.cb-viewport .cb-cesium-layer :deep(.cesium-container) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cb-cesium-layer--with-popup {
  position: relative;
}
.cb-module-highlight-popup {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 100;
  min-width: 200px;
  max-width: 280px;
  padding: 0;
  background: rgba(0, 24, 48, 0.95);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 8px;
  font-size: 12px;
  color: #e0f0ff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
}
.cb-module-highlight-popup-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 600;
}
.cb-module-highlight-popup-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.cb-module-highlight-popup-bd {
  padding: 10px 12px;
  line-height: 1.5;
  color: rgba(224, 240, 255, 0.95);
}

.cb-plane-follow-popup {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  min-width: 140px;
  padding: 6px 10px;
  background: rgba(0, 20, 40, 0.92);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 6px;
  font-size: 12px;
  color: #e0f0ff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.cb-plane-follow-popup-hd {
  font-weight: 600;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255,255,255,0.15);
}
.cb-plane-follow-popup-bd {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cb-plane-follow-row {
  white-space: nowrap;
}
.marker-popup {
  z-index: 100;
  min-width: 200px;
  padding: 0;
  background: rgba(0, 20, 40, 0.95);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 8px;
  font-size: 13px;
  color: #e0f0ff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.marker-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.marker-popup-title {
  font-weight: 600;
}
.marker-popup-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.marker-popup-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 地面模式：地图标点列表弹窗（无背景图，自设计样式） */
.cb-map-popup--units {
  background-image: none;
  background: rgba(0, 24, 48, 0.96);
  border: 1px solid rgba(100, 180, 255, 0.45);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  min-width: 240px;
  max-width: 280px;
}
.cb-map-popup-units-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  font-size: 13px;
  color: #e0f0ff;
}
.cb-map-popup-units-close {
  opacity: 0.75;
  cursor: default;
  font-size: 16px;
}
.cb-map-popup--units .cb-float-bd.cb-units-list-bd {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px 0;
  background: transparent;
}
.cb-map-popup--units .cb-units-group {
  margin-bottom: 12px;
}
.cb-map-popup--units .cb-units-group:last-child {
  margin-bottom: 0;
}
.cb-map-popup--units .cb-units-group-title {
  color: #ffd54a;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  padding: 0 12px;
}
.cb-map-popup--units .cb-units-item {
  padding: 6px 12px;
  font-size: 12px;
  color: #e0f0ff;
  cursor: pointer;
  border-left: 2px solid transparent;
}
.cb-map-popup--units .cb-units-item:hover {
  background: rgba(100, 180, 255, 0.12);
  border-left-color: rgba(100, 180, 255, 0.6);
}
.cb-map-popup--units .cb-units-empty {
  padding: 12px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

/* 地图标点 + 单元详情弹窗 滚动条统一样式 */
.cb-map-popup--units .cb-float-bd.cb-units-list-bd,
.cb-detail-modal-bd {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 180, 255, 0.55) rgba(255, 255, 255, 0.06);
}
.cb-map-popup--units .cb-float-bd.cb-units-list-bd::-webkit-scrollbar,
.cb-detail-modal-bd::-webkit-scrollbar {
  width: 6px;
}
.cb-map-popup--units .cb-float-bd.cb-units-list-bd::-webkit-scrollbar-track,
.cb-detail-modal-bd::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}
.cb-map-popup--units .cb-float-bd.cb-units-list-bd::-webkit-scrollbar-thumb,
.cb-detail-modal-bd::-webkit-scrollbar-thumb {
  background: rgba(100, 180, 255, 0.5);
  border-radius: 3px;
}
.cb-map-popup--units .cb-float-bd.cb-units-list-bd::-webkit-scrollbar-thumb:hover,
.cb-detail-modal-bd::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 180, 255, 0.75);
}

/* 单元详情弹窗（与 marker-popup / cb-warn 风格统一） */
.cb-detail-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.cb-detail-modal {
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: rgba(0, 20, 40, 0.95);
  border: 1px solid rgba(100, 180, 255, 0.5);
  border-radius: 8px;
  font-size: 13px;
  color: #e0f0ff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.cb-detail-modal-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}
.cb-detail-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e0f0ff;
}
.cb-detail-modal-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 22px;
  cursor: pointer;
  padding: 0 6px;
  line-height: 1;
}
.cb-detail-modal-close:hover {
  color: #fff;
}
.cb-detail-modal-bd {
  padding: 14px 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cb-detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cb-detail-label {
  color: #ffd54a;
  font-weight: 600;
}
.cb-detail-value {
  color: #e0f0ff;
}
.cb-detail-sectitle {
  color: #ffd54a;
  font-weight: 600;
  margin-bottom: 2px;
}
.cb-detail-para {
  margin: 0;
  line-height: 1.6;
  color: rgba(224, 240, 255, 0.95);
}
.cb-detail-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.55;
  color: rgba(224, 240, 255, 0.95);
}
.cb-detail-list li {
  margin-bottom: 6px;
}
.cb-detail-list li:last-child {
  margin-bottom: 0;
}
.cb-detail-list li strong {
  color: #e0f0ff;
  font-weight: 600;
}
.cb-detail-list--inline {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.cb-detail-list--inline li::before {
  content: '·';
  margin-right: 6px;
  color: #ffd54a;
}
</style>
