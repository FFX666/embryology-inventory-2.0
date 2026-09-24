<template>
  <div class="page-card">
    <div class="toolbar">
      <el-input v-model="q.materialName" placeholder="耗材名称" style="width:180px" />
      <el-date-picker v-model="q.range" type="daterange" value-format="YYYY-MM-DD"
        start-placeholder="起始日期" end-placeholder="结束日期" style="width:260px" />
      <el-select v-model="q.category" placeholder="分类" clearable style="width:150px">
        <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
      </el-select>
      <el-button type="success" @click="load">查询</el-button>
      <el-button @click="exportExcel">导出 Excel</el-button>
    </div>

    <el-table :data="rows" border height="560" size="small">
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="date" label="日期" width="110" />
      <el-table-column prop="material_name" label="耗材名称" min-width="180" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="batch_no" label="批号" width="120" />
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="person" label="经手人" width="90" />
      <el-table-column prop="status" label="状态" width="80" />
      <el-table-column prop="remark" label="备注" min-width="150" />
    </el-table>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const rows = ref([])
const categories = ref([])
const q = reactive({ materialName: '', category: '', range: null })

async function load() {
  const payload = { ...q }
  if (q.range) { payload.start = q.range[0]; payload.end = q.range[1] }
  rows.value = await api.query.records(payload)
}

async function exportExcel() {
  const data = rows.value.map(r => ({
    类型: r.type, 日期: r.date, 耗材名称: r.material_name, 分类: r.category,
    批号: r.batch_no, 数量: r.quantity, 单位: r.unit, 经手人: r.person, 备注: r.remark
  }))
  const res = await api.report.exportExcel({
    filename: `查询记录_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '出入库明细', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出')
}

onMounted(async () => {
  categories.value = await api.dict.list({ type: 'category' })
  load()
})
</script>
