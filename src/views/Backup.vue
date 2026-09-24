<template>
  <div class="page-card">
    <h3>本地数据库备份</h3>
    <el-form label-width="100px" style="max-width:900px">
      <el-form-item label="数据库文件">
        <el-input v-model="paths.dbPath" readonly />
      </el-form-item>
      <el-form-item label="备份目录">
        <el-input v-model="paths.backupDir" readonly>
          <template #append>
            <el-button @click="openDir">打开备份目录</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="backup">一键备份数据库</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="list" border height="380" size="small">
      <el-table-column prop="name" label="备份文件" min-width="300" />
      <el-table-column prop="mtime" label="时间" width="200" />
      <el-table-column label="大小(KB)" width="120">
        <template #default="{ row }">{{ (row.size/1024).toFixed(1) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="danger" @click="restore(row)">恢复</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const paths = reactive({ dbPath: '', backupDir: '' })
const list = ref([])

async function load() {
  Object.assign(paths, await api.app.paths())
  list.value = await api.backup.list()
}

async function backup() {
  await api.backup.create()
  ElMessage.success('备份完成')
  load()
}

async function restore(row) {
  await ElMessageBox.confirm(`确定恢复【${row.name}】？恢复后软件将自动重启。`, '警告', { type: 'warning' })
  await api.backup.restore({ name: row.name })
}

function openDir() { api.backup.openDir() }

onMounted(load)
</script>
