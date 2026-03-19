package cloudbox.platform.service;

import cloudbox.platform.entity.ModuleInfo;
import cloudbox.platform.entity.SpatialFacility;
import cloudbox.platform.entity.UnitInfo;
import cloudbox.platform.mapper.SpatialFacilityMapper;
import cloudbox.platform.mapper.ModuleInfoMapper;
import cloudbox.platform.mapper.UnitInfoMapper;
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

    @Autowired
    private UnitInfoMapper unitInfoMapper;

    @Autowired
    private ModuleInfoMapper moduleInfoMapper;

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
        List<UnitInfo> list = unitInfoMapper.selectAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (UnitInfo u : list) {
            Map<String, Object> m = new HashMap<>();
            // 保持原有字段结构：type、title、desc
            m.put("type", u.getCode());
            m.put("title", u.getCode());
            m.put("desc", u.getSummary());
            result.add(m);
        }
        return result;
    }

    public Map<String, Object> getUnitDetail(Map<String, Object> requestBody) {
        String type = requestBody != null ? (String) requestBody.get("type") : null;
        if (type == null || type.isBlank()) {
            type = "星基";
        }

        UnitInfo info = unitInfoMapper.selectByCode(type);

        Map<String, Object> detail = new HashMap<>();
        if (info == null) {
            detail.put("name", type + "元素");
            detail.put("type", type);
            detail.put("elements", List.of());
            detail.put("desc", "单元说明（待配置）");
            detail.put("functions", List.of());
            detail.put("relations", List.of());
            detail.put("role", "—");
            return detail;
        }

        detail.put("name", info.getName());
        detail.put("type", info.getCode());
        detail.put("elements", splitToList(info.getElements()));
        detail.put("desc", info.getDescription());
        detail.put("functions", splitToList(info.getFunctions()));
        detail.put("relations", splitToList(info.getRelations()));
        detail.put("role", info.getRole());
        return detail;
    }

    /**
     * 将以 ";;" 分隔的字符串拆成 List
     */
    private static List<String> splitToList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        String[] parts = value.split(";;");
        List<String> list = new ArrayList<>();
        for (String p : parts) {
            String s = p.trim();
            if (!s.isEmpty()) {
                list.add(s);
            }
        }
        return list;
    }

    public List<Map<String, Object>> getModules() {
        List<Map<String, Object>> list = new ArrayList<>();
        List<ModuleInfo> modules = moduleInfoMapper.selectAll();
        for (ModuleInfo module : modules) {
            Map<String, Object> m = new HashMap<>();
            m.put("title", module.getTitle());
            m.put("content", module.getContent());
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
