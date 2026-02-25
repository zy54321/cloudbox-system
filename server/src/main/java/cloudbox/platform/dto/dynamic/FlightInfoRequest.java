package cloudbox.platform.dto.dynamic;

import lombok.Data;

/**
 * 动态交互 - 航班/任务信息请求
 */
@Data
public class FlightInfoRequest {
    private String scenarioKey = "engine";
}
