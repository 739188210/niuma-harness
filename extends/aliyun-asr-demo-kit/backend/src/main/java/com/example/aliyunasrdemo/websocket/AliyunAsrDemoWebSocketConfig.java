package com.example.aliyunasrdemo.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
public class AliyunAsrDemoWebSocketConfig implements WebSocketConfigurer {

    private final AliyunAsrDemoWebSocketHandler handler;

    public AliyunAsrDemoWebSocketConfig(AliyunAsrDemoWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/aliyun-asr-demo/realtime")
                .setAllowedOriginPatterns("*");
    }
}
