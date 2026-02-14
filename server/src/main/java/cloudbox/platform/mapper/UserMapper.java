package cloudbox.platform.mapper;

import cloudbox.platform.entity.User;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
 * 用户 Mapper 接口
 */
@Mapper
public interface UserMapper {

    /**
     * 根据 ID 查询用户
     */
    @Select("SELECT id, username, email, create_time, update_time FROM user WHERE id = #{id}")
    User selectById(@Param("id") Long id);

    /**
     * 查询所有用户
     */
    @Select("SELECT id, username, email, create_time, update_time FROM user ORDER BY id DESC")
    List<User> selectAll();

    /**
     * 根据用户名查询用户
     */
    @Select("SELECT id, username, email, create_time, update_time FROM user WHERE username = #{username}")
    User selectByUsername(@Param("username") String username);

    /**
     * 插入用户
     */
    @Insert("INSERT INTO user (username, email, create_time, update_time) " +
            "VALUES (#{username}, #{email}, NOW(), NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(User user);

    /**
     * 更新用户
     */
    @Update("UPDATE user SET username = #{username}, email = #{email}, update_time = NOW() WHERE id = #{id}")
    int update(User user);

    /**
     * 根据 ID 删除用户
     */
    @Delete("DELETE FROM user WHERE id = #{id}")
    int deleteById(@Param("id") Long id);
}
