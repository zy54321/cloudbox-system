/**
 * 双 iframe compare：父 → 子命令协议（子页自持播放，父层不每帧推 pathProgress）。
 */

export const COMPARE_CHANNEL = 'CLOUDBOX_COMPARE';

/** @type {2} */
export const COMPARE_VERSION = 2;

/** 子 → 父 */
export const MSG_READY = 'READY';
export const MSG_MARKER_CLICK = 'MARKER_CLICK';
export const MSG_MARKER_MOVE = 'MARKER_MOVE';
export const MSG_ERROR = 'ERROR';
/** 子页播放/拖动产生的状态回传（非每帧 RAF，用于父层时间轴与面板） */
export const MSG_SIDE_STATE = 'SIDE_STATE';
/** 子 → 父：关键点 narrative 正常结束（父页闭环恢复播放） */
export const MSG_NARRATIVE_DONE = 'NARRATIVE_DONE';

/**
 * 实例隔离：每个 iframe 唯一 frameId（由父层生成并写入子页 URL query；reload 后变更）。
 * READY / SIDE_STATE / MARKER_* 子→父，以及父→子各命令 payload 均携带同一 frameId，与注册侧 contentWindow 成对校验。
 */

/** 父 → 子：命令（替代旧版持续 SYNC_STATE 推 pathProgress） */
export const MSG_LOAD_SCENARIO = 'LOAD_SCENARIO';
export const MSG_PLAY = 'PLAY';
export const MSG_PAUSE = 'PAUSE';
export const MSG_RESET = 'RESET';
export const MSG_SCRUB = 'SCRUB';
export const MSG_SET_ACTIVE_RELATIONS = 'SET_ACTIVE_RELATIONS';

/** @deprecated 仅兼容旧实现，新逻辑勿使用 */
export const MSG_SYNC_STATE = 'SYNC_STATE';
export const MSG_CLEAR_ACTIVE_MARKER = 'CLEAR_ACTIVE_MARKER';
export const MSG_CAMERA_HOME = 'CAMERA_HOME';
/** 父 → 子：父页裁决后触发指定 step 的 narrative */
export const MSG_RUN_NARRATIVE = 'RUN_NARRATIVE';
/** 父 → 子：聚焦指定单元（相机飞行；unitId 为 plane 时回 home） */
export const MSG_FOCUS_UNIT = 'FOCUS_UNIT';
/** 父 → 子：按 relationId 聚焦整条链路（包络边端点节点当前位置） */
export const MSG_FOCUS_RELATION = 'FOCUS_RELATION';

/**
 * @typedef {Object} LoadScenarioPayload
 * @property {'left'|'right'} side
 * @property {string} scenarioKey
 * @property {number} timelineMax
 * @property {Array<{ lon: number, lat: number, alt?: number }>} pathPoints
 * @property {number} cruisePathProgress
 * @property {number} flightAnimMs
 * @property {Array<{ t_yes: number, t_no: number, activeRelations_yes?: string[], activeRelations_no?: string[] }>} steps
 * @property {string} [modelUrl]
 * @property {string} [unitsUrl]
 * @property {string} [staticGroundMergeUrl] 静态架构 units.json，与子页地面标点并集合并
 * @property {string} [linksUrl]
 * @property {string} [depAirportLabel]
 * @property {string} [arrAirportLabel]
 * @property {string} [frameId] 父层注入，与子页 URL 一致
 */

/**
 * @typedef {Object} CompareChildToParentPayload
 * @property {'left'|'right'} side
 * @property {string} frameId
 */

/**
 * @typedef {Object} CompareParentToChildPayload
 * @property {'left'|'right'} side
 * @property {string} frameId
 */
