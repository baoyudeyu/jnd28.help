import requests
import json
import logging
from datetime import datetime
import config
import re

logger = logging.getLogger(__name__)

class LotteryApiClient:
    """PC28开奖数据API客户端"""
    
    def __init__(self, base_url=None):
        self.base_url = base_url or config.API_BASE_URL
        self.endpoint = config.API_ENDPOINT
    
    def get_lottery_results(self, page=1, result_type=None):
        """
        获取开奖结果数据
        
        Args:
            page: 页码 (保留参数但新API获取所有数据)
            result_type: 结果类型 (保留参数以兼容)
            
        Returns:
            包含开奖数据的列表，每个元素是一个字典
        """
        url = f"{self.base_url}{self.endpoint}"
        
        try:
            logger.info(f"请求开奖数据: {url}")
            response = requests.get(url, timeout=config.API_DEFAULT_TIMEOUT)
            response.raise_for_status()
            
            # 直接解析JSON响应
            json_data = response.json()
            results = self._parse_json_results(json_data)
            return results
            
        except requests.RequestException as e:
            logger.error(f"请求开奖数据失败: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"解析JSON数据失败: {e}")
            return []
    
    def _parse_json_results(self, json_data):
        """
        解析JSON中的开奖数据
        
        Args:
            json_data: API返回的JSON数据
            
        Returns:
            解析后的数据列表
        """
        try:
            # 检查JSON结构 - 新API返回包含data字段的字典
            if isinstance(json_data, dict) and 'data' in json_data and isinstance(json_data['data'], list):
                results = []
                for item in json_data['data']:
                    # 检查必要字段是否存在
                    if all(key in item for key in ['qihao', 'opennum', 'opentime']):
                        # 解析开奖号码 - 格式为 "1+2+3"
                        opennum = str(item['opennum'])
                        if '+' in opennum:
                            numbers = opennum.split('+')
                        elif ',' in opennum:
                            numbers = opennum.split(',')
                        else:
                            # 如果是三位数字，按位分割
                            opennum = opennum.zfill(3)
                            numbers = [opennum[0], opennum[1], opennum[2]]
                        
                        # 确保有三个数字
                        if len(numbers) >= 3:
                            num1, num2, num3 = numbers[0], numbers[1], numbers[2]
                            
                            # 计算和值（优先使用API提供的sum字段）
                            if 'sum' in item:
                                number_sum = int(item['sum'])
                            else:
                                number_sum = int(num1) + int(num2) + int(num3)
                            
                            # 构建结果字符串
                            result_str = f"{num1}+{num2}+{num3}"
                            
                            # 处理时间格式
                            opentime = item['opentime']
                            # 确保时间格式正确，如果包含年份则移除
                            if opentime.count('-') > 1:
                                # 移除年份部分，只保留月日和时间
                                match = re.search(r'\d{4}-(\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?)', opentime)
                                if match:
                                    opentime = match.group(1)
                            
                            # 构建结果对象
                            lottery_data = {
                                'qihao': item['qihao'],  # 期号
                                'result': result_str,  # 开奖结果 
                                'number_sum': number_sum,  # 和值
                                'size': '大' if number_sum > 13 else '小',  # 大小
                                'odd_even': '单' if number_sum % 2 == 1 else '双',  # 单双
                                'opentime': opentime  # 开奖时间
                            }
                            results.append(lottery_data)
                
                logger.info(f"成功解析 {len(results)} 条开奖记录")
                return results
            else:
                logger.warning(f"API返回的JSON格式不正确，期望包含data字段的字典")
                return []
                
        except Exception as e:
            logger.error(f"处理开奖数据失败: {e}")
            return []
    
    def get_latest_result(self):
        """
        获取最新一期开奖结果
        
        Returns:
            最新一期开奖数据字典，如果没有则返回None
        """
        results = self.get_lottery_results(page=1)
        if results and len(results) > 0:
            return results[0]  # 第一个就是最新的
        return None 