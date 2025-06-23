// 页面加载完成后执行
$(document).ready(function() {
    // 初始化页面元素显示状态
    $('#lottery-table-container').show();
    $('#trend-analysis-container').hide();
    $('#missing-query-container').hide();
    $('#stats-query-container').hide();
    $('#pagination-container').show();
    $('#lottery-records-btn').addClass('active');
    
    // 刷新开奖按钮
    $('#refresh-btn').click(function() {
        const btn = $(this);
        btn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> 刷新中...');
        
        // 调用API刷新开奖数据
        $.get('/api/refresh')
            .done(function(data) {
                // 不再刷新整个页面，而是只获取最新的开奖数据
                fetchAndUpdateLatestResult(btn);
            })
            .fail(function(xhr) {
                // 刷新失败时才显示错误信息
                showToast('错误', '开奖数据刷新失败: ' + (xhr.responseJSON?.message || '未知错误'), 'danger');
                // 恢复按钮状态
                btn.prop('disabled', false).html('<i class="bi bi-arrow-clockwise"></i> 刷新开奖');
            });
    });
    
    // 咪牌按钮切换状态锁定
    let peekSwitching = false;
    
    // 咪牌按钮
    $('#peek-btn').click(function() {
        // 如果正在切换状态，阻止重复操作
        if (peekSwitching) {
            console.log('咪牌正在切换中，请稍候...');
            return;
        }
        
        const btn = $(this);
        const currentStatus = btn.attr('data-status');
        
        // 设置切换锁定
        peekSwitching = true;
        
        // 切换咪牌状态
        if (currentStatus === 'off') {
            // 切换为开启状态
            btn.attr('data-status', 'on');
            btn.html('<i class="bi bi-eye"></i> 咪牌<span class="ms-1 badge bg-success">开启</span>');
            showToast('提示', '咪牌功能已开启', 'success');
            
            // 添加碎玻璃透明遮罩到所有容器
            addPeekGlassOverlays();

            // 初始化刮刮乐效果
            if (window.LotteryScratch) {
                try {
                    // 确保清除任何现有的效果
                    window.LotteryScratch.clear();
                    
                    // 延迟初始化，确保遮罩已完成加载
                    setTimeout(() => {
                        window.LotteryScratch.init();
                        console.log('咪牌功能已开启，涂层已应用');
                        
                        // 延迟解锁，确保所有动画完成
                        setTimeout(() => {
                            peekSwitching = false;
                        }, 300);
                    }, 200);
                } catch (e) {
                    console.error('初始化刮刮乐效果失败:', e);
                    peekSwitching = false;
                }
            } else {
                // 如果没有刮刮乐功能，直接解锁
                setTimeout(() => {
                    peekSwitching = false;
                }, 500);
            }
        } else {
            // 切换为关闭状态
            btn.attr('data-status', 'off');
            btn.html('<i class="bi bi-eye-slash"></i> 咪牌<span class="ms-1 badge bg-secondary">关闭</span>');
            showToast('提示', '咪牌功能已关闭', 'info');
            
            // 移除碎玻璃透明遮罩
            removePeekGlassOverlays();
            
            // 清除刮刮乐效果
            if (window.LotteryScratch) {
                try {
                    window.LotteryScratch.clear();
                    console.log('咪牌功能已关闭，涂层已清除');
                } catch (e) {
                    console.error('清除刮刮乐效果失败:', e);
                }
            }
            
            // 延迟解锁，确保移除动画完成
            setTimeout(() => {
                peekSwitching = false;
            }, 600);
        }
    });
    
    // 开奖记录按钮
    $('#lottery-records-btn').click(function() {
        $(this).addClass('active').siblings().removeClass('active');
        
        // 隐藏所有其他容器，显示开奖记录容器
        $('.content-containers > div').hide();
        $('#lottery-table-container').show();
        
        // 显示分页容器
        $('#pagination-container').show();
        
        // 同步咪牌遮罩状态
        setTimeout(() => {
            syncPeekOverlays();
        }, 100);
    });
    
    // 走势分析按钮
    $('#trend-analysis-btn').click(function() {
        $(this).addClass('active').siblings().removeClass('active');
        $('#lottery-table-container').hide();
        $('#trend-analysis-container').show();
        $('#missing-query-container').hide();
        $('#stats-query-container').hide();
        
        // 显示分页容器
        $('#pagination-container').show();
        
        // 始终加载数据，不再判断表格是否为空
        loadTrendAnalysisData(1);
        
        // 初始化走势分析表倒计时
        initTrendCountdown();
        
        // 同步咪牌遮罩状态
        setTimeout(() => {
            syncPeekOverlays();
        }, 100);
    });
    
    // 高亮显示大小单双结果
    highlightResults();
    
    // 初始化倒计时
    initCountdown();
    
    // 1秒自动检查是否有新开奖数据
    setInterval(function() {
        // 只有在首页才自动刷新数据
        if (window.location.pathname === '/' || window.location.pathname === '') {
            // 检查是否有新数据
            checkAndUpdateLatestResult();
        }
    }, 1000);
    
    // AJAX分页处理
    $('.page-ajax-link').click(function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        
        // 根据当前激活的按钮决定加载哪种数据
        if ($('#lottery-records-btn').hasClass('active')) {
            loadPageData(page);
        } else if ($('#trend-analysis-btn').hasClass('active')) {
            loadTrendAnalysisData(page);
        }
    });
    

    
    // 页面加载完成后检查咪牌状态并同步遮罩
    setTimeout(() => {
        syncPeekOverlays();
    }, 500);
});

