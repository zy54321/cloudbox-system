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
  `code` varchar(32) NOT NULL,
  `category` varchar(16) NOT NULL,
  `type` varchar(32) NOT NULL,
  `longitude` decimal(10,6) NOT NULL,
  `latitude` decimal(10,6) NOT NULL,
  `name` varchar(128) NOT NULL,
  `remark` varchar(512) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spatial_facility_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Records of spatial_facility
-- ----------------------------
BEGIN;
INSERT INTO `spatial_facility` VALUES (1, 'ct-1', 'ground', '操作塔', 116.584000, 40.080000, '首都机场西塔台', '西区主塔台，负责西跑道起降指挥', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (2, 'ct-2', 'ground', '操作塔', 121.805000, 31.144000, '浦东机场东塔台', '东区塔台，T1/T2 近机位指挥', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (3, 'ct-3', 'ground', '操作塔', 113.309000, 23.392000, '白云机场北塔台', '北跑道塔台', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (4, 'ct-4', 'ground', '操作塔', 103.947000, 30.579000, '双流机场塔台', '双流主塔台', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (5, 'ct-5', 'ground', '操作塔', 113.819000, 22.639000, '宝安机场塔台', '深圳宝安主塔台', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (6, 'ct-6', 'ground', '操作塔', 108.751000, 34.447000, '咸阳机场塔台', '西安咸阳主塔台', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (7, 'ct-7', 'ground', '操作塔', 120.434000, 30.229000, '萧山机场塔台', '杭州萧山主塔台', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (8, 't-1', 'ground', '航站楼', 116.588000, 40.076000, '首都机场 T3', 'T3 航站楼，国际及部分国内', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (9, 't-2', 'ground', '航站楼', 116.578000, 40.082000, '首都机场 T2', 'T2 航站楼，国内航班', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (10, 't-3', 'ground', '航站楼', 121.801000, 31.148000, '浦东 T2', '浦东 T2 航站楼', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (11, 't-4', 'ground', '航站楼', 121.810000, 31.140000, '浦东 T1', '浦东 T1 航站楼', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (12, 't-5', 'ground', '航站楼', 113.305000, 23.388000, '白云 T2', '白云机场 T2', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (13, 't-6', 'ground', '航站楼', 113.313000, 23.396000, '白云 T1', '白云机场 T1', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (14, 't-7', 'ground', '航站楼', 103.943000, 30.575000, '双流 T2', '双流 T2 航站楼', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (15, 't-8', 'ground', '航站楼', 113.815000, 22.635000, '宝安 T3', '深圳宝安 T3', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (16, 't-9', 'ground', '航站楼', 106.638000, 29.716000, '江北 T3A', '重庆江北 T3A', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (17, 'st-1', 'ground', '信号塔', 116.591000, 40.085000, '首都西区 VHF 塔', '西区甚高频通信', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (18, 'st-2', 'ground', '信号塔', 121.798000, 31.150000, '浦东北导航台', '北近台/信标', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (19, 'st-3', 'ground', '信号塔', 113.302000, 23.385000, '白云东信标台', '东侧信标/测距', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (20, 'st-4', 'ground', '信号塔', 103.951000, 30.583000, '双流南 VHF', '南侧甚高频', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (21, 'st-5', 'ground', '信号塔', 108.746000, 34.451000, '咸阳西 NDB', '西侧无方向信标', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (22, 'st-6', 'ground', '信号塔', 120.430000, 30.232000, '萧山东雷达站', '东侧二次雷达', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (23, 'sat-com-1', 'satellite', '通信卫星', 105.200000, 35.800000, '中星6E', 'C 波段通信，覆盖中国及周边', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (24, 'sat-com-2', 'satellite', '通信卫星', 125.000000, 28.500000, '亚太6C', 'Ku 波段，亚太区域', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (25, 'sat-com-3', 'satellite', '通信卫星', 110.300000, 32.100000, '中星11号', 'Ka 高通量，航空机载通信', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (26, 'sat-com-4', 'satellite', '通信卫星', 98.600000, 22.400000, '中星16', 'Ka 宽带，应急与机载', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (27, 'sat-com-5', 'satellite', '通信卫星', 115.700000, 38.200000, '中星19', '高通量，西部及一带一路', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (28, 'sat-com-6', 'satellite', '通信卫星', 87.400000, 30.200000, '天链中继', '数据中继，航天测控', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (29, 'sat-com-7', 'satellite', '通信卫星', 77.100000, 18.500000, '天通一号', 'S 波段移动通信', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (30, 'sat-nav-1', 'satellite', '导航卫星', 140.000000, 55.000000, '北斗 G1', 'GEO，东经 140°', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (31, 'sat-nav-2', 'satellite', '导航卫星', 110.500000, 2.000000, '北斗 G2', 'GEO，东经 110.5°', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (32, 'sat-nav-3', 'satellite', '导航卫星', 84.300000, -2.100000, '北斗 G3', 'GEO，东经 84°', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (33, 'sat-nav-4', 'satellite', '导航卫星', 58.800000, 18.200000, '北斗 M1', 'MEO 轨道', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (34, 'sat-nav-5', 'satellite', '导航卫星', 120.200000, 35.600000, '北斗 M2', 'MEO 轨道', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (35, 'sat-nav-6', 'satellite', '导航卫星', 95.400000, -12.300000, '北斗 M3', 'MEO 轨道', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (36, 'sat-nav-7', 'satellite', '导航卫星', 45.100000, 28.700000, '北斗 M4', 'MEO 轨道', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (37, 'sat-nav-8', 'satellite', '导航卫星', 168.200000, 40.100000, '北斗 IGSO-1', '倾斜地球同步', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (38, 'sat-rs-1', 'satellite', '遥感卫星', 116.400000, 39.900000, '高分一号', '2m 全色/8m 多光谱', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (39, 'sat-rs-2', 'satellite', '遥感卫星', 103.600000, 30.500000, '高分二号', '亚米级光学', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (40, 'sat-rs-3', 'satellite', '遥感卫星', 121.500000, 31.200000, '高分三号', 'C 波段 SAR', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (41, 'sat-rs-4', 'satellite', '遥感卫星', 113.200000, 23.100000, '高分四号', 'GEO 凝视，50m', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (42, 'sat-rs-5', 'satellite', '遥感卫星', 108.900000, 34.200000, '高分五号', '高光谱', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (43, 'sat-rs-6', 'satellite', '遥感卫星', 99.100000, 25.000000, '高分六号', '宽幅光学', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (44, 'sat-rs-7', 'satellite', '遥感卫星', 87.200000, 43.800000, '高分七号', '立体测绘', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (45, 'sat-rs-8', 'satellite', '遥感卫星', 118.600000, 32.000000, '环境二号 A', '环境减灾光学', NULL, NULL);
INSERT INTO `spatial_facility` VALUES (46, 'sat-rs-9', 'satellite', '遥感卫星', 106.300000, 29.500000, '资源三号', '立体测绘', NULL, NULL);
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
