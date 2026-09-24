<template>
  <div class="page-card">
    <h3>当前账号</h3>
    <el-form :model="pwdForm" label-width="120px" style="max-width:640px">
      <el-form-item label="当前登录">
        {{ user?.username }} 权限：{{ user?.role === 'admin' ? '管理员' : '普通入库员' }}
      </el-form-item>
      <el-form-item label="原密码">
        <el-input v-model="pwdForm.oldPwd" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="pwdForm.newPwd" type="password" show-password />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input v-model="pwdForm.confirmPwd" type="password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="changePwd">修改密码</el-button>
      </el-form-item>
    </el-form>

    <el-divider />

    <h3>账号权限管理</h3>
    <p style="color:#888;font-size:13px">管理员可新增账号、重置密码、调整权限角色。</p>
    <div class="toolbar">
      <el-input v-model="newUser.username" placeholder="工号" style="width:140px" />
      <el-input v-model="newUser.name" placeholder="姓名/显示名" style="width:140px" />
      <el-select v-model="newUser.role" placeholder="权限角色" style="width:140px">
        <el-option label="普通入库员" value="user" />
        <el-option label="管理员" value="admin" />
      </el-select>
      <el-input v-model="newUser.password" placeholder="初始密码" style="width:160px" />
      <el-button type="primary" @click="addUser">保存账号</el-button>
      <el-button @click="clearUser">清空</el-button>
    </div>

    <el-table :data="users" border height="280" size="small">
      <el-table-column prop="username" label="账号" width="140" />
      <el-table-column prop="name" label="姓名" width="180" />
      <el-table-column label="角色" width="160">
        <template #default="{ row }">
          <el-select v-model="row.role" size="small" @change="updateUser(row)">
            <el-option label="普通入库员" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'">{{ row.status ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="danger" @click="disable(row)">禁用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-divider />

    <h3>下拉选项维护</h3>
    <div class="toolbar">
      <el-select v-model="dictType" style="width:160px">
        <el-option label="储存条件" value="storage" />
        <el-option label="分类" value="category" />
      </el-select>
      <el-input v-model="dictLabel" placeholder="选项内容" style="width:200px" />
      <el-input-number v-model="dictSort" :min="0" />
      <el-button type="primary" @click="saveDict">保存选项</el-button>
    </div>

    <el-table :data="dicts" border height="240" size="small">
      <el-table-column prop="label" label="选项内容" />
      <el-table-column prop="sort" label="排序号" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'">{{ row.status ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="danger" @click="removeDict(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const user = computed(() => store.user)

const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })
const users = ref([])
const newUser = reactive({ username: '', name: '', role: 'user', password: '' })
const dictType = ref('storage')
const dictLabel = ref('')
const dictSort = ref(0)
const dicts = ref([])

async function loadUsers() { users.value = await api.user.list() }
async function loadDicts() { dicts.value = await api.dict.list({ type: dictType.value }) }

async function changePwd() {
  if (!pwdForm.oldPwd || !pwdForm.newPwd) { ElMessage.warning('请填写完整'); return }
  if (pwdForm.newPwd !== pwdForm.confirmPwd) { ElMessage.warning('两次密码不一致'); return }
  const res = await api.auth.changePassword({
    username: user.value.username, oldPwd: pwdForm.oldPwd, newPwd: pwdForm.newPwd
  })
  if (!res.ok) { ElMessage.error(res.msg); return }
  ElMessage.success('密码已修改')
  pwdForm.oldPwd = pwdForm.newPwd = pwdForm.confirmPwd = ''
}

async function addUser() {
  if (!newUser.username || !newUser.password) { ElMessage.warning('工号密码必填'); return }
  const op = store.user
  const res = await api.user.save({ ...newUser, _op: op.username, _opName: op.name })
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success('已保存')
  clearUser()
  loadUsers()
}

function clearUser() {
  newUser.username = ''; newUser.name = ''; newUser.role = 'user'; newUser.password = ''
}

async function updateUser(row) {
  const op = store.user
  await api.user.save({ ...row, _op: op.username, _opName: op.name })
  ElMessage.success('已更新')
}

async function disable(row) {
  const op = store.user
  await api.user.remove({ id: row.id, _op: op.username, _opName: op.name })
  loadUsers()
}

async function saveDict() {
  if (!dictLabel.value) { ElMessage.warning('请输入选项内容'); return }
  await api.dict.save({ type: dictType.value, label: dictLabel.value, sort: dictSort.value })
  dictLabel.value = ''
  loadDicts()
}

async function removeDict(row) {
  await api.dict.remove({ id: row.id })
  loadDicts()
}

onMounted(() => { loadUsers(); loadDicts() })
</script>
