package cloudbox.platform.dto.staticarch;

import lombok.Data;

/**
 * 静态架构 - 关联关系详情请求
 */
@Data
public class RelationDetailRequest {
    /** 关系索引或类型标识 */
    private String relationId;
}
