// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 高亮显示大小单双结果
    highlightResults();
    
    // 初始化设备模式
    initializeDeviceMode();
    
    // 设备模式切换按钮点击事件
    const toggleButton = document.getElementById('toggle-device-mode');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDeviceMode);
        
        // 添加双击事件，重置用户模式偏好，恢复自动检测
        toggleButton.addEventListener('dblclick', function(e) {
            e.preventDefault();
            resetUserModePreference();
        });
    }
    
    // 初始化暂无数据的colspan属性
    adjustNoDataColspan();
    
    // 初始化响应式缩放
    initResponsiveScaling();
});

// 判断当前设备是否应该使用移动端模式
function shouldUseMobileMode() {
    // 检查窗口宽度
    const windowWidth = window.innerWidth;
    // 小于768px的设备一般认为是移动设备
    return windowWidth < 768;
}

// 初始化设备模式
function initializeDeviceMode() {
    // 从本地存储中获取之前设置的设备模式（如果有）
    const savedMode = localStorage.getItem('deviceMode');
    const userModePreference = localStorage.getItem('userModePreference'); // 新增：记录用户是否手动设置过模式
    const appBody = document.getElementById('app-body');
    const modeText = document.getElementById('device-mode-text');
    
    // 如果用户没有手动设置过模式，则根据窗口大小自动检测
    if (!userModePreference) {
        const shouldBeMobile = shouldUseMobileMode();
        if (shouldBeMobile) {
            appBody.classList.remove('pc-mode');
            appBody.classList.add('mobile-mode');
            if (modeText) modeText.textContent = '切换到PC端';
            
            // 保存自动检测的模式，但不标记为用户手动选择
            localStorage.setItem('deviceMode', 'mobile');
            
            // 启用响应式缩放
            updateResponsiveScaling();
        } else {
            appBody.classList.remove('mobile-mode');
            appBody.classList.add('pc-mode');
            if (modeText) modeText.textContent = '切换到移动端';
            
            // 保存自动检测的模式，但不标记为用户手动选择
            localStorage.setItem('deviceMode', 'pc');
        }
    } else {
        // 用户手动设置过模式，优先使用用户的选择
        if (savedMode === 'mobile') {
            appBody.classList.remove('pc-mode');
            appBody.classList.add('mobile-mode');
            if (modeText) modeText.textContent = '切换到PC端';
            
            // 启用响应式缩放
            updateResponsiveScaling();
        } else {
            appBody.classList.remove('mobile-mode');
            appBody.classList.add('pc-mode');
            if (modeText) modeText.textContent = '切换到移动端';
        }
    }
    
    // 调整暂无数据的colspan属性
    adjustNoDataColspan();
}

// 切换设备模式
function toggleDeviceMode() {
    const appBody = document.getElementById('app-body');
    const modeText = document.getElementById('device-mode-text');
    
    if (appBody.classList.contains('pc-mode')) {
        // 切换到移动端模式
        appBody.classList.remove('pc-mode');
        appBody.classList.add('mobile-mode');
        if (modeText) modeText.textContent = '切换到PC端';
        localStorage.setItem('deviceMode', 'mobile');
        localStorage.setItem('userModePreference', 'true'); // 标记为用户手动选择
        
        // 启用响应式缩放
        updateResponsiveScaling();
    } else {
        // 切换到PC端模式
        appBody.classList.remove('mobile-mode');
        appBody.classList.add('pc-mode');
        if (modeText) modeText.textContent = '切换到移动端';
        localStorage.setItem('deviceMode', 'pc');
        localStorage.setItem('userModePreference', 'true'); // 标记为用户手动选择
        
        // 重置任何缩放调整
        resetResponsiveScaling();
    }
    
    // 调整暂无数据的colspan属性
    adjustNoDataColspan();
}

// 初始化响应式缩放
function initResponsiveScaling() {
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(function() {
        // 检查是否有用户手动设置的模式偏好
        const userModePreference = localStorage.getItem('userModePreference');
        
        // 如果用户没有手动设置过，则根据窗口大小自动调整模式
        if (!userModePreference) {
            const shouldBeMobile = shouldUseMobileMode();
            const appBody = document.getElementById('app-body');
            const modeText = document.getElementById('device-mode-text');
            const currentlyMobile = appBody.classList.contains('mobile-mode');
            
            // 如果检测结果与当前模式不同，则切换模式
            if (shouldBeMobile !== currentlyMobile) {
                if (shouldBeMobile) {
                    appBody.classList.remove('pc-mode');
                    appBody.classList.add('mobile-mode');
                    if (modeText) modeText.textContent = '切换到PC端';
                    localStorage.setItem('deviceMode', 'mobile');
                    
                    // 启用响应式缩放
                    updateResponsiveScaling();
                } else {
                    appBody.classList.remove('mobile-mode');
                    appBody.classList.add('pc-mode');
                    if (modeText) modeText.textContent = '切换到移动端';
                    localStorage.setItem('deviceMode', 'pc');
                    
                    // 重置缩放调整
                    resetResponsiveScaling();
                }
                
                // 调整暂无数据的colspan属性
                adjustNoDataColspan();
            }
        }
        
        // 如果当前是移动端模式，更新响应式缩放
        if (document.body.classList.contains('mobile-mode')) {
            updateResponsiveScaling();
        }
    }, 250));
    
    // 监听设备方向变化
    window.addEventListener('orientationchange', function() {
        if (document.body.classList.contains('mobile-mode')) {
            // 方向改变时稍微延迟更新以确保视口已正确调整
            setTimeout(updateResponsiveScaling, 300);
        }
    });
    
    // 初始加载时检测是否为移动端模式
    if (document.body.classList.contains('mobile-mode')) {
        updateResponsiveScaling();
    }
}

