<template>
  <div class="report-page">
    <h2 class="page-title">报表导出</h2>

    <!-- 区域一：Excel 导出 -->
    <div class="section-box">
      <div class="section-title">Excel 导出</div>
      
      <div class="button-grid">
        <el-button type="success" @click="exportSpecific('base')">导出基础档案</el-button>
        <el-button type="success" @click="exportSpecific('inbound')">导出入库表</el-button>
        <el-button type="success" @click="exportSpecific('outbound')">导出出库表</el-button>
        <el-button type="success" @click="exportSpecific('stock')">导出库存总表</el-button>
        <el-button type="success" @click="exportSpecific('check')">导出盘点差异表</el-button>
        <el-button type="success" @click="exportSpecific('logs')">导出操作日志</el-button>
      </div>
      
      <div class="full-width-btn">
        <el-button type="success" class="full-btn" @click="exportAll">一键导出全部表格</el-button>
      </div>
    </div>

    <!-- 区域二：出库批号明细筛选 -->
    <div class="section-box">
      <div class="section-title">出库批号明细</div>
      <div class="filter-row">
        <div class="form-item">
          <label>出库日期起</label>
          <el-date-picker v-model="detailQuery.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>出库日期止</label>
          <el-date-picker v-model="detailQuery.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>耗材名称</label>
          <el-input v-model="detailQuery.materialName" placeholder="请输入耗材名称" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>分类</label>
          <el-select v-model="detailQuery.category" placeholder="全部分类" clearable style="width: 100%">
            <el-option label="全部分类" value="" />
            <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
          </el-select>
        </div>
        <div class="form-item">
          <label>批号</label>
          <el-input v-model="detailQuery.batchNo" placeholder="请输入批号" style="width: 100%" />
        </div>
        <div class="form-buttons">
          <el-button type="info" plain @click="loadOutboundDetail">查询批号</el-button>
          <el-button type="success" @click="exportOutboundDetail">导出出库批号明细</el-button>
        </div>
      </div>
    </div>

    <!-- 区域三：查询结果 -->
    <div class="section-box">
      <div class="section-title">查询结果</div>
      
      <el-tabs v-model="activeTab" class="custom-tabs">
        <el-tab-pane label="按批号汇总" name="summary">
          <el-table :data="tableData" border size="small" style="width: 100%" height="360">
            <el-table-column prop="material_code" label="耗材编码" width="110" align="center" />
            <el-table-column prop="material_name" label="耗材名称" min-width="160" />
            <el-table-column prop="spec" label="规格型号" width="110" align="center" />
            <el-table-column prop="manufacturer" label="生产厂家" width="110" align="center" />
            <el-table-column prop="batch_no" label="批号" width="110" align="center" />
            <el-table-column prop="system_batch_no" label="系统批次编号" width="120" align="center" />
            <el-table-column prop="in_date" label="入库日期" width="100" align="center" />
            <el-table-column prop="expiry_date" label="有效期" width="100" align="center" />
            <el-table-column prop="quantity" label="使用数量" width="90" align="center" />
            <el-table-column prop="unit" label="单位" width="70" align="center" />
            <el-table-column prop="shelf_location" label="货架号" width="90" align="center" />
            <el-table-column prop="usage_range" label="使用日期范围" width="160" align="center" />
            <el-table-column prop="category" label="分类" width="100" align="center" />
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="逐笔出库明细" name="detail">
          <el-table :data="tableData" border size="small" style="width: 100%" height="360">
            <el-table-column prop="out_date" label="出库日期" width="110" align="center" />
            <el-table-column prop="material_name" label="耗材名称" min-width="160" />
            <el-table-column prop="spec" label="规格型号" width="110" align="center" />
            <el-table-column prop="batch_no" label="批号" width="110" align="center" />
            <el-table-column prop="quantity" label="使用数量" width="90" align="center" />
            <el-table-column prop="unit" label="单位" width="70" align="center" />
            <el-table-column prop="handler" label="经手人" width="90" align="center" />
            <el-table-column prop="checker" label="核对人" width="90" align="center" />
            <el-table-column prop="remark" label="备注" min-width="150" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
      
      <div class="footer-tip">请设置条件后点击“查询批号”</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { api } from '@/api'

const activeTab = ref('summary')
const tableData = ref([])
const categories = ref([])

// 初始化默认日期为当月第一天和最后一天
const detailQuery = reactive({
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  materialName: '',
  category: '',
  batchNo: ''
})

