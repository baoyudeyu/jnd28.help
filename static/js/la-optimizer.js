/**
 * 51LA统计代码优化加载脚本
 * 解决加载速度问题，实现异步加载和懒加载
 */
(function() {
    'use strict';
    
    // 51LA配置信息
    var LA_CONFIG = {
        id: "3MT3mWfj7nYf5ifh",
        ck: "3MT3mWfj7nYf5ifh",
        analyticsEnabled: true,
        widgetEnabled: true
    };
    
    // 延迟加载51LA统计代码，避免阻塞页面渲染
    function loadLA51Analytics() {
        if (!LA_CONFIG.analyticsEnabled) return;
        
        try {
            // 创建统计代码脚本
            var laScript = document.createElement('script');
            laScript.charset = 'UTF-8';
            laScript.id = 'LA_COLLECT';
            laScript.src = '//sdk.51.la/js-sdk-pro.min.js';
            laScript.async = true;
            
            laScript.onload = function() {
                // 统计代码加载完成后初始化
                if (window.LA && window.LA.init) {
                    window.LA.init({
                        id: LA_CONFIG.id,
                        ck: LA_CONFIG.ck
                    });
                    console.log('51LA统计代码加载成功');
                }
            };
            
            laScript.onerror = function() {
                console.warn('51LA统计代码加载失败');
            };
            
            document.head.appendChild(laScript);
        } catch (e) {
            console.warn('51LA统计代码加载失败:', e);
        }
    }
    
    // 延迟加载51LA挂载信息，避免阻塞页面渲染
    function loadLA51Widget() {
        if (!LA_CONFIG.widgetEnabled) return;
        
        var widgetContainer = document.getElementById('la-widget-content');
        var placeholder = document.getElementById('la-widget-placeholder');
        
        if (!widgetContainer) return;
        
        try {
            // 创建挂载信息脚本
            var widgetScript = document.createElement('script');
            widgetScript.id = 'LA-DATA-WIDGET';
            widgetScript.crossOrigin = 'anonymous';
            widgetScript.charset = 'UTF-8';
            widgetScript.src = 'https://v6-widget.51.la/v6/' + LA_CONFIG.id + '/quote.js?theme=0&f=12&display=0,1,1,1,1,1,1,1';
            widgetScript.async = true;
            
            // 设置超时处理
            var timeout = setTimeout(function() {
                if (placeholder) {
                    placeholder.innerHTML = '<small class="text-muted">统计信息加载超时</small>';
                }
            }, 10000); // 10秒超时
            
            widgetScript.onload = function() {
                clearTimeout(timeout);
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
                widgetContainer.style.display = 'block';
                console.log('51LA挂载信息加载成功');
            };
            
            widgetScript.onerror = function() {
                clearTimeout(timeout);
                if (placeholder) {
                    placeholder.innerHTML = '<small class="text-muted">统计信息暂时无法加载</small>';
                }
                console.warn('51LA挂载信息加载失败');
            };
            
            widgetContainer.appendChild(widgetScript);
        } catch (e) {
            console.warn('51LA挂载信息加载失败:', e);
            if (placeholder) {
                placeholder.innerHTML = '<small class="text-muted">统计信息加载失败</small>';
            }
        }
    }
    
    // 使用Intersection Observer实现懒加载
    function initLazyLoad() {
        var widgetContainer = document.querySelector('.la-widget-container');
        if (!widgetContainer) return;
        
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        // 当挂载信息区域进入视口时才加载
                        loadLA51Widget();
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px' // 提前50px开始加载
            });
            
            observer.observe(widgetContainer);
        } else {
            // 不支持IntersectionObserver的浏览器，延迟3秒加载
            setTimeout(loadLA51Widget, 3000);
        }
    }
    
    // 检查网络连接状态
    function checkNetworkStatus() {
        if ('navigator' in window && 'connection' in navigator) {
            var connection = navigator.connection;
            // 如果是慢速网络，延长加载时间
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                return 2000; // 慢速网络延迟2秒
            }
        }
        return 100; // 正常网络延迟100ms
    }
    
    // 主初始化函数
    function init() {
        var networkDelay = checkNetworkStatus();
        
        // 页面加载完成后延迟执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // 统计代码立即加载（轻量级）
                setTimeout(loadLA51Analytics, networkDelay);
                // 挂载信息懒加载
                setTimeout(initLazyLoad, networkDelay + 400);
            });
        } else {
            setTimeout(loadLA51Analytics, networkDelay);
            setTimeout(initLazyLoad, networkDelay + 400);
        }
    }
    
    // 暴露配置接口，允许外部修改配置
    window.LA_OPTIMIZER = {
        config: LA_CONFIG,
        reload: function() {
            loadLA51Analytics();
            initLazyLoad();
        },
        loadWidget: loadLA51Widget,
        loadAnalytics: loadLA51Analytics
    };
    
    // 启动优化器
    init();
})(); 