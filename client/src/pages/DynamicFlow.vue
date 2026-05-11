
<template>
  <header class="cb-topbar">
    <div class="cb-brand">
      <img class="cb-top-icon" src="../assets/staticPage/top_left_icon.png" alt="logo" />
      <span class="cb-top-title">云匣子系统可视化展示</span>
      <div class="cb-tabs">
        <RouterLink class="cb-tab" to="/">静态架构</RouterLink>
        <div class="cb-tab active">动态交互</div>
      </div>
    </div>
  </header>

  <div class="cb-wrap cb-wrap--dynamic">
    <section
      ref="scenePanelRef"
      class="cb-scene-bar cb-scene-panel cb-scene-panel--overlay"
    >
      <div v-if="!isCompare" class="cb-scene-node">当前节点：{{ currentNodeName }}</div>
      <div class="cb-scene-head">
        <div class="cb-scene-title">
          <img class="cb-scene-title-icon" :src="dvTitleIconLeft" alt="" />
          <span class="cb-scene-title-text">场景选择</span>
        </div>
        <div v-if="isCompare" class="cb-scene-global-playback">
          <button type="button" class="cb-action-btn" @click="toggleGlobalComparePlay">
            {{ compareGlobalTimelinePlaying ? '⏸ 全局暂停' : '▶ 全局播放' }}
          </button>
          <button type="button" class="cb-action-btn ghost" @click="resetCompareAll">⟲ 全局复位</button>
        </div>
        <div class="cb-scene-current" :style="{ backgroundImage: `url(${dvTitleBkRight})` }">
          <span class="cb-scene-current-text">当前：{{ currentScenarioName }}</span>
        </div>
        <div class="cb-scene-mode">
          <img class="cb-scene-mode-icon" :src="dvModeIcon" alt="" />
          <span class="cb-scene-mode-text">模式：{{ isCompare ? '双屏对比' : '单屏演示' }}</span>
        </div>
      </div>
      <div class="cb-scene-body">
        <div class="cb-scene-btns cb-scene-actions">
          <button
            v-for="item in scenarios"
            :key="item.key"
            class="cb-action-btn"
            :class="{ active: activeScenario === item.key }"
            type="button"
            @click="loadScenario(item.key)"
          >
            {{ item.name }}
          </button>
        </div>
        <button class="cb-scene-switch cb-action-btn" :class="{ active: isCompare }" type="button" @click="toggleCompare">
          切换：{{ isCompare ? '双屏' : '单屏' }}
        </button>
      </div>
    </section>

    <div class="cb-main cb-main--screen">
      <div class="cb-grid cb-grid--dynamic cb-dv-mainrow cb-dv-mainrow--screen">
        <ViewerStage
          :isCompare="isCompare"
          :use-single-iframe="!isCompare && useSingleMapIframe"
          :single-iframe-bridge="!isCompare && useSingleMapIframe ? singleIframeBridgeRef : null"
          :single-iframe-mount-key="singleIframeMountKey"
          :compare-iframe-mount-key="compareIframeMountKey"
          :skip-relation-node-focus="!isCompare"
          :compare-bridge="compareBridgeRef"
          :bindVpSingle="bindVpSingle"
          :model-url="boeingModelUrl"
          :units-url="currentUnitsUrl"
          :static-ground-merge-url="staticGroundMergeUrl"
          :links-url="currentLinksUrl"
          :auto-focus="true"
          :path-points="pathPointsForViewer"
          :path-progress="pathProgressForViewerStage"
          :follow-path="true"
          :dep-airport-label="depAirportLabel"
          :arr-airport-label="arrAirportLabel"
          :visible-relation-id="null"
          :visible-relation-ids-left="visibleRelationIdsLeft"
          :visible-relation-ids-right="visibleRelationIdsRight"
          :visible-unit-cluster-ids-left="visibleUnitClusterIdsLeft"
          :visible-unit-cluster-ids-right="visibleUnitClusterIdsRight"
          @marker-click="onMarkerClick"
          @marker-move="onMarkerMove"
          @marker-close="onMarkerClose"
          @plane-screen-info="onPlaneScreenInfo"
          @plane-billboard-click="onPlaneBillboardClick"
        >
          <template #header></template>

          <template #single-iframe-left-overlay>
            <div class="cb-compare-side-overlay-inner">
              <div
                v-if="narrativeTransferOverlaySingle"
                class="cb-narrative-transfer-overlay"
                :style="{ top: narrativeTransferOverlayTopPx + 'px' }"
                role="status"
              >
                <div class="cb-narrative-transfer-head">
                  <span class="cb-narrative-transfer-side">{{ narrativeTransferOverlaySingle.sideLabel }}</span>
                  <button
                    v-if="narrativeTransferOverlaySingle.mode === 'preview'"
                    class="cb-narrative-transfer-close"
                    type="button"
                    aria-label="关闭链路传递信息"
                    @click.stop="closeNarrativeTransferOverlay('yes')"
                  >
                    ×
                  </button>
                </div>
                <div class="cb-narrative-transfer-title-line">
                  <span class="cb-narrative-transfer-time-badge">{{ narrativeTransferOverlaySingle.timeLabel }}</span>
                  <span class="cb-narrative-transfer-title-text">｜ {{ narrativeTransferOverlaySingle.title }}</span>
                </div>
                <div class="cb-narrative-transfer-scroll" tabindex="0">
                  <ul class="cb-narrative-transfer-list">
                    <li
                      v-for="row in narrativeTransferOverlaySingle.rows"
                      :key="'single-transfer-overlay-' + row.id"
                      class="cb-narrative-transfer-row"
                    >
                      <div class="cb-narrative-transfer-route">
                        <span class="cb-narrative-transfer-kind">
                          {{ row.flowLabel || (row.kind === 'control' ? '控制流' : '信息流') }}
                        </span>
                        <span>{{ row.fromLabel }} → {{ row.toLabel }}</span>
                      </div>
                      <div class="cb-narrative-transfer-payload">传递内容：{{ row.payload }}</div>
                    </li>
                  </ul>
                  <div v-if="narrativeTransferOverlaySingle.restCount" class="cb-narrative-transfer-more">
                    其余 {{ narrativeTransferOverlaySingle.restCount }} 条已在右下角详情中展示
                  </div>
                </div>
              </div>
              <div class="cb-split-hint">双屏对比（有/无云匣子）｜全局播放双机同飞；侧栏各自 T+</div>
              <FloatingCard
                id="disposalFloatingCardNo"
                :card="displayCardYes ? { ...displayCardYes, phase: '有云匣子' } : {}"
                :is-standby="!displayCardYes"
                :standby-content="floatingStandbyContentYes"
                :timeline-items="timelineItemsYes"
                :collapsed="floatingCardNoCollapsed"
                :detailsOpen="detailsOpenNo"
                keyPrefix="no-"
                preview-side="yes"
                :can-preview="canPreviewKeyframes"
                @toggle-collapsed="floatingCardNoCollapsed = !floatingCardNoCollapsed"
                @toggle-details="detailsOpenNo = !detailsOpenNo"
                @preview-keyframe="previewKeyframe"
                @focus-transfer="focusTransferRelation"
                @focus-transfer-node="focusTransferNode"
              />
              <div
                v-show="compareFaultAlertFiredYes"
                class="cb-compare-fault-alert"
                role="status"
              >
                {{ compareFaultAlertTextYes }}
              </div>
              <TimelineDock
                embed
                embed-title-main="时间轴"
                embed-subtitle="有云匣子侧"
                dock-title="时间轴 · 有云匣子侧"
                v-model.number="t"
                :maxTime="timelineMaxSingle"
                :step="0.1"
                :milestones="singleMilestones"
                :keyframeMarks="singleKeyframeMarks"
                :dvTitleIconLeft="dvTitleIconLeft"
                :playing="singleTimelinePlaying"
                :currentTimeLabel="currentTimeLabel"
                :isCompare="true"
                per-side-time-marker="yes"
                :marker-yes-demo-t="t"
                :marker-no-demo-t="t"
                :markerNoAlign="markerNoAlign"
                :markerNoLeft="markerNoLeft"
                :markerNoTitle="markerNoTitle"
                :markerNoLabel="markerNoLabel"
                :markerYesAlign="markerYesAlign"
                :markerYesLeft="markerYesLeft"
                :markerYesTitle="markerYesTitle"
                :markerYesLabel="markerYesLabel"
                :pulsing-milestone="pulsingMilestoneSingle"
                @togglePlay="togglePlay"
                @reset="onReset"
                @scrub="onScrub"
              />
            </div>
          </template>

          <template #single-overlays>
            <!-- 单屏原生 Cesium：飞机 popup；单屏 iframe 模式不展示 -->
            <div v-show="!useSingleMapIframe" class="cb-dv-cesium-layer-with-popup">
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
            </div>
            <div class="cb-symbols cb-symbols--single">
              <button v-show="!useSingleMapIframe" class="cb-dv-symbtn" :class="{ active: activeSymbol === 'plane' }" @click="onPlaneButtonClick">飞机</button>
              <button v-show="!useSingleMapIframe" class="cb-dv-symbtn ghost" type="button" @click.stop="togglePlanePath">{{ planePathEnabled ? '取消跟随' : '跟随飞机' }}</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'flow' }" @click="selectSymbol('flow')">• 信息流</button>
              <button class="cb-dv-symbtn" :class="{ active: activeSymbol === 'control' }" @click="selectSymbol('control')">➜ 控制流</button>
            </div>
            <div class="cb-overlay-plane" v-show="activeSymbol === 'plane'"></div>
            <div class="cb-overlay-flow" v-show="activeSymbol === 'flow'"></div>
            <div class="cb-overlay-control" v-show="activeSymbol === 'control'"></div>
            <div
              v-if="narrativeTransferOverlaySingle && !useSingleMapIframe"
              class="cb-narrative-transfer-overlay"
              :style="{ top: narrativeTransferOverlayTopPx + 'px' }"
              role="status"
            >
              <div class="cb-narrative-transfer-head">
                <span class="cb-narrative-transfer-side">{{ narrativeTransferOverlaySingle.sideLabel }}</span>
                <button
                  v-if="narrativeTransferOverlaySingle.mode === 'preview'"
                  class="cb-narrative-transfer-close"
                  type="button"
                  aria-label="关闭链路传递信息"
                  @click.stop="closeNarrativeTransferOverlay('yes')"
                >
                  ×
                </button>
              </div>
              <div class="cb-narrative-transfer-title-line">
                <span class="cb-narrative-transfer-time-badge">{{ narrativeTransferOverlaySingle.timeLabel }}</span>
                <span class="cb-narrative-transfer-title-text">｜ {{ narrativeTransferOverlaySingle.title }}</span>
              </div>
              <div class="cb-narrative-transfer-scroll" tabindex="0">
                <ul class="cb-narrative-transfer-list">
                  <li
                    v-for="row in narrativeTransferOverlaySingle.rows"
                    :key="'single-transfer-overlay-' + row.id"
                    class="cb-narrative-transfer-row"
                  >
                    <div class="cb-narrative-transfer-route">
                      <span class="cb-narrative-transfer-kind">
                        {{ row.flowLabel || (row.kind === 'control' ? '控制流' : '信息流') }}
                      </span>
                      <span>{{ row.fromLabel }} → {{ row.toLabel }}</span>
                    </div>
                    <div class="cb-narrative-transfer-payload">传递内容：{{ row.payload }}</div>
                  </li>
                </ul>
                <div v-if="narrativeTransferOverlaySingle.restCount" class="cb-narrative-transfer-more">
                  其余 {{ narrativeTransferOverlaySingle.restCount }} 条已在右下角详情中展示
                </div>
              </div>
            </div>
            <FloatingCard
              v-if="!useSingleMapIframe"
              id="disposalFloatingCard"
              :card="displayCardYes || {}"
              :is-standby="!displayCardYes"
              :standby-content="floatingStandbyContentYes"
              :timeline-items="timelineItemsYes"
              :collapsed="floatingCardCollapsed"
              :detailsOpen="detailsOpen"
              keyPrefix=""
              preview-side="yes"
              :can-preview="canPreviewKeyframes"
              @toggle-collapsed="floatingCardCollapsed = !floatingCardCollapsed"
              @toggle-details="detailsOpen = !detailsOpen"
              @preview-keyframe="previewKeyframe"
              @focus-transfer="focusTransferRelation"
              @focus-transfer-node="focusTransferNode"
            />
            <div class="cb-infobox cb-dv-infobox" v-show="infoBoxVisible">
              <div class="hd">
                <div class="title">{{ infoBoxTitle }}</div>
                <button class="btn-icon" type="button" @click="hideInfoBox">×</button>
              </div>
              <div class="bd">
                <ul>
                  <li v-for="(x, i) in infoBoxLines" :key="i">{{ x }}</li>
                </ul>
                <div class="compare" v-if="isCompare && infoBoxCompareLines.length">
                  <div class="small">对比信息（示意）</div>
                  <ul>
                    <li v-for="(x, i) in infoBoxCompareLines" :key="i">{{ x }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </template>

          <template #compare-left-overlay>
            <div class="cb-compare-side-overlay-inner">
              <div
                v-if="narrativeTransferOverlayYes"
                class="cb-narrative-transfer-overlay cb-narrative-transfer-overlay--compare"
                :style="{ top: narrativeTransferOverlayTopPx + 'px' }"
                role="status"
              >
                <div class="cb-narrative-transfer-head">
                  <span class="cb-narrative-transfer-side">{{ narrativeTransferOverlayYes.sideLabel }}</span>
                  <button
                    v-if="narrativeTransferOverlayYes.mode === 'preview'"
                    class="cb-narrative-transfer-close"
                    type="button"
                    aria-label="关闭链路传递信息"
                    @click.stop="closeNarrativeTransferOverlay('yes')"
                  >
                    ×
                  </button>
                </div>
                <div class="cb-narrative-transfer-title-line">
                  <span class="cb-narrative-transfer-time-badge">{{ narrativeTransferOverlayYes.timeLabel }}</span>
                  <span class="cb-narrative-transfer-title-text">｜ {{ narrativeTransferOverlayYes.title }}</span>
                </div>
                <div class="cb-narrative-transfer-scroll" tabindex="0">
                  <ul class="cb-narrative-transfer-list">
                    <li
                      v-for="row in narrativeTransferOverlayYes.rows"
                      :key="'yes-transfer-overlay-' + row.id"
                      class="cb-narrative-transfer-row"
                    >
                      <div class="cb-narrative-transfer-route">
                        <span class="cb-narrative-transfer-kind">
                          {{ row.flowLabel || (row.kind === 'control' ? '控制流' : '信息流') }}
                        </span>
                        <span>{{ row.fromLabel }} → {{ row.toLabel }}</span>
                      </div>
                      <div class="cb-narrative-transfer-payload">传递内容：{{ row.payload }}</div>
                    </li>
                  </ul>
                  <div v-if="narrativeTransferOverlayYes.restCount" class="cb-narrative-transfer-more">
                    其余 {{ narrativeTransferOverlayYes.restCount }} 条已在右下角详情中展示
                  </div>
                </div>
              </div>
              <div class="cb-split-hint">双屏对比（有/无云匣子）｜全局播放双机同飞；侧栏各自 T+</div>
              <FloatingCard
                id="disposalFloatingCardNo"
                :card="displayCardYes ? { ...displayCardYes, phase: '有云匣子' } : {}"
                :is-standby="!displayCardYes"
                :standby-content="floatingStandbyContentYes"
                :timeline-items="timelineItemsYes"
                :collapsed="floatingCardNoCollapsed"
                :detailsOpen="detailsOpenNo"
                keyPrefix="no-"
                preview-side="yes"
                :can-preview="canPreviewKeyframes"
                @toggle-collapsed="floatingCardNoCollapsed = !floatingCardNoCollapsed"
                @toggle-details="detailsOpenNo = !detailsOpenNo"
                @preview-keyframe="previewKeyframe"
                @focus-transfer="focusTransferRelation"
                @focus-transfer-node="focusTransferNode"
              />
              <div
                v-show="compareFaultAlertFiredYes"
                class="cb-compare-fault-alert"
                role="status"
              >
                {{ compareFaultAlertTextYes }}
              </div>
              <TimelineDock
                embed
                embed-title-main="时间轴"
                embed-subtitle="有云匣子侧"
                dock-title="时间轴 · 有云匣子侧"
                v-model.number="tYes"
                :maxTime="timelineMax"
                :step="0.1"
                :milestones="compareMilestonesYes"
                :keyframeMarks="keyframeMarksYes"
                :dvTitleIconLeft="dvTitleIconLeft"
                :playing="compareLeftTimelinePlaying"
                :currentTimeLabel="currentTimeLabelYes"
                :isCompare="true"
                per-side-time-marker="yes"
                :marker-yes-demo-t="tYes"
                :marker-no-demo-t="tNo"
                :markerNoAlign="markerNoAlign"
                :markerNoLeft="markerNoLeft"
                :markerNoTitle="markerNoTitle"
                :markerNoLabel="markerNoLabel"
                :markerYesAlign="markerYesAlign"
                :markerYesLeft="markerYesLeft"
                :markerYesTitle="markerYesTitle"
                :markerYesLabel="markerYesLabel"
                :pulsing-milestone="pulsingMilestoneYes"
                @togglePlay="toggleCompareSidePlay('left')"
                @reset="resetCompareSide('left')"
                @scrub="onScrubCompareYes"
              />
            </div>
          </template>

          <template #compare-right-overlay>
            <div class="cb-compare-side-overlay-inner">
              <div
                v-if="narrativeTransferOverlayNo"
                class="cb-narrative-transfer-overlay cb-narrative-transfer-overlay--compare"
                :style="{ top: narrativeTransferOverlayTopPx + 'px' }"
                role="status"
              >
                <div class="cb-narrative-transfer-head">
                  <span class="cb-narrative-transfer-side">{{ narrativeTransferOverlayNo.sideLabel }}</span>
                  <button
                    v-if="narrativeTransferOverlayNo.mode === 'preview'"
                    class="cb-narrative-transfer-close"
                    type="button"
                    aria-label="关闭链路传递信息"
                    @click.stop="closeNarrativeTransferOverlay('no')"
                  >
                    ×
                  </button>
                </div>
                <div class="cb-narrative-transfer-title-line">
                  <span class="cb-narrative-transfer-time-badge">{{ narrativeTransferOverlayNo.timeLabel }}</span>
                  <span class="cb-narrative-transfer-title-text">｜ {{ narrativeTransferOverlayNo.title }}</span>
                </div>
                <div class="cb-narrative-transfer-scroll" tabindex="0">
                  <ul class="cb-narrative-transfer-list">
                    <li
                      v-for="row in narrativeTransferOverlayNo.rows"
                      :key="'no-transfer-overlay-' + row.id"
                      class="cb-narrative-transfer-row"
                    >
                      <div class="cb-narrative-transfer-route">
                        <span class="cb-narrative-transfer-kind">
                          {{ row.flowLabel || (row.kind === 'control' ? '控制流' : '信息流') }}
                        </span>
                        <span>{{ row.fromLabel }} → {{ row.toLabel }}</span>
                      </div>
                      <div class="cb-narrative-transfer-payload">传递内容：{{ row.payload }}</div>
                    </li>
                  </ul>
                  <div v-if="narrativeTransferOverlayNo.restCount" class="cb-narrative-transfer-more">
                    其余 {{ narrativeTransferOverlayNo.restCount }} 条已在右下角详情中展示
                  </div>
                </div>
              </div>
              <FloatingCard
                id="disposalFloatingCardYes"
                :card="displayCardNo ? { ...displayCardNo, phase: '无云匣子' } : {}"
                :is-standby="!displayCardNo"
                :standby-content="floatingStandbyContentNo"
                :timeline-items="timelineItemsNo"
                :collapsed="floatingCardYesCollapsed"
                :detailsOpen="detailsOpenYes"
                keyPrefix="yes-"
                preview-side="no"
                :can-preview="canPreviewKeyframes"
                @toggle-collapsed="floatingCardYesCollapsed = !floatingCardYesCollapsed"
                @toggle-details="detailsOpenYes = !detailsOpenYes"
                @preview-keyframe="previewKeyframe"
                @focus-transfer="focusTransferRelation"
                @focus-transfer-node="focusTransferNode"
              />
              <div
                v-show="compareFaultAlertFiredNo"
                class="cb-compare-fault-alert"
                role="status"
              >
                {{ compareFaultAlertTextNo }}
              </div>
              <TimelineDock
                embed
                embed-title-main="时间轴"
                embed-subtitle="无云匣子侧"
                dock-title="时间轴 · 无云匣子侧"
                v-model.number="tNo"
                :maxTime="timelineMax"
                :step="0.1"
                :milestones="compareMilestonesNo"
                :keyframeMarks="keyframeMarksNo"
                :dvTitleIconLeft="dvTitleIconLeft"
                :playing="compareRightTimelinePlaying"
                :currentTimeLabel="currentTimeLabelNo"
                :isCompare="true"
                per-side-time-marker="no"
                :marker-yes-demo-t="tYes"
                :marker-no-demo-t="tNo"
                :markerNoAlign="markerNoAlign"
                :markerNoLeft="markerNoLeft"
                :markerNoTitle="markerNoTitle"
                :markerNoLabel="markerNoLabel"
                :markerYesAlign="markerYesAlign"
                :markerYesLeft="markerYesLeft"
                :markerYesTitle="markerYesTitle"
                :markerYesLabel="markerYesLabel"
                :pulsing-milestone="pulsingMilestoneNo"
                @togglePlay="toggleCompareSidePlay('right')"
                @reset="resetCompareSide('right')"
                @scrub="onScrubCompareNo"
              />
            </div>
          </template>

          <template #compare-map-overlays>
            <div class="cb-infobox cb-dv-infobox" v-show="infoBoxVisible">
              <div class="hd">
                <div class="title">{{ infoBoxTitle }}</div>
                <button class="btn-icon" type="button" @click="hideInfoBox">×</button>
              </div>
              <div class="bd">
                <ul>
                  <li v-for="(x, i) in infoBoxLines" :key="'map-' + i">{{ x }}</li>
                </ul>
                <div class="compare" v-if="isCompare && infoBoxCompareLines.length">
                  <div class="small">对比信息（示意）</div>
                  <ul>
                    <li v-for="(x, i) in infoBoxCompareLines" :key="'map-c-' + i">{{ x }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </template>
        </ViewerStage>

        <!-- 机载弹窗（点击飞机 billboard 显示，随飞机位置同步，位于 billboard 右上角） -->
        <div v-if="showAirbornePopup && planeScreenInfo" class="marker-popup airborne-popup cb-airborne-popup-follow" :style="airbornePopupStyle">
          <div class="marker-popup-header">
            <div class="marker-popup-title">机载</div>
            <button type="button" class="marker-popup-close" aria-label="关闭" @click="closeAirbornePopup">×</button>
          </div>
          <div class="marker-popup-body">
            <ul class="airborne-popup-list">
              <li>机组</li>
              <li>国产黑匣子</li>
              <li>通感算一体机载感知预警设备</li>
            </ul>
          </div>
        </div>
        <div v-if="activePopup" class="marker-popup" :style="popupStyle">
          <div class="marker-popup-header">
            <div class="marker-popup-title">{{ activePopup.meta.name }}</div>
            <button type="button" class="marker-popup-close" @click="closePopup">×</button>
          </div>
          <div class="marker-popup-body">
            <div class="marker-popup-meta">
              <span class="marker-popup-badge">{{ activePopup.meta.infoSource || '节点介绍' }}</span>
              <span class="marker-popup-type">类型：{{ activePopup.meta.typeLabel || activePopup.meta.type }}</span>
            </div>
            <div class="marker-popup-desc">{{ activePopup.meta.info || '该节点用于展示其在"云匣子"体系中的位置与作用。' }}</div>
          </div>
        </div>

      </div>

      <TimelineDock
        v-if="!isCompare && !useSingleMapIframe"
        v-model.number="t"
        :maxTime="timelineMaxSingle"
        :step="0.1"
        :milestones="singleMilestones"
        :keyframeMarks="singleKeyframeMarks"
        :dvTitleIconLeft="dvTitleIconLeft"
        :playing="singleTimelinePlaying"
        :currentTimeLabel="currentTimeLabel"
        :isCompare="false"
        :marker-yes-demo-t="t"
        :marker-no-demo-t="t"
        :markerNoAlign="markerNoAlign"
        :markerNoLeft="markerNoLeft"
        :markerNoTitle="markerNoTitle"
        :markerNoLabel="markerNoLabel"
        :markerYesAlign="markerYesAlign"
        :markerYesLeft="markerYesLeft"
        :markerYesTitle="markerYesTitle"
        :markerYesLabel="markerYesLabel"
        :pulsing-milestone="pulsingMilestoneSingle"
        @togglePlay="togglePlay"
        @reset="onReset"
        @scrub="onScrub"
      />

      <AlertToast
        :visible="alertToastVisible"
        :title="alertTitle"
        :body="alertBody"
        @close="hideAlertToast"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { RouterLink } from 'vue-router';
import * as Cesium from 'cesium';
import { buildFlightPathFromRunways } from '../utils/flightPath';
import { createCompareFrameBridge } from '../utils/compareFrameBridge.js';
import ViewerStage from '../components/ViewerStage.vue';
import FloatingCard from '../components/FloatingCard.vue';
import AlertToast from '../components/AlertToast.vue';
import TimelineDock from '../components/TimelineDock.vue';

const boeingModelUrl = new URL('../assets/model/boeing_737.glb', import.meta.url).href;
const dvTitleIconLeft = new URL('../assets/dynamicViewport/title_icon_left.png', import.meta.url).href;
const dvTitleBkRight = new URL('../assets/dynamicViewport/title_bk_right.png', import.meta.url).href;
const dvModeIcon = new URL('../assets/dynamicViewport/title_icon2.png', import.meta.url).href;
const dvMsgTabSelect = new URL('../assets/dynamicViewport/msgpage_button_select.png', import.meta.url).href;
const dvMsgTabSelected = new URL('../assets/dynamicViewport/msgpage_button_selected.png', import.meta.url).href;

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const engineFailureUnitsUrl = `${baseUrl}/config/dynamic/engine_failure_units.json`;
const dynamicLinksUrl = `${baseUrl}/config/dynamic/engine_failure_links.json`;
const staticGroundMergeUrl = `${baseUrl}/config/units.json`;

/** 由 loadScenario 按 scenario 更新；与默认 engine 资源路径一致 */
const currentUnitsUrl = ref(engineFailureUnitsUrl);
const currentLinksUrl = ref(dynamicLinksUrl);
/** 成功加载后记录 UI 场景 key，用于判断是否需要因场景变化而重挂 iframe */
const lastLoadedScenarioUiKey = ref(null);

function resolveScenarioAssetPath(p) {
  if (p == null || p === '') return null;
  const s = String(p).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  return baseUrl ? `${baseUrl}${path}` : path;
}

const vpSingle = ref(null);

const scenePanelRef = ref(null);
const narrativeTransferOverlayTopPx = ref(112);

const NARRATIVE_TRANSFER_OVERLAY_GAP_PX = 1.5;
const NARRATIVE_TRANSFER_OVERLAY_FALLBACK_TOP_PX = 112;

function updateNarrativeTransferOverlayTop() {
  nextTick(() => {
    const panelEl = scenePanelRef.value;
    if (!panelEl || typeof panelEl.getBoundingClientRect !== 'function') {
      narrativeTransferOverlayTopPx.value = NARRATIVE_TRANSFER_OVERLAY_FALLBACK_TOP_PX;
      return;
    }

    const panelRect = panelEl.getBoundingClientRect();
    const wrapEl = panelEl.closest?.('.cb-wrap--dynamic') ?? document.querySelector?.('.cb-wrap--dynamic');
    if (!wrapEl) {
      narrativeTransferOverlayTopPx.value = NARRATIVE_TRANSFER_OVERLAY_FALLBACK_TOP_PX;
      return;
    }

    /** 与浮窗 position:absolute 的定位父一致：iframe/双屏为 .cb-compare-side-overlay-inner，单屏原生 Cesium 为 .cb-viewer-single */
    const hostEl =
      wrapEl.querySelector('.cb-compare-side-overlay-inner') || wrapEl.querySelector('.cb-viewer-single');

    if (!hostEl || typeof hostEl.getBoundingClientRect !== 'function') {
      narrativeTransferOverlayTopPx.value = NARRATIVE_TRANSFER_OVERLAY_FALLBACK_TOP_PX;
      return;
    }

    const hostRect = hostEl.getBoundingClientRect();
    const nextTop = Math.round(panelRect.bottom - hostRect.top + NARRATIVE_TRANSFER_OVERLAY_GAP_PX);

    narrativeTransferOverlayTopPx.value = nextTop;
  });
}

/** 对比模式：全局 / 左单屏 / 右单屏 互斥；idle 表示未在自动沿线+场景驱动 */
const playbackMode = ref('idle'); // 'idle' | 'global' | 'left' | 'right'

const playingGlobal = ref(false);
const playingLeft = ref(false);
const playingRight = ref(false);

/** 父页整段演示会话（沿线 + 关键点叙事）；与 SIDE_STATE.playing（仅沿线推进）解耦 */
const singlePlaybackSessionActive = ref(false);
const singlePlaybackResumeFromCurrent = ref(false);
const comparePlaybackResumeFromCurrent = ref(false);

/** 关键点预览后继播：沿 demo 轴微推，避免子 iframe parentControlsNarrative 卡在关键点时刻 */
const RESUME_AFTER_KEYFRAME_EPS = 0.05;

/** 子页关键点叙事中（由 SIDE_STATE 同步，仅观察，不参与裁决） */
const narrativeBusyLeft = ref(false);
const narrativeBusyRight = ref(false);
/** 父页全局 narrative 闭环（仅全局自动播放） */
const globalNarrativeRunning = ref(false);
const globalNarrativePendingLeft = ref(false);
const globalNarrativePendingRight = ref(false);
const globalNarrativeStepIndexLeft = ref(null);
const globalNarrativeStepIndexRight = ref(null);
const globalNarrativeRoundDemoT = ref(null);
const compareGlobalDisplayT = ref(0);
const firedMarkStepIndexYes = ref(new Set());
const firedMarkStepIndexNo = ref(new Set());
/** 单屏：有云匣子侧关键点叙事；与双屏左栏语义一致 */
const firedMarkStepIndexSingle = ref(new Set());
/**
 * 本侧是否已通过「将触发/正在触发关键点叙事」的门槛（T+0 首帧在未触发前不展示关键点卡片，仅待命中）。
 * 叙事结束后保持 true，避免暂停时退回待命；与 timelineItems / sync 主逻辑无关。
 */
const hasEnteredKeyframeYes = ref(false);
const hasEnteredKeyframeNo = ref(false);
const hasEnteredKeyframeSingle = ref(false);
/** 展开详情中「高亮+全文」的列表项；与 demo 时间当前段并存，或单独预览未到达之关键点 */
const keyframeListPreviewStepIndexYes = ref(null);
const keyframeListPreviewStepIndexNo = ref(null);
/** 阶段标牌高亮：仅叙事进行中与 TimelineDock 约定 { key, t }；分侧，避免双屏互串 */
const pulsingMilestoneSingle = ref(null);
const pulsingMilestoneYes = ref(null);
const pulsingMilestoneNo = ref(null);
const singleNarrativeRunning = ref(false);
/** 单屏 iframe：父页关键点叙事结束后是否应恢复 play（不依赖 playing，叙事中 SIDE_STATE 可能为 false） */
const singleIframeShouldResumeAfterNarrative = ref(false);
const singleIframeMountKey = ref(0);
const compareIframeMountKey = ref(0);
/** 子页已发 MSG_READY 且父页可发 LOAD_SCENARIO（与 bridge 内 ready 对齐） */
const singleIframeReady = ref(false);
/** 未 READY 或 push 不可发时仅记待办，READY 后用当前 activeScenario 补发 */
const pendingSingleLoadScenario = ref(false);
/** 本轮挂载内首次 READY 须带 force，避免被 lastSingleInitPushKey 挡住首包 */
const singleIframeFirstReadyForce = ref(true);
let singlePlayRafId = 0;
let singlePlayLastTs = 0;

/** 对比：左=有云匣子时间，右=无云匣子时间 */
const tYes = ref(0);
const tNo = ref(0);

/** 对比：左右 iframe 各自沿线进度 0..1 */
const planeProgressLeft = ref(0);
const planeProgressRight = ref(0);

/** 用户拖动对比时间轴后，允许在未巡航时也应用链路（与自动全局播放门控区分） */
const forceSceneUnlocked = ref(false);

/** postMessage 结构化克隆：输出纯对象数组，避免 Proxy/引用在子 iframe 侧不稳定 */
function clonePathPointsForCompareSync() {
  const pts = pathPointsForViewer;
  if (!Array.isArray(pts) || !pts.length) return [];
  return pts.map((p) => ({
    lon: Number(p.lon),
    lat: Number(p.lat),
    alt: p.alt != null ? Number(p.alt) : 0
  }));
}

const planeMoveEnabled = ref(false);
const planeProgress = ref(0);
let _planeMoveRaf = 0;

const planePathEnabled = ref(false);
const activePopup = ref(null);
const showAirbornePopup = ref(false);

function onMarkerClick(payload) {
  if (isCompare.value) return;
  activePopup.value = payload;
}
function onMarkerClose() {
  activePopup.value = null;
}
function onMarkerMove(p) {
  if (isCompare.value) return;
  if (activePopup.value) activePopup.value.screen = { x: p.x, y: p.y };
}

/** iframe 子页经 bridge 回流：只更新浮层，不触发 refresh / push / 重载 */
function onCompareBridgeMarkerClick(p) {
  if (!isCompare.value) return;
  activePopup.value = { meta: p.meta, screen: p.screen };
}
function onCompareBridgeMarkerMove(p) {
  if (!isCompare.value) return;
  if (activePopup.value) activePopup.value.screen = { x: p.x, y: p.y };
}
function closePopup() {
  activePopup.value = null;
  vpSingle.value?.clearActiveMarker?.();
  if (isCompare.value) compareBridgeRef.value?.clearActiveMarkerBoth?.();
}
function onPlaneBillboardClick() {
  showAirbornePopup.value = true;
}
function closeAirbornePopup() {
  showAirbornePopup.value = false;
}
// 与跟随飞机的 popup 同源：用 planeScreenInfo 实时定位，放在 billboard 右上角
const airbornePopupStyle = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return {};
  const offsetX = 4;
  const offsetY = -108;
  return {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${info.x + offsetX}px, ${info.y + offsetY}px)`
  };
});
/** 与 StaticHome 一致：相对标点下移 40px，避免挡住 billboard 文字 */
const MARKER_POPUP_TOP_FROM_SCREEN_Y = -12 + 40;

const popupStyle = computed(() => {
  const s = activePopup.value?.screen;
  if (!s) return { position: 'fixed', right: '16px', top: '80px' };
  return { position: 'fixed', left: `${s.x + 12}px`, top: `${s.y + MARKER_POPUP_TOP_FROM_SCREEN_Y}px` };
});

let _dynTickUnsub1 = null;
let _dynTickUnsub2 = null;

// --- 与 StaticHome 同一套：跑道贴地 -> buildFlightPathFromRunways ---
const startRunway = { a: { lon: 108.742455, lat: 34.439922 }, b: { lon: 108.761345, lat: 34.453589 } };
const endRunway = { a: { lon: 116.430944, lat: 39.473803 }, b: { lon: 116.427175, lat: 39.497722 } };
const depAirportLabel = '西安咸阳国际机场';
const arrAirportLabel = '北京首都国际机场';

const flightPath = buildFlightPathFromRunways(startRunway, endRunway, { cruiseAlt: 10000 });

const ROUTE_ENTITY_ID = 'flightRouteXA_BJDX';
const pathPointsForViewer = flightPath;

/** 与 StaticHome phaseIndexMap.cruise 一致：约 55% 航路点索引 → 归一化为弧长进度 */
const CRUISE_PATH_PROGRESS = Math.min(
  0.95,
  pathPointsForViewer.length > 1
    ? Math.floor(pathPointsForViewer.length * 0.55) / (pathPointsForViewer.length - 1)
    : 0.55
);

const FLIGHT_ANIM_MS = (60000 * 5) / 2; // 与 StaticHome togglePlaneMove 同量级

/**
 * @param {string} side
 * @param {{ parentControlsNarrative?: boolean }} [options] 默认 true：父页裁决 RUN_NARRATIVE（单屏 iframe 与双屏一致）
 */
function buildIframeScenarioPayload(side, options = {}) {
  const parentControlsNarrative = Object.prototype.hasOwnProperty.call(
    options,
    'parentControlsNarrative'
  )
    ? !!options.parentControlsNarrative
    : true;
  const nodes = scenarioNodes.value || [];
  const maxR = isCompare.value
    ? collectMaxRawFromNodes(nodes)
    : hasAnyValidYesKeyframeInNodes(nodes)
      ? maxRawForSide(nodes, 'yes')
      : collectMaxRawFromNodes(nodes);
  const tDisposal = semanticToDemoT(maxR);
  const maxForPayload = isCompare.value
    ? timelineMax.value
    : hasAnyValidYesKeyframeInNodes(nodes)
      ? timelineMaxSingle.value
      : timelineMax.value;
  return {
    side,
    scenarioKey: activeScenario.value,
    timelineMax: maxForPayload,
    maxSemanticRaw: maxR,
    tDisposalEnd: tDisposal,
    pathPoints: clonePathPointsForCompareSync(),
    cruisePathProgress: CRUISE_PATH_PROGRESS,
    flightAnimMs: FLIGHT_ANIM_MS,
    narrativeT0: 10,
    parentControlsNarrative,
    steps: (steps.value || []).map((s) => ({
      t_yes: toFiniteTime(s.t_yes),
      t_no: toFiniteTime(s.t_no),
      activeRelations_yes: Array.isArray(s.activeRelations_yes) ? [...s.activeRelations_yes] : [],
      activeRelations_no: Array.isArray(s.activeRelations_no) ? [...s.activeRelations_no] : []
    })),
    modelUrl: boeingModelUrl,
    unitsUrl: currentUnitsUrl.value,
    staticGroundMergeUrl,
    linksUrl: currentLinksUrl.value,
    depAirportLabel,
    arrAirportLabel
  };
}

let lastCompareInitPushKey = '';
let pushLoadScenarioToIframesCount = 0;
let onReadyHitCount = 0;

/**
 * 显式推送 LOAD_SCENARIO；onReady 去重仅当 fromReady:true 且 frame 对与场景键未变。
 * 双 iframe 静态子页（public/yxz/dual-iframe-poc）MVP 仅消费 timelineMax 等字段，不加载业务 JSON 模型。
 */
function pushLoadScenarioToIframes(opts = {}) {
  const fromReady = !!opts.fromReady;
  const b = compareBridgeRef.value;
  if (!b || !isCompare.value) return;
  const l = b.getFrameId?.('left') ?? '';
  const r = b.getFrameId?.('right') ?? '';
  const key = `${l}|${r}|${activeScenario.value}`;
  if (fromReady && key && key === lastCompareInitPushKey) {
    console.log('[DynamicFlowCompare]', 'skip duplicate init', key);
    return;
  }
  pushLoadScenarioToIframesCount += 1;
  console.log('[DynamicFlowCompare]', 'pushLoadScenarioToIframes', {
    n: pushLoadScenarioToIframesCount,
    key,
    fromReady
  });
  lastCompareInitPushKey = key;
  b.loadScenarioBoth(buildIframeScenarioPayload('left'), buildIframeScenarioPayload('right'));
  console.log('[compare-obs]', b.getObservationSnapshot?.());
}

function clearCompareGlobalNarrativeState() {
  narrativeBusyLeft.value = false;
  narrativeBusyRight.value = false;
  globalNarrativeRunning.value = false;
  globalNarrativePendingLeft.value = false;
  globalNarrativePendingRight.value = false;
  globalNarrativeStepIndexLeft.value = null;
  globalNarrativeStepIndexRight.value = null;
  globalNarrativeRoundDemoT.value = null;
  firedMarkStepIndexYes.value = new Set();
  firedMarkStepIndexNo.value = new Set();
  compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value, 0);
}

function clearPulsingMilestones() {
  pulsingMilestoneSingle.value = null;
  pulsingMilestoneYes.value = null;
  pulsingMilestoneNo.value = null;
}

function clearKeyframeEntryState() {
  hasEnteredKeyframeYes.value = false;
  hasEnteredKeyframeNo.value = false;
  hasEnteredKeyframeSingle.value = false;
  keyframeListPreviewStepIndexYes.value = null;
  keyframeListPreviewStepIndexNo.value = null;
  clearPulsingMilestones();
}

/** 单屏/双屏切换时清空播放态，互不继承时间线与 fired 标记 */
function resetDynamicFlowPlaybackIsolation() {
  t.value = 0;
  tYes.value = 0;
  tNo.value = 0;
  planeProgress.value = 0;
  planeProgressLeft.value = 0;
  planeProgressRight.value = 0;
  playing.value = false;
  playingLeft.value = false;
  playingRight.value = false;
  playingGlobal.value = false;
  narrativeBusyLeft.value = false;
  narrativeBusyRight.value = false;
  singleNarrativeRunning.value = false;
  singleIframeShouldResumeAfterNarrative.value = false;
  globalNarrativeRunning.value = false;
  globalNarrativePendingLeft.value = false;
  globalNarrativePendingRight.value = false;
  globalNarrativeStepIndexLeft.value = null;
  globalNarrativeStepIndexRight.value = null;
  globalNarrativeRoundDemoT.value = null;
  compareGlobalDisplayT.value = 0;
  firedMarkStepIndexSingle.value = new Set();
  firedMarkStepIndexYes.value = new Set();
  firedMarkStepIndexNo.value = new Set();
  compareFaultAlertFiredYes.value = false;
  compareFaultAlertFiredNo.value = false;
  playbackMode.value = 'idle';
  singlePlaybackSessionActive.value = false;
  singlePlaybackResumeFromCurrent.value = false;
  comparePlaybackResumeFromCurrent.value = false;
  forceSceneUnlocked.value = false;
  lastNodeIdNo.value = -1;
  lastNodeIdYes.value = -1;
  lastNodeIdSingle.value = -1;
  clearKeyframeEntryState();
}

function onNarrativeDoneFromChild(p) {
  if (!globalNarrativeRunning.value) return;
  const side = p.side;
  if (side === 'left') pulsingMilestoneYes.value = null;
  else if (side === 'right') pulsingMilestoneNo.value = null;
  const stepIdx = Number(p.stepIndex);
  const stepOk = Number.isFinite(stepIdx);
  if (!stepOk && import.meta.env.DEV) {
    console.warn('[DynamicFlowCompare] NARRATIVE_DONE stepIndex missing/invalid; clearing pending for side', p);
  }
  if (side === 'left') {
    if (globalNarrativePendingLeft.value) {
      globalNarrativePendingLeft.value = false;
      if (stepOk) {
        const sy = new Set(firedMarkStepIndexYes.value);
        sy.add(stepIdx);
        firedMarkStepIndexYes.value = sy;
      }
    }
  } else if (side === 'right') {
    if (globalNarrativePendingRight.value) {
      globalNarrativePendingRight.value = false;
      if (stepOk) {
        const sn = new Set(firedMarkStepIndexNo.value);
        sn.add(stepIdx);
        firedMarkStepIndexNo.value = sn;
      }
    }
  }
  if (!globalNarrativePendingLeft.value && !globalNarrativePendingRight.value) {
    globalNarrativeRunning.value = false;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = null;
    compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value, 0);
    const b = compareBridgeRef.value;
    const mode = playbackMode.value;
    if (import.meta.env.DEV) {
      console.log('[DynamicFlowCompare] resume after narrative', { stepOk, side, mode });
    }
    if (mode === 'global') {
      b?.playBoth?.({ parentControlsNarrative: true });
    } else if (mode === 'left') {
      b?.play?.('left', { parentControlsNarrative: true });
    } else if (mode === 'right') {
      b?.play?.('right', { parentControlsNarrative: true });
    }
  }
}

function onSingleIframeNarrativeDone(p) {
  if (!useSingleMapIframe || isCompare.value) return;
  if (p?.side !== 'left') return;
  pulsingMilestoneSingle.value = null;
  singleNarrativeRunning.value = false;
  const stepIdx = Number(p.stepIndex);
  if (Number.isFinite(stepIdx)) {
    const s = new Set(firedMarkStepIndexSingle.value);
    s.add(stepIdx);
    firedMarkStepIndexSingle.value = s;
  }
  const shouldResume = singleIframeShouldResumeAfterNarrative.value;
  singleIframeShouldResumeAfterNarrative.value = false;
  if (shouldResume) {
    singleIframeBridgeRef.value?.play?.('left', { parentControlsNarrative: true });
  }
}

const compareBridgeRef = shallowRef(
  createCompareFrameBridge({
    onReady() {
      onReadyHitCount += 1;
      const b = compareBridgeRef.value;
      const l = b?.getFrameId?.('left') ?? '';
      const r = b?.getFrameId?.('right') ?? '';
      const key = `${l}|${r}|${activeScenario.value}`;
      console.log('[DynamicFlowCompare]', 'onReady', {
        hit: onReadyHitCount,
        bothReady: b?.isBothReady?.(),
        key
      });
      if (!b?.isBothReady?.()) return;
      pushLoadScenarioToIframes({ fromReady: true });
    },
    onSideState(p) {
      if (p.side === 'left') {
        tYes.value = Number(p.timelineT) || 0;
        planeProgressLeft.value = Number(p.pathProgress) || 0;
        playingLeft.value = !!p.playing;
        narrativeBusyLeft.value = !!p.narrativeBusy;
      } else if (p.side === 'right') {
        tNo.value = Number(p.timelineT) || 0;
        planeProgressRight.value = Number(p.pathProgress) || 0;
        playingRight.value = !!p.playing;
        narrativeBusyRight.value = !!p.narrativeBusy;
      }
      if (isCompare.value && playbackMode.value === 'global') {
        if (globalNarrativeRunning.value && globalNarrativeRoundDemoT.value != null) {
          compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
        } else {
          compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value);
        }
      }
      updateCompareMarkers();
      maybeStartGlobalNarrativeRound();
      markCompareSessionEndedIfReachedEnd();
    },
    onNarrativeDone: onNarrativeDoneFromChild,
    onMarkerClick: onCompareBridgeMarkerClick,
    onMarkerMove: onCompareBridgeMarkerMove
  })
);
compareBridgeRef.value.setPushLoadScenarioCountGetter(() => pushLoadScenarioToIframesCount);

/** 单屏：用 scene-left iframe 替代 CesiumViewport，与双屏有云匣子侧一致 */
const useSingleMapIframe = true;

let lastSingleInitPushKey = '';
let pushLoadScenarioToSingleIframeCount = 0;

function pushLoadScenarioToSingleIframe(opts = {}) {
  const fromReady = !!opts.fromReady;
  const force = !!opts.force;
  if (!useSingleMapIframe || isCompare.value) return;
  const b = singleIframeBridgeRef.value;
  if (!b) {
    if (!fromReady) {
      pendingSingleLoadScenario.value = true;
    }
    return;
  }
  if (!singleIframeReady.value) {
    if (!fromReady) {
      pendingSingleLoadScenario.value = true;
    }
    return;
  }
  const fid = b.getFrameId?.('left') ?? '';
  const key = `${fid}|${activeScenario.value}`;
  if (fromReady && !force && key && key === lastSingleInitPushKey) {
    if (import.meta.env.DEV) {
      console.log('[DynamicFlowSingleIframe]', 'skip duplicate init', key);
    }
    return;
  }
  pendingSingleLoadScenario.value = false;
  pushLoadScenarioToSingleIframeCount += 1;
  lastSingleInitPushKey = key;
  b.loadScenario('left', buildIframeScenarioPayload('left', { parentControlsNarrative: true }));
}

let singleIframeSideStateRaf = 0;
function scheduleSingleIframeRefreshFromSideState() {
  if (singleIframeSideStateRaf) return;
  singleIframeSideStateRaf = requestAnimationFrame(() => {
    singleIframeSideStateRaf = 0;
    refreshAll(false);
  });
}

const singleIframeBridgeRef = shallowRef(
  createCompareFrameBridge({
    onReady(payload) {
      if (!useSingleMapIframe || isCompare.value) return;
      if (payload?.side !== 'left') return;
      singleIframeReady.value = true;
      const b = singleIframeBridgeRef.value;
      const fid = b?.getFrameId?.('left') ?? '';
      const key = `${fid}|${activeScenario.value}`;
      const force = singleIframeFirstReadyForce.value;
      if (force) {
        singleIframeFirstReadyForce.value = false;
      }
      if (import.meta.env.DEV) {
        console.log('[DynamicFlowSingleIframe]', 'onReady', { key, force });
      }
      pushLoadScenarioToSingleIframe({ fromReady: true, force });
    },
    onSideState(p) {
      if (isCompare.value || !useSingleMapIframe) return;
      if (p.side !== 'left') return;
      t.value = Number(p.timelineT) || 0;
      planeProgress.value = Number(p.pathProgress) || 0;
      playing.value = !!p.playing;
      narrativeBusyLeft.value = !!p.narrativeBusy;
      updateCompareMarkers();
      scheduleSingleIframeRefreshFromSideState();
      maybeStartSingleIframeNarrativeRound();

      const maxS = timelineMaxSingle.value;
      if (
        !isCompare.value &&
        singlePlaybackSessionActive.value &&
        !p.playing &&
        !p.narrativeBusy &&
        !singleNarrativeRunning.value &&
        maxS > 0 &&
        t.value >= maxS - 1e-3
      ) {
        singlePlaybackSessionActive.value = false;
        singlePlaybackResumeFromCurrent.value = false;
      }
    },
    onNarrativeDone: onSingleIframeNarrativeDone
  })
);
singleIframeBridgeRef.value.setPushLoadScenarioCountGetter(() => pushLoadScenarioToSingleIframeCount);

// --- Flowing trail material for polyline ---
const ensureTrailMaterial = (() => {
  const type = 'PolylineTrail';
  const source = `
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      float t = fract(st.s - time);
      float a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.75, 1.0, t));
      material.diffuse = color.rgb;
      material.alpha = a * color.a;
      return material;
    }
  `;

  return () => {
    // Cesium 里材质缓存是全局的，注册一次即可
    const cache = Cesium.Material._materialCache;
    if (!cache.getMaterial(type)) {
      cache.addMaterial(type, {
        fabric: {
          type,
          uniforms: {
            color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
            time: 0.0,
          },
          source,
        },
        translucent: () => true,
      });
    }
    return type;
  };
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
  getType(time) { return ensureTrailMaterial(); }
  getValue(time, result) {
    if (!result) result = {};
    const t = ((performance.now() - this._start) / 1000) * this.speed;
    result.color = this.color;
    result.time = t;
    return result;
  }
  equals(other) { return this === other; }
}

const drawFlightRoute = (viewer) => {
  if (!viewer) return;
  if (viewer.entities?.getById?.(ROUTE_ENTITY_ID)) return;

  const positions = flightPath.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  viewer.entities.add({
    id: ROUTE_ENTITY_ID,
    polyline: {
      positions,
      width: 2,
      clampToGround: false,
      material: new TrailMaterialProperty({
        color: new Cesium.Color(0.35, 0.9, 1.0, 0.95),
        speed: 0.8
      })
    }
  });
  viewer.scene?.requestRender?.();
};

const togglePlanePath = () => {
  planePathEnabled.value = !planePathEnabled.value;
  if (!isCompare.value) {
    vpSingle.value?.setPlaneCameraFollow?.(!!planePathEnabled.value);
  }
  if (isCompare.value) pushLoadScenarioToIframes();
};

// 全局渲染驱动：单屏/双屏都持续刷新航线流动纹理
let _routeRafStarted = false;
const startRouteRenderLoop = () => {
  if (_routeRafStarted) return;
  _routeRafStarted = true;

  const loop = () => {
    const v1 = vpSingle.value?.getViewer?.();
    if (v1 && v1.entities?.getById?.(ROUTE_ENTITY_ID)) {
      v1.scene?.requestRender?.();
    }
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

const whenViewerReady = (vpEl, cb, maxFrames = 120) => {
  let n = 0;
  const tick = () => {
    const viewer = vpEl?.getViewer?.();
    if (viewer) { cb(viewer); return; }
    if (++n > maxFrames) return; // ~2s@60fps，避免死循环
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const bindVpSingle = (el) => {
  if (vpSingle.value === el) return;
  vpSingle.value = el;
  whenViewerReady(el, (viewer) => {
    drawFlightRoute(viewer);
    startRouteRenderLoop();
    el?.setPlaneCameraFollow?.(!!planePathEnabled.value);
  });
};
const compareMarkersEl = ref(null);
const stepListEl = ref(null);
const onStepListReady = (el) => {
  stepListEl.value = el;
};

const scenarios = [
  { key: 'engine', name: '单发失效' },
  { key: 'smoke', name: '烟雾异味' },
  { key: 'nav', name: '导航失效' },
  { key: 'hijack', name: '劫机' },
  { key: 'human', name: '人为误操作' }
];

const isCompare = ref(false);

const isNarrativeInProgress = computed(
  () =>
    !!singleNarrativeRunning.value ||
    !!globalNarrativeRunning.value ||
    !!narrativeBusyLeft.value ||
    !!narrativeBusyRight.value
);

const isSinglePlaybackSessionActive = computed(
  () => !isCompare.value && !!singlePlaybackSessionActive.value
);

const isComparePlaybackSessionActive = computed(
  () => isCompare.value && playbackMode.value !== 'idle'
);

const canPreviewKeyframes = computed(
  () => !isSinglePlaybackSessionActive.value && !isComparePlaybackSessionActive.value
);

const singleTimelinePlaying = computed(
  () => !isCompare.value && !!singlePlaybackSessionActive.value
);

const compareGlobalTimelinePlaying = computed(
  () => isCompare.value && playbackMode.value === 'global'
);

const compareLeftTimelinePlaying = computed(
  () => isCompare.value && (playbackMode.value === 'global' || playbackMode.value === 'left')
);

const compareRightTimelinePlaying = computed(
  () => isCompare.value && (playbackMode.value === 'global' || playbackMode.value === 'right')
);

watch(singleIframeMountKey, () => {
  lastSingleInitPushKey = '';
  singleIframeReady.value = false;
  singleIframeFirstReadyForce.value = true;
  clearKeyframeEntryState();
});

watch(compareIframeMountKey, () => {
  lastCompareInitPushKey = '';
  clearKeyframeEntryState();
});

watch(isCompare, (cmp) => {
  if (cmp) {
    singleIframeReady.value = false;
    pendingSingleLoadScenario.value = false;
  }
  updateNarrativeTransferOverlayTop();
});

const pathProgressForViewerStage = computed(() => {
  if (!isCompare.value) return planeProgress.value;
  return planeProgressLeft.value;
});

// 单屏：与静态架构一致，仅「沿线运动」开启时允许跟随飞机 popup；对比模式仍只按相机高度门控
const planeScreenInfo = ref(null);
const POPUP_CAMERA_HEIGHT_THRESHOLD = 500000;
function onPlaneScreenInfo(info) {
  planeScreenInfo.value = info;
}
const showPlanePopup = computed(() => {
  const info = planeScreenInfo.value;
  if (!info) return false;
  if (!isCompare.value && !planePathEnabled.value) return false;
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

const timelineMax = ref(100);
/** 单屏模式专用总时长：仅按有云匣子（yes）侧有效节点；与双屏 compare 用的 timelineMax 解耦 */
const timelineMaxSingle = ref(100);
/** 处置完成后沿航迹到终点的固定 demo 秒（与 scene.js 末段、JSON duration 对齐用） */
const FINAL_FLIGHT_DEMO_SEC = 10;
/** 「开始预警」纯显示里程碑：相对「开始告警」demo 时刻提前的秒数（不参与关键帧/叙事） */
const PREWARN_DEMO_LEAD_SEC = 2;
/** 与 iframe scene.js narrativeT0 对齐：语义时间轴「T+0」对应 demo 时间起点 */
const compareNarrativeBaseT = 10;
/** 语义秒 → demo 秒压缩比（与 scene.js SEMANTIC_TIME_COMPRESS 一致）；只调此项可整体快慢联动 */
const SEMANTIC_TIME_COMPRESS = 10;
/** 来自 dynamic_scenarios.json 的 optional narrativeMilestones，用于三枚阶段标牌的 raw 语义锚点 */
const narrativeMilestonesFromJson = ref(null);

/**
 * 时间字段安全转换：null/undefined/空串 不得经 Number 变成 0；仅有限数或可解析为有限数才返回
 */
function toFiniteTime(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** raw：叙事基准后的语义秒（与 steps / scenarioNodes 中 t 一致）→ demo 时间（父页时间轴 scrub / iframe 共用） */
function semanticToDemoT(rawSemanticAfterBase) {
  return compareNarrativeBaseT + Number(rawSemanticAfterBase) / SEMANTIC_TIME_COMPRESS;
}

function collectMaxRawFromNodes(nodes) {
  let m = 0;
  for (const n of nodes || []) {
    if (n?.postReview) continue;
    const yy = toFiniteTime(n?.yes?.t);
    const nn = toFiniteTime(n?.no?.t);
    if (yy != null) m = Math.max(m, yy);
    if (nn != null) m = Math.max(m, nn);
  }
  return m;
}

function maxRawForSide(nodes, side) {
  const k = side === 'yes' ? 'yes' : 'no';
  let m = 0;
  for (const n of nodes || []) {
    if (n?.postReview) continue;
    const t = toFiniteTime(n?.[k]?.t);
    if (t != null) m = Math.max(m, t);
  }
  return m;
}

function computeTimelineMaxFromNodes(nodes) {
  const maxR = collectMaxRawFromNodes(nodes);
  return semanticToDemoT(maxR) + FINAL_FLIGHT_DEMO_SEC;
}

/** 单屏总时长：yes 侧最后一个有效关键点 → demo + 末段 10s；无有效 yes 时回退与双屏相同的 computeTimelineMaxFromNodes，避免 0/空配出错 */
function hasAnyValidYesKeyframeInNodes(nodes) {
  for (const n of nodes || []) {
    if (n?.postReview) continue;
    if (toFiniteTime(n?.yes?.t) != null) return true;
  }
  return false;
}

function computeSingleScreenTimelineMaxFromNodes(nodes) {
  const dualFallback = computeTimelineMaxFromNodes(nodes);
  if (!hasAnyValidYesKeyframeInNodes(nodes)) return dualFallback;
  const maxR = maxRawForSide(nodes, 'yes');
  return semanticToDemoT(maxR) + FINAL_FLIGHT_DEMO_SEC;
}

function firstAlertTextForSide(nodes, side) {
  const k = side === 'yes' ? 'yes' : 'no';
  for (const n of nodes || []) {
    if (n?.postReview) continue;
    const a = n?.[k]?.alert;
    if (a && String(a).trim()) return String(a).trim();
  }
  return '故障已触发（示意）';
}

/** demo 时间 → 叙事基准后的语义秒（用于节点判断、与 rawT 比较） */
function demoToSemanticAfterBase(demoT) {
  return Math.max(0, (Number(demoT) - compareNarrativeBaseT) * SEMANTIC_TIME_COMPRESS);
}

/** compare 主时钟/浮标用的「语义绝对时间」：≤base 仍为 demo；>base 则还原为 10+语义展开 */
function toCompareSemanticAbsT(demoT) {
  const d = Number(demoT);
  if (d <= compareNarrativeBaseT) return d;
  return compareNarrativeBaseT + demoToSemanticAfterBase(d);
}

function marksWithActive(sideMarks, demoT) {
  const cur = toCompareSemanticAbsT(demoT);
  let last = -1;
  for (let i = 0; i < sideMarks.length; i++) {
    if (sideMarks[i].semanticAbsT <= cur + 1e-6) last = i;
  }
  return sideMarks.map((m, i) => ({ ...m, active: i === last && last >= 0 }));
}
const t = ref(0);
const lastNodeIdNo = ref(-1);
const lastNodeIdYes = ref(-1);
const lastNodeIdSingle = ref(-1);
const currentNodeId = ref(-1);
const activeScenario = ref('engine');

watch(activeScenario, () => {
  updateNarrativeTransferOverlayTop();
});

const steps = ref([]);
const scenarioNodes = ref([]);

function buildMilestoneRowsForSide(side) {
  const nodes = scenarioNodes.value || [];
  const cfg = narrativeMilestonesFromJson.value;
  const k = side === 'yes' ? 'yes' : 'no';
  let alarmRaw = cfg?.alarmRaw != null ? Number(cfg.alarmRaw) : 0;
  if (!Number.isFinite(alarmRaw)) alarmRaw = 0;
  let disposalRaw = cfg?.[side === 'yes' ? 'disposalStartRaw_yes' : 'disposalStartRaw_no'];
  if (disposalRaw == null) disposalRaw = cfg?.disposalStartRaw;
  if (disposalRaw == null && nodes[1]?.[k]?.t != null) disposalRaw = Number(nodes[1][k].t);
  if (disposalRaw == null || !Number.isFinite(Number(disposalRaw))) disposalRaw = 0;
  else disposalRaw = Number(disposalRaw);
  let completeRaw = cfg?.[side === 'yes' ? 'completeRaw_yes' : 'completeRaw_no'];
  if (completeRaw == null) completeRaw = cfg?.completeRaw;
  if (completeRaw == null || !Number.isFinite(Number(completeRaw))) {
    completeRaw = maxRawForSide(nodes, side);
  } else {
    completeRaw = Number(completeRaw);
  }
  const maxT = isCompare.value ? timelineMax.value : timelineMaxSingle.value;
  const alarmDemoT = semanticToDemoT(alarmRaw);
  const prewarnDemoT = Math.max(0, alarmDemoT - PREWARN_DEMO_LEAD_SEC);
  const rows = [
    { key: 'prewarn', label: '开始预警', t: prewarnDemoT },
    { key: 'alarm', label: '开始告警', t: alarmDemoT },
    { key: 'disposal', label: '开始处置', t: semanticToDemoT(disposalRaw) },
    { key: 'complete', label: '处置完成', t: semanticToDemoT(completeRaw) }
  ];
  return rows.map((r) => ({ ...r, t: Math.min(r.t, maxT) }));
}

const compareMilestonesYes = computed(() => buildMilestoneRowsForSide('yes'));
const compareMilestonesNo = computed(() => buildMilestoneRowsForSide('no'));
const singleMilestones = computed(() => buildMilestoneRowsForSide('yes'));

/**
 * 本侧有效关键点：keyframeMarks 中该侧、有有效 demo t、非 postReview、非空步对象。
 * 按 demoT（m.t）升序，同刻用 stepIndex 稳定序。
 */
function listValidNarrativeMarksForSide(sideKey) {
  const side = sideKey === 'no' ? 'no' : 'yes';
  return (keyframeMarks.value || [])
    .filter((m) => m.side === side)
    .filter((m) => {
      const step = steps.value[m.nodeIndex];
      if (step == null) return false;
      if (typeof step === 'object' && !Array.isArray(step) && Object.keys(step).length === 0) {
        return false;
      }
      if (step.postReview) return false;
      return Number.isFinite(Number(m.t));
    })
    .slice()
    .sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t;
      return a.stepIndex - b.stepIndex;
    });
}

/**
 * 按本侧有效关键点序号映射阶段标牌闪烁：第 1→alarm、第 2→disposal、最后 1 个→complete，中间不闪。
 * 仅 1 个有效点时只映 alarm；仅 2 个时第 1 为 alarm、第 2 为 complete（避免 disposal 与 complete 叠在同一关键点上）。
 * 返回的 t 取当前侧 milestones 对应 key 的 t，供 TimelineDock 按 key+t 匹配。
 * @param { { nodeIndex: number, stepIndex: number } } mark
 * @param {'yes'|'no'|'single'} sideKey single 与 yes 共用 yes 侧 marks
 */
function pulsingMilestoneForNarrativeMark(mark, sideKey) {
  if (!mark) return null;
  const list = listValidNarrativeMarksForSide(sideKey);
  const idx = list.findIndex(
    (m) => m.nodeIndex === mark.nodeIndex && m.stepIndex === mark.stepIndex
  );
  if (idx < 0) return null;
  const n = list.length;
  let phaseKey = null;
  if (n === 1) {
    if (idx === 0) phaseKey = 'alarm';
  } else if (n === 2) {
    if (idx === 0) phaseKey = 'alarm';
    else if (idx === 1) phaseKey = 'complete';
  } else {
    if (idx === 0) phaseKey = 'alarm';
    else if (idx === 1) phaseKey = 'disposal';
    else if (idx === n - 1) phaseKey = 'complete';
  }
  if (!phaseKey) return null;
  let rows;
  if (sideKey === 'single') rows = singleMilestones.value;
  else if (sideKey === 'yes') rows = compareMilestonesYes.value;
  else if (sideKey === 'no') rows = compareMilestonesNo.value;
  else return null;
  const row = (rows || []).find((r) => String(r?.key) === phaseKey);
  if (!row || !Number.isFinite(Number(row.t))) return null;
  return { key: String(phaseKey), t: Number(row.t) };
}

const disposalCards = ref([]);
const playing = ref(false);
const activeSymbol = ref('plane');
/** 当前选中的链路关联 id（保留兼容，不再作为主驱动；主驱动为 visibleRelationIdsLeft/Right） */
const selectedRelationId = ref(null);
const visibleRelationIdsLeft = ref([]);
const visibleRelationIdsRight = ref([]);
const visibleUnitClusterIdsLeft = ref(['DYN_YES']);
const visibleUnitClusterIdsRight = ref([]);
const rightTab = ref('info');

const infoBoxVisible = ref(false);
const infoBoxTitle = ref('');
const infoBoxLines = ref([]);
const infoBoxCompareLines = ref([]);
const currentNodeName = ref('起始');

const floatingCardCollapsed = ref(false);
const floatingCardNoCollapsed = ref(false);
const floatingCardYesCollapsed = ref(false);
const detailsOpen = ref(false);
const detailsOpenNo = ref(false);
const detailsOpenYes = ref(false);

const alertToastVisible = ref(false);
const alertTitle = ref('提示');
const alertBody = ref('');
let alertTimer = null;

const markerNoLeft = ref(0);
const markerYesLeft = ref(0);
const markerNoTitle = ref('');
const markerYesTitle = ref('');
const markerNoLabel = ref('T_no');
const markerYesLabel = ref('T_yes');
const markerNoAlign = ref('center');
const markerYesAlign = ref('center');

const infoFields = ref({
  f_no: 'MU0001',
  f_type: 'A320',
  f_route: 'WPT-1 → WPT-3',
  f_time: 'T+0 ~ T+100（示意）',
  f_state: '待证实',
  f_node: '起始'
});

/** 双屏：飞过 narrative 起点（10s）后一次性故障提示，复位后需可再播 */
const compareFaultAlertFiredYes = ref(false);
const compareFaultAlertFiredNo = ref(false);
const compareFaultAlertTextYes = ref('故障已触发（示意）');
const compareFaultAlertTextNo = ref('故障已触发（示意）');

function clearCompareFaultAlerts() {
  compareFaultAlertFiredYes.value = false;
  compareFaultAlertFiredNo.value = false;
}

watch(tYes, (v, prev) => {
  if (!isCompare.value) return;
  if (prev == null || prev === undefined) return;
  if (prev < compareNarrativeBaseT && v >= compareNarrativeBaseT - 1e-9) {
    compareFaultAlertFiredYes.value = true;
  }
});
watch(tNo, (v, prev) => {
  if (!isCompare.value) return;
  if (prev == null || prev === undefined) return;
  if (prev < compareNarrativeBaseT && v >= compareNarrativeBaseT - 1e-9) {
    compareFaultAlertFiredNo.value = true;
  }
});

watch(t, (v, prev) => {
  if (isCompare.value) return;
  if (!useSingleMapIframe) return;
  if (prev == null || prev === undefined) return;
  if (prev < compareNarrativeBaseT && v >= compareNarrativeBaseT - 1e-9) {
    compareFaultAlertFiredYes.value = true;
  }
});

const currentScenarioName = computed(() => scenarios.find((s) => s.key === activeScenario.value)?.name || '单发失效');

const currentTimeLabel = computed(() => `T:${toCompareSemanticAbsT(t.value).toFixed(1)}s`);

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

function getCurrentNodeIndexByTime(time, side) {
  const arr = steps.value || [];
  if (!arr.length) return 0;
  const key = side === 'no' ? 't_no' : 't_yes';
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    const rawT = toFiniteTime(arr[i][key]);
    if (rawT == null) continue;
    /** 单屏/双屏均按 demo 时间与 keyframeMarks.t 对齐 */
    const threshold = semanticToDemoT(rawT);
    if (time >= threshold) idx = i;
  }
  return idx;
}

/** 该侧有效关键点的最小 demo 时间；若无有效 t 则 null（仅用于 FloatingCard 待命门控，不改主链路/地图状态） */
function getFirstKeyframeDemoTForSide(side) {
  const key = side === 'no' ? 't_no' : 't_yes';
  const arr = steps.value || [];
  let minD = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]?.postReview) continue;
    const rawT = toFiniteTime(arr[i][key]);
    if (rawT == null) continue;
    const d = semanticToDemoT(rawT);
    if (minD == null || d < minD) minD = d;
  }
  return minD;
}

function isBeforeFirstKeyframeForSide(side, demoT) {
  const first = getFirstKeyframeDemoTForSide(side);
  if (first == null) return true;
  return (Number(demoT) || 0) < first - 1e-5;
}

/** 首 key 的 demo 时间若落在 ~0s，与「T+0」展示语义对齐（仅门控用） */
const FIRST_KEY_DEMO_T_EPS = 1e-4;

/**
 * 是否展示本侧 FloatingCard 关键点内容：除 isBeforeFirst 外，当首关键点在 T+0.0s（demo 轴）时，
 * 需叙事即将触发/已标入 或 时间轴已拖过首点之后，避免未播即显示 T+0 内容。
 */
function shouldShowFloatingKeyCardForSide(side, demoT) {
  const d = Number(demoT) || 0;
  if (isBeforeFirstKeyframeForSide(side, d)) return false;
  const firstD = getFirstKeyframeDemoTForSide(side);
  if (firstD == null) return true;
  if (firstD > FIRST_KEY_DEMO_T_EPS) return true;
  if (d > firstD + FIRST_KEY_DEMO_T_EPS) return true;
  if (isCompare.value) {
    if (side === 'yes' && hasEnteredKeyframeYes.value) return true;
    if (side === 'no' && hasEnteredKeyframeNo.value) return true;
  } else {
    if (side === 'yes' && hasEnteredKeyframeSingle.value) return true;
  }
  return false;
}

function getCurrentNodeByTime(time, side) {
  const idx = getCurrentNodeIndexByTime(time, side);
  return steps.value[idx];
}

const idxNo = computed(() =>
  isCompare.value
    ? getCurrentNodeIndexByTime(tNo.value, 'no')
    : getCurrentNodeIndexByTime(t.value, 'yes')
);
const idxYes = computed(() =>
  getCurrentNodeIndexByTime(isCompare.value ? tYes.value : t.value, 'yes')
);

const getCompareMeta = (scenarioKey, nodeId) => {
  const node = steps.value.find((s) => s.nodeId === nodeId) || steps.value[nodeId];
  if (!node) {
    return { t_no: 0, t_yes: 0, dt: 0, hops_no: 3, hops_yes: 2, dhops: 1, path_no: '地面→中继→机载', path_yes: '地面→机载' };
  }
  const t_no = toFiniteTime(node.t_no);
  const t_yes = toFiniteTime(node.t_yes);
  const hops_no = Number(node.hops_no ?? 3);
  const hops_yes = Number(node.hops_yes ?? 2);
  return {
    t_no: t_no != null ? t_no : 0,
    t_yes: t_yes != null ? t_yes : 0,
    dt: t_no != null && t_yes != null ? Math.abs(t_no - t_yes) : 0,
    hops_no,
    hops_yes,
    dhops: hops_no - hops_yes,
    path_no: node.path_no || '地面→中继→机载',
    path_yes: node.path_yes || '地面→机载'
  };
};

const currentCardNo = computed(() => toSideCard(steps.value[idxNo.value], 'no'));
const currentCardYes = computed(() => toSideCard(steps.value[idxYes.value], 'yes'));

/** 右下角 FloatingCard：未到达本侧首帧前为 null，仅展示待命说明（不改主链路/地图/链路逻辑） */
const displayCardYes = computed(() => {
  const demoT = isCompare.value ? tYes.value : t.value;
  if (!shouldShowFloatingKeyCardForSide('yes', demoT)) return null;
  return toSideCard(steps.value[idxYes.value], 'yes');
});
const displayCardNo = computed(() => {
  if (!shouldShowFloatingKeyCardForSide('no', tNo.value)) return null;
  return toSideCard(steps.value[idxNo.value], 'no');
});

const floatingStandbyContentYes = computed(() => ({
  headline: '场景待命',
  scenarioName: currentScenarioName.value,
  mode: isCompare.value ? '双屏对比' : '单屏演示',
  cloudLine: isCompare.value
    ? '本侧为「有云匣子」时间线，处置与信息联动为短路径、高时效示意。'
    : '单屏仅展示有「云匣子」侧时间线，推进演示即可查看各关键点。',
  hint: '点击「播放」推进时间轴，或「展开详情」查看本侧全部关键时间点。'
}));
const floatingStandbyContentNo = computed(() => ({
  headline: '场景待命',
  scenarioName: currentScenarioName.value,
  mode: '双屏对比',
  cloudLine: '本侧为「无云匣子」时间线，用于与有云匣子侧对比信息传递与处置时延。',
  hint: '点击「播放」推进时间轴，或「展开详情」查看本侧全部关键时间点。'
}));

/** 父页缓存：dynamic_scenarios 同源的 engine_failure_units / engine_failure_links（子页仍自 fetch，此处仅服务 FloatingCard 链路节点） */
const dynamicRelationMap = ref({ relations: [] });
/** @type {import('vue').Ref<Record<string, { id: string, name: string }>>} */
const dynamicUnitMap = ref({});

async function fetchDynamicCompareMaps() {
  try {
    const [uRes, lRes] = await Promise.all([fetch(currentUnitsUrl.value), fetch(currentLinksUrl.value)]);
    if (!uRes.ok || !lRes.ok) return;
    const unitsDoc = await uRes.json();
    const linksDoc = await lRes.json();
    const map = {};
    const clusters = unitsDoc?.ground?.clusters || [];
    for (let ci = 0; ci < clusters.length; ci++) {
      const units = clusters[ci]?.units || [];
      for (let ui = 0; ui < units.length; ui++) {
        const u = units[ui];
        if (u?.id == null) continue;
        const id = String(u.id);
        map[id] = { id, name: String(u.name != null ? u.name : id) };
      }
    }
    dynamicUnitMap.value = map;
    dynamicRelationMap.value = {
      relations: Array.isArray(linksDoc?.relations) ? linksDoc.relations : []
    };
  } catch (e) {
    console.warn('[DynamicFlow] fetchDynamicCompareMaps', e);
  }
}

/**
 * @param {'yes'|'no'} side
 * @param {ReturnType<typeof toSideCard>} card
 * @returns {{ id: string, name: string }[]}
 */
function buildRelationNodeList(side, card) {
  if (!card) return [];
  const relIds =
    side === 'no'
      ? Array.isArray(card.activeRelations_no)
        ? card.activeRelations_no
        : []
      : Array.isArray(card.activeRelations_yes)
        ? card.activeRelations_yes
        : [];
  const relations = dynamicRelationMap.value?.relations || [];
  const unitMap = dynamicUnitMap.value || {};
  const seen = new Set();
  const out = [];
  const pushNode = (nid) => {
    const id = String(nid ?? '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (id === 'plane') {
      out.push({ id: 'plane', name: '飞机' });
      return;
    }
    const u = unitMap[id];
    out.push({ id, name: u?.name != null ? String(u.name) : id });
  };
  for (let ri = 0; ri < relIds.length; ri++) {
    const rid = relIds[ri];
    const rel = relations.find((r) => String(r?.id ?? '') === String(rid));
    if (!rel || !Array.isArray(rel.edges)) continue;
    for (let ei = 0; ei < rel.edges.length; ei++) {
      const edge = rel.edges[ei];
      if (!edge || edge.length < 2) continue;
      pushNode(edge[0]);
      pushNode(edge[1]);
    }
  }
  return out;
}

/**
 * 供 FloatingCard 展示：当前激活链路下每条 transfer 的传递内容（仅读 relation.transfers，不从 edges 推断）
 * @param {'yes'|'no'} side
 * @param {ReturnType<typeof toSideCard>} card
 */
function buildRelationTransferRows(side, card) {
  if (!card) return [];
  const relIds =
    side === 'no'
      ? Array.isArray(card.activeRelations_no)
        ? card.activeRelations_no
        : []
      : Array.isArray(card.activeRelations_yes)
        ? card.activeRelations_yes
        : [];
  const relations = dynamicRelationMap.value?.relations || [];
  const unitMap = dynamicUnitMap.value || {};

  function normalizePayload(payload) {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload.trim();
    if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  function endpointLabel(transfer, axis) {
    const explicit = axis === 'from' ? transfer.fromLabel : transfer.toLabel;
    if (explicit != null && String(explicit).trim() !== '') return String(explicit).trim();
    const rawId = axis === 'from' ? transfer.fromId : transfer.toId;
    const id = String(rawId ?? '').trim();
    if (!id) return '';
    if (id === 'plane') return '飞机';
    const u = unitMap[id];
    if (u?.name != null && String(u.name).trim() !== '') return String(u.name);
    return id;
  }

  const rows = [];
  for (let ri = 0; ri < relIds.length; ri++) {
    const rid = relIds[ri];
    const rel = relations.find((r) => String(r?.id ?? '') === String(rid));
    if (!rel || !Array.isArray(rel.transfers)) continue;
    const relationId = String(rel.id ?? rid);
    const relationName = rel.name != null ? String(rel.name) : '';
    const flowLabel = rel.flowLabel != null ? String(rel.flowLabel) : '';

    for (let ti = 0; ti < rel.transfers.length; ti++) {
      const transfer = rel.transfers[ti];
      if (!transfer || typeof transfer !== 'object') continue;
      const payload = normalizePayload(transfer.payload);
      if (!payload) continue;

      const fromLabel = endpointLabel(transfer, 'from');
      const toLabel = endpointLabel(transfer, 'to');
      const fromId = transfer.fromId != null ? String(transfer.fromId) : '';
      const toId = transfer.toId != null ? String(transfer.toId) : '';
      const kind = transfer.kind === 'control' ? 'control' : 'data';

      rows.push({
        id: `${relationId}-${ti}`,
        relationId,
        relationName,
        flowLabel,
        kind,
        fromId,
        toId,
        fromLabel,
        toLabel,
        payload
      });
    }
  }
  return rows;
}

const compareCurrentRelationNodesYes = computed(() => {
  if (isCompare.value || useSingleMapIframe) {
    return buildRelationNodeList('yes', displayCardYes.value);
  }
  return [];
});
const compareCurrentRelationNodesNo = computed(() =>
  isCompare.value ? buildRelationNodeList('no', displayCardNo.value) : []
);

function isValidCompareFocusUnitId(id) {
  if (id == null) return false;
  const s = String(id).trim();
  if (!s || s === 'undefined' || s === 'null') return false;
  return true;
}

function onCompareRelationNodeClick(side, node) {
  if (!node) return;
  if (!isValidCompareFocusUnitId(node.id)) return;
  if (isCompare.value) {
    const b = compareBridgeRef.value;
    if (!b?.focusUnit) return;
    b.focusUnit(side, { unitId: String(node.id).trim() });
    return;
  }
  if (useSingleMapIframe && side === 'left') {
    singleIframeBridgeRef.value?.focusUnit?.('left', { unitId: String(node.id).trim() });
  }
}
const currentCard = computed(() => currentCardYes.value || fallbackCard('yes'));
const currentCompareMeta = computed(() => getCompareMeta(activeScenario.value, currentCardYes.value?.nodeId ?? 0));

const keyframeMarks = computed(() => {
  const arr = steps.value || [];
  const base = compareNarrativeBaseT;

  function buildMarksForSide(side) {
    const key = side === 'yes' ? 't_yes' : 't_no';
    const sideLabel = side === 'yes' ? 'yes' : 'no';
    const withIdx = arr
      .map((step, originalIndex) => ({ step, originalIndex }))
      .filter(({ step }) => toFiniteTime(step[key]) != null);
    withIdx.sort((a, b) => {
      const ra = toFiniteTime(a.step[key]);
      const rb = toFiniteTime(b.step[key]);
      if (ra !== rb) return ra - rb;
      return a.originalIndex - b.originalIndex;
    });
    return withIdx.map(({ step, originalIndex }, stepIndex) => {
      const rawT = toFiniteTime(step[key]);
      const demoT = semanticToDemoT(rawT);
      const semanticAbsT = base + rawT;
      return {
        side: sideLabel,
        rawT,
        t: demoT,
        semanticAbsT,
        stepIndex,
        nodeIndex: originalIndex,
        label: `10+${rawT.toFixed(1)}s`,
        title: `10+${rawT.toFixed(1)}s`
      };
    });
  }

  return [...buildMarksForSide('yes'), ...buildMarksForSide('no')];
});

/** 每侧按 semanticAbsT、同刻多步时按 stepIndex 稳定序；第一个尚未 fired 的 mark 与 iframe scenarioStepRows 下标一致 */
function peekNextUnfiredMark(side) {
  const list = (keyframeMarks.value || [])
    .filter((m) => m.side === (side === 'yes' ? 'yes' : 'no'))
    .slice()
    .sort((a, b) => {
      if (a.semanticAbsT !== b.semanticAbsT) return a.semanticAbsT - b.semanticAbsT;
      return a.stepIndex - b.stepIndex;
    });
  const fired = side === 'yes' ? firedMarkStepIndexYes.value : firedMarkStepIndexNo.value;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.stepIndex < 0 || fired.has(m.stepIndex)) continue;
    return m;
  }
  return null;
}

/** 单屏：仅 yes 侧 marks，与 firedMarkStepIndexSingle 对齐 */
function peekNextUnfiredMarkSingle() {
  const list = (keyframeMarks.value || [])
    .filter((m) => m.side === 'yes')
    .slice()
    .sort((a, b) => {
      if (a.semanticAbsT !== b.semanticAbsT) return a.semanticAbsT - b.semanticAbsT;
      return a.stepIndex - b.stepIndex;
    });
  const fired = firedMarkStepIndexSingle.value;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.stepIndex < 0 || fired.has(m.stepIndex)) continue;
    return m;
  }
  return null;
}

function syncSinglePlaneProgressFromTime(time) {
  if (isCompare.value) return;
  const max = timelineMaxSingle.value;
  if (max <= 0) {
    planeProgress.value = 0;
    return;
  }
  planeProgress.value = clamp(Number(time) || 0, 0, max) / max;
}

function rebuildFiredSingleMarksFromScrub() {
  if (isCompare.value) return;
  const set = new Set();
  const cur = t.value;
  const list = (keyframeMarks.value || []).filter((m) => m.side === 'yes');
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.t <= cur + 1e-5) set.add(m.stepIndex);
  }
  firedMarkStepIndexSingle.value = set;
}

/** 是否在本帧「触达」下一 yes 关键点（含同刻多步时沿时间推进触发） */
function shouldTriggerSingleKeyframe(prevT, nextT, mark) {
  const eps = 1e-5;
  const m = mark.t;
  if (nextT < m - eps) return false;
  if (prevT < m - eps && nextT >= m - eps) return true;
  return nextT > prevT + 1e-8 && Math.abs(prevT - m) < eps && nextT >= m - eps;
}

async function runSingleKeyframeNarrativeAsync(mark) {
  singleNarrativeRunning.value = true;
  const vp = vpSingle.value;
  const relIds = steps.value[mark.nodeIndex]?.activeRelations_yes ?? [];
  try {
    vp?.setPlaneCameraFollow?.(false);
    if (relIds.length) {
      await vp?.playRelationIdsNodeFocusSequence?.(relIds, { skipFinalRelationCameraView: true });
    }
  } finally {
    if (playing.value) {
      planePathEnabled.value = true;
      vp?.setPlaneCameraFollow?.(true);
    } else {
      vp?.setPlaneCameraFollow?.(!!planePathEnabled.value);
    }
    singleNarrativeRunning.value = false;
    pulsingMilestoneSingle.value = null;
  }
}

/**
 * 在发出 pause/scrub/RUN_NARRATIVE 之前对齐父页 demo 时间轴，使 idxYes/idxNo、左右 FloatingCard、信息字段随关键点立即更新，
 * 而不必等 iframe SIDE_STATE 回传。只传需要动的侧；未传的 t 保持不变。
 */
function syncParentUiBeforeRunNarrative(payload) {
  const { tYes: ty, tNo: tn, compareDisplayT, singleT } = payload;
  if (ty != null && ty !== undefined) tYes.value = Number(ty);
  if (tn != null && tn !== undefined) tNo.value = Number(tn);
  if (singleT != null && singleT !== undefined && !isCompare.value) {
    t.value = Number(singleT);
    syncSinglePlaneProgressFromTime(t.value);
  }
  if (compareDisplayT != null && compareDisplayT !== undefined) {
    compareGlobalDisplayT.value = Number(compareDisplayT);
  }
  updateCompareMarkers();
  refreshAll(false);
}

function maybeStartGlobalNarrativeRound() {
  if (!isCompare.value || globalNarrativeRunning.value) return;
  const b = compareBridgeRef.value;
  if (!b) return;

  const eps = 1e-6;

  /** 单侧独播：与全局一致由父页 RUN_NARRATIVE，仅动当前侧 */
  if (playbackMode.value === 'left' && playingLeft.value && !playingGlobal.value) {
    const next = peekNextUnfiredMark('yes');
    if (!next) return;
    if (tYes.value + eps < next.t) return;
    hasEnteredKeyframeYes.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingLeft.value = true;
    globalNarrativePendingRight.value = false;
    globalNarrativeStepIndexLeft.value = next.stepIndex;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = next.t;
    pulsingMilestoneYes.value = pulsingMilestoneForNarrativeMark(next, 'yes');
    syncParentUiBeforeRunNarrative({ tYes: next.t });
    b.pause('left');
    b.scrub('left', next.t, { silent: true });
    b.runNarrative('left', { stepIndex: next.stepIndex, t: next.t });
    return;
  }
  if (playbackMode.value === 'right' && playingRight.value && !playingGlobal.value) {
    const next = peekNextUnfiredMark('no');
    if (!next) return;
    if (tNo.value + eps < next.t) return;
    hasEnteredKeyframeNo.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingLeft.value = false;
    globalNarrativePendingRight.value = true;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeStepIndexRight.value = next.stepIndex;
    globalNarrativeRoundDemoT.value = next.t;
    pulsingMilestoneNo.value = pulsingMilestoneForNarrativeMark(next, 'no');
    syncParentUiBeforeRunNarrative({ tNo: next.t });
    b.pause('right');
    b.scrub('right', next.t, { silent: true });
    b.runNarrative('right', { stepIndex: next.stepIndex, t: next.t });
    return;
  }

  if (playbackMode.value !== 'global' || !playingGlobal.value) return;

  const leftNext = peekNextUnfiredMark('yes');
  const rightNext = peekNextUnfiredMark('no');
  const maxT = Math.max(tYes.value, tNo.value);
  const minT = Math.min(tYes.value, tNo.value);

  if (!leftNext && !rightNext) return;

  if (
    leftNext &&
    rightNext &&
    Math.abs(leftNext.semanticAbsT - rightNext.semanticAbsT) <= eps &&
    maxT >= Math.min(leftNext.t, rightNext.t) - eps
  ) {
    hasEnteredKeyframeYes.value = true;
    hasEnteredKeyframeNo.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingLeft.value = true;
    globalNarrativePendingRight.value = true;
    globalNarrativeStepIndexLeft.value = leftNext.stepIndex;
    globalNarrativeStepIndexRight.value = rightNext.stepIndex;
    globalNarrativeRoundDemoT.value = Math.max(leftNext.t, rightNext.t);
    compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
    pulsingMilestoneYes.value = pulsingMilestoneForNarrativeMark(leftNext, 'yes');
    pulsingMilestoneNo.value = pulsingMilestoneForNarrativeMark(rightNext, 'no');
    syncParentUiBeforeRunNarrative({
      tYes: leftNext.t,
      tNo: rightNext.t,
      compareDisplayT: globalNarrativeRoundDemoT.value
    });
    b.pauseBoth();
    b.scrub('left', leftNext.t, { silent: true });
    b.scrub('right', rightNext.t, { silent: true });
    b.runNarrativeBoth(
      { stepIndex: leftNext.stepIndex, t: leftNext.t },
      { stepIndex: rightNext.stepIndex, t: rightNext.t }
    );
    return;
  }

  if (
    leftNext &&
    (!rightNext || rightNext.semanticAbsT > leftNext.semanticAbsT + eps) &&
    leftNext.t <= minT + eps
  ) {
    hasEnteredKeyframeYes.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingLeft.value = true;
    globalNarrativePendingRight.value = false;
    globalNarrativeStepIndexLeft.value = leftNext.stepIndex;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = leftNext.t;
    compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
    pulsingMilestoneYes.value = pulsingMilestoneForNarrativeMark(leftNext, 'yes');
    syncParentUiBeforeRunNarrative({ tYes: leftNext.t, compareDisplayT: globalNarrativeRoundDemoT.value });
    b.pauseBoth();
    b.scrub('left', leftNext.t, { silent: true });
    b.runNarrative('left', { stepIndex: leftNext.stepIndex, t: leftNext.t });
    return;
  }

  if (
    rightNext &&
    (!leftNext || leftNext.semanticAbsT > rightNext.semanticAbsT + eps) &&
    rightNext.t <= minT + eps
  ) {
    hasEnteredKeyframeNo.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingRight.value = true;
    globalNarrativePendingLeft.value = false;
    globalNarrativeStepIndexRight.value = rightNext.stepIndex;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeRoundDemoT.value = rightNext.t;
    compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
    pulsingMilestoneNo.value = pulsingMilestoneForNarrativeMark(rightNext, 'no');
    syncParentUiBeforeRunNarrative({ tNo: rightNext.t, compareDisplayT: globalNarrativeRoundDemoT.value });
    b.pauseBoth();
    b.scrub('right', rightNext.t, { silent: true });
    b.runNarrative('right', { stepIndex: rightNext.stepIndex, t: rightNext.t });
    return;
  }

  if (leftNext && rightNext && leftNext.semanticAbsT < rightNext.semanticAbsT - eps && maxT >= leftNext.t - eps) {
    hasEnteredKeyframeYes.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingLeft.value = true;
    globalNarrativePendingRight.value = false;
    globalNarrativeStepIndexLeft.value = leftNext.stepIndex;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = leftNext.t;
    compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
    pulsingMilestoneYes.value = pulsingMilestoneForNarrativeMark(leftNext, 'yes');
    syncParentUiBeforeRunNarrative({ tYes: leftNext.t, compareDisplayT: globalNarrativeRoundDemoT.value });
    b.pauseBoth();
    b.scrub('left', leftNext.t, { silent: true });
    b.runNarrative('left', { stepIndex: leftNext.stepIndex, t: leftNext.t });
    return;
  }

  if (leftNext && rightNext && rightNext.semanticAbsT < leftNext.semanticAbsT - eps && maxT >= rightNext.t - eps) {
    hasEnteredKeyframeNo.value = true;
    globalNarrativeRunning.value = true;
    globalNarrativePendingRight.value = true;
    globalNarrativePendingLeft.value = false;
    globalNarrativeStepIndexRight.value = rightNext.stepIndex;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeRoundDemoT.value = rightNext.t;
    compareGlobalDisplayT.value = globalNarrativeRoundDemoT.value;
    pulsingMilestoneNo.value = pulsingMilestoneForNarrativeMark(rightNext, 'no');
    syncParentUiBeforeRunNarrative({ tNo: rightNext.t, compareDisplayT: globalNarrativeRoundDemoT.value });
    b.pauseBoth();
    b.scrub('right', rightNext.t, { silent: true });
    b.runNarrative('right', { stepIndex: rightNext.stepIndex, t: rightNext.t });
  }
}

/** 单屏 iframe：与双屏左侧独播同构，由父页在 SIDE_STATE 到达下一 yes 关键点时 pause/scrub/RUN_NARRATIVE */
function maybeStartSingleIframeNarrativeRound() {
  if (isCompare.value || !useSingleMapIframe) return;
  if (singleNarrativeRunning.value) return;
  const b = singleIframeBridgeRef.value;
  if (!b) return;
  if (!playing.value) return;
  const eps = 1e-6;
  const next = peekNextUnfiredMarkSingle();
  if (!next) return;
  if (t.value + eps < next.t) return;
  hasEnteredKeyframeSingle.value = true;
  singleNarrativeRunning.value = true;
  singleIframeShouldResumeAfterNarrative.value = true;
  pulsingMilestoneSingle.value = pulsingMilestoneForNarrativeMark(next, 'single');
  syncParentUiBeforeRunNarrative({ singleT: next.t });
  b.pause('left');
  b.scrub('left', next.t, { silent: true });
  b.runNarrative('left', { stepIndex: next.stepIndex, t: next.t });
}

const keyframeMarksYes = computed(() => {
  const demo =
    isCompare.value && playbackMode.value === 'global' ? compareGlobalDisplayT.value : tYes.value;
  return marksWithActive((keyframeMarks.value || []).filter((m) => m.side === 'yes'), demo);
});
const keyframeMarksNo = computed(() => {
  const demo =
    isCompare.value && playbackMode.value === 'global' ? compareGlobalDisplayT.value : tNo.value;
  return marksWithActive((keyframeMarks.value || []).filter((m) => m.side === 'no'), demo);
});

/** 单屏时间轴：仅 yes 侧关键点，与双屏左栏一致 */
const singleKeyframeMarks = computed(() =>
  marksWithActive((keyframeMarks.value || []).filter((m) => m.side === 'yes'), t.value)
);

const currentTimeLabelYes = computed(() => {
  if (isCompare.value && playbackMode.value === 'global') {
    return `T:${toCompareSemanticAbsT(compareGlobalDisplayT.value).toFixed(1)}s`;
  }
  return `T:${toCompareSemanticAbsT(tYes.value).toFixed(1)}s`;
});
const currentTimeLabelNo = computed(() => {
  if (isCompare.value && playbackMode.value === 'global') {
    return `T:${toCompareSemanticAbsT(compareGlobalDisplayT.value).toFixed(1)}s`;
  }
  return `T:${toCompareSemanticAbsT(tNo.value).toFixed(1)}s`;
});

const toSideCard = (step, side = 'yes') => {
  if (!step) {
    return {
      id: -1,
      nodeId: -1,
      name: '起始',
      phase: '起始',
      title: '起始',
      summary: '暂无数据',
      desc: '',
      state: '待证实',
      t: 0,
      t_no: 0,
      t_yes: 0,
      alert: '',
      events: [],
      evidence: [],
      actions: [],
      activeRelations_yes: [],
      activeRelations_no: [],
      compare: getCompareMeta(activeScenario.value, 0)
    };
  }
  const isNo = side === 'no';
  return {
    id: step.id,
    nodeId: step.nodeId,
    name: isNo ? (step.title_no || step.name || step.title || '') : (step.title || step.name || ''),
    phase: isNo ? (step.phase_no || step.phase || '') : (step.phase || ''),
    title: isNo ? (step.title_no || step.title || '') : (step.title || ''),
    summary: isNo ? (step.summary_no || step.summary || '') : (step.summary || ''),
    desc: isNo ? (step.desc_no || step.desc || '') : (step.desc || ''),
    state: isNo ? (step.state_no || step.state || '待证实') : (step.state || '待证实'),
    t: isNo ? (toFiniteTime(step.t_no) ?? 0) : (toFiniteTime(step.t_yes) ?? 0),
    t_no: toFiniteTime(step.t_no) ?? 0,
    t_yes: toFiniteTime(step.t_yes) ?? 0,
    events: isNo ? ((step.events_no && step.events_no.length) ? step.events_no : (step.events || [])) : (step.events || []),
    evidence: isNo ? ((step.evidence_no && step.evidence_no.length) ? step.evidence_no : (step.evidence || [])) : (step.evidence || []),
    actions: isNo ? ((step.actions_no && step.actions_no.length) ? step.actions_no : (step.actions || [])) : (step.actions || []),
    alert: isNo ? (step.alert_no || step.alert || '') : (step.alert || ''),
    activeRelations_yes: Array.isArray(step.activeRelations_yes) ? [...step.activeRelations_yes] : [],
    activeRelations_no: Array.isArray(step.activeRelations_no) ? [...step.activeRelations_no] : [],
    compare: getCompareMeta(activeScenario.value, step.nodeId ?? 0)
  };
};

const fallbackCard = (side = 'yes') => toSideCard(null, side);

/**
 * 供 FloatingCard 展开列表：本侧关键时间点、高亮、完整/缩略内容均由此生成（不读 json）
 * @param {'yes'|'no'} side
 */
function buildTimelineItemsForSide(side) {
  const sideLabel = side === 'yes' ? 'yes' : 'no';
  const demoT = isCompare.value ? (side === 'yes' ? tYes.value : tNo.value) : t.value;
  const marks = (keyframeMarks.value || [])
    .filter((m) => m.side === sideLabel)
    .filter((m) => !steps.value[m.nodeIndex]?.postReview)
    .slice()
    .sort((a, b) => {
      if (a.semanticAbsT !== b.semanticAbsT) return a.semanticAbsT - b.semanticAbsT;
      return a.stepIndex - b.stepIndex;
    });
  if (!marks.length) return [];

  let lastReachedI = -1;
  const tNum = Number(demoT) || 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].t <= tNum + 1e-4) lastReachedI = i;
  }

  const previewPI =
    side === 'yes' ? keyframeListPreviewStepIndexYes.value : keyframeListPreviewStepIndexNo.value;

  return marks.map((m, i) => {
    const step = steps.value[m.nodeIndex];
    const fullCard = toSideCard(step, side);
    const name = String(fullCard?.title || fullCard?.name || '').trim() || '—';
    const timeLabel = `T+${toCompareSemanticAbsT(m.t).toFixed(1)}s`;

    let isNarrating = false;
    if (side === 'yes') {
      if (isCompare.value) {
        isNarrating =
          globalNarrativeRunning.value &&
          globalNarrativePendingLeft.value &&
          globalNarrativeStepIndexLeft.value === m.stepIndex;
      } else {
        isNarrating = singleNarrativeRunning.value && Math.abs(m.t - tNum) < 0.2;
      }
    } else {
      isNarrating =
        globalNarrativeRunning.value &&
        globalNarrativePendingRight.value &&
        globalNarrativeStepIndexRight.value === m.stepIndex;
    }
    const isReached = m.t <= tNum + 1e-4;
    const isHighlight = isReached || isNarrating;
    const isTimeCurrent = i === lastReachedI;
    const isPreviewRow = previewPI != null && m.stepIndex === previewPI;
    const isListExpanded = isTimeCurrent || isPreviewRow;
    const listHeadLabel = isListExpanded ? (isTimeCurrent ? '当前' : '预览') : '当前';

    const relKey = side === 'yes' ? 'activeRelations_yes' : 'activeRelations_no';
    const activeRelationIds = Array.isArray(fullCard[relKey]) ? fullCard[relKey] : [];
    const transferRows = buildRelationTransferRows(side, fullCard);

    return {
      markStepIndex: m.stepIndex,
      demoT: m.t,
      timeLabel,
      name,
      fullCard,
      activeRelationIds,
      transferRows,
      isReached,
      isNarrating,
      isHighlight,
      isListExpanded,
      listHeadLabel
    };
  });
}

const timelineItemsYes = computed(() => buildTimelineItemsForSide('yes'));
const timelineItemsNo = computed(() => buildTimelineItemsForSide('no'));

function buildNarrativeTransferOverlay(items, sideLabel, previewStepIndex = null) {
  const list = Array.isArray(items) ? items : [];

  const narratingItem = list.find(
    (item) => item?.isNarrating && Array.isArray(item.transferRows) && item.transferRows.length
  );

  const previewItem =
    previewStepIndex != null
      ? list.find(
          (item) =>
            item?.markStepIndex === previewStepIndex &&
            Array.isArray(item.transferRows) &&
            item.transferRows.length
        )
      : null;

  const current = narratingItem || previewItem;
  if (!current) return null;

  const rows = current.transferRows
    .filter((row) => row && String(row.payload || '').trim())
    .slice(0, 5);

  if (!rows.length) return null;

  return {
    sideLabel,
    timeLabel: current.timeLabel,
    title: current.name,
    rows,
    restCount: Math.max(0, current.transferRows.length - rows.length),
    mode: narratingItem ? 'narrative' : 'preview'
  };
}

const narrativeTransferOverlaySingle = computed(() => {
  if (isCompare.value) return null;

  const hasNarrative = !!singleNarrativeRunning.value;
  const hasPreview =
    keyframeListPreviewStepIndexYes.value != null &&
    !isSinglePlaybackSessionActive.value;

  if (!hasNarrative && !hasPreview) return null;

  return buildNarrativeTransferOverlay(
    timelineItemsYes.value,
    '有云匣子',
    keyframeListPreviewStepIndexYes.value
  );
});

const narrativeTransferOverlayYes = computed(() => {
  if (!isCompare.value) return null;

  const hasNarrative =
    !!globalNarrativeRunning.value &&
    !!globalNarrativePendingLeft.value;

  const hasPreview =
    keyframeListPreviewStepIndexYes.value != null &&
    !isComparePlaybackSessionActive.value;

  if (!hasNarrative && !hasPreview) return null;

  return buildNarrativeTransferOverlay(
    timelineItemsYes.value,
    '有云匣子',
    keyframeListPreviewStepIndexYes.value
  );
});

const narrativeTransferOverlayNo = computed(() => {
  if (!isCompare.value) return null;

  const hasNarrative =
    !!globalNarrativeRunning.value &&
    !!globalNarrativePendingRight.value;

  const hasPreview =
    keyframeListPreviewStepIndexNo.value != null &&
    !isComparePlaybackSessionActive.value;

  if (!hasNarrative && !hasPreview) return null;

  return buildNarrativeTransferOverlay(
    timelineItemsNo.value,
    '无云匣子',
    keyframeListPreviewStepIndexNo.value
  );
});

function closeNarrativeTransferOverlay(side) {
  if (side === 'no') {
    keyframeListPreviewStepIndexNo.value = null;
    return;
  }

  keyframeListPreviewStepIndexYes.value = null;
}

/** 与「链路节点」按钮同口径：对关键点代表卡片取一节点，首节点优先，否则飞机 */
function getRepresentativeUnitIdForKeyframeCard(side, fullCard) {
  if (!fullCard) return 'plane';
  const nodes = buildRelationNodeList(side, fullCard);
  for (let i = 0; i < nodes.length; i++) {
    if (isValidCompareFocusUnitId(nodes[i]?.id)) {
      return String(nodes[i].id).trim();
    }
  }
  return 'plane';
}

/**
 * 在 silent scrub 与 refreshAll 之后：单次 focusUnit 飞到代表单位，不触发 RUN_NARRATIVE / 关系序列飞行叙事。
 * Cesium 单屏无 iframe 时 onCompareRelationNodeClick 不聚焦，此处保持与之一致（不新增 Cesium 飞行逻辑）。
 */
function focusUnitAfterKeyframePreview(side, item) {
  const fullCard = item?.fullCard;
  if (!fullCard) return;
  const unitId = getRepresentativeUnitIdForKeyframeCard(side, fullCard);
  if (isCompare.value) {
    const bridgeSide = side === 'yes' ? 'left' : 'right';
    const b = compareBridgeRef.value;
    if (b?.focusUnit) b.focusUnit(bridgeSide, { unitId: String(unitId) });
    return;
  }
  if (useSingleMapIframe) {
    singleIframeBridgeRef.value?.focusUnit?.('left', { unitId: String(unitId) });
  }
}

function focusTransferNode(payload) {
  if (!canPreviewKeyframes.value) return;

  const unitId = String(payload?.unitId ?? '').trim();
  const side = payload?.side;

  if (!isValidCompareFocusUnitId(unitId)) return;
  if (side !== 'yes' && side !== 'no') return;

  if (isCompare.value) {
    const bridgeSide = side === 'yes' ? 'left' : 'right';
    compareBridgeRef.value?.focusUnit?.(bridgeSide, { unitId });
    return;
  }

  if (useSingleMapIframe && side === 'yes') {
    singleIframeBridgeRef.value?.focusUnit?.('left', { unitId });
  }
}

function focusTransferRelation(payload) {
  if (!canPreviewKeyframes.value) return;

  const relationId = String(payload?.relationId ?? '').trim();
  const side = payload?.side;
  if (!relationId) return;
  if (side !== 'yes' && side !== 'no') return;

  if (isCompare.value) {
    const bridgeSide = side === 'yes' ? 'left' : 'right';
    compareBridgeRef.value?.focusRelation?.(bridgeSide, {
      relationId,
      fromId: payload?.fromId,
      toId: payload?.toId,
      nodeIds: Array.isArray(payload?.nodeIds) ? payload.nodeIds : []
    });
    return;
  }

  if (useSingleMapIframe && side === 'yes') {
    singleIframeBridgeRef.value?.focusRelation?.('left', {
      relationId,
      fromId: payload?.fromId,
      toId: payload?.toId,
      nodeIds: Array.isArray(payload?.nodeIds) ? payload.nodeIds : []
    });
  }
}

/**
 * 从 FloatingCard 关键时间点：停播、清 pulsing、设时间、silent scrub、refresh 后再单次 focus（见上）。不跑叙事。
 */
function pausePlaybackForKeyframePreview() {
  if (!isCompare.value) {
    stopTimer();
    singlePlaybackSessionActive.value = false;
    singlePlaybackResumeFromCurrent.value = true;
  } else {
    compareBridgeRef.value?.pauseBoth?.();
    playbackMode.value = 'idle';
    playingGlobal.value = false;
    playingLeft.value = false;
    playingRight.value = false;
    comparePlaybackResumeFromCurrent.value = true;
    clearCompareGlobalNarrativeState();
  }
  clearPulsingMilestones();
  singleNarrativeRunning.value = false;
  singleIframeShouldResumeAfterNarrative.value = false;
}

function previewKeyframe(payload) {
  const side = payload?.side;
  const demoT = Number(payload?.demoT);
  const stepIdx = payload?.markStepIndex;
  if (side !== 'yes' && side !== 'no') return;
  if (!Number.isFinite(demoT) || stepIdx == null || !Number.isFinite(Number(stepIdx))) return;
  const maxT = isCompare.value ? timelineMax.value : timelineMaxSingle.value;
  if (maxT <= 0) return;
  if (demoT < -1e-4 || demoT > maxT + 0.01) return;

  pausePlaybackForKeyframePreview();
  if (isCompare.value) {
    forceSceneUnlocked.value = true;
  }

  if (side === 'yes') {
    keyframeListPreviewStepIndexYes.value = stepIdx;
    if (!isCompare.value) {
      t.value = clamp(demoT, 0, maxT);
      hasEnteredKeyframeSingle.value = true;
      syncSinglePlaneProgressFromTime(t.value);
      rebuildFiredSingleMarksFromScrub();
      if (useSingleMapIframe) {
        singleIframeBridgeRef.value?.scrub?.('left', t.value, { silent: true });
      } else {
        vpSingle.value?.cancelRelationFocusSequence?.();
      }
    } else {
      tYes.value = clamp(demoT, 0, maxT);
      hasEnteredKeyframeYes.value = true;
      if (maxT > 0) {
        planeProgressLeft.value = clamp(demoT / maxT, 0, 1);
      }
      compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value, 0);
      compareBridgeRef.value?.scrub?.('left', tYes.value, { silent: true });
    }
  } else {
    keyframeListPreviewStepIndexNo.value = stepIdx;
    tNo.value = clamp(demoT, 0, maxT);
    hasEnteredKeyframeNo.value = true;
    if (maxT > 0) {
      planeProgressRight.value = clamp(demoT / maxT, 0, 1);
    }
    compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value, 0);
    compareBridgeRef.value?.scrub?.('right', tNo.value, { silent: true });
  }

  if (isCompare.value) rebuildFiredCompareMarksFromScrub();

  nextTick(() => {
    refreshAll(true);
    if (payload?.item) {
      focusUnitAfterKeyframePreview(side, payload.item);
    }
  });
}

const updateCompareMarkers = () => {
  if (!isCompare.value) return;
  const rangeMax = timelineMax.value;
  if (rangeMax <= 0) return;
  const posNo = clamp((tNo.value / rangeMax) * 100, 0, 100);
  const posYes = clamp((tYes.value / rangeMax) * 100, 0, 100);
  markerNoLeft.value = posNo;
  markerYesLeft.value = posYes;
  markerNoAlign.value = posNo < 8 ? 'left' : posNo > 92 ? 'right' : 'center';
  markerYesAlign.value = posYes < 8 ? 'left' : posYes > 92 ? 'right' : 'center';
  const sNo = toCompareSemanticAbsT(tNo.value);
  const sYes = toCompareSemanticAbsT(tYes.value);
  markerNoTitle.value = `无云匣子侧：T:${sNo.toFixed(1)}s`;
  markerYesTitle.value = `有云匣子侧：T:${sYes.toFixed(1)}s`;
  markerNoLabel.value = `T:${sNo.toFixed(1)}s`;
  markerYesLabel.value = `T:${sYes.toFixed(1)}s`;
};

const render = () => {
  const nodeYes = steps.value[idxYes.value];
  if (!nodeYes) return;
  currentNodeName.value = nodeYes.title;
  infoFields.value.f_node = currentCard.value.title || '起始';
  infoFields.value.f_state = currentCard.value.state || '待证实';
};

const updateFloatingCard = (node) => {
  if (!node) return;
  currentNodeId.value = node.id;
};

const highlightDisposalList = (node) => {
  currentNodeId.value = node?.id || -1;
};

const renderCompareStepsTable = () => {
  // compareStepsTable 由 steps 渲染
};

const showAlertToast = (title, message) => {
  alertTitle.value = title;
  alertBody.value = message;
  alertToastVisible.value = true;
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => {
    hideAlertToast();
  }, 5000);
};

const hideAlertToast = () => {
  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }
  alertToastVisible.value = false;
};

const autoScrollToCurrent = () => {
  if (!stepListEl.value) return;
  const cur = stepListEl.value.querySelector('.item.is-current');
  if (!cur) return;
  const box = stepListEl.value.getBoundingClientRect();
  const c = cur.getBoundingClientRect();
  const pad = 24;
  if (c.top < box.top + pad || c.bottom > box.bottom - pad) {
    cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
};

function shouldGateSceneInCompare() {
  if (!isCompare.value) return false;
  if (forceSceneUnlocked.value) return false;
  if (playbackMode.value === 'idle') return false;
  if (playbackMode.value === 'global') {
    return (
      playingGlobal.value &&
      Math.min(planeProgressLeft.value, planeProgressRight.value) < CRUISE_PATH_PROGRESS
    );
  }
  if (playbackMode.value === 'left') {
    return playingLeft.value && planeProgressLeft.value < CRUISE_PATH_PROGRESS;
  }
  if (playbackMode.value === 'right') {
    return playingRight.value && planeProgressRight.value < CRUISE_PATH_PROGRESS;
  }
  return false;
}

function resetCompareResumeFlag() {
  comparePlaybackResumeFromCurrent.value = false;
}

function isNearKeyframeDemoT(side, demoT) {
  const targetSide = side === 'no' ? 'no' : 'yes';
  const tNum = Number(demoT);
  if (!Number.isFinite(tNum)) return false;
  const marks = keyframeMarks.value || [];
  return marks.some((m) => m.side === targetSide && Math.abs(Number(m.t) - tNum) <= 1e-4);
}

function nudgeSingleResumeTimePastKeyframe() {
  if (!singlePlaybackResumeFromCurrent.value) return;
  const max = timelineMaxSingle.value;
  if (max <= 0) return;
  if (!isNearKeyframeDemoT('yes', t.value)) return;

  const nextT = clamp(t.value + RESUME_AFTER_KEYFRAME_EPS, 0, max);
  if (Math.abs(nextT - t.value) <= 1e-6) return;

  t.value = nextT;
  syncSinglePlaneProgressFromTime(t.value);
  rebuildFiredSingleMarksFromScrub();

  if (useSingleMapIframe) {
    singleIframeBridgeRef.value?.scrub?.('left', t.value, { silent: true });
  }

  refreshAll(false);
}

function nudgeCompareResumeSidePastKeyframe(side) {
  const isYes = side === 'yes';
  const max = timelineMax.value;
  if (max <= 0) return;

  const curT = isYes ? tYes.value : tNo.value;
  if (!isNearKeyframeDemoT(isYes ? 'yes' : 'no', curT)) return;

  const nextT = clamp(curT + RESUME_AFTER_KEYFRAME_EPS, 0, max);
  if (Math.abs(nextT - curT) <= 1e-6) return;

  if (isYes) {
    tYes.value = nextT;
    planeProgressLeft.value = max > 0 ? clamp(nextT / max, 0, 1) : 0;
    compareBridgeRef.value?.scrub?.('left', tYes.value, { silent: true });
  } else {
    tNo.value = nextT;
    planeProgressRight.value = max > 0 ? clamp(nextT / max, 0, 1) : 0;
    compareBridgeRef.value?.scrub?.('right', tNo.value, { silent: true });
  }
}

function nudgeCompareResumeTimesPastKeyframes(sides = ['yes', 'no']) {
  if (!comparePlaybackResumeFromCurrent.value) return;
  if (!Array.isArray(sides)) return;

  sides.forEach((sd) => {
    if (sd === 'yes' || sd === 'no') {
      nudgeCompareResumeSidePastKeyframe(sd);
    }
  });

  compareGlobalDisplayT.value = Math.max(tYes.value, tNo.value, 0);
  rebuildFiredCompareMarksFromScrub();
  updateCompareMarkers();
  refreshAll(false);
}

function rebuildFiredCompareMarksFromScrub() {
  const yesSet = new Set();
  const noSet = new Set();
  const list = keyframeMarks.value || [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.side === 'yes' && m.t <= tYes.value + 1e-5) yesSet.add(m.stepIndex);
    if (m.side === 'no' && m.t <= tNo.value + 1e-5) noSet.add(m.stepIndex);
  }
  firedMarkStepIndexYes.value = yesSet;
  firedMarkStepIndexNo.value = noSet;
}

function markCompareSessionEndedIfReachedEnd() {
  if (!isCompare.value) return;
  if (playbackMode.value === 'idle') return;
  if (isNarrativeInProgress.value) return;

  const max = timelineMax.value;
  const eps = 1e-3;

  if (playbackMode.value === 'global') {
    if (
      !playingLeft.value &&
      !playingRight.value &&
      tYes.value >= max - eps &&
      tNo.value >= max - eps
    ) {
      playingGlobal.value = false;
      playbackMode.value = 'idle';
      resetCompareResumeFlag();
      clearPulsingMilestones();
    }
    return;
  }

  if (playbackMode.value === 'left') {
    if (!playingLeft.value && tYes.value >= max - eps) {
      playbackMode.value = 'idle';
      resetCompareResumeFlag();
      pulsingMilestoneYes.value = null;
    }
    return;
  }

  if (playbackMode.value === 'right') {
    if (!playingRight.value && tNo.value >= max - eps) {
      playbackMode.value = 'idle';
      resetCompareResumeFlag();
      pulsingMilestoneNo.value = null;
    }
  }
}

function stopAllCompareFlightAndScene() {
  compareBridgeRef.value?.pauseBoth?.();
  singleIframeBridgeRef.value?.pause?.('left');
  playingGlobal.value = false;
  playingLeft.value = false;
  playingRight.value = false;
  playbackMode.value = 'idle';
  resetCompareResumeFlag();
  clearCompareGlobalNarrativeState();
  clearPulsingMilestones();
}

/** 全局播放：iframe 双机同飞（沿线与叙事由 scene.js） */
function startGlobalPlayback() {
  if (!isCompare.value) return;
  forceSceneUnlocked.value = false;

  const shouldResumeFromCurrent = comparePlaybackResumeFromCurrent.value;
  const fromStart = !shouldResumeFromCurrent;

  if (!shouldResumeFromCurrent) {
    clearCompareGlobalNarrativeState();
    clearCompareFaultAlerts();
    clearKeyframeEntryState();
  } else {
    clearCompareGlobalNarrativeState();
    rebuildFiredCompareMarksFromScrub();
  }

  compareBridgeRef.value?.pauseBoth?.();
  playingGlobal.value = true;
  playbackMode.value = 'global';
  if (shouldResumeFromCurrent) {
    nudgeCompareResumeTimesPastKeyframes(['yes', 'no']);
  }
  compareBridgeRef.value?.playBoth?.({ fromStart, parentControlsNarrative: true });
  comparePlaybackResumeFromCurrent.value = false;
}

/** 单侧播放：对侧复位后本侧从头播（父页裁决关键点，与全局播一致） */
function startSidePlayback(side) {
  if (!isCompare.value) return;
  forceSceneUnlocked.value = false;

  const shouldResumeFromCurrent = comparePlaybackResumeFromCurrent.value;
  const fromStart = !shouldResumeFromCurrent;

  playingGlobal.value = false;

  if (!shouldResumeFromCurrent) {
    clearCompareGlobalNarrativeState();
    clearCompareFaultAlerts();
    clearKeyframeEntryState();
  } else {
    clearCompareGlobalNarrativeState();
    rebuildFiredCompareMarksFromScrub();
  }

  compareBridgeRef.value?.pauseBoth?.();
  if (side === 'left') {
    playbackMode.value = 'left';
    if (!shouldResumeFromCurrent) compareBridgeRef.value?.reset('right');
    if (shouldResumeFromCurrent) {
      nudgeCompareResumeTimesPastKeyframes(['yes']);
    }
    compareBridgeRef.value?.play('left', { fromStart, parentControlsNarrative: true });
  } else {
    playbackMode.value = 'right';
    if (!shouldResumeFromCurrent) compareBridgeRef.value?.reset('left');
    if (shouldResumeFromCurrent) {
      nudgeCompareResumeTimesPastKeyframes(['no']);
    }
    compareBridgeRef.value?.play('right', { fromStart, parentControlsNarrative: true });
  }
  comparePlaybackResumeFromCurrent.value = false;
}

function pauseGlobalPlayback() {
  if (!isCompare.value) return;
  if (isNarrativeInProgress.value) {
    showAlertToast('叙事播放中', '当前正在展示关键链路叙事，暂不支持暂停。');
    return;
  }
  compareBridgeRef.value?.pauseBoth?.();
  playingGlobal.value = false;
  playbackMode.value = 'idle';
  clearCompareGlobalNarrativeState();
  clearPulsingMilestones();
  comparePlaybackResumeFromCurrent.value = false;
}

function pauseLeftPlayback() {
  if (!isCompare.value) return;
  if (isNarrativeInProgress.value) {
    showAlertToast('叙事播放中', '当前正在展示关键链路叙事，暂不支持暂停。');
    return;
  }
  compareBridgeRef.value?.pause('left');
  if (playbackMode.value === 'left') {
    globalNarrativeRunning.value = false;
    globalNarrativePendingLeft.value = false;
    globalNarrativePendingRight.value = false;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = null;
    pulsingMilestoneYes.value = null;
    playbackMode.value = 'idle';
    playingLeft.value = false;
    comparePlaybackResumeFromCurrent.value = false;
  }
}

function pauseRightPlayback() {
  if (!isCompare.value) return;
  if (isNarrativeInProgress.value) {
    showAlertToast('叙事播放中', '当前正在展示关键链路叙事，暂不支持暂停。');
    return;
  }
  compareBridgeRef.value?.pause('right');
  if (playbackMode.value === 'right') {
    globalNarrativeRunning.value = false;
    globalNarrativePendingLeft.value = false;
    globalNarrativePendingRight.value = false;
    globalNarrativeStepIndexLeft.value = null;
    globalNarrativeStepIndexRight.value = null;
    globalNarrativeRoundDemoT.value = null;
    pulsingMilestoneNo.value = null;
    playbackMode.value = 'idle';
    playingRight.value = false;
    comparePlaybackResumeFromCurrent.value = false;
  }
}

function resetCompareAll() {
  forceSceneUnlocked.value = false;
  stopAllCompareFlightAndScene();
  clearCompareFaultAlerts();
  clearKeyframeEntryState();
  playbackMode.value = 'idle';
  tYes.value = 0;
  tNo.value = 0;
  planeProgressLeft.value = 0;
  planeProgressRight.value = 0;
  lastNodeIdNo.value = -1;
  lastNodeIdYes.value = -1;
  compareIframeMountKey.value += 1;
  if (isCompare.value) compareBridgeRef.value?.resetBoth?.();
  refreshAll(true);
}

function toggleGlobalComparePlay() {
  if (!isCompare.value) return;
  if (compareGlobalTimelinePlaying.value) {
    pauseGlobalPlayback();
    return;
  }
  startGlobalPlayback();
}

function toggleCompareSidePlay(side) {
  if (!isCompare.value) return;
  if (playbackMode.value === 'global') {
    pauseGlobalPlayback();
    return;
  }
  if (side === 'left') {
    if (compareLeftTimelinePlaying.value && playbackMode.value === 'left') {
      pauseLeftPlayback();
      return;
    }
    startSidePlayback('left');
    return;
  }
  if (compareRightTimelinePlaying.value && playbackMode.value === 'right') {
    pauseRightPlayback();
    return;
  }
  startSidePlayback('right');
}

function onScrubCompareYes(val) {
  if (!isCompare.value) return;
  forceSceneUnlocked.value = true;
  const max = timelineMax.value;
  tYes.value = clamp(Number(val) ?? 0, 0, max);
  refreshAll(false);
  compareBridgeRef.value?.scrub('left', tYes.value);
}

function onScrubCompareNo(val) {
  if (!isCompare.value) return;
  forceSceneUnlocked.value = true;
  const max = timelineMax.value;
  tNo.value = clamp(Number(val) ?? 0, 0, max);
  refreshAll(false);
  compareBridgeRef.value?.scrub('right', tNo.value);
}

function resetCompareSide(side) {
  if (!isCompare.value) return;
  comparePlaybackResumeFromCurrent.value = false;
  forceSceneUnlocked.value = true;
  if (playbackMode.value === 'global') {
    clearCompareGlobalNarrativeState();
  } else {
    if (side === 'left') {
      firedMarkStepIndexYes.value = new Set();
      globalNarrativePendingLeft.value = false;
    } else {
      firedMarkStepIndexNo.value = new Set();
      globalNarrativePendingRight.value = false;
    }
    if (globalNarrativeRunning.value && !globalNarrativePendingLeft.value && !globalNarrativePendingRight.value) {
      globalNarrativeRunning.value = false;
      globalNarrativeStepIndexLeft.value = null;
      globalNarrativeStepIndexRight.value = null;
      globalNarrativeRoundDemoT.value = null;
    }
  }
  if (side === 'left') compareFaultAlertFiredYes.value = false;
  else compareFaultAlertFiredNo.value = false;
  compareBridgeRef.value?.reset(side === 'left' ? 'left' : 'right');
  if (side === 'left') {
    tYes.value = 0;
    planeProgressLeft.value = 0;
    lastNodeIdYes.value = -1;
    hasEnteredKeyframeYes.value = false;
    pulsingMilestoneYes.value = null;
  } else {
    tNo.value = 0;
    planeProgressRight.value = 0;
    lastNodeIdNo.value = -1;
    hasEnteredKeyframeNo.value = false;
    pulsingMilestoneNo.value = null;
  }
  refreshAll(true);
}

const refreshAll = (fromUser = false) => {
  if (!isCompare.value) syncSinglePlaneProgressFromTime(t.value);
  render();
  const timeNo = isCompare.value ? tNo.value : t.value;
  const timeYes = isCompare.value ? tYes.value : t.value;
  const curIdxNo = getCurrentNodeIndexByTime(timeNo, 'no');
  const curIdxYes = getCurrentNodeIndexByTime(timeYes, 'yes');
  const nodeNo = steps.value[curIdxNo];
  const nodeYes = steps.value[curIdxYes];

  const gateScene = shouldGateSceneInCompare();

  if (!isCompare.value) {
    visibleRelationIdsLeft.value = nodeYes?.activeRelations_yes ?? [];
    visibleRelationIdsRight.value = [];
    visibleUnitClusterIdsLeft.value = ['DYN_YES'];
    visibleUnitClusterIdsRight.value = [];
  } else if (gateScene) {
    visibleRelationIdsLeft.value = [];
    visibleRelationIdsRight.value = [];
    visibleUnitClusterIdsLeft.value = ['DYN_YES'];
    visibleUnitClusterIdsRight.value = ['DYN_NO'];
  } else {
    visibleRelationIdsLeft.value = nodeYes?.activeRelations_yes ?? [];
    visibleRelationIdsRight.value = nodeNo?.activeRelations_no ?? [];
    visibleUnitClusterIdsLeft.value = ['DYN_YES'];
    visibleUnitClusterIdsRight.value = ['DYN_NO'];
  }

  if (!isCompare.value) {
    if (nodeYes && curIdxYes !== lastNodeIdSingle.value) {
      updateFloatingCard(nodeYes);
      highlightDisposalList(nodeYes);
      lastNodeIdSingle.value = curIdxYes;
      if (rightTab.value === 'steps') {
        nextTick(() => autoScrollToCurrent());
      }
    }
  } else {
    if (nodeNo && curIdxNo !== lastNodeIdNo.value) {
      lastNodeIdNo.value = curIdxNo;
    }
    if (nodeYes && curIdxYes !== lastNodeIdYes.value) {
      updateFloatingCard(nodeYes);
      highlightDisposalList(nodeYes);
      lastNodeIdYes.value = curIdxYes;
      if (rightTab.value === 'steps') {
        nextTick(() => autoScrollToCurrent());
      }
    }
  }

  if (isCompare.value) renderCompareStepsTable();
  updateCompareMarkers();
};

let scrubRaf = 0;

const stopTimer = () => {
  if (!isCompare.value && useSingleMapIframe) {
    singleIframeShouldResumeAfterNarrative.value = false;
    singleNarrativeRunning.value = false;
    singleIframeBridgeRef.value?.pause?.('left');
    playing.value = false;
    clearPulsingMilestones();
    singlePlaybackSessionActive.value = false;
    singlePlaybackResumeFromCurrent.value = false;
    return;
  }
  if (singlePlayRafId) {
    cancelAnimationFrame(singlePlayRafId);
    singlePlayRafId = 0;
  }
  singlePlayLastTs = 0;
  playing.value = false;
  singleNarrativeRunning.value = false;
  if (!isCompare.value) {
    vpSingle.value?.cancelRelationFocusSequence?.();
  }
  clearPulsingMilestones();
  singlePlaybackSessionActive.value = false;
  singlePlaybackResumeFromCurrent.value = false;
};

function singlePlayTick(ts) {
  if (isCompare.value || !playing.value) {
    singlePlayRafId = 0;
    return;
  }
  if (singlePlayLastTs === 0) singlePlayLastTs = ts;
  const elapsed = (ts - singlePlayLastTs) / 1000;
  singlePlayLastTs = ts;
  const max = timelineMaxSingle.value;
  if (t.value >= max - 1e-9) {
    stopTimer();
    return;
  }
  const prevT = t.value;
  let nextT = Math.min(prevT + elapsed, max);
  const nextMark = peekNextUnfiredMarkSingle();
  if (nextMark && shouldTriggerSingleKeyframe(prevT, nextT, nextMark)) {
    hasEnteredKeyframeSingle.value = true;
    pulsingMilestoneSingle.value = pulsingMilestoneForNarrativeMark(nextMark, 'single');
    t.value = nextMark.t;
    const s = new Set(firedMarkStepIndexSingle.value);
    s.add(nextMark.stepIndex);
    firedMarkStepIndexSingle.value = s;
    syncSinglePlaneProgressFromTime(t.value);
    refreshAll(false);
    void (async () => {
      await runSingleKeyframeNarrativeAsync(nextMark);
      if (!isCompare.value && playing.value) {
        singlePlayLastTs = 0;
        singlePlayRafId = requestAnimationFrame(singlePlayTick);
      } else {
        singlePlayRafId = 0;
      }
    })();
    return;
  }
  t.value = nextT;
  syncSinglePlaneProgressFromTime(t.value);
  refreshAll(false);
  if (t.value >= max - 1e-9) {
    stopTimer();
    return;
  }
  singlePlayRafId = requestAnimationFrame(singlePlayTick);
}

const startTimer = () => {
  if (isCompare.value) return;
  keyframeListPreviewStepIndexYes.value = null;
  keyframeListPreviewStepIndexNo.value = null;

  if (!isCompare.value && useSingleMapIframe) {
    singlePlaybackSessionActive.value = true;
    playing.value = true;
    const shouldResumeFromCurrent = singlePlaybackResumeFromCurrent.value;
    const fromStart = !shouldResumeFromCurrent && t.value < 0.01;
    if (shouldResumeFromCurrent) {
      nudgeSingleResumeTimePastKeyframe();
    }
    singleIframeBridgeRef.value?.play?.('left', {
      fromStart,
      parentControlsNarrative: true
    });
    singlePlaybackResumeFromCurrent.value = false;
    return;
  }
  if (singlePlayRafId) return;
  singlePlaybackSessionActive.value = true;
  playing.value = true;
  singlePlaybackResumeFromCurrent.value = false;
  planePathEnabled.value = true;
  vpSingle.value?.setPlaneCameraFollow?.(true);
  singlePlayLastTs = 0;
  singlePlayRafId = requestAnimationFrame(singlePlayTick);
};

const jumpTo = (targetT) => {
  if (isCompare.value) return;
  const max = timelineMaxSingle.value;
  const nextT = clamp(Number(targetT) || 0, 0, max);
  if (playing.value) {
    stopTimer();
  }
  if (useSingleMapIframe) {
    singleNarrativeRunning.value = false;
    singleIframeShouldResumeAfterNarrative.value = false;
    if (nextT === t.value) {
      rebuildFiredSingleMarksFromScrub();
      refreshAll(true);
      return;
    }
    t.value = nextT;
    planeProgress.value = max > 0 ? clamp(nextT, 0, max) / max : 0;
    rebuildFiredSingleMarksFromScrub();
    singleIframeBridgeRef.value?.scrub?.('left', nextT);
    refreshAll(true);
    console.log('[jumpTo]', nextT);
    return;
  }
  if (nextT === t.value) {
    syncSinglePlaneProgressFromTime(t.value);
    rebuildFiredSingleMarksFromScrub();
    refreshAll(true);
    return;
  }
  t.value = nextT;
  syncSinglePlaneProgressFromTime(t.value);
  rebuildFiredSingleMarksFromScrub();
  refreshAll(true);
  console.log('[jumpTo]', nextT);
};

const togglePlay = () => {
  if (isCompare.value) return;
  if (isNarrativeInProgress.value && singlePlaybackSessionActive.value) {
    showAlertToast('叙事播放中', '当前正在展示关键链路叙事，暂不支持暂停。');
    return;
  }
  if (singlePlaybackSessionActive.value) {
    stopTimer();
  } else {
    startTimer();
  }
  console.log('[DynamicFlow] playing', playing.value);
};

const onReset = () => {
  if (isCompare.value) return;
  stopTimer();
  singlePlaybackSessionActive.value = false;
  singlePlaybackResumeFromCurrent.value = false;
  if (useSingleMapIframe) {
    singleNarrativeRunning.value = false;
    singleIframeShouldResumeAfterNarrative.value = false;
    singleIframeMountKey.value += 1;
    t.value = 0;
    planeProgress.value = 0;
    lastNodeIdNo.value = -1;
    lastNodeIdYes.value = -1;
    lastNodeIdSingle.value = -1;
    firedMarkStepIndexSingle.value = new Set();
    compareFaultAlertFiredYes.value = false;
    clearKeyframeEntryState();
    refreshAll(true);
    console.log('[DynamicFlow] reset');
    return;
  }
  t.value = 0;
  planeProgress.value = 0;
  lastNodeIdNo.value = -1;
  lastNodeIdYes.value = -1;
  lastNodeIdSingle.value = -1;
  firedMarkStepIndexSingle.value = new Set();
  clearKeyframeEntryState();
  refreshAll(true);
  console.log('[DynamicFlow] reset');
};

const onScrub = (val) => {
  if (isCompare.value) return;
  const max = timelineMaxSingle.value;
  const nextT = clamp(Number(val) ?? 0, 0, max);
  if (useSingleMapIframe) {
    singleNarrativeRunning.value = false;
    singleIframeShouldResumeAfterNarrative.value = false;
    t.value = nextT;
    planeProgress.value = max > 0 ? clamp(nextT, 0, max) / max : 0;
    rebuildFiredSingleMarksFromScrub();
    singleIframeBridgeRef.value?.scrub?.('left', nextT);
    if (scrubRaf) cancelAnimationFrame(scrubRaf);
    scrubRaf = requestAnimationFrame(() => {
      refreshAll(false);
    });
    return;
  }
  if (singleNarrativeRunning.value) {
    vpSingle.value?.cancelRelationFocusSequence?.();
    singleNarrativeRunning.value = false;
  }
  t.value = nextT;
  syncSinglePlaneProgressFromTime(t.value);
  rebuildFiredSingleMarksFromScrub();
  if (scrubRaf) cancelAnimationFrame(scrubRaf);
  scrubRaf = requestAnimationFrame(() => {
    refreshAll(false);
  });
};

const hideInfoBox = () => {
  infoBoxVisible.value = false;
};

const showInfoBox = (type) => {
  if (type === 'plane' || type === 'flow' || type === 'control') {
    infoBoxVisible.value = false;
    return;
  }
  const card = currentCardYes.value;
  infoBoxVisible.value = true;
};

/** links.json 中信息流、控制流对应的 relation.id */
const RELATION_ID_FLOW = 'link-sat-ground';
const RELATION_ID_CONTROL = 'link-flight-emergency';

const selectSymbol = (type) => {
  activeSymbol.value = type;
  if (type === 'flow') {
    selectedRelationId.value = selectedRelationId.value === RELATION_ID_FLOW ? null : RELATION_ID_FLOW;
    console.log('[symbol] 信息流', selectedRelationId.value ? '显示链路' : '隐藏链路');
  } else if (type === 'control') {
    selectedRelationId.value = selectedRelationId.value === RELATION_ID_CONTROL ? null : RELATION_ID_CONTROL;
    console.log('[symbol] 控制流', selectedRelationId.value ? '显示链路' : '隐藏链路');
  }
  showInfoBox(type);
};

/** 飞机按钮：与静态架构页一致，相机飞行聚焦飞机 */
const onPlaneButtonClick = () => {
  if (useSingleMapIframe) return;
  activeSymbol.value = 'plane';
  const v = vpSingle.value?.getViewer?.();
  const plane = vpSingle.value?.getPlaneEntity?.();
  if (v && plane) {
    v.flyTo(plane, {
      duration: 0.8,
      offset: new Cesium.HeadingPitchRange(
        v.camera.heading,
        Cesium.Math.toRadians(-25),
        200
      )
    });
  }
};

const buildSteps = (base) => {
  // base: [{ t, title, phase, summary, desc, events, evidence, actions, alert, state }]
  const saves = [0, 5, 10, 15, 20, 25, 35, 35, 35];
  return base.map((item, idx) => {
    const t_no = Number(item.t ?? 0);
    const t_yes = Math.max(0, t_no - (saves[idx] ?? 35));
    const hops_no = 3 + idx;
    const hops_yes = Math.max(1, hops_no - 1 - Math.floor(idx / 2));
    const path_no = `地面→中继${idx + 1}→中继${idx + 2}→机载`;
    const path_yes = hops_yes > 1 ? `地面→中继${idx + 1}→机载` : `地面→机载`;
    return {
      id: idx,
      nodeId: idx,
      name: item.title,
      title: item.title,
      phase: item.phase,
      summary: item.summary,
      desc: item.desc,
      events: item.events,
      evidence: item.evidence,
      actions: item.actions,
      alert: item.alert || '',
      state: item.state || '待证实',
      // 原型关键字段：
      t_no,
      t_yes,
      hops_no,
      hops_yes,
      path_no,
      path_yes
    };
  });
};

const buildDisposalCards = (items) => {
  return items
    .map((s) => toSideCard(s, 'yes'))
    .filter((card) => String(card.title || '').trim());
};

const loadScenario = async (key) => {
  const scenarioKey = key === 'engine' ? 'engine_failure' : key;
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const url = base ? `${base}/config/dynamic_scenarios.json` : '/config/dynamic_scenarios.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch scenarios failed');
    const data = await res.json();
    const scenario = data?.scenarios?.[scenarioKey];
    if (!scenario) {
      showAlertToast('提示', '配置中不存在该场景，请从已有场景选择。');
      console.warn('[DynamicFlow] scenario not found:', scenarioKey);
      return;
    }
    pendingSingleLoadScenario.value = false;
    const uu = resolveScenarioAssetPath(scenario.unitsUrl);
    const lu = resolveScenarioAssetPath(scenario.linksUrl);
    currentUnitsUrl.value = uu || engineFailureUnitsUrl;
    currentLinksUrl.value = lu || dynamicLinksUrl;
    await fetchDynamicCompareMaps();
    const nodes = scenario.nodes || [];
    scenarioNodes.value = nodes;
    narrativeMilestonesFromJson.value = scenario.narrativeMilestones || null;
    timelineMax.value = computeTimelineMaxFromNodes(nodes);
    timelineMaxSingle.value = computeSingleScreenTimelineMaxFromNodes(nodes);
    compareFaultAlertTextYes.value = firstAlertTextForSide(nodes, 'yes');
    compareFaultAlertTextNo.value = firstAlertTextForSide(nodes, 'no');
    clearCompareFaultAlerts();
    infoFields.value.f_time = `T+0 ~ T+${timelineMaxSingle.value.toFixed(0)}（示意）`;
    steps.value = nodes.map((node, idx) => {
      const y = node.yes || {};
      const n = node.no || {};
      return {
        id: idx,
        nodeId: node.nodeId ?? idx,
        t_yes: toFiniteTime(y.t),
        t_no: toFiniteTime(n.t),
        name: y.title ?? '',
        title: y.title ?? '',
        phase: y.phase ?? '',
        summary: y.summary ?? '',
        desc: y.desc ?? '',
        events: y.events ?? [],
        evidence: y.evidence ?? [],
        actions: y.actions ?? [],
        alert: y.alert ?? '',
        state: y.state ?? '待证实',
        title_no: n.title ?? '',
        phase_no: n.phase ?? '',
        summary_no: n.summary ?? '',
        desc_no: n.desc ?? '',
        events_no: n.events ?? [],
        evidence_no: n.evidence ?? [],
        actions_no: n.actions ?? [],
        alert_no: n.alert ?? '',
        state_no: n.state ?? '待证实',
        activeRelations_yes: y.activeRelations ?? [],
        activeRelations_no: n.activeRelations ?? [],
        hops_no: 3,
        hops_yes: 2,
        path_no: '地面→中继→机载',
        path_yes: '地面→机载',
        effects: node.effects,
        postReview: node.postReview
      };
    });
    disposalCards.value = buildDisposalCards(steps.value);
    activeScenario.value = key;
    const shouldRemountIframes =
      lastLoadedScenarioUiKey.value != null && lastLoadedScenarioUiKey.value !== key;
    stopTimer();
    stopAllCompareFlightAndScene();
    singleIframeShouldResumeAfterNarrative.value = false;
    singleNarrativeRunning.value = false;
    activePopup.value = null;
    showAirbornePopup.value = false;
    firedMarkStepIndexSingle.value = new Set();
    firedMarkStepIndexYes.value = new Set();
    firedMarkStepIndexNo.value = new Set();
    t.value = 0;
    tYes.value = 0;
    tNo.value = 0;
    planeProgress.value = 0;
    planeProgressLeft.value = 0;
    planeProgressRight.value = 0;
    lastNodeIdNo.value = -1;
    lastNodeIdYes.value = -1;
    lastNodeIdSingle.value = -1;
    clearKeyframeEntryState();
    forceSceneUnlocked.value = false;
    if (shouldRemountIframes) {
      if (isCompare.value) {
        compareIframeMountKey.value += 1;
      } else if (useSingleMapIframe) {
        singleIframeMountKey.value += 1;
      }
    }
    lastLoadedScenarioUiKey.value = key;
    refreshAll(true);
    selectedRelationId.value = steps.value[0]?.activeRelations_yes?.[0] ?? null;
    if (isCompare.value) {
      compareBridgeRef.value?.clearActiveMarkerBoth?.();
    } else if (useSingleMapIframe) {
      singleIframeBridgeRef.value?.clearActiveMarker?.('left');
    } else {
      vpSingle.value?.clearActiveMarker?.();
    }
    if (scenario.placeholder) {
      showAlertToast('提示', '该场景已切换，具体链路配置待补充');
    }
    console.log('[DynamicFlow] loadScenario', key);
  } catch (e) {
    console.warn('[DynamicFlow] loadScenario failed:', e);
  }
};

const toggleCompare = () => {
  hideAlertToast();
  isCompare.value = !isCompare.value;
  closePopup();
  hideInfoBox();
  stopTimer();
  if (!isCompare.value) {
    compareBridgeRef.value?.clearActiveMarkerBoth?.();
  }
  stopAllCompareFlightAndScene();
  resetDynamicFlowPlaybackIsolation();
  if (isCompare.value) {
    compareIframeMountKey.value += 1;
  } else {
    singleIframeMountKey.value += 1;
  }
  nextTick(() => {
    if (!isCompare.value) {
      if (!useSingleMapIframe) {
        vpSingle.value?.resize?.();
        vpSingle.value?.requestRender?.();
      } else if (!singleIframeReady.value) {
        pendingSingleLoadScenario.value = true;
      }
    }
    updateCompareMarkers();
    refreshAll(false);
  });
  console.log('[DynamicFlow] compare', isCompare.value);
};

loadScenario(activeScenario.value);

onMounted(() => {
  updateNarrativeTransferOverlayTop();
  window.addEventListener('resize', updateNarrativeTransferOverlayTop);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateNarrativeTransferOverlayTop);
  if (singleIframeSideStateRaf) {
    cancelAnimationFrame(singleIframeSideStateRaf);
    singleIframeSideStateRaf = 0;
  }
  planeScreenInfo.value = null;
  stopTimer();
  stopAllCompareFlightAndScene();
  singleIframeReady.value = false;
  pendingSingleLoadScenario.value = false;
  compareBridgeRef.value?.destroy?.();
  singleIframeBridgeRef.value?.destroy?.();
});
</script>

<style scoped>
/* 与静态架构页 .cb-cesium-layer--with-popup 内 popup 一致，仅定位层 */
.cb-dv-cesium-layer-with-popup {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}
.cb-plane-follow-popup {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  min-width: 220px;
  padding: 0;
  background: rgba(14, 44, 123, 0.42);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(42, 116, 201, 0.55);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.cb-plane-follow-popup-hd {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.2px;
  color: #eaf4ff;
  background: linear-gradient(180deg, rgba(60, 120, 255, 0.24), rgba(18, 52, 120, 0.1));
  border-bottom: 1px solid rgba(42, 116, 201, 0.42);
}
.cb-plane-follow-popup-bd {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
}
.cb-plane-follow-row {
  white-space: nowrap;
  padding: 8px 10px;
  background: rgba(8, 48, 109, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(42, 116, 201, 0.36);
  color: rgba(255, 255, 255, 0.94);
  line-height: 1.5;
}

/* 地图标点弹窗：与右侧信息面板一致风格 */
.marker-popup {
  z-index: 100;
  min-width: 220px;
  padding: 0;
  background: rgba(14, 44, 123, 0.42);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(42, 116, 201, 0.55);
  border-radius: 16px;
  font-size: 13px;
  color: #e0f0ff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
}
.marker-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.marker-popup-title {
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  text-shadow: 0 0 6px #00AFFF;
}
.marker-popup-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.marker-popup-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  max-width: 340px;
}
.marker-popup-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.marker-popup-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(82, 221, 255, 0.45);
  background: rgba(8, 48, 109, 0.62);
  color: #9fefff;
  font-size: 11px;
  line-height: 1.4;
}
.marker-popup-type {
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
}
.marker-popup-desc {
  padding: 10px 12px;
  background: rgba(8, 48, 109, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(42, 116, 201, 0.4);
  color: rgba(255, 255, 255, 0.94);
  line-height: 1.72;
  white-space: normal;
}
.airborne-popup-list {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}
.airborne-popup-list li {
  margin: 4px 0;
}
.cb-airborne-popup-follow {
  pointer-events: auto;
}

.cb-narrative-transfer-overlay {
  position: absolute;
  top: 112px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 32;
  width: min(416px, calc(80% - 38.4px));
  max-height: min(25.2vh, 192px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(120, 190, 255, 0.34);
  background: rgba(6, 28, 64, 0.76);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  color: rgba(230, 246, 255, 0.96);
  user-select: text;
  -webkit-user-select: text;
}

.cb-narrative-transfer-overlay--compare {
  left: 16px;
  right: auto;
  transform: none;
}

.cb-narrative-transfer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
  font-size: 11px;
  color: rgba(200, 230, 255, 0.76);
  flex-shrink: 0;
}

.cb-narrative-transfer-side {
  color: rgba(255, 213, 74, 0.96);
  font-weight: 700;
}

.cb-narrative-transfer-close {
  pointer-events: auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(120, 190, 255, 0.42);
  background: rgba(8, 48, 109, 0.72);
  color: rgba(230, 246, 255, 0.96);
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cb-narrative-transfer-close:hover {
  background: rgba(20, 87, 160, 0.86);
}

.cb-narrative-transfer-title-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-bottom: 7px;
  flex-shrink: 0;
}

.cb-narrative-transfer-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin-right: -4px;
  padding-right: 4px;
  outline: none;
}

.cb-narrative-transfer-scroll:focus-visible {
  box-shadow: inset 0 0 0 1px rgba(120, 200, 255, 0.55);
  border-radius: 6px;
}

.cb-narrative-transfer-time-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid rgba(90, 160, 230, 0.35);
  background: rgba(8, 48, 109, 0.5);
  font-size: 11px;
  font-weight: 700;
  color: rgba(180, 220, 255, 0.92);
}

.cb-narrative-transfer-title-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.cb-narrative-transfer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cb-narrative-transfer-list .cb-narrative-transfer-row {
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(8, 48, 109, 0.44);
  border: 1px solid rgba(90, 160, 230, 0.24);
}

.cb-narrative-transfer-route {
  display: flex;
  gap: 6px;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 3px;
  font-size: 12px;
  font-weight: 700;
}

.cb-narrative-transfer-kind {
  color: rgba(255, 213, 74, 0.94);
  font-size: 11px;
}

.cb-narrative-transfer-payload {
  color: rgba(220, 238, 255, 0.84);
  font-size: 12px;
  line-height: 1.45;
}

.cb-narrative-transfer-more {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(190, 220, 245, 0.68);
}

</style>
