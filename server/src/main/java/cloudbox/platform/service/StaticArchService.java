package cloudbox.platform.service;

import cloudbox.platform.entity.SpatialFacility;
import cloudbox.platform.mapper.SpatialFacilityMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 静态架构数据服务（仪表等为内存数据；地面/卫星通过 Mapper 从表 spatial_facility 读取）
 */
@Service
public class StaticArchService {

    @Autowired
    private SpatialFacilityMapper spatialFacilityMapper;

    private static final Map<String, Map<String, String>> STAGE_INSTRUMENT = Map.of(
            "takeoff", Map.of(
                    "alt", "2,000 m", "range", "20 km", "heading", "090 °", "speed", "280 km/h",
                    "temp", "15 ℃", "press", "80000 Pa", "wind", "5 m/s"),
            "climb", Map.of(
                    "alt", "6,000 m", "range", "35 km", "heading", "180 °", "speed", "450 km/h",
                    "temp", "-10 ℃", "press", "45000 Pa", "wind", "8 m/s"),
            "cruise", Map.of(
                    "alt", "10,000 m", "range", "50 km", "heading", "270 °", "speed", "780 km/h",
                    "temp", "-35 ℃", "press", "23000 Pa", "wind", "12 m/s"),
            "approach", Map.of(
                    "alt", "3,000 m", "range", "25 km", "heading", "360 °", "speed", "350 km/h",
                    "temp", "5 ℃", "press", "70000 Pa", "wind", "6 m/s"),
            "landing", Map.of(
                    "alt", "800 m", "range", "15 km", "heading", "090 °", "speed", "250 km/h",
                    "temp", "18 ℃", "press", "92000 Pa", "wind", "4 m/s")
    );

    /**
     * 阶段中文名、目标高度、下一航点/ETA
     */
    private static final Map<String, String[]> STAGE_EXTRA = Map.of(
            "takeoff", new String[]{"起飞", "6,000 m", "WPT-2 / 08:15"},
            "climb", new String[]{"爬升", "10,000 m", "WPT-3 / 08:28"},
            "cruise", new String[]{"巡航", "10,000 m", "WPT-4 / 08:45"},
            "approach", new String[]{"进近", "3,000 m", "WPT-5 / 09:02"},
            "landing", new String[]{"着陆", "0 m", "本场 / 09:15"}
    );

    /**
     * 各阶段飞机位置（经度、纬度），示意京沪航线
     */
    private static final Map<String, double[]> STAGE_POSITION = Map.of(
            "takeoff", new double[]{116.584, 40.080},
            "climb", new double[]{116.90, 39.60},
            "cruise", new double[]{118.20, 35.50},
            "approach", new double[]{121.40, 31.30},
            "landing", new double[]{121.805, 31.144}
    );

    /**
     * 从 "2,000 m" 形式解析出高度数值（米）
     */
    private static int parseAltitudeMeters(String altStr) {
        if (altStr == null) return 0;
        String num = altStr.replaceAll("[^0-9]", "");
        return num.isEmpty() ? 0 : Integer.parseInt(num);
    }

    /**
     * 根据当前高度（米）动态生成层级：地面 / 低空 / 中空 / 高空
     */
    private static String levelFromAltitude(int altMeters) {
        if (altMeters < 100) return "地面";
        if (altMeters < 3000) return "低空";
        if (altMeters < 6000) return "中空";
        return "高空";
    }

    public Map<String, Object> getInstrument(Map<String, Object> requestBody) {
        String stage = (String) requestBody.get("stage");
        if (stage == null) stage = "cruise";
        Map<String, String> base = STAGE_INSTRUMENT.getOrDefault(stage, STAGE_INSTRUMENT.get("cruise"));
        String currentAltStr = base.get("alt");
        int altMeters = parseAltitudeMeters(currentAltStr);
        String[] extra = STAGE_EXTRA.getOrDefault(stage, STAGE_EXTRA.get("cruise"));

        Map<String, Object> result = new HashMap<>(base);
        result.remove("alt");
        result.put("flightNo", "MU0001");
        result.put("currentAlt", currentAltStr);
        result.put("targetAlt", extra[1]);
        result.put("nextWptEta", extra[2]);
        result.put("stageCn", extra[0]);
        result.put("level", levelFromAltitude(altMeters));
        double[] pos = STAGE_POSITION.getOrDefault(stage, STAGE_POSITION.get("cruise"));
        result.put("longitude", pos[0]);
        result.put("latitude", pos[1]);
        return result;
    }

