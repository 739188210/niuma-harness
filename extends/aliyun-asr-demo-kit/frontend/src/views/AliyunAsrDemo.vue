<template>
  <div class="aliyun-asr-demo">
    <section class="panel toolbar">
      <div>
        <h2>阿里云语音识别 Demo</h2>
        <p>上传音频使用 paraformer-v2，麦克风实时使用 fun-asr-realtime</p>
      </div>
      <el-segmented v-model="mode" :options="modeOptions" />
    </section>

    <div v-if="mode === 'file'" class="demo-grid">
      <section class="panel">
        <el-form label-width="96px">
          <el-form-item label="音频文件">
            <el-upload
              drag
              action="#"
              :auto-upload="false"
              :limit="1"
              :accept="acceptTypes"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              :on-exceed="handleFileExceed"
            >
              <div class="upload-placeholder">拖入文件或点击选择</div>
            </el-upload>
          </el-form-item>
          <el-form-item label="文件模型">
            <el-input v-model="fileForm.fileModel" clearable />
          </el-form-item>
          <el-form-item label="源语言">
            <el-select v-model="fileForm.sourceLanguage" class="full-width">
              <el-option label="中文" value="zh" />
              <el-option label="英文" value="en" />
              <el-option label="日文" value="ja" />
              <el-option label="韩文" value="ko" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <div class="actions">
              <el-button type="primary" :loading="loading" @click="handleRecognize">识别</el-button>
              <el-button :disabled="loading" @click="resetFileResult">清空</el-button>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="panel">
        <div v-if="result" class="result-header">
          <div>
            <h3>{{ result.fileName || selectedFile?.name || '-' }}</h3>
            <p>{{ result.fileModel || '-' }}</p>
          </div>
          <el-tag type="success" effect="plain">{{ result.durationMs || 0 }} ms</el-tag>
        </div>
        <el-empty v-if="!result" description="暂无识别结果" />
        <el-tabs v-else v-model="fileActiveTab">
          <el-tab-pane label="识别文本" name="text">
            <el-input :model-value="result.transcriptionText || ''" type="textarea" readonly :autosize="{ minRows: 10, maxRows: 18 }" />
          </el-tab-pane>
          <el-tab-pane label="调用信息" name="meta">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="源语言">{{ result.sourceLanguage || '-' }}</el-descriptions-item>
              <el-descriptions-item label="任务编号">{{ result.taskId || '-' }}</el-descriptions-item>
              <el-descriptions-item label="文件地址">{{ result.fileUrl || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>

    <div v-else class="demo-grid">
      <section class="panel">
        <el-form label-width="96px">
          <el-form-item label="实时模型">
            <el-input v-model="streamForm.realtimeModel" clearable />
          </el-form-item>
          <el-form-item label="采样率">
            <el-input-number v-model="streamForm.sampleRate" :min="8000" :max="48000" :step="1000" class="full-width" />
          </el-form-item>
          <el-form-item label="音频格式">
            <el-input v-model="streamForm.format" clearable />
          </el-form-item>
          <el-form-item label="源语言">
            <el-select v-model="streamForm.sourceLanguage" class="full-width">
              <el-option label="中文" value="zh" />
              <el-option label="英文" value="en" />
              <el-option label="日文" value="ja" />
              <el-option label="韩文" value="ko" />
            </el-select>
          </el-form-item>
          <el-form-item label="实时翻译">
            <el-switch v-model="streamForm.translationEnabled" />
          </el-form-item>
          <el-form-item label="目标语言">
            <el-select v-model="streamForm.targetLanguage" class="full-width" :disabled="!streamForm.translationEnabled">
              <el-option label="英文" value="en" />
              <el-option label="中文" value="zh" />
              <el-option label="日文" value="ja" />
              <el-option label="韩文" value="ko" />
              <el-option label="法文" value="fr" />
              <el-option label="德文" value="de" />
              <el-option label="西班牙文" value="es" />
              <el-option label="俄文" value="ru" />
            </el-select>
          </el-form-item>
          <el-form-item label="翻译模型">
            <el-input v-model="streamForm.translationModel" :disabled="!streamForm.translationEnabled" clearable />
          </el-form-item>
          <el-form-item label="连接状态">
            <div class="status-line">
              <el-tag :type="streaming ? 'success' : 'info'" effect="plain">{{ streaming ? '识别中' : '未开始' }}</el-tag>
              <span>{{ streamStatusText }}</span>
            </div>
          </el-form-item>
          <el-form-item label="模拟音频">
            <el-upload
              action="#"
              :auto-upload="false"
              :limit="1"
              :accept="acceptTypes"
              :disabled="streaming"
              :on-change="handleSimulationFileChange"
              :on-remove="handleSimulationFileRemove"
              :on-exceed="handleSimulationFileExceed"
            >
              <el-button :disabled="streaming">选择</el-button>
              <template #tip>
                <div v-if="simulationFile" class="file-name">{{ simulationFile.name }}</div>
              </template>
            </el-upload>
          </el-form-item>
          <el-form-item>
            <div class="actions stream-actions">
              <el-button type="primary" :disabled="streaming" @click="startRealtime">识别</el-button>
              <el-button type="success" plain :disabled="streaming || !simulationFile" @click="startRealtimeSimulation">模拟</el-button>
              <el-button type="danger" plain :disabled="!streaming" @click="stopRealtime">停止</el-button>
              <el-button :disabled="streaming" @click="resetStreamResult">清空</el-button>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="panel">
        <div class="result-header">
          <div>
            <h3>实时结果</h3>
            <p>{{ streamForm.realtimeModel }} / {{ streamForm.sampleRate }}Hz PCM</p>
          </div>
          <el-tag :type="streaming ? 'success' : 'info'" effect="plain">{{ streaming ? 'Aliyun ASR' : '等待开始' }}</el-tag>
        </div>
        <el-tabs v-model="streamActiveTab">
          <el-tab-pane label="识别文本" name="text">
            <el-input :model-value="streamDisplayText" type="textarea" readonly :autosize="{ minRows: 10, maxRows: 18 }" />
          </el-tab-pane>
          <el-tab-pane label="译文" name="translation">
            <el-input :model-value="streamTranslationText" type="textarea" readonly :autosize="{ minRows: 10, maxRows: 18 }" />
          </el-tab-pane>
          <el-tab-pane label="事件" name="events">
            <el-table :data="streamEvents" border>
              <el-table-column label="时间" prop="time" width="150" />
              <el-table-column label="类型" prop="type" width="150" />
              <el-table-column label="内容" prop="text" min-width="260" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import { ElMessage, type UploadProps } from 'element-plus'
import * as AliyunAsrDemoApi from '../api/aliyunAsrDemo'

type StreamEvent = { time: string; type: string; text: string }
type AliyunRealtimeEvent = {
  type?: string
  text?: string
  sentenceEnd?: boolean
}

const mode = ref<'file' | 'stream'>('file')
const modeOptions = [
  { label: '上传文件', value: 'file' },
  { label: '麦克风实时', value: 'stream' }
]
const acceptTypes = '.wav,.mp3,.m4a,.aac,.opus,.flac,.webm,.mp4,.mpeg,.mpga'

const loading = ref(false)
const selectedFile = ref<File>()
const fileActiveTab = ref('text')
const result = ref<AliyunAsrDemoApi.AliyunAsrDemoResp>()
const fileForm = reactive({ fileModel: 'paraformer-v2', sourceLanguage: 'zh' })

const handleFileChange: UploadProps['onChange'] = (uploadFile) => {
  selectedFile.value = uploadFile.raw
}
const handleFileRemove: UploadProps['onRemove'] = () => {
  selectedFile.value = undefined
}
const handleFileExceed: UploadProps['onExceed'] = () => {
  ElMessage.warning('一次只支持上传一个音频文件')
}
const handleRecognize = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择音频文件')
    return
  }
  loading.value = true
  try {
    result.value = await AliyunAsrDemoApi.recognizeAudioFile({
      file: selectedFile.value,
      fileModel: fileForm.fileModel,
      sourceLanguage: fileForm.sourceLanguage
    })
    fileActiveTab.value = 'text'
  } finally {
    loading.value = false
  }
}
const resetFileResult = () => {
  result.value = undefined
}

