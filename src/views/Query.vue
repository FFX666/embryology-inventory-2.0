<template>
  <div class="query-page">
    <h2 class="page-title">查询中心</h2>

    <!-- 区域一：组合模糊搜索 -->
    <div class="section-box">
      <div class="section-title">组合模糊搜索</div>
      <div class="search-row">
        <div class="form-item">
          <label>耗材名称</label>
          <el-input v-model="q.materialName" placeholder="请输入耗材名称" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>出入库日期起</label>
          <el-date-picker v-model="q.startDate" type="date" value-format="YYYY-MM-DD" placeholder="起始日期" style="width: 100%" />
        </div>
        <div class="form-item">
          <label>出入库日期止</label>
          <el-date-picker v-model="q.endDate" type="date" value-format="YYYY-MM-DD" placeholder="截止日期" style="width: 100%" />
        </div>
        <div class="form-item" style="flex: 1.2;">
          <label>常用查询方案</label>
          <el-select v-model="q.schemeName" placeholder="选择方案" clearable>
            <el-option v-for="s in schemes" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
        </div>
        <div class="form-item">
          <label>分类</label>
          <el-select v-model="q.category" placeholder="全部分类" clearable>
            <el-option label="全部" value="" />
            <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
          </el-select>
        </div>
        <div class="form-item">
          <label>经手人</label>
          <el-input v-model="q.handler" placeholder="请输入经手人" style="width: 100%" />
        </div>
      </div>

      <div class="button-row">
        <el-button type="success" @click="load">查询</el-button>
        <el-button @click="reset">重置</el-button>
        <el-button type="info" plain @click="applyScheme">调用方案</el-button>
        <el-button type="primary" plain @click="saveScheme">保存方案</el-button>
        <el-button type="warning" plain @click="deleteScheme">删除方案</el-button>
        <el-button @click="toggleExpand">{{ isExpanded ? '收起更多' : '展开更多' }}</el-button>
      </div>
    </div>

    <!-- 区域二：记录检索结果 -->
    <div class="section-box">
      <div class="section-title">记录检索结果</div>
      <el-table :data="records" border size="small" style="width: 100%">
        <el-table-column prop="type" label="记录类型" width="90" align="center" />
        <el-table-column prop="date" label="日期" width="110" align="center" />
        <el-table-column prop="material_name" label="耗材名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <el-table-column prop="batch_no" label="批号" width="120" align="center" />
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="person" label="经手人" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center" />
        <el-table-column prop="remark" label="备注" min-width="150" />
      </el-table>
    </div>

    <!-- 区域三：库存匹配结果 -->
    <div class="section-box">
      <div class="section-title">库存匹配结果</div>
      <el-table :data="stocks" border size="small" style="width: 100%" :row-class-name="tableRowClassName">
        <el-table-column prop="material_name" label="耗材名称" min-width="200" />
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
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const records = ref([])
const stocks = ref([])
const categories = ref([])
const schemes = ref(JSON.parse(localStorage.getItem('query_schemes') || '[]'))
const isExpanded = ref(false)

const q = reactive({
  materialName: '', startDate: '', endDate: '', 
  schemeName: '', category: '', handler: ''
})

// 判断是否低库存
const isLow = (row) => row.warn_threshold != null && row.quantity > 0 && row.quantity <= row.warn_threshold

// 表格行样式（低库存标黄）
const tableRowClassName = ({ row }) => {
  if (isLow(row)) return 'warning-row'
  return ''
}

async function load() {
  // 1. 查询记录（入库 + 出库）
  records.value = await api.query.records({ ...q })

  // 2. 查询库存匹配
  const stockQuery = { materialName: q.materialName, category: q.category }
  stocks.value = await api.stock.list(stockQuery)
}

function reset() {
  Object.assign(q, { materialName: '', startDate: '', endDate: '', schemeName: '', category: '', handler: '' })
  load()
}

function toggleExpand() { isExpanded.value = !isExpanded.value }

// ----- 查询方案 -----
function saveScheme() {
  if (!q.schemeName) { ElMessage.warning('请输入方案名称'); return }
  const existing = schemes.value.find(s => s.name === q.schemeName)
  if (existing) {
    Object.assign(existing, { ...q })
  } else {
    schemes.value.push({ name: q.schemeName, ...q })
  }
  localStorage.setItem('query_schemes', JSON.stringify(schemes.value))
  ElMessage.success('方案已保存')
}

function applyScheme() {
  if (!q.schemeName) { ElMessage.warning('请先选择方案'); return }
  const s = schemes.value.find(s => s.name === q.schemeName)
  if (s) {
    Object.assign(q, s)
    load()
  }
}

function deleteScheme() {
  if (!q.schemeName) return
  schemes.value = schemes.value.filter(s => s.name !== q.schemeName)
  localStorage.setItem('query_schemes', JSON.stringify(schemes.value))
  q.schemeName = ''
  ElMessage.success('方案已删除')
}

onMounted(async () => {
  categories.value = await api.dict.list({ type: 'category' })
  load()
})
</script>

<style scoped>
.query-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 12px; }

/* 搜索栏布局 */
.search-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 15px; align-items: flex-end; }
.form-item { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.form-item label { font-size: 12px; color: #555; white-space: nowrap; }

/* 按钮行 */
.button-row { display: flex; gap: 8px; flex-wrap: wrap; }

/* 自定义表格行高亮（低库存标黄） */
:deep(.warning-row) {
  background-color: #fff8e1 !important;
}
</style>
