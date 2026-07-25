package com.example.aliyunasrdemo.service;

import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationOutput;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.Role;
import com.example.aliyunasrdemo.config.AliyunAsrDemoProperties;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AliyunAsrRealtimeTranslationServiceImpl implements AliyunAsrRealtimeTranslationService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "zh", "Chinese",
            "en", "English",
            "ja", "Japanese",
            "ko", "Korean",
            "fr", "French",
            "de", "German",
            "es", "Spanish",
            "ru", "Russian");

    private final AliyunAsrDemoProperties properties;

    public AliyunAsrRealtimeTranslationServiceImpl(AliyunAsrDemoProperties properties) {
        this.properties = properties;
    }

    @Override
    public String translate(String sourceText, String sourceLanguage, String targetLanguage, String model) {
        String text = trim(sourceText);
        String source = normalizeLanguage(sourceLanguage);
        String target = normalizeLanguage(targetLanguage);
        if (text.isBlank()) {
            return "";
        }
        if (target.isBlank() || target.equals(source)) {
            return text;
        }
        GenerationParam param = buildParam(text, source, target, model);
        return trim(callDashScope(param));
    }

    private GenerationParam buildParam(String sourceText, String sourceLanguage, String targetLanguage, String model) {
        Message systemMessage = Message.builder()
                .role(Role.SYSTEM.getValue())
                .content("You are a professional real-time interpreter. Translate only, do not explain.")
                .build();
        Message userMessage = Message.builder()
                .role(Role.USER.getValue())
                .content("Translate the following " + languageName(sourceLanguage)
                        + " text into " + languageName(targetLanguage)
                        + ". Return only the translated text.\n\n" + sourceText)
                .build();
        GenerationParam.GenerationParamBuilder<?, ?> builder = GenerationParam.builder()
                .apiKey(properties.resolveApiKey())
                .model(nonBlank(model, properties.getRealtimeTranslationModel()))
                .messages(List.of(systemMessage, userMessage))
                .resultFormat(GenerationParam.ResultFormat.MESSAGE)
                .temperature(0.1f)
                .maxTokens(properties.getRealtimeTranslationMaxTokens())
                .headers(Collections.emptyMap());
        if (isNotBlank(properties.getWorkspace())) {
            builder.workspace(properties.getWorkspace());
        }
        return builder.build();
    }

    protected String callDashScope(GenerationParam param) {
        try {
            return extractText(new Generation().call(param));
        } catch (Exception ex) {
            throw new IllegalStateException("阿里云实时翻译调用失败：" + nonBlank(ex.getMessage(), ex.getClass().getSimpleName()), ex);
        }
    }

    private String extractText(GenerationResult result) {
        if (result == null || result.getOutput() == null) {
            return "";
        }
        GenerationOutput output = result.getOutput();
        if (isNotBlank(output.getText())) {
            return output.getText();
        }
        if (output.getChoices() == null || output.getChoices().isEmpty()) {
            return "";
        }
        Message message = output.getChoices().get(0).getMessage();
        return message == null ? "" : nonBlank(message.getContent(), "");
    }

    private String normalizeLanguage(String language) {
        return trim(language).toLowerCase(Locale.ROOT);
    }

    private String languageName(String language) {
        return LANGUAGE_NAMES.getOrDefault(normalizeLanguage(language), nonBlank(language, "target language"));
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isNotBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String nonBlank(String value, String defaultValue) {
        return isNotBlank(value) ? value : defaultValue;
    }
}
