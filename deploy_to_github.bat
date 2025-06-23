@echo off
chcp 65001 >nul
echo ==========================================
echo          一键部署到GitHub仓库
echo ==========================================
echo.

:: 设置仓库URL
set REPO_URL=https://github.com/baoyudeyu/jnd28.help.git

:: 检查是否已经初始化git仓库
if not exist ".git" (
    echo [信息] 初始化Git仓库...
    git init
    if errorlevel 1 (
        echo [错误] Git初始化失败，请检查Git是否已安装
        pause
        exit /b 1
    )
)

:: 检查是否已添加远程仓库
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [信息] 添加远程仓库...
    git remote add origin %REPO_URL%
) else (
    echo [信息] 更新远程仓库地址...
    git remote set-url origin %REPO_URL%
)

:: 检查当前分支
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" (
    echo [信息] 创建并切换到main分支...
    git checkout -b main
)

:: 添加所有文件到暂存区
echo [信息] 添加文件到暂存区...
git add .

:: 检查是否有文件需要提交
git diff --cached --quiet
if not errorlevel 1 (
    echo [警告] 没有检测到需要提交的更改
    echo [信息] 尝试强制推送当前状态...
) else (
    echo [信息] 提交更改...
    git commit -m "自动部署: %date% %time%"
)

:: 推送到远程仓库
echo [信息] 推送到GitHub仓库...
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo [错误] 推送失败，可能的原因：
    echo 1. 网络连接问题
    echo 2. 仓库权限问题
    echo 3. Git认证问题
    echo.
    echo [建议] 请检查：
    echo - GitHub仓库是否存在且有写入权限
    echo - Git是否已配置用户名和邮箱
    echo - 是否需要配置SSH密钥或个人访问令牌
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo          部署成功！
echo ==========================================
echo 仓库地址: %REPO_URL%
echo 部署时间: %date% %time%
echo ==========================================
echo.

pause 