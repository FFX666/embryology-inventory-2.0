<template>
  <div class="base-page">
    <h2 class="page-title">基础档案</h2>

    <div class="section-box">
      <div class="section-title">耗材基础档案录入</div>
      
      <!-- 第一行输入 -->
      <div class="input-row">
        <div class="form-item"><label>条形码/材料编号</label><el-input v-model="form.code" placeholder="请输入" /></div>
        <div class="form-item"><label>耗材名称</label><el-input v-model="form.name" placeholder="请输入" /></div>
        <div class="form-item"><label>规格型号</label><el-input v-model="form.spec" placeholder="请输入" /></div>
        <div class="form-item"><label>生产厂家</label><el-input v-model="form.manufacturer" placeholder="请输入" /></div>
        <div class="form-item"><label>批号</label><el-input v-model="form.batch_no" placeholder="批号（仅录入展示）" /></div>
        <div class="form-item"><label>有效期</label>
          <el-date-picker v-model="form.expiry_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>分类</label>
          <el-select v-model="form.category" placeholder="请选择">
            <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
          </el-select>
        </div>
      </div>

      <!-- 第二行输入 -->
      <div class="input-row">
        <div class="form-item inline-with-btn">
          <label>储存条件</label>
          <div style="display:flex; gap:4px;">
            <el-select v-model="form.storage_condition" placeholder="请选择" style="flex:1">
              <el-option v-for="s in storages" :key="s.label" :label="s.label" :value="s.label" />
            </el-select>
            <el-button @click="quickAddDict('storage')">新增</el-button>
          </div>
        </div>
        <div class="form-item inline-with-btn">
          <label>单位</label>
          <div style="display:flex; gap:4px;">
            <el-select v-model="form.unit" placeholder="请选择" style="flex:1" filterable allow-create>
              <el-option label="瓶" value="瓶" />
              <el-option label="盒" value="盒" />
              <el-option label="支" value="支" />
              <el-option label="套" value="套" />
              <el-option label="包" value="包" />
              <el-option label="箱" value="箱" />
            </el-select>
            <el-button @click="quickAddUnit">新增</el-button>
          </div>
        </div>
        <div class="form-item"><label>采购单价</label><el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" /></div>
        <div class="form-item"><label>库存预警最低数量</label><el-input-number v-model="form.warn_threshold" :min="0" style="width: 100%" /></div>
        <div class="form-item"><label>存放货架编号</label><el-input v-model="form.shelf_location" placeholder="请输入" /></div>
        <div class="form-item"><label>备注</label><el-input v-model="form.remark" placeholder="请输入" /></div>
        <div class="form-item"><label>排序号</label><el-input-number v-model="form.sort_order" :min="0" style="width: 100%" /></div>
      </div>

      <!-- 操作按钮区 -->
      <div class="action-row">
        <el-checkbox v-model="form.status" style="margin-right: 15px;">* 启用</el-checkbox>
        <div class="action-buttons">
          <el-button type="success" @click="save">新增</el-button>
          <el-button type="primary" style="background-color:#3e8f84; border-color:#3e8f84;" @click="save">保存样品</el-button>
          <el-button @click="clearForm">清空</el-button>
          <el-button type="warning" @click="disableSelected" :disabled="!selectedRows.length">停用选中</el-button>
        </div>
      </div>
    </div>

    <!-- 档案列表 -->
    <div class="section-box">
      <div class="section-title">档案列表</div>
      <el-table :data="rows" border size="small" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column prop="name" label="耗材名称" min-width="180" />
        <el-table-column prop="spec" label="规格型号" width="130" />
        <el-table-column prop="manufacturer" label="生产厂家" width="130" />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="price" label="采购单价" width="90" align="center">
          <template #default="{ row }">{{ row.price ? row.price.toFixed(2) : '0.00' }}</template>
        </el-table-column>
        <el-table-column prop="warn_threshold" label="预警数量" width="90" align="center" />
        <el-table-column prop="shelf_location" label="货架号" width="90" align="center" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewRow(row)">查看</el-button>
            <el-button link type="primary" @click="editRow(row)">修改</el-button>
            <el-button link type="danger" @click="disableRow(row)">停用</el-button>
            <el-button link type="info" @click="printBarcode(row)">条码</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
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
const selectedRows = ref([])

const initForm = () => ({
  id: null, code: '', name: '', spec: '', manufacturer: '', brand: '',
  batch_no: '', expiry_date: '', // 仅用于UI展示，数据库无此字段
  category: '', unit: '', storage_condition: '', shelf_location: '',
  price: 0, warn_threshold: 1, remark: '', sort_order: 0, status: true
})

const form = reactive(initForm())

async function load() {
  // 加载表格数据
  rows.value = await api.material.list({})
  // 加载下拉字典
  categories.value = await api.dict.list({ type: 'category' })
  storages.value = await api.dict.list({ type: 'storage' })
}

function clearForm() {
  Object.assign(form, initForm())
}

async function save() {
  if (!form.name) { ElMessage.warning('请输入耗材名称'); return }
  const op = store.user
  // 注意：batch_no 和 expiry_date 不会传给后端，因为基础档案表不支持
  const payload = { ...form, _op: op.username, _opName: op.name }
  const res = await api.material.save(payload)
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('保存成功')
  clearForm()
  load()
}

function editRow(row) {
  Object.assign(form, { ...row, status: !!row.status, batch_no: '', expiry_date: '' })
}

function viewRow(row) {
  ElMessageBox.alert(
    `<p>耗材名称：${row.name}</p><p>规格：${row.spec}</p><p>厂家：${row.manufacturer}</p>`,
    '耗材详情',
    { dangerouslyUseHTMLString: true }
  )
}

async function disableRow(row) {
  await ElMessageBox.confirm(`确定停用【${row.name}】吗？`, '提示', { type: 'warning' })
  const op = store.user
  await api.material.remove({ id: row.id, name: row.name, _op: op.username, _opName: op.name })
  ElMessage.success('已停用')
  load()
}

function handleSelectionChange(val) { selectedRows.value = val }

async function disableSelected() {
  if (!selectedRows.value.length) return
  await ElMessageBox.confirm(`确定批量停用选中的 ${selectedRows.value.length} 项吗？`, '提示', { type: 'warning' })
  const op = store.user
  for (const row of selectedRows.value) {
    await api.material.remove({ id: row.id, name: row.name, _op: op.username, _opName: op.name })
  }
  ElMessage.success('批量停用完成')
  load()
}

function quickAddDict(type) {
  ElMessageBox.prompt('请输入新选项内容', '新增', { confirmButtonText: '确定', cancelButtonText: '取消' })
    .then(async ({ value }) => {
      if (value) {
        await api.dict.save({ type, label: value, sort: 0 })
        ElMessage.success('新增成功')
        if (type === 'storage') storages.value = await api.dict.list({ type })
        if (type === 'category') categories.value = await api.dict.list({ type })
      }
    }).catch(() => {})
}

function quickAddUnit() {
  ElMessage.prompt('单位选项可以通过下拉框直接输入后回车创建。', '提示')
}

function printBarcode(row) {
  const w = window.open('', '_blank', 'width=400,height=300')
  w.document.write(`<h3>条码打印</h3><p>名称：${row.name}</p><p>编号：${row.code || 'N/A'}</p>`)
  w.print()
}

onMounted(load)
</script>

<style scoped>
.base-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 输入区域布局 */
.input-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 130px; }
.form-item label { font-size: 12px; color: #555; }
.inline-with-btn { flex: 1.5; }

/* 操作按钮区 */
.action-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; }
.action-buttons { display: flex; gap: 10px; }
</style>
