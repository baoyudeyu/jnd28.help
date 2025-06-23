import requests
import json
import logging
import config
import re

logger = logging.getLogger(__name__)

class MissingAnalyzer:
    """PC28遗漏分析工具"""
    
    def __init__(self):
        """初始化遗漏分析工具"""
        self.api_url = config.MISSING_API_URL
        self.timeout = config.MISSING_API_TIMEOUT
    
    def get_missing_data(self):
        """
        获取遗漏分析数据
        
        Returns:
            包含遗漏数据的字典，获取失败则返回None
        """
        try:
            logger.info(f"请求遗漏分析数据: {self.api_url}")
            response = requests.get(self.api_url, timeout=self.timeout)
            response.raise_for_status()
            
            # 提取有效的JSON部分
            response_text = response.text
            # 尝试找到JSON对象
            json_match = re.search(r'({.*})', response_text)
            if json_match:
                valid_json = json_match.group(1)
                logger.info(f"提取到有效JSON: {valid_json[:50]}...")
            else:
                valid_json = response_text
                logger.warning("无法提取JSON对象，尝试使用完整响应")
            
            # 解析JSON数据
            try:
                data = json.loads(valid_json)
                return data
            except json.JSONDecodeError:
                # 最后尝试移除所有HTML标签
                clean_text = re.sub(r'<[^>]*>', '', response_text)
                clean_text = clean_text.strip()
                logger.info(f"尝试清理后的文本: {clean_text[:50]}...")
                return json.loads(clean_text)
            
        except requests.RequestException as e:
            logger.error(f"请求遗漏分析数据失败: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"解析遗漏分析数据失败: {e}")
            logger.error(f"原始响应: {response.text[:100]}...")
            return None
        except Exception as e:
            logger.error(f"处理遗漏分析数据失败: {e}")
            return None
    
    def get_missing_statistics(self):
        """
        获取结构化的遗漏统计数据
        
        Returns:
            包含分类统计的字典
        """
        data = self.get_missing_data()
        if not data:
            return None
            
        # 构建结构化的统计数据
        statistics = {
            # 大小单双统计
            'basic': {
                'da': data.get('da', 0),  # 大
                'xiao': data.get('xiao', 0),  # 小
                'dan': data.get('dan', 0),  # 单
                'shuang': data.get('shuang', 0),  # 双
                'dd': data.get('dd', 0),  # 大单
                'ds': data.get('ds', 0),  # 大双
                'xd': data.get('xd', 0),  # 小单
                'xs': data.get('xs', 0)   # 小双
            },
            # 极值和组合形态
            'pattern': {
                'jd': data.get('jd', 0),  # 极大
                'jx': data.get('jx', 0),  # 极小
                'bz': data.get('bz', 0),  # 豹子
                'sz': data.get('sz', 0),  # 顺子
                'dz': data.get('dz', 0)   # 对子
            },
            # 和值遗漏统计
            'sum': {
                f's{i}': data.get(f's{i}', 0) for i in range(28)  # 和值0-27的遗漏期数
            }
        }
        
        return statistics 