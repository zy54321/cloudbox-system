/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 50731
 Source Host           : localhost:3306
 Source Schema         : cloudbox

 Target Server Type    : MySQL
 Target Server Version : 50731
 File Encoding         : 65001

 Date: 25/02/2026 21:12:13
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for spatial_facility
-- ----------------------------
DROP TABLE IF EXISTS `spatial_facility`;
CREATE TABLE `spatial_facility` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL COMMENT '节点ID（units.json 的 id）',
  `category` varchar(16) NOT NULL COMMENT '大类：ground / satellite',
  `type` varchar(32) NOT NULL COMMENT '节点类型（units.json 的 type，如 satellite/ground_unit）',
  `longitude` decimal(10,6) NOT NULL,
  `latitude` decimal(10,6) NOT NULL,
  `name` varchar(128) NOT NULL,
  `altitude_m` int(11) DEFAULT NULL COMMENT '高度（米），units.json: alt_m/alt',
  `image` varchar(256) DEFAULT NULL COMMENT '图标路径（相对 static）',
  `size` decimal(8,3) DEFAULT NULL COMMENT '图标缩放比例',
  `offset_x` int(11) DEFAULT NULL COMMENT '标注 X 偏移',
  `offset_y` int(11) DEFAULT NULL COMMENT '标注 Y 偏移',
  `info` text COMMENT '详情说明（长文本）',
  `info_source` varchar(128) DEFAULT NULL COMMENT '说明来源（如 文档摘要）',
  `cluster_id` varchar(64) DEFAULT NULL COMMENT '地面集群ID（units.json ground.clusters[].clusterId）',
  `cluster_name` varchar(128) DEFAULT NULL COMMENT '地面集群名称',
  `cluster_center_longitude` decimal(10,6) DEFAULT NULL COMMENT '集群中心点经度',
  `cluster_center_latitude` decimal(10,6) DEFAULT NULL COMMENT '集群中心点纬度',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spatial_facility_code` (`code`),
  KEY `idx_spatial_facility_category` (`category`),
  KEY `idx_spatial_facility_cluster` (`cluster_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of spatial_facility
-- ----------------------------
BEGIN;
INSERT INTO `spatial_facility`
(`code`, `category`, `type`, `longitude`, `latitude`, `name`, `altitude_m`, `image`, `size`, `offset_x`, `offset_y`, `info`, `info_source`, `cluster_id`, `cluster_name`, `cluster_center_longitude`, `cluster_center_latitude`)
VALUES
('sat-hts-01', 'satellite', 'satellite', 112.000000, 36.000000, 'HTS卫星', 1600000, 'img/satelliteIcon.png', 0.300, 0, 32,
 '高通量卫星通信节点，承担飞机与地面之间的大容量高速数据传输，是\"云匣子\"空天链路的重要组成部分。', '文档摘要', NULL, NULL, NULL, NULL),
('sat-leo-01', 'satellite', 'satellite', 114.000000, 38.000000, 'LEO卫星', 800000, 'img/satelliteIcon.png', 0.300, 0, 32,
 '低轨通信卫星节点，作为空天网络的一部分补充广域覆盖与链路连续性，为实时数据传输提供支撑。', '补充说明', NULL, NULL, NULL, NULL),

