package cloudbox.platform.mapper;

import cloudbox.platform.entity.ModuleInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 模块信息 Mapper
 */
@Mapper
public interface ModuleInfoMapper {

    @Select("""
            SELECT id,
                   code,
                   title,
                   content,
                   sort_order AS sortOrder,
                   created_at AS createdAt,
                   updated_at AS updatedAt
            FROM module_info
            ORDER BY sort_order ASC, id ASC
            """)
    List<ModuleInfo> selectAll();
}

