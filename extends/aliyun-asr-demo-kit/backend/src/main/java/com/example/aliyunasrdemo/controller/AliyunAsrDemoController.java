package com.example.aliyunasrdemo.controller;

import com.example.aliyunasrdemo.service.AliyunAsrDemoService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/aliyun-asr-demo")
@Validated
public class AliyunAsrDemoController {

    private final AliyunAsrDemoService aliyunAsrDemoService;

    public AliyunAsrDemoController(AliyunAsrDemoService aliyunAsrDemoService) {
        this.aliyunAsrDemoService = aliyunAsrDemoService;
    }

    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResult<AliyunAsrDemoResp> recognize(@RequestParam("file") MultipartFile file,
                                                  @Valid @ModelAttribute AliyunAsrDemoRecognizeReq req) {
        return ApiResult.ok(aliyunAsrDemoService.recognize(file, req));
    }
}
