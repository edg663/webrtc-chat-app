\# 🎙️ WebRTC Voice \& Text Chat App



!\[License](https://img.shields.io/badge/license-ISC-blue.svg)

!\[Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)

!\[Socket.io](https://img.shields.io/badge/Socket.io-v4.8-black.svg)



一个基于 \*\*WebRTC\*\* 和 \*\*Socket.io\*\* 的实时点对点（P2P）语音与文字通讯应用。支持建立私密会话、实时语音通话、静音控制以及文字消息传输。



\## ✨ 功能特性



\- \*\*🤝 实时会话管理\*\*：通过唯一的 Socket ID 建立点对点连接，支持状态检测（忙线、离线）。

\- \*\*📞 语音通话\*\*：利用 WebRTC 技术实现低延迟的高质量语音通话。

\- \*\*💬 文字聊天\*\*：通话过程中支持发送即时文字消息。

\- \*\*🎤 麦克风控制\*\*：支持通话过程中的一键静音/取消静音。

\- \*\*mw\_timer 通话计时\*\*：精确显示当前语音通话时长。

\- \*\*🛡️ 优雅的错误处理\*\*：处理对方掉线、刷新页面或意外断开的情况。



\## 🛠️ 技术栈



\- \*\*后端\*\*：Node.js, Express, Socket.io

\- \*\*前端\*\*：原生 HTML/CSS/JavaScript, WebRTC API

\- \*\*信令服务\*\*：Socket.io (用于交换 SDP 和 ICE Candidates)

\- \*\*STUN 服务\*\*：Google STUN (stun:stun.l.google.com:19302)



\## 🚀 快速开始



\### 1. 环境要求

请确保你的电脑上安装了 \[Node.js](https://nodejs.org/) (建议版本 v18+)。



\### 2. 安装依赖

在项目根目录下运行终端命令：



```bash

npm install