    public List<Map<String, Object>> getUnits() {
        return List.of(
                Map.<String, Object>of("type", "星基", "title", "星基", "desc", "高通量卫星、低轨通信卫星（比例可不一致）"),
                Map.<String, Object>of("type", "机载", "title", "机载", "desc", "黑匣子、通感算一体机载感知预警设备、机组"),
                Map.<String, Object>of("type", "链路", "title", "链路", "desc", "卫星通信链路（星-地/星-机）、5G ATG（机-地）"),
                Map.<String, Object>of("type", "地面", "title", "地面", "desc", "飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行")
        );
    }

    public Map<String, Object> getUnitDetail(Map<String, Object> requestBody) {
        String type = (String) requestBody.get("type");
        if (type == null) type = "星基";
        Map<String, Object> detail = new HashMap<>();
        detail.put("name", type + "元素");
        detail.put("type", type);
        switch (type) {
            case "星基" -> {
                detail.put("elements", List.of("高通量卫星", "低轨通信卫星"));
                detail.put("desc", "星基元素是云匣子体系中的空间基础设施，负责提供通信、导航、遥感等服务。");
                detail.put("functions", List.of("提供卫星通信链路（星-地、星-机）", "传输飞行数据和状态信息", "提供定位和导航服务", "支持应急通信"));
                detail.put("relations", List.of("与链路元素连接：通过卫星通信链路连接", "与机载元素连接：向机载设备传输数据", "与地面元素连接：向地面系统传输信息"));
                detail.put("role", "星基元素是体系的信息传输枢纽，确保空中与地面之间的信息畅通。");
            }
            case "机载" -> {
                detail.put("elements", List.of("黑匣子", "通感算一体机载感知预警设备", "机组"));
                detail.put("desc", "机载元素是安装在飞机上的设备和人员，负责数据采集、感知预警和飞行操作。");
                detail.put("functions", List.of("采集飞行数据和环境信息", "进行实时感知和预警", "执行飞行操作和应急处置", "记录飞行数据（黑匣子）"));
                detail.put("relations", List.of("与链路元素连接：通过通信链路传输数据", "与星基元素连接：接收卫星信号和数据", "与地面元素连接：向地面报告状态和接收指令"));
                detail.put("role", "机载元素是体系的数据源头和操作执行端，是应急处置的第一线。");
            }
            case "链路" -> {
                detail.put("elements", List.of("卫星通信链路（星-地/星-机）", "5G ATG（机-地）"));
                detail.put("desc", "链路元素是连接各个单元的信息传输通道，确保数据和控制指令的及时传递。");
                detail.put("functions", List.of("传输飞行数据和状态信息", "传输控制指令和决策信息", "提供实时通信能力", "支持多路径冗余传输"));
                detail.put("relations", List.of("连接星基与机载：卫星通信链路", "连接机载与地面：5G ATG链路", "连接星基与地面：卫星通信链路"));
                detail.put("role", "链路元素是体系的信息高速公路，确保各单元之间的信息畅通和协同。");
            }
            case "地面" -> {
                detail.put("elements", List.of("飞行场景实时重构系统", "应急专家组系统", "体系应急决策推演系统", "运行控制中心", "应急处置执行"));
                detail.put("desc", "地面元素是体系的地面支撑和决策中心，负责数据处理、决策制定和应急处置执行。");
                detail.put("functions", List.of("实时重构飞行场景", "提供应急专家支持", "进行决策推演和方案制定", "运行控制和协调", "执行应急处置措施"));
                detail.put("relations", List.of("与星基元素连接：接收卫星传输的数据", "与链路元素连接：通过通信链路传输指令", "与机载元素连接：接收机载数据并下达指令"));
                detail.put("role", "地面元素是体系的决策和指挥中心，负责整体协调和应急处置的执行。");
            }
            default -> {
                detail.put("elements", List.of("—"));
                detail.put("desc", "单元说明（示意）");
                detail.put("functions", List.of());
                detail.put("relations", List.of());
                detail.put("role", "—");
            }
        }
        return detail;
    }

