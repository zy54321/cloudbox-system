package cloudbox.platform.controller;

import cloudbox.platform.dto.common.ApiResponse;
import cloudbox.platform.dto.staticarch.*;
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
    public ResponseEntity<Map<String, Object>> instrument(@RequestBody(required = false) InstrumentRequest req) {
        if (req == null) req = new InstrumentRequest();
        Map<String, String> data = staticArchService.getInstrument(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取单元列表（星基/机载/链路/地面）
     */
    @PostMapping("/units")
    public ResponseEntity<Map<String, Object>> units(@RequestBody(required = false) Map<String, Object> body) {
        List<Map<String, Object>> data = staticArchService.getUnits();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取单元详情
     */
    @PostMapping("/unit/detail")
    public ResponseEntity<Map<String, Object>> unitDetail(@RequestBody(required = false) UnitDetailRequest req) {
        if (req == null) req = new UnitDetailRequest();
        Map<String, Object> data = staticArchService.getUnitDetail(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取关联关系列表
     */
    @PostMapping("/relations")
    public ResponseEntity<Map<String, Object>> relations(@RequestBody(required = false) Map<String, Object> body) {
        List<Map<String, Object>> data = staticArchService.getRelations();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取关联关系详情
     */
    @PostMapping("/relation/detail")
    public ResponseEntity<Map<String, Object>> relationDetail(@RequestBody(required = false) RelationDetailRequest req) {
        if (req == null) req = new RelationDetailRequest();
        Map<String, Object> data = staticArchService.getRelationDetail(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取模块列表（模块1~7）
     */
    @PostMapping("/modules")
    public ResponseEntity<Map<String, Object>> modules(@RequestBody(required = false) Map<String, Object> body) {
        List<Map<String, String>> data = staticArchService.getModules();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 获取模块详情
     */
    @PostMapping("/module/detail")
    public ResponseEntity<Map<String, Object>> moduleDetail(@RequestBody(required = false) ModuleDetailRequest req) {
        if (req == null) req = new ModuleDetailRequest();
        Map<String, Object> data = staticArchService.getModuleDetail(req);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
