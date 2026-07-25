package com.example.aliyunasrdemo.websocket;

import com.alibaba.dashscope.audio.asr.recognition.RecognitionParam;
import com.alibaba.dashscope.audio.asr.recognition.RecognitionResult;
import com.alibaba.dashscope.common.ResultCallback;
import com.example.aliyunasrdemo.config.AliyunAsrDemoProperties;
import com.example.aliyunasrdemo.service.AliyunAsrRealtimeTranslationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AliyunAsrDemoWebSocketHandler extends BinaryWebSocketHandler {

    private final Map<String, AliyunAsrRealtimeRecognitionSession> recognitionMap = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AliyunAsrDemoProperties properties;
    private final AliyunAsrRealtimeTranslationService translationService;

    public AliyunAsrDemoWebSocketHandler(AliyunAsrDemoProperties properties,
                                         AliyunAsrRealtimeTranslationService translationService) {
        this.properties = properties;
        this.translationService = translationService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        if (!properties.isDemoEnabled()) {
            sendEvent(session, "error", "阿里云语音识别 Demo 未启用", true);
            closeQuietly(session);
            return;
        }
        if (isBlank(properties.resolveApiKey())) {
            sendEvent(session, "error", "请先配置 aliyun-asr-demo.api-key 或 DASHSCOPE_API_KEY", true);
            closeQuietly(session);
            return;
        }
        RealtimeOptions options = resolveOptions(session);
        RecognitionParam recognitionParam = buildRecognitionParam(options);
        AliyunAsrRealtimeRecognitionSession realtimeSession = new AliyunAsrRealtimeRecognitionSession(
                () -> new DashScopeRealtimeRecognitionClient(recognitionParam),
                new ResultCallback<RecognitionResult>() {
                    @Override
                    public void onEvent(RecognitionResult result) {
                        String text = result.getSentence() == null ? "" : result.getSentence().getText();
                        if (isBlank(text)) {
                            return;
                        }
                        boolean sentenceEnd = result.isSentenceEnd();
                        sendEvent(session, sentenceEnd ? "sentence_end" : "partial", text, sentenceEnd);
                        if (sentenceEnd) {
                            translateSentenceAsync(session, text, options);
                        }
                    }

                    @Override
                    public void onComplete() {
                        sendEvent(session, "complete", "", true);
                        closeQuietly(session);
                    }

                    @Override
                    public void onError(Exception ex) {
                        sendEvent(session, "error", nonBlank(ex.getMessage(), ex.getClass().getSimpleName()), true);
                        closeQuietly(session);
                    }
                });
        recognitionMap.put(session.getId(), realtimeSession);
        sendEvent(session, "open", "阿里云实时识别已连接，等待音频", false);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        AliyunAsrRealtimeRecognitionSession realtimeSession = recognitionMap.get(session.getId());
        if (realtimeSession == null) {
            return;
        }
        ByteBuffer payload = message.getPayload();
        byte[] bytes = new byte[payload.remaining()];
        payload.get(bytes);
        try {
            boolean sent = realtimeSession.sendAudioFrame(bytes);
            if (sent && realtimeSession.getAudioFrameCount() == 1) {
                sendEvent(session, "listening", "阿里云实时识别已启动", false);
            }
        } catch (Exception ex) {
            sendEvent(session, "error", nonBlank(ex.getMessage(), ex.getClass().getSimpleName()), true);
            stopRecognition(session, false);
            closeQuietly(session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        if ("stop".equalsIgnoreCase(message.getPayload())) {
            stopRecognition(session, true);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        stopRecognition(session, false);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sendEvent(session, "error", nonBlank(exception.getMessage(), exception.getClass().getSimpleName()), true);
        stopRecognition(session, false);
    }

    private RecognitionParam buildRecognitionParam(RealtimeOptions options) {
        RecognitionParam.RecognitionParamBuilder<?, ?> builder = RecognitionParam.builder()
                .apiKey(properties.resolveApiKey())
                .model(options.model())
                .format(options.format())
                .sampleRate(options.sampleRate());
        if (isNotBlank(properties.getWorkspace())) {
            builder.workspace(properties.getWorkspace());
        }
        return builder.build();
    }

    private RealtimeOptions resolveOptions(WebSocketSession session) {
        Map<String, String> query = UriComponentsBuilder.fromUri(resolveUri(session))
                .build()
                .getQueryParams()
                .toSingleValueMap();
        String model = nonBlank(query.get("model"), properties.getRealtimeModel());
        String format = nonBlank(query.get("format"), properties.getRealtimeFormat());
        Integer sampleRate = parseInt(query.get("sampleRate"), properties.getRealtimeSampleRate());
        String sourceLanguage = nonBlank(query.get("sourceLanguage"), properties.getSourceLanguage());
        boolean translationEnabled = Boolean.parseBoolean(nonBlank(query.get("translationEnabled"),
                String.valueOf(Boolean.TRUE.equals(properties.getRealtimeTranslationEnabled()))));
        String targetLanguage = nonBlank(query.get("targetLanguage"), properties.getRealtimeTranslationTargetLanguage());
        String translationModel = nonBlank(query.get("translationModel"), properties.getRealtimeTranslationModel());
        return new RealtimeOptions(model, format, sampleRate, sourceLanguage, translationEnabled, targetLanguage, translationModel);
    }

    private URI resolveUri(WebSocketSession session) {
        return session.getUri() == null ? URI.create("/aliyun-asr-demo/realtime") : session.getUri();
    }

    private Integer parseInt(String value, Integer defaultValue) {
        if (isBlank(value)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }

    private void sendEvent(WebSocketSession session, String type, String text, boolean sentenceEnd) {
        sendEvent(session, type, text, sentenceEnd, Map.of());
    }

    private void sendEvent(WebSocketSession session, String type, String text, boolean sentenceEnd,
                           Map<String, Object> extraFields) {
        if (!session.isOpen()) {
            return;
        }
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("type", type);
            event.put("text", text == null ? "" : text);
            event.put("sentenceEnd", sentenceEnd);
            event.put("time", System.currentTimeMillis());
            event.putAll(extraFields);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(event)));
                }
            }
        } catch (IOException | IllegalStateException ignored) {
            closeQuietly(session);
        }
    }

    private void stopRecognition(WebSocketSession session, boolean closeAfterStop) {
        AliyunAsrRealtimeRecognitionSession realtimeSession = recognitionMap.remove(session.getId());
        if (realtimeSession != null) {
            realtimeSession.stop();
        }
        if (closeAfterStop) {
            closeQuietly(session);
        }
    }

    private void closeQuietly(WebSocketSession session) {
        try {
            session.close();
        } catch (IOException | IllegalStateException ignored) {
            // Ignore close failures.
        }
    }

    private void translateSentenceAsync(WebSocketSession session, String sourceText, RealtimeOptions options) {
        if (!options.translationEnabled()) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                String translatedText = translationService.translate(sourceText, options.sourceLanguage(),
                        options.targetLanguage(), options.translationModel());
                sendEvent(session, "translation", translatedText, true, Map.of(
                        "sourceText", sourceText,
                        "sourceLanguage", options.sourceLanguage(),
                        "targetLanguage", options.targetLanguage(),
                        "model", options.translationModel()
                ));
            } catch (Exception ex) {
                sendEvent(session, "translation_error", nonBlank(ex.getMessage(), ex.getClass().getSimpleName()), true,
                        Map.of("sourceText", sourceText));
            }
        });
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

    private record RealtimeOptions(String model, String format, Integer sampleRate,
                                   String sourceLanguage, boolean translationEnabled,
                                   String targetLanguage, String translationModel) {
    }
}
