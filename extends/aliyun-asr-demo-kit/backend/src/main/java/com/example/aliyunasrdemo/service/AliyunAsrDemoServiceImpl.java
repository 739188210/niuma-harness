package com.example.aliyunasrdemo.service;

import com.alibaba.dashscope.audio.asr.transcription.Transcription;
import com.alibaba.dashscope.audio.asr.transcription.TranscriptionParam;
import com.alibaba.dashscope.audio.asr.transcription.TranscriptionQueryParam;
import com.alibaba.dashscope.audio.asr.transcription.TranscriptionResult;
import com.alibaba.dashscope.audio.asr.transcription.TranscriptionTaskResult;
import com.alibaba.dashscope.common.TaskStatus;
import com.example.aliyunasrdemo.config.AliyunAsrDemoProperties;
import com.example.aliyunasrdemo.controller.AliyunAsrDemoRecognizeReq;
import com.example.aliyunasrdemo.controller.AliyunAsrDemoResp;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AliyunAsrDemoServiceImpl implements AliyunAsrDemoService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AliyunAsrDemoProperties properties;
    private final AliyunAsrFileAccessService fileAccessService;

    public AliyunAsrDemoServiceImpl(AliyunAsrDemoProperties properties,
                                    AliyunAsrFileAccessService fileAccessService) {
        this.properties = properties;
        this.fileAccessService = fileAccessService;
    }

    @Override
    public AliyunAsrDemoResp recognize(MultipartFile file, AliyunAsrDemoRecognizeReq req) {
        long start = System.currentTimeMillis();
        AliyunAsrDemoResolvedRequest request = resolveRequest(file, req);
        try {
            String fileUrl = fileAccessService.createAccessibleUrl(file, "aliyun-asr-demo",
                    properties.getFileUrlExpirationSeconds());
            Map<String, Object> transcription = callTranscription(fileUrl, request);
            transcription.put("fileUrl", fileUrl);
            AliyunAsrDemoResp resp = AliyunAsrDemoResultAssembler.toResp(transcription, request);
            resp.setDurationMs(System.currentTimeMillis() - start);
            return resp;
        } catch (IOException ex) {
            throw new IllegalArgumentException("上传音频文件失败：" + ex.getMessage(), ex);
        } catch (Exception ex) {
            throw new IllegalArgumentException("阿里云语音识别调用失败：" + nonBlank(ex.getMessage(), ex.getClass().getSimpleName()), ex);
        }
    }

    private Map<String, Object> callTranscription(String fileUrl, AliyunAsrDemoResolvedRequest request) {
        TranscriptionParam.TranscriptionParamBuilder<?, ?> builder = TranscriptionParam.builder()
                .apiKey(properties.resolveApiKey())
                .model(request.fileModel())
                .fileUrls(List.of(fileUrl));
        if (isNotBlank(properties.getWorkspace())) {
            builder.workspace(properties.getWorkspace());
        }
        TranscriptionResult created = new Transcription().asyncCall(builder.build());
        TranscriptionResult completed = new Transcription().wait(TranscriptionQueryParam.builder()
                .apiKey(properties.resolveApiKey())
                .taskId(created.getTaskId())
                .headers(Collections.emptyMap())
                .build());
        if (!TaskStatus.SUCCEEDED.equals(completed.getTaskStatus())) {
            throw new IllegalArgumentException("阿里云语音识别任务未成功：" + completed.getTaskStatus());
        }
        TranscriptionTaskResult result = completed.getResults() == null || completed.getResults().isEmpty()
                ? null : completed.getResults().get(0);
        if (result == null || isBlank(result.getTranscriptionUrl())) {
            throw new IllegalArgumentException("阿里云语音识别返回缺少 transcriptionUrl");
        }
        Map<String, Object> body = fetchResult(result.getTranscriptionUrl());
        body.put("taskId", completed.getTaskId());
        return body;
    }

    private Map<String, Object> fetchResult(String transcriptionUrl) {
        String body = restTemplate.getForObject(URI.create(transcriptionUrl), String.class);
        if (isBlank(body)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(body, new TypeReference<>() {
            });
        } catch (IOException ex) {
            throw new IllegalArgumentException("解析阿里云语音识别结果失败：" + ex.getMessage(), ex);
        }
    }

    private AliyunAsrDemoResolvedRequest resolveRequest(MultipartFile file, AliyunAsrDemoRecognizeReq req) {
        validateEnabledAndApiKey();
        if (req == null) {
            req = new AliyunAsrDemoRecognizeReq();
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请上传音频文件");
        }
        if (properties.getMaxFileSizeBytes() != null && file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("音频文件大小超过限制");
        }
        String extension = normalizeFormat(extractExtension(file.getOriginalFilename()));
        if (isBlank(extension) || !properties.getAllowedFormats().contains(extension)) {
            throw new IllegalArgumentException("暂不支持该音频格式：" + extension);
        }
        return new AliyunAsrDemoResolvedRequest(
                nonBlank(file.getOriginalFilename(), "audio." + extension),
                nonBlank(req.getFileModel(), properties.getFileModel()),
                nonBlank(req.getSourceLanguage(), properties.getSourceLanguage())
        );
    }

    private void validateEnabledAndApiKey() {
        if (!properties.isDemoEnabled()) {
            throw new IllegalArgumentException("阿里云语音识别 Demo 未启用");
        }
        if (isBlank(properties.resolveApiKey())) {
            throw new IllegalArgumentException("请先配置 aliyun-asr-demo.api-key 或 DASHSCOPE_API_KEY");
        }
    }

    private String extractExtension(String fileName) {
        if (isBlank(fileName) || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }

    private String normalizeFormat(String format) {
        return format == null ? "" : format.trim().replace(".", "").toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean isNotBlank(String value) {
        return !isBlank(value);
    }

    private String nonBlank(String value, String defaultValue) {
        return isBlank(value) ? defaultValue : value;
    }
}
