package cloudbox.platform.dto.dynamic;

import lombok.Data;

/**
 * 动态交互 - 场景步骤请求
 */
@Data
public class ScenarioStepsRequest {
    /** 场景 key：engine/smoke/nav/hijack/misop/generic 等 */
    private String scenarioKey = "engine";
}
