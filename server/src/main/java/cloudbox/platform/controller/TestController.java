package cloudbox.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 测试接口控制器
 * 用于验证服务是否正常运行
 */
@RestController
@RequestMapping("/test")
public class TestController {

    /**
     * 基础健康检查接口
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "ok");
        result.put("message", "服务运行正常");
        result.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(result);
    }

    /**
     * 简单测试接口
     */
    @GetMapping("/hello")
    public ResponseEntity<Map<String, Object>> hello(@RequestParam(required = false, defaultValue = "World") String name) {
        Map<String, Object> result = new HashMap<>();
        result.put("message", "Hello, " + name + "!");
        result.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(result);
    }

    /**
     * 获取服务器信息
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> result = new HashMap<>();
        result.put("application", "platform-cloudbox");
        result.put("version", "1.0.0-SNAPSHOT");
        result.put("javaVersion", System.getProperty("java.version"));
        result.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(result);
    }
}
