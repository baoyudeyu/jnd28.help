/**
 * 号码分析功能 
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let selectedNumber = null;
    const defaultPeriods = 200;
    
    // 获取DOM元素
    const analysisBtn = document.getElementById('analysis-btn');
    const analysisContainer = document.getElementById('analysis-container');
    const numberGrid = document.querySelector('.number-grid');
    const periodInput = document.getElementById('analysis-period');
    const refreshBtn = document.getElementById('analysis-refresh-btn');
    const loadingEl = document.getElementById('analysis-loading');
    const resultEl = document.getElementById('analysis-result');
    
    // 生成号码按钮
    function generateNumberButtons() {
        // 清空现有内容
        numberGrid.innerHTML = '';
        
        // 生成 00-27 的按钮，4排7个，共28个按钮
        for (let i = 0; i <= 27; i++) {
            const numStr = i < 10 ? `0${i}` : `${i}`;
            const button = document.createElement('div');
            button.className = 'number-button';
            button.setAttribute('data-number', numStr);
            button.textContent = numStr;
            
            // 添加点击事件
            button.addEventListener('click', function() {
                // 检查是否已经选中，避免重复加载
                if (!this.classList.contains('selected')) {
                    // 移除其他按钮的选中状态
                    document.querySelectorAll('.number-button').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    // 设置当前按钮为选中状态
                    this.classList.add('selected');
                    selectedNumber = numStr;
                    
                    // 显示加载中状态
                    loadingEl.style.display = 'block';
                    resultEl.style.display = 'none';
                    
                    // 立即加载分析数据
                    loadAnalysisData(selectedNumber, periodInput.value);
                }
            });
            
            numberGrid.appendChild(button);
        }
    }
    
    // 点击刷新按钮时重新加载数据
    refreshBtn.addEventListener('click', function() {
        // 检查是否有选中的号码
        const selectedBtn = document.querySelector('.number-button.selected');
        if (selectedBtn) {
            selectedNumber = selectedBtn.getAttribute('data-number');
            loadAnalysisData(selectedNumber, periodInput.value);
        } else {
            // 如果没有选中的号码，尝试获取最新开奖号码
            try {
                const latestResult = document.querySelector('#latest-lottery-info .lottery-sum');
                if (latestResult) {
                    // 获取纯数字内容
                    let numText = latestResult.textContent.trim();
                    const numMatch = numText.match(/\d+/);
                    if (numMatch) {
                        numText = numMatch[0];
                    }
                    
                    selectedNumber = parseInt(numText) < 10 ? `0${parseInt(numText)}` : `${parseInt(numText)}`;
                    
                    // 选中对应号码的按钮
                    const btnToSelect = document.querySelector(`.number-button[data-number="${selectedNumber}"]`);
                    if (btnToSelect) {
                        document.querySelectorAll('.number-button').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        btnToSelect.classList.add('selected');
                    }
                    
                    loadAnalysisData(selectedNumber, periodInput.value);
                }
            } catch (error) {
                console.error('获取最新开奖号码发生错误:', error);
            }
        }
    });
    
    // 点击分析按钮显示分析容器
    analysisBtn.addEventListener('click', function() {
        // 隐藏其他容器
        document.querySelectorAll('.content-containers > div').forEach(container => {
            container.style.display = 'none';
        });
        
        // 隐藏分页控件
        document.getElementById('pagination-container').style.display = 'none';
        
        // 重置按钮状态
        document.querySelectorAll('.card-header .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 设置当前按钮为激活状态
        this.classList.add('active');
        
        // 显示分析容器
        analysisContainer.style.display = 'block';
        
        // 如果还没有生成号码按钮，则生成
        if (numberGrid.children.length === 0) {
            generateNumberButtons();
        }
        
        // 获取最新开奖号码并选中
        try {
            // 直接尝试获取和值元素
            const latestResult = document.querySelector('#latest-lottery-info .lottery-sum');
            if (latestResult) {
                // 获取纯数字内容，去除可能的等号和其他文本
                let numText = latestResult.textContent.trim();
                // 提取数字部分
                const numMatch = numText.match(/\d+/);
                if (numMatch) {
                    numText = numMatch[0];
                }
                
                // 确保是两位数格式
                selectedNumber = parseInt(numText) < 10 ? `0${parseInt(numText)}` : `${parseInt(numText)}`;
                console.log('获取到最新开奖和值:', selectedNumber);
                
                // 选中对应号码的按钮
                const numberButtons = document.querySelectorAll('.number-button');
                let buttonFound = false;
                
                numberButtons.forEach(btn => {
                    if (btn.getAttribute('data-number') === selectedNumber) {
                        buttonFound = true;
                        btn.classList.add('selected'); // 先添加选中样式
                        // 直接加载分析数据而不是点击按钮（避免循环触发）
                        loadAnalysisData(selectedNumber, periodInput.value);
                    } else {
                        btn.classList.remove('selected');
                    }
                });
                
                // 如果没找到对应按钮，选择00号码
                if (!buttonFound) {
                    console.log('未找到对应号码按钮:', selectedNumber);
                    selectedNumber = '00';
                    const defaultBtn = document.querySelector('.number-button[data-number="00"]');
                    if (defaultBtn) {
                        defaultBtn.classList.add('selected');
                        loadAnalysisData('00', periodInput.value);
                    }
                }
            } else {
                // 如果没找到最新开奖结果，默认选择00
                console.log('未找到最新开奖结果元素');
                selectedNumber = '00';
                const defaultBtn = document.querySelector('.number-button[data-number="00"]');
                if (defaultBtn) {
                    defaultBtn.classList.add('selected');
                    loadAnalysisData('00', periodInput.value);
                }
            }
        } catch (error) {
            console.error('获取最新开奖号码发生错误:', error);
            // 出错时默认选择00
            selectedNumber = '00';
            const defaultBtn = document.querySelector('.number-button[data-number="00"]');
            if (defaultBtn) {
                defaultBtn.classList.add('selected');
                loadAnalysisData('00', periodInput.value);
            }
        }
        
        // 同步咪牌遮罩状态
        setTimeout(() => {
            if (typeof syncPeekOverlays === 'function') {
                syncPeekOverlays();
            }
        }, 100);
    });
    
    // 加载分析数据
    function loadAnalysisData(number, periods) {
        if (!number) return;
        
        // 显示加载中
        loadingEl.style.display = 'block';
        resultEl.style.display = 'none';
        
        // 发送AJAX请求获取数据
        fetch(`/api/number_analysis?number=${number}&periods=${periods}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayAnalysisData(data.data);
                } else {
                    console.error('加载分析数据失败:', data.message);
                }
            })
            .catch(error => {
                console.error('请求分析数据失败:', error);
            })
            .finally(() => {
                // 隐藏加载中
                loadingEl.style.display = 'none';
                resultEl.style.display = 'block';
            });
    }
    
    // 显示分析数据
    function displayAnalysisData(data) {
        // 更新分析概要信息，只保留最小间隔和最大间隔
        document.getElementById('analysis-min-interval').textContent = data.min_interval;
        document.getElementById('analysis-max-interval').textContent = data.max_interval;
        
        // 前号码统计
        document.getElementById('before-number').textContent = data.number;
        const beforeNumbersContainer = document.getElementById('before-numbers');
        beforeNumbersContainer.innerHTML = '';
        
        // 创建网格布局容器
        const beforeNumbersGrid = document.createElement('div');
        beforeNumbersGrid.className = 'number-grid-layout';
        
        // 添加前号码项
        data.before_numbers.forEach(item => {
            const numberItem = document.createElement('div');
            numberItem.className = 'number-grid-item';
            numberItem.innerHTML = `
                <span class="number-value">${item.number}</span>
                <span class="number-count">${item.count}次</span>
            `;
            beforeNumbersGrid.appendChild(numberItem);
        });
        
        // 将网格容器添加到主容器
        beforeNumbersContainer.appendChild(beforeNumbersGrid);
        
        // 后号码统计
        document.getElementById('after-number').textContent = data.number;
        const afterNumbersContainer = document.getElementById('after-numbers');
        afterNumbersContainer.innerHTML = '';
        
        // 创建网格布局容器
        const afterNumbersGrid = document.createElement('div');
        afterNumbersGrid.className = 'number-grid-layout';
        
        // 添加后号码项
        data.after_numbers.forEach(item => {
            const numberItem = document.createElement('div');
            numberItem.className = 'number-grid-item';
            numberItem.innerHTML = `
                <span class="number-value">${item.number}</span>
                <span class="number-count">${item.count}次</span>
            `;
            afterNumbersGrid.appendChild(numberItem);
        });
        
        // 将网格容器添加到主容器
        afterNumbersContainer.appendChild(afterNumbersGrid);
        
        // 后续尾数统计
        document.getElementById('after-tail-number').textContent = data.number;
        const afterTailsContainer = document.getElementById('after-tails');
        afterTailsContainer.innerHTML = '';
        
        // 创建网格布局容器
        const tailsGrid = document.createElement('div');
        tailsGrid.className = 'number-grid-layout';
        
        // 添加尾数项
        data.after_tails.forEach(item => {
            const tailItem = document.createElement('div');
            tailItem.className = 'number-grid-item';
            tailItem.innerHTML = `
                <span class="number-value">${item.tail}</span>
                <span class="number-count">${item.count}次</span>
            `;
            tailsGrid.appendChild(tailItem);
        });
        
        // 将网格容器添加到主容器
        afterTailsContainer.appendChild(tailsGrid);
        
        // 后续组合统计
        document.getElementById('after-combo-number').textContent = data.number;
        const afterCombosContainer = document.getElementById('after-combos');
        afterCombosContainer.innerHTML = '';
        
        // 创建网格容器，使用与其他部分相同的布局类
        const comboGridContainer = document.createElement('div');
        comboGridContainer.className = 'number-grid-layout';
        
        // 可能的组合类型（大单、大双、小单、小双）
        const comboTypes = ['大单', '大双', '小单', '小双'];
        
        // 将API返回的组合数据转换为映射
        const comboMap = {};
        data.after_combos.forEach(item => {
            comboMap[item.combo] = item.count;
        });
        
        // 筛选出次数大于0的组合
        const validCombos = comboTypes.filter(comboType => (comboMap[comboType] || 0) > 0);
        
        // 如果有有效组合，才创建组合项
        if (validCombos.length > 0) {
            // 只创建次数大于0的组合项
            validCombos.forEach(comboType => {
                const comboItem = document.createElement('div');
                comboItem.className = 'number-grid-item'; // 使用与其他部分相同的样式类
                
                // 根据组合类型添加对应的CSS类
                let comboClass = '';
                if (comboType.includes('大')) comboClass = 'big';
                else if (comboType.includes('小')) comboClass = 'small';
                
                if (comboType.includes('单')) comboClass += ' odd';
                else if (comboType.includes('双')) comboClass += ' even';
                
                // 获取该组合类型的出现次数
                const count = comboMap[comboType] || 0;
                
                comboItem.innerHTML = `
                    <span class="combo-name ${comboClass}">${comboType}</span>
                    <span class="combo-count">${count}次</span>
                `;
                comboGridContainer.appendChild(comboItem);
            });
            
            // 根据有效组合数调整布局
            if (validCombos.length === 1) {
                // 单个元素时，添加特殊类使其居中
                comboGridContainer.classList.add('single-item');
            } else if (validCombos.length === 2 || validCombos.length === 3) {
                // 2个或3个元素，确保均匀分布
                comboGridContainer.classList.add('few-items');
                
                // 添加空的占位元素，确保flex布局均匀分布
                const itemsToAdd = 5 - validCombos.length; // 每行最多5个元素
                for (let i = 0; i < itemsToAdd; i++) {
                    const placeholderItem = document.createElement('div');
                    placeholderItem.className = 'number-grid-item placeholder';
                    placeholderItem.style.visibility = 'hidden'; // 不可见但占据空间
                    comboGridContainer.appendChild(placeholderItem);
                }
            }
            
            // 将网格容器添加到主容器
            afterCombosContainer.appendChild(comboGridContainer);
        } else {
            // 如果没有有效组合，显示提示信息
            const noDataMsg = document.createElement('div');
            noDataMsg.className = 'no-data-message';
            noDataMsg.textContent = '暂无组合数据';
            afterCombosContainer.appendChild(noDataMsg);
        }
        
        // 最后更新时间显示已移除
    }
    
    // 监听其他标签按钮点击事件，关联显示对应内容
    document.querySelectorAll('#lottery-records-btn, #stats-query-btn, #trend-analysis-btn, #missing-query-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 重置按钮状态
            document.querySelectorAll('.card-header .btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // 设置当前按钮为激活状态
            this.classList.add('active');
            
            // 隐藏分析容器
            analysisContainer.style.display = 'none';
            
            // 显示分页控件
            document.getElementById('pagination-container').style.display = 'block';
        });
    });
}); 