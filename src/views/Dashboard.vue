<template>
  <div>
    <div class="cards">
      <div class="card" @click="goFilter('')">
        <div>基础档案</div><b>{{ s.totalMaterial }}</b>
      </div>
      <div class="card low" @click="goFilter('low')">
        <div>低库存</div><b>{{ s.lowStock }}</b>
      </div>
      <div class="card warn" @click="goFilter('expiring')">
        <div>临期批次</div><b>{{ s.nearExpiry }}</b>
      </div>
      <div class="card danger" @click="goFilter('expired')">
        <div>已过期</div><b>{{ s.expired }}</b>
      </div>
      <div class="card" @click="goFilter('today')">
        <div>今日操作</div><b>{{ s.todayOps }}</b>
      </div>
    </div>

    <div class="page-card">
      <div class="toolbar">
        <el-input v-model="q.materialName" placeholder="耗材名称" style="width:200px" />
        <el-select v-model="q.category" placeholder="分类" clearable style="width:160px">
          <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
        </el-select>
        <el-select v-model="q.status" placeholder="状态" clearable style="width:140px">
          <el-option label="全部" value="" />
          <el-option label="低库存" value="low" />
          <el-option label="过期" value="expired" />
        </el-select>
        <el-button type="success" @click="load">筛选</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table :data="rows" border height="480" size="small">
        <el-table-column prop="material_name" label="耗材名称" min-width="200" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="batch_no" label="批号" width="120" />
        <el-table-column prop="expiry_date" label="最近有效期" width="120" />
        <el-table-column prop="quantity" label="当前总库存" width="110" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="shelf_location" label="货架号" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="isExpired(row)" type="danger">过期</el-tag>
            <el-tag v-else-if="isLow(row)" type="warning">低库存</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { api } from '@/api'

const s = reactive({ totalMaterial:0, lowStock:0, nearExpiry:0, expired:0, todayOps:0 })
const rows = ref([])
const categories = ref([])
const q = reactive({ materialName: '', category: '', status: '' })

const isExpired = (r) => r.expiry_date && dayjs(r.expiry_date).isBefore(dayjs(), 'day')
const isLow = (r) => r.warn_threshold != null && r.quantity > 0 && r.quantity <= r.warn_threshold

async function load() {
  const [sum, list, cats] = await Promise.all([
    api.stock.summary(),
    api.stock.list({ ...q }),
    api.dict.list({ type: 'category' })
  ])
  Object.assign(s, sum)
  rows.value = list
  categories.value = cats
}

function goFilter(kind) {
  if (kind === 'low' || kind === 'expired') q.status = kind
  load()
}

function reset() {
  q.materialName = ''; q.category = ''; q.status = ''
  load()
}

onMounted(load)
</script>

<style scoped>
.cards { display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; margin-bottom:12px; }
.card { background:#fff; padding:16px; border-radius:6px; cursor:pointer; transition:.2s;
  display:flex; flex-direction:column; gap:8px; }
.card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,.08); }
.card b { font-size:26px; color:#3e8f84; }
.card.low { background:#e8f5e9; } .card.low b { color:#2e7d32; }
.card.warn { background:#fff8e1; } .card.warn b { color:#ef6c00; }
.card.danger { background:#ffebee; } .card.danger b { color:#c62828; }
</style>