// 更新响应式缩放
function updateResponsiveScaling() {
    const viewportWidth = window.innerWidth;
    document.documentElement.style.setProperty('--viewport-width', viewportWidth + 'px');
    
    // 更新缩放比例的CSS变量（实际的缩放计算在CSS中完成）
    const baseWidth = 375; // 基准宽度
    const scaleRatio = viewportWidth / baseWidth;
    
    // 计算各种缩放系数
    // 注意：我们不在JS中更新这些变量，因为CSS中使用了media query和clamp来更好地控制
    
    // 触发重新布局
    document.body.style.visibility = 'hidden';
    setTimeout(function() {
        document.body.style.visibility = '';
    }, 50);
}

// 重置响应式缩放
function resetResponsiveScaling() {
    // 重置CSS变量到默认值
    document.documentElement.style.removeProperty('--viewport-width');
}

// 防抖函数，避免窗口调整事件过于频繁触发
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 调整暂无数据显示的colspan属性
function adjustNoDataColspan() {
    // 调整历史表格的暂无数据列
    const noDataCell = document.querySelector('#lottery-results tr td[colspan="5"]');
    if (noDataCell) {
        if (document.body.classList.contains('mobile-mode')) {
            noDataCell.setAttribute('colspan', '3');
        } else {
            noDataCell.setAttribute('colspan', '5');
        }
    }
    
    // 调整走势分析表格的暂无数据和加载中列
    const isMobileMode = document.body.classList.contains('mobile-mode');
    const trendColspan = isMobileMode ? 10 : 13;
    
    // 处理走势分析表格中的所有数据行
    const trendDataRows = document.querySelectorAll('#trend-analysis-results tr.data-row td[colspan]');
    trendDataRows.forEach(cell => {
        if (cell.getAttribute('colspan') === '13' || cell.getAttribute('colspan') === '10') {
            cell.setAttribute('colspan', trendColspan);
        }
    });
    
    // 如果走势表格是当前可见的，重新加载当前页数据以确保列被正确隐藏/显示
    if (document.getElementById('trend-analysis-container').style.display !== 'none' && typeof loadTrendAnalysisData === 'function') {
        // 获取当前活动页
        const activePage = document.querySelector('.trend-page-link.active');
        const page = activePage ? activePage.getAttribute('data-page') : 1;
        loadTrendAnalysisData(page);
    }
}

// 高亮显示大小单双结果
function highlightResults() {
    // 查找所有结果行
    const rows = document.querySelectorAll('#lottery-results tr');
    
    rows.forEach(row => {
        if(row.cells.length < 6) return; // 跳过无效行
        
        // 找到大小和单双列
        const sizeCell = row.cells[4]; // 第5列：大小
        const oddEvenCell = row.cells[5]; // 第6列：单双
        
        if (sizeCell && oddEvenCell) {
            // 大小列高亮
            if (sizeCell.textContent.includes('大')) {
                sizeCell.classList.add('big');
            } else if (sizeCell.textContent.includes('小')) {
                sizeCell.classList.add('small');
            }
            
            // 单双列高亮
            if (oddEvenCell.textContent.includes('单')) {
                oddEvenCell.classList.add('odd');
            } else if (oddEvenCell.textContent.includes('双')) {
                oddEvenCell.classList.add('even');
            }
        }
    });
    
    // 也高亮显示最新结果卡片中的结果
    highlightLatestResult();
}

// 高亮显示最新结果卡片中的大小单双
function highlightLatestResult() {
    // 已经在模板中使用了条件类，此处不需要额外处理
}

// 重置用户模式偏好，恢复自动检测
function resetUserModePreference() {
    // 移除用户手动设置标记
    localStorage.removeItem('userModePreference');
    
    // 重新根据窗口大小判断应该使用的模式
    const shouldBeMobile = shouldUseMobileMode();
    const appBody = document.getElementById('app-body');
    const modeText = document.getElementById('device-mode-text');
    
    if (shouldBeMobile) {
        appBody.classList.remove('pc-mode');
        appBody.classList.add('mobile-mode');
        if (modeText) modeText.textContent = '切换到PC端';
        localStorage.setItem('deviceMode', 'mobile');
        
        // 启用响应式缩放
        updateResponsiveScaling();
    } else {
        appBody.classList.remove('mobile-mode');
        appBody.classList.add('pc-mode');
        if (modeText) modeText.textContent = '切换到移动端';
        localStorage.setItem('deviceMode', 'pc');
        
        // 重置缩放调整
        resetResponsiveScaling();
    }
    
    // 调整暂无数据的colspan属性
    adjustNoDataColspan();
    
    // 显示提示
    showResetModeMessage();
}

// 显示模式重置提示
function showResetModeMessage() {
    // 创建提示元素
    const messageElement = document.createElement('div');
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = 'rgba(0, 123, 255, 0.9)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 15px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '9999';
    messageElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageElement.style.transition = 'opacity 0.3s ease-in-out';
    messageElement.textContent = '已重置设备模式为自动检测';
    
    // 添加到页面
    document.body.appendChild(messageElement);
    
    // 3秒后移除提示
    setTimeout(function() {
        messageElement.style.opacity = '0';
        setTimeout(function() {
            document.body.removeChild(messageElement);
        }, 300);
    }, 3000);
} 