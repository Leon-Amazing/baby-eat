# 微信云开发部署

## 1. 创建云环境

在微信开发者工具打开编译后的项目，点击工具栏「云开发」，按引导创建环境。将环境 ID 填入 `utils/cloudbase-config.js` 的 `CLOUDBASE_ENV_ID`。

## 2. 上传云函数

每次 HBuilderX 编译后，在仓库根目录执行 `npm run sync:cloud`，然后在微信开发者工具重新打开 `unpackage/dist/dev/mp-weixin`。在文件树中，对以下目录分别执行「上传并部署：云端安装依赖」：

- `cloudfunctions/baby-api`
- `cloudfunctions/seed-recipes`

若编译目录没有显示 `cloudfunctions`，将本仓库的 `cloudfunctions` 文件夹复制到 `unpackage/dist/dev/mp-weixin`，再导入或重新打开该编译目录。

## 3. 初始化食谱

在云开发控制台的「云函数」页，运行一次 `seed-recipes`。它会将本地的 16 条初始食谱写入 `recipes` 集合；再次运行会按 ID 更新已有数据。

## 4. 数据库权限

创建 `recipes` 和 `baby_states` 两个集合，并把客户端读写权限设为「仅云函数可读写」。小程序只通过 `baby-api` 访问数据，用户只能访问自己的 `baby_states` 文档。

## 5. 切换小程序

重新运行到微信开发者工具。环境 ID 不为空时，小程序会调用 `baby-api`；它不再依赖 `npm run api` 或 `127.0.0.1`。

`seed-recipes` 只用于初始化，日常运行不应从小程序调用它。后续可在云开发控制台编辑 `recipes` 集合，新增或调整已审核的食谱。
