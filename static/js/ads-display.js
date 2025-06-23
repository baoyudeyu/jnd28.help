/**
 * 广告显示管理器
 * 负责前台广告的加载、显示和交互
 */
class AdsDisplayManager {
    constructor() {
        this.loadedPositions = new Set();
        this.cache = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.init();
    }

    /**
     * 初始化广告显示管理器
     */
    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.loadAllAds());
        } else {
            this.loadAllAds();
        }
    }

    /**
     * 加载所有位置的广告
     */
    async loadAllAds() {
        const positions = ['top', 'sidebar', 'content', 'bottom'];
        
        // 并行加载所有位置的广告
        const loadPromises = positions.map(position => this.loadAdsForPosition(position));
        
        try {
            await Promise.allSettled(loadPromises);
            console.log('广告加载完成');
        } catch (error) {
            console.error('广告加载失败:', error);
        }
    }

    /**
     * 为指定位置加载广告
     * @param {string} position 广告位置
     */
    async loadAdsForPosition(position) {
        if (this.loadedPositions.has(position)) {
            return;
        }

        const containers = document.querySelectorAll(`[data-ad-position="${position}"]`);
        if (containers.length === 0) {
            return;
        }

        try {
            // 显示加载状态
            containers.forEach(container => this.showLoading(container));

            // 从缓存或API获取广告数据
            const ads = await this.getAdsData(position);

            if (ads && ads.length > 0) {
                // 渲染广告
                containers.forEach(container => this.renderAds(container, ads, position));
                this.loadedPositions.add(position);
            } else {
                // 没有广告，隐藏容器
                containers.forEach(container => container.style.display = 'none');
            }

        } catch (error) {
            console.error(`加载${position}位置广告失败:`, error);
            
            // 处理重试逻辑
            const retryCount = this.retryAttempts.get(position) || 0;
            if (retryCount < this.maxRetries) {
                this.retryAttempts.set(position, retryCount + 1);
                setTimeout(() => this.loadAdsForPosition(position), 2000 * (retryCount + 1));
            } else {
                // 重试次数用完，显示错误或隐藏容器
                containers.forEach(container => this.showError(container));
            }
        }
    }

    /**
     * 获取广告数据（带缓存）
     * @param {string} position 广告位置
     * @returns {Promise<Array>} 广告数据数组
     */
    async getAdsData(position) {
        // 检查缓存
        const cacheKey = `ads_${position}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
                return cached.data;
            }
        }

        // 从API获取数据
        const response = await fetch(`/api/ads/${position}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const ads = result.ads || [];

        // 更新缓存
        this.cache.set(cacheKey, {
            data: ads,
            timestamp: Date.now()
        });

        return ads;
    }

    /**
     * 渲染广告到容器
     * @param {Element} container 容器元素
     * @param {Array} ads 广告数据
     * @param {string} position 广告位置
     */
    renderAds(container, ads, position) {
        container.innerHTML = '';

        ads.forEach((ad, index) => {
            const adElement = this.createAdElement(ad, position, index);
            container.appendChild(adElement);
        });

        container.style.display = 'block';
    }

    /**
     * 创建广告元素
     * @param {Object} ad 广告数据
     * @param {string} position 广告位置
     * @param {number} index 广告索引
     * @returns {Element} 广告元素
     */
    createAdElement(ad, position, index) {
        const adContainer = document.createElement('div');
        adContainer.className = `ad-container ad-position-${position}`;
        adContainer.setAttribute('data-ad-id', ad._id);

        // 创建链接元素
        const linkElement = document.createElement('a');
        linkElement.className = 'ad-link';
        linkElement.href = ad.link_url;
        
        // 根据链接类型设置target
        if (ad.link_type === 'external') {
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
        }

        // 创建图片元素
        const imgElement = document.createElement('img');
        imgElement.className = 'ad-image';
        imgElement.alt = ad.title || '广告';
        imgElement.loading = 'lazy'; // 懒加载

        // 图片加载处理
        imgElement.onload = () => {
            imgElement.style.opacity = '1';
        };

        imgElement.onerror = () => {
            this.handleImageError(imgElement, ad);
        };

        // 设置图片URL
        if (ad.image_url.startsWith('http')) {
            imgElement.src = ad.image_url;
        } else {
            imgElement.src = `/static/${ad.image_url}`;
        }

        imgElement.style.opacity = '0';
        imgElement.style.transition = 'opacity 0.3s ease';

        // 创建标题元素（悬停显示）
        const titleElement = document.createElement('div');
        titleElement.className = 'ad-title';
        titleElement.textContent = ad.title || '';

        // 创建外链图标（如果是外链）
        if (ad.link_type === 'external') {
            const iconElement = document.createElement('div');
            iconElement.className = 'ad-external-icon';
            iconElement.innerHTML = '↗';
            iconElement.title = '外部链接';
            linkElement.appendChild(iconElement);
        }

        // 组装元素
        linkElement.appendChild(imgElement);
        linkElement.appendChild(titleElement);
        adContainer.appendChild(linkElement);

        // 添加点击追踪（可选）
        linkElement.addEventListener('click', () => {
            this.trackAdClick(ad, position, index);
        });

        return adContainer;
    }

    /**
     * 处理图片加载错误
     * @param {Element} imgElement 图片元素
     * @param {Object} ad 广告数据
     */
    handleImageError(imgElement, ad) {
        const fallbackElement = document.createElement('div');
        fallbackElement.className = 'ad-image-fallback';
        fallbackElement.innerHTML = `
            <div>
                <div style="font-size: 24px; margin-bottom: 8px;">🖼️</div>
                <div>图片加载失败</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">${ad.title || ''}</div>
            </div>
        `;

        // 替换图片元素
        imgElement.parentNode.replaceChild(fallbackElement, imgElement);
        
        console.warn('广告图片加载失败:', ad.image_url);
    }

    /**
     * 显示加载状态
     * @param {Element} container 容器元素
     */
    showLoading(container) {
        container.innerHTML = '<div class="ad-loading">正在加载广告...</div>';
        container.style.display = 'block';
    }

    /**
     * 显示错误状态
     * @param {Element} container 容器元素
     */
    showError(container) {
        container.innerHTML = '<div class="ad-error">广告加载失败</div>';
        container.style.display = 'block';
        
        // 3秒后隐藏错误提示
        setTimeout(() => {
            container.style.display = 'none';
        }, 3000);
    }

    /**
     * 追踪广告点击（可选功能）
     * @param {Object} ad 广告数据
     * @param {string} position 广告位置
     * @param {number} index 广告索引
     */
    trackAdClick(ad, position, index) {
        try {
            // 这里可以发送点击统计到服务器
            console.log('广告点击:', {
                id: ad._id,
                title: ad.title,
                position: position,
                index: index,
                timestamp: new Date().toISOString()
            });

            // 可以发送到统计API
            // fetch('/api/ads/click', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ ad_id: ad._id, position, index })
            // }).catch(err => console.warn('点击统计发送失败:', err));

        } catch (error) {
            console.warn('广告点击追踪失败:', error);
        }
    }

    /**
     * 刷新指定位置的广告
     * @param {string} position 广告位置
     */
    async refreshAds(position) {
        // 清除缓存
        this.cache.delete(`ads_${position}`);
        this.loadedPositions.delete(position);
        this.retryAttempts.delete(position);

        // 重新加载
        await this.loadAdsForPosition(position);
    }

    /**
     * 刷新所有广告
     */
    async refreshAllAds() {
        // 清除所有缓存和状态
        this.cache.clear();
        this.loadedPositions.clear();
        this.retryAttempts.clear();

        // 重新加载所有广告
        await this.loadAllAds();
    }
}

// 创建全局实例
window.AdsDisplayManager = new AdsDisplayManager();

// 暴露刷新方法到全局
window.refreshAds = (position) => {
    if (position) {
        window.AdsDisplayManager.refreshAds(position);
    } else {
        window.AdsDisplayManager.refreshAllAds();
    }
};

// 页面可见性变化时刷新广告（可选）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // 页面重新可见时，可以选择刷新广告
        // window.AdsDisplayManager.refreshAllAds();
    }
}); 