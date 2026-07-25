package com.example.aliyunasrdemo.service;

import com.example.aliyunasrdemo.controller.AliyunAsrDemoRecognizeReq;
import com.example.aliyunasrdemo.controller.AliyunAsrDemoResp;
import org.springframework.web.multipart.MultipartFile;

public interface AliyunAsrDemoService {

    AliyunAsrDemoResp recognize(MultipartFile file, AliyunAsrDemoRecognizeReq req);
}
