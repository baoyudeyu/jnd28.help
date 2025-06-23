import threading
import time
import logging
import schedule
from datetime import datetime
import config

logger = logging.getLogger(__name__)

class LotteryScheduler:
    """开奖数据定时抓取任务调度器"""
    
    def __init__(self, api_client, db_manager):
        """
        初始化调度器
        
        Args:
            api_client: API客户端
            db_manager: 数据库管理器
        """
        self.api_client = api_client
        self.db_manager = db_manager
        self.thread = None
        self.is_running = False
        self.last_update_time = None
    
    def start(self):
        """启动调度器"""
        if self.is_running:
            logger.warning("调度器已在运行中")
            return False
        
        # 立即执行一次数据获取
        self.fetch_and_save_data()
        
        # 设置定时任务，使用配置中的更新间隔
        schedule.every(config.DATA_UPDATE_INTERVAL).seconds.do(self.fetch_and_save_data)
        
        # 创建并启动线程
        self.is_running = True
        self.thread = threading.Thread(target=self._run_scheduler)
        self.thread.daemon = True  # 设为守护线程，主线程结束时自动结束
        self.thread.start()
        
        logger.info(f"开奖数据调度器已启动，更新间隔：{config.DATA_UPDATE_INTERVAL}秒")
        return True
    
    def stop(self):
        """停止调度器"""
        if not self.is_running:
            logger.warning("调度器未在运行")
            return False
        
        self.is_running = False
        schedule.clear()
        
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        
        logger.info("开奖数据调度器已停止")
        return True
    
    def _run_scheduler(self):
        """运行调度器循环"""
        while self.is_running:
            schedule.run_pending()
            time.sleep(1)
    
    def fetch_and_save_data(self):
        """从API获取数据并保存到数据库"""
        try:
            # 从第一页开始获取数据
            results = self.api_client.get_lottery_results(page=1)
            
            if results:
                # 保存到数据库
                saved_count = self.db_manager.save_lottery_results(results)
                
                if saved_count > 0:
                    logger.info(f"成功更新 {saved_count} 条开奖记录")
                    self.last_update_time = datetime.now()
                else:
                    logger.info("没有新的开奖记录需要更新")
            else:
                logger.warning("从API获取数据为空")
                
            return True
        except Exception as e:
            logger.error(f"获取和保存开奖数据失败: {e}")
            return False
    
    def get_status(self):
        """获取调度器状态信息"""
        return {
            "is_running": self.is_running,
            "last_update": self.last_update_time.strftime("%Y-%m-%d %H:%M:%S") if self.last_update_time else None,
            "total_records": self.db_manager.count_lottery_results(),
            "update_interval": config.DATA_UPDATE_INTERVAL
        } 