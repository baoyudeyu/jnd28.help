// 当前选择的日期 - 定义为全局变量
let currentDate = '';

// 页面加载完成后执行
$(document).ready(function() {
    // 初始化当前日期为今天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    currentDate = `${year}-${month}-${day}`;
    
    // 从本地存储加载缓存数据
    loadCachedStatsData();
    
    // 已开统计按钮点击事件
    $('#stats-query-btn').click(function() {
        $(this).addClass('active').siblings().removeClass('active');
        $('#lottery-table-container').hide();
        $('#trend-analysis-container').hide();
        $('#missing-query-container').hide();
        $('#stats-query-container').show();
        
        // 隐藏分页容器，已开统计不需要分页
        $('#pagination-container').hide();
        
        // 如果有缓存数据，先显示缓存数据
        if (lastStatsData) {
            // 更新统计数据显示
            updateStatsDisplay(lastStatsData);
            // 隐藏骨架屏
            $('#stats-skeleton').hide();
            // 显示数据区域
            $('#stats-data').show();
        }
        
        // 加载统计数据（使用全局的currentDate）
        loadStatsData(false, currentDate);
        console.log("统计按钮点击, 使用日期:", currentDate);
        
        // 同步咪牌遮罩状态
        setTimeout(() => {
            if (typeof syncPeekOverlays === 'function') {
                syncPeekOverlays();
            }
        }, 100);
    });
    
    // 添加手动刷新按钮点击事件
    $(document).on('click', '#stats-refresh-btn', function() {
        // 显示刷新中的状态
        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="bi bi-arrow-repeat spin"></i> 刷新中...');
        
        // 确保使用当前选中的日期
        console.log("刷新按钮点击, 使用日期:", currentDate);
        
        // 加载数据（传递自动刷新标志为true，以便使用相同的加载效果）
        loadStatsData(true, currentDate).then(function() {
            // 恢复按钮状态
            $btn.prop('disabled', false).html('<i class="bi bi-arrow-repeat"></i> 刷新数据');
        });
    });
    
    // 日期选择器事件委托（因为日期选择器是动态创建的）
    $(document).on('change', '#stats-date-picker', function() {
        const selectedDate = $(this).val();
        currentDate = selectedDate;
        
        // 更新显示的日期文本
        const formattedDate = selectedDate.replace(/-/g, '/');
        $('#stats-date-display').val(formattedDate);
        
        // 使用选择的日期加载数据
        loadStatsData(false, selectedDate);
    });
});

// 缓存上一次获取的数据
let lastStatsData = null;
// 缓存上一次更新时间
let lastUpdateTime = null;
// 上次显示提示的时间
let lastToastTime = 0;
// 提示消息显示的最小时间间隔（毫秒）
const TOAST_DEBOUNCE_TIME = 5000; // 5秒
// 本地存储键名
const STATS_DATA_STORAGE_KEY = 'pc28_stats_data';
const STATS_UPDATE_TIME_KEY = 'pc28_stats_update_time';
const STATS_DATE_KEY = 'pc28_stats_date';

// 从本地存储加载缓存数据
function loadCachedStatsData() {
    try {
        // 尝试从localStorage获取缓存数据
        const cachedData = localStorage.getItem(STATS_DATA_STORAGE_KEY);
        const cachedUpdateTime = localStorage.getItem(STATS_UPDATE_TIME_KEY);
        const cachedDate = localStorage.getItem(STATS_DATE_KEY);
        
        if (cachedData) {
            lastStatsData = JSON.parse(cachedData);
            lastUpdateTime = cachedUpdateTime || null;
            // 如果有缓存的日期，使用缓存的日期
            if (cachedDate) {
                currentDate = cachedDate;
            }
            console.log('已从本地存储加载统计数据缓存, 日期:', currentDate);
        }
    } catch (e) {
        console.error('从本地存储加载统计数据缓存失败:', e);
    }
}

// 保存缓存数据到本地存储
function saveStatsDataToCache(data, updateTime, date) {
    try {
        localStorage.setItem(STATS_DATA_STORAGE_KEY, JSON.stringify(data));
        if (updateTime) {
            localStorage.setItem(STATS_UPDATE_TIME_KEY, updateTime);
        }
        if (date) {
            localStorage.setItem(STATS_DATE_KEY, date);
        }
        console.log('已保存统计数据到本地存储, 日期:', date);
    } catch (e) {
        console.error('保存统计数据到本地存储失败:', e);
    }
}

