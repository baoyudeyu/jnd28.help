// 初始化倒计时
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) {
        console.error('倒计时元素不存在');
        return;
    }
    
    const countdownStatusEl = document.getElementById('countdown-status');
    
    // 获取最近一次开奖时间和开奖间隔
    const lastDrawTimeStr = countdownEl.getAttribute('data-last-draw-time');
    const lotteryInterval = parseInt(countdownEl.getAttribute('data-lottery-interval') || 210);
    
    console.log('最近开奖时间:', lastDrawTimeStr);
    console.log('开奖间隔:', lotteryInterval);
    
    if (!lastDrawTimeStr) {
        console.error('开奖时间数据无效');
        countdownStatusEl.textContent = '开奖数据不可用';
        return;
    }
    
    // 计算下一期开奖时间
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
            console.log('解析后的开奖时间:', drawDate);
            
            // 计算下一期开奖时间 (当前开奖时间 + 开奖间隔)
            const nextDrawDate = new Date(drawDate.getTime() + lotteryInterval * 1000);
            console.log('计算的下一期开奖时间:', nextDrawDate);
            
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
    
    // 检查倒计时是否已过期的标志
    let isExpired = false;
    
    // 停止所有进行中的倒计时检查
    if (window.countdownTimer) {
        clearTimeout(window.countdownTimer);
    }
    if (window.checkDataTimer) {
        clearTimeout(window.checkDataTimer);
    }
    
    // 更新倒计时显示
    function updateCountdown() {
        const now = new Date();
        
        // 计算剩余时间（秒）
        let remainingTime = Math.floor((nextDrawTime - now) / 1000);
        
        // 判断是否已经过了预计开奖时间
        if (remainingTime <= 0) {
            // 如果已过预计开奖时间，显示"正在开奖中..."，添加脉动动画效果
            countdownStatusEl.textContent = '正在开奖中...';
            countdownEl.classList.add('expiring');
            
            // 添加抖动效果到图标
            const iconEl = document.querySelector('.countdown-icon');
            if (iconEl && !iconEl.classList.contains('shaking')) {
                iconEl.classList.add('shaking');
            }
            
            // 避免重复检查
            if (!isExpired) {
                isExpired = true;
                
                // 检查是否开启了咪牌功能，如果开启则修复涂层
                const peekStatus = $('#peek-btn').attr('data-status');
                if (peekStatus === 'on' && window.LotteryScratch) {
                    console.log('倒计时结束，开始修复咪牌涂层');
                    try {
                        window.LotteryScratch.repairLayers();
                    } catch (e) {
                        console.error('修复涂层失败:', e);
                    }
                }
                
                // 开始检查新数据，每1秒检查一次
                checkNewDataLoop();
            }
            return;
        }
        
        // 计算分钟和秒
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        
        // 更新显示，添加高亮动画效果
        const oldText = countdownStatusEl.textContent;
        const newText = `${minutes}分${formatTimeUnit(seconds)}秒`;
        
        if (oldText !== newText) {
            // 数字变化时添加高亮效果
            countdownStatusEl.textContent = newText;
            
            // 添加数字变化的动画效果
            countdownStatusEl.classList.add('number-change');
            setTimeout(() => {
                countdownStatusEl.classList.remove('number-change');
            }, 300);
        }
        
        // 根据剩余时间设置不同的视觉效果，但不改变背景颜色
        if (remainingTime <= 10) {
            // 最后10秒
            countdownEl.classList.add('expiring');
            
            // 我们不再修改背景颜色
            /*
            const countdownWrapper = document.querySelector('.countdown-wrapper');
            if (countdownWrapper && !countdownWrapper.classList.contains('urgent')) {
                countdownWrapper.classList.add('urgent');
            }
            */
        } else if (remainingTime <= 30) {
            // 30秒内
            countdownEl.classList.remove('expiring');
            
            // 我们不再修改背景颜色
            /*
            const countdownWrapper = document.querySelector('.countdown-wrapper');
            if (countdownWrapper) {
                countdownWrapper.classList.remove('urgent');
                if (!countdownWrapper.classList.contains('warning')) {
                    countdownWrapper.classList.add('warning');
                }
            }
            */
        } else {
            // 正常状态
            countdownEl.classList.remove('expiring');
            
            // 我们不再修改背景颜色
            /*
            const countdownWrapper = document.querySelector('.countdown-wrapper');
            if (countdownWrapper) {
                countdownWrapper.classList.remove('urgent');
                countdownWrapper.classList.remove('warning');
            }
            */
        }
        
        // 继续倒计时
        window.countdownTimer = setTimeout(updateCountdown, 1000);
    }
    
    // 循环检查是否有新数据
    function checkNewDataLoop() {
        // 开始检查新数据的循环
        function startCheckLoop() {
            // 使用AJAX请求获取最新开奖结果
            $.get('/api/lottery/latest')
                .done(function(response) {
                    if (response.status === 'success' && response.data) {
                        const latestResult = response.data;
                        const latestDrawTimeStr = latestResult.opentime;
                        const latestQihao = latestResult.qihao;
                        const currentQihao = $('#latest-qihao').text().trim();
                        
                        // 比较期号是否变化
                        if (latestQihao !== currentQihao) {
                            console.log('检测到新的开奖数据:', latestDrawTimeStr);
                            
                            // 使用外部更新函数更新显示
                            if (typeof updateLatestResult === 'function') {
                                updateLatestResult(latestResult);
                                
                                // 数据更新完成后，检查是否需要修复涂层
                                const peekStatus = $('#peek-btn').attr('data-status');
                                if (peekStatus === 'on' && window.LotteryScratch) {
                                    // 延迟一点时间确保数据更新完成
                                    setTimeout(() => {
                                        console.log('新开奖数据更新完成，修复咪牌涂层');
                                        try {
                                            window.LotteryScratch.repairLayers();
                                        } catch (e) {
                                            console.error('修复涂层失败:', e);
                                        }
                                    }, 200);
                                }
                            } else {
                                // 如果外部函数不存在，则更新相关属性并重启倒计时
                                // 更新开奖时间属性
                                countdownEl.setAttribute('data-last-draw-time', latestDrawTimeStr);
                                
                                // 重新计算下一期开奖时间
                                nextDrawTime = calculateNextDrawTime(latestDrawTimeStr);
                                
                                // 重置UI样式
                                countdownEl.classList.remove('expiring');
                                const iconEl = document.querySelector('.countdown-icon');
                                if (iconEl) {
                                    iconEl.classList.remove('shaking');
                                }
                                
                                /* 不再需要重置背景颜色
                                const countdownWrapper = document.querySelector('.countdown-wrapper');
                                if (countdownWrapper) {
                                    countdownWrapper.classList.remove('urgent');
                                    countdownWrapper.classList.remove('warning');
                                }
                                */
                                
                                isExpired = false;
                                
                                // 检查是否需要修复涂层
                                const peekStatus = $('#peek-btn').attr('data-status');
                                if (peekStatus === 'on' && window.LotteryScratch) {
                                    console.log('开奖数据更新完成，修复咪牌涂层');
                                    try {
                                        window.LotteryScratch.repairLayers();
                                    } catch (e) {
                                        console.error('修复涂层失败:', e);
                                    }
                                }
                                
                                // 添加成功更新的动画效果
                                const container = document.querySelector('.countdown-container');
                                if (container) {
                                    container.classList.add('updated');
                                    setTimeout(() => {
                                        container.classList.remove('updated');
                                    }, 1000);
                                }
                                
                                // 重新开始倒计时
                                updateCountdown();
                            }
                        } else {
                            // 如果没有新数据，继续检查
                            window.checkDataTimer = setTimeout(startCheckLoop, 1000);
                        }
                    } else {
                        // 如果请求失败，继续检查
                        window.checkDataTimer = setTimeout(startCheckLoop, 1000);
                    }
                })
                .fail(function() {
                    // 如果请求失败，继续检查
                    window.checkDataTimer = setTimeout(startCheckLoop, 1000);
                });
        }
        
        // 开始检查循环
        startCheckLoop();
    }
    
    // 开始倒计时
    updateCountdown();
}