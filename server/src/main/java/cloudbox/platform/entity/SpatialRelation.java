package cloudbox.platform.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 节点关系/连线配置（来源 links.json 的 relations）
 */
@Getter
@Setter
public class SpatialRelation {

    private Long id;
    private String code;
    private String name;
    private String flowLabel;
    private String edgesJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