('dep-reconstruction', 'ground', 'ground_unit', 108.770117, 34.453236, '地面飞行场景实时重构系统', 0, 'img/planeBillBoardImg.png', 0.500, 0, -28,
 '该系统基于民用航空器飞行数据和舱音数据，分析下传数据的变化趋势，并将重建结果共享给专家组与决策模块，实现高效的数据传输与态势支撑。', '文档摘要',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('dep-expert-group', 'ground', 'ground_unit', 108.771811, 34.445005, '地面运营控制中心专家组', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '该系统从专家视角对飞机运行中的问题进行多方位分析，对机载预警设备和地面场景重构系统输出的告警进行认定，并制定或优化应急处置方案。', '文档摘要',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('dep-atc', 'ground', 'ground_unit', 108.766361, 34.446522, '空管系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '空管系统负责空域调度、飞行引导与险情协同，接收处置方案后联动机场与机组执行应急流程。', '补充说明',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('dep-airline', 'ground', 'ground_unit', 108.744077, 34.432633, '航司系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '航司系统负责从运行与技术支持视角参与应急处置，协调签派、技术和保障资源，支撑方案落地。', '补充说明',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('dep-airport', 'ground', 'ground_unit', 108.758305, 34.439267, '机场系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '机场系统承担跑道、地面保障与现场应急资源协同，是处置方案落地执行的重要节点。', '补充说明',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('route-atg-01', 'ground', 'ground_unit', 111.200000, 36.000000, '5G基站', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '5G ATG 地空通信节点，利用 5G 网络技术为飞行器提供低延迟、高带宽的数据传输能力，与卫星链路共同保障实时同步传输。', '文档摘要',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),
('route-atg-02', 'ground', 'ground_unit', 113.800000, 37.500000, '5G基站', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '5G ATG 地空通信节点，利用 5G 网络技术为飞行器提供低延迟、高带宽的数据传输能力，与卫星链路共同保障实时同步传输。', '文档摘要',
 'DEP_AIRPORT', '起点机场地面单位集群', 108.751900, 34.446756),

('arr-sim-system', 'ground', 'ground_unit', 116.404059, 39.470762, '体系应急决策推演系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '该系统依据航空器风险状态生成多个动态决策方案，在仿真场景中开展平行推演，评估处置路径优劣并辅助专家组形成最优方案。', '文档摘要',
 'ARR_AIRPORT', '终点机场地面单位集群', 116.429060, 39.485763),
('arr-rescue', 'ground', 'ground_unit', 116.429059, 39.515763, '救援系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '救援系统负责承接机场侧下发的应急任务，参与人员疏散、伤员救治和现场处置等执行环节。', '补充说明',
 'ARR_AIRPORT', '终点机场地面单位集群', 116.429060, 39.485763),
('arr-airport', 'ground', 'ground_unit', 116.459059, 39.505763, '机场系统', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '机场系统承担跑道、地面保障与现场应急资源协同，是处置方案落地执行的重要节点。', '补充说明',
 'ARR_AIRPORT', '终点机场地面单位集群', 116.429060, 39.485763),
('arr-atg-station', 'ground', 'ground_unit', 116.449059, 39.525762, '5G基站', 0, 'img/planeBillBoardImg.png', NULL, NULL, NULL,
 '5G ATG 地空通信节点，利用 5G 网络技术为飞行器提供低延迟、高带宽的数据传输能力，与卫星链路共同保障实时同步传输。', '文档摘要',
 'ARR_AIRPORT', '终点机场地面单位集群', 116.429060, 39.485763);
COMMIT;

-- ----------------------------
-- Table structure for spatial_relation
-- 用于存储 links.json 的 relations
-- ----------------------------
DROP TABLE IF EXISTS `spatial_relation`;
CREATE TABLE `spatial_relation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` varchar(64) NOT NULL COMMENT '关系编码（links.json relations[].id）',
  `name` varchar(256) NOT NULL COMMENT '关系名称（links.json relations[].name）',
  `flow_label` varchar(32) DEFAULT NULL COMMENT '流向标签（links.json relations[].flowLabel）',
  `edges_json` text NOT NULL COMMENT '边集合JSON，格式如 [["a","b"],["c","d"]]',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spatial_relation_code` (`code`),
  KEY `idx_spatial_relation_flow` (`flow_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='节点关系/连线配置（来源 links.json）';

-- ----------------------------
-- Records of spatial_relation
-- ----------------------------
BEGIN;
INSERT INTO `spatial_relation` (`code`, `flow_label`, `name`, `edges_json`) VALUES
('link-sat-ground', '信息流', '卫星链路与地面控制中心', '[[\"dep-airport-ops\",\"sat-hts-01\"],[\"dep-airport-ops\",\"sat-leo-01\"]]'),
('link-flight-emergency', '控制流', '飞行控制与应急处置执行', '[[\"plane\",\"dep-emergency-exec\"]]'),
('link-info-1', '信息流', '黑匣子→通感算一体机载感知预警设备→HTS/5G ATG', '[[\"plane\",\"sat-hts-01\"]]'),
('link-info-2', '信息流', 'HTS/5G ATG→地面飞行场景实时重构系统', '[[\"sat-hts-01\",\"dep-reconstruction\"]]'),
('link-info-3', '信息流', 'HTS/5G ATG→地面运营专家组系统', '[[\"sat-hts-01\",\"dep-expert-group\"]]'),
('link-info-4', '信息流', '地面运营专家组系统→体系应急决策推演系统', '[[\"dep-expert-group\",\"arr-sim-system\"]]'),
('link-info-5', '信息流', '地面飞行场景实时重构系统→体系应急决策推演系统', '[[\"dep-reconstruction\",\"arr-sim-system\"]]'),
('link-info-6', '信息流', '体系应急决策推演系统→应急处置系统（空管系统等）', '[[\"arr-sim-system\",\"dep-atc\"]]'),
('link-ctrl-1', '控制流', '通感算一体机载感知预警设备→机组系统', '[[\"plane\",\"plane\"]]'),
('link-ctrl-2', '控制流', '体系应急决策推演系统→HTS/5G ATG→机组系统', '[[\"arr-sim-system\",\"sat-hts-01\"],[\"sat-hts-01\",\"plane\"]]'),
('link-ctrl-3', '控制流', '应急处置系统→HTS/5G ATG→机组系统', '[[\"dep-atc\",\"sat-hts-01\"],[\"sat-hts-01\",\"plane\"]]'),
('link-ctrl-4', '控制流', '通感算一体机载感知预警设备→HTS/5G ATG→地面飞行场景实时重构系统', '[[\"plane\",\"sat-hts-01\"],[\"sat-hts-01\",\"dep-reconstruction\"]]'),
('no-crew-to-atc', 'INFO', '无云匣子：机组→空管', '[[\"no-crew\",\"dep-atc\"]]'),
('no-atc-to-emergency', 'INFO', '无云匣子：空管→应急处理系统', '[[\"no-atc\",\"no-emergency-sys\"]]'),
('no-airport-ops-to-tower', 'INFO', '无云匣子：机场运行→塔台', '[[\"no-airport-ops\",\"no-tower\"]]'),
('no-dispatch-to-satgw', 'INFO', '无云匣子：签派→卫星地面站', '[[\"no-dispatch\",\"no-sat-gw\"]]'),
('no-satgw-to-crew', 'INFO', '无云匣子：卫星地面站→机组', '[[\"no-sat-gw\",\"no-crew\"]]'),
('no-maint-to-tech', 'CTRL', '无云匣子：机务→航司技术支援', '[[\"no-maint\",\"no-airline-tech\"]]'),
('no-tech-to-safety', 'CTRL', '无云匣子：航司技术支援→航安部门', '[[\"no-airline-tech\",\"no-safety\"]]'),
('yes-engine-to-warn', 'INFO', '有云匣子：发动机→机载预警', '[[\"yes-engine\",\"yes-onboard-warn\"]]'),
('yes-warn-to-expert', 'INFO', '有云匣子：预警→专家组', '[[\"yes-onboard-warn\",\"yes-expert-group\"]]'),
('yes-expert-to-sim', 'INFO', '有云匣子：专家组→体系推演', '[[\"yes-expert-group\",\"yes-sim-system\"]]'),
('yes-sim-to-expert', 'CTRL', '有云匣子：体系推演→专家组', '[[\"yes-sim-system\",\"yes-expert-group\"]]'),
('yes-expert-to-atc', 'CTRL', '有云匣子：专家组→空管', '[[\"yes-expert-group\",\"yes-atc\"]]'),
('yes-atc-to-airport', 'CTRL', '有云匣子：空管→机场', '[[\"yes-atc\",\"yes-airport\"]]'),
('no-crew-to-tower', 'INFO', '无云匣子：机组→塔台/进近', '[[\"no-crew\",\"no-tower\"]]'),
('no-tower-to-atc', 'INFO', '无云匣子：塔台/进近→空管', '[[\"no-tower\",\"no-atc\"]]');
COMMIT;

-- ----------------------------
-- Table structure for unit_info
-- ----------------------------
DROP TABLE IF EXISTS `unit_info`;
CREATE TABLE `unit_info` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` varchar(50) NOT NULL COMMENT '单元编码：星基 / 地面 / 机载',
  `name` varchar(100) NOT NULL COMMENT '单元名称：星基元素 / 地面元素 / 机载元素',
  `summary` varchar(255) NOT NULL COMMENT '简要说明，用于 /static/units 列表 desc',
  `elements` text COMMENT '包含元素，使用 ;; 分隔',
  `description` text COMMENT '功能说明（长文本）',
  `functions` text COMMENT '主要功能列表，使用 ;; 分隔',
  `relations` text COMMENT '关联关系列表，使用 ;; 分隔',
  `role` text COMMENT '在体系中的作用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unit_info_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='云匣子体系单元信息（星基 / 地面 / 机载）';

-- ----------------------------
-- Records of unit_info
-- ----------------------------
BEGIN;
INSERT INTO `unit_info` (`code`, `name`, `summary`, `elements`, `description`, `functions`, `relations`, `role`) VALUES
('星基', '星基元素',
 '高通量通信卫星、低轨通信卫星',
 '高通量卫星（HTS）;;低轨通信卫星（LEO）（属于HTS/5G ATG通信系统）',
 '星基元素是“云匣子”体系通信网络的天基层组成部分，面向民航飞行全程提供广域覆盖的数据中继能力，与 5G ATG 宽带链路共同构成空地数据同步传输的关键通道，用于支撑飞行数据下传、态势共享与应急协同处置。',
 '提供广域覆盖的卫星通信链路：通过"星-机"链路接入飞机，经"星-地"链路连接地面，实现"机-星-地"双向数据传输与转发（地图缩小时以连线+标注示意）',
 '与链路元素连接：通过卫星通信链路形成“卫星-飞机”“卫星-地面”连接关系;;与机载元素连接：承载通感算机载感知预警系统与机载数据采集系统的关键数据上报与告警信息传输;;与地面元素连接：向地面飞行场景实时重构系统、专家组、仿真推演与运行控制中心等模块下传数据并支持共享',
 '星基元素作为空-天-地三层网络中的天基支撑层，为云匣子体系提供跨区域、广覆盖的数据中继与链路保障能力，确保机载感知与地面重构、专家研判、决策推演之间的数据流转连续可靠，是实现“数据采集—感知识别—处置协同”链路闭环的重要基础。'
),
('地面', '地面元素',
 '飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行',
 '地面飞行场景实时重构系统;;地面运营控制中心应急专家组系统;;体系应急决策推演系统;;地面运行控制中心;;应急处置执行 / 应急处置系统',
 '地面运行控制中心属于地面运营控制中心应急专家组系统、地面飞行场景实时重构系统、体系应急决策推演系统和应急处置系统这四个地面系统在物理或逻辑上的部署场所的总称。由四大核心系统构成的地面元素是云匣子体系的“态势获取—专家研判—推演决策—协同指挥—处置执行”闭环核心，负责接收机载数据与告警，完成飞行场景重构与风险识别，组织专家组研讨并借助推演系统生成处置方案，最终协调各相关部门执行落地。四大系统均部署于地面运行控制中心，实现信息互通与协同工作。',
 '飞行场景实时重构（归属地面飞行场景实时重构系统）：地面侧快速完成飞行态势数字化重构，为突发紧急场景下获取航空器安全态势提供分析手段与风险识别能力。;;
应急专家组研判（归属地面运营控制中心应急专家组系统）：基于告警与态势信息组织讨论，直接制定应急处置方案并提出处置意见。;;
应急决策推演（归属体系应急决策推演系统）：依据航空器风险状态生成多个动态决策方案，在仿真场景中开展平行推演，模拟处置过程并输出推演结果，辅助专家组制定最终方案，并支持方案分发至机组、航司、空管、机场等部门。;;
运行控制与协同调度（归属应急处置系统）：作为地面侧运行与指挥中枢，承接方案落地过程中的组织协调与资源调度。;;
应急处置执行（归属应急处置系统）：根据推演结果与专家组方案，协调机组、航司、空管、机场等应急部门各分支，完成紧急事态的下达、通知与执行。',
 '与链路元素连接：通过 5G ATG / HTS 卫星链路接入空地数据通道，接收告警与飞行态势数据;;与机载元素连接：接收机载感知预警系统/机载通感算一体设备上报的状态信息与告警数据，并向机组下发处置方案与指令;;地面内部关联：信息流可从机载感知预警系统进入地面专家组、推演系统；控制流由推演系统回到专家组，再分发至空管、机场、航司等部门执行。',
 '地面元素是云匣子体系的决策与处置中枢，通过“实时重构 + 专家研判 + 推演决策 + 协同执行”形成可追踪、可闭环的应急处置链条，把机载侧的主动感知预警转化为地面侧可落地的组织调度与处置行动。'
),
('机载', '机载元素',
 '机载监测与云匣子协同终端',
 '数据采集系统：黑匣子（FDR/CVR）;;通感算一体机载感知预警系统：机载监测与云匣子协同终端、通感算一体机载感知预警系统;;机组系统（民航体系单元）',
 '机载监测与云匣子协同终端是云匣子体系的空中侧“数据采集—态势感知—告警上报—指令协同”的入口单元：一方面采集并记录飞行数据与舱音数据，另一方面通过通感算一体机载感知预警能力融合通信与感知获取航空器位置与轨迹信息，并在异常发生时将告警包经空地链路快速传递至地面系统，支撑后续研判与处置。',
 '机载数据采集与留存：由 FDR/CVR 记录飞行过程中的关键参数（时间、速度、高度、飞机倾斜度、发动机参数等）与驾驶舱话音数据，确保机上数据安全留存。;;
机载主动感知预警：通感算一体机载感知预警系统融合通信与感知能力，获取航空器位置与轨迹信息，并在异常场景触发预警。;;
信息同步：将机载侧警告、位置与状态等信息通过 5G ATG / HTS 卫星链路快速同步到地面专家组和推演系统，支撑地面实时重构与决策推演启动。;;
协同处置承接：接收地面专家组/推演系统形成的处置方案与指令，在机组侧执行/确认并反馈，形成处置闭环。',
 '与链路元素连接：通过 5G ATG 链路与 HTS 卫星链路实现空地双向同步传输;;与地面元素连接：上行数据流进入地面专家组与体系推演系统；下行控制流由地面系统分发到相关部门并回到机组侧执行;;与星基元素连接：在卫星链路场景下，通过星—机通信完成数据中继与广覆盖支撑。',
 '机载监测与云匣子协同终端是云匣子体系“主动预警”的起点：把机载侧的实时监测、感知与告警转化为可传输的数据包，并通过空地链路驱动地面侧的场景重构、专家研判与推演决策，从而实现“感知—识别—处置”的全链条闭环。'
);
COMMIT;

-- ----------------------------
-- Table structure for module_info
-- ----------------------------
DROP TABLE IF EXISTS `module_info`;
CREATE TABLE `module_info` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` varchar(50) NOT NULL COMMENT '模块编码，例如 M1 ~ M7',
  `title` varchar(200) NOT NULL COMMENT '模块标题，例如：模块一：数据采集系统',
  `content` text NOT NULL COMMENT '模块描述内容',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序号，/static/modules 按此升序返回',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_info_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='云匣子静态架构模块信息（模块一~模块七）';

-- ----------------------------
-- Records of module_info
-- ----------------------------
BEGIN;
INSERT INTO `module_info` (`code`, `title`, `content`, `sort_order`) VALUES
('M1', '模块一：数据采集系统', '此模块由飞行数据记录仪（FDR）和驾驶舱话音记录仪（CVR）构成。其中，FDR负责记录民用航空器飞行过程中的各类数据，即飞行过程中的各种参数，如飞行的时间、速度、高度、飞机倾斜度、发动机的转速及温度；CVR负责记录舱音数据，即驾驶舱内发生的所有对话数据。黑匣子确保了机上数据安全无损坏，为安全飞行以及维护维修工作提供了依据。该系统与通感算一体机载感知预警系统相关联。', 1),
('M2', '模块二：通感算一体机载感知预警系统', '该模块融合了通信与感知功能，借助电磁波探测获取精确的位置和轨迹信息，识别典型突发紧急场景，并发布突发紧急场景下的告警信息。同时，通过算法加持能够过滤噪声，保障数据的准确性与及时性。机载一体化设计充分确保了数据的真实完整和时效性。', 2),
('M3', '模块三：HTS/5G ATG通信系统', '该系统主要通过两类媒介，高通量通信卫星系统和5G地空通信，实现飞机数据与地面数据的同步传输。主要链接通感算系统与地面的各个系统。', 3),
('M4', '模块四：地面飞行场景实时重构系统', '该系统基于民用航空器飞行数据和舱音数据，分析下传数据的变化趋势。此外，该模块重建的数据将与专家组模块和决策模块共享，实现了高效的数据传输。', 4),
('M5', '模块五：地面运营控制中心应急专家组系统', '该系统着重从专家视角对飞机运行过程中的各项问题进行多方位分析，对来自通感算一体的机载感知预警设备以及地面飞行场景实时重构系统的告警信息进行认定。经专家组讨论，可直接制定应急处置方案，或根据体系应急决策推演系统提供的建议方案确定最优方案。同时，专家的决策也会提供给其他模块，最终通过通信系统反馈给驾驶员。', 5),
('M6', '模块六：体系应急决策推演系统', '此系统通过处理前两个系统的信息和建议，依据航空器风险状态，生成多个动态决策方案，在体系运行仿真场景中开展平行推演，模拟处置过程并提供推演结果，辅助地面端专家组制定应急处置方案，并支持将方案分发至机组、航司、空管、机场等应急部门，以便快速处置风险。', 6),
('M7', '模块七：应急处置系统', '该系统根据推演系统的结果反馈，联系各相关组织或部门，即协调机组、航司、空管、机场等应急部门的各个分支，从而实现紧急事态的下达和通知。', 7);
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