// 检查并更新最新开奖信息
function checkAndUpdateLatestResult() {
    $.get('/api/lottery/latest')
        .done(function(response) {
            if (response.status === 'success' && response.data) {
                const latestDomQihao = $('#latest-qihao').text().trim();
                const latestApiQihao = response.data.qihao;
                
                // 如果API返回的期号与当前显示的不同，说明有新数据
                if (latestDomQihao && latestApiQihao && latestDomQihao !== latestApiQihao) {
                    console.log('检测到新开奖数据，更新显示');
                    
                    // 更新最新开奖显示区域（updateLatestResult内部会处理历史记录的更新）
                    updateLatestResult(response.data);
                    
                    // 显示新开奖通知
                    showToast('新开奖', `期号 ${response.data.qihao} 已开奖`, 'success');
                }
            }
        });
}

// 获取并更新最新开奖结果
function fetchAndUpdateLatestResult(refreshBtn) {
    // 获取当前显示的期号，用于后续判断
    const currentQihao = $('#latest-qihao').text().trim();
    
    $.get('/api/lottery/latest')
        .done(function(response) {
            if (response.status === 'success' && response.data) {
                // 判断是否有新数据
                const isNewData = currentQihao && response.data.qihao && currentQihao !== response.data.qihao;
                
                // 更新显示
                updateLatestResult(response.data);
                
                // 恢复按钮状态
                if (refreshBtn) {
                    refreshBtn.prop('disabled', false).html('<i class="bi bi-arrow-clockwise"></i> 刷新开奖');
                }
                
                // 根据是否有新数据显示不同的提示
                if (isNewData) {
                    showToast('成功', `检测到新开奖数据：期号 ${response.data.qihao}`, 'success');
                } else {
                    showToast('提示', '已刷新开奖数据展示，未检测到新期号', 'info');
                }
            } else {
                showToast('提示', '暂无开奖数据', 'info');
                if (refreshBtn) {
                    refreshBtn.prop('disabled', false).html('<i class="bi bi-arrow-clockwise"></i> 刷新开奖');
                }
            }
        })
        .fail(function(xhr) {
            showToast('错误', '获取开奖数据失败: ' + (xhr.responseJSON?.message || '未知错误'), 'danger');
            if (refreshBtn) {
                refreshBtn.prop('disabled', false).html('<i class="bi bi-arrow-clockwise"></i> 刷新开奖');
            }
        });
}

