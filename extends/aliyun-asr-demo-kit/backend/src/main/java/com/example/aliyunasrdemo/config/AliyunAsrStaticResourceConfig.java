package com.example.aliyunasrdemo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration(proxyBeanMethods = false)
public class AliyunAsrStaticResourceConfig implements WebMvcConfigurer {

    private final AliyunAsrDemoProperties properties;

    public AliyunAsrStaticResourceConfig(AliyunAsrDemoProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(properties.getLocalFile().getStoragePath())
                .toAbsolutePath()
                .normalize()
                .toUri()
                .toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/static/**").addResourceLocations(location);
    }
}
