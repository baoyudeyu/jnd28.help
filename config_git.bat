@echo off
chcp 65001 >nul
echo ==========================================
echo          配置Git用户信息
echo ==========================================
echo.

:: 设置用户信息
set USERNAME=baoyudeyu
set EMAIL=69718491@qq.com

echo [信息] 正在配置Git用户信息...
echo 用户名: %USERNAME%
echo 邮箱: %EMAIL%
echo.

:: 配置全局用户名和邮箱
git config --global user.name "%USERNAME%"
if errorlevel 1 (
    echo [错误] 配置用户名失败，请检查Git是否已安装
    pause
    exit /b 1
)

git config --global user.email "%EMAIL%"
if errorlevel 1 (
    echo [错误] 配置邮箱失败
    pause
    exit /b 1
)

:: 配置其他有用的Git设置
echo [信息] 配置其他Git设置...
git config --global init.defaultBranch main
git config --global core.autocrlf true
git config --global pull.rebase false

echo.
echo ==========================================
echo          配置完成！
echo ==========================================
echo.

:: 验证配置
echo [验证] 当前Git配置信息：
echo 用户名: 
git config --global user.name
echo 邮箱: 
git config --global user.email
echo 默认分支: 
git config --global init.defaultBranch
echo.

echo [提示] Git配置已完成，现在可以使用deploy_to_github.bat进行部署
echo.

pause 