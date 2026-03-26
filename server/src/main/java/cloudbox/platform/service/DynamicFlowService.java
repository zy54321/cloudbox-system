package cloudbox.platform.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;

/**
 * 动态交互数据服务（教学演示用，脚本数据）
 */
@Service
public class DynamicFlowService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String DYNAMIC_SCENARIOS_PATH = "static/dynamic_scenarios.json";
    private static final String EVENT_UNITS_SUFFIX = "_units.json";

    private static final List<Map<String, Object>> SCENARIOS = List.of(
            Map.<String, Object>of("key", "engine", "name", "单发失效"),
            Map.<String, Object>of("key", "smoke", "name", "烟雾异味"),
            Map.<String, Object>of("key", "nav", "name", "导航失效"),
            Map.<String, Object>of("key", "hijack", "name", "劫机"),
            Map.<String, Object>of("key", "misop", "name", "人为误操作"),
            Map.<String, Object>of("key", "generic", "name", "通用时序演示")
    );

    private volatile Map<String, Object> dynamicScenariosConfigCache;
    private final Map<String, JsonNode> eventUnitsCache = new HashMap<>();

    public List<Map<String, Object>> getScenarios() {
        // 优先从 static/dynamic_scenarios.json 读取场景列表；读取失败则回退到内置示例数据
        try {
            Map<String, Object> cfg = getDynamicScenariosConfig();
            Object scenariosObj = cfg.get("scenarios");
            if (scenariosObj instanceof Map<?, ?> scenariosMap) {
                List<Map<String, Object>> list = new ArrayList<>();
                for (Map.Entry<?, ?> e : scenariosMap.entrySet()) {
                    String key = String.valueOf(e.getKey());
                    Object v = e.getValue();
                    String name = key;
                    if (v instanceof Map<?, ?> vm) {
                        Object n = vm.get("name");
                        if (n != null) name = String.valueOf(n);
                    }
                    list.add(Map.of("key", key, "name", name));
                }
                return list;
            }
        } catch (Exception ignored) {
            // 回退逻辑见下方
        }
        return new ArrayList<>(SCENARIOS);
    }

    /**
     * 读取并解析 resources/static/dynamic_scenarios.json，返回 Map 结构（可直接作为 JSON 响应给前端）。
     */
    public Map<String, Object> getDynamicScenariosConfig() {
        Map<String, Object> cached = dynamicScenariosConfigCache;
        if (cached != null) return cached;
        synchronized (this) {
            if (dynamicScenariosConfigCache != null) return dynamicScenariosConfigCache;
            Map<String, Object> loaded = loadDynamicScenariosConfig();
            dynamicScenariosConfigCache = loaded;
            return loaded;
        }
    }

    private Map<String, Object> loadDynamicScenariosConfig() {
        try (InputStream in = new ClassPathResource(DYNAMIC_SCENARIOS_PATH).getInputStream()) {
            Map<String, Object> map = MAPPER.readValue(in, new TypeReference<>() {});
            return map != null ? map : Map.of();
        } catch (Exception e) {
            return Map.of();
        }
    }

    /**
     * 返回某个事件的 units 配置（来源 resources/static/<eventKey>_units.json）。
     * 例如：eventKey=engine_failure -> static/engine_failure_units.json
     */
    public JsonNode getEventUnits(String eventKey) {
        String key = normalizeEventKey(eventKey);
        synchronized (eventUnitsCache) {
            JsonNode cached = eventUnitsCache.get(key);
            if (cached != null) return cached;
            JsonNode loaded = loadEventUnitsFromStatic(key);
            eventUnitsCache.put(key, loaded);
            return loaded;
        }
    }

    private static String normalizeEventKey(String eventKey) {
        String key = eventKey != null ? eventKey.trim().toLowerCase(Locale.ROOT) : "";
        // 只允许 a-z 0-9 下划线，避免路径穿越
        if (!key.matches("^[a-z0-9_]+$")) {
            throw new IllegalArgumentException("非法事件类型");
        }
        return key;
    }

    private JsonNode loadEventUnitsFromStatic(String eventKey) {
        String path = "static/" + eventKey + EVENT_UNITS_SUFFIX;
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return MAPPER.readTree(in);
        } catch (Exception e) {
            // 不存在/解析失败时返回空对象，避免接口直接 500
            return MAPPER.createObjectNode();
        }
    }

}
