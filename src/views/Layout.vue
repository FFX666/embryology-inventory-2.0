<template>
  <el-container style="height:100%">
    <!-- 左侧菜单 -->
    <el-aside width="200px" class="side">
      <div class="logo">胚胎实验室库存管理</div>
      <el-menu :default-active="$route.path" router background-color="#3e8f84"
        text-color="#fff" active-text-color="#ffe066" style="border:none">
        <el-menu-item index="/dashboard"><el-icon><Monitor /></el-icon>工作台</el-menu-item>
        <el-menu-item index="/base"><el-icon><Files /></el-icon>基础档案</el-menu-item>
        <el-menu-item index="/inbound"><el-icon><Download /></el-icon>入库管理</el-menu-item>
        <el-menu-item index="/outbound"><el-icon><Upload /></el-icon>出库领用</el-menu-item>
        <el-menu-item index="/stockcheck"><el-icon><Checked /></el-icon>库存盘点</el-menu-item>
        <el-menu-item index="/query"><el-icon><Search /></el-icon>查询中心</el-menu-item>
        <el-menu-item index="/report"><el-icon><DataLine /></el-icon>报表导出</el-menu-item>
        <el-menu-item index="/backup"><el-icon><FolderOpened /></el-icon>备份恢复</el-menu-item>
        <el-menu-item index="/logs"><el-icon><List /></el-icon>操作日志</el-menu-item>
        <el-menu-item index="/settings"><el-icon><Setting /></el-icon>系统设置</el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 右侧内容 -->
    <el-container>
      <el-header class="topbar">
        <div class="title">胚胎实验室库存管理</div>
        <div class="user">
          <span>{{ user?.username }} · {{ user?.name }} · {{ roleText }}</span>
          <el-button size="small" @click="goSettings">系统设置</el-button>
          <el-button size="small" type="danger" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      
      <el-main style="background:#eaf5f2; padding: 16px;">
        <router-view />
      </el-main>
      
      <!-- 底部状态栏，对应图片左下角 -->
      <el-footer height="28px" class="footer-bar">
        <span>当前页面：{{ currentPageName }}</span>
        <span style="margin-left: 20px;">数据目录：{{ dbPath }}</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { api } from '@/api'

const router = useRouter()
const route = useRoute()
const store = useUserStore()
const user = computed(() => store.user)
const roleText = computed(() => user.value?.role === 'admin' ? '管理员' : '普通入库员')

const dbPath = ref('加载中...')

const currentPageName = computed(() => {
  const map = {
    '/dashboard': '工作台', '/base': '基础档案', '/inbound': '入库管理',
    '/outbound': '出库领用', '/stockcheck': '库存盘点', '/query': '查询中心',
    '/report': '报表导出', '/backup': '备份恢复', '/logs': '操作日志', '/settings': '系统设置'
  }
  return map[route.path] || '工作台'
})

onMounted(async () => {
  // 获取数据库路径
  const paths = await api.app.paths()
  dbPath.value = paths.dbPath
})

function goSettings() { router.push('/settings') }
function logout() {
  store.logout()
  router.replace('/login')
}
</script>

<style scoped>
.side { background:#3e8f84; }
.logo { color:#fff; font-size:14px; padding:16px; font-weight:bold;
  background:#357a70; letter-spacing:1px; }
.topbar { background:#fff; display:flex; justify-content:space-between;
  align-items:center; border-bottom:1px solid #eee; }
.topbar .title { font-weight:bold; }
.topbar .user { display:flex; gap:8px; align-items:center; color:#555; font-size:13px; }

/* 底部状态栏样式 */
.footer-bar {
  background: #e0eee9; color: #666; font-size: 12px; display: flex;
  align-items: center; padding: 0 16px; border-top: 1px solid #d0e0da;
}
</style>
