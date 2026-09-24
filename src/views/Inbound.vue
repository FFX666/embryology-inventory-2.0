<template>
  <div class="page-card">
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增入库记录</el-button>
      <el-button @click="exportExcel">导出 Excel</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="q.materialName" placeholder="耗材名称" style="width:180px" />
      <el-date-picker v-model="q.range" type="daterange" value-format="YYYY-MM-DD"
        start-placeholder="日期起" end-placeholder="日期止" style="width:260px" />
      <el-input v-model="q.handler" placeholder="经手人" style="width:140px" />
      <el-button type="success" @click="load">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <el-table :data="rows" border height="480" size="small">
      <el-table-column prop="in_date" label="日期" width="110" />
      <el-table-column prop="material_name" label="耗材名称" min-width="200" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="spec" label="规格型号" width="130" />
      <el-table-column prop="manufacturer" label="生产厂家" width="130" />
      <el-table-column prop="batch_no" label="批号" width="110" />
      <el-table-column prop="expiry_date" label="有效期" width="110" />
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="supplier" label="供应商" width="120" />
      <el-table-column prop="handler" label="经手人" width="90" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'">{{ row.status ? '正常' : '已作废' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status" link type="primary" @click="print(row)">打印</el-button>
          <el-button v-if="row.status" link type="danger" @click="voidRow(row)">作废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" title="新增入库记录" width="620px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="耗材">
          <el-select v-model="form.material_id" filterable placeholder="输入或选择耗材" style="width:100%">
            <el-option v-for="m in materials" :key="m.id"
              :label="`${m.name} ${m.spec || ''}`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="批号"><el-input v-model="form.batch_no" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="有效期">
            <el-date-picker v-model="form.expiry_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="数量"><el-input-number v-model="form.quantity" :min="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经手人"><el-input v-model="form.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="入库日期">
            <el-date-picker v-model="form.in_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item></el-col>
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
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const rows = ref([])
const materials = ref([])
const q = reactive({ materialName: '', handler: '', range: null })
const dlg = ref(false)
const form = reactive({})

async function load() {
  const payload = { ...q }
  if (q.range) { payload.start = q.range[0]; payload.end = q.range[1] }
  rows.value = await api.inbound.list(payload)
}

function reset() { q.materialName=''; q.handler=''; q.range=null; load() }

async function openAdd() {
  materials.value = await api.material.list({})
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, { in_date: dayjs().format('YYYY-MM-DD'), quantity: 1 })
  dlg.value = true
}

async function save() {
  if (!form.material_id || !form.batch_no || !form.quantity) {
    ElMessage.warning('请填写完整信息'); return
  }
  const op = store.user
  const res = await api.inbound.save({ ...form, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('入库成功')
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

function print(row) {
  const w = window.open('', '_blank', 'width=600,height=700')
  w.document.write(`
    <h2>入库单</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <tr><td>耗材名称</td><td>${row.material_name}</td></tr>
      <tr><td>规格型号</td><td>${row.spec || ''}</td></tr>
      <tr><td>生产厂家</td><td>${row.manufacturer || ''}</td></tr>
      <tr><td>批号</td><td>${row.batch_no}</td></tr>
      <tr><td>有效期</td><td>${row.expiry_date}</td></tr>
      <tr><td>数量</td><td>${row.quantity}</td></tr>
      <tr><td>供应商</td><td>${row.supplier || ''}</td></tr>
      <tr><td>经手人</td><td>${row.handler || ''}</td></tr>
      <tr><td>入库日期</td><td>${row.in_date}</td></tr>
    </table>
  `)
  w.print()
}

async function exportExcel() {
  const data = rows.value.map(r => ({
    日期: r.in_date, 耗材名称: r.material_name, 分类: r.category,
    规格: r.spec, 厂家: r.manufacturer, 批号: r.batch_no, 有效期: r.expiry_date,
    数量: r.quantity, 供应商: r.supplier, 经手人: r.handler
  }))
  const res = await api.report.exportExcel({
    filename: `入库表_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '入库表', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出: ' + res.file)
}

onMounted(load)
</script>