// 通用导出函数
async function exportSpecific(type) {
  const stamp = dayjs().format('YYYYMMDD_HHmm')
  let sheets = []
  if (type === 'base') {
    sheets = [{ name: '基础档案', rows: await api.material.list({}) }]
  } else if (type === 'inbound') {
    sheets = [{ name: '入库表', rows: await api.inbound.list({}) }]
  } else if (type === 'outbound') {
    sheets = [{ name: '出库表', rows: await api.outbound.list({}) }]
  } else if (type === 'stock') {
    sheets = [{ name: '库存总表', rows: await api.stock.list({}) }]
  } else if (type === 'check') {
    sheets = [{ name: '盘点差异', rows: await api.check.list({}) }]
  } else if (type === 'logs') {
    sheets = [{ name: '操作日志', rows: await api.log.list({}) }]
  }
  const res = await api.report.exportExcel({ filename: `${type}_${stamp}.xlsx`, sheets })
  if (res.ok) ElMessage.success('已导出')
}

// 一键导出全部
async function exportAll() {
  const stamp = dayjs().format('YYYYMMDD_HHmm')
  const [mats, ins, outs, stk, chk, logs] = await Promise.all([
    api.material.list({}), api.inbound.list({}), api.outbound.list({}),
    api.stock.list({}), api.check.list({}), api.log.list({})
  ])
  const res = await api.report.exportExcel({
    filename: `全部表格_${stamp}.xlsx`,
    sheets: [
      { name: '基础档案', rows: mats },
      { name: '入库表', rows: ins },
      { name: '出库表', rows: outs },
      { name: '库存总表', rows: stk },
      { name: '盘点差异', rows: chk },
      { name: '操作日志', rows: logs }
    ]
  })
  if (res.ok) ElMessage.success('已导出全部表格')
}

// 查询出库批号明细
async function loadOutboundDetail() {
  // 后端查询逻辑（模拟真实调用，实际后端需有对应接口）
  const payload = {
    start: detailQuery.startDate,
    end: detailQuery.endDate,
    materialName: detailQuery.materialName,
    category: detailQuery.category,
    batchNo: detailQuery.batchNo
  }
  // 这里复用现有出库接口，实际可能需要单独接口支持分页和更多条件
  const rawList = await api.outbound.list(payload)
  
  // 前端简单映射为图片所要求的13列（按批号汇总视图）
  tableData.value = rawList.map(item => ({
    material_code: item.material_id,
    material_name: item.material_name,
    spec: item.spec,
    manufacturer: item.manufacturer,
    batch_no: item.batch_no,
    system_batch_no: `SYS-${item.batch_no}`,
    in_date: item.in_date || item.out_date, // 若无入库日期则暂用出库日期
    expiry_date: item.expiry_date,
    quantity: item.quantity,
    unit: item.unit,
    shelf_location: item.shelf_location,
    usage_range: `${item.out_date} 至 ${item.out_date}`,
    category: item.category,
    // 逐笔明细需要的字段
    out_date: item.out_date,
    handler: item.handler,
    checker: item.checker,
    remark: item.remark
  }))
  
  ElMessage.success(`已查询到 ${tableData.value.length} 条记录`)
}

// 导出出库批号明细
async function exportOutboundDetail() {
  if (!tableData.value.length) {
    ElMessage.warning('请先点击“查询批号”获取数据')
    return
  }
  const data = tableData.value.map(r => ({
    耗材编码: r.material_code, 耗材名称: r.material_name, 规格型号: r.spec,
    生产厂家: r.manufacturer, 批号: r.batch_no, 系统批次编号: r.system_batch_no,
    入库日期: r.in_date, 有效期: r.expiry_date, 使用数量: r.quantity,
    单位: r.unit, 货架号: r.shelf_location, 使用日期范围: r.usage_range, 分类: r.category
  }))
  const res = await api.report.exportExcel({
    filename: `出库批号明细_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '按批号汇总', rows: data }]
  })
  if (res.ok) ElMessage.success('出库批号明细已导出')
}

onMounted(async () => {
  categories.value = await api.dict.list({ type: 'category' })
})
</script>

<style scoped>
.report-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 顶部按钮矩阵 */
.button-grid { display: flex; gap: 10px; margin-bottom: 10px; }
.button-grid .el-button { flex: 1; }

/* 一键导出按钮 */
.full-width-btn { display: flex; }
.full-btn { width: 100%; background-color: #3e8f84; border-color: #3e8f84; }

/* 筛选行 */
.filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.form-item label { font-size: 12px; color: #555; white-space: nowrap; }
.form-buttons { display: flex; gap: 8px; align-items: flex-end; padding-bottom: 2px; }

/* 标签页样式修正 */
.custom-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.custom-tabs :deep(.el-tabs__item) { font-size: 13px; }

/* 底部提示 */
.footer-tip { font-size: 12px; color: #888; margin-top: 10px; }
</style>
