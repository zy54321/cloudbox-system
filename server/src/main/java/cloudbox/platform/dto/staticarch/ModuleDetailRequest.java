package cloudbox.platform.dto.staticarch;

import lombok.Data;

/**
 * 静态架构 - 模块详情请求
 */
@Data
public class ModuleDetailRequest {
    /** 模块 key：m1 ~ m7 */
    private String moduleKey = "m1";
}
