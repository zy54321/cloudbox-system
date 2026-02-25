package cloudbox.platform;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CloudBox Platform Application
 *
 * @author CloudBox Team
 */
@SpringBootApplication
@MapperScan("cloudbox.platform.mapper")
public class PlatformCloudboxApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlatformCloudboxApplication.class, args);
    }
}
