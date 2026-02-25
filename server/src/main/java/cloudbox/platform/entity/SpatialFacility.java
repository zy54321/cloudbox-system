package cloudbox.platform.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 空间设施（地面+卫星合一），与表 spatial_facility 对应
 * id：主键自增；code：业务唯一标识；category：大类型（ground/satellite）；type：小类型
 */
@Getter
@Setter
public class SpatialFacility {

    private Long id;
    private String code;
    private String category;
    private String type;
    private Double longitude;
    private Double latitude;
    private String name;
    private String remark;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
