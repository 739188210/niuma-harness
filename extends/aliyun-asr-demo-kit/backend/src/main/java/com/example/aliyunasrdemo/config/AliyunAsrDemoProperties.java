package com.example.aliyunasrdemo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@ConfigurationProperties(prefix = "aliyun-asr-demo")
public class AliyunAsrDemoProperties {

    private Boolean enabled = true;
    private String apiKey;
    private String workspace;
    private String fileModel = "paraformer-v2";
    private String realtimeModel = "fun-asr-realtime";
    private String sourceLanguage = "zh";
    private Boolean realtimeTranslationEnabled = true;
    private String realtimeTranslationModel = "qwen-plus";
    private String realtimeTranslationTargetLanguage = "en";
    private Integer realtimeTranslationMaxTokens = 800;
    private String realtimeFormat = "pcm";
    private Integer realtimeSampleRate = 16000;
    private Integer fileUrlExpirationSeconds = 3600;
    private Long maxFileSizeBytes = 100L * 1024 * 1024;
    private Set<String> allowedFormats = new LinkedHashSet<>(
            List.of("wav", "mp3", "m4a", "aac", "opus", "flac", "webm", "mp4", "mpeg", "mpga"));
    private LocalFile localFile = new LocalFile();

    public boolean isDemoEnabled() {
        return Boolean.TRUE.equals(enabled);
    }

    public String resolveApiKey() {
        return isBlank(apiKey) ? System.getenv("DASHSCOPE_API_KEY") : apiKey;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getWorkspace() {
        return workspace;
    }

    public void setWorkspace(String workspace) {
        this.workspace = workspace;
    }

    public String getFileModel() {
        return fileModel;
    }

    public void setFileModel(String fileModel) {
        this.fileModel = fileModel;
    }

    public String getRealtimeModel() {
        return realtimeModel;
    }

    public void setRealtimeModel(String realtimeModel) {
        this.realtimeModel = realtimeModel;
    }

    public String getSourceLanguage() {
        return sourceLanguage;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }

    public Boolean getRealtimeTranslationEnabled() {
        return realtimeTranslationEnabled;
    }

    public void setRealtimeTranslationEnabled(Boolean realtimeTranslationEnabled) {
        this.realtimeTranslationEnabled = realtimeTranslationEnabled;
    }

    public String getRealtimeTranslationModel() {
        return realtimeTranslationModel;
    }

    public void setRealtimeTranslationModel(String realtimeTranslationModel) {
        this.realtimeTranslationModel = realtimeTranslationModel;
    }

    public String getRealtimeTranslationTargetLanguage() {
        return realtimeTranslationTargetLanguage;
    }

    public void setRealtimeTranslationTargetLanguage(String realtimeTranslationTargetLanguage) {
        this.realtimeTranslationTargetLanguage = realtimeTranslationTargetLanguage;
    }

    public Integer getRealtimeTranslationMaxTokens() {
        return realtimeTranslationMaxTokens;
    }

    public void setRealtimeTranslationMaxTokens(Integer realtimeTranslationMaxTokens) {
        this.realtimeTranslationMaxTokens = realtimeTranslationMaxTokens;
    }

    public String getRealtimeFormat() {
        return realtimeFormat;
    }

    public void setRealtimeFormat(String realtimeFormat) {
        this.realtimeFormat = realtimeFormat;
    }

    public Integer getRealtimeSampleRate() {
        return realtimeSampleRate;
    }

    public void setRealtimeSampleRate(Integer realtimeSampleRate) {
        this.realtimeSampleRate = realtimeSampleRate;
    }

    public Integer getFileUrlExpirationSeconds() {
        return fileUrlExpirationSeconds;
    }

    public void setFileUrlExpirationSeconds(Integer fileUrlExpirationSeconds) {
        this.fileUrlExpirationSeconds = fileUrlExpirationSeconds;
    }

    public Long getMaxFileSizeBytes() {
        return maxFileSizeBytes;
    }

    public void setMaxFileSizeBytes(Long maxFileSizeBytes) {
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public Set<String> getAllowedFormats() {
        return allowedFormats;
    }

    public void setAllowedFormats(Set<String> allowedFormats) {
        this.allowedFormats = allowedFormats;
    }

    public LocalFile getLocalFile() {
        return localFile;
    }

    public void setLocalFile(LocalFile localFile) {
        this.localFile = localFile;
    }

    public static class LocalFile {
        private String storagePath = "./data";
        private String publicBaseUrl = "http://localhost:8080/static";

        public String getStoragePath() {
            return storagePath;
        }

        public void setStoragePath(String storagePath) {
            this.storagePath = storagePath;
        }

        public String getPublicBaseUrl() {
            return publicBaseUrl;
        }

        public void setPublicBaseUrl(String publicBaseUrl) {
            this.publicBaseUrl = publicBaseUrl;
        }
    }
}