// 添加显示消息提示的防抖函数
function debouncedShowToast(title, message, type) {
    const now = Date.now();
    if (now - lastToastTime > TOAST_DEBOUNCE_TIME) {
        showStatsToast(title, message, type);
        lastToastTime = now;
    } else {
        console.log('提示消息被防抖忽略:', title, message);
    }
}

// 使用全局的calculateHash函数，已在lottery.js中定义

// 加载统计数据
function loadStatsData(isAutoRefresh = false, dateParam = '') {
    // 如果提供了日期参数，更新全局变量
    if (dateParam) {
        currentDate = dateParam;
    }
    
    console.log("loadStatsData - 使用日期参数:", dateParam, "全局日期:", currentDate);
    
    // 返回Promise，以便在手动刷新按钮点击事件中使用.then()
    return new Promise((resolve, reject) => {
        // 初始加载时显示骨架屏，但如果已有缓存数据则不显示
        if (!isAutoRefresh) {
            if (!lastStatsData) {
                // 隐藏旧的加载指示器和数据区域
                $('#stats-loading').hide();
                $('#stats-data').hide();
                
                // 显示骨架屏
                $('#stats-skeleton').show();
            }
        } else {
            // 手动刷新时，显示加载蒙层
            if ($('#stats-loading-overlay').length === 0) {
                $('#stats-data').append('<div id="stats-loading-overlay" class="stats-loading-overlay"><div class="stats-loading-spinner"></div></div>');
                // 先设置为可见状态，再添加visible类，实现过渡动画
                setTimeout(function() {
                    $('#stats-loading-overlay').addClass('visible');
                }, 10);
            } else {
                $('#stats-loading-overlay').addClass('visible');
            }
        }
        
        // 准备请求参数
        const params = {};
        // 始终使用全局的currentDate变量
        if (currentDate) {
            params.date = currentDate;
            console.log("API请求参数:", params);
        }
        
        // 调用API获取统计数据
        $.get('/api/stats', params)
            .done(function(response) {
                if (response.status === 'success' && response.data) {
                    // 检查数据是否有变化
                    const currentUpdateTime = response.updated_time || '';
                    const dataChanged = !lastStatsData || 
                                        lastUpdateTime !== currentUpdateTime || 
                                        !compareStatsData(lastStatsData, response.data);
                    
                    // 更新缓存数据和时间戳
                    lastStatsData = response.data;
                    lastUpdateTime = currentUpdateTime;
                    
                    // 保存到本地存储
                    saveStatsDataToCache(response.data, currentUpdateTime, currentDate);
                    
                    // 最后更新时间显示已移除
                    
                    // 只有数据变化时才更新界面
                    if (dataChanged) {
                        // 更新统计数据显示
                        updateStatsDisplay(response.data);
                        
                        // 初始加载时
                        if (!isAutoRefresh) {
                            // 隐藏骨架屏
                            $('#stats-skeleton').hide();
                            // 显示数据区域
                            $('#stats-data').fadeIn(300, function() {
                                // 显示数据后，触发各项数据的淡入动画
                                animateStatsItems();
                            });
                            
                            // 初始加载时显示成功提示
                            debouncedShowToast('成功', '已获取统计数据', 'success');
                        } else {
                            // 手动刷新时，移除加载蒙层
                            $('#stats-loading-overlay').removeClass('visible');
                            setTimeout(function() {
                                $('#stats-loading-overlay').remove();
                                // 更新后，触发各项数据的淡入动画
                                animateStatsItems();
                                
                                // 数据有变化时才显示提示
                                debouncedShowToast('更新', '统计数据已更新', 'info');
                            }, 300); // 等待过渡动画完成
                        }
                    } else {
                        // 数据没有变化
                        
                        // 移除加载蒙层
                        $('#stats-loading-overlay').removeClass('visible');
                        setTimeout(function() {
                            $('#stats-loading-overlay').remove();
                            debouncedShowToast('提示', '数据无变化', 'info');
                        }, 300);
                        
                        // 确保数据区域可见
                        $('#stats-skeleton').hide();
                        $('#stats-data').show();
                        
                        console.log('统计数据无变化，跳过更新');
                    }
                    
                    resolve(dataChanged); // 完成Promise并返回是否有数据变化
                } else {
                    // 如果有缓存数据，使用缓存数据展示
                    if (lastStatsData) {
                        // 使用缓存的数据更新显示
                        updateStatsDisplay(lastStatsData);

                        // 初始加载时处理
                        if (!isAutoRefresh) {
                            // 隐藏骨架屏
                            $('#stats-skeleton').hide();
                            // 显示数据区域
                            $('#stats-data').fadeIn(300, function() {
                                // 显示数据后，触发各项数据的淡入动画
                                animateStatsItems();
                            });
                            
                            debouncedShowToast('提示', '获取新数据失败，显示缓存数据', 'warning');
                        } else {
                            // 手动刷新时处理
                            $('#stats-loading-overlay').removeClass('visible');
                            setTimeout(function() {
                                $('#stats-loading-overlay').remove();
                                debouncedShowToast('提示', '获取新数据失败，使用本地缓存数据', 'warning');
                            }, 300);
                        }
                        
                        reject(new Error('获取统计数据失败，使用缓存数据')); // 拒绝Promise但已显示缓存数据
                    } else {
                        // 没有缓存数据时显示错误信息
                        if (!isAutoRefresh) {
                            // 隐藏骨架屏
                            $('#stats-skeleton').hide();
                            // 显示错误信息
                            $('#stats-loading').html('<div class="alert alert-danger">获取统计数据失败</div>').show();
                        } else {
                            // 手动刷新时，移除加载蒙层
                            $('#stats-loading-overlay').removeClass('visible');
                            setTimeout(function() {
                                $('#stats-loading-overlay').remove();
                            }, 300);
                        }
                        debouncedShowToast('错误', '获取统计数据失败', 'danger');
                        reject(new Error('获取统计数据失败')); // 拒绝Promise
                    }
                }
            })
            .fail(function(xhr) {
                // 如果有缓存数据，使用缓存数据展示
                if (lastStatsData) {
                    // 使用缓存的数据更新显示
                    updateStatsDisplay(lastStatsData);

                    // 初始加载时处理
                    if (!isAutoRefresh) {
                        // 隐藏骨架屏
                        $('#stats-skeleton').hide();
                        // 显示数据区域
                        $('#stats-data').fadeIn(300, function() {
                            // 显示数据后，触发各项数据的淡入动画
                            animateStatsItems();
                        });
                        
                        debouncedShowToast('提示', '无法连接服务器，显示缓存数据', 'warning');
                    } else {
                        // 手动刷新时处理
                        $('#stats-loading-overlay').removeClass('visible');
                        setTimeout(function() {
                            $('#stats-loading-overlay').remove();
                            debouncedShowToast('提示', '连接失败，使用本地缓存数据', 'warning');
                        }, 300);
                    }
                    
                    // 虽然使用了缓存数据，但仍然将Promise标记为失败
                    reject(xhr);
                } else {
                    // 没有缓存数据时显示错误信息
                    if (!isAutoRefresh) {
                        // 隐藏骨架屏
                        $('#stats-skeleton').hide();
                        // 显示错误信息
                        $('#stats-loading').html('<div class="alert alert-danger">网络错误，请稍后重试</div>').show();
                    } else {
                        // 手动刷新时，移除加载蒙层
                        $('#stats-loading-overlay').removeClass('visible');
                        setTimeout(function() {
                            $('#stats-loading-overlay').remove();
                        }, 300);
                    }
                    debouncedShowToast('错误', '网络错误: ' + (xhr.responseJSON?.message || '未知错误'), 'danger');
                    reject(xhr); // 拒绝Promise
                }
            });
    });
}

