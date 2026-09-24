# 胚胎实验室库存管理系统

基于 **Electron + Vue 3 + Element Plus + better-sqlite3** 的胚胎实验室试剂耗材库存管理桌面软件。

## 功能

- 工号 + 密码登录，权限分级
- 工作台实时显示库存概况（低库存 / 临期 / 过期 / 今日操作），点击卡片查看明细
- 基础档案统一维护耗材信息（名称、规格、厂家、品牌、单位、储存条件、货架位置）
- 入库支持手工输入 / 扫码录入，记录批号、效期、数量、供应商、经手人
- 出库自动推荐优先使用批号（FIFO + 效期优先），每次领用可追溯到具体批号
- 库存盘点核对账面与实盘，差异记录留痕
- 查询中心按时间段筛选，一键导出 Excel（月度统计、质控检查、资料留档）
- 所有新增 / 修改 / 作废 / 登录操作全程留痕
- 本地 SQLite 数据库 + 一键备份 / 恢复

## 本地开发

```bash
npm install
npm run electron:dev
```

## 打包

```bash
npm run electron:build
```

产物位于 `release/` 目录。

## 默认账号

| 工号 | 姓名 | 密码 | 权限 |
|------|------|------|------|
| admin | 系统管理员 | admin123 | 管理员 |
| 2001 | 黎铁娥 | 123456 | 普通入库员 |
| 2002 | 刘婕 | 123456 | 管理员 |

## 数据库位置

Windows: `%APPDATA%/embryology-inventory/data/db.sqlite3`

## 自动构建

推送到 `main` 分支后 GitHub Actions 会自动编译并上传 `.exe` 安装包到 Artifacts。
打 tag（如 `v1.0.0`）会自动发布到 GitHub Release。

## License

MIT
