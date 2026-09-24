<template>
  <div class="settings-page">
    <h2 class="page-title">系统设置</h2>

    <!-- 区域一：当前账号 -->
    <div class="section-box">
      <div class="section-title">当前账号</div>
      <div class="pwd-header">当前登录：{{ user?.username }} 权限：{{ user?.role === 'admin' ? '管理员' : '普通入库员' }}</div>
      
      <div class="pwd-form-row">
        <div class="form-item">
          <label>原密码</label>
          <el-input v-model="pwdForm.oldPwd" type="password" show-password />
        </div>
        <div class="form-item">
          <label>新密码</label>
          <el-input v-model="pwdForm.newPwd" type="password" show-password />
        </div>
        <div class="form-item">
          <label>确认新密码</label>
          <el-input v-model="pwdForm.confirmPwd" type="password" show-password />
        </div>
        <div class="form-item-btn">
          <el-button type="success" style="width: 100%;" @click="changePwd">修改密码</el-button>
        </div>
      </div>
    </div>

    <!-- 区域二：账号权限管理 -->
    <div class="section-box">
      <div class="section-title">账号权限管理</div>
      <div class="section-tip">管理员可新增账号、重置密码、调整权限角色。</div>
      
      <div class="inline-form">
        <div class="form-item">
          <label>账号</label>
          <el-input v-model="userForm.username" placeholder="请输入账号" :disabled="!!userForm.id" />
        </div>
        <div class="form-item">
          <label>姓名/显示名</label>
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </div>
        <div class="form-item">
          <label>权限角色</label>
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="普通入库员" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </div>
        <div class="form-item">
          <label>初始/重置密码</label>
          <el-input v-model="userForm.password" placeholder="留空则不修改密码" />
        </div>
        <div class="form-checkbox">
          <el-checkbox v-model="userForm.status">* 启用</el-checkbox>
        </div>
        <div class="form-buttons">
          <el-button type="success" @click="saveUser">{{ userForm.id ? '保存修改' : '保存账号' }}</el-button>
          <el-button @click="clearUser">清空</el-button>
        </div>
      </div>

      <el-table :data="users" border size="small" style="width: 100%; margin-top: 15px;">
        <el-table-column prop="username" label="账号" width="150" align="center" />
        <el-table-column prop="name" label="姓名" width="180" align="center" />
        <el-table-column label="角色" align="center">
          <template #default="{ row }">
            <span>{{ row.role === 'admin' ? '管理员' : '普通入库员' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <span>{{ row.status ? '启用' : '停用' }}</span>
          </template>
        </el-table-column>
        <!-- 新增：操作列 -->
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="editUser(row)">修改</el-button>
            <el-button link :type="row.status ? 'danger' : 'success'" @click="toggleUserStatus(row)">
              {{ row.status ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 区域三：下拉选项维护 -->
    <div class="section-box">
      <div class="section-title">下拉选项维护</div>
      
      <div class="inline-form">
        <div class="form-item" style="width: 160px;">
          <label>下拉类型</label>
          <el-select v-model="dictForm.type" @change="loadDicts">
            <el-option label="储存条件" value="storage" />
            <el-option label="分类" value="category" />
          </el-select>
        </div>
        <div class="form-item" style="width: 200px;">
          <label>选项内容</label>
          <el-input v-model="dictForm.label" placeholder="请输入内容" />
        </div>
        <div class="form-item" style="width: 120px;">
          <label>排序号</label>
          <el-input-number v-model="dictForm.sort" :min="0" style="width: 100%;" />
        </div>
        <div class="form-checkbox">
          <el-checkbox v-model="dictForm.status">* 启用</el-checkbox>
        </div>
        <div class="form-buttons">
          <el-button type="success" @click="saveDict">保存选项</el-button>
          <el-button @click="clearDict">清空</el-button>
          <el-button type="warning" @click="removeDict" :disabled="!dictForm.id">删除选项</el-button>
        </div>
      </div>

      <el-table :data="dicts" border size="small" style="width: 100%; margin-top: 15px;">
        <el-table-column prop="label" label="选项内容" align="center" />
        <el-table-column prop="sort" label="排序号" width="150" align="center" />
        <el-table-column label="状态" width="150" align="center">
          <template #default="{ row }">
            <span>{{ row.status ? '启用' : '停用' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="editDict(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const store = useUserStore()
const user = computed(() => store.user)

// ----- 区域一：密码修改 -----
const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })

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

// ----- 区域二：账号权限管理 -----
const users = ref([])
const userForm = reactive({ id: null, username: '', name: '', role: 'user', password: '', status: true })

async function loadUsers() { users.value = await api.user.list() }

function editUser(row) {
  userForm.id = row.id
  userForm.username = row.username
  userForm.name = row.name
  userForm.role = row.role
  userForm.password = '' // 留空表示不修改密码
  userForm.status = !!row.status
}

async function saveUser() {
  if (!userForm.username || (!userForm.id && !userForm.password)) { 
    ElMessage.warning('请填写完整信息'); return 
  }
  const op = store.user
  const payload = { ...userForm, _op: op.username, _opName: op.name }
  
  const res = await api.user.save(payload)
  if (res.ok === false) { ElMessage.error(res.msg); return }
  ElMessage.success(userForm.id ? '修改成功' : '新增成功')
  clearUser()
  loadUsers()
}

function clearUser() {
  Object.assign(userForm, { id: null, username: '', name: '', role: 'user', password: '', status: true })
}

async function toggleUserStatus(row) {
  const action = row.status ? '停用' : '启用'
  await ElMessageBox.confirm(`确定${action}账号【${row.username}】吗？`, '提示', { type: 'warning' })
  const op = store.user
  await api.user.save({
    id: row.id, username: row.username, name: row.name, role: row.role,
    status: row.status ? 0 : 1, _op: op.username, _opName: op.name
  })
  ElMessage.success(`已${action}`)
  loadUsers()
}

// ----- 区域三：下拉选项维护 -----
const dicts = ref([])
const dictForm = reactive({ id: null, type: 'storage', label: '', sort: 0, status: true })

async function loadDicts() { 
  dicts.value = await api.dict.list({ type: dictForm.type }) 
}

function editDict(row) {
  dictForm.id = row.id
  dictForm.type = row.type
  dictForm.label = row.label
  dictForm.sort = row.sort
  dictForm.status = !!row.status
}

async function saveDict() {
  if (!dictForm.label) { ElMessage.warning('请输入选项内容'); return }
  await api.dict.save({ ...dictForm, status: dictForm.status ? 1 : 0 })
  ElMessage.success('已保存')
  clearDict()
  loadDicts()
}

function clearDict() {
  dictForm.id = null; dictForm.label = ''; dictForm.sort = 0; dictForm.status = true
}

async function removeDict() {
  if (!dictForm.id) { ElMessage.warning('请先选择要删除的选项'); return }
  await api.dict.remove({ id: dictForm.id })
  ElMessage.success('已删除')
  clearDict()
  loadDicts()
}

onMounted(() => {
  loadUsers()
  loadDicts()
})
</script>

<style scoped>
.settings-page { padding-bottom: 20px; }
.page-title { font-size: 18px; margin: 0 0 16px 0; font-weight: bold; color: #333; }

/* 区块样式 */
.section-box { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.section-title { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 12px; }
.section-tip { font-size: 13px; color: #888; margin-bottom: 12px; }

/* 密码区横向表单 */
.pwd-header { font-size: 14px; margin-bottom: 10px; }
.pwd-form-row { display: flex; gap: 16px; align-items: flex-end; }
.pwd-form-row .form-item { flex: 1; }
.pwd-form-row .form-item-btn { width: 180px; }

/* 通用表单元素样式 */
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item label { font-size: 13px; color: #555; }
.form-checkbox { display: flex; align-items: flex-end; padding-bottom: 6px; margin-left: 10px; }
.form-buttons { display: flex; gap: 10px; align-items: flex-end; padding-bottom: 2px; margin-left: auto; }

/* 行内表单组合 */
.inline-form { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
</style>
