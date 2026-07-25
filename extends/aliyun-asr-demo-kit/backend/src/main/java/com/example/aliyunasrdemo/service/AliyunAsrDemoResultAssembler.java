package com.example.aliyunasrdemo.service;

import com.example.aliyunasrdemo.controller.AliyunAsrDemoResp;

import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class AliyunAsrDemoResultAssembler {

    private AliyunAsrDemoResultAssembler() {
    }

    public static AliyunAsrDemoResp toResp(Map<String, Object> result, AliyunAsrDemoResolvedRequest request) {
        AliyunAsrDemoResp resp = new AliyunAsrDemoResp();
        resp.setFileName(request.fileName());
        resp.setFileModel(request.fileModel());
        resp.setSourceLanguage(request.sourceLanguage());
        resp.setTranscriptionText(extractText(result));
        resp.setTaskId(toString(result.get("taskId")));
        resp.setFileUrl(toString(result.get("fileUrl")));
        return resp;
    }

    private static String extractText(Map<String, Object> result) {
        Object text = result.get("text");
        if (text != null) {
            return toString(text);
        }
        Object sentences = result.get("sentences");
        if (sentences instanceof List<?> items) {
            return joinText(items);
        }
        Object transcripts = result.get("transcripts");
        if (transcripts instanceof List<?> items) {
            return joinText(items);
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private static String joinText(List<?> items) {
        StringBuilder builder = new StringBuilder();
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Object text = ((Map<String, Object>) map).get("text");
            if (text == null) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append('\n');
            }
            builder.append(text);
        }
        return builder.toString();
    }

    private static String toString(Object value) {
        return Objects.toString(value, "");
    }
}
