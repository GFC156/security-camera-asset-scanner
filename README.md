# 安防监控扫描 / Security Camera Asset Scanner

[English](#english) | [中文](#中文)

---

<a id="english"></a>
## English

A Windows desktop tool for **auto-discovering Hikvision/Dahua and ISAPI-compatible surveillance devices on LAN**, collecting device assets, platform status, and network quality metrics. Packaged as a single `.exe`, no dependencies required.

![license](https://img.shields.io/badge/license-MIT-blue) ![platform](https://img.shields.io/badge/platform-Windows-green) ![electron](https://img.shields.io/badge/Electron-26-blue)

---

### Features

#### 1. Multi-subnet Auto Scan
- Accepts CIDR (e.g. `192.168.1.0/24`) or IP range (e.g. `10.0.0.1-50`)
- Supports excluding specific IPs (gateway, localhost, etc.)
- Multi-threaded concurrent scanning, 254 IPs typically in 10-30 seconds
- Retries HTTP / HTTPS, and Digest / Basic auth

#### 2. Device Asset Collection
For each discovered device, automatically retrieves:
- IP / MAC address
- Device name, model, serial number
- Firmware version
- Device type (IPC / NVR / DVR / PTZ / Thermal / Speed Dome)
- Channel count

#### 3. Platform Status Detection
- **GB28181**: enabled flag, SIP registration status (online/unregistered/offline)
- **EHome / ISUP**: version, server address, registration status
- **EZVIZ Cloud**: access status

#### 4. Network Quality MOS Score (Manual Trigger)
- After scan completes, each device row shows a **Test** button
- Sends 8 HTTP probes, measures latency, jitter, packet loss
- Calculates MOS score (1.0-4.5) based on ITU-T G.107 E-Model
- Grades A/B/C/D/F for quick link quality assessment
- **Does not affect scan speed** — fully user-triggered

#### 5. Data Export
- One-click CSV export (opens in Excel)

---

### How to Use

#### Option 1: Download the zip (Recommended for end users)

Download the latest archive from [Releases](../../releases):

| File | Description | Size |
|---|---|---|
| `v1.0.0.Windows.zip` | Portable, extract and double-click the `.exe` to run | ~220 MB |

**First launch takes 5-10 seconds** to initialize the embedded Express server, showing a dark loading page before entering the main UI.

##### Steps

**1. Configure scan parameters**

The top toolbar contains all inputs:

| Parameter | Description | Example |
|---|---|---|
| Subnet | CIDR or IP range, comma-separated | `192.168.1.0/24` or `10.0.0.1-50` |
| Username | Device login account | `admin` |
| Password | Device password **(required)** | `Hik12345` |
| Exclude | IPs to skip (optional) | `192.168.1.1,192.168.1.254` |

Click **Advanced** to adjust:
- Scan attempts (default 3, auto-tries Digest/Basic/HTTPS)
- Concurrency (default 20)
- Timeout (default 2000ms)

**2. Start scanning**

1. Fill parameters, click **Start**
2. Progress % shows next to the button (e.g. `42%`)
3. Top-right shows `Found X | Progress X/Y | Time Ns`
4. Devices appear in the table as they're discovered

**3. View results**

Table columns:

| Column | Meaning |
|---|---|
| ☐ | Checkbox for batch ops |
| IP | Device IP (click to copy) |
| MAC | MAC address |
| Name | Device name |
| Model | Device model |
| Serial | Serial number |
| Firmware | Firmware version |
| Protocol | Platform status badges (GB28181 / EHome / EZVIZ, color-coded) |
| Quality | MOS score badge + test button |

**Click any row** to open the device detail modal with 4 tabs:
- **Basic Info** — vendor, model, serial, firmware, channels, risk level
- **Network Quality** — MOS score, latency/jitter/loss, RTT range, sample stats
- **Platform Config** — GB28181 / EHome / EZVIZ detailed parameters
- **RAW ISAPI XML** — raw ISAPI response XML (for debugging)

**4. Test network quality**

1. After scan, find the device in the table
2. Click the **Test** button at row end
3. Button changes to **Testing** (spinner)
4. After ~2-5 seconds, a colored MOS badge appears:

| Badge | MOS | Grade | Meaning |
|---|---|---|---|
| Dark green | 4.0+ | A | Excellent |
| Light green | 3.5+ | B | Good |
| Yellow | 3.0+ | C | Fair |
| Orange | 2.0+ | D | Poor |
| Red | <2.0 | F | Very poor |

5. Hover the badge for detailed tooltip
6. Click device row → Network Quality tab for full details

**5. Export data**

Click **CSV** button in the toolbar to export all scan results to CSV (opens in Excel).

**6. View logs (troubleshooting)**

If no devices found, check the log via app menu:
- **Tools → Open log file** — opens `server.log` in Notepad
- **Tools → Open log directory** — opens the log folder

Log path: `%APPDATA%\security-camera-asset-scanner\server.log`

Log shows per-IP results:
```
[scan] start: total=254 user=admin timeout=2000ms attempts=3 threads=20
[scan] HIT  192.168.1.10 → IPCam (DS-2CD4024P)
[scan] ERR  192.168.1.50 -> connect ETIMEDOUT
[scan] finished: total=254 hit=12 err=0
[quality] done ip=192.168.1.10 mos=4.2 grade=A latency=35ms jitter=4ms loss=0%
```

---

#### Option 2: Build from source (For developers)

##### Requirements
- Node.js 18+
- npm 9+
- Windows 10/11 (build target)

##### Steps

```bash
# 1. Clone
git clone https://github.com/GFC156/security-camera-asset-scanner.git
cd security-camera-asset-scanner

# 2. Install dependencies
npm install

# 3. Run in dev mode (with hot reload)
npm run dev

# 4. Build exe
npm run electron:build
# Output in dist/:
#   - SecurityCameraScanner Setup 0.0.0.exe (NSIS installer)
#   - SecurityCameraScanner 0.0.0.exe (portable)
```

##### npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Build frontend + backend to `dist/` |
| `npm run lint` | TypeScript type check |
| `npm run electron:build` | Package as Windows exe |
| `npm start` | Start the packaged server |

---

### FAQ

#### Q1. No devices found?

Checklist:
1. **Correct subnet** — open a known camera IP in browser to verify
2. **Correct credentials** — log in to a camera via browser first
3. **ISAPI support** — this tool mainly supports Hikvision/Dahua and ISAPI-compatible devices
4. **Firewall** — Windows Firewall may block outbound HTTP
5. **Check log** — `Tools → Open log file` to see per-IP errors

#### Q2. Slow startup / blank screen?

- First launch needs 5-10s to init embedded server — normal
- If stuck > 30s, check `%APPDATA%\security-camera-asset-scanner\server.log`
- End any orphaned `SecurityCameraScanner.exe` processes in Task Manager

#### Q3. Is MOS score accurate?

- MOS is based on network-layer RTT, reflects **link quality**
- Does not include video stream quality (bitrate, resolution, stutter)
- Useful for quick "which camera has network issues" diagnostics
- For video stream quality, use professional tools (e.g. Hikvision iVMS)

#### Q4. Multiple windows opening?

Fixed in latest version via `app.requestSingleInstanceLock()` + `ELECTRON_RUN_AS_NODE`. If still occurs:
1. End all `SecurityCameraScanner.exe` in Task Manager
2. Download the latest version

---

### Tech Stack

- **Frontend**: React 19 + TypeScript + TailwindCSS 4 + Vite 6 + lucide-react
- **Backend**: Express 4 + native Node http/https + crypto (Digest auth)
- **Desktop**: Electron 26 + electron-builder (NSIS + portable)

### Protocol Support

- **ISAPI** (Hikvision international standard API)
- **GB28181** (China national standard for video surveillance)
- **EHome / ISUP** (Hikvision proprietary protocol)
- **EZVIZ Cloud** (EZVIZ cloud platform)

### Use Cases

- Security operations patrol — periodic device status check
- New project acceptance — confirm all devices online, protocols normal
- Troubleshooting — MOS score quickly identifies devices with poor network
- Asset inventory — export CSV for asset ledger

### Project Structure

```
security-camera-asset-scanner/
├── electron/
│   └── main.cjs                 # Electron main process
├── src/
│   ├── components/
│   │   ├── AssetTable.tsx       # Device table + MOS badge
│   │   ├── DeviceDetailModal.tsx # Device detail modal (4 tabs)
│   │   ├── Header.tsx           # Top toolbar (single-line fusion)
│   │   ├── ProgressBanner.tsx   # Status line
│   │   └── StatsOverview.tsx    # Protocol filter chip row
│   ├── utils/
│   │   ├── exporter.ts          # CSV export
│   │   ├── ipUtils.ts           # IP/CIDR parsing
│   │   └── platformUtils.ts    # Protocol info unified parsing
│   ├── App.tsx                  # Main app
│   ├── main.tsx                 # React entry
│   ├── index.css                # Tailwind global styles
│   └── types.ts                 # TypeScript types
├── server.ts                    # Express backend (scan + MOS test)
├── index.html                   # HTML entry
├── vite.config.ts               # Vite config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies and scripts
├── .gitignore
└── README.md
```

### License

MIT

---
---

<a id="中文"></a>
## 中文

一款 Windows 桌面工具,用于**自动发现局域网内的海康/大华及兼容 ISAPI 协议的监控设备**,并采集设备资产信息、平台接入状态、网络质量等。打包成单个 `.exe`,无需安装依赖,双击即可运行。

![license](https://img.shields.io/badge/license-MIT-blue) ![platform](https://img.shields.io/badge/platform-Windows-green) ![electron](https://img.shields.io/badge/Electron-26-blue)

---

### 功能介绍

#### 1. 跨网段自动扫描
- 输入网段(如 `192.168.1.0/24`)或 IP 范围(如 `10.0.0.1-50`)
- 支持排除指定 IP(如网关、本机)
- 多线程并发,扫描 254 个 IP 通常 10-30 秒
- 同时尝试 HTTP / HTTPS,以及 Digest / Basic 鉴权

#### 2. 设备资产信息采集
对每台探测到的设备,自动拉取以下信息:
- IP / MAC 地址
- 设备名称、型号、序列号
- 固件版本
- 设备类型(IPC / NVR / DVR / PTZ / 热成像 / 球机)
- 通道数

#### 3. 平台接入状态检测
- **GB28181**:是否启用、SIP 注册状态(在线/未注册/离线)
- **EHome / ISUP**:版本号、服务器地址、注册状态
- **萤石云**:接入状态

#### 4. 网络质量 MOS 评分(主动测试)
- 扫描完成后,每台设备可独立点击 **测速** 按钮
- 8 次 HTTP 探测,测量延迟、抖动、丢包率
- 基于 ITU-T G.107 E-Model 计算 MOS 综合评分 (1.0-4.5)
- 评级 A/B/C/D/F,直观判断监控链路质量
- **不影响扫描速率**:扫描时不会自动测,完全用户主动触发

#### 5. 数据导出
- 一键导出 CSV(Excel 可直接打开)

---

### 如何使用

#### 方式一:下载压缩包直接运行(推荐普通用户)

从 [GitHub Releases](../../releases) 下载最新的压缩包:

| 文件 | 说明 | 大小 |
|---|---|---|
| `v1.0.0.Windows.zip` | 免安装版,解压后双击 `.exe` 即可运行 | ~220 MB |

**首次启动可能需要 5-10 秒**(内嵌 Express 服务初始化),会显示深色 loading 页面,然后自动进入主界面。

##### 操作步骤

**1. 配置扫描参数**

启动后顶部一行工具栏:

| 参数 | 说明 | 示例 |
|---|---|---|
| 网段 | CIDR 或 IP 范围,支持逗号分隔多个 | `192.168.1.0/24` 或 `10.0.0.1-50` |
| 账号 | 监控设备登录账号 | `admin` |
| 密码 | 监控设备密码 **(必填)** | `Hik12345` |
| 排除 | 要跳过的 IP,可选 | `192.168.1.1,192.168.1.254` |

点击 **高级** 可调整:
- 扫描尝试次数(默认 3,自动尝试 Digest/Basic/HTTPS)
- 并发线程数(默认 20)
- 超时时间(默认 2000ms)

**2. 开始扫描**

1. 填好参数,点击 **开始** 按钮
2. 按钮旁实时显示进度百分比(如 `42%`)
3. 顶部右侧显示 `发现 X | 进度 X/Y | 用时 Ns`
4. 扫描过程中设备会逐条出现在表格里

**3. 查看结果**

表格列说明:

| 列 | 含义 |
|---|---|
| ☐ | 多选框,用于批量操作 |
| IP | 设备 IP(可点击复制) |
| MAC | 设备 MAC 地址 |
| 名称 | 设备名称 |
| 型号 | 设备型号 |
| 序列号 | 设备序列号 |
| 固件 | 固件版本 |
| 协议 | 平台接入状态 badge(GB28181 / EHome / 萤石云,带颜色边框) |
| 质量 | MOS 评分 badge + 测速按钮 |

**点击任意一行** 打开设备详情弹窗,包含 4 个 Tab:
- **设备基础信息** — 厂商、型号、序列号、固件、通道数、风险等级
- **网络质量** — MOS 综合评分、延迟/抖动/丢包、RTT 范围、采样统计
- **平台协议配置** — GB28181 / EHome / 萤石云 的详细接入参数
- **RAW ISAPI XML** — 原始 ISAPI 响应 XML(调试用)

**4. 测试网络质量**

1. 扫描完成后,在表格里找到要测的设备
2. 点击行末 **[测速]** 按钮
3. 按钮变为 **测试中**(spinner 动画)
4. 8 次探测完成后(约 2-5 秒),按钮旁出现彩色 MOS badge:

| Badge | MOS | 评级 | 含义 |
|---|---|---|---|
| 深绿 | 4.0+ | A | 优秀 |
| 浅绿 | 3.5+ | B | 良好 |
| 黄色 | 3.0+ | C | 一般 |
| 橙色 | 2.0+ | D | 较差 |
| 红色 | <2.0 | F | 极差 |

5. 鼠标悬停 badge 查看详细指标 tooltip
6. 点击设备行 → 网络质量 Tab 查看完整详情

**5. 导出数据**

点击顶部 **CSV** 按钮,导出当前所有扫描结果为 CSV 文件,可直接用 Excel 打开。

**6. 查看日志(排查问题)**

如果扫不到设备,从应用菜单查看日志:
- **工具 → 打开日志文件** — 用记事本打开 `server.log`
- **工具 → 打开日志目录** — 打开日志所在文件夹

日志位置:`%APPDATA%\security-camera-asset-scanner\server.log`

日志会显示每个 IP 的探测结果:
```
[scan] start: total=254 user=admin timeout=2000ms attempts=3 threads=20
[scan] HIT  192.168.1.10 → IPCam (DS-2CD4024P)
[scan] ERR  192.168.1.50 -> connect ETIMEDOUT
[scan] finished: total=254 hit=12 err=0
[quality] done ip=192.168.1.10 mos=4.2 grade=A latency=35ms jitter=4ms loss=0%
```

---

#### 方式二:从源码构建(推荐开发者)

##### 环境要求
- Node.js 18+
- npm 9+
- Windows 10/11(打包目标平台)

##### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/GFC156/security-camera-asset-scanner.git
cd security-camera-asset-scanner

# 2. 安装依赖
npm install

# 3. 开发模式运行(带热重载)
npm run dev

# 4. 打包成 exe
npm run electron:build
# 产物在 dist/ 目录:
#   - 安防监控扫描 Setup 0.0.0.exe (NSIS 安装版)
#   - 安防监控扫描 0.0.0.exe (免安装版)
```

##### 可用 npm 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器(端口 3000) |
| `npm run build` | 构建前端 + 后端到 `dist/` |
| `npm run lint` | TypeScript 类型检查 |
| `npm run electron:build` | 打包成 Windows exe |
| `npm start` | 启动打包后的 server |

---

### 常见问题

#### Q1. 扫不到任何设备?

排查清单:
1. **网段是否正确** — 在浏览器访问一台已知摄像头 IP,确认能打开登录页
2. **账号密码是否正确** — 用浏览器单独登录一台摄像头验证
3. **设备是否支持 ISAPI** — 本工具主要支持海康/大华及兼容 ISAPI 的设备,其他品牌可能扫不到
4. **防火墙是否拦截** — Windows 防火墙可能拦截出站 HTTP 请求
5. **看日志** — `工具 → 打开日志文件`,看每台 IP 的具体错误

#### Q2. 启动慢/白屏?

- 首次启动需要 5-10 秒初始化内嵌服务,属正常
- 如果超过 30 秒还没进入主界面,查看 `%APPDATA%\security-camera-asset-scanner\server.log`
- 任务管理器确认没有残留的 `安防监控扫描.exe` 进程,如有请结束

#### Q3. MOS 评分准确吗?

- MOS 基于网络层 RTT 测量,反映**网络链路质量**
- 不包含视频流质量评估(码率、分辨率、卡顿)
- 适合快速判断"哪台监控网络有问题",作为运维参考
- 想测视频流质量,请使用专业工具(如海康 iVMS)

#### Q4. 为什么会弹出多个窗口?

旧版本有此 Bug,新版已通过 `app.requestSingleInstanceLock()` + `ELECTRON_RUN_AS_NODE` 修复。如仍遇到,请:
1. 任务管理器结束所有 `安防监控扫描.exe` 进程
2. 下载最新版本

---

### 技术栈

- **前端**:React 19 + TypeScript + TailwindCSS 4 + Vite 6 + lucide-react
- **后端**:Express 4 + 原生 Node http/https + crypto(Digest 鉴权)
- **桌面**:Electron 26 + electron-builder(NSIS + portable)

### 协议支持

- **ISAPI** (海康威视国际标准 API)
- **GB28181** (国标视频监控联网)
- **EHome / ISUP** (海康私有协议)
- **萤石云** (EZVIZ 云平台接入)

### 适用场景

- 安防运维巡检 — 定期扫描所有监控设备状态
- 新装项目验收 — 确认设备全部上线、协议正常
- 故障排查 — MOS 评分快速定位网络质量差的设备
- 资产盘点 — 导出 CSV 做资产台账

### 项目结构

```
security-camera-asset-scanner/
├── electron/
│   └── main.cjs                 # Electron 主进程(窗口管理 + 子进程启动)
├── src/
│   ├── components/
│   │   ├── AssetTable.tsx       # 设备表格 + MOS badge
│   │   ├── DeviceDetailModal.tsx # 设备详情弹窗(4 Tab)
│   │   ├── Header.tsx           # 顶部工具栏(单行融合)
│   │   ├── ProgressBanner.tsx   # 状态行
│   │   └── StatsOverview.tsx    # 协议过滤器 chip 行
│   ├── utils/
│   │   ├── exporter.ts          # CSV 导出
│   │   ├── ipUtils.ts           # IP/CIDR 解析
│   │   └── platformUtils.ts    # 协议信息统一解析(GB28181/EHome/萤石云)
│   ├── App.tsx                  # 主应用入口
│   ├── main.tsx                 # React 渲染入口
│   ├── index.css                # Tailwind 全局样式
│   └── types.ts                 # TypeScript 类型定义
├── server.ts                    # Express 后端(ISAPI 扫描 + MOS 测速)
├── index.html                   # HTML 入口
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 项目依赖和脚本
├── .gitignore
└── README.md
```

### License

MIT
