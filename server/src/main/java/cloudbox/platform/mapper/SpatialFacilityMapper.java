package cloudbox.platform.mapper;

import cloudbox.platform.entity.SpatialFacility;
import org.apache.ibatis.annotations.*;
import java.util.List;

/**
 * 空间设施 MyBatis Mapper
 */
@Mapper
public interface SpatialFacilityMapper {

    @Select("SELECT id, code, category, type, longitude, latitude, name, " +
            "altitude_m, image, size, offset_x, offset_y, info, info_source, " +
            "cluster_id, cluster_name, cluster_center_longitude, cluster_center_latitude, " +
            "created_at, updated_at " +
            "FROM spatial_facility WHERE category = #{category} ORDER BY cluster_id ASC, type ASC, id ASC")
    List<SpatialFacility> selectByCategory(@Param("category") String category);
}
