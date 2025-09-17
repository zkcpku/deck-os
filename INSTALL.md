# pnpm 配置说明

本项目已配置为支持自动安装和编译原生依赖。

## 配置文件

### .npmrc
- 启用构建脚本
- 自动重建原生模块
- 配置缓存策略

### package.json
- 添加了 `postinstall` 脚本，自动重建 node-pty 模块

### scripts/postinstall.js
- 智能查找 node-pty 模块位置
- 检查编译状态
- 自动重建缺失的原生模块

## 使用方法

运行以下命令即可自动安装所有依赖并编译原生模块：

```bash
pnpm install
```

## 注意事项

- 首次安装可能需要较长时间（需要编译原生模块）
- 确保系统已安装 Python 和编译工具链
- macOS 需要 Xcode Command Line Tools
- Linux 需要 build-essential 和 Python
- Windows 需要 Visual Studio Build Tools