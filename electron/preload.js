const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload)

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (d) => invoke('auth:login', d),
    changePassword: (d) => invoke('auth:changePassword', d)
  },
  user: {
    list: () => invoke('user:list'),
    save: (d) => invoke('user:save', d),
    remove: (d) => invoke('user:remove', d)
  },
  material: {
    list: (q) => invoke('material:list', q),
    save: (d) => invoke('material:save', d),
    remove: (d) => invoke('material:remove', d)
  },
  inbound: {
    list: (q) => invoke('inbound:list', q),
    save: (d) => invoke('inbound:save', d),
    void: (d) => invoke('inbound:void', d)
  },
  outbound: {
    list: (q) => invoke('outbound:list', q),
    save: (d) => invoke('outbound:save', d),
    recommend: (d) => invoke('outbound:recommend', d)
  },
  stock: {
    list: (q) => invoke('stock:list', q),
    summary: () => invoke('stock:summary')
  },
  check: {
    list: (q) => invoke('check:list', q),
    save: (d) => invoke('check:save', d)
  },
  query: {
    records: (q) => invoke('query:records', q)
  },
  log: {
    list: (q) => invoke('log:list', q),
    write: (d) => invoke('log:write', d)
  },
  backup: {
    create: () => invoke('backup:create'),
    list: () => invoke('backup:list'),
    restore: (d) => invoke('backup:restore', d),
    openDir: () => invoke('backup:openDir')
  },
  report: {
    exportExcel: (d) => invoke('report:exportExcel', d)
  },
  dict: {
    list: (d) => invoke('dict:list', d),
    save: (d) => invoke('dict:save', d),
    remove: (d) => invoke('dict:remove', d)
  },
  app: {
    paths: () => invoke('app:paths')
  }
})
