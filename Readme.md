# node MC Server Control Bot
一个使用腾讯云抢占式实例，用telegram bot控制
# 前提条件

本bot使用了
- 腾讯云，你要准备一个腾讯云账号，以及secretId和Key。
- 一块腾讯云硬盘，区域要和你的实例一致，且提前格式化，放入了MC服务器
- DDNS用到了CloudFlare的API，你需要准备对应的key，或者也可以自己实现一个别的。
- telegramBot的token。
- 一台全天开机的小服务器，部署本项目。

# 使用

在相应的文件内填入自己的凭证即可运行：
- DDNS.js  ——cloudflare相关
- ./TencentCloud/config.js  ——腾讯云相关
- ./TencentCloud/CloudDisk.js  ——云硬盘ID
- ./index.js  ——tgbot相关，服务器启动命令相关

# 其他

bot.service文件可以用于systemd创建守护进程，让机器人后台运行
nginx.conf用于https（可选）