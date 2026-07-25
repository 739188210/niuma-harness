# 阿里云语音识别 Demo 接入包

这是一套可复制到其它 Spring Boot + Vue3 项目的阿里云 DashScope 语音识别 Demo。

包含能力：

- 上传音频文件识别：默认 `paraformer-v2`
- 浏览器麦克风实时识别：默认 `fun-asr-realtime`
- 模拟音频实时识别：浏览器把音频文件转 PCM 后通过 WebSocket 发送
- 实时翻译：默认 `qwen-plus`

## 目录

```text
aliyun-asr-demo-kit
├─ backend
│  ├─ application-demo.yaml
│  ├─ pom-dependencies.xml
│  └─ src/main/java/com/example/aliyunasrdemo
├─ frontend
│  └─ src
├─ gateway
│  └─ gateway-route-example.yaml
└─ sql
   └─ menu-example.sql
```

## 后端接入

1. 复制 `backend/src/main/java/com/example/aliyunasrdemo` 到目标后端项目。
2. 把 `backend/pom-dependencies.xml` 中的依赖合并到目标项目 `pom.xml`。
3. 把 `backend/application-demo.yaml` 中的 `aliyun-asr-demo` 配置合并到目标配置。
4. 配置 `api-key`，推荐使用环境变量：

```bash
DASHSCOPE_API_KEY=<your-dashscope-api-key>
```

5. 确保上传音频文件生成的 URL 能被阿里云公网访问。

默认的 `LocalPublicAliyunAsrFileAccessService` 会把文件保存到 `./data/aliyun-asr-demo`，并通过 `AliyunAsrStaticResourceConfig` 映射成 `/static/aliyun-asr-demo/文件名`。这只是本地 Demo 实现；生产建议替换为 OSS/S3 预签名 URL 实现。

## 前端接入

1. 复制 `frontend/src/api/aliyunAsrDemo.ts` 到目标前端项目 API 目录。
2. 复制 `frontend/src/views/AliyunAsrDemo.vue` 到目标前端页面目录。
3. 按目标项目路由规则挂载页面。
4. 确认页面访问地址满足浏览器麦克风要求：`https` 或 `localhost`。

## 接口

上传文件识别：

```http
POST /aliyun-asr-demo/recognize
Content-Type: multipart/form-data

file=音频文件
fileModel=paraformer-v2
sourceLanguage=zh
```

实时识别 WebSocket：

```text
ws://host/aliyun-asr-demo/realtime?model=fun-asr-realtime&sampleRate=16000&format=pcm&sourceLanguage=zh&translationEnabled=true&targetLanguage=en&translationModel=qwen-plus
```

客户端发送：

- 二进制 PCM 16bit 音频帧
- 文本 `stop` 表示结束

服务端返回 JSON 事件：

```json
{
  "type": "sentence_end",
  "text": "识别文本",
  "sentenceEnd": true,
  "time": 1780000000000
}
```

事件类型：

- `open`
- `listening`
- `partial`
- `sentence_end`
- `translation`
- `translation_error`
- `complete`
- `error`

## 常见问题

`401` 或鉴权失败：检查 `aliyun-asr-demo.api-key` 或 `DASHSCOPE_API_KEY`。

上传识别文本为空：确认音频文件有有效语音、文件 URL 可以被公网访问、格式被模型支持。

实时识别 `EmptyAudio`：浏览器没有发送有效 PCM。可先用“模拟音频”验证服务端链路。

浏览器不弹麦克风权限：页面必须通过 `https` 或 `localhost` 访问，普通内网 IP 的 `http` 页面无法使用麦克风。

网关 WebSocket 握手返回 200：网关没有按 WebSocket 转发，参考 `gateway/gateway-route-example.yaml` 单独配置 `ws://` 路由。
