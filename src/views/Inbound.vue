<template>
  <div class="inbound-page">
    <h2 class="page-title">入库管理</h2>

    <!-- 顶部操作栏 -->
    <div class="top-actions">
      <el-button type="success" @click="openAdd">新增入库记录</el-button>
      <el-button @click="triggerImport">批量导入 Excel</el-button>
      <el-button @click="exportExcel">导出 Excel</el-button>
      <!-- 隐藏的文件上传输入 -->
      <input type="file" ref="fileInputRef" accept=".xlsx, .xls" style="display: none" @change="handleFileChange" />
    </div>

    <!-- 查询筛选区 -->
    <div class="section-box">
      <div class="section-title">查询筛选</div>
      <div class="filter-row">
        <div class="form-item"><label>耗材名称</label><el-input v-model="q.materialName" placeholder="请输入耗材名称" style="width: 100%" /></div>
        <div class="form-item"><label>日期起</label><el-date-picker v-model="q.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择开始日期" style="width: 100%" /></div>
        <div class="form-item"><label>经手人</label><el-input v-model="q.handler" placeholder="请输入经手人" style="width: 100%" /></div>
        <div class="form-item" style="flex: 1.5;">
          <label>常用查询方案</label>
          <el-select v-model="q.schemeName" placeholder="选择查询方案" clearable>
            <el-option v-for="s in schemes" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
        </div>
        <div class="filter-buttons">
          <el-button type="success" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button type="info" plain @click="applyScheme">调用方案</el-button>
          <el-button type="primary" plain @click="saveScheme">保存方案</el-button>
          <el-button type="warning" plain @click="deleteScheme">删除方案</el-button>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="section-box">
      <div class="section-title">历史记录</div>
      <el-table :data="rows" border size="small" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column prop="in_date" label="日期" width="100" align="center" />
        <el-table-column prop="material_name" label="耗材名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="130" />
        <el-table-column prop="manufacturer" label="生产厂家" width="130" />
        <el-table-column prop="batch_no" label="批号" width="110" />
        <el-table-column prop="expiry_date" label="有效期" width="110" />
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="handler" label="经手人" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <span>{{ row.status === 1 ? '正常' : '已作废' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewRow(row)">查看</el-button>
            <el-button link type="primary" @click="editRow(row)">修改</el-button>
            <el-button link type="danger" @click="voidRow(row)">作废</el-button>
            <el-button link type="info" @click="print(row)">打印</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部批量操作栏 -->
      <div class="bottom-actions">
        <el-button type="warning" @click="batchVoid" :disabled="!selectedRows.length">作废</el-button>
        <el-button @click="batchPrint" :disabled="!selectedRows.length">打印</el-button>
        <el-button @click="batchEdit" :disabled="selectedRows.length !== 1">修改</el-button>
        <el-button @click="batchView" :disabled="selectedRows.length !== 1">查看</el-button>
      </div>
    </div>

    <!-- 新增/修改 弹窗 -->
    <el-dialog v-model="dlg" :title="form.id ? '修改入库记录' : '新增入库记录'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="耗材">
          <el-select v-model="form.material_id" filterable placeholder="输入或选择耗材" style="width:100%">
            <el-option v-for="m in materials" :key="m.id" :label="`${m.name} ${m.spec || ''}`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="批号"><el-input v-model="form.batch_no" placeholder="扫码枪可在此输入" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="有效期"><el-date-picker v-model="form.expiry_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="数量"><el-input-number v-model="form.quantity" :min="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经手人"><el-input v-model="form.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="入库日期"><el-date-picker v-model="form.in_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const rows = ref([])
const materials = ref([])
const selectedRows = ref([])
const dlg = ref(false)
const fileInputRef = ref(null)

const q = reactive({ materialName: '', startDate: '', handler: '', schemeName: '' })
const form = reactive({})

// 查询方案（本地存储模拟）
const schemes = ref(JSON.parse(localStorage.getItem('inbound_schemes') || '[]'))

async function load() {
  const payload = {
    materialName: q.materialName,
    start: q.startDate,
    handler: q.handler
  }
  rows.value = await api.inbound.list(payload)
}

function reset() {
  q.materialName = ''; q.startDate = ''; q.handler = ''; q.schemeName = ''
  load()
}

// ----- 查询方案 -----
function saveScheme() {
  if (!q.schemeName) { ElMessage.warning('请先选择或输入方案名称'); return }
  const existing = schemes.value.find(s => s.name === q.schemeName)
  if (existing) {
    existing.materialName = q.materialName
    existing.startDate = q.startDate
    existing.handler = q.handler
  } else {
    schemes.value.push({ name: q.schemeName, materialName: q.materialName, startDate: q.startDate, handler: q.handler })
  }
  localStorage.setItem('inbound_schemes', JSON.stringify(schemes.value))
  ElMessage.success('方案已保存')
}

function applyScheme() {
  if (!q.schemeName) { ElMessage.warning('请选择方案'); return }
  const s = schemes.value.find(item => item.name === q.schemeName)
  if (!s) return
  q.materialName = s.materialName
  q.startDate = s.startDate
  q.handler = s.handler
  load()
}

function deleteScheme() {
  if (!q.schemeName) return
  schemes.value = schemes.value.filter(s => s.name !== q.schemeName)
  localStorage.setItem('inbound_schemes', JSON.stringify(schemes.value))
  q.schemeName = ''
  ElMessage.success('方案已删除')
}

// ----- 表格操作 -----
function handleSelectionChange(val) { selectedRows.value = val }

async function openAdd() {
  materials.value = await api.material.list({})
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, { in_date: dayjs().format('YYYY-MM-DD'), quantity: 1 })
  dlg.value = true
}

function editRow(row) {
  Object.assign(form, row)
  dlg.value = true
}

function viewRow(row) {
  ElMessageBox.alert(
    `<p>耗材名称：${row.material_name}</p><p>批号：${row.batch_no}</p><p>数量：${row.quantity}</p><p>经手人：${row.handler}</p>`,
    '入库详情',
    { dangerouslyUseHTMLString: true }
  )
}

async function save() {
  if (!form.material_id || !form.batch_no || !form.quantity) { ElMessage.warning('请填写完整信息'); return }
  const op = store.user
  const res = await api.inbound.save({ ...form, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success(form.id ? '修改成功' : '入库成功')
  dlg.value = false
  load()
}

async function voidRow(row) {
  await ElMessageBox.confirm(`确定作废批号【${row.batch_no}】的入库吗？`, '提示', { type: 'warning' })
  const op = store.user
  await api.inbound.void({ id: row.id, _op: op.username, _opName: op.name })
  ElMessage.success('已作废')
  load()
}

async function batchVoid() {
  if (!selectedRows.value.length) return
  await ElMessageBox.confirm(`确定批量作废选中的 ${selectedRows.value.length} 条记录吗？`, '提示', { type: 'warning' })
  const op = store.user
  for (const row of selectedRows.value) {
    if (row.status === 1) {
      await api.inbound.void({ id: row.id, _op: op.username, _opName: op.name })
    }
  }
  ElMessage.success('批量作废完成')
  load()
}

function batchEdit() {
  if (selectedRows.value.length === 1) editRow(selectedRows.value[0])
}
function batchView() {
  if (selectedRows.value.length === 1) viewRow(selectedRows.value[0])
}
function batchPrint() {
  if (!selectedRows.value.length) return
  selectedRows.value.forEach(r => print(r))
}

function print(row) {
  const w = window.open('', '_blank', 'width=600,height=700')
  w.document.write(`
    <h2>入库单</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse; width:100%">
      <tr><td>耗材名称</td><td>${row.material_name}</td></tr>
      <tr><td>规格型号</td><td>${row.spec || ''}</td></tr>
      <tr><td>批号</td><td>${row.batch_no}</td></tr>
      <tr><td>有效期</td><td>${row.expiry_date}</td></tr>
      <tr><td>数量</td><td>${row.quantity}</td></tr>
      <tr><td>经手人</td><td>${row.handler}</td></tr>
      <tr><td>入库日期</td><td>${row.in_date}</td></tr>
    </table>
  `)
  w.print()
}

// ----- Excel 导入导出 -----
function triggerImport() { fileInputRef.value.click() }

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    const data = new Uint8Array(evt.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(firstSheet)
    
    // 假设模板列名：耗材名称、批号、有效期、数量、供应商、经手人
    // 实际项目中需匹配 material_id，此处为简单演示
    ElMessage.success(`成功读取 ${jsonData.length} 条数据，正在导入...`)
    // TODO: 实际导入逻辑需要匹配 id
    // 仅供展示
    console.log('解析后的数据:', jsonData)
    ElMessage.warning('请确保您的 Excel 包含「耗材名称」并已匹配到系统耗材 ID 后再执行导入。')
  }
  reader.readAsArrayBuffer(file)
  e.target.value = '' // 清空文件输入
}

async function exportExcel() {
  const data = rows.value.map(r => ({
    日期: r.in_date, 耗材名称: r.material_name, 分类: r.category,
    规格: r.spec, 厂家: r.manufacturer, 批号: r.batch_no, 有效期: r.expiry_date,
    数量: r.quantity, 单位: r.unit, 经手人: r.handler, 状态: r.status === 1 ? '正常' : '已作废'
  }))
  const res = await api.report.exportExcel({
    filename: `入库表_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '入库表', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出')
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.inbound-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.top-actions { margin-bottom: 12px; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 查询筛选行 */
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.form-item label { font-size: 12px; color: #555; }
.filter-buttons { display: flex; gap: 6px; align-items: flex-end; padding-bottom: 2px; }

/* 底部操作栏 */
.bottom-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
</style>
