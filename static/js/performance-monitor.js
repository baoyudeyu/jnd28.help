/**
 * 页面性能监控脚本
 * 用于监控51LA优化前后的加载性能
 */
(function() {
    'use strict';
    
    var PerformanceMonitor = {
        startTime: performance.now(),
        metrics: {},
        
        // 记录性能指标
        recordMetric: function(name, value) {
            this.metrics[name] = {
                value: value,
                timestamp: performance.now()
            };
        },
        
        // 监控DOM加载完成时间
        monitorDOMReady: function() {
            var self = this;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    self.recordMetric('domReady', performance.now() - self.startTime);
                });
            } else {
                this.recordMetric('domReady', performance.now() - this.startTime);
            }
        },
        
        // 监控页面完全加载时间
        monitorPageLoad: function() {
            var self = this;
            if (document.readyState !== 'complete') {
                window.addEventListener('load', function() {
                    self.recordMetric('pageLoad', performance.now() - self.startTime);
                    self.analyzePerformance();
                });
            } else {
                this.recordMetric('pageLoad', performance.now() - this.startTime);
                this.analyzePerformance();
            }
        },
        
        // 监控51LA加载状态
        monitor51LA: function() {
            var self = this;
            var checkInterval = setInterval(function() {
                // 检查统计代码是否加载
                if (window.LA && window.LA.init) {
                    self.recordMetric('la51Analytics', performance.now() - self.startTime);
                }
                
                // 检查挂载信息是否加载
                var widgetContent = document.getElementById('la-widget-content');
                if (widgetContent && widgetContent.style.display !== 'none' && widgetContent.children.length > 0) {
                    self.recordMetric('la51Widget', performance.now() - self.startTime);
                    clearInterval(checkInterval);
                }
            }, 100);
            
            // 30秒后停止检查
            setTimeout(function() {
                clearInterval(checkInterval);
            }, 30000);
        },
        
        // 分析性能数据
        analyzePerformance: function() {
            var results = {
                domReady: this.metrics.domReady ? this.metrics.domReady.value.toFixed(2) + 'ms' : '未测量',
                pageLoad: this.metrics.pageLoad ? this.metrics.pageLoad.value.toFixed(2) + 'ms' : '未测量',
                la51Analytics: this.metrics.la51Analytics ? this.metrics.la51Analytics.value.toFixed(2) + 'ms' : '未加载',
                la51Widget: this.metrics.la51Widget ? this.metrics.la51Widget.value.toFixed(2) + 'ms' : '未加载'
            };
            
            // 在控制台输出性能报告
            console.group('📊 页面性能报告');
            console.log('🚀 DOM就绪时间:', results.domReady);
            console.log('⚡ 页面加载时间:', results.pageLoad);
            console.log('📈 51LA统计加载时间:', results.la51Analytics);
            console.log('📊 51LA挂载信息加载时间:', results.la51Widget);
            
            // 性能评级
            var pageLoadTime = this.metrics.pageLoad ? this.metrics.pageLoad.value : 0;
            var rating = this.getRating(pageLoadTime);
            console.log('🏆 性能评级:', rating.text, rating.emoji);
            
            // 优化建议
            this.showOptimizationTips(pageLoadTime);
            console.groupEnd();
            
            // 存储到localStorage供调试使用
            localStorage.setItem('performanceMetrics', JSON.stringify({
                timestamp: new Date().toISOString(),
                metrics: this.metrics,
                results: results,
                rating: rating
            }));
        },
        
        // 获取性能评级
        getRating: function(loadTime) {
            if (loadTime < 1000) {
                return { text: '优秀', emoji: '🟢', score: 'A+' };
            } else if (loadTime < 2000) {
                return { text: '良好', emoji: '🟡', score: 'A' };
            } else if (loadTime < 3000) {
                return { text: '一般', emoji: '🟠', score: 'B' };
            } else {
                return { text: '需要优化', emoji: '🔴', score: 'C' };
            }
        },
        
        // 显示优化建议
        showOptimizationTips: function(loadTime) {
            console.group('💡 优化建议');
            
            if (loadTime > 3000) {
                console.log('• 考虑启用CDN加速');
                console.log('• 优化图片大小和格式');
                console.log('• 减少HTTP请求数量');
            } else if (loadTime > 2000) {
                console.log('• 可以进一步压缩CSS和JS文件');
                console.log('• 考虑使用浏览器缓存');
            } else {
                console.log('• 页面加载速度已经很好！');
                console.log('• 继续保持当前的优化策略');
            }
            
            console.groupEnd();
        },
        
        // 初始化监控
        init: function() {
            this.monitorDOMReady();
            this.monitorPageLoad();
            this.monitor51LA();
            
            // 添加性能API支持检查
            if ('performance' in window && 'getEntriesByType' in performance) {
                this.monitorResourceTiming();
            }
        },
        
        // 监控资源加载时间
        monitorResourceTiming: function() {
            var self = this;
            setTimeout(function() {
                var resources = performance.getEntriesByType('resource');
                var la51Resources = resources.filter(function(resource) {
                    return resource.name.includes('51.la') || resource.name.includes('la-optimizer');
                });
                
                if (la51Resources.length > 0) {
                    console.group('📋 51LA资源加载详情');
                    la51Resources.forEach(function(resource) {
                        console.log('资源:', resource.name.split('/').pop());
                        console.log('加载时间:', (resource.responseEnd - resource.startTime).toFixed(2) + 'ms');
                        console.log('---');
                    });
                    console.groupEnd();
                }
            }, 5000);
        }
    };
    
    // 暴露到全局作用域供调试使用
    window.PerformanceMonitor = PerformanceMonitor;
    
    // 自动启动监控
    PerformanceMonitor.init();
    
    // 添加快捷命令
    window.showPerformanceReport = function() {
        var stored = localStorage.getItem('performanceMetrics');
        if (stored) {
            var data = JSON.parse(stored);
            console.table(data.results);
            return data;
        } else {
            console.log('暂无性能数据');
            return null;
        }
    };
    
})(); 