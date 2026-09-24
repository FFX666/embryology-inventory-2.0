<template>
  <div class="page-card">
    <h3>Excel 导出</h3>
    <div class="toolbar">
      <el-button @click="exp('materials')">导出基础档案</el-button>
      <el-button @click="exp('inbound')">导出入库表</el-button>
      <el-button @click="exp('outbound')">导出出库表</el-button>
      <el-button @click="exp('stock')">导出库存总表</el-button>
      <el-button @click="exp('check')">导出盘点差异表</el-button>
      <el-button @click="exp('logs')">导出操作日志</el-button>
      <el-button type="success" @click="exportAll">一键导出全部报表</el-button>
    </div>

    <h3 style="margin-top:24px">出库批号明细</h3>
    <div class="toolbar">
      <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD"
        start-placeholder="出库起始" end-placeholder="出库截止" style="width:260px" />
      <el-button type="success" @click="loadOutboundDetail">查询批号</el-button>
      <el-button @click="exportOutboundDetail">导出出库批号明细</el-button>
    </div>
    <el-table :data="outboundDetail" border height="360" size="small">
      <el-table-column prop="date" label="出库日期" width="110" />
      <el-table-column prop="material_name" label="耗材名称" min-width="180" />
      <el-table-column prop="spec" label="规格型号" width="130" />
      <el-table-column prop="manufacturer" label="生产厂家" width="130" />
      <el-table-column prop="batch_no" label="批号" width="120" />
      <el-table-column prop="quantity" label="使用数量" width="90" />
      <el-table-column prop="handler" label="经手人" width="90" />
      <el-table-column prop="checker" label="核对人" width="90" />
    </el-table>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const range = ref(null)
const outboundDetail = ref([])

async function exp(kind) {
  const stamp = dayjs().format('YYYYMMDD_HHmm')
  let sheets = []
  if (kind === 'materials') {
    const list = await api.material.list({})
    sheets = [{ name: '基础档案', rows: list }]
  } else if (kind === 'inbound') {
    sheets = [{ name: '入库表', rows: await api.inbound.list({}) }]
  } else if (kind === 'outbound') {
    sheets = [{ name: '出库表', rows: await api.outbound.list({}) }]
  } else if (kind === 'stock') {
    sheets = [{ name: '库存总表', rows: await api.stock.list({}) }]
  } else if (kind === 'check') {
    sheets = [{ name: '盘点差异', rows: await api.check.list({}) }]
  } else if (kind === 'logs') {
    sheets = [{ name: '操作日志', rows: await api.log.list({}) }]
  }
  const res = await api.report.exportExcel({
    filename: `${kind}_${stamp}.xlsx`, sheets
  })
  if (res.ok) ElMessage.success('已导出: ' + res.file)
}

async function exportAll() {
  const stamp = dayjs().format('YYYYMMDD_HHmm')
  const [mats, ins, outs, stk, chk, logs] = await Promise.all([
    api.material.list({}), api.inbound.list({}), api.outbound.list({}),
    api.stock.list({}), api.check.list({}), api.log.list({})
  ])
  const res = await api.report.exportExcel({
    filename: `全部报表_${stamp}.xlsx`,
    sheets: [
      { name: '基础档案', rows: mats },
      { name: '入库表', rows: ins },
      { name: '出库表', rows: outs },
      { name: '库存总表', rows: stk },
      { name: '盘点差异', rows: chk },
      { name: '操作日志', rows: logs }
    ]
  })
  if (res.ok) ElMessage.success('已导出: ' + res.file)
}

async function loadOutboundDetail() {
  if (!range.value) { ElMessage.warning('请选择日期范围'); return }
  outboundDetail.value = await api.outbound.list({
    start: range.value[0], end: range.value[1]
  })
}

async function exportOutboundDetail() {
  if (!outboundDetail.value.length) { ElMessage.warning('请先查询'); return }
  const data = outboundDetail.value.map(r => ({
    出库日期: r.out_date, 耗材名称: r.material_name, 规格型号: r.spec,
    生产厂家: r.manufacturer, 批号: r.batch_no, 使用数量: r.quantity,
    经手人: r.handler, 核对人: r.checker
  }))
  const res = await api.report.exportExcel({
    filename: `出库批号明细_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '按批号汇总', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出')
}
</script>
