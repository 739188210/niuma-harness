package com.example.aliyunasrdemo.controller;

public class AliyunAsrDemoRecognizeReq {

    private String fileModel;
    private String sourceLanguage;

    public String getFileModel() {
        return fileModel;
    }

    public void setFileModel(String fileModel) {
        this.fileModel = fileModel;
    }

    public String getSourceLanguage() {
        return sourceLanguage;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }
}
