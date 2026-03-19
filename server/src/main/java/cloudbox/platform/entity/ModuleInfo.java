package cloudbox.platform.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 模块信息（模块一 ~ 模块七），支撑 /static/modules 接口
 */
@Getter
@Setter
public class ModuleInfo {

    /**
     * 主键
     */
    private Long id;

    /**
     * 模块编码，例如：M1 ~ M7，或自定义字符串
     */
    private String code;

    /**
     * 模块标题，例如：模块一：数据采集系统
     */
    private String title;

    /**
     * 模块描述内容
     */
    private String content;

    /**
     * 排序号，升序
     */
    private Integer sortOrder;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

