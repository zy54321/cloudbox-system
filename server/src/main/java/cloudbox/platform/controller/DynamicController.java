package cloudbox.platform.controller;

import cloudbox.platform.dto.common.ApiResponse;
import cloudbox.platform.dto.dynamic.*;
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
    public ResponseEntity<Map<String, Object>> scenarios(@RequestBody(required = false) Map<String, Object> body) {
        List<Map<String, Object>> data = dynamicFlowService.getScenarios();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取场景步骤与处置卡片
     */
    @PostMapping("/scenario/steps")
    public ResponseEntity<Map<String, Object>> scenarioSteps(@RequestBody(required = false) ScenarioStepsRequest req) {
        if (req == null) req = new ScenarioStepsRequest();
        Map<String, Object> data = dynamicFlowService.getScenarioSteps(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取航班/任务信息
     */
    @PostMapping("/flight/info")
    public ResponseEntity<Map<String, Object>> flightInfo(@RequestBody(required = false) FlightInfoRequest req) {
        if (req == null) req = new FlightInfoRequest();
        Map<String, Object> data = dynamicFlowService.getFlightInfo(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取事件列表（按当前时间 T+ 过滤）
     */
    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> events(@RequestBody(required = false) EventsRequest req) {
        if (req == null) req = new EventsRequest();
        List<Map<String, Object>> data = dynamicFlowService.getEvents(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取风险与对比指标
     */
    @PostMapping("/risk-kpi")
    public ResponseEntity<Map<String, Object>> riskKpi(@RequestBody(required = false) RiskKpiRequest req) {
        if (req == null) req = new RiskKpiRequest();
        Map<String, Object> data = dynamicFlowService.getRiskKpi(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 历史回看 - 事件列表（完整时间线）
     */
    @PostMapping("/history")
    public ResponseEntity<Map<String, Object>> history(@RequestBody(required = false) HistoryRequest req) {
        if (req == null) req = new HistoryRequest();
        List<Map<String, Object>> data = dynamicFlowService.getHistory(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
