# STELLAR ECHOES 星の残響

一个 100% 复刻 PlayStation 1 画质特征的网页太空站：五种宇宙场景，一套完整的
PS1 渲染管线，开机动画到暂停菜单的整套 90 年代主机体验。

## 运行

纯静态站，无构建、无依赖安装（Three.js 走 CDN import map）：

```bash
cd real_ps1
python -m http.server 8137
# 打开 http://127.0.0.1:8137
```

## 操作

| 按键 | 功能 |
|---|---|
| Enter / 点击 | 跳过开机、PRESS START 开始 |
| 1 - 5 | 虫洞跳跃到对应场景（每次切换播放跳跃过场） |
| ESC | 暂停菜单（再按返回）；自由飞行时先退出飞行 |
| F | 自由飞行（WASD 移动 / Q E 升降 / 滚轮调速 / Shift 加速） |
| ` (反引号) | 中文调试面板：逐项开关 PS1 效果，实时验证还原度 |
| H | 开关右下角按键提示 |

默认机位是"呼吸镜头"——固定位置带轻微的人体呼吸摆动，按 F 随时接管。

## 五个场景

1. **ORBIT「軌道」** 殖民地战争式舰队决战：条纹巨行星、巡逻主力舰、双机队互射激光、多边形火球爆炸
2. **RING DRIVE「環」** 土星环穿越：开普勒冰晶带视差、逆光恒星、双卫星
3. **DEAD BELT「鉱区」** 废弃采矿场：锈蚀平台、旋转雷达、扫掠探照灯、浓雾剪影
4. **WARP GATE「跳躍」** 虫洞隧道（也是全站的场景切换过场）
5. **OBSERVATION「眺望」** 观景舱：隔着舷窗看蓝色巨行星与双月、滚动数据屏、漂浮咖啡杯

## PS1 还原清单（调试面板可逐项关闭对照）

| 特征 | 实现位置 |
|---|---|
| 320x240 低分辨率帧缓冲 | `js/post.js` 渲染目标 |
| RGB555 15-bit 色彩量化 | 后处理 `floor(c*31+d)/31` |
| 4x4 Bayer 有序抖动 | 后处理，程序化 Bayer 矩阵 |
| 顶点吸附抖动（多边形游泳） | `js/ps1.js` 顶点着色器，NDC 取整到像素格 |
| 仿射纹理映射（纹理弯折） | VS 传 `uv*w`，FS 除以插值 w |
| Gouraud 顶点光照 | 双灯 + 环境光全部在顶点计算 |
| 逐顶点线性距离雾 | 顶点算雾因子，片元混合雾色 |
| 点采样纹理 + 烘焙明暗 | 全部纹理 64-128px canvas 程序生成 |
| CRT 复合信号 | 扫描线 + 色度渗色（YIQ 分离模糊）+ 桶形失真 + 暗角 + 噪点 |
| 30fps 帧率上限 | 主循环累加器，可切 60 |
| 加色混合发光体 | 激光/引擎/爆炸全部 additive sprite |
| 无外部资源 | 纹理、模型、音效、BGM 全部运行时程序生成 |

已知近似项：PS1 无 Z 缓冲导致的逐多边形排序闪烁属硬件行为，WebGL 有深度缓冲，只能近似复刻。

## 文件结构

```
index.html          入口 + import map
css/style.css       主机外壳 UI 样式
js/config.js        常量 + 实时开关 + 截图钩子参数
js/textures.js      程序化 PS1 纹理工厂
js/ps1.js           PS1Material（吸附/仿射/Gouraud/雾）+ 精灵工具
js/post.js          后处理链（量化/抖动/CRT）
js/rig.js           呼吸镜头 + 指针锁定自由飞行
js/audio.js         WebAudio 全合成音效 + 每场景 ambient BGM
js/scene-manager.js 场景注册 + 虫洞转场状态机
js/ui.js            开机动画/标题/暂停菜单/调试面板/HUD
js/scenes/*.js      五个场景
test/               Playwright 截图与交互流测试
```

## 截图钩子（确定性单帧）

```
http://127.0.0.1:8137/?scene=orbit&t=6          # 场景 + 时间点，渲染一帧即停
http://127.0.0.1:8137/?scene=orbit&t=6&fx=nocrt,noaffine,nodither,noquant,nofog,nolight,nojit
```

渲染完成后 `window.__ready = true`，供自动化截图用。

## 测试（可选，仅开发用）

`test/` 下是 Playwright 脚本：`shot.mjs`（五场景确定性截图）、`flow.mjs`（开机到暂停全交互流）、`probe.mjs` / `dump.mjs` / `scan*.mjs`（帧缓冲像素探针与对象转储，调试用）。
运行前 `npm i playwright` 并 `npx playwright install chromium-headless-shell`。
`shots/` 保留最终验收截图（v4_ 前缀为五个场景 + 关特效对照，flow_ 前缀为 UI 界面）。
