package cloudbox.platform.mapper;

import cloudbox.platform.entity.SpatialFacility;
import org.apache.ibatis.annotations.*;
import java.util.List;

/**
 * 空间设施 MyBatis Mapper
 */
@Mapper
public interface SpatialFacilityMapper {

    @Select("SELECT id, code, category, type, longitude, latitude, name, remark, created_at, updated_at " +
            "FROM spatial_facility WHERE category = #{category} ORDER BY type ASC, id ASC")
    List<SpatialFacility> selectByCategory(@Param("category") String category);
}