    private static final String[] MODULE_OVERVIEWS = {
            "此模块由飞行数据记录仪（FDR）和驾驶舱话音记录仪（CVR）构成。其中，FDR负责记录民用航空器飞行过程中的各类数据，即飞行过程中的各种参数，如飞行的时间、速度、高度、飞机倾斜度、发动机的转速及温度；CVR负责记录舱音数据，即驾驶舱内发生的所有对话数据。黑匣子确保了机上数据安全无损坏，为安全飞行以及维护维修工作提供了依据。该系统与通感算一体机载感知预警系统相关联。",
            "该模块融合了通信与感知功能，借助电磁波探测获取精确的位置和轨迹信息，识别典型突发紧急场景，并发布突发紧急场景下的告警信息。同时，通过算法加持能够过滤噪声，保障数据的准确性与及时性。机载一体化设计充分确保了数据的真实完整和时效性。",
            "该系统主要通过两类媒介，高通量通信卫星系统和5G地空通信，实现飞机数据与地面数据的同步传输。主要链接通感算系统与地面的各个系统。",
            "该系统基于民用航空器飞行数据和舱音数据，分析下传数据的变化趋势。此外，该模块重建的数据将与专家组模块和决策模块共享，实现了高效的数据传输。",
            "该系统着重从专家视角对飞机运行过程中的各项问题进行多方位分析，对来自通感算一体的机载感知预警设备以及地面飞行场景实时重构系统的告警信息进行认定。经专家组讨论，可直接制定应急处置方案，或根据体系应急决策推演系统提供的建议方案确定最优方案。同时，专家的决策也会提供给其他模块，最终通过通信系统反馈给驾驶员。",
            "此系统通过处理前两个系统的信息和建议，依据航空器风险状态，生成多个动态决策方案，在体系运行仿真场景中开展平行推演，模拟处置过程并提供推演结果，辅助地面端专家组制定应急处置方案，并支持将方案分发至机组、航司、空管、机场等应急部门，以便快速处置风险。",
            "该系统根据推演系统的结果反馈，联系各相关组织或部门，即协调机组、航司、空管、机场等应急部门的各个分支，从而实现紧急事态的下达和通知。"
    };

