package cloudbox.platform.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 体系单元信息（星基 / 地面 / 机载），用于支撑 /static/units 与 /static/unit/detail 接口
 *
 * elements、functions、relations 使用分号分隔存储，Service 层再拆成列表
 */
@Getter
@Setter
public class UnitInfo {

    /**
     * 主键
     */
    private Long id;

    /**
     * 单元编码，例如：星基 / 地面 / 机载
     */
    private String code;

    /**
     * 单元名称，例如：星基元素 / 地面元素 / 机载元素
     */
    private String name;

    /**
     * 单元简要说明，用于列表展示
     */
    private String summary;

    /**
     * 包含元素，使用 ";;" 分隔
     */
    private String elements;

    /**
     * 功能说明（长文本）
     */
    private String description;

    /**
     * 主要功能列表，使用 ";;" 分隔
     */
    private String functions;

    /**
     * 关联关系列表，使用 ";;" 分隔
     */
    private String relations;

    /**
     * 在体系中的作用（长文本）
     */
    private String role;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}

