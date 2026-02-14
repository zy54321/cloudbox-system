# Platform CloudBox Server

CloudBox 平台后端服务

## 技术栈

- **Spring Boot**: 3.5.5
- **JDK**: 21
- **数据库**: MySQL
- **构建工具**: Maven

## 项目结构

```
server/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── io/cloudbox/platform/cloudbox/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       └── application-prod.yml
│   └── test/
│       └── java/
│           └── io/cloudbox/platform/cloudbox/
├── pom.xml
└── README.md
```

## 快速开始

### 前置要求

- JDK 21+
- Maven 3.6+
- MySQL 8.0+

### 配置数据库

1. 创建数据库：
```sql
CREATE DATABASE cloudbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 修改 `src/main/resources/application.yml` 中的数据库连接信息

### 运行项目

```bash
# 编译项目
mvn clean compile

# 运行项目
mvn spring-boot:run

# 打包项目
mvn clean package

# 运行打包后的 jar
java -jar target/platform-cloudbox-1.0.0-SNAPSHOT.jar
```

### 使用不同环境配置

```bash
# 开发环境
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 生产环境
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## API 地址

默认访问地址：http://localhost:8080/api

## 开发规范

- 包结构：`cloudbox.platform.{module}`
- 代码风格：遵循 Java 编码规范
- 提交信息：使用中文
