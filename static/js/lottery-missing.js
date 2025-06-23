// 页面加载完成后执行
$(document).ready(function() {
    // 从本地存储加载缓存数据
    loadCachedMissingData();
    
    // 遗漏查询按钮点击事件
    $('#missing-query-btn').click(function() {
        $(this).addClass('active').siblings().removeClass('active');
        $('#lottery-table-container').hide();
        $('#trend-analysis-container').hide();
        $('#stats-query-container').hide();
        $('#missing-query-container').show();
        
        // 隐藏分页容器，遗漏查询不需要分页
        $('#pagination-container').hide();
        
        // 如果有缓存数据，先显示缓存数据
        if (lastMissingData) {
            updateMissingDisplay(lastMissingData);
            $('#missing-loading').hide();
            $('#missing-data').show();
        }
        
        // 加载遗漏数据
        loadMissingData();
        
        // 同步咪牌遮罩状态
        setTimeout(() => {
            if (typeof syncPeekOverlays === 'function') {
                syncPeekOverlays();
            }
        }, 100);
    });
    
    // 刷新遗漏数据按钮点击事件 - 更新为与统计一致的样式
    $('#missing-refresh-btn').click(function() {
        // 显示刷新中的状态
        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="bi bi-arrow-repeat spin"></i> 刷新中...');
        
        // 加载数据（传递自动刷新标志为true，以便使用相同的加载效果）
        loadMissingData(true).then(function() {
            // 恢复按钮状态
            $btn.prop('disabled', false).html('<i class="bi bi-arrow-repeat"></i> 刷新数据');
        });
    });
});

// 缓存上一次获取的数据
let lastMissingData = null;
// 缓存上一次更新时间
let lastMissingUpdateTime = null;
// 上次显示提示的时间
let lastMissingToastTime = 0;
// 提示消息显示的最小时间间隔（毫秒）
const MISSING_TOAST_DEBOUNCE_TIME = 5000; // 5秒
// 本地存储键名
const MISSING_DATA_STORAGE_KEY = 'pc28_missing_data';
const MISSING_UPDATE_TIME_KEY = 'pc28_missing_update_time';

// 从本地存储加载缓存数据
function loadCachedMissingData() {
    try {
        // 尝试从localStorage获取缓存数据
        const cachedData = localStorage.getItem(MISSING_DATA_STORAGE_KEY);
        const cachedUpdateTime = localStorage.getItem(MISSING_UPDATE_TIME_KEY);
        
        if (cachedData) {
            lastMissingData = JSON.parse(cachedData);
            lastMissingUpdateTime = cachedUpdateTime || null;
            console.log('已从本地存储加载遗漏数据缓存');
        }
    } catch (e) {
        console.error('从本地存储加载遗漏数据缓存失败:', e);
    }
}

// 保存缓存数据到本地存储
function saveMissingDataToCache(data, updateTime) {
    try {
        localStorage.setItem(MISSING_DATA_STORAGE_KEY, JSON.stringify(data));
        if (updateTime) {
            localStorage.setItem(MISSING_UPDATE_TIME_KEY, updateTime);
        }
        console.log('已保存遗漏数据到本地存储');
    } catch (e) {
        console.error('保存遗漏数据到本地存储失败:', e);
    }
}

// 添加显示消息提示的防抖函数
function debouncedShowMissingToast(title, message, type) {
    const now = Date.now();
    if (now - lastMissingToastTime > MISSING_TOAST_DEBOUNCE_TIME) {
        showToast(title, message, type);
        lastMissingToastTime = now;
    } else {
        console.log('提示消息被防抖忽略:', title, message);
    }
}

