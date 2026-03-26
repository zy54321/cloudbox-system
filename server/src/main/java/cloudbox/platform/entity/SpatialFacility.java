package cloudbox.platform.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 空间设施（地面+卫星合一），与表 spatial_facility 对应
 * id：主键自增；code：节点 id（units.json）；category：大类型（ground/satellite）；type：节点类型（satellite/ground_unit）
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
    private Integer altitudeM;
    private String image;
    private Double size;
    private Integer offsetX;
    private Integer offsetY;
    private String info;
    private String infoSource;
    private String clusterId;
    private String clusterName;
    private Double clusterCenterLongitude;
    private Double clusterCenterLatitude;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
