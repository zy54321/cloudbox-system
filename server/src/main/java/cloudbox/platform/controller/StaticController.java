package cloudbox.platform.controller;

import cloudbox.platform.dto.common.ApiResponse;
import cloudbox.platform.service.StaticArchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 静态架构接口（云匣子教学演示 - 体系结构与关联关系）
 * 所有接口均为 POST
 */
@RestController
@RequestMapping("/static")
public class StaticController {

    @Autowired
    private StaticArchService staticArchService;

    /**
     * 获取仪表数据（根据飞行阶段）
     */
    @PostMapping("/instrument")
    public ResponseEntity<Map<String, Object>> instrument(@RequestBody(required = false) Map<String, Object> requestBody) {
        Map<String, Object> data = staticArchService.getInstrument(requestBody);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取单元列表（星基/机载/链路/地面）
     */
    @PostMapping("/units")
    public ResponseEntity<Map<String, Object>> units(@RequestBody(required = false) Map<String, Object> requestBody) {
        List<Map<String, Object>> data = staticArchService.getUnits();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取单元详情
     */
    @PostMapping("/unit/detail")
    public ResponseEntity<Map<String, Object>> unitDetail(@RequestBody(required = false) Map<String, Object> requestBody) {
        Map<String, Object> data = staticArchService.getUnitDetail(requestBody);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取模块列表（模块1~7）
     */
    @PostMapping("/modules")
    public ResponseEntity<Map<String, Object>> modules(@RequestBody(required = false) Map<String, Object> requestBody) {
        List<Map<String, Object>> data = staticArchService.getModules();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取空间设施数据（地面/卫星合一），入参 category：地面 / 卫星
     */
    @PostMapping("/spatial")
    public ResponseEntity<Map<String, Object>> spatial(@RequestBody(required = false) Map<String, Object> requestBody) {
        String category = (String) requestBody.get("category");
        category = "satellite".equalsIgnoreCase(category) ? "satellite" : "ground";
        Map<String, Object> data = staticArchService.getSpatialData(category);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
