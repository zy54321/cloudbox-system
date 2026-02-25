package cloudbox.platform.dto.dynamic;

import lombok.Data;

/**
 * 动态交互 - 事件列表请求
 */
@Data
public class EventsRequest {
    private String scenarioKey = "engine";
    /** 当前时间 T+ (0~100) */
    private Integer currentTime = 0;
}
