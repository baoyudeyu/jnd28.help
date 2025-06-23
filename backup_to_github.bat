@echo off
chcp 65001 >nul
echo ===============================================
echo           PC28助手平台 - GitHub备份工具
echo ===============================================
echo.

:: 设置变量 - 请根据你的实际情况修改这些值
set REPO_URL=https://github.com/你的用户名/你的仓库名.git
set BRANCH_NAME=main
set COMMIT_MESSAGE=自动备份 - %date% %time%

echo [1/6] 检查Git是否已安装...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到Git，请先安装Git并添加到环境变量中
    echo    下载地址：https://git-scm.com/download/win
    pause
    exit /b 1
)
echo ✅ Git已安装

echo.
echo [2/6] 检查是否为Git仓库...
if not exist ".git" (
    echo 📁 初始化Git仓库...
    git init
    echo ✅ Git仓库初始化完成
) else (
    echo ✅ 已是Git仓库
)

echo.
echo [3/6] 检查远程仓库配置...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo 🔗 添加远程仓库...
    echo    仓库地址: %REPO_URL%
    echo.
    echo ⚠️  请确保已在上方设置正确的GitHub仓库地址
    echo    如果还没有创建GitHub仓库，请先在GitHub上创建
    echo.
    set /p confirm="确认继续？(y/n): "
    if /i not "%confirm%"=="y" (
        echo 操作已取消
        pause
        exit /b 0
    )
    git remote add origin %REPO_URL%
    echo ✅ 远程仓库添加完成
) else (
    echo ✅ 远程仓库已配置
)

echo.
echo [4/6] 添加文件到Git...
:: 创建.gitignore文件（如果不存在）
if not exist ".gitignore" (
    echo 📝 创建.gitignore文件...
    (
        echo # Python缓存文件
        echo __pycache__/
        echo *.pyc
        echo *.pyo
        echo *.pyd
        echo .Python
        echo.
        echo # 虚拟环境
        echo venv/
        echo env/
        echo.
        echo # 日志文件
        echo *.log
        echo logs/*.log
        echo.
        echo # 临时文件
        echo *.tmp
        echo *.temp
        echo.
        echo # IDE配置文件
        echo .vscode/
        echo .idea/
        echo.
        echo # 系统文件
        echo Thumbs.db
        echo .DS_Store
    ) > .gitignore
    echo ✅ .gitignore文件创建完成
)

git add .
echo ✅ 文件添加完成

echo.
echo [5/6] 提交更改...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
    echo ℹ️  没有新的更改需要提交
) else (
    echo ✅ 提交完成
)

echo.
echo [6/6] 推送到GitHub...
echo 🚀 正在推送到远程仓库...
git push -u origin %BRANCH_NAME%
if errorlevel 1 (
    echo.
    echo ❌ 推送失败，可能的原因：
    echo    1. GitHub仓库地址不正确
    echo    2. 没有权限访问仓库
    echo    3. 需要进行身份验证
    echo.
    echo 💡 解决方案：
    echo    1. 检查仓库地址是否正确
    echo    2. 确保已登录GitHub账户
    echo    3. 考虑使用Personal Access Token
    echo.
    pause
    exit /b 1
) else (
    echo ✅ 推送成功！
)

echo.
echo ===============================================
echo           🎉 备份完成！
echo ===============================================
echo 📍 仓库地址: %REPO_URL%
echo 📅 备份时间: %date% %time%
echo 🌿 分支: %BRANCH_NAME%
echo.
echo 💡 提示：
echo    - 如需修改仓库地址，请编辑此bat文件中的REPO_URL变量
echo    - 如遇到身份验证问题，请配置Git凭据或使用SSH密钥
echo    - 建议定期运行此脚本进行代码备份
echo.

pause 