// 比较两组统计数据是否相同
function compareStatsData(oldData, newData) {
    if (!oldData || !newData) return false;
    
    // 如果有快速哈希函数，先比较哈希值
    const oldHash = calculateHash({
        total_periods: oldData.total_periods,
        basic_types: oldData.basic_types,
        combination_types: oldData.combination_types,
        extreme_types: oldData.extreme_types,
        pattern_types: oldData.pattern_types,
        number_distribution: oldData.number_distribution
    });
    
    const newHash = calculateHash({
        total_periods: newData.total_periods,
        basic_types: newData.basic_types,
        combination_types: newData.combination_types,
        extreme_types: newData.extreme_types,
        pattern_types: newData.pattern_types,
        number_distribution: newData.number_distribution
    });
    
    // 如果哈希相同，则数据相同
    if (oldHash === newHash) {
        return true;
    }
    
    // 哈希不同，进行详细比较
    
    // 检查总期数是否相同
    if (oldData.total_periods !== newData.total_periods) return false;
    
    // 检查基本类型统计是否相同
    for (const key in oldData.basic_types) {
        if (oldData.basic_types[key].count !== newData.basic_types[key].count) return false;
    }
    
    // 检查组合类型统计是否相同
    for (const key in oldData.combination_types) {
        if (oldData.combination_types[key].count !== newData.combination_types[key].count) return false;
    }
    
    // 检查极值类型统计是否相同
    for (const key in oldData.extreme_types) {
        if (oldData.extreme_types[key].count !== newData.extreme_types[key].count) return false;
    }
    
    // 检查特殊牌型统计是否相同
    for (const key in oldData.pattern_types) {
        if (oldData.pattern_types[key].count !== newData.pattern_types[key].count) return false;
    }
    
    // 检查号码分布统计是否相同 - 只比较存在的键
    for (const key in oldData.number_distribution) {
        if (oldData.number_distribution[key] && newData.number_distribution[key]) {
            if (oldData.number_distribution[key].count !== newData.number_distribution[key].count) return false;
        } else if (oldData.number_distribution[key] && !newData.number_distribution[key]) {
            return false;
        }
    }
    
    // 检查新数据中是否有旧数据中不存在的号码
    for (const key in newData.number_distribution) {
        if (!oldData.number_distribution[key] && newData.number_distribution[key] && newData.number_distribution[key].count > 0) {
            return false;
        }
    }
    
    // 所有检查都通过，数据没有变化
    return true;
}

