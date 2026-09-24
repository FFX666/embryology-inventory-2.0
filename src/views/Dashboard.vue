<template>
  <div>
    <h2 class="page-title">工作台</h2>

    <!-- 顶部统计卡片 -->
    <div class="cards">
      <div class="card" @click="goFilter('')">
        <div class="card-title">基础档案</div>
        <b class="green">{{ s.totalMaterial }}</b>
      </div>
      <div class="card" @click="goFilter('low')">
        <div class="card-title">低库存</div>
        <b class="orange">{{ s.lowStock }}</b>
      </div>
      <div class="card" @click="goFilter('expiring')">
        <div class="card-title">临期批次</div>
        <b class="black">{{ s.nearExpiry }}</b>
      </div>
      <div class="card" @click="goFilter('expired')">
        <div class="card-title">已过期</div>
        <b class="black">{{ s.expired }}</b>
      </div>
      <div class="card" @click="goFilter('today')">
        <div class="card-title">今日操作</div>
        <b class="black">{{ s.todayOps }}</b>
      </div>
    </div>

    <!-- 实时库存总表 -->
    <div class="page-card">
      <div class="table-title">实时库存总表</div>
      
      <!-- 过滤器：完全按照图片项目排列，并补充“批次数”下拉菜单 -->
      <div class="toolbar">
        <el-select v-model="q.materialName" placeholder="耗材名称" clearable style="width:150px">
          <el-option label="全部" value="" />
        </el-select>
        <el-select v-model="q.category" placeholder="分类" clearable style="width:110px">
          <el-option label="全部" value="" />
          <el-option v-for="c in categories" :key="c.label" :label="c.label" :value="c.label" />
        </el-select>
        <!-- 补充用户要求的“批次数”下拉 -->
        <el-select v-model="q.batch_count" placeholder="批次数" clearable style="width:100px">
          <el-option label="全部" value="" />
          <el-option label="1次" value="1" />
          <el-option label="2次" value="2" />
          <el-option label="3次及以上" value="3" />
        </el-select>
        <el-select v-model="q.expiry" placeholder="有效期" clearable style="width:120px">
          <el-option label="全部" value="" />
          <el-option label="已过期" value="expired" />
          <el-option label="30天内临期" value="near" />
        </el-select>
        <el-select v-model="q.unit" placeholder="单位" clearable style="width:100px">
          <el-option label="全部" value="" />
          <el-option label="瓶" value="瓶" />
          <el-option label="盒" value="盒" />
          <el-option label="支" value="支" />
          <el-option label="套" value="套" />
        </el-select>
        <el-select v-model="q.shelf_location" placeholder="货架号" clearable style="width:100px">
          <el-option label="全部" value="" />
          <el-option label="冰箱" value="冰箱" />
          <el-option label="耗材间" value="耗材间" />
        </el-select>
        <el-select v-model="q.status" placeholder="状态" clearable style="width:100px">
          <el-option label="全部" value="" />
          <el-option label="正常" value="normal" />
          <el-option label="低库存" value="low" />
          <el-option label="已过期" value="expired" />
        </el-select>
        <el-button type="success" @click="load">筛选</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <!-- 表格完全对应上方筛选器 -->
      <el-table :data="rows" border height="480" size="small" style="width: 100%">
        <el-table-column prop="material_name" label="耗材名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <!-- 显示批次数列 -->
        <el-table-column prop="batch_count" label="批次数" width="80" align="center" />
        <el-table-column prop="expiry_date" label="最近有效期" width="120" align="center" />
        <el-table-column prop="quantity" label="当前总库存" width="110" align="center" />
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="shelf_location" label="货架号" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <span v-if="isExpired(row)">已过期</span>
            <span v-else-if="isLow(row)">低库存</span>
            <span v-else>正常</span>
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
const q = reactive({ 
  materialName: '', category: '', batch_count: '', expiry: '', 
  unit: '', shelf_location: '', status: '' 
})

const isExpired = (r) => r.expiry_date && dayjs(r.expiry_date).isBefore(dayjs(), 'day')
const isLow = (r) => r.warn_threshold != null && r.quantity > 0 && r.quantity <= r.warn_threshold

async function load() {
  const [sum, list, cats] = await Promise.all([
    api.stock.summary(),
    api.stock.list({ ...q }),
    api.dict.list({ type: 'category' })
  ])
  Object.assign(s, sum)
  // 后端如果没有返回 batch_count（批次数），前端临时赋默认值 1 避免表格空白
  rows.value = list.map(item => ({
    ...item,
    batch_count: item.batch_count || 1 
  }))
  categories.value = cats
}

function goFilter(kind) {
  if (kind === 'low' || kind === 'expired') q.status = kind
  else q.status = ''
  load()
}

function reset() {
  q.materialName = ''; q.category = ''; q.batch_count = ''
  q.expiry = ''; q.unit = ''; q.shelf_location = ''; q.status = ''
  load()
}

onMounted(load)
</script>

<style scoped>
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

/* 卡片区域 */
.cards { display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; margin-bottom:12px; }
.card { background:#fff; padding:16px; border-radius:4px; cursor:pointer; transition:.2s;
  display:flex; flex-direction:column; gap:8px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.card:hover { background: #3e8f84; }
.card:hover .card-title, .card:hover b { color: #fff !important; }
.card-title { font-size: 14px; color: #666; }
.card b { font-size:26px; font-weight: 500; }
.card b.green { color:#3e8f84; }
.card b.orange { color:#ef6c00; }
.card b.black { color:#333; }

.table-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; }
/* 筛选栏样式，紧凑对齐表头 */
.toolbar { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; align-items:center; }
</style>
