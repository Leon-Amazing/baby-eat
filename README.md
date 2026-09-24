# 宝宝今天吃什么

这是 HBuilderX 创建的 uni-app Vue 3 项目。食谱和推荐规则内置在小程序包中；宝宝信息、收藏、已尝试记录和自定义菜单保存在当前设备的微信本地存储中。运行时不依赖服务器、CloudBase 或网络请求。

## 在微信开发者工具中运行

1. 安装 HBuilderX 和微信开发者工具。
2. 用 HBuilderX 打开本项目根目录，选择「运行 → 运行到小程序模拟器 → 微信开发者工具」。首次运行按提示配置微信开发者工具安装路径。
3. 在微信开发者工具中点击「编译」。静态版不需要启动 `npm run api`，也不需要关闭域名校验。

## 静态数据

- 内置 100 道食谱，按 6、8、12、18、24 月龄分组。原有 34 道位于 `utils/recipes-data.js`，新增 66 道位于 `utils/recipes-extra.js`。修改后需要重新编译并提交新的小程序版本。
- 每道食谱的详情页展示出处与可复制的原文链接。新增食谱根据 [NHS Best Start in Life 食谱库](https://www.nhs.uk/best-start-in-life/baby/recipes-and-meal-ideas/) 改编，并链接到对应原食谱；原有 34 道是项目原有配方，所附 [NHS 辅食指南](https://www.nhs.uk/best-start-in-life/baby/weaning/what-to-feed-your-baby/from-around-6-months/) 仅作为辅食原则参考，不能视为其逐道食谱来源。月龄分组是项目的保守归类，不等于来源网站的年龄标签。
- 食材质地、去核去刺、避免整粒等通用安全提示参考 [CDC 防噎食指南](https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/choking-hazards.html)；不额外添加盐糖，并避免给 12 月以下宝宝食用蜂蜜，参考 [NHS 辅食指南](https://www.nhs.uk/best-start-in-life/baby/weaning/what-to-feed-your-baby/from-around-6-months/) 与 [CDC 食物限制](https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/foods-and-drinks-to-avoid-or-limit.html)。
- 今日推荐按设备本地日期、宝宝月龄和餐次选取：同一天保持稳定；候选食谱不变且多于一道时，相邻两天会轮换到不同食谱。重新进入首页时会刷新日期与推荐。
- 每道食谱都有建议质地、常见过敏原和进食安全提示；这些内容是家庭辅食参考，正式发布前应由儿科营养专业人士审核。
- 用户在小程序内创建的菜单、收藏、尝试记录和宝宝资料只保存在当前设备。清理微信存储或更换设备后无法恢复。
- `cloudfunctions` 和 `server` 目录保留为未来需要跨设备同步或后台管理时的迁移参考，静态版不会调用它们。
