/**
 * 刮刮乐功能模块
 * 实现开奖号码的刮刮乐效果
 */

// 记录所有创建的Canvas实例
let scratchCanvases = [];
// 标记刮刮乐功能是否已初始化
let scratchInitialized = false;

// 初始化刮刮乐效果
function initScratchEffect() {
    if (scratchInitialized) return;
    
    // 清除之前可能存在的canvas
    clearScratchEffect();
    
    // 移动端延迟初始化，确保响应式样式已完全应用
    if (document.body.classList.contains('mobile-mode')) {
        setTimeout(() => {
            setupScratchAreas();
        }, 100); // 延迟100ms初始化
    } else {
        setupScratchAreas();
    }
}

// 设置所有刮刮乐区域
function setupScratchAreas() {
    // 处理号码区域 - 使用不同的方法处理号码区域，以保持操作符的布局
    setupNumbersArea();
    
    // 处理大小单双结果区域
    setupResultArea();
    
    // 添加全局刮擦鼠标样式
    document.body.classList.add('scratch-cursor');
    
    scratchInitialized = true;
}

// 为号码区域设置刮刮乐效果
function setupNumbersArea() {
    const numbersContainer = document.querySelector('#latest-lottery-info .lottery-numbers');
    if (!numbersContainer) return;
    
    // 获取所有数字元素
    const numberEls = numbersContainer.querySelectorAll('.lottery-number');
    const sumEl = numbersContainer.querySelector('.lottery-sum');
    
    // 为所有数字添加刮层
    numberEls.forEach(numEl => {
        setupScratchForElement(numEl);
    });
    
    // 处理总和
    if (sumEl) {
        setupScratchForElement(sumEl);
    }
}

// 为大小单双结果区域设置刮刮乐效果
function setupResultArea() {
    const resultItems = document.querySelectorAll('#latest-lottery-info .lottery-result-item');
    if (!resultItems.length) return;
    
    // 为每个结果项添加刮刮乐效果
    resultItems.forEach(item => {
        setupScratchForElement(item, true);
    });
}

// 为单个元素设置刮刮乐效果
function setupScratchForElement(el, isResultItem = false) {
    if (!el) return;
    
    // 防止重复包装
    if (el.closest('.lottery-scratch-container')) {
        return;
    }
    
    // 获取元素的计算样式
    const computedStyle = getComputedStyle(el);
    const elementRect = el.getBoundingClientRect();
    
    // 保存元素原始样式
    const originalStyle = {
        position: el.style.position,
        margin: el.style.margin,
        padding: el.style.padding,
        display: el.style.display,
        width: el.style.width,
        height: el.style.height,
        boxSizing: el.style.boxSizing
    };
    
    // 创建包装容器
    const wrapper = document.createElement('div');
    
    // 设置包装容器的类名
    if (el.classList.contains('lottery-sum')) {
        wrapper.className = 'lottery-scratch-container lottery-sum-container';
    } else if (el.classList.contains('lottery-number')) {
        wrapper.className = 'lottery-scratch-container lottery-number-container';
    } else {
        wrapper.className = 'lottery-scratch-container lottery-result-item-container';
    }
    
    // 获取元素的完整尺寸（包括边框和内边距）
    const totalWidth = el.offsetWidth;
    const totalHeight = el.offsetHeight;
    
    // 设置包装容器样式，确保完全匹配原元素
    wrapper.style.cssText = `
        position: relative;
        display: inline-flex;
        vertical-align: middle;
        justify-content: center;
        align-items: center;
        width: ${totalWidth}px;
        height: ${totalHeight}px;
        margin: ${computedStyle.margin};
        padding: 0;
        box-sizing: border-box;
        flex-shrink: 0;
        z-index: 5;
    `;
    
    // 插入包装容器
    el.parentNode.insertBefore(wrapper, el);
    
    // 调整原元素样式，确保它完全填充容器
    el.style.cssText = `
        position: relative;
        margin: 0;
        padding: ${computedStyle.padding};
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        box-sizing: border-box;
        flex-shrink: 0;
        z-index: 1;
        border-radius: ${computedStyle.borderRadius};
        background: ${computedStyle.background};
        border: ${computedStyle.border};
        color: ${computedStyle.color};
        font-size: ${computedStyle.fontSize};
        font-weight: ${computedStyle.fontWeight};
    `;
    
    // 将元素移动到包装容器中
    wrapper.appendChild(el);
    
    // 创建Canvas涂层
    createScratchCanvas(wrapper, el, isResultItem);
    
    // 保存原始样式以便后续恢复
    el._originalStyle = originalStyle;
}