// 更新最新开奖结果DOM
function updateLatestResult(data) {
    // 获取当前显示的期号
    const currentQihao = $('#latest-qihao').text().trim();
    
    // 检查咪牌状态
    const peekStatus = $('#peek-btn').attr('data-status');
    
    // 检查是否有新数据
    const hasNewData = currentQihao && data.qihao && currentQihao !== data.qihao;
    
    if (hasNewData) {
        console.log(`期号更新：${currentQihao} -> ${data.qihao}，刷新历史记录容器`);
        
        // 刷新历史记录容器（重新加载第一页数据）
        if ($('#lottery-records-btn').hasClass('active') && $('#lottery-table-container').is(':visible')) {
            console.log('刷新历史记录表格');
            loadPageData(1);
        }
        
        // 如果当前在走势分析视图，传播新开奖数据到走势表
        if ($('#trend-analysis-btn').hasClass('active') && $('#trend-analysis-container').is(':visible')) {
            console.log('检测到走势分析视图激活，传播新开奖数据到走势表');
            updateTrendAnalysisWithNewData(data);
        }
        
        // 如果当前在统计视图，刷新统计数据
        if ($('#stats-query-btn').hasClass('active') && $('#stats-query-container').is(':visible')) {
            console.log('刷新统计数据');
            loadStatsData();
        }
        
        // 如果当前在遗漏查询视图，刷新遗漏数据
        if ($('#missing-query-btn').hasClass('active') && $('#missing-query-container').is(':visible')) {
            console.log('刷新遗漏数据');
            loadMissingData();
        }
        
        // 如果当前在分析视图，刷新分析数据
        if ($('#analysis-btn').hasClass('active') && $('#analysis-container').is(':visible')) {
            console.log('刷新分析数据');
            // 这里可以添加分析数据的刷新逻辑
        }
    } else {
        console.log('期号未变，仅刷新最新开奖显示');
    }
    
    // 更新期号
    $('#latest-qihao').text(data.qihao);
    
    // 更新倒计时基准时间
    $('#countdown').attr('data-last-draw-time', data.opentime);
    
    // 如果咪牌开启，需要特殊处理以避免涂层被破坏
    if (peekStatus === 'on') {
        // 咪牌开启时，在涂层保护下静默更新数据
        updateDataUnderScratchLayer(data);
    } else {
        // 咪牌未开启时，正常更新显示
        updateDataDisplay(data);
    }
    
    // 重置并重新启动倒计时
    resetCountdown();
}

// 在涂层保护下更新数据（咪牌开启时使用）
function updateDataUnderScratchLayer(data) {
    console.log('咪牌开启状态下静默更新数据');
    
    // 解析开奖号码
    const numbers = data.result.split('+');
    
    // 更新每个号码元素的内容，但不改变DOM结构
    const numberElements = $('#latest-lottery-info .lottery-numbers .lottery-number');
    numbers.forEach((num, index) => {
        if (numberElements.eq(index).length) {
            numberElements.eq(index).text(num);
        }
    });
    
    // 更新和值
    const sumElement = $('#latest-lottery-info .lottery-sum');
    if (sumElement.length) {
        sumElement.text(data.number_sum);
    }
    
    // 更新大小单双结果
    const resultItems = $('#latest-lottery-info .lottery-result-item');
    if (resultItems.length >= 2) {
        // 更新第一个结果项（大小）
        resultItems.eq(0).text(data.size)
            .removeClass('big small')
            .addClass(data.size === '大' ? 'big' : 'small');
        
        // 更新第二个结果项（单双）
        resultItems.eq(1).text(data.odd_even)
            .removeClass('odd even')
            .addClass(data.odd_even === '单' ? 'odd' : 'even');
    }
    
    console.log('数据更新完成，涂层保持不变');
}

// 正常更新数据显示（咪牌未开启时使用）
function updateDataDisplay(data) {
    // 解析开奖号码
    const numbers = data.result.split('+');
    let numbersHtml = '';
    
    // 生成开奖号码HTML
    numbers.forEach((num, index) => {
        numbersHtml += `<span class="lottery-number">${num}</span>`;
        if (index < numbers.length - 1) {
            numbersHtml += '<span class="lottery-operator">+</span>';
        }
    });
    numbersHtml += `<span class="lottery-operator">=</span><span class="lottery-sum">${data.number_sum}</span>`;
    
    // 生成大小单双结果HTML
    const resultHtml = `
        <div class="lottery-result-item ${data.size === '大' ? 'big' : 'small'}">${data.size}</div>
        <div class="lottery-result-item ${data.odd_even === '单' ? 'odd' : 'even'}">${data.odd_even}</div>
    `;
    
    // 更新DOM
    $('#latest-lottery-info .lottery-numbers').html(numbersHtml);
    $('#latest-lottery-info .lottery-result').html(resultHtml);
    
    // 如果是移动端，确保号码行宽度适配
    if (document.body.classList.contains('mobile-mode')) {
        // 移动端下可能需要重新计算布局
        setTimeout(() => {
            const numbersContainer = $('#latest-lottery-info .lottery-numbers');
            // 强制重新计算布局，确保移动端下宽度适配正确
            numbersContainer.css('visibility', 'hidden');
            setTimeout(() => numbersContainer.css('visibility', 'visible'), 50);
        }, 0);
    }
}

