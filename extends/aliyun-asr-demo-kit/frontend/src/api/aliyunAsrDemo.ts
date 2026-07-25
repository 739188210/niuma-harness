import axios from 'axios'

export interface AliyunAsrDemoResp {
  fileName?: string
  fileModel?: string
  sourceLanguage?: string
  transcriptionText?: string
  fileUrl?: string
  taskId?: string
  durationMs?: number
}

export interface AliyunAsrDemoRecognizeReq {
  file: File
  fileModel?: string
  sourceLanguage?: string
}

export const recognizeAudioFile = async (
  params: AliyunAsrDemoRecognizeReq
): Promise<AliyunAsrDemoResp> => {
  const data = new FormData()
  data.append('file', params.file)
  appendIfPresent(data, 'fileModel', params.fileModel)
  appendIfPresent(data, 'sourceLanguage', params.sourceLanguage)

  const response = await axios.post('/aliyun-asr-demo/recognize', data, {
    timeout: 300000,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data?.data ?? response.data
}

const appendIfPresent = (data: FormData, key: string, value?: string | number | boolean) => {
  if (value === undefined || value === null || value === '') {
    return
  }
  data.append(key, String(value))
}