// 加载遗漏数据
function loadMissingData(isManualRefresh = false) {
    // 返回Promise，以便在手动刷新按钮点击事件中使用.then()
    return new Promise((resolve, reject) => {
        // 初始加载时显示加载提示，但如果已有缓存数据则不显示
        if (!isManualRefresh) {
            if (!lastMissingData) {
            $('#missing-loading').show();
            $('#missing-data').hide();
            }
        } else {
            // 手动刷新时，添加加载蒙层
            if ($('#missing-data-overlay').length === 0) {
                $('#missing-data').append('<div id="missing-data-overlay" class="position-absolute d-flex justify-content-center align-items-center bg-white bg-opacity-75" style="top:0;left:0;right:0;bottom:0;z-index:10"><i class="bi bi-arrow-repeat fs-1 text-primary spinning"></i></div>');
            }
        }
        
        // 调用API获取遗漏数据
        $.get('/api/missing')
            .done(function(response) {
                if (response.status === 'success' && response.data) {
                    // 检查数据是否有变化
                    const currentUpdateTime = response.updated_time || '';
                    const dataChanged = !lastMissingData || 
                                        lastMissingUpdateTime !== currentUpdateTime || 
                                        !compareMissingData(lastMissingData, response.data);
                    
                    // 更新缓存数据和时间戳
                    lastMissingData = response.data;
                    lastMissingUpdateTime = currentUpdateTime;
                    
                    // 保存到本地存储
                    saveMissingDataToCache(response.data, currentUpdateTime);
                    
                    // 只有数据变化时才更新界面
                    if (dataChanged) {
                        // 更新遗漏数据
                        updateMissingDisplay(response.data);
                        
                        // 初始加载时显示数据区域
                        if (!isManualRefresh) {
                            $('#missing-loading').hide();
                            $('#missing-data').fadeIn();
                            
                            // 初始加载时显示成功提示
                            debouncedShowMissingToast('成功', '已获取遗漏数据', 'success');
                        } else {
                            // 手动刷新时移除加载蒙层
                            $('#missing-data-overlay').fadeOut(300, function() {
                                $(this).remove();
                                
                                // 数据有变化时才显示提示
                                debouncedShowMissingToast('更新', '遗漏数据已更新', 'info');
                            });
                        }
                    } else {
                        // 数据没有变化
                        
                        // 移除加载蒙层（如果存在）
                        if ($('#missing-data-overlay').length > 0) {
                            $('#missing-data-overlay').fadeOut(300, function() {
                                $(this).remove();
                                debouncedShowMissingToast('提示', '数据无变化', 'info');
                            });
                        }
                        
                        // 确保数据区域可见
                        $('#missing-loading').hide();
                        $('#missing-data').show();
                        
                        console.log('遗漏数据无变化，跳过更新');
                    }
                    
                    resolve(dataChanged); // 完成Promise并返回是否有数据变化
                } else {
                    // 如果有缓存数据，使用缓存数据展示
                    if (lastMissingData) {
                        // 显示缓存数据
                        updateMissingDisplay(lastMissingData);
                        
                        // 初始加载时显示数据区域
                        if (!isManualRefresh) {
                            $('#missing-loading').hide();
                            $('#missing-data').fadeIn();
                            debouncedShowMissingToast('提示', '获取新数据失败，显示缓存数据', 'warning');
                        } else {
                            // 手动刷新时移除加载蒙层
                            if ($('#missing-data-overlay').length > 0) {
                                $('#missing-data-overlay').fadeOut(300, function() {
                                    $(this).remove();
                                    debouncedShowMissingToast('提示', '获取新数据失败，使用本地缓存数据', 'warning');
                                });
                            }
                        }
                        
                        reject(new Error('获取遗漏数据失败，使用缓存数据')); // 拒绝Promise但已显示缓存数据
                    } else {
                        // 没有缓存数据时显示错误信息
                    if (!isManualRefresh) {
                        $('#missing-loading').html('<div class="alert alert-danger">获取遗漏数据失败</div>').show();
                    } else {
                        // 移除加载蒙层（如果存在）
                        if ($('#missing-data-overlay').length > 0) {
                            $('#missing-data-overlay').fadeOut(300, function() {
                                $(this).remove();
                            });
                        }
                    }
                    debouncedShowMissingToast('错误', '获取遗漏数据失败', 'danger');
                    
                    reject(new Error('获取遗漏数据失败')); // 拒绝Promise
                    }
                }
            })
            .fail(function(xhr) {
                // 如果有缓存数据，使用缓存数据展示
                if (lastMissingData) {
                    // 显示缓存数据
                    updateMissingDisplay(lastMissingData);
                    
                    // 初始加载时显示数据区域
                    if (!isManualRefresh) {
                        $('#missing-loading').hide();
                        $('#missing-data').fadeIn();
                        debouncedShowMissingToast('提示', '无法连接服务器，显示缓存数据', 'warning');
                    } else {
                        // 手动刷新时移除加载蒙层
                        if ($('#missing-data-overlay').length > 0) {
                            $('#missing-data-overlay').fadeOut(300, function() {
                                $(this).remove();
                                debouncedShowMissingToast('提示', '连接失败，使用本地缓存数据', 'warning');
                            });
                        }
                    }
                    
                    // 虽然使用了缓存数据，但仍然将Promise标记为失败
                    reject(xhr);
                } else {
                    // 没有缓存数据时显示错误信息
                if (!isManualRefresh) {
                    $('#missing-loading').html('<div class="alert alert-danger">网络错误，请稍后重试</div>').show();
                } else {
                    // 移除加载蒙层（如果存在）
                    if ($('#missing-data-overlay').length > 0) {
                        $('#missing-data-overlay').fadeOut(300, function() {
                            $(this).remove();
                        });
                    }
                }
                debouncedShowMissingToast('错误', '网络错误: ' + (xhr.responseJSON?.message || '未知错误'), 'danger');
                
                reject(xhr); // 拒绝Promise
                }
            });
    });
}

