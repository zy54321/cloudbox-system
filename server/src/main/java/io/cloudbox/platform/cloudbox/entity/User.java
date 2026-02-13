package io.cloudbox.platform.cloudbox.entity;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户实体类示例
 */
@Data
@NoArgsConstructor
public class User {
    
    private Long id;
    private String username;
    private String email;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    /**
     * 带用户名和邮箱的构造函数
     */
    public User(String username, String email) {
        this.username = username;
        this.email = email;
    }
}
