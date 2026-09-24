<template>
  <div class="outbound-page">
    <h2 class="page-title">出库领用</h2>

    <!-- 记录录入区 -->
    <div class="section-box">
      <div class="section-title">记录录入</div>
      <div class="entry-grid">
        <div class="form-item">
          <label>耗材名称</label>
          <el-select v-model="form.material_id" filterable placeholder="请选择耗材" style="width: 100%" @change="onMaterialChange">
            <el-option v-for="m in materials" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </div>
        <div class="form-item">
          <label>扫码/材料编号</label>
          <el-input v-model="form.code" placeholder="扫码或输入编号" />
        </div>
        <div class="form-item">
          <label>数量</label>
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </div>
        <div class="form-item inline-with-btn">
          <label>经手人</label>
          <div style="display:flex; gap:4px;">
            <el-select v-model="form.handler" placeholder="选择" filterable allow-create style="flex:1">
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.name" />
            </el-select>
            <el-button @click="quickAddUser('handler')">新增</el-button>
          </div>
        </div>
        <div class="form-item">
          <label>备注</label>
          <el-input v-model="form.remark" placeholder="请输入备注" />
        </div>
        <div class="form-item">
          <label>出库日期</label>
          <el-date-picker v-model="form.out_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </div>
        <div class="form-item inline-with-btn">
          <label>核对人</label>
          <div style="display:flex; gap:4px;">
            <el-select v-model="form.checker" placeholder="选择" filterable allow-create style="flex:1">
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.name" />
            </el-select>
            <el-button @click="quickAddUser('checker')">新增</el-button>
          </div>
        </div>
        <div class="form-item">
          <label>推荐/切换批号</label>
          <el-select v-model="form.batch_no" placeholder="选择批号" style="width: 100%">
            <el-option v-for="b in batches" :key="b.id" :label="`${b.batch_no} (效期${b.expiry_date}, 余${b.quantity})`" :value="b.batch_no" />
          </el-select>
        </div>
        <div class="form-item">
          <label>切换批号原因</label>
          <el-input v-model="form.reason" placeholder="如不切换可留空" />
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="success" @click="save">保存记录</el-button>
        <el-button @click="resetForm">清空</el-button>
        <el-button @click="triggerImport">批量导入 Excel</el-button>
        <el-button @click="exportExcel">导出 Excel</el-button>
        <input type="file" ref="fileInputRef" accept=".xlsx, .xls" style="display: none" @change="handleFileChange" />
      </div>
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
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="info" plain @click="applyScheme">调用方案</el-button>
          <el-button type="primary" plain @click="saveScheme">保存方案</el-button>
          <el-button type="warning" plain @click="deleteScheme">删除方案</el-button>
        </div>
      </div>
    </div>

    <!-- 历史记录区 -->
    <div class="section-box">
      <div class="section-title">历史记录</div>
      <el-table :data="rows" border size="small" style="width: 100%">
        <el-table-column prop="out_date" label="日期" width="100" align="center" />
        <el-table-column prop="material_name" label="耗材名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="130" />
        <el-table-column prop="manufacturer" label="生产厂家" width="130" />
        <el-table-column prop="batch_no" label="批号" width="110" />
        <el-table-column prop="expiry_date" label="有效期" width="110" />
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="handler" label="经手人" width="80" align="center" />
        <el-table-column prop="checker" label="核对人" width="80" align="center" />
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
    </div>
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
const batches = ref([])
const users = ref([])
const fileInputRef = ref(null)
const schemes = ref(JSON.parse(localStorage.getItem('outbound_schemes') || '[]'))

const initForm = () => ({
  material_id: null, code: '', quantity: 1, handler: '', remark: '',
  out_date: dayjs().format('YYYY-MM-DD'), checker: '', batch_no: '', reason: ''
})

const form = reactive(initForm())
const q = reactive({ materialName: '', startDate: '', handler: '', schemeName: '' })

async function load() {
  rows.value = await api.outbound.list({ ...q })
}

async function onMaterialChange() {
  form.batch_no = ''
  if (form.material_id) {
    // 后端根据耗材ID推荐最优先使用的批号（效期最近且库存充足）
    batches.value = await api.outbound.recommend({ material_id: form.material_id })
    if (batches.value.length > 0) {
      form.batch_no = batches.value[0].batch_no
    }
  }
}

function resetForm() {
  Object.assign(form, initForm())
  batches.value = []
}

function resetQuery() {
  q.materialName = ''; q.startDate = ''; q.handler = ''; q.schemeName = ''
  load()
}

