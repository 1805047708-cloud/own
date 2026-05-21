# 秋秋人俱乐部网页链接版发布说明

这是一个纯静态网页版本，包含 `index.html`、`styles.css`、`app.js` 和 `assets/`，不需要安装依赖。

## 最快发布方式：Netlify Drop

1. 打开 https://app.netlify.com/drop
2. 把整个 `site-release-qiuqiu` 文件夹拖进去。
3. 等待上传完成，Netlify 会生成一个可分享的网址。

## GitHub Pages 发布方式

1. 新建一个 GitHub 仓库。
2. 上传 `site-release-qiuqiu` 文件夹里的全部文件到仓库根目录。
3. 进入仓库 `Settings` -> `Pages`。
4. Source 选择 `Deploy from a branch`，Branch 选择 `main` 和 `/root`。
5. 保存后等待几分钟，GitHub 会生成 `https://你的用户名.github.io/仓库名/`。

## 注意

- 当前版本是前端原型，账号和订单保存在每个访问者自己的浏览器里。
- 分享链接后，别人能看到系统并创建自己的本机账号，但不会和你的本机数据互通。
- 如果要多人共同使用同一套订单和流水，下一步需要接云数据库或后端。