// 触发统计项的淡入动画
function animateStatsItems() {
    // 为每个统计区块添加stats-fade-in类
    $('.stats-section').addClass('stats-fade-in');
    
    // 依次显示每个统计区块
    $('.stats-section').each(function(index) {
        const $this = $(this);
        setTimeout(function() {
            $this.addClass('visible');
        }, 100 * index); // 每个区块延迟100ms显示
    });
}

// 更新统计显示
function updateStatsDisplay(data) {
    // 清空现有内容
    $('#stats-data').empty();
    
    // 创建统计显示容器
    const statsContainer = $('<div class="stats-container"></div>');
    
    // 添加标题、日期选择器和期数显示
    console.log('更新统计显示, 数据:', data);
    
    // 确保日期格式正确
    const displayDate = data.date || new Date().toISOString().split('T')[0];
    
    // 更新全局变量
    currentDate = displayDate;
    
    console.log('显示日期:', displayDate, '总期数:', data.total_periods);
    
    // 检测是否是移动端
    const isMobile = document.body.classList.contains('mobile-mode');
    
    // 构建标题HTML，移动端下不显示刷新按钮
    let headerHtml;
    
    if (isMobile) {
        // 移动端布局 - 无刷新按钮，标题和日期更紧凑
        headerHtml = `
            <div class="stats-header mb-3 bg-primary text-white rounded">
                <div class="d-flex justify-content-between align-items-center p-3">
                    <div class="stats-date-section">
                        <div class="date-select-container position-relative">
                            <input type="text" id="stats-date-display" class="form-control form-control-sm text-white bg-transparent border-light" value="${displayDate.replace(/-/g, '/')}" readonly>
                            <input type="date" id="stats-date-picker" class="position-absolute opacity-0 top-0 start-0 w-100 h-100 cursor-pointer" value="${displayDate}">
                            <i class="bi bi-calendar-date position-absolute top-50 end-0 translate-middle-y me-2"></i>
                        </div>
                    </div>
                    <div class="stats-count-section d-flex align-items-center">
                        <span class="me-2">总期数:</span>
                        <span class="badge bg-white text-primary px-3 rounded-1">${data.total_periods || 0}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        // PC端布局 - 包含刷新按钮
        headerHtml = `
            <div class="stats-header mb-3 bg-primary text-white rounded">
                <div class="d-flex justify-content-between align-items-center p-3">
                    <div class="stats-date-section">
                        <div class="date-select-container position-relative">
                            <input type="text" id="stats-date-display" class="form-control form-control-sm text-white bg-transparent border-light" value="${displayDate.replace(/-/g, '/')}" readonly>
                            <input type="date" id="stats-date-picker" class="position-absolute opacity-0 top-0 start-0 w-100 h-100 cursor-pointer" value="${displayDate}">
                            <i class="bi bi-calendar-date position-absolute top-50 end-0 translate-middle-y me-2"></i>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="stats-count-section d-flex align-items-center me-3">
                            <span class="me-2">总期数:</span>
                            <span class="badge bg-white text-primary px-3 rounded-1">${data.total_periods || 0}</span>
                        </div>
                        <button id="stats-refresh-btn" class="btn btn-sm btn-outline-light">
                            <i class="bi bi-arrow-repeat"></i> 刷新数据
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    statsContainer.append(headerHtml);
    
    // 基本类型统计 - 更新图标，删除重复emoji
    const basicTypesHtml = `
        <div class="stats-section mb-3 border rounded p-3">
            <h6 class="stats-title border-bottom pb-2 fw-bold">基本类型</h6>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-primary">单</span>: ${data.basic_types.odd.count}期(${data.basic_types.odd.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-danger">双</span>: ${data.basic_types.even.count}期(${data.basic_types.even.percentage}%)
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-danger">大</span>: ${data.basic_types.big.count}期(${data.basic_types.big.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-primary">小</span>: ${data.basic_types.small.count}期(${data.basic_types.small.percentage}%)
                </div>
            </div>
        </div>
    `;
    statsContainer.append(basicTypesHtml);
    
    // 组合类型统计 - 更新图标，删除重复emoji
    const combinationTypesHtml = `
        <div class="stats-section mb-3 border rounded p-3">
            <h6 class="stats-title border-bottom pb-2 fw-bold">组合类型</h6>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-primary">小单</span>: ${data.combination_types.small_odd.count}期(${data.combination_types.small_odd.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-danger">大双</span>: ${data.combination_types.big_even.count}期(${data.combination_types.big_even.percentage}%)
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-danger">小双</span>: ${data.combination_types.small_even.count}期(${data.combination_types.small_even.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-primary">大单</span>: ${data.combination_types.big_odd.count}期(${data.combination_types.big_odd.percentage}%)
                </div>
            </div>
        </div>
    `;
    statsContainer.append(combinationTypesHtml);
    
    // 极值类型统计 - 更新图标，删除重复emoji
    const extremeTypesHtml = `
        <div class="stats-section mb-3 border rounded p-3">
            <h6 class="stats-title border-bottom pb-2 fw-bold">极值类型</h6>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-primary">极小</span>: ${data.extreme_types.extreme_small.count}期(${data.extreme_types.extreme_small.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-danger">极大</span>: ${data.extreme_types.extreme_big.count}期(${data.extreme_types.extreme_big.percentage}%)
                </div>
            </div>
        </div>
    `;
    statsContainer.append(extremeTypesHtml);
    
    // 特殊牌型统计 - 更新图标，删除重复emoji
    const patternTypesHtml = `
        <div class="stats-section mb-3 border rounded p-3">
            <h6 class="stats-title border-bottom pb-2 fw-bold">特殊牌型</h6>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-success">杂六</span>: ${data.pattern_types.mixed.count}期(${data.pattern_types.mixed.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-warning text-dark">对子</span>: ${data.pattern_types.pair.count}期(${data.pattern_types.pair.percentage}%)
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <span class="badge bg-warning text-dark">顺子</span>: ${data.pattern_types.straight.count}期(${data.pattern_types.straight.percentage}%)
                </div>
                <div class="col-6">
                    <span class="badge bg-purple text-white">豹子</span>: ${data.pattern_types.triple.count}期(${data.pattern_types.triple.percentage}%)
                </div>
            </div>
        </div>
    `;
    statsContainer.append(patternTypesHtml);
    
    // 号码分布统计 - 确保按照00-27的顺序排列
    let numberDistributionHtml = `
        <div class="stats-section mb-3 border rounded p-3">
            <h6 class="stats-title border-bottom pb-2 fw-bold">号码分布</h6>
    `;
    
    // 创建排序后的号码数组
    const numbersArray = [];
    for (let i = 0; i <= 27; i++) {
        const numKey = i.toString().padStart(2, '0');
        if (data.number_distribution[numKey]) {
            numbersArray.push([numKey, data.number_distribution[numKey]]);
        }
    }
    
    // 每行显示2个号码
    const numRows = Math.ceil(numbersArray.length / 2);
    
    for (let i = 0; i < numRows; i++) {
        numberDistributionHtml += '<div class="row mt-1">';
        
        // 第一列
        if (i * 2 < numbersArray.length) {
            const [number, stats] = numbersArray[i * 2];
            numberDistributionHtml += `
                <div class="col-6">
                    <span class="badge bg-info text-dark">${number}号</span>: ${stats.count}期(${stats.percentage.toFixed(1)}%)
                </div>
            `;
        }
        
        // 第二列
        if (i * 2 + 1 < numbersArray.length) {
            const [number, stats] = numbersArray[i * 2 + 1];
            numberDistributionHtml += `
                <div class="col-6">
                    <span class="badge bg-info text-dark">${number}号</span>: ${stats.count}期(${stats.percentage.toFixed(1)}%)
                </div>
            `;
        }
        
        numberDistributionHtml += '</div>';
    }
    
    numberDistributionHtml += `
        </div>
    `;
    
    statsContainer.append(numberDistributionHtml);
    
    // 添加到页面
    $('#stats-data').append(statsContainer);
}

// 显示消息提示
function showStatsToast(title, message, type) {
    // 使用通用的Toast函数，如果已定义
    if (typeof showToast === 'function') {
        showToast(title, message, type);
    } else {
        // 简单的提示，如果通用函数不可用
        alert(title + ': ' + message);
    }
} 