const streamForm = reactive({
  realtimeModel: 'fun-asr-realtime',
  sampleRate: 16000,
  format: 'pcm',
  sourceLanguage: 'zh',
  translationEnabled: true,
  targetLanguage: 'en',
  translationModel: 'qwen-plus'
})
const streamActiveTab = ref('text')
const streaming = ref(false)
const streamStatusText = ref('等待开始')
const streamFinalText = ref('')
const streamPartialText = ref('')
const streamTranslationText = ref('')
const streamEvents = ref<StreamEvent[]>([])
const simulationFile = ref<File>()
const streamDisplayText = computed(() => [streamFinalText.value, streamPartialText.value].filter(Boolean).join('\n'))

const wsRef = shallowRef<WebSocket>()
const audioContextRef = shallowRef<AudioContext>()
const mediaStreamRef = shallowRef<MediaStream>()
const processorRef = shallowRef<ScriptProcessorNode>()
const sourceRef = shallowRef<MediaStreamAudioSourceNode>()
let stopCloseTimer: ReturnType<typeof window.setTimeout> | undefined
let simulationSendTimer: ReturnType<typeof window.setTimeout> | undefined
let realtimeRunId = 0

const handleSimulationFileChange: UploadProps['onChange'] = (uploadFile) => {
  simulationFile.value = uploadFile.raw
}
const handleSimulationFileRemove: UploadProps['onRemove'] = () => {
  simulationFile.value = undefined
}
const handleSimulationFileExceed: UploadProps['onExceed'] = () => {
  ElMessage.warning('一次只支持选择一个模拟音频')
}