    public List<Map<String, Object>> getModules() {
        String[] titles = {
                "模块一：数据采集系统",
                "模块二：通感算一体机载感知预警系统",
                "模块三：HTS/5G ATG通信系统",
                "模块四：地面飞行场景实时重构系统",
                "模块五：地面运营控制中心应急专家组系统",
                "模块六：体系应急决策推演系统",
                "模块七：应急处置系统"
        };
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> m = new HashMap<>();
            m.put("title", titles[i]);
            m.put("content", MODULE_OVERVIEWS[i]);
            list.add(m);
        }
        return list;
    }

    /**
     * 空间设施数据（地面/卫星合一）：入参 category 为 ground 或 satellite，从 spatial_facility 按大类型查询并按 type 分组返回（不包含地面类型/卫星类型 key）。
     */
    public Map<String, Object> getSpatialData(String category) {
        List<SpatialFacility> list = spatialFacilityMapper.selectByCategory(category);
        Map<String, List<Map<String, Object>>> byType = list.stream()
                .collect(Collectors.groupingBy(SpatialFacility::getType,
                        LinkedHashMap::new,
                        Collectors.mapping(StaticArchService::toItem, Collectors.toList())));
        Map<String, Object> result = new LinkedHashMap<>();
        byType.forEach(result::put);
        return result;
    }

    /**
     * 实体转接口项：id 使用 code（业务 id），与原有接口一致
     */
    private static Map<String, Object> toItem(SpatialFacility e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getCode());
        m.put("longitude", e.getLongitude());
        m.put("latitude", e.getLatitude());
        m.put("name", e.getName());
        m.put("remark", e.getRemark());
        return m;
    }

    /** 链路拓扑：from/to 英文 satellite|aircraft|ground，type 英文 one_to_one|one_to_many|many_to_one|many_to_many */
    public List<Map<String, Object>> getLinkTopology(Map<String, Object> requestBody) {
        String from = requestBody != null && requestBody.get("from") != null ? (String) requestBody.get("from") : "satellite";
        String to = requestBody != null && requestBody.get("to") != null ? (String) requestBody.get("to") : "ground";
        String type = requestBody != null && requestBody.get("type") != null ? (String) requestBody.get("type") : "one_to_many";
        Double aircraftLng = null;
        Double aircraftLat = null;
        if (requestBody != null && requestBody.get("aircraftLongitude") != null) {
            Object v = requestBody.get("aircraftLongitude");
            if (v instanceof Number) aircraftLng = ((Number) v).doubleValue();
        }
        if (requestBody != null && requestBody.get("aircraftLatitude") != null) {
            Object v = requestBody.get("aircraftLatitude");
            if (v instanceof Number) aircraftLat = ((Number) v).doubleValue();
        }

        List<Map<String, Object>> fromNodes = resolveNodes(from, aircraftLng, aircraftLat);
        List<Map<String, Object>> toNodes = resolveNodes(to, aircraftLng, aircraftLat);
        String linkName = linkName(from, to);

        // type: one_to_one, one_to_many, many_to_one, many_to_many
        boolean oneFrom = "one_to_one".equals(type) || "one_to_many".equals(type);
        boolean oneTo = "one_to_one".equals(type) || "many_to_one".equals(type);
        List<Map<String, Object>> fromList = oneFrom && !fromNodes.isEmpty() ? List.of(fromNodes.get(0)) : fromNodes;
        List<Map<String, Object>> toList = oneTo && !toNodes.isEmpty() ? List.of(toNodes.get(0)) : toNodes;

        List<Map<String, Object>> roots = new ArrayList<>();
        for (int i = 0; i < fromList.size(); i++) {
            Map<String, Object> fromNode = new LinkedHashMap<>(fromList.get(i));
            List<Map<String, Object>> linkChildren = new ArrayList<>();
            Map<String, Object> linkNode = new LinkedHashMap<>();
            linkNode.put("id", "link-" + fromNode.get("id") + "-" + i);
            linkNode.put("name", linkName);
            linkNode.put("type", "link");
            linkNode.put("children", toList);
            linkChildren.add(linkNode);
            fromNode.put("children", linkChildren);
            roots.add(fromNode);
        }
        return roots;
    }

    private List<Map<String, Object>> resolveNodes(String role, Double aircraftLng, Double aircraftLat) {
        if ("satellite".equalsIgnoreCase(role)) {
            List<SpatialFacility> list = spatialFacilityMapper.selectByCategory("satellite");
            return list.stream().map(f -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", f.getCode());
                m.put("name", f.getName());
                m.put("type", "satellite");
                m.put("longitude", f.getLongitude());
                m.put("latitude", f.getLatitude());
                m.put("children", Collections.emptyList());
                return m;
            }).collect(Collectors.toList());
        }
        if ("aircraft".equalsIgnoreCase(role)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", "aircraft-1");
            m.put("name", "当前航班");
            m.put("type", "aircraft");
            m.put("longitude", aircraftLng);
            m.put("latitude", aircraftLat);
            m.put("children", Collections.emptyList());
            return List.of(m);
        }
        if ("ground".equalsIgnoreCase(role)) {
            List<SpatialFacility> list = spatialFacilityMapper.selectByCategory("ground");
            return list.stream().map(f -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", f.getCode());
                m.put("name", f.getName());
                m.put("type", "ground");
                m.put("longitude", f.getLongitude());
                m.put("latitude", f.getLatitude());
                m.put("children", Collections.emptyList());
                return m;
            }).collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private static String linkName(String from, String to) {
        boolean hasSat = "satellite".equalsIgnoreCase(from) || "satellite".equalsIgnoreCase(to);
        boolean hasAir = "aircraft".equalsIgnoreCase(from) || "aircraft".equalsIgnoreCase(to);
        if (hasSat && hasAir) return "卫星链路";
        if (hasAir) return "5G ATG链路";
        return "卫星链路";
    }
}
