<template>
  <div class="stockcheck-page">
    <h2 class="page-title">库存盘点</h2>

    <!-- 顶部录入区 -->
    <div class="section-box">
      <div class="entry-grid-top">
        <div class="form-item">
          <label>盘点模式</label>
          <el-select v-model="form.mode" placeholder="选择模式" style="width: 100%">
            <el-option label="单项盘点" value="single" />
            <el-option label="按货架盘点" value="shelf" />
          </el-select>
        </div>
        <div class="form-item">
          <label>货架/冰箱分区</label>
          <el-select v-model="form.fridge" placeholder="选择分区" style="width: 100%">
            <el-option label="冰箱" value="冰箱" />
            <el-option label="耗材间" value="耗材间" />
          </el-select>
        </div>
        <div class="form-item-btn" style="flex: 1.5;">
          <el-button @click="triggerImport">导入 Excel 盘点表</el-button>
          <input type="file" ref="fileInputRef" accept=".xlsx, .xls" style="display: none" @change="handleFileChange" />
        </div>
      </div>

      <div class="entry-grid-bottom">
        <div class="form-item">
          <label>耗材名称</label>
          <el-select v-model="form.material_id" filterable placeholder="请选择耗材" style="width: 100%" @change="onMaterialChange">
            <el-option v-for="m in materials" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </div>
        <div class="form-item">
          <label>批次</label>
          <el-select v-model="form.batch_no" placeholder="新建批次/期初库存" style="width: 100%" @change="onBatchChange">
            <el-option v-for="b in batches" :key="b.id" :label="b.batch_no" :value="b.batch_no" />
          </el-select>
        </div>
        <div class="form-item">
          <label>实盘数量</label>
          <el-input-number v-model="form.actual_qty" :min="0" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>新建批号</label>
          <el-input v-model="form.new_batch_no" placeholder="不修改可留空" />
        </div>
        <div class="form-item">
          <label>新建有效期</label>
          <el-date-picker v-model="form.new_expiry_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </div>
        <div class="form-item inline-with-btn">
          <label>经手人</label>
          <div style="display:flex; gap:4px;">
            <el-select v-model="form.handler" placeholder="选择" filterable allow-create style="flex:1">
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.name" />
            </el-select>
            <el-button @click="quickAddUser">新增</el-button>
          </div>
        </div>
        <div class="form-item">
          <label>差异原因</label>
          <el-input v-model="form.reason" placeholder="请输入差异原因" />
        </div>
        <div class="form-item-btn">
          <el-button type="success" @click="saveCheck">保存盘点修正</el-button>
          <el-button @click="exportDiffExcel">导出差异表</el-button>
        </div>
      </div>
    </div>

    <!-- 实时库存总表 -->
    <div class="section-box">
      <div class="table-header">
        <el-switch v-model="onlyAbnormal" active-text="只看负库存/超额差异" inactive-text="显示全部" />
        <span class="abnormal-count">当前异常：{{ abnormalCount }} 条</span>
      </div>
      <el-table :data="filteredStocks" border size="small" style="width: 100%" :row-class-name="tableRowClassName">
        <el-table-column prop="material_name" label="耗材名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <el-table-column prop="batch_no" label="批号" width="120" align="center" />
        <el-table-column prop="expiry_date" label="有效期" width="120" align="center" />
        <el-table-column prop="quantity" label="剩余数量" width="100" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="shelf_location" label="货架号" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="isLow(row) ? 'warning' : 'success'">{{ isLow(row) ? '低库存' : '正常' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 盘点差异记录 -->
    <div class="section-box">
      <div class="section-title">盘点差异记录</div>
      <el-table :data="diffRecords" border size="small" style="width: 100%">
        <el-table-column prop="created_at" label="时间" width="180" align="center" />
        <el-table-column prop="material_name" label="耗材名称" min-width="150" />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <el-table-column prop="batch_no" label="批号" width="120" align="center" />
        <el-table-column prop="book_qty" label="账面" width="80" align="center" />
        <el-table-column prop="actual_qty" label="实盘" width="80" align="center" />
        <el-table-column prop="diff" label="差异" width="80" align="center" />
        <el-table-column prop="handler" label="经手人" width="100" align="center" />
        <el-table-column prop="reason" label="原因" min-width="150" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const users = ref([])
const materials = ref([])
const batches = ref([])
const stocks = ref([])
const diffRecords = ref([])
const fileInputRef = ref(null)

const form = reactive({
  mode: 'single', fridge: '冰箱', material_id: null, batch_no: '', 
  actual_qty: 0, new_batch_no: '', new_expiry_date: '', 
  handler: '', reason: ''
})

const onlyAbnormal = ref(false)

// 过滤数据：是否只看异常
const filteredStocks = computed(() => {
  if (onlyAbnormal.value) {
    return stocks.value.filter(s => isLow(s) || s.quantity < 0)
  }
  return stocks.value
})

// 统计异常数量（低库存或负库存）
const abnormalCount = computed(() => stocks.value.filter(s => isLow(s) || s.quantity < 0).length)

// 判断是否低库存
const isLow = (row) => row.warn_threshold != null && row.quantity > 0 && row.quantity <= row.warn_threshold

// 表格行样式（低库存标黄）
const tableRowClassName = ({ row }) => {
  if (isLow(row)) return 'warning-row'
  return ''
}

// 加载基础数据
async function load() {
  stocks.value = await api.stock.list({})
  diffRecords.value = await api.check.list({})
}

// 选择耗材后，加载对应批次
async function onMaterialChange() {
  form.batch_no = ''
  if (form.material_id) {
    batches.value = await api.outbound.recommend({ material_id: form.material_id })
    if (batches.value.length > 0) {
      form.batch_no = batches.value[0].batch_no
      onBatchChange()
    }
  }
}

// 选择批次后，自动填入当前账面数量
async function onBatchChange() {
  const b = batches.value.find(item => item.batch_no === form.batch_no)
  if (b) {
    form.actual_qty = b.quantity
  }
}

// 保存盘点修正
async function saveCheck() {
  if (!form.material_id || !form.batch_no) {
    ElMessage.warning('请选择耗材和批次')
    return
  }
  const op = store.user
  const res = await api.check.save({
    material_id: form.material_id,
    batch_no: form.batch_no,
    actual_qty: form.actual_qty,
    new_batch_no: form.new_batch_no,
    new_expiry_date: form.new_expiry_date,
    handler: form.handler || op.name,
    reason: form.reason,
    _op: op.username,
    _opName: op.name
  })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('盘点修正已保存')
  form.reason = ''
  form.new_batch_no = ''
  form.new_expiry_date = ''
  load()
}

// 导出差异表
async function exportDiffExcel() {
  const data = diffRecords.value.map(r => ({
    时间: r.created_at, 耗材名称: r.material_name, 分类: r.category,
    批号: r.batch_no, 账面: r.book_qty, 实盘: r.actual_qty,
    差异: r.diff, 经手人: r.handler, 原因: r.reason
  }))
  const res = await api.report.exportExcel({
    filename: `盘点差异表_${new Date().toISOString().slice(0,10)}.xlsx`,
    sheets: [{ name: '盘点差异记录', rows: data }]
  })
  if (res.ok) ElMessage.success('差异表已导出')
}

// 导入 Excel
function triggerImport() { fileInputRef.value.click() }
function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    ElMessage.success(`成功读取 ${jsonData.length} 条盘点数据`)
    // 实际业务中需匹配 material_id 和 batch_no
  }
  reader.readAsArrayBuffer(file)
  e.target.value = ''
}

function quickAddUser() {
  ElMessageBox.prompt('请输入经手人姓名', '新增人员', { confirmButtonText: '确定' }).then(({ value }) => {
    if (value) {
      form.handler = value
      ElMessage.success('已录入')
    }
  }).catch(() => {})
}

onMounted(async () => {
  users.value = await api.user.list()
  materials.value = await api.material.list({})
  load()
})
</script>

<style scoped>
.stockcheck-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 表单网格 */
.entry-grid-top { display: flex; gap: 12px; margin-bottom: 12px; }
.entry-grid-bottom { display: flex; flex-wrap: wrap; gap: 12px; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.form-item label { font-size: 12px; color: #555; white-space: nowrap; }
.form-item-btn { display: flex; align-items: flex-end; gap: 8px; padding-bottom: 2px; }

/* 表格头部区域 */
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.abnormal-count { font-size: 13px; color: #666; }

/* 自定义表格行高亮 */
:deep(.warning-row) {
  background-color: #fff8e1 !important;
}
</style>
