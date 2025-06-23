import os
import platform
from datetime import timedelta

# 运行环境信息
PYTHON_VERSION = platform.python_version()
FLASK_VERSION = '2.3.3'

# 调试模式
DEBUG = False

# 密钥配置
SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-for-pc28-platform'

# MongoDB配置
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/pc28platform'
MONGO_DBNAME = 'pc28platform'
MONGO_CONNECT_TIMEOUT_MS = 5000
MONGO_SOCKET_TIMEOUT_MS = 5000
MONGO_SERVER_SELECTION_TIMEOUT_MS = 5000

# 会话配置
PERMANENT_SESSION_LIFETIME = timedelta(days=7)

# 应用配置
APP_NAME = 'PC28助手平台'
APP_VERSION = '0.2.0'

# 日志配置
LOG_LEVEL = 'INFO'
LOG_FILE = 'logs/app.log'

# 分页配置
ITEMS_PER_PAGE = 30
MAX_PAGES = 5

# 开奖数据API配置
API_BASE_URL = 'http://pc28.help'
API_RESULT_DEFAULT_TYPE = 'jnd28'
API_DEFAULT_TIMEOUT = 10
API_ENDPOINT = '/kj.json?limit=100'  # 新的JSON API端点

# 遗漏查询API配置
MISSING_API_URL = 'http://www.xyyc28.top/jnd/wkqsapi.php'
MISSING_API_TIMEOUT = 10  # 遗漏查询API超时时间（秒）

# 数据更新配置
DATA_UPDATE_INTERVAL = 1  # 数据更新间隔（秒）
DATA_RETENTION_DAYS = 30   # 数据保留天数 
ENABLE_SCHEDULER = False  # 是否启用调度器（True=自动获取数据，False=手动刷新模式）

# PC28形态和类型判断配置
# 基本形态判断规则（对子、顺子、豹子、杂六）
PATTERN_TYPES = {
    'BASIC': {
        'name': '基本形态',
        'types': {
            'PAIR': {
                'name': '对子',
                'description': '开奖号码中有两个数字一样',
                'color': '#ff9800'  # 橙色
            },
            'STRAIGHT': {
                'name': '顺子',
                'description': '开奖号码中能够组成顺子',
                'color': '#4caf50'  # 绿色
            },
            'LEOPARD': {
                'name': '豹子',
                'description': '开奖号码中三个数字一样',
                'color': '#9c27b0'  # 紫色
            },
            'MIXED': {
                'name': '杂六',
                'description': '不是对子，不是顺子，不是豹子',
                'color': '#607d8b'  # 蓝灰色
            }
        }
    },
    
    # 极值判断规则（极大、极小）
    'EXTREME': {
        'name': '极值',
        'types': {
            'MIN_EXTREME': {
                'name': '极小',
                'description': '和值为00到05的数字',
                'range': [0, 5],
                'color': '#00bcd4'  # 青色
            },
            'MAX_EXTREME': {
                'name': '极大',
                'description': '和值为22到27的数字',
                'range': [22, 27],
                'color': '#e91e63'  # 粉色
            }
        }
    },
    
    # 中边判断规则（小边、中数、大边）
    'POSITION': {
        'name': '中边',
        'types': {
            'SMALL_EDGE': {
                'name': '小边',
                'description': '和值为00到09的数字',
                'range': [0, 9],
                'color': '#2196f3'  # 浅蓝色
            },
            'MIDDLE': {
                'name': '中数',
                'description': '和值为10到17的数字',
                'range': [10, 17],
                'color': '#ffeb3b'  # 黄色
            },
            'BIG_EDGE': {
                'name': '大边',
                'description': '和值为18到27的数字',
                'range': [18, 27],
                'color': '#f44336'  # 红色
            }
        }
    }
} 

# 管理员配置
ADMIN_USERNAME = 'yuge'
ADMIN_PASSWORD = '04By0302'

# 图片上传配置
UPLOAD_CONFIG = {
    'ads_folder': 'static/uploads/ads',  # 广告图片存储目录
    'allowed_extensions': ['jpg', 'jpeg', 'png', 'gif', 'webp'],  # 允许的图片格式
    'max_file_size': 5 * 1024 * 1024,  # 最大文件大小 5MB
    'max_width': 1920,  # 最大图片宽度
    'max_height': 1080  # 最大图片高度
}

# 广告配置
ADS_CONFIG = {
    'enabled': True,  # 是否启用广告功能
    'positions': {
        'top': {
            'name': '顶部横幅',
            'description': '显示在导航栏下方',
            'max_count': 1
        },
        'sidebar': {
            'name': '侧边栏',
            'description': '显示在内容区域右侧',
            'max_count': 3
        },
        'content': {
            'name': '内容区域',
            'description': '显示在开奖信息中间',
            'max_count': 2
        },
        'bottom': {
            'name': '底部横幅',
            'description': '显示在页面底部',
            'max_count': 1
        }
    }
}

# 网站配置
SITE_CONFIG = {
    'title': 'PC28助手平台 - 专业开奖数据查询与走势分析',
    'description': 'PC28助手平台是专业的PC28开奖数据查询网站，提供实时PC28开奖结果、历史记录查询、走势图分析、号码统计等服务。平台数据准确及时，界面简洁易用，支持手机和电脑访问，是PC28爱好者的首选数据分析工具。',
    'copyright': '© 2025 PC28助手平台',
    'keywords': 'PC28最新开奖结果, PC28开奖历史记录, PC28开奖时间表, PC28走势图分析, PC28号码统计, PC28遗漏数据, PC28实时开奖, PC28开奖直播, PC28开奖公告, PC28大小单双, PC28和值统计, PC28冷热号码, PC28开奖规律, PC28技巧分享, PC28数据挖掘',
    'beian': '',
    'contact_email': '',
    # 新增自定义HTML代码配置
    'custom_html': {
        'head_code': '',  # 页面头部自定义代码（插入到<head>标签内）
        'footer_code': '<script id="LA-DATA-WIDGET" crossorigin="anonymous" charset="UTF-8" src="https://v6-widget.51.la/v6/3MT3mWfj7nYf5ifh/quote.js?theme=0&f=12&display=0,1,1,1,1,1,1,1"></script>',  # 页面底部自定义代码（插入到</body>标签前）
        'la51_code': '<script charset="UTF-8" id="LA_COLLECT" src="//sdk.51.la/js-sdk-pro.min.js"></script>\n<script>LA.init({id:"3MT3mWfj7nYf5ifh",ck:"3MT3mWfj7nYf5ifh"})</script>',  # 51la统计代码专用字段
        'enabled': True  # 是否启用自定义HTML代码
    }
} 