const startRealtime = async () => {
  const runId = nextRealtimeRunId()
  clearStopCloseTimer()
  resetStreamResult()
  streaming.value = true
  streamStatusText.value = '正在请求麦克风权限'
  let pendingMediaStream: MediaStream | undefined
  try {
    pendingMediaStream = await requestMicrophoneStream()
    if (!isCurrentRealtimeRun(runId)) {
      stopMediaStream(pendingMediaStream)
      return
    }
    streamStatusText.value = '麦克风已授权，正在连接阿里云实时识别'
    const ws = new WebSocket(buildRealtimeWsUrl())
    ws.binaryType = 'arraybuffer'
    wsRef.value = ws
    ws.onopen = async () => {
      try {
        await startMicrophone(ws, pendingMediaStream!)
        pendingMediaStream = undefined
        streamStatusText.value = '已连接，正在监听麦克风'
      } catch (error) {
        streamStatusText.value = '麦克风启动失败'
        ElMessage.error(parseMicrophoneError(error))
        stopMediaStream(pendingMediaStream)
        pendingMediaStream = undefined
        ws.close()
      }
    }
    ws.onmessage = (event) => handleRealtimeEvent(JSON.parse(event.data))
    ws.onerror = () => {
      stopMediaStream(pendingMediaStream)
      pendingMediaStream = undefined
      streamStatusText.value = '实时识别连接异常'
      ElMessage.error('阿里云实时识别连接异常')
    }
    ws.onclose = () => closeRealtimeLocally(pendingMediaStream)
  } catch (error) {
    stopRealtime()
    streamStatusText.value = '启动失败'
    ElMessage.error(parseMicrophoneError(error))
  }
}

const startRealtimeSimulation = async () => {
  if (!simulationFile.value) {
    ElMessage.warning('请先选择模拟音频')
    return
  }
  const runId = nextRealtimeRunId()
  clearStopCloseTimer()
  stopSimulationPlayback()
  resetStreamResult()
  streaming.value = true
  streamStatusText.value = '正在解析模拟音频'
  try {
    const pcmBuffer = await decodeSimulationAudio(simulationFile.value)
    if (!isCurrentRealtimeRun(runId)) return
    streamStatusText.value = '模拟音频已解析，正在连接阿里云实时识别'
    const ws = new WebSocket(buildRealtimeWsUrl())
    ws.binaryType = 'arraybuffer'
    wsRef.value = ws
    ws.onopen = () => {
      streamStatusText.value = '正在发送模拟音频'
      sendPcmBufferAsRealtime(ws, pcmBuffer)
    }
    ws.onmessage = (event) => handleRealtimeEvent(JSON.parse(event.data))
    ws.onerror = () => {
      stopSimulationPlayback()
      streamStatusText.value = '实时识别连接异常'
      ElMessage.error('阿里云实时识别连接异常')
    }
    ws.onclose = () => closeRealtimeLocally()
  } catch (error) {
    stopRealtime()
    streamStatusText.value = '模拟启动失败'
    ElMessage.error(error instanceof Error ? error.message : '模拟音频启动失败')
  }
}

