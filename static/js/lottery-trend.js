// 加载走势分析数据
function loadTrendAnalysisData(page) {
    $('#trend-analysis-results .data-row').remove(); // 只移除数据行，保留间隔行
    
    // 设置colspan值，移动端和PC端都显示全部13列
    const colspanValue = 13; // 统一使用13列，移动端通过横向滑动查看
    
    $('#trend-analysis-results').append(`<tr class="data-row"><td colspan="${colspanValue}" class="text-center"><i class="bi bi-hourglass-split"></i> 加载数据中...</td></tr>`);
    
    // 判断当前是否在历史页面
    const isHistoryPage = window.location.pathname.includes('/history');
    const urlPath = isHistoryPage ? '/history' : '/';
    
    // 构建API URL
    let url = '/api/lottery/results?page=' + page;
    if (isHistoryPage) {
        url += '&history=1';
    }
    
    // 从DOM中获取最新期号
    const latestQihao = $('#latest-qihao').text().trim();
    console.log('从DOM中获取的最新期号:', latestQihao);
    
    // 初始化未开间隔计数器
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
    
    // 使用AJAX获取数据
    $.get(url)
        .done(function(response) {
            if (response.status === 'success') {
                // 移除加载状态行
                $('#trend-analysis-results .data-row').remove();
                
                // 检查是否有数据
                if (response.data && response.data.length > 0) {
                    // 获取数据并倒序排列（最新的在最前面）
                    const data = [...response.data].reverse();
                    
                    // 遍历数据并更新未开间隔计数
                    data.forEach(function(item, index) {
                        // 处理大小单双逻辑
                        const isBig = item.size === '大';
                        const isSmall = item.size === '小';
                        const isOdd = item.odd_even === '单';
                        const isEven = item.odd_even === '双';
                        
                        // 处理中边逻辑 (根据config.py中的PATTERN_TYPES定义)
                        const number = parseInt(item.number_sum);
                        const isSmallEdge = number >= 0 && number <= 8;
                        const isMiddle = number >= 9 && number <= 18;
                        const isBigEdge = number >= 19 && number <= 27;
                        
                        // 组合类型
                        const isSmallOdd = isSmall && isOdd;
                        const isSmallEven = isSmall && isEven;
                        const isBigOdd = isBig && isOdd;
                        const isBigEven = isBig && isEven;
                        
                        // 计算各种类型的未开间隔
                        intervals.big = isBig ? 0 : intervals.big + 1;
                        intervals.small = isSmall ? 0 : intervals.small + 1;
                        intervals.odd = isOdd ? 0 : intervals.odd + 1;
                        intervals.even = isEven ? 0 : intervals.even + 1;
                        intervals.smallOdd = isSmallOdd ? 0 : intervals.smallOdd + 1;
                        intervals.smallEven = isSmallEven ? 0 : intervals.smallEven + 1;
                        intervals.bigOdd = isBigOdd ? 0 : intervals.bigOdd + 1;
                        intervals.bigEven = isBigEven ? 0 : intervals.bigEven + 1;
                        intervals.smallEdge = isSmallEdge ? 0 : intervals.smallEdge + 1;
                        intervals.middle = isMiddle ? 0 : intervals.middle + 1;
                        intervals.bigEdge = isBigEdge ? 0 : intervals.bigEdge + 1;
                        
                        // 根据最新期号标记最新行，而不是固定期号
                        const isLatestRow = (item.qihao === latestQihao);
                        const rowClass = isLatestRow ? 'data-row latest-result-row' : 'data-row';
                        
                        // 构建表格行 - 直接显示中文而不是圆点
                        const row = `
                            <tr class="${rowClass}">
                                <td class="text-center">${item.qihao}</td>
                                <td class="text-center">${item.number_sum}</td>
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
                        
                        // 添加到表格中，插入到间隔行后
                        $(row).insertAfter('.interval-row');
                    });
                    
                    // 更新未开间隔值
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
                    
                    // 更新倒计时信息
                    updateTrendCountdown();
                    
                    // 设置第一页为激活状态
                    $('.trend-page-link').removeClass('active');
                    $('.trend-page-link[data-page="' + page + '"]').addClass('active');
                    
                    // 重新应用样式，确保值列正确固定
                    setTimeout(function() {
                        adjustSecondColumnPosition();
                    }, 200);
                } else {
                    // 无数据情况
                    // 统一使用13列，移动端通过横向滑动查看
                    $('#trend-analysis-results').append(`<tr class="data-row"><td colspan="13" class="text-center">暂无数据</td></tr>`);
                }
            } else {
                // 处理错误响应
                // 统一使用13列，移动端通过横向滑动查看
                $('#trend-analysis-results').append(`<tr class="data-row"><td colspan="13" class="text-center">数据加载失败: ${response.message || '未知错误'}</td></tr>`);
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            // AJAX请求失败
            // 统一使用13列，移动端通过横向滑动查看
            $('#trend-analysis-results').append(`<tr class="data-row"><td colspan="13" class="text-center">数据加载失败: ${textStatus}</td></tr>`);
            console.error('AJAX请求失败:', textStatus, errorThrown);
        });
}

// 为移动端的走势表添加滚动检测，处理各种滚动相关的效果
$(document).ready(function() {
    // 立即应用列样式及位置调整
    setTimeout(function() {
        adjustSecondColumnPosition();
    }, 100);
    
    // 检测走势表容器的横向滚动，使用具名事件避免重复绑定
    $('#trend-analysis-container').off('scroll.hideIndicator').on('scroll.hideIndicator', function() {
        if ($(this).scrollLeft() > 10) { // 已经滚动一定距离
            $(this).addClass('scrolled');
        } else {
            $(this).removeClass('scrolled');
        }
    });
    
    // 调整值列的显示效果和位置，确保在滚动时固定在左侧
    function adjustSecondColumnPosition() {
        if (document.body.classList.contains('mobile-mode')) {
            // 获取值列的实际宽度
            const valueColumn = $('#trend-analysis-table th:nth-child(2)');
            if (valueColumn.length) {
                const valueColumnWidth = valueColumn.outerWidth();
                
                // 强制设置期号列为relative定位，确保它可以被滚动
                $('#trend-analysis-table th:first-child, #trend-analysis-table td:first-child').css({
                    'position': 'relative',
                    'z-index': '1'
                });
                
                // 强制设置值列为sticky定位，并使用不透明背景
                $('#trend-analysis-table th:nth-child(2), #trend-analysis-table td:nth-child(2), #trend-analysis-table .interval-row td:nth-child(2)').css({
                    'position': 'sticky',
                    'left': '0',
                    'z-index': '5',
                    'font-weight': 'bold',
                    'background-color': '#e6f0ff', // 使用不透明背景色
                    'border-right': '2px solid #0d6efd',
                    'box-shadow': '2px 0 8px rgba(0,0,0,0.2)'
                });
                
                // 确保表头交叉处正确处理
                $('#trend-analysis-table th:nth-child(2)').css({
                    'z-index': '6'
                });
                
                // 更新滚动提示的位置
                if (valueColumnWidth > 0) {
                    // 放置在值列的右侧边缘
                    const hintPosition = valueColumnWidth + 5;
                    // 通过CSS变量传递位置
                    document.documentElement.style.setProperty('--trend-hint-left', hintPosition + 'px');
                }
                
                // 避免重复绑定事件
                $('#trend-analysis-container').off('scroll.highlightValue').on('scroll.highlightValue', function() {
                    if ($(this).scrollLeft() > 10) {
                        // 滚动时进一步增强值列的视觉效果
                        $('#trend-analysis-table th:nth-child(2), #trend-analysis-table td:nth-child(2), #trend-analysis-table .interval-row td:nth-child(2)').css({
                            'background-color': '#d9e9ff', // 稍深一点的不透明背景色
                            'box-shadow': '2px 0 10px rgba(0,0,0,0.3)'
                        });
                    } else {
                        // 复原初始样式
                        $('#trend-analysis-table th:nth-child(2), #trend-analysis-table td:nth-child(2), #trend-analysis-table .interval-row td:nth-child(2)').css({
                            'background-color': '#e6f0ff', // 恢复不透明背景色
                            'box-shadow': '2px 0 8px rgba(0,0,0,0.2)'
                        });
                    }
                });
            }
        }
    }
    
    // 首次加载和窗口大小变化时调整
    adjustSecondColumnPosition();
    $(window).on('resize', adjustSecondColumnPosition);
    
    // 当走势表变为可见时也调整
    $('.tab-button').click(function() {
        if ($(this).attr('id') === 'trend-btn') {
            // 稍微延迟以确保表格已显示
            setTimeout(adjustSecondColumnPosition, 100);
        }
        });
});

// 初始化走势分析表倒计时
function initTrendCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) {
        console.error('倒计时元素不存在');
        return;
    }
    
    const trendCountdownEl = document.getElementById('trend-countdown');
    if (!trendCountdownEl) {
        console.error('走势分析倒计时元素不存在');
        return;
    }
    
    // 获取最近一次开奖时间和开奖间隔
    const lastDrawTimeStr = countdownEl.getAttribute('data-last-draw-time');
    const lotteryInterval = parseInt(countdownEl.getAttribute('data-lottery-interval') || 210);
    
    if (!lastDrawTimeStr) {
        trendCountdownEl.textContent = '开奖数据不可用';
        return;
    }
    
    // 复用计算下一期开奖时间函数
    function calculateNextDrawTime(currentDrawTime) {
        try {
            // 解析当前开奖时间
            // 支持两种格式：MM-DD HH:MM:SS 或 YYYY-MM-DD HH:MM:SS
            let year, month, day, hour, minute, second;
            
            const [datePart, timePart] = currentDrawTime.split(' ');
            const timeParts = timePart.split(':');
            hour = parseInt(timeParts[0]);
            minute = parseInt(timeParts[1]);
            second = parseInt(timeParts[2]);
            
            const dateParts = datePart.split('-');
            if (dateParts.length === 3) {
                // 格式为 YYYY-MM-DD
                year = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1; // 月份从0开始
                day = parseInt(dateParts[2]);
            } else if (dateParts.length === 2) {
                // 格式为 MM-DD (假设当前年份)
                const currentDate = new Date();
                year = currentDate.getFullYear();
                month = parseInt(dateParts[0]) - 1; // 月份从0开始
                day = parseInt(dateParts[1]);
            } else {
                throw new Error('无法解析日期格式');
            }
            
            // 创建日期对象
            const drawDate = new Date(year, month, day, hour, minute, second);
            
            // 计算下一期开奖时间 (当前开奖时间 + 开奖间隔)
            const nextDrawDate = new Date(drawDate.getTime() + lotteryInterval * 1000);
            
            return nextDrawDate;
        } catch (e) {
            console.error('计算下一期开奖时间出错:', e);
            // 默认返回当前时间3.5分钟后
            const defaultNextDraw = new Date();
            defaultNextDraw.setSeconds(defaultNextDraw.getSeconds() + lotteryInterval);
            return defaultNextDraw;
        }
    }
    
    // 格式化时间为两位数
    function formatTimeUnit(unit) {
        return unit < 10 ? '0' + unit : unit.toString();
    }
    
    // 使用当前最新开奖时间计算下一期开奖时间
    let nextDrawTime = calculateNextDrawTime(lastDrawTimeStr);
    
    // 更新走势分析倒计时显示
    function updateTrendCountdown() {
        const now = new Date();
        
        // 计算剩余时间（秒）
        let remainingTime = Math.floor((nextDrawTime - now) / 1000);
        
        // 判断是否已经过了预计开奖时间
        if (remainingTime <= 0) {
            // 如果已过预计开奖时间，显示"正在开奖中..."
            trendCountdownEl.textContent = '开奖中...';
            return;
        }
        
        // 计算分钟和秒
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        
        // 更新显示
        trendCountdownEl.textContent = `${minutes}:${formatTimeUnit(seconds)}`;
        
        // 继续倒计时
        setTimeout(updateTrendCountdown, 1000);
    }
    
    // 开始倒计时
    updateTrendCountdown();
} 