package com.example.aliyunasrdemo.websocket;

import com.alibaba.dashscope.audio.asr.recognition.Recognition;
import com.alibaba.dashscope.audio.asr.recognition.RecognitionParam;
import com.alibaba.dashscope.audio.asr.recognition.RecognitionResult;
import com.alibaba.dashscope.common.ResultCallback;

import java.nio.ByteBuffer;
import java.util.function.Supplier;

final class AliyunAsrRealtimeRecognitionSession {

    private final Supplier<RealtimeRecognitionClient> clientSupplier;
    private final ResultCallback<RecognitionResult> callback;
    private RealtimeRecognitionClient client;
    private int audioFrameCount;
    private boolean stopped;

    AliyunAsrRealtimeRecognitionSession(Supplier<RealtimeRecognitionClient> clientSupplier,
                                        ResultCallback<RecognitionResult> callback) {
        this.clientSupplier = clientSupplier;
        this.callback = callback;
    }

    synchronized boolean sendAudioFrame(byte[] audioFrame) {
        if (stopped || audioFrame == null || audioFrame.length == 0) {
            return false;
        }
        if (client == null) {
            client = clientSupplier.get();
            client.start(callback);
        }
        audioFrameCount++;
        client.sendAudioFrame(ByteBuffer.wrap(audioFrame));
        return true;
    }

    synchronized boolean stop() {
        if (stopped) {
            return false;
        }
        stopped = true;
        if (client == null) {
            return false;
        }
        client.stop();
        return true;
    }

    synchronized int getAudioFrameCount() {
        return audioFrameCount;
    }
}

interface RealtimeRecognitionClient {

    void start(ResultCallback<RecognitionResult> callback);

    void sendAudioFrame(ByteBuffer audioFrame);

    void stop();
}

final class DashScopeRealtimeRecognitionClient implements RealtimeRecognitionClient {

    private final Recognition recognition = new Recognition();
    private final RecognitionParam param;

    DashScopeRealtimeRecognitionClient(RecognitionParam param) {
        this.param = param;
    }

    @Override
    public void start(ResultCallback<RecognitionResult> callback) {
        recognition.call(param, callback);
    }

    @Override
    public void sendAudioFrame(ByteBuffer audioFrame) {
        recognition.sendAudioFrame(audioFrame);
    }

    @Override
    public void stop() {
        recognition.stop();
    }
}
