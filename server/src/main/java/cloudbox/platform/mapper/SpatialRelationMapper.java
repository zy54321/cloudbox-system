package cloudbox.platform.mapper;

import cloudbox.platform.entity.SpatialRelation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 节点关系/连线配置 Mapper
 */
@Mapper
public interface SpatialRelationMapper {

    @Select("SELECT id, code, name, flow_label, edges_json, created_at, updated_at " +
            "FROM spatial_relation ORDER BY id ASC")
    List<SpatialRelation> selectAll();
}

