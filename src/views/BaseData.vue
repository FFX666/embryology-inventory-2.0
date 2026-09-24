<template>
  <div class="page-card">
    <div class="toolbar">
      <el-input v-model="q.name" placeholder="耗材名称" style="width:200px" />
      <el-select v-model="q.category" placeholder="分类" clearable style="width:160px">
        <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
      </el-select>
      <el-button type="success" @click="load">查询</el-button>
      <el-button type="primary" @click="openEdit()">新增</el-button>
    </div>

    <el-table :data="rows" border height="480" size="small">
      <el-table-column prop="name" label="耗材名称" min-width="200" />
      <el-table-column prop="spec" label="规格型号" width="140" />
      <el-table-column prop="manufacturer" label="生产厂家" width="140" />
      <el-table-column prop="brand" label="品牌" width="100" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="storage_condition" label="储存条件" width="100" />
      <el-table-column prop="shelf_location" label="货架号" width="100" />
      <el-table-column prop="warn_threshold" label="预警数量" width="90" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">修改</el-button>
          <el-button link type="danger" @click="remove(row)">作废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" :title="form.id ? '修改耗材' : '新增耗材'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="10">
          <el-col :span="12"><el-form-item label="耗材名称"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="规格型号"><el-input v-model="form.spec" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="生产厂家"><el-input v-model="form.manufacturer" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="品牌"><el-input v-model="form.brand" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="分类">
            <el-select v-model="form.category" style="width:100%">
              <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="储存条件">
            <el-select v-model="form.storage_condition" style="width:100%">
              <el-option v-for="c in storages" :key="c.label" :label="c.label" :value="c.label" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="货架位置"><el-input v-model="form.shelf_location" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="采购单价"><el-input-number v-model="form.price" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="预警数量"><el-input-number v-model="form.warn_threshold" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item></el-col>
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
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const rows = ref([])
const categories = ref([])
const storages = ref([])
const q = reactive({ name: '', category: '' })
const dlg = ref(false)
const form = reactive({})

async function load() {
  rows.value = await api.material.list({ ...q })
  categories.value = await api.dict.list({ type: 'category' })
  storages.value = await api.dict.list({ type: 'storage' })
}

function openEdit(row) {
  Object.keys(form).forEach(k => delete form[k])
  Object.assign(form, row || { warn_threshold: 1, price: 0 })
  dlg.value = true
}

async function save() {
  if (!form.name) { ElMessage.warning('请输入耗材名称'); return }
  const op = store.user
  await api.material.save({ ...form, _op: op.username, _opName: op.name })
  ElMessage.success('保存成功')
  dlg.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定作废【${row.name}】吗？`, '提示', { type: 'warning' })
  const op = store.user
  await api.material.remove({ id: row.id, name: row.name, _op: op.username, _opName: op.name })
  ElMessage.success('已作废')
  load()
}

onMounted(load)
</script>
