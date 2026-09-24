<template>
  <div class="login-wrap">
    <div class="login-box">
      <div class="left">
        <h2>库存管理</h2>
        <p class="sub">胚胎实验室</p>
        <p class="sub">试剂耗材出入库</p>
        <hr />
        <p class="small">本地数据</p>
        <p class="small">权限登录</p>
        <p class="small">操作记录全程留痕</p>
        <hr />
        <p class="small">科室内部库存管理</p>
      </div>
      <div class="right">
        <h3>账号登录</h3>
        <p class="tip">请输入工号，系统将自动显示对应姓名</p>
        <el-form :model="form" label-position="top" @submit.prevent>
          <el-form-item label="工号">
            <el-input 
              v-model="form.username" 
              placeholder="请输入工号"
              @blur="checkWorkId" 
              @keyup.enter="doLogin" 
            />
            <div class="hint-text" v-if="nameState === 'found'">姓名：{{ form.name }}</div>
            <div class="hint-text error" v-if="nameState === 'notfound'">未找到该工号</div>
          </el-form-item>
          
          <el-form-item label="密码">
            <el-input 
              v-model="form.password" 
              type="password" 
              show-password
              placeholder="请输入密码" 
              @keyup.enter="doLogin" 
            />
          </el-form-item>
          
          <div class="btns">
            <el-button @click="onExit">退出</el-button>
            <el-button type="success" @click="doLogin">登录</el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { api } from '@/api'

const router = useRouter()
const store = useUserStore()
const form = reactive({ username: '', name: '', password: '' })
const nameState = ref('')

async function checkWorkId() {
  if (!form.username) {
    form.name = ''
    nameState.value = ''
    return
  }
  const list = await api.user.list()
  const u = list.find(x => x.username === form.username)
  if (u) {
    form.name = u.name
    nameState.value = 'found'
  } else {
    form.name = ''
    nameState.value = 'notfound'
  }
}

async function doLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入工号和密码')
    return
  }
  if (nameState.value !== 'found') {
    await checkWorkId()
    if (nameState.value !== 'found') {
      ElMessage.error('未找到该工号或工号无效')
      return
    }
  }

  const res = await api.auth.login({
    username: form.username, password: form.password
  })
  if (!res.ok) { ElMessage.error(res.msg); return }
  store.setUser(res.user)
  ElMessage.success('登录成功')
  router.replace('/dashboard')
}

function onExit() { window.close() }

onMounted(() => {
  const u = store.user
  if (u) router.replace('/dashboard')
})
</script>

<style scoped>
.login-wrap { height:100%; background:#dfeff0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; position: relative; }
.login-box { width:760px; display:flex; background:#fff; box-shadow:0 6px 24px rgba(0,0,0,.1);
  border-radius:8px; overflow:hidden; }
.left { background:#4a9d92; color:#fff; width:280px; padding:36px 24px; }
.left h2 { margin:0 0 8px; font-size:26px; }
.left .sub { margin:4px 0; opacity:.9; }
.left hr { border:none; border-top:1px solid rgba(255,255,255,.3); margin:16px 0; }
.left .small { font-size:13px; margin:4px 0; opacity:.9; }
.right { flex:1; padding:36px 40px; }
.right h3 { margin:0 0 6px; }
.right .tip { color:#888; font-size:13px; margin:0 0 16px; }
.hint-text { font-size: 13px; color: #4a9d92; margin-top: 4px; }
.hint-text.error { color: #f56c6c; }
.btns { display:flex; gap:12px; margin-top:10px; }
.btns .el-button { flex:1; }
</style>
