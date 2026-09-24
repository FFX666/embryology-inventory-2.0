<template>
  <div class="page-card">
    <div class="toolbar">
      <el-input v-model="q.keyword" placeholder="关键字" style="width:180px" />
      <el-input v-model="q.username" placeholder="账号" style="width:140px" />
      <el-select v-model="q.module" placeholder="模块" clearable style="width:160px">
        <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
      </el-select>
      <el-date-picker v-model="q.range" type="daterange" value-format="YYYY-MM-DD"
        start-placeholder="起始" end-placeholder="截止" style="width:240px" />
      <el-button type="success" @click="load">查询</el-button>
    </div>

    <el-table :data="rows" border height="560" size="small">
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column prop="username" label="账号" width="100" />
      <el-table-column prop="module" label="模块" width="120" />
      <el-table-column prop="action" label="操作" width="120" />
      <el-table-column prop="target" label="对象" width="180" />
      <el-table-column prop="detail" label="详情" min-width="200" />
    </el-table>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { api } from '@/api'

const modules = ['账号权限', '基础档案', '入库管理', '出库领用', '库存盘点', '备份恢复', '报表导出']
const rows = ref([])
const q = reactive({ keyword: '', username: '', module: '', range: null })

async function load() {
  const payload = { ...q }
  if (q.range) { payload.start = q.range[0]; payload.end = q.range[1] }
  rows.value = await api.log.list(payload)
}

onMounted(load)
</script>
