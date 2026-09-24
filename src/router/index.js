import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'base', component: () => import('@/views/BaseData.vue') },
      { path: 'inbound', component: () => import('@/views/Inbound.vue') },
      { path: 'outbound', component: () => import('@/views/Outbound.vue') },
      { path: 'stockcheck', component: () => import('@/views/StockCheck.vue') },
      { path: 'query', component: () => import('@/views/Query.vue') },
      { path: 'report', component: () => import('@/views/Report.vue') },
      { path: 'backup', component: () => import('@/views/Backup.vue') },
      { path: 'logs', component: () => import('@/views/Logs.vue') },
      { path: 'settings', component: () => import('@/views/Settings.vue') }
    ]
  }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const user = sessionStorage.getItem('user')
  if (to.path !== '/login' && !user) return '/login'
  if (to.path === '/login' && user) return '/dashboard'
})

export default router