async function save() {
  if (!form.material_id || !form.batch_no || !form.quantity) {
    ElMessage.warning('请填写耗材、批号和数量'); return
  }
  const op = store.user
  const res = await api.outbound.save({ ...form, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('出库记录已保存')
  resetForm()
  load()
}

function viewRow(row) {
  ElMessageBox.alert(
    `<p>耗材名称：${row.material_name}</p><p>批号：${row.batch_no}</p><p>数量：${row.quantity}</p><p>经手人：${row.handler}</p>`,
    '出库详情', { dangerouslyUseHTMLString: true }
  )
}

function editRow(row) {
  Object.assign(form, { ...row, material_id: row.material_id })
  if (row.material_id) onMaterialChange()
}

async function voidRow(row) {
  await ElMessageBox.confirm(`确定作废该出库记录吗？`, '提示', { type: 'warning' })
  const op = store.user
  // 实际项目中需要调用作废 API
  await api.outbound.save({ id: row.id, status: 0, _op: op.username, _opName: op.name })
  ElMessage.success('已作废')
  load()
}

function print(row) {
  const w = window.open('', '_blank', 'width=600,height=700')
  w.document.write(`
    <h2>出库单</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse; width:100%">
      <tr><td>耗材名称</td><td>${row.material_name}</td></tr>
      <tr><td>规格型号</td><td>${row.spec || ''}</td></tr>
      <tr><td>批号</td><td>${row.batch_no}</td></tr>
      <tr><td>数量</td><td>${row.quantity}</td></tr>
      <tr><td>经手人</td><td>${row.handler}</td></tr>
      <tr><td>核对人</td><td>${row.checker}</td></tr>
      <tr><td>出库日期</td><td>${row.out_date}</td></tr>
    </table>
  `)
  w.print()
}

// ----- 查询方案 -----
function saveScheme() {
  if (!q.schemeName) { ElMessage.warning('请填写方案名称'); return }
  const existing = schemes.value.find(s => s.name === q.schemeName)
  if (existing) {
    Object.assign(existing, { materialName: q.materialName, startDate: q.startDate, handler: q.handler })
  } else {
    schemes.value.push({ name: q.schemeName, materialName: q.materialName, startDate: q.startDate, handler: q.handler })
  }
  localStorage.setItem('outbound_schemes', JSON.stringify(schemes.value))
  ElMessage.success('方案已保存')
}

function applyScheme() {
  if (!q.schemeName) { ElMessage.warning('请先选择方案'); return }
  const s = schemes.value.find(s => s.name === q.schemeName)
  if (s) {
    Object.assign(q, { materialName: s.materialName, startDate: s.startDate, handler: s.handler })
    load()
  }
}

function deleteScheme() {
  if (!q.schemeName) return
  schemes.value = schemes.value.filter(s => s.name !== q.schemeName)
  localStorage.setItem('outbound_schemes', JSON.stringify(schemes.value))
  q.schemeName = ''
  ElMessage.success('方案已删除')
}

// ----- 导入导出 -----
function triggerImport() { fileInputRef.value.click() }
function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    ElMessage.success(`成功读取 ${jsonData.length} 条出库数据`)
    // 此处可补充业务逻辑处理
  }
  reader.readAsArrayBuffer(file)
  e.target.value = ''
}

async function exportExcel() {
  const data = rows.value.map(r => ({
    日期: r.out_date, 耗材名称: r.material_name, 分类: r.category, 规格: r.spec,
    厂家: r.manufacturer, 批号: r.batch_no, 数量: r.quantity, 单位: r.unit,
    经手人: r.handler, 核对人: r.checker, 状态: r.status === 1 ? '正常' : '已作废'
  }))
  const res = await api.report.exportExcel({
    filename: `出库表_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '出库表', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出')
}

function quickAddUser(field) {
  ElMessageBox.prompt(`请输入新的${field === 'handler' ? '经手人' : '核对人'}姓名`, '新增人员', { confirmButtonText: '确定' }).then(({ value }) => {
    if (value) {
      form[field] = value
      // 实际项目中如果需要保存到后端，可以调用 api.user.save
      ElMessage.success('已录入到当前记录中')
    }
  }).catch(() => {})
}

onMounted(async () => {
  materials.value = await api.material.list({})
  users.value = await api.user.list()
  load()
})
</script>

<style scoped>
.outbound-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 记录录入区 - 网格布局，完全还原图片紧凑感 */
.entry-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 15px; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.form-item label { font-size: 12px; color: #555; white-space: nowrap; }

/* 按钮行 */
.action-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

/* 查询筛选区 */
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.filter-buttons { display: flex; gap: 6px; align-items: flex-end; padding-bottom: 2px; }
</style>
