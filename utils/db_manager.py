import logging
import pymongo
from datetime import datetime
from bson.objectid import ObjectId
import config
from utils.pattern_analyzer import analyze_lottery_result

logger = logging.getLogger(__name__)

class DBManager:
    """MongoDB数据库管理器"""
    
    def __init__(self, mongo_client):
        """
        初始化数据库管理器
        
        Args:
            mongo_client: Flask-PyMongo客户端实例
        """
        self.mongo = mongo_client
        self.db = mongo_client.db
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        """确保创建必要的索引"""
        try:
            # 为期号创建唯一索引
            self.db.lottery_results.create_index([("qihao", pymongo.ASCENDING)], unique=True)
            # 为开奖时间创建索引，用于排序
            self.db.lottery_results.create_index([("opentime", pymongo.DESCENDING)])
            logger.info("数据库索引创建成功")
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
    
    def save_lottery_results(self, results):
        """
        保存开奖结果到数据库
        
        Args:
            results: 开奖结果列表
            
        Returns:
            保存成功的记录数
        """
        if not results:
            return 0
            
        saved_count = 0
        for result in results:
            try:
                # 转换开奖时间字符串为日期时间对象，方便排序
                if 'opentime' in result:
                    try:
                        # 尝试解析日期时间
                        # 支持两种格式：MM-DD HH:MM 或 MM-DD HH:MM:SS
                        dt_format = "%m-%d %H:%M"
                        time_str = result['opentime']
                        
                        # 如果包含秒，调整格式
                        if len(time_str.split(':')) == 3:
                            dt_format = "%m-%d %H:%M:%S"
                        
                        # 添加当前年份 (仅用于内部排序，存储仍保持原始格式)
                        current_year = datetime.now().year
                        time_str_with_year = f"{current_year}-{time_str}"
                        
                        # 解析完整日期时间
                        result['opentime_dt'] = datetime.strptime(time_str_with_year, f"%Y-{dt_format}")
                        logger.debug(f"解析开奖时间: {time_str} -> {result['opentime_dt']}")
                    except Exception as e:
                        logger.warning(f"解析开奖时间失败 ({result.get('opentime', 'unknown')}): {e}")
                        result['opentime_dt'] = datetime.now()
                
                # 分析开奖结果形态
                if 'result' in result and 'number_sum' in result:
                    pattern_analysis = analyze_lottery_result(result['result'], int(result['number_sum']))
                    if pattern_analysis and 'basic' in pattern_analysis:
                        # 只保存基本形态（对子、顺子、豹子、杂六）
                        result['pattern'] = pattern_analysis['basic']['name']
                        result['pattern_type'] = pattern_analysis['basic']['pattern']
                        
                        # 保存极值和中边信息
                        if pattern_analysis['extreme']:
                            result['extreme'] = pattern_analysis['extreme']['name']
                            result['extreme_type'] = pattern_analysis['extreme']['pattern']
                        
                        if pattern_analysis['position']:
                            result['position'] = pattern_analysis['position']['name']
                            result['position_type'] = pattern_analysis['position']['pattern']
                
                # 使用期号作为唯一键，upsert确保不重复插入
                query = {"qihao": result["qihao"]}
                update = {"$set": result}
                update_result = self.db.lottery_results.update_one(query, update, upsert=True)
                
                if update_result.upserted_id or update_result.modified_count > 0:
                    saved_count += 1
                    
            except Exception as e:
                logger.error(f"保存开奖结果失败 (期号: {result.get('qihao', '未知')}): {e}")
        
        logger.info(f"成功保存 {saved_count} 条开奖记录")
        return saved_count
    
    def get_latest_results(self, limit=30, skip=0):
        """
        获取最新的开奖结果
        
        Args:
            limit: 返回记录数量限制
            skip: 跳过记录数
            
        Returns:
            最新的开奖结果列表
        """
        try:
            # 首先创建数字化期号的聚合管道
            pipeline = [
                # 添加一个字段，将期号转换为数字（如果转换失败则为0）
                {
                    "$addFields": {
                        "numeric_qihao": {
                            "$convert": {
                                "input": "$qihao",
                                "to": "int",
                                "onError": 0
                            }
                        }
                    }
                },
                # 按数字化期号降序排序
                {
                    "$sort": {
                        "numeric_qihao": -1
                    }
                },
                # 跳过指定数量的记录
                {
                    "$skip": skip
                },
                # 限制返回记录数
                {
                    "$limit": limit
                }
            ]
            
            # 执行聚合查询
            cursor = self.db.lottery_results.aggregate(pipeline)
            
            results = list(cursor)
            for result in results:
                # 将ObjectId转换为字符串
                if '_id' in result:
                    result['_id'] = str(result['_id'])
                # 移除临时字段
                if 'numeric_qihao' in result:
                    del result['numeric_qihao']
            
            return results
        except Exception as e:
            logger.error(f"获取最新开奖结果失败: {e}")
            return []
    
    def get_latest_result(self):
        """
        获取最新一期开奖结果
        
        Returns:
            最新一期开奖结果，如无结果则返回None
        """
        results = self.get_latest_results(limit=1)
        if results:
            return results[0]
        return None
    
    def count_lottery_results(self):
        """
        获取开奖结果总数
        
        Returns:
            开奖结果记录总数
        """
        try:
            return self.db.lottery_results.count_documents({})
        except Exception as e:
            logger.error(f"获取开奖结果总数失败: {e}")
            return 0
    
    def get_results_by_qihao(self, qihao):
        """
        通过期号获取开奖结果
        
        Args:
            qihao: 期号
            
        Returns:
            开奖结果记录，如不存在则返回None
        """
        try:
            result = self.db.lottery_results.find_one({"qihao": qihao})
            if result:
                result['_id'] = str(result['_id'])
            return result
        except Exception as e:
            logger.error(f"通过期号获取开奖结果失败 (期号: {qihao}): {e}")
            return None
    
    def get_results_by_date_range(self, start_date, end_date):
        """
        通过日期范围获取开奖结果
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            日期范围内的开奖结果列表
        """
        try:
            query = {
                "opentime_dt": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
            cursor = self.db.lottery_results.find(query).sort("opentime_dt", -1)
            results = list(cursor)
            for result in results:
                if '_id' in result:
                    result['_id'] = str(result['_id'])
            return results
        except Exception as e:
            logger.error(f"按日期范围获取开奖结果失败: {e}")
            return []
    
    # ===== 广告管理相关方法 =====
    
    def save_ad(self, ad_data):
        """
        保存广告数据
        
        Args:
            ad_data: 广告数据字典
            
        Returns:
            保存的广告ID
        """
        try:
            # 设置创建时间和更新时间
            now = datetime.now()
            ad_data['created_at'] = now
            ad_data['updated_at'] = now
            
            # 确保必要字段存在
            if 'sort_order' not in ad_data:
                # 获取当前位置的最大排序号
                max_order = self.db.ads.find_one(
                    {"position": ad_data.get('position', 'content')},
                    sort=[("sort_order", -1)]
                )
                ad_data['sort_order'] = (max_order['sort_order'] + 1) if max_order else 1
            
            if 'enabled' not in ad_data:
                ad_data['enabled'] = True
            
            result = self.db.ads.insert_one(ad_data)
            logger.info(f"广告保存成功，ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"保存广告失败: {e}")
            return None
    
    def update_ad(self, ad_id, ad_data):
        """
        更新广告数据
        
        Args:
            ad_id: 广告ID
            ad_data: 广告数据字典
            
        Returns:
            是否更新成功
        """
        try:
            # 设置更新时间
            ad_data['updated_at'] = datetime.now()
            
            result = self.db.ads.update_one(
                {"_id": ObjectId(ad_id)},
                {"$set": ad_data}
            )
            success = result.modified_count > 0
            logger.info(f"广告更新{'成功' if success else '失败'}，ID: {ad_id}")
            return success
        except Exception as e:
            logger.error(f"更新广告失败: {e}")
            return False
    
    def delete_ad(self, ad_id):
        """
        删除广告
        
        Args:
            ad_id: 广告ID
            
        Returns:
            是否删除成功
        """
        try:
            result = self.db.ads.delete_one({"_id": ObjectId(ad_id)})
            success = result.deleted_count > 0
            logger.info(f"广告删除{'成功' if success else '失败'}，ID: {ad_id}")
            return success
        except Exception as e:
            logger.error(f"删除广告失败: {e}")
            return False
    
    def get_all_ads(self):
        """
        获取所有广告
        
        Returns:
            广告列表
        """
        try:
            cursor = self.db.ads.find().sort([("position", 1), ("sort_order", 1)])
            ads = list(cursor)
            for ad in ads:
                ad['_id'] = str(ad['_id'])
            return ads
        except Exception as e:
            logger.error(f"获取广告列表失败: {e}")
            return []
    
    def get_ads_by_position(self, position, enabled_only=True):
        """
        按位置获取广告
        
        Args:
            position: 广告位置
            enabled_only: 是否只获取启用的广告
            
        Returns:
            指定位置的广告列表
        """
        try:
            query = {"position": position}
            if enabled_only:
                query["enabled"] = True
                
            cursor = self.db.ads.find(query).sort("sort_order", 1)
            ads = list(cursor)
            for ad in ads:
                ad['_id'] = str(ad['_id'])
            return ads
        except Exception as e:
            logger.error(f"按位置获取广告失败: {e}")
            return []
    
    def get_ad_by_id(self, ad_id):
        """
        按ID获取广告
        
        Args:
            ad_id: 广告ID
            
        Returns:
            广告数据或None
        """
        try:
            ad = self.db.ads.find_one({"_id": ObjectId(ad_id)})
            if ad:
                ad['_id'] = str(ad['_id'])
            return ad
        except Exception as e:
            logger.error(f"按ID获取广告失败: {e}")
            return None
        """
        获取指定日期范围内的开奖结果
        
        Args:
            start_date: 开始日期时间字符串，格式为'YYYY-MM-DD HH:MM:SS'
            end_date: 结束日期时间字符串，格式为'YYYY-MM-DD HH:MM:SS'
            
        Returns:
            日期范围内的开奖结果列表
        """
        try:
            # 将日期字符串转换为datetime对象
            start_dt = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
            
            logger.info(f"开始日期时间: {start_dt}, 结束日期时间: {end_dt}")
            
            # 查询日期范围内的开奖结果
            cursor = self.db.lottery_results.find({
                "opentime_dt": {
                    "$gte": start_dt,
                    "$lte": end_dt
                }
            }).sort([("opentime_dt", pymongo.ASCENDING)])
            
            results = list(cursor)
            result_count = len(results)
            logger.info(f"日期范围查询结果数量: {result_count}")
            
            for result in results:
                # 将ObjectId转换为字符串
                if '_id' in result:
                    result['_id'] = str(result['_id'])
            
            return results
        except Exception as e:
            logger.error(f"获取日期范围开奖结果失败 ({start_date} 至 {end_date}): {e}")
            return [] 