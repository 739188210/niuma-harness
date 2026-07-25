package com.example.aliyunasrdemo.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface AliyunAsrFileAccessService {

    String createAccessibleUrl(MultipartFile file, String directory, int expirationSeconds) throws IOException;
}
