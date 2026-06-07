# 猫咪动作捕捉3D可视化系统

动物行为学实验室专用的3D动作捕捉数据可视化工具，使用原生WebGL手写渲染器，提供高性能的猫咪骨骼运动可视化。

## 功能特性

### 🎬 动作播放控制
- 播放/暂停动画
- 0.25x - 8x 倍速播放
- 逐帧前进/后退
- 时间轴拖动精确定位
- 实时显示当前帧和时间

### 🦴 骨骼线框显示
- 30个关节点的完整猫咪骨骼模型
- 线框+关节球渲染方式
- 不同肢体使用不同颜色编码：
  - 前腿：绿色
  - 后腿：蓝色
  - 尾巴：橙色
  - 头部：红色
  - 脊柱：白色
- 准确还原关节旋转数据

### 📈 运动轨迹绘制
- 显示关节点的运动轨迹
- 渐变色轨迹显示
- 可独立控制各肢体轨迹显示
- 可调节轨迹长度

### 🔍 数据对比分析
- 双视图并排对比播放
- 同步/异步播放控制
- 关节位置差异可视化
- 支持不同猫咪同一动作对比

### 📊 数据格式支持
- CSV格式数据加载
- 高性能流式解析
- 支持几百MB大文件
- 自动识别关节名称列
- 支持元数据注释

## 技术栈

- **渲染引擎**：原生 WebGL2 (无框架)
- **语言**：JavaScript ES6+ Modules
- **数学库**：自定义 vec3 / mat4 / quat
- **服务器**：Nginx (Docker)
- **部署**：Docker Compose

## 快速开始

### 使用 Docker (推荐)

```bash
# 启动服务
docker-compose up -d

# 访问应用
# 打开浏览器访问: http://localhost:8080

# 停止服务
docker-compose down
```

### 使用本地服务器

```bash
# 使用 Python
python -m http.server 8080

# 或使用 Node.js
npx http-server -p 8080
```

## 项目结构

```
.
├── index.html              # 主HTML入口
├── css/
│   └── style.css           # UI样式
├── js/
│   ├── main.js             # 应用入口
│   ├── math/               # 数学库
│   │   ├── vec3.js         # 三维向量
│   │   ├── mat4.js         # 4x4矩阵
│   │   └── quat.js         # 四元数
│   ├── webgl/              # WebGL渲染核心
│   │   ├── shaders.js      # GLSL着色器
│   │   ├── buffers.js      # 缓冲区管理
│   │   └── Renderer.js     # 渲染器
│   ├── animation/          # 动画系统
│   │   ├── CatSkeleton.js  # 骨骼定义与渲染
│   │   ├── AnimationPlayer.js  # 动画播放器
│   │   └── TrajectoryRenderer.js  # 轨迹渲染
│   ├── data/               # 数据加载
│   │   └── CSVParser.js    # CSV解析器
│   ├── controls/           # 控制器
│   │   ├── CameraController.js  # 相机控制
│   │   └── UIController.js      # UI主控制器
│   └── scene/              # 场景管理
│       └── Scene.js        # 场景与对比分析
├── data/
│   └── sample/             # 示例CSV数据
│       ├── generate_sample_data.js
│       └── 猫咪_XXX_动作.csv
├── Dockerfile              # Docker镜像配置
├── docker-compose.yml      # Docker Compose配置
├── nginx.conf              # Nginx服务器配置
└── README.md
```

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| 空格 | 播放/暂停 |
| ← | 上一帧 |
| → | 下一帧 |
| R | 重置视图 |
| 1 | 正视图 |
| 2 | 侧视图 |
| 3 | 俯视图 |
| 4 | 透视图 |

## 鼠标控制

- **左键拖拽**：旋转相机
- **滚轮**：缩放
- **右键拖拽**：平移视图

## CSV数据格式

### 基本格式

```csv
# Cat: 猫咪_001
# Action: 行走
# FPS: 60
# Frames: 240
frame,root_x,root_y,root_z,root_rot_x,root_rot_y,root_rot_z,root_rot_w,spine1_x,...
0,0.000000,1.000000,0.000000,0.000000,0.000000,0.000000,1.000000,...
1,0.000000,1.000000,0.000000,0.000000,0.000000,0.000000,1.000000,...
...
```

### 关节名称

系统支持以下30个关节点：

| 肢体 | 关节 |
|------|------|
| 脊柱 | root, spine1, spine2, spine3, neck |
| 头部 | head, jaw, ear_left, ear_right |
| 前腿 | shoulder_left/right, elbow_left/right, wrist_left/right, paw_left/right |
| 后腿 | hip_left/right, knee_left/right, ankle_left/right, foot_left/right |
| 尾巴 | tail1, tail2, tail3, tail4, tail5 |

## 生成示例数据

```bash
cd data/sample
node generate_sample_data.js
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

需要支持 WebGL2.0 的浏览器。

## 性能优化

- 使用 WebGL2 原生渲染，无框架开销
- Float32Array 优化数据存储
- 分批次CSV解析，避免UI卡顿
- VAO/VBO 复用减少状态切换
- 四元数球面插值保证平滑动画