const stopRealtime = () => {
  nextRealtimeRunId()
  stopSimulationPlayback()
  if (wsRef.value?.readyState === WebSocket.OPEN) {
    wsRef.value.send('stop')
    streamStatusText.value = '正在停止'
    stopCloseTimer = window.setTimeout(() => wsRef.value?.close(), 1500)
  } else {
    wsRef.value?.close()
  }
  stopLocalAudio()
  streaming.value = false
}

const resetStreamResult = () => {
  streamFinalText.value = ''
  streamPartialText.value = ''
  streamTranslationText.value = ''
  streamEvents.value = []
  streamActiveTab.value = 'text'
}

const buildRealtimeWsUrl = () => {
  const url = `${window.location.origin}/aliyun-asr-demo/realtime`
  const wsUrl = url.replace(/^http/i, 'ws')
  const params = new URLSearchParams({
    model: streamForm.realtimeModel,
    sampleRate: String(streamForm.sampleRate),
    format: streamForm.format,
    sourceLanguage: streamForm.sourceLanguage,
    translationEnabled: String(streamForm.translationEnabled),
    targetLanguage: streamForm.targetLanguage,
    translationModel: streamForm.translationModel
  })
  return `${wsUrl}?${params.toString()}`
}

const requestMicrophoneStream = async () => {
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    throw new Error('浏览器只允许 HTTPS 或 localhost 页面使用麦克风，请改用 localhost 访问或配置 HTTPS')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持麦克风采集，请使用新版 Chrome 或 Edge')
  }
  return await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  })
}

const startMicrophone = async (ws: WebSocket, mediaStream: MediaStream) => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  const audioContext = new AudioContextClass()
  if (audioContext.state === 'suspended') await audioContext.resume()
  const source = audioContext.createMediaStreamSource(mediaStream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)
  processor.onaudioprocess = (event) => {
    if (ws.readyState !== WebSocket.OPEN) return
    const pcm = toPcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate, streamForm.sampleRate)
    if (pcm.byteLength > 0) ws.send(pcm)
  }
  source.connect(processor)
  processor.connect(audioContext.destination)
  audioContextRef.value = audioContext
  mediaStreamRef.value = mediaStream
  processorRef.value = processor
  sourceRef.value = source
}

const parseMicrophoneError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return '麦克风权限被拒绝，请在浏览器地址栏左侧打开麦克风权限'
  if (name === 'NotFoundError') return '未检测到可用麦克风，请检查输入设备'
  if (name === 'NotReadableError') return '麦克风被其他程序占用，请关闭占用程序后重试'
  return error instanceof Error ? error.message : '无法启动麦克风，请检查浏览器权限和访问地址'
}

const stopMediaStream = (mediaStream?: MediaStream) => {
  mediaStream?.getTracks().forEach((track) => track.stop())
}

const stopLocalAudio = () => {
  processorRef.value?.disconnect()
  sourceRef.value?.disconnect()
  stopMediaStream(mediaStreamRef.value)
  audioContextRef.value?.close()
  processorRef.value = undefined
  sourceRef.value = undefined
  mediaStreamRef.value = undefined
  audioContextRef.value = undefined
}

const closeRealtimeLocally = (pendingMediaStream?: MediaStream) => {
  clearStopCloseTimer()
  stopMediaStream(pendingMediaStream)
  stopLocalAudio()
  stopSimulationPlayback()
  streaming.value = false
  streamStatusText.value = '连接已关闭'
  wsRef.value = undefined
}

const clearStopCloseTimer = () => {
  if (!stopCloseTimer) return
  window.clearTimeout(stopCloseTimer)
  stopCloseTimer = undefined
}
const nextRealtimeRunId = () => {
  realtimeRunId += 1
  return realtimeRunId
}
const isCurrentRealtimeRun = (runId: number) => runId === realtimeRunId
const stopSimulationPlayback = () => {
  if (!simulationSendTimer) return
  window.clearTimeout(simulationSendTimer)
  simulationSendTimer = undefined
}

