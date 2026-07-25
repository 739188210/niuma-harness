package com.example.aliyunasrdemo.service;

import com.example.aliyunasrdemo.config.AliyunAsrDemoProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class LocalPublicAliyunAsrFileAccessService implements AliyunAsrFileAccessService {

    private final AliyunAsrDemoProperties properties;

    public LocalPublicAliyunAsrFileAccessService(AliyunAsrDemoProperties properties) {
        this.properties = properties;
    }

    @Override
    public String createAccessibleUrl(MultipartFile file, String directory, int expirationSeconds) throws IOException {
        String fileName = UUID.randomUUID() + "-" + safeFileName(file.getOriginalFilename());
        Path targetDir = Path.of(properties.getLocalFile().getStoragePath(), directory);
        Files.createDirectories(targetDir);
        Files.write(targetDir.resolve(fileName), file.getBytes());
        return trimRight(properties.getLocalFile().getPublicBaseUrl(), "/") + "/" + directory + "/" + fileName;
    }

    private String safeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "audio.bin";
        }
        return fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private String trimRight(String value, String suffix) {
        if (value == null) {
            return "";
        }
        while (value.endsWith(suffix)) {
            value = value.substring(0, value.length() - suffix.length());
        }
        return value;
    }
}
