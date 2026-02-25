package cloudbox.platform.service;

import cloudbox.platform.dto.staticarch.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 静态架构数据服务（教学演示用，内存数据）
 */
@Service
public class StaticArchService {

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

    public Map<String, String> getInstrument(InstrumentRequest req) {
        String stage = req.getStage() != null ? req.getStage() : "cruise";
        return new HashMap<>(STAGE_INSTRUMENT.getOrDefault(stage, STAGE_INSTRUMENT.get("cruise")));
    }

    public List<Map<String, Object>> getUnits() {
        return List.of(
                Map.<String, Object>of("type", "星基", "title", "星基", "desc", "高通量卫星、低轨通信卫星（比例可不一致）"),
                Map.<String, Object>of("type", "机载", "title", "机载", "desc", "黑匣子、通感算一体机载感知预警设备、机组"),
                Map.<String, Object>of("type", "链路", "title", "链路", "desc", "卫星通信链路（星-地/星-机）、5G ATG（机-地）"),
                Map.<String, Object>of("type", "地面", "title", "地面", "desc", "飞行场景实时重构、应急专家组、决策推演、运行控制中心、应急处置执行")
        );
    }

    public Map<String, Object> getUnitDetail(UnitDetailRequest req) {
        String type = req.getType() != null ? req.getType() : "星基";
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

    public List<Map<String, Object>> getRelations() {
        return List.of(
                Map.<String, Object>of("type", "信息流", "from", "星基", "to", "链路", "desc", "卫星通过通信链路传输数据"),
                Map.<String, Object>of("type", "信息流", "from", "机载", "to", "链路", "desc", "机载设备通过链路传输数据"),
                Map.<String, Object>of("type", "信息流", "from", "链路", "to", "地面", "desc", "链路将数据传送到地面系统"),
                Map.<String, Object>of("type", "控制流", "from", "地面", "to", "链路", "desc", "地面系统通过链路发送控制指令"),
                Map.<String, Object>of("type", "控制流", "from", "链路", "to", "机载", "desc", "链路将控制指令传送到机载设备"),
                Map.<String, Object>of("type", "信息流", "from", "星基", "to", "机载", "desc", "卫星直接向机载设备传输信息"),
                Map.<String, Object>of("type", "控制流", "from", "地面", "to", "星基", "desc", "地面系统控制卫星资源")
        );
    }

    public Map<String, Object> getRelationDetail(RelationDetailRequest req) {
        List<Map<String, Object>> list = getRelations();
        int idx = 0;
        if (req.getRelationId() != null) {
            try {
                idx = Math.min(Integer.parseInt(req.getRelationId()), list.size() - 1);
            } catch (NumberFormatException ignored) {}
        }
        Map<String, Object> rel = new HashMap<>(list.get(Math.max(0, idx)));
        String[] details = {
                "高通量卫星和低轨通信卫星通过卫星通信链路（星-地/星-机）传输飞行数据、状态信息等。",
                "黑匣子、通感算一体机载感知预警设备通过卫星通信链路或5G ATG链路向地面传输飞行数据和预警信息。",
                "卫星通信链路和5G ATG链路将机载和星基的数据传送到地面飞行场景实时重构系统、应急专家组系统等。",
                "运行控制中心、应急决策推演系统通过通信链路向机载设备发送控制指令和决策信息。",
                "通信链路将地面系统的控制指令、应急处置方案等传送到机载设备，指导机组执行。",
                "卫星直接向机载设备提供定位、导航、通信等服务，支持飞行操作和应急处置。",
                "地面系统可以调度和控制卫星资源，优化通信链路和传输路径。"
        };
        rel.put("detail", details[Math.min(idx, details.length - 1)]);
        return rel;
    }

    public List<Map<String, String>> getModules() {
        return List.of(
                Map.of("key", "m1", "title", "模块一：数据采集系统"),
                Map.of("key", "m2", "title", "模块二：通感算一体机载感知预警系统"),
                Map.of("key", "m3", "title", "模块三：HTS/5G ATG通信系统"),
                Map.of("key", "m4", "title", "模块四：地面飞行场景实时重构系统"),
                Map.of("key", "m5", "title", "模块五：地面运营控制中心应急专家组系统"),
                Map.of("key", "m6", "title", "模块六：体系应急决策推演系统"),
                Map.of("key", "m7", "title", "模块七：应急处置系统")
        );
    }

    public Map<String, Object> getModuleDetail(ModuleDetailRequest req) {
        String key = req.getModuleKey() != null ? req.getModuleKey() : "m1";
        Map<String, Object> detail = new HashMap<>();
        String[] names = {
                "模块一：数据采集系统", "模块二：通感算一体机载感知预警系统", "模块三：HTS/5G ATG通信系统",
                "模块四：地面飞行场景实时重构系统", "模块五：地面运营控制中心应急专家组系统",
                "模块六：体系应急决策推演系统", "模块七：应急处置系统"
        };
        String[] overviews = {
                "数据采集系统是云匣子体系的基础模块，负责从多个数据源采集飞行相关的各类数据。",
                "通感算一体机载感知预警系统集成了通信、感知、计算功能，实现机载端的智能感知和预警。",
                "HTS/5G ATG通信系统提供高速、可靠的通信链路，确保空中与地面之间的信息畅通。",
                "地面飞行场景实时重构系统基于多源数据，实时重构和展示飞行场景，为决策提供可视化支持。",
                "地面运营控制中心应急专家组系统整合应急专家资源，提供专业的应急决策支持。",
                "体系应急决策推演系统基于场景数据和专家知识，进行应急决策的推演和优化。",
                "应急处置系统是体系的执行端，负责将决策方案转化为具体的处置指令并监督执行。"
        };
        int i = key.startsWith("m") && key.length() >= 2
                ? Math.min(Character.digit(key.charAt(1), 10) - 1, 6)
                : 0;
        if (i < 0) i = 0;
        detail.put("name", names[i]);
        detail.put("overview", overviews[i]);
        detail.put("functions", List.of("功能项1（示意）", "功能项2（示意）"));
        detail.put("features", List.of("技术特点1（示意）", "技术特点2（示意）"));
        detail.put("role", "在体系中的作用（示意）");
        detail.put("relations", "与其他模块的关系（示意）");
        return detail;
    }
}
