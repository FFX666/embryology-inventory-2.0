// 统一暴露 window.api，并提供简单封装
export const api = window.api

export function ok(res, msg = '操作成功') {
  if (res && res.ok === false) {
    ElMessage.error(res.msg || '操作失败')
    return false
  }
  ElMessage.success(msg)
  return true
}

import { ElMessage } from 'element-plus'
