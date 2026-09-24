<template>
  <div class="page-card">
    <div class="toolbar">
      <el-select v-model="q.materialName" filterable clearable placeholder="耗材名称" style="width:220px">
        <el-option v-for="m in materials" :key="m.id" :label="m.name" :value="m.name" />
      </el-select>
      <el-button type="success" @click="load">查询</el-button>
    </div>

    <el-table :data="rows" border height="300" size="small">
      <el-table-column prop="material_name" label="耗材名称" min-width="180" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="batch_no" label="批号" width="120" />
      <el-table-column prop="expiry_date" label="有效期" width="110" />
      <el-table-column prop="quantity" label="剩余数量" width="100" />
      <el-table-column prop="shelf_location" label="货架号" width="100" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openCheck(row)">盘点</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:16px">
      <div class="toolbar"><b>盘点差异记录</b></div>
      <el-table :data="checks" border height="220" size="small">
        <el-table-column prop="created_at" label="时间" width="180" />
        <el-table-column prop="material_name" label="耗材名称" min-width="160" />
        <el-table-column prop="batch_no" label="批号" width="110" />
        <el-table-column prop="book_qty" label="账面" width="80" />
        <el-table-column prop="actual_qty" label="实盘" width="80" />
        <el-table-column prop="diff" label="差异" width="80" />
        <el-table-column prop="handler" label="经手人" width="90" />
        <el-table-column prop="reason" label="原因" min-width="160" />
      </el-table>
    </div>

    <el-dialog v-model="dlg" title="库存盘点" width="440px">
      <el-form label-width="100px">
        <el-form-item label="耗材">{{ form.material_name }}</el-form-item>
        <el-form-item label="批号">{{ form.batch_no }}</el-form-item>
        <el-form-item label="账面数量">{{ form.book_qty }}</el-form-item>
        <el-form-item label="实盘数量">
          <el-input-number v-model="form.actual_qty" :min="0" />
        </el-form-item>
        <el-form-item label="经手人"><el-input v-model="form.handler" /></el-form-item>
        <el-form-item label="差异原因"><el-input v-model="form.reason" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save">保存修正</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const rows = ref([])
const checks = ref([])
const materials = ref([])
const q = reactive({ materialName: '' })
const dlg = ref(false)
const form = reactive({})

async function load() {
  rows.value = await api.stock.list({ ...q })
  checks.value = await api.check.list({})
}

function openCheck(row) {
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, {
    material_id: row.material_id, material_name: row.material_name,
    batch_no: row.batch_no, book_qty: row.quantity,
    actual_qty: row.quantity, handler: store.user?.name || '', reason: ''
  })
  dlg.value = true
}

async function save() {
  const op = store.user
  const res = await api.check.save({ ...form, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('已修正')
  dlg.value = false
  load()
}

onMounted(async () => {
  materials.value = await api.material.list({})
  load()
})
</script>