const decodeSimulationAudio = async (file: File) => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) throw new Error('当前浏览器不支持音频解码，请使用新版 Chrome 或 Edge')
  const audioContext = new AudioContextClass()
  try {
    const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer())
    return toPcm16(mixAudioBufferToMono(audioBuffer), audioBuffer.sampleRate, streamForm.sampleRate)
  } finally {
    await audioContext.close()
  }
}

const mixAudioBufferToMono = (audioBuffer: AudioBuffer) => {
  const output = new Float32Array(audioBuffer.length)
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < audioBuffer.length; i += 1) output[i] += data[i] / audioBuffer.numberOfChannels
  }
  return output
}

const sendPcmBufferAsRealtime = (ws: WebSocket, pcmBuffer: ArrayBuffer) => {
  const bytesPerSample = 2
  const chunkBytes = Math.max((streamForm.sampleRate * bytesPerSample) / 10, 640)
  const alignedChunkBytes = Math.floor(chunkBytes / bytesPerSample) * bytesPerSample
  let offset = 0
  const sendNext = () => {
    if (ws.readyState !== WebSocket.OPEN) return
    if (offset >= pcmBuffer.byteLength) {
      streamStatusText.value = '模拟音频发送完成，等待识别结束'
      ws.send('stop')
      stopCloseTimer = window.setTimeout(() => ws.close(), 1500)
      return
    }
    const nextOffset = Math.min(offset + alignedChunkBytes, pcmBuffer.byteLength)
    ws.send(pcmBuffer.slice(offset, nextOffset))
    offset = nextOffset
    simulationSendTimer = window.setTimeout(sendNext, 100)
  }
  sendNext()
}

const handleRealtimeEvent = (event: AliyunRealtimeEvent) => {
  const type = String(event.type || '')
  const text = event.text || ''
  if (type === 'partial') streamPartialText.value = text
  else if (type === 'sentence_end') {
    appendFinalText(text)
    streamPartialText.value = ''
  } else if (type === 'translation') {
    appendTranslationText(text)
    streamActiveTab.value = 'translation'
  } else if (type === 'translation_error') ElMessage.error(text || '实时翻译失败')
  else if (type === 'error') {
    ElMessage.error(text || '阿里云实时识别返回异常')
    stopLocalAudio()
    streaming.value = false
    streamStatusText.value = text || '实时识别异常'
  } else if (type === 'listening') streamStatusText.value = text || '正在监听麦克风'
  else if (type === 'complete') streamStatusText.value = '识别已结束'
  pushStreamEvent(type, text)
}

const appendFinalText = (text: string) => {
  if (text) streamFinalText.value = [streamFinalText.value, text].filter(Boolean).join('\n')
}
const appendTranslationText = (text: string) => {
  if (text) streamTranslationText.value = [streamTranslationText.value, text].filter(Boolean).join('\n')
}
const pushStreamEvent = (type: string, text: string) => {
  streamEvents.value.unshift({ time: new Date().toLocaleTimeString(), type, text })
  if (streamEvents.value.length > 80) streamEvents.value.pop()
}

const toPcm16 = (input: Float32Array, sourceRate: number, targetRate: number) => {
  const resampled = resample(input, sourceRate, targetRate)
  const output = new Int16Array(resampled.length)
  for (let i = 0; i < resampled.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, resampled[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output.buffer
}

const resample = (input: Float32Array, sourceRate: number, targetRate: number) => {
  if (sourceRate === targetRate) return input
  const ratio = sourceRate / targetRate
  const length = Math.round(input.length / ratio)
  const output = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const index = i * ratio
    const before = Math.floor(index)
    const after = Math.min(before + 1, input.length - 1)
    const weight = index - before
    output[i] = input[before] + (input[after] - input[before]) * weight
  }
  return output
}

onBeforeUnmount(() => stopRealtime())
</script>

<style scoped>
.aliyun-asr-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f5f7fb;
}

.panel {
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.toolbar,
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

h2,
h3,
p {
  margin: 0;
}

.toolbar p,
.result-header p,
.status-line,
.file-name {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.demo-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.full-width {
  width: 100%;
}

.upload-placeholder {
  padding: 28px 0;
  color: #6b7280;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.stream-actions {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.actions :deep(.el-button) {
  width: 100%;
  margin-left: 0;
}

.status-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 0;
}

@media (max-width: 960px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .result-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .stream-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
