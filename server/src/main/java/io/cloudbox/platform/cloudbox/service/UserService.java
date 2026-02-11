package io.cloudbox.platform.cloudbox.service;

import io.cloudbox.platform.cloudbox.entity.User;
import io.cloudbox.platform.cloudbox.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 用户服务类示例
 */
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    /**
     * 根据 ID 查询用户
     */
    public User getUserById(Long id) {
        return userMapper.selectById(id);
    }

    /**
     * 查询所有用户
     */
    public List<User> getAllUsers() {
        return userMapper.selectAll();
    }

    /**
     * 根据用户名查询用户
     */
    public User getUserByUsername(String username) {
        return userMapper.selectByUsername(username);
    }

    /**
     * 创建用户
     */
    public int createUser(User user) {
        return userMapper.insert(user);
    }

    /**
     * 更新用户
     */
    public int updateUser(User user) {
        return userMapper.update(user);
    }

    /**
     * 删除用户
     */
    public int deleteUser(Long id) {
        return userMapper.deleteById(id);
    }
}
