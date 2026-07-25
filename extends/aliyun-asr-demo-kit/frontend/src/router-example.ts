import type { RouteRecordRaw } from 'vue-router'
import AliyunAsrDemo from './views/AliyunAsrDemo.vue'

export const aliyunAsrDemoRoute: RouteRecordRaw = {
  path: '/aliyun-asr-demo',
  name: 'AliyunAsrDemo',
  component: AliyunAsrDemo,
  meta: {
    title: '阿里云语音识别'
  }
}
