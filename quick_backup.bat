@echo off
chcp 65001 >nul
echo 🚀 PC28助手平台 - 快速备份到GitHub
echo.

:: 检查是否为Git仓库
if not exist ".git" (
    echo ❌ 当前目录不是Git仓库，请先运行 backup_to_github.bat 进行初始化
    pause
    exit /b 1
)

:: 自动生成提交信息
set COMMIT_MESSAGE=快速备份 - %date% %time%

echo 📝 添加所有更改的文件...
git add .

echo 💾 提交更改...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
    echo ℹ️  没有新的更改需要提交
    echo.
    echo 当前代码已是最新状态！
) else (
    echo 🚀 推送到GitHub...
    git push
    if errorlevel 1 (
        echo ❌ 推送失败，请检查网络连接或身份验证
        pause
        exit /b 1
    ) else (
        echo ✅ 备份成功完成！
    )
)

echo.
echo 📅 备份时间: %date% %time%
echo 🎉 操作完成！

timeout /t 3 /nobreak >nul 