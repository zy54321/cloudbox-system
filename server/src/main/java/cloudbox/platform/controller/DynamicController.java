package cloudbox.platform.controller;

import cloudbox.platform.dto.common.ApiResponse;
import cloudbox.platform.service.DynamicFlowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 动态交互接口（云匣子教学演示 - 五大场景脚本回放、处置卡片、事件/消息、时间轴、双屏对比）
 * 所有接口均为 POST
 */
@RestController
@RequestMapping("/dynamic")
public class DynamicController {

    @Autowired
    private DynamicFlowService dynamicFlowService;

    /**
     * 获取场景列表
     */
    @PostMapping("/scenarios")
    public ResponseEntity<Map<String, Object>> scenarios(@RequestBody(required = false) Map<String, Object> requestBody) {
        List<Map<String, Object>> data = dynamicFlowService.getScenarios();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 返回 static/dynamic_scenarios.json 的完整解析结果
     */
    @PostMapping("/scenarios/config")
    public ResponseEntity<Map<String, Object>> scenarioConfig(@RequestBody(required = false) Map<String, Object> requestBody) {
        Map<String, Object> data = dynamicFlowService.getDynamicScenariosConfig();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 返回某个事件的单位/节点配置（static/<eventKey>_units.json）
     * 例：eventKey=engine_failure -> static/engine_failure_units.json
     */
    @PostMapping("/event/units")
    public ResponseEntity<Map<String, Object>> eventUnits(@RequestBody(required = false) Map<String, Object> requestBody) {
        String eventKey = requestBody != null && requestBody.get("eventKey") != null
                ? String.valueOf(requestBody.get("eventKey"))
                : "engine_failure";
        Object data = dynamicFlowService.getEventUnits(eventKey);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
