package cloudbox.platform.dto.staticarch;

import lombok.Data;

/**
 * 静态架构 - 仪表数据请求（按阶段）
 */
@Data
public class InstrumentRequest {
    /** 飞行阶段：takeoff/climb/cruise/approach/landing */
    private String stage = "cruise";
}
