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

SET FOREIGN_KEY_CHECKS = 1;
