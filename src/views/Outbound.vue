<template>
  <div class="page-card">
    <div class="toolbar">
      <el-select v-model="form.material_id" filterable placeholder="选择耗材" style="width:260px"
                 @change="onMaterialChange">
        <el-option v-for="m in materials" :key="m.id"
          :label="`${m.name} ${m.spec || ''}`" :value="m.id" />
      </el-select>
      <el-select v-model="form.batch_no" placeholder="推荐批次" style="width:220px">
        <el-option v-for="b in batches" :key="b.id"
          :label="`${b.batch_no} | 效期${b.expiry_date} | 剩余${b.quantity}`"
          :value="b.batch_no" />
      </el-select>
      <el-input-number v-model="form.quantity" :min="1" placeholder="数量" style="width:120px" />
      <el-input v-model="form.handler" placeholder="经手人" style="width:120px" />
      <el-input v-model="form.checker" placeholder="核对人" style="width:120px" />
      <el-date-picker v-model="form.out_date" type="date" value-format="YYYY-MM-DD" style="width:150px" />
      <el-button type="success" @click="save">保存记录</el-button>
      <el-button @click="reset">清空</el-button>
      <el-button @click="exportExcel">导出 Excel</el-button>
    </div>

    <div class="toolbar">
      <el-input v-model="q.materialName" placeholder="耗材名称" style="width:180px" />
      <el-date-picker v-model="q.range" type="daterange" value-format="YYYY-MM-DD"
        start-placeholder="日期起" end-placeholder="日期止" style="width:260px" />
      <el-button type="success" @click="load">查询</el-button>
    </div>

    <el-table :data="rows" border height="440" size="small">
      <el-table-column prop="out_date" label="日期" width="110" />
      <el-table-column prop="material_name" label="耗材名称" min-width="180" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="spec" label="规格型号" width="120" />
      <el-table-column prop="manufacturer" label="生产厂家" width="120" />
      <el-table-column prop="batch_no" label="批号" width="110" />
      <el-table-column prop="quantity" label="数量" width="70" />
      <el-table-column prop="handler" label="经手人" width="90" />
      <el-table-column prop="checker" label="核对人" width="90" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="print(row)">打印</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const rows = ref([])
const materials = ref([])
const batches = ref([])
const form = reactive({
  material_id: null, batch_no: '', quantity: 1, handler: '',
  checker: '', out_date: dayjs().format('YYYY-MM-DD')
})
const q = reactive({ materialName: '', range: null })

async function load() {
  const payload = { ...q }
  if (q.range) { payload.start = q.range[0]; payload.end = q.range[1] }
  rows.value = await api.outbound.list(payload)
}

async function onMaterialChange() {
  form.batch_no = ''
  batches.value = await api.outbound.recommend({ material_id: form.material_id })
  if (batches.value.length) form.batch_no = batches.value[0].batch_no
}

async function save() {
  if (!form.material_id || !form.batch_no || !form.quantity) {
    ElMessage.warning('请填写完整'); return
  }
  const op = store.user
  const res = await api.outbound.save({ ...form, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('出库成功')
  onMaterialChange()
  load()
}

function reset() {
  form.material_id = null; form.batch_no=''; form.quantity=1
  form.handler=''; form.checker=''
  batches.value = []
}

function print(row) {
  const w = window.open('', '_blank', 'width=600,height=700')
  w.document.write(`
    <h2>出库单</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <tr><td>耗材名称</td><td>${row.material_name}</td></tr>
      <tr><td>规格型号</td><td>${row.spec || ''}</td></tr>
      <tr><td>批号</td><td>${row.batch_no}</td></tr>
      <tr><td>数量</td><td>${row.quantity}</td></tr>
      <tr><td>经手人</td><td>${row.handler || ''}</td></tr>
      <tr><td>核对人</td><td>${row.checker || ''}</td></tr>
      <tr><td>出库日期</td><td>${row.out_date}</td></tr>
    </table>
  `)
  w.print()
}

async function exportExcel() {
  const data = rows.value.map(r => ({
    日期: r.out_date, 耗材名称: r.material_name, 分类: r.category, 规格: r.spec,
    厂家: r.manufacturer, 批号: r.batch_no, 数量: r.quantity, 经手人: r.handler,
    核对人: r.checker
  }))
  const res = await api.report.exportExcel({
    filename: `出库表_${dayjs().format('YYYYMMDD')}.xlsx`,
    sheets: [{ name: '出库表', rows: data }]
  })
  if (res.ok) ElMessage.success('已导出')
}

onMounted(async () => {
  materials.value = await api.material.list({})
  load()
})
</script>
