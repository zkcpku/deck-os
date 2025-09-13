#!/bin/bash

echo "=== Terminal功能测试 ==="

# 测试基本命令
echo "1. 测试基本命令 (pwd, ls, echo)"
echo "在terminal中运行: pwd"
echo "在terminal中运行: ls -la"
echo "在terminal中运行: echo 'Hello World'"

# 测试交互式程序
echo ""
echo "2. 测试tmux"
echo "在terminal中运行: tmux"
echo "应该能够正常启动tmux会话"

echo ""
echo "3. 测试python"
echo "在terminal中运行: python3"
echo "应该能够进入Python REPL"

echo ""
echo "4. 测试Ctrl+C"
echo "在运行任何程序时，按Ctrl+C应该能够中断程序"

echo ""
echo "请打开浏览器访问 http://localhost:3900 并测试上述功能"