// 重置并重新启动倒计时
function resetCountdown() {
    // 如果存在倒计时函数，则重新初始化
    if (typeof initCountdown === 'function') {
        initCountdown();
    }
}

// 高亮显示大小单双结果
function highlightResults() {
    // 组合已经在渲染时添加了样式类，不需要额外处理
    // 此函数保留以兼容旧代码，后续可考虑移除
}

// 显示提示信息
function showToast(title, message, type) {
    // 创建toast元素
    const toastHtml = `
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 1050">
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong>: ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    const toastElement = $(toastHtml);
    $('body').append(toastElement);
    
    // 显示并自动关闭
    const toast = new bootstrap.Toast(toastElement.find('.toast')[0], {
        delay: 3000
    });
    toast.show();
}

// 计算对象的哈希值（简化版）- 全局共享函数
function calculateHash(obj) {
    if (!obj) return '';
    
    // 快速计算基本类型数据的哈希
    if (typeof obj !== 'object') {
        return String(obj);
    }
    
    // 用于对象和数组的哈希计算
    let hash = '';
    
    if (Array.isArray(obj)) {
        // 数组的哈希是所有元素哈希的组合
        obj.forEach(item => {
            hash += calculateHash(item);
        });
        return 'arr:' + hash;
    }
    
    // 对象的哈希是按照排序后的键计算各个值的哈希
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
        // 跳过可能导致循环引用的_id等特殊键
        if (key !== '_id' && key !== 'updated_time' && key !== 'opentime_dt') {
            const val = obj[key];
            hash += key + ':' + calculateHash(val) + ';';
        }
    });
    
    return 'obj:' + hash;
}

// 更新走势分析表的新开奖数据
function updateTrendAnalysisWithNewData(data) {
    console.log('开始更新走势分析表，新开奖数据:', data);
    
    // 检查走势分析表是否存在
    const trendTable = $('#trend-analysis-results');
    if (!trendTable.length) {
        console.log('走势分析表不存在，跳过更新');
        return;
    }
    
    // 移除旧的最新结果行标记
    trendTable.find('.latest-result-row').removeClass('latest-result-row');
    
    // 处理大小单双逻辑
    const isBig = data.size === '大';
    const isSmall = data.size === '小';
    const isOdd = data.odd_even === '单';
    const isEven = data.odd_even === '双';
    
    // 处理中边逻辑
    const number = parseInt(data.number_sum);
    const isSmallEdge = number >= 0 && number <= 8;
    const isMiddle = number >= 9 && number <= 18;
    const isBigEdge = number >= 19 && number <= 27;
    
    // 组合类型
    const isSmallOdd = isSmall && isOdd;
    const isSmallEven = isSmall && isEven;
    const isBigOdd = isBig && isOdd;
    const isBigEven = isBig && isEven;
    
    // 构建新的数据行
    const newRow = `
        <tr class="data-row latest-result-row">
            <td class="text-center">${data.qihao}</td>
            <td class="text-center">${data.number_sum}</td>
            <td class="text-center ${isSmall ? 'small' : ''}">${isSmall ? '小' : ''}</td>
            <td class="text-center ${isBig ? 'big' : ''}">${isBig ? '大' : ''}</td>
            <td class="text-center ${isOdd ? 'odd' : ''}">${isOdd ? '单' : ''}</td>
            <td class="text-center ${isEven ? 'even' : ''}">${isEven ? '双' : ''}</td>
            <td class="text-center ${isSmallOdd ? 'small odd' : ''}">${isSmallOdd ? '小单' : ''}</td>
            <td class="text-center ${isSmallEven ? 'small even' : ''}">${isSmallEven ? '小双' : ''}</td>
            <td class="text-center ${isBigOdd ? 'big odd' : ''}">${isBigOdd ? '大单' : ''}</td>
            <td class="text-center ${isBigEven ? 'big even' : ''}">${isBigEven ? '大双' : ''}</td>
            <td class="text-center ${isSmallEdge ? 'position-small' : ''}">${isSmallEdge ? '小边' : ''}</td>
            <td class="text-center ${isMiddle ? 'position-middle' : ''}">${isMiddle ? '中数' : ''}</td>
            <td class="text-center ${isBigEdge ? 'position-big' : ''}">${isBigEdge ? '大边' : ''}</td>
        </tr>
    `;
    
    // 将新行插入到间隔行后面的第一位
    const intervalRow = trendTable.find('.interval-row');
    if (intervalRow.length) {
        intervalRow.after(newRow);
    } else {
        // 如果没有间隔行，插入到表格开头
        trendTable.prepend(newRow);
    }
    
    // 重新计算未开间隔
    updateTrendIntervals();
    
    // 删除最后一行以保持显示数量一致
    const dataRows = trendTable.find('.data-row');
    if (dataRows.length > 30) { // 假设显示30行数据
        dataRows.last().remove();
    }
    
    // 同步更新走势表的倒计时
    if (typeof initTrendCountdown === 'function') {
        try {
            initTrendCountdown();
            console.log('走势表倒计时已同步更新');
        } catch (e) {
            console.error('更新走势表倒计时失败:', e);
        }
    }
    
    console.log('走势分析表更新完成');
}

// 重新计算走势分析的未开间隔
function updateTrendIntervals() {
    console.log('重新计算走势分析未开间隔');
    
    // 初始化间隔计数器
    let intervals = {
        big: 0,
        small: 0,
        odd: 0,
        even: 0,
        smallOdd: 0,
        smallEven: 0,
        bigOdd: 0,
        bigEven: 0,
        smallEdge: 0,
        middle: 0,
        bigEdge: 0
    };
    
    // 获取所有数据行
    const dataRows = $('#trend-analysis-results .data-row');
    
    // 遍历数据行计算间隔
    dataRows.each(function(index) {
        const row = $(this);
        
        // 获取和值
        const numberSum = parseInt(row.find('td:eq(1)').text());
        
        // 检查各列是否有值来判断类型
        const hasSmall = row.find('td:eq(2)').text().trim() !== '';
        const hasBig = row.find('td:eq(3)').text().trim() !== '';
        const hasOdd = row.find('td:eq(4)').text().trim() !== '';
        const hasEven = row.find('td:eq(5)').text().trim() !== '';
        const hasSmallOdd = row.find('td:eq(6)').text().trim() !== '';
        const hasSmallEven = row.find('td:eq(7)').text().trim() !== '';
        const hasBigOdd = row.find('td:eq(8)').text().trim() !== '';
        const hasBigEven = row.find('td:eq(9)').text().trim() !== '';
        const hasSmallEdge = row.find('td:eq(10)').text().trim() !== '';
        const hasMiddle = row.find('td:eq(11)').text().trim() !== '';
        const hasBigEdge = row.find('td:eq(12)').text().trim() !== '';
        
        // 计算间隔
        intervals.big = hasBig ? 0 : intervals.big + 1;
        intervals.small = hasSmall ? 0 : intervals.small + 1;
        intervals.odd = hasOdd ? 0 : intervals.odd + 1;
        intervals.even = hasEven ? 0 : intervals.even + 1;
        intervals.smallOdd = hasSmallOdd ? 0 : intervals.smallOdd + 1;
        intervals.smallEven = hasSmallEven ? 0 : intervals.smallEven + 1;
        intervals.bigOdd = hasBigOdd ? 0 : intervals.bigOdd + 1;
        intervals.bigEven = hasBigEven ? 0 : intervals.bigEven + 1;
        intervals.smallEdge = hasSmallEdge ? 0 : intervals.smallEdge + 1;
        intervals.middle = hasMiddle ? 0 : intervals.middle + 1;
        intervals.bigEdge = hasBigEdge ? 0 : intervals.bigEdge + 1;
    });
    
    // 更新间隔显示
    $('.big-interval').text(intervals.big);
    $('.small-interval').text(intervals.small);
    $('.odd-interval').text(intervals.odd);
    $('.even-interval').text(intervals.even);
    $('.small-odd-interval').text(intervals.smallOdd);
    $('.small-even-interval').text(intervals.smallEven);
    $('.big-odd-interval').text(intervals.bigOdd);
    $('.big-even-interval').text(intervals.bigEven);
    $('.small-edge-interval').text(intervals.smallEdge);
    $('.middle-interval').text(intervals.middle);
    $('.big-edge-interval').text(intervals.bigEdge);
    
    console.log('未开间隔更新完成:', intervals);
}



// 碎玻璃透明遮罩管理函数
function addPeekGlassOverlays() {
    // 先移除任何现有的遮罩，防止重复添加
    removePeekGlassOverlaysImmediately();
    
    // 需要添加遮罩的容器选择器
    const containerSelectors = [
        '#lottery-table-container',          // 历史开奖表格
        '#trend-analysis-container',         // 走势分析表格
        '#missing-query-container',          // 遗漏查询容器
        '#stats-query-container',            // 统计查询容器
        '#analysis-container'                // 号码分析容器
    ];
    
    containerSelectors.forEach(selector => {
        const container = $(selector);
        if (container.length > 0) {
            // 为容器添加相对定位类
            container.addClass('peek-mode-container');
            
            // 创建碎玻璃遮罩元素
            const overlay = createGlassOverlay();
            
            // 添加遮罩到容器
            container.append(overlay);
            
            // 延迟激活遮罩，创建淡入效果
            setTimeout(() => {
                // 检查遮罩是否仍然存在（防止快速切换时的异常）
                if (overlay.parent().length > 0) {
                    overlay.addClass('active');
                    
                    // 显示提示文字
                    const notice = overlay.find('.peek-notice');
                    setTimeout(() => {
                        if (notice.parent().length > 0) {
                            notice.addClass('show');
                        }
                    }, 300);
                }
            }, 100);
        }
    });
    
    console.log('已为所有容器添加碎玻璃透明遮罩');
}

function removePeekGlassOverlays() {
    // 移除所有遮罩的激活状态
    $('.peek-glass-overlay').removeClass('active');
    $('.peek-notice').removeClass('show');
    
    // 延迟移除DOM元素，等待过渡动画完成
    setTimeout(() => {
        removePeekGlassOverlaysImmediately();
    }, 500);
    
    console.log('已移除所有碎玻璃透明遮罩');
}

// 立即移除遮罩（无动画）
function removePeekGlassOverlaysImmediately() {
    $('.peek-glass-overlay').remove();
    $('.peek-mode-container').removeClass('peek-mode-container');
}

function createGlassOverlay() {
    // 创建主遮罩元素
    const overlay = $('<div class="peek-glass-overlay"></div>');
    
    // 创建额外的不透明背景层
    const opaqueLayer = $('<div class="opaque-base-layer"></div>');
    opaqueLayer.css({
        'position': 'absolute',
        'top': '0',
        'left': '0',
        'right': '0',
        'bottom': '0',
        'background': 'linear-gradient(135deg, rgba(248, 252, 255, 0.98), rgba(245, 250, 255, 0.96))',
        'border-radius': '8px',
        'z-index': '-1'
    });
    
    // 创建浮动粒子容器
    const particlesContainer = $('<div class="floating-particles"></div>');
    
    // 添加浮动粒子
    for (let i = 0; i < 4; i++) {
        const particle = $('<div class="particle"></div>');
        particlesContainer.append(particle);
    }
    
    // 创建边缘光晕
    const edgeGlow = $('<div class="edge-glow"></div>');
    
    // 创建提示文字
    const notice = $('<div class="peek-notice">' +
        '<i class="peek-icon bi bi-eye-fill"></i>' +
        '咪牌模式已开启<br/>内容已隐藏' +
        '</div>');
    
    // 组装遮罩
    overlay.append(opaqueLayer);
    overlay.append(edgeGlow);
    overlay.append(particlesContainer);
    overlay.append(notice);
    
    return overlay;
}

// 检查咪牌状态并同步遮罩
function syncPeekOverlays() {
    const peekStatus = $('#peek-btn').attr('data-status');
    
    if (peekStatus === 'on') {
        // 如果咪牌开启但没有遮罩，添加遮罩
        if ($('.peek-glass-overlay').length === 0) {
            console.log('检测到咪牌开启但无遮罩，重新添加遮罩');
            addPeekGlassOverlays();
        }
    } else {
        // 如果咪牌关闭但有遮罩，移除遮罩
        if ($('.peek-glass-overlay').length > 0) {
            console.log('检测到咪牌关闭但有遮罩，移除遮罩');
            removePeekGlassOverlays();
        }
    }
} 