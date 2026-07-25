package com.example.aliyunasrdemo.service;

public interface AliyunAsrRealtimeTranslationService {

    String translate(String sourceText, String sourceLanguage, String targetLanguage, String model);
}
