package cloudbox.platform.mapper;

import cloudbox.platform.entity.UnitInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 体系单元信息 Mapper
 */
@Mapper
public interface UnitInfoMapper {

    @Select("""
            SELECT id, code, name, summary, elements, description, functions, relations, role,
                   created_at AS createdAt, updated_at AS updatedAt
            FROM unit_info
            ORDER BY id ASC
            """)
    List<UnitInfo> selectAll();

    @Select("""
            SELECT id, code, name, summary, elements, description, functions, relations, role,
                   created_at AS createdAt, updated_at AS updatedAt
            FROM unit_info
            WHERE code = #{code}
            """)
    UnitInfo selectByCode(@Param("code") String code);
}