// 比较两组遗漏数据是否相同
function compareMissingData(oldData, newData) {
    if (!oldData || !newData) return false;
    
    // 复用计算哈希函数（如果已在全局定义）
    if (typeof calculateHash === 'function') {
        const oldHash = calculateHash(oldData);
        const newHash = calculateHash(newData);
        
        // 如果哈希相同，数据相同
        if (oldHash === newHash) {
            return true;
        }
    }
    
    // 如果没有哈希函数或哈希不同，进行详细比较
    
    // 比较基本类型
    if (oldData.basic && newData.basic) {
        const oldBasic = oldData.basic;
        const newBasic = newData.basic;
        
        const basicKeys = ['dan', 'shuang', 'da', 'xiao', 'dd', 'ds', 'xd', 'xs'];
        for (const key of basicKeys) {
            if ((oldBasic[key] || 0) !== (newBasic[key] || 0)) {
                return false;
            }
        }
    } else if ((oldData.basic && !newData.basic) || (!oldData.basic && newData.basic)) {
        return false;
    }
    
    // 比较形态类型
    if (oldData.pattern && newData.pattern) {
        const oldPattern = oldData.pattern;
        const newPattern = newData.pattern;
        
        const patternKeys = ['dz', 'sz', 'bz', 'zl', 'jd', 'jx'];
        for (const key of patternKeys) {
            if ((oldPattern[key] || 0) !== (newPattern[key] || 0)) {
                return false;
            }
        }
    } else if ((oldData.pattern && !newData.pattern) || (!oldData.pattern && newData.pattern)) {
        return false;
    }
    
    // 比较和值
    if (oldData.sum && newData.sum) {
        const oldSum = oldData.sum;
        const newSum = newData.sum;
        
        // 获取所有可能的和值键
        const allSumKeys = new Set([...Object.keys(oldSum), ...Object.keys(newSum)]);
        
        for (const key of allSumKeys) {
            if ((oldSum[key] || 0) !== (newSum[key] || 0)) {
                return false;
            }
        }
    } else if ((oldData.sum && !newData.sum) || (!oldData.sum && newData.sum)) {
        return false;
    }
    
    // 所有检查通过，数据没有变化
    return true;
}