// 创建刮刮乐Canvas
function createScratchCanvas(container, targetEl, isResultItem = false) {
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    
    // 获取容器的实际尺寸
    const containerRect = container.getBoundingClientRect();
    const computedStyle = getComputedStyle(targetEl);
    
    // 计算Canvas尺寸，确保完全覆盖目标元素（包括边框）
    const borderWidth = parseFloat(computedStyle.borderWidth) || 0;
    const canvasWidth = container.offsetWidth;
    const canvasHeight = container.offsetHeight;
    
    // 设置Canvas的显示尺寸
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // 设置Canvas的实际像素尺寸（考虑设备像素比）
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    
    // 设置Canvas样式，确保完全覆盖目标元素
    canvas.className = 'lottery-scratch-canvas';
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10;
        cursor: pointer;
        touch-action: none;
        border-radius: ${computedStyle.borderRadius};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
    `;
    
    // 移动端优化
    if (document.body.classList.contains('mobile-mode')) {
        canvas.style.borderRadius = computedStyle.borderRadius;
        canvas.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
    }
    
    // 获取2D绘图上下文
    const ctx = canvas.getContext('2d');
    
    // 缩放绘图上下文以匹配设备像素比
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // 绘制刮刮乐涂层
    drawScratchLayer(ctx, canvasWidth, canvasHeight, targetEl, isResultItem);
    
    // 将Canvas添加到容器中
    container.appendChild(canvas);
    
    // 设置事件处理
    setupScratchEvents(canvas, ctx, canvasWidth, canvasHeight);
    
    // 记录创建的Canvas
    scratchCanvases.push(canvas);
    
    return canvas;
}

// 绘制刮刮乐涂层
function drawScratchLayer(ctx, width, height, targetEl, isResultItem = false) {
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 获取目标元素的样式信息
    const computedStyle = getComputedStyle(targetEl);
    const borderRadius = parseFloat(computedStyle.borderRadius) || 0;
    
    // 根据元素类型选择不同的涂层颜色和样式
    let gradient;
    
    if (isResultItem || targetEl.classList.contains('lottery-result-item')) {
        // 大小单双结果使用略深的涂层，营造神秘感
        gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        gradient.addColorStop(0, '#616161');
        gradient.addColorStop(0.7, '#757575');
        gradient.addColorStop(1, '#424242');
    } else if (targetEl.classList.contains('lottery-sum')) {
        // 和值使用特殊的橙色系涂层
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#8D6E63');
        gradient.addColorStop(0.5, '#A1887F');
        gradient.addColorStop(1, '#795548');
    } else {
        // 号码使用标准灰色涂层
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#757575');
        gradient.addColorStop(0.5, '#9E9E9E');
        gradient.addColorStop(1, '#616161');
    }
    
    ctx.fillStyle = gradient;
    
    // 根据元素类型和边框半径绘制相应形状的涂层
    if ((isResultItem || targetEl.classList.contains('lottery-result-item')) && borderRadius >= width/2) {
        // 圆形涂层（大小单双结果）
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
    } else if (borderRadius > 0) {
        // 圆角矩形涂层
            drawRoundedRect(ctx, 0, 0, width, height, borderRadius);
            ctx.fill();
        } else {
        // 矩形涂层
        ctx.fillRect(0, 0, width, height);
        }
    
    // 添加细微的纹理效果，增强真实感
    const texturePoints = Math.min(50, width * height / 200); // 根据面积调整纹理密度
    
    for (let i = 0; i < texturePoints; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5 + 0.5;
        const alpha = Math.random() * 0.15 + 0.05;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fill();
    }
    
    // 添加高光效果，增强立体感
    if (width > 30 && height > 30) {
        const highlightGradient = ctx.createLinearGradient(0, 0, width * 0.3, height * 0.3);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        
        if ((isResultItem || targetEl.classList.contains('lottery-result-item')) && borderRadius >= width/2) {
            // 圆形高光
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
        } else if (borderRadius > 0) {
            // 圆角矩形高光
            drawRoundedRect(ctx, 0, 0, width, height, borderRadius);
            ctx.fill();
        } else {
            // 矩形高光
            ctx.fillRect(0, 0, width, height);
        }
    }
}

// 绘制圆角矩形
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

// 设置刮擦事件监听
function setupScratchEvents(canvas, ctx, width, height) {
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // 根据设备类型调整刮擦半径
    const isMobile = document.body.classList.contains('mobile-mode');
    const scratchRadius = isMobile ? 12 : 9; // 移动端使用更大的刮擦半径
    
    // 鼠标/触摸开始事件
    function startDrawing(e) {
        isDrawing = true;
        
        // 获取坐标（处理触摸和鼠标事件）
        const { x, y } = getEventPosition(e, canvas);
        lastX = x;
        lastY = y;
        
        // 立即刮一下当前位置
        scratch(x, y);
        e.preventDefault(); // 阻止默认行为
    }
    
    // 鼠标/触摸移动事件
    function draw(e) {
        if (!isDrawing) return;
        
        // 阻止默认行为（如滚动）
        e.preventDefault();
        
        // 获取当前坐标
        const { x, y } = getEventPosition(e, canvas);
        
        // 执行刮擦操作
        scratch(x, y);
        
        // 绘制从上一个位置到当前位置的线，让刮擦效果更连续
        const dist = Math.sqrt(Math.pow(lastX - x, 2) + Math.pow(lastY - y, 2));
        
        // 增加插值点密度，确保线条连续
        const step = isMobile ? 1.2 : 1.5; // 移动端使用更密集的插值点
        const steps = Math.max(1, Math.floor(dist / step));
        
        for (let i = 1; i < steps; i++) {
            const ratio = i / steps;
            const interpX = lastX + (x - lastX) * ratio;
            const interpY = lastY + (y - lastY) * ratio;
            scratch(interpX, interpY);
        }
        
        // 更新上一个位置
        lastX = x;
        lastY = y;
    }
    
    // 鼠标/触摸结束事件
    function stopDrawing() {
        isDrawing = false;
    }
    
    // 刮擦操作
    function scratch(x, y) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        // 使用圆形橡皮擦效果
        ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // 确保完全透明
        ctx.fill();
    }
    
    // 获取事件坐标（兼容鼠标和触摸）
    function getEventPosition(e, element) {
        let x, y;
        
        // 处理触摸事件
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = element.getBoundingClientRect();
            x = touch.clientX - rect.left;
            y = touch.clientY - rect.top;
        } 
        // 处理鼠标事件
        else {
            const rect = element.getBoundingClientRect();
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        return { x, y };
    }
    
    // 注册事件监听
    // 鼠标事件
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    
    // 触摸事件
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDrawing);
}

// 清除刮刮乐效果
function clearScratchEffect() {
    // 移除所有创建的Canvas和包装容器
    const containers = document.querySelectorAll('.lottery-scratch-container');
    
    // 保存所有原始元素的引用，以便后续处理布局恢复
    const originalElements = [];
    
    containers.forEach(container => {
        // 获取原始元素
        const originalEl = container.querySelector('.lottery-number, .lottery-sum, .lottery-result-item');
        if (originalEl && container.parentNode) {
            originalElements.push(originalEl);
            
            // 恢复元素原始样式
            if (originalEl._originalStyle) {
                try {
                    const originalStyle = originalEl._originalStyle;
                    
                    // 清除当前内联样式
                    originalEl.removeAttribute('style');
                    
                    // 应用原始样式（只应用非空值）
                    for (const [key, value] of Object.entries(originalStyle)) {
                        if (value && value !== '' && value !== 'auto' && value !== 'normal') {
                            originalEl.style[key] = value;
                        }
                    }
                    
                    // 清除保存的样式数据
                    delete originalEl._originalStyle;
                } catch (e) {
                    console.error('恢复元素样式失败:', e);
                    // 出错时至少清除inline样式，让元素恢复默认样式
                    originalEl.removeAttribute('style');
                }
            } else {
                // 如果没有保存的样式，直接清除所有内联样式
                originalEl.removeAttribute('style');
            }
            
            // 将元素移回原来的位置
            container.parentNode.insertBefore(originalEl, container);
        }
        
        // 移除容器
        container.remove();
    });
    
    // 清空Canvas数组
    scratchCanvases = [];
    
    // 移除特殊的鼠标指针样式
    document.body.classList.remove('scratch-cursor');
    
    // 重置初始化状态
    scratchInitialized = false;
    
    console.log('刮刮乐效果已清除');
}

// 导出API
window.LotteryScratch = {
    init: initScratchEffect,
    clear: clearScratchEffect,
    repairLayers: repairScratchLayers
};

// 修复/补全刮刮乐涂层
function repairScratchLayers() {
    console.log('开始修复涂层');
    
    // 获取所有现有的Canvas
    const existingCanvases = document.querySelectorAll('.lottery-scratch-canvas');
    
    if (existingCanvases.length === 0) {
        console.log('未找到任何涂层，无需修复');
        return;
    }
    
    let repairedCount = 0;
    
    existingCanvases.forEach(canvas => {
        const container = canvas.parentElement;
        const targetEl = container.querySelector('.lottery-number, .lottery-sum, .lottery-result-item');
        
        if (targetEl && canvas) {
            // 检测涂层是否被破坏
            const damageLevel = detectCanvasDamage(canvas);
            
            console.log(`元素 ${targetEl.textContent} 涂层破损程度: ${damageLevel.toFixed(1)}%`);
            
            // 如果破损程度超过3%，则进行修复
            if (damageLevel > 3) {
                // 使用智能修复，只修复被刮掉的部分
                smartRepairCanvas(canvas, targetEl, container);
                repairedCount++;
                console.log(`已修复元素 ${targetEl.textContent} 的涂层`);
            } else {
                console.log(`元素 ${targetEl.textContent} 涂层完好，无需修复`);
            }
        }
    });
    
    if (repairedCount > 0) {
        console.log(`涂层修复完成，共修复 ${repairedCount} 个元素`);
    } else {
        console.log('所有涂层完好，无需修复');
    }
}

// 检测Canvas涂层的破损程度
function detectCanvasDamage(canvas) {
    try {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalPixels = 0;
        let transparentPixels = 0;
        
        // 检查每个像素的透明度
        for (let i = 3; i < data.length; i += 4) {
            totalPixels++;
            // Alpha通道值，小于128表示半透明或透明
            if (data[i] < 128) {
                transparentPixels++;
            }
        }
        
        // 返回破损百分比
        return totalPixels > 0 ? (transparentPixels / totalPixels) * 100 : 0;
    } catch (e) {
        console.error('检测涂层破损失败:', e);
        return 0; // 检测失败时认为没有破损
    }
}

// 修复单个Canvas涂层（完全重绘）
function repairCanvas(canvas, targetEl, container) {
    try {
        const ctx = canvas.getContext('2d');
        
        // 获取Canvas的显示尺寸
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        
        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // 重新设置Canvas尺寸
        canvas.width = canvasWidth * devicePixelRatio;
        canvas.height = canvasHeight * devicePixelRatio;
        
        // 缩放绘图上下文
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // 判断是否为结果项
        const isResultItem = targetEl.classList.contains('lottery-result-item');
        
        // 重新绘制完整的涂层
        drawScratchLayer(ctx, canvasWidth, canvasHeight, targetEl, isResultItem);
        
        console.log('Canvas涂层修复完成（完全重绘）');
    } catch (e) {
        console.error('修复Canvas涂层失败:', e);
    }
}

// 智能修复涂层（只修复被刮掉的部分）
function smartRepairCanvas(canvas, targetEl, container) {
    try {
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        
        // 获取当前的图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 创建一个临时Canvas来绘制完整的涂层
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 设置设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;
        tempCtx.scale(devicePixelRatio, devicePixelRatio);
        
        // 在临时Canvas上绘制完整涂层
        const isResultItem = targetEl.classList.contains('lottery-result-item');
        drawScratchLayer(tempCtx, canvasWidth, canvasHeight, targetEl, isResultItem);
        
        // 获取完整涂层的图像数据
        const completeImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const completeData = completeImageData.data;
        
        let repairedPixels = 0;
        
        // 只修复透明的像素点
        for (let i = 0; i < data.length; i += 4) {
            // 如果当前像素是透明的或半透明的（被刮掉了）
            if (data[i + 3] < 128) {
                // 从完整涂层复制像素
                data[i] = completeData[i];         // R
                data[i + 1] = completeData[i + 1]; // G
                data[i + 2] = completeData[i + 2]; // B
                data[i + 3] = completeData[i + 3]; // A
                repairedPixels++;
            }
        }
        
        // 将修复后的数据写回Canvas
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`智能涂层修复完成，修复了 ${repairedPixels} 个像素点`);
    } catch (e) {
        console.error('智能修复涂层失败:', e);
        // 如果智能修复失败，尝试完全重绘
        console.log('尝试完全重绘涂层');
        repairCanvas(canvas, targetEl, container);
    }
} 