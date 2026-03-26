package cloudbox.platform.service;

import cloudbox.platform.entity.ModuleInfo;
import cloudbox.platform.entity.SpatialFacility;
import cloudbox.platform.entity.SpatialRelation;
import cloudbox.platform.entity.UnitInfo;
import cloudbox.platform.mapper.SpatialFacilityMapper;
import cloudbox.platform.mapper.SpatialRelationMapper;
import cloudbox.platform.mapper.ModuleInfoMapper;
import cloudbox.platform.mapper.UnitInfoMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.InputStream;
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
    private SpatialRelationMapper spatialRelationMapper;

    @Autowired
    private UnitInfoMapper unitInfoMapper;

    @Autowired
    private ModuleInfoMapper moduleInfoMapper;

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String CHINA_POLYLINE_GEOJSON_PATH = "static/china_polyline.geojson";

    private volatile Object chinaPolylineGeoJsonCache;

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
     * 空间设施数据：
     * - category=ground：按 cluster 组装，返回 {clusters:[{clusterId,name,center,units:[]}]}
     * - category=satellite：返回 {star_based:[...]}
     */
    public Map<String, Object> getSpatialData(String category) {
        List<SpatialFacility> list = spatialFacilityMapper.selectByCategory(category);
        if ("ground".equalsIgnoreCase(category)) {
            return buildGroundClusters(list);
        }
        // 默认按卫星节点返回（units.json: space.star_based）
        List<Map<String, Object>> starBased = list.stream()
                .map(StaticArchService::toItem)
                .collect(Collectors.toList());
        return Map.of("star_based", starBased);
    }

    /**
     * 未指定 category 时，返回完整空间数据（结构贴近 units.json）：
     * { space: { star_based: [...] }, ground: { clusters: [...] } }
     */
    public Map<String, Object> getSpatialAll() {
        Map<String, Object> space = getSpatialData("satellite");
        Map<String, Object> ground = getSpatialData("ground");
        return Map.of(
                "space", space,
                "ground", ground
        );
    }

    /**
     * 实体转接口项：id 使用 code（业务 id），与原有接口一致
     */
    private static Map<String, Object> toItem(SpatialFacility e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getCode());
        m.put("type", e.getType());
        m.put("longitude", e.getLongitude());
        m.put("latitude", e.getLatitude());
        m.put("name", e.getName());
        if (e.getAltitudeM() != null) m.put("alt_m", e.getAltitudeM());
        if (e.getImage() != null) m.put("image", e.getImage());
        if (e.getSize() != null) m.put("size", e.getSize());
        if (e.getOffsetX() != null || e.getOffsetY() != null) {
            m.put("offset", List.of(
                    e.getOffsetX() != null ? e.getOffsetX() : 0,
                    e.getOffsetY() != null ? e.getOffsetY() : 0
            ));
        }
        if (e.getInfo() != null) m.put("info", e.getInfo());
        if (e.getInfoSource() != null) m.put("infoSource", e.getInfoSource());
        return m;
    }

    private static Map<String, Object> buildGroundClusters(List<SpatialFacility> list) {
        Map<String, List<SpatialFacility>> byCluster = list.stream()
                .collect(Collectors.groupingBy(
                        f -> f.getClusterId() != null ? f.getClusterId() : "DEFAULT",
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<Map<String, Object>> clusters = new ArrayList<>();
        for (Map.Entry<String, List<SpatialFacility>> entry : byCluster.entrySet()) {
            List<SpatialFacility> units = entry.getValue();
            SpatialFacility first = units.get(0);
            Map<String, Object> cluster = new LinkedHashMap<>();
            cluster.put("clusterId", first.getClusterId());
            cluster.put("name", first.getClusterName());
            if (first.getClusterCenterLongitude() != null && first.getClusterCenterLatitude() != null) {
                cluster.put("center", Map.of(
                        "lon", first.getClusterCenterLongitude(),
                        "lat", first.getClusterCenterLatitude()
                ));
            }
            List<Map<String, Object>> unitItems = units.stream()
                    .map(StaticArchService::toItem)
                    .collect(Collectors.toList());
            cluster.put("units", unitItems);
            clusters.add(cluster);
        }
        return Map.of("clusters", clusters);
    }

    /**
     * 链路拓扑（与 getLinkRelations() 返回结构保持一致）：
     * {relations:[{id,flowLabel,name,edges:[["a","b"], ...]}]}
     *
     * 入参：from（satellite|aircraft|ground）、to（satellite|aircraft|ground）、type（one_to_one|one_to_many|many_to_one|many_to_many）
     * 可选：aircraftLongitude、aircraftLatitude
     */
    public Map<String, Object> getLinkTopology(Map<String, Object> requestBody) {
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

        List<List<String>> edges = new ArrayList<>();
        for (Map<String, Object> f : fromList) {
            Object fromId = f.get("id");
            if (fromId == null) continue;
            for (Map<String, Object> t : toList) {
                Object toId = t.get("id");
                if (toId == null) continue;
                edges.add(List.of(String.valueOf(fromId), String.valueOf(toId)));
            }
        }

        Map<String, Object> relation = new LinkedHashMap<>();
        relation.put("id", "topology-" + from + "-" + to + "-" + type);
        relation.put("flowLabel", "TOPOLOGY");
        relation.put("name", linkName);
        relation.put("edges", edges);
        return Map.of("relations", List.of(relation));
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

    /**
     * links.json 形式的关系配置：{relations:[{id,flowLabel,name,edges:[["a","b"],...]}, ...]}
     */
    public Map<String, Object> getLinkRelations() {
        List<SpatialRelation> list = spatialRelationMapper.selectAll();
        List<Map<String, Object>> relations = new ArrayList<>();
        for (SpatialRelation r : list) {
            List<List<String>> edges = Collections.emptyList();
            if (r.getEdgesJson() != null && !r.getEdgesJson().isBlank()) {
                try {
                    edges = JSON.readValue(r.getEdgesJson(), new TypeReference<>() {});
                } catch (Exception ignored) {
                    edges = Collections.emptyList();
                }
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getCode());
            if (r.getFlowLabel() != null) m.put("flowLabel", r.getFlowLabel());
            m.put("name", r.getName());
            m.put("edges", edges);
            relations.add(m);
        }
        return Map.of("relations", relations);
    }

    /**
     * 返回 static/china_polyline.geojson 的完整解析结果（GeoJSON）。
     */
    public Object getChinaPolylineGeoJson() {
        Object cached = chinaPolylineGeoJsonCache;
        if (cached != null) return cached;
        synchronized (this) {
            if (chinaPolylineGeoJsonCache != null) return chinaPolylineGeoJsonCache;
            chinaPolylineGeoJsonCache = loadGeoJson(CHINA_POLYLINE_GEOJSON_PATH);
            return chinaPolylineGeoJsonCache;
        }
    }

    private Object loadGeoJson(String classpath) {
        try (InputStream in = new ClassPathResource(classpath).getInputStream()) {
            // 用 JsonNode/Map 都可；这里用 readTree 兼容任意 GeoJSON 结构
            return JSON.readTree(in);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