// 更新遗漏数据显示
function updateMissingDisplay(data) {
    // 清空现有数据
    $('#basic-pattern-missing-body').empty();
    $('#sum-missing-body').empty();
    
    // 构建基本统计和形态统计表格
    if (data.basic && data.pattern) {
        // 合并基本统计和形态统计 - 按要求调整顺序
        const combinedStats = [
            // 大小单双
            { name: '单', value: data.basic.dan || 0, cls: 'text-primary fw-bold fs-6 bg-light rounded px-2' },
            { name: '双', value: data.basic.shuang || 0, cls: 'text-danger fw-bold fs-6 bg-light rounded px-2' },
            { name: '大', value: data.basic.da || 0, cls: 'text-danger fw-bold fs-6 bg-light rounded px-2' }, 
            { name: '小', value: data.basic.xiao || 0, cls: 'text-primary fw-bold fs-6 bg-light rounded px-2' },
            // 组合 - 更新颜色
            { name: '小单', value: data.basic.xd || 0, cls: 'text-primary fw-bold fs-6 bg-light rounded px-2' },
            { name: '大双', value: data.basic.ds || 0, cls: 'text-danger fw-bold fs-6 bg-light rounded px-2' },
            { name: '小双', value: data.basic.xs || 0, cls: 'text-danger fw-bold fs-6 bg-light rounded px-2' },
            { name: '大单', value: data.basic.dd || 0, cls: 'text-primary fw-bold fs-6 bg-light rounded px-2' },
            // 极值 - 更新颜色
            { name: '极小', value: data.pattern.jx || 0, cls: 'text-primary fw-bold fs-6 bg-light rounded px-2' },
            { name: '极大', value: data.pattern.jd || 0, cls: 'text-danger fw-bold fs-6 bg-light rounded px-2' },
            // 形态 - 更新颜色
            { name: '杂六', value: data.pattern.zl || 0, cls: 'text-success fw-bold fs-6 bg-light rounded px-2' },
            { name: '对子', value: data.pattern.dz || 0, cls: 'text-warning fw-bold fs-6 bg-light rounded px-2' },
            { name: '顺子', value: data.pattern.sz || 0, cls: 'text-warning fw-bold fs-6 bg-light rounded px-2' },
            { name: '豹子', value: data.pattern.bz || 0, cls: 'text-purple fw-bold fs-6 bg-light rounded px-2' }
        ];
        
        // 按照两列排列
        for (let i = 0; i < combinedStats.length; i += 2) {
            let row = '<tr>';
            
            // 第一列
            const item1 = combinedStats[i];
            row += `<td class="text-center"><span class="${item1.cls}">${item1.name}</span></td>`;
            row += `<td class="text-center">未开 <span class="text-danger fw-bold">${item1.value}</span> 期</td>`;
            
            // 第二列（如果存在）
            if (i + 1 < combinedStats.length) {
                const item2 = combinedStats[i + 1];
                row += `<td class="text-center"><span class="${item2.cls}">${item2.name}</span></td>`;
                row += `<td class="text-center">未开 <span class="text-danger fw-bold">${item2.value}</span> 期</td>`;
            } else {
                row += '<td colspan="2"></td>';
            }
            
            row += '</tr>';
            $('#basic-pattern-missing-body').append(row);
        }
    }
    
    // 构建和值统计表格
    if (data.sum) {
        // 按照和值排序并两列排列
        const sumStats = [];
        for (let i = 0; i <= 27; i++) {
            const key = `s${i}`;
            if (key in data.sum) {
                sumStats.push({ value: i, missing: data.sum[key] || 0 });
            }
        }
        
        // 按照两列排列
        for (let i = 0; i < sumStats.length; i += 2) {
            let row = '<tr>';
            
            // 第一列
            const item1 = sumStats[i];
            // 使用padStart将数字格式化为两位数
            const formattedValue1 = item1.value.toString().padStart(2, '0');
            row += `<td class="text-center"><span class="text-primary fw-bold fs-6 bg-light rounded px-2">${formattedValue1}</span></td>`;
            row += `<td class="text-center">未开 <span class="text-danger fw-bold">${item1.missing}</span> 期</td>`;
            
            // 第二列（如果存在）
            if (i + 1 < sumStats.length) {
                const item2 = sumStats[i + 1];
                // 使用padStart将数字格式化为两位数
                const formattedValue2 = item2.value.toString().padStart(2, '0');
                row += `<td class="text-center"><span class="text-primary fw-bold fs-6 bg-light rounded px-2">${formattedValue2}</span></td>`;
                row += `<td class="text-center">未开 <span class="text-danger fw-bold">${item2.missing}</span> 期</td>`;
            } else {
                row += '<td colspan="2"></td>';
            }
            
            row += '</tr>';
            $('#sum-missing-body').append(row);
        }
    }
}

// 显示提示信息（复用lottery.js中的函数，如果不存在则定义）
if (typeof showToast !== 'function') {
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
} 