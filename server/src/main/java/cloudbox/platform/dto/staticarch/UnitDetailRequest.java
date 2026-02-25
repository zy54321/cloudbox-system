package cloudbox.platform.dto.staticarch;

import lombok.Data;

/**
 * 静态架构 - 单元详情请求
 */
@Data
public class UnitDetailRequest {
    /** 单元类型：星基/机载/链路/地面 */
    private String type;
}
