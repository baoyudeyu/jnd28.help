from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from flask_pymongo import PyMongo
import os
import logging
import math
import re
from logging.handlers import RotatingFileHandler
from datetime import datetime
from markupsafe import Markup
from werkzeug.utils import secure_filename
from PIL import Image

# 导入配置
import config
# 导入自定义工具
from utils.api_client import LotteryApiClient
from utils.db_manager import DBManager
from utils.scheduler import LotteryScheduler
from utils.pattern_analyzer import analyze_lottery_result
from utils.missing_analyzer import MissingAnalyzer

# HTML代码安全过滤函数
def sanitize_html_code(html_code):
    """
    对HTML代码进行基本的安全过滤
    移除potentially dangerous script patterns while preserving legitimate code
    """
    if not html_code:
        return ""
    
    # 移除潜在危险的内联事件处理程序
    dangerous_patterns = [
        r'on\w+\s*=\s*["\'][^"\']*["\']',  # onclick, onload 等事件
        r'javascript\s*:',  # javascript: 协议
        r'vbscript\s*:',    # vbscript: 协议
    ]
    
    cleaned_code = html_code
    for pattern in dangerous_patterns:
        cleaned_code = re.sub(pattern, '', cleaned_code, flags=re.IGNORECASE)
    
    return cleaned_code.strip()

# 创建应用实例
app = Flask(__name__)
app.config.from_object(config)

# 初始化MongoDB
mongo = PyMongo(app)

# 初始化数据库管理器
db_manager = DBManager(mongo)

# 初始化开奖数据API客户端
lottery_api = LotteryApiClient()

# 初始化遗漏分析工具
missing_analyzer = MissingAnalyzer()

# 初始化调度器
scheduler = LotteryScheduler(lottery_api, db_manager)

# 初始化形态分析，为现有数据添加形态信息
def initialize_pattern_analysis():
    app.logger.info("开始初始化数据形态分析...")
    try:
        # 获取所有没有pattern字段的记录
        records = mongo.db.lottery_results.find({"pattern": {"$exists": False}})
        count = 0
        
        for record in records:
            if 'result' in record and 'number_sum' in record:
                try:
                    # 分析开奖结果形态
                    number_sum = int(record['number_sum'])
                    pattern_analysis = analyze_lottery_result(record['result'], number_sum)
                    
                    if pattern_analysis and 'basic' in pattern_analysis:
                        # 更新记录，添加形态分析结果
                        update_data = {
                            "pattern": pattern_analysis['basic']['name'],
                            "pattern_type": pattern_analysis['basic']['pattern']
                        }
                        
                        # 添加极值和中边信息
                        if pattern_analysis['extreme']:
                            update_data['extreme'] = pattern_analysis['extreme']['name']
                            update_data['extreme_type'] = pattern_analysis['extreme']['pattern']
                        
                        if pattern_analysis['position']:
                            update_data['position'] = pattern_analysis['position']['name']
                            update_data['position_type'] = pattern_analysis['position']['pattern']
                        
                        # 更新数据库
                        mongo.db.lottery_results.update_one(
                            {"_id": record["_id"]},
                            {"$set": update_data}
                        )
                        count += 1
                except Exception as e:
                    app.logger.error(f"分析记录形态失败 (期号: {record.get('qihao', '未知')}): {e}")
        
        app.logger.info(f"形态分析初始化完成，更新了 {count} 条记录")
    except Exception as e:
        app.logger.error(f"形态分析初始化失败: {e}")

# 确保日志目录存在
if not os.path.exists('logs'):
    os.mkdir('logs')

# 配置日志
handler = RotatingFileHandler(config.LOG_FILE, maxBytes=10000000, backupCount=5)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
handler.setLevel(logging.getLevelName(config.LOG_LEVEL))
app.logger.addHandler(handler)
app.logger.setLevel(logging.getLevelName(config.LOG_LEVEL))
app.logger.info(f'{config.APP_NAME} 启动')

# 启动调度器
scheduler.start()

# 初始化形态分析
initialize_pattern_analysis()

# 添加自定义模板过滤器
@app.template_filter('safe_html')
def safe_html_filter(html_code):
    """模板过滤器：安全输出HTML代码"""
    if not html_code:
        return Markup("")
    
    # 对于51LA统计代码和其他已知安全的代码，直接输出
    # 对于用户自定义代码，进行基本过滤
    cleaned_code = sanitize_html_code(html_code)
    return Markup(cleaned_code)

# 自定义过滤器：获取当前年份
@app.template_filter('now')
def filter_now(format_string):
    return datetime.now().strftime(format_string)

# 根路由 - 显示开奖信息
@app.route('/')
def home():
    # 获取页码参数
    page = request.args.get('page', 1, type=int)
    
    # 每页显示条数
    per_page = 30
    
    # 计算跳过记录数
    skip = (page - 1) * per_page
    
    # 从数据库获取开奖数据
    lottery_results = db_manager.get_latest_results(limit=per_page, skip=skip)
    
    # 获取最新一期数据
    latest_result = None
    if page == 1:
        latest_result = db_manager.get_latest_result()
    
    # 不再获取API倒计时，而是传递最新开奖时间，让前端计算倒计时
    
    # 计算总页数
    total_count = db_manager.count_lottery_results()
    total_pages = math.ceil(total_count / per_page)
    # 限制最大页数为5页
    total_pages = min(total_pages, 5)
    if total_pages <= 0:
        total_pages = 1
    
    app.logger.info(f"获取到 {len(lottery_results)} 条开奖记录，页码：{page}/{total_pages}")
    
    # 获取调度器状态
    scheduler_status = scheduler.get_status()
    
    return render_template(
        'index.html', 
        title=config.APP_NAME,
        lottery_results=lottery_results,
        latest_result=latest_result,
        current_page=page,
        total_pages=total_pages,
        total_records=total_count,
        scheduler_status=scheduler_status,
        lottery_interval=210  # 开奖间隔时间（秒）
    )

# API路由 - 获取开奖数据
@app.route('/api/lottery/results')
def api_lottery_results():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    is_history = request.args.get('history', '0') == '1'
    
    # 计算跳过记录数
    skip = (page - 1) * limit
    
    # 从数据库获取数据
    results = db_manager.get_latest_results(limit=limit, skip=skip)
    total_count = db_manager.count_lottery_results()
    total_pages = math.ceil(total_count / limit)
    
    # 获取最新结果
    latest = None
    if not is_history and page == 1:
        latest = db_manager.get_latest_result()
    
    return jsonify({
        'status': 'success',
        'data': results,
        'latest': latest,
        'page': page,
        'count': len(results),
        'total_records': total_count,
        'total_pages': min(total_pages, 5)  # 最大5页
    })

# API路由 - 获取最新开奖结果
@app.route('/api/lottery/latest')
def api_latest_result():
    latest = db_manager.get_latest_result()
    if latest:
        return jsonify({
            'status': 'success',
            'data': latest
        })
    else:
        return jsonify({
            'status': 'error',
            'message': '无法获取最新开奖数据'
        }), 404

# API路由 - 手动刷新数据
@app.route('/api/refresh')
def api_refresh():
    success = scheduler.fetch_and_save_data()
    if success:
        return jsonify({
            'status': 'success',
            'message': '开奖数据刷新成功'
        })
    else:
        return jsonify({
            'status': 'error',
            'message': '开奖数据刷新失败'
        }), 500

# API状态
@app.route('/api/status')
def api_status():
    return jsonify({
        'status': 'online',
        'app_name': config.APP_NAME,
        'version': config.APP_VERSION,
        'scheduler': scheduler.get_status()
    })

# 添加历史记录路由
@app.route('/history')
def history():
    page = request.args.get('page', 1, type=int)
    per_page = 30
    skip = (page - 1) * per_page
    
    # 从数据库获取历史数据
    lottery_results = db_manager.get_latest_results(limit=per_page, skip=skip)
    
    # 计算总页数
    total_count = db_manager.count_lottery_results()
    total_pages = math.ceil(total_count / per_page)
    # 限制最大页数为5页
    total_pages = min(total_pages, 5)
    if total_pages <= 0:
        total_pages = 1
    
    return render_template(
        'index.html',  # 复用首页模板，后续可以创建专门的历史记录页面
        title=f"{config.APP_NAME} - 历史记录",
        lottery_results=lottery_results,
        latest_result=None,  # 历史页面不显示最新结果
        current_page=page,
        total_pages=total_pages,
        total_records=total_count,
        is_history_page=True  # 添加标记以区分历史页面
    )

# API路由 - 获取遗漏数据
@app.route('/api/missing')
def api_missing_data():
    """获取遗漏查询数据"""
    try:
        # 从API获取遗漏统计数据
        missing_stats = missing_analyzer.get_missing_statistics()
        
        if missing_stats:
            # 计算杂六的遗漏期数
            try:
                # 查询最近100条记录，找到最后一次出现杂六的记录
                recent_results = db_manager.get_latest_results(limit=100)
                
                # 初始化杂六遗漏期数
                mixed_missing_count = 0
                
                # 遍历所有记录，直到找到一个杂六
                for result in recent_results:
                    if result.get('pattern') is None or result.get('pattern') == '杂六':
                        break
                    mixed_missing_count += 1
                
                # 如果所有记录都不是杂六，设置为所有记录的长度
                if mixed_missing_count >= len(recent_results):
                    mixed_missing_count = len(recent_results)
                
                # 添加杂六遗漏到返回数据中
                missing_stats['pattern']['zl'] = mixed_missing_count
                
                app.logger.info(f"杂六遗漏期数计算结果: {mixed_missing_count}")
            except Exception as e:
                app.logger.error(f"计算杂六遗漏期数失败: {e}")
                # 如果计算失败，设置为0
                missing_stats['pattern']['zl'] = 0
            
            return jsonify({
                'status': 'success',
                'data': missing_stats
                # 最后更新时间显示已移除
            })
        else:
            return jsonify({
                'status': 'error',
                'message': '无法获取遗漏数据'
            }), 500
    except Exception as e:
        app.logger.error(f"获取遗漏数据失败: {e}")
        return jsonify({
            'status': 'error',
            'message': f'获取遗漏数据发生错误: {str(e)}'
        }), 500

# API路由 - 获取统计按钮相关的统计数据（大小单双、组合类型、极值类型、牌型等统计）
@app.route('/api/stats')
def api_stats_data():
    # 获取参数
    period = request.args.get('period', default=200, type=int)
    date_param = request.args.get('date', default='', type=str)
    
    try:
        # 确保期数在合理范围内
        if period < 50:
            period = 50
        elif period > 1000:
            period = 1000
        
        # 定义获取数据的变量
        lottery_data = []
        
        # 根据是否提供日期参数选择数据获取方式
        if date_param:
            try:
                # 解析日期参数
                selected_date = datetime.strptime(date_param, "%Y-%m-%d")
                
                # 计算日期范围（当天00:00:00到23:59:59）
                start_date = selected_date.replace(hour=0, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
                end_date = selected_date.replace(hour=23, minute=59, second=59).strftime("%Y-%m-%d %H:%M:%S")
                
                # 使用日期范围查询
                lottery_data = db_manager.get_results_by_date_range(start_date, end_date)
                app.logger.info(f"统计功能: 按日期查询数据: {date_param}, 获取到 {len(lottery_data)} 条记录, 起止时间: {start_date} 至 {end_date}")
            except ValueError:
                app.logger.error(f"无效的日期格式: {date_param}")
                return jsonify({
                    'status': 'error',
                    'message': '无效的日期格式'
                }), 400
        else:
            # 直接获取最新的N条记录
            lottery_data = list(mongo.db.lottery_results.find().sort('qihao', -1).limit(period))
            app.logger.info(f"统计功能: 按期数查询数据: {period}, 获取到 {len(lottery_data)} 条记录")
        
        if not lottery_data:
            return jsonify({
                'status': 'error',
                'message': '无法获取开奖数据'
            })
        
        # 统计结果
        basic_types = calculate_basic_stats(lottery_data)
        combination_types = calculate_combo_stats(lottery_data)
        sum_stats = calculate_sum_stats(lottery_data)
        pattern_types = calculate_pattern_stats(lottery_data)
        position_types = calculate_position_stats(lottery_data)
        continuous_stats = calculate_continuous_stats(lottery_data)
        
        # 构建标准化的数据结构
        actual_periods = len(lottery_data)
        app.logger.info(f"统计功能: 实际统计期数: {actual_periods}, 日期参数: {date_param}")
        
        stats = {
            'basic_types': basic_types,
            'combination_types': combination_types,
            'number_distribution': sum_stats,
            'pattern_types': pattern_types,
            'extreme_types': position_types,
            'continuous_stats': continuous_stats,
            'total_periods': actual_periods,  # 使用实际获取的数据长度作为总期数
            'date': date_param or datetime.now().strftime('%Y-%m-%d')
        }
        
        # 最后更新时间显示已移除
        
        # 返回统计结果
        return jsonify({
            'status': 'success',
            'data': stats
            # 最后更新时间已移除
        })
        
    except Exception as e:
        app.logger.error(f"统计功能: 获取数据失败: {e}")
        return jsonify({
            'status': 'error',
            'message': f'获取统计数据失败: {str(e)}'
        }), 500

# API路由 - 分析按钮相关的号码分析功能（单个号码的出现规律、间隔分析）
@app.route('/api/number_analysis')
def api_number_analysis():
    # 获取参数
    number = request.args.get('number', default='', type=str)
    periods = request.args.get('periods', default=200, type=int)
    
    try:
        # 参数验证
        if not number or not number.isdigit():
            return jsonify({
                'success': False,
                'message': '请提供有效的号码参数'
            })
        
        # 确保号码为两位数格式
        number = number.zfill(2)
        number_int = int(number)
        
        # 确保期数在合理范围内
        if periods < 50:
            periods = 50
        elif periods > 1000:
            periods = 1000
        
        # 获取开奖数据
        lottery_data = list(mongo.db.lottery_results.find().sort('qihao', -1).limit(periods))
        
        if not lottery_data:
            return jsonify({
                'success': False,
                'message': '无法获取开奖数据'
            })
        
        # 统计结果
        total_count = len(lottery_data)
        
        # 分析号码出现情况
        occurrences = []
        for i, record in enumerate(lottery_data):
            if 'number_sum' in record and int(record['number_sum']) == number_int:
                occurrences.append({
                    'index': i,
                    'qihao': record['qihao'],
                    'result': record,
                    'position': i
                })
        
        occurrence_count = len(occurrences)
        
        # 计算平均出现次数和间隔
        avg_times = round(occurrence_count / (total_count / 100), 2) if total_count > 0 else 0
        avg_interval = round(total_count / occurrence_count) if occurrence_count > 0 else total_count
        
        # 计算未开期数
        not_opened_periods = occurrences[0]['position'] if occurrence_count > 0 else total_count
        
        # 计算最小和最大间隔
        intervals = []
        for i in range(1, len(occurrences)):
            # 使用绝对值确保间隔为正数
            interval = abs(occurrences[i-1]['position'] - occurrences[i]['position'])
            intervals.append(interval)
        
        min_interval = min(intervals) if intervals else 0
        max_interval = max(intervals) if intervals else 0
        
        # 获取出号前后的相关号码
        before_numbers = {}
        after_numbers = {}
        after_tails = {}
        after_combos = {}
        
        for i, occ in enumerate(occurrences):
            current_pos = occ['position']
            
            # 收集出号前的号码
            if current_pos < len(lottery_data) - 1:
                before_rec = lottery_data[current_pos + 1]
                before_num = str(before_rec['number_sum']).zfill(2)
                
                if before_num in before_numbers:
                    before_numbers[before_num] += 1
                else:
                    before_numbers[before_num] = 1
            
            # 收集出号后的号码
            if current_pos > 0:
                after_rec = lottery_data[current_pos - 1]
                after_num = str(after_rec['number_sum']).zfill(2)
                
                # 记录完整号码
                if after_num in after_numbers:
                    after_numbers[after_num] += 1
                else:
                    after_numbers[after_num] = 1
                
                # 记录尾数
                tail = after_num[-1]
                if tail in after_tails:
                    after_tails[tail] += 1
                else:
                    after_tails[tail] = 1
                
                # 记录组合
                combo = ''
                if 'size' in after_rec and 'odd_even' in after_rec:
                    if after_rec['size'] == '大' and after_rec['odd_even'] == '单':
                        combo = '大单'
                    elif after_rec['size'] == '大' and after_rec['odd_even'] == '双':
                        combo = '大双'
                    elif after_rec['size'] == '小' and after_rec['odd_even'] == '单':
                        combo = '小单'
                    elif after_rec['size'] == '小' and after_rec['odd_even'] == '双':
                        combo = '小双'
                    elif after_rec['size'] == '大':
                        combo = '大'
                    elif after_rec['size'] == '小':
                        combo = '小'
                
                if combo:
                    if combo in after_combos:
                        after_combos[combo] += 1
                    else:
                        after_combos[combo] = 1
        
        # 转换为排序后的列表格式
        before_numbers_list = [{'number': k, 'count': v} for k, v in before_numbers.items()]
        before_numbers_list.sort(key=lambda x: x['count'], reverse=True)
        
        after_numbers_list = [{'number': k, 'count': v} for k, v in after_numbers.items()]
        after_numbers_list.sort(key=lambda x: x['count'], reverse=True)
        
        after_tails_list = [{'tail': k, 'count': v} for k, v in after_tails.items()]
        after_tails_list.sort(key=lambda x: x['count'], reverse=True)
        
        after_combos_list = [{'combo': k, 'count': v} for k, v in after_combos.items()]
        after_combos_list.sort(key=lambda x: x['count'], reverse=True)
        
        # 限制结果数量
        max_items = 10
        before_numbers_list = before_numbers_list[:max_items]
        after_numbers_list = after_numbers_list[:max_items]
        after_tails_list = after_tails_list[:max_items]
        after_combos_list = after_combos_list[:max_items]
        
        analysis_result = {
            'number': number,
            'total_periods': total_count,
            'occurrence_count': occurrence_count,
            'avg_times': avg_times,
            'avg_interval': avg_interval,
            'not_opened_periods': not_opened_periods,
            'min_interval': min_interval,
            'max_interval': max_interval,
            'before_numbers': before_numbers_list,
            'after_numbers': after_numbers_list,
            'after_tails': after_tails_list,
            'after_combos': after_combos_list
            # 最后更新时间显示已移除
        }
        
        return jsonify({
            'success': True,
            'data': analysis_result
        })
        
    except Exception as e:
        app.logger.error(f"获取号码分析数据失败: {e}")
        return jsonify({
            'success': False,
            'message': f'获取号码分析数据失败: {str(e)}'
        }), 500

# 计算基本统计信息
def calculate_basic_stats(lottery_data):
    big_count = 0
    small_count = 0
    odd_count = 0
    even_count = 0
    total_count = len(lottery_data)
    
    for record in lottery_data:
        if 'size' in record and record['size'] == '大':
            big_count += 1
        elif 'size' in record and record['size'] == '小':
            small_count += 1
            
        if 'odd_even' in record and record['odd_even'] == '单':
            odd_count += 1
        elif 'odd_even' in record and record['odd_even'] == '双':
            even_count += 1
    
    return {
        'big': {
            'count': big_count,
            'percentage': round(big_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'small': {
            'count': small_count,
            'percentage': round(small_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'odd': {
            'count': odd_count,
            'percentage': round(odd_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'even': {
            'count': even_count,
            'percentage': round(even_count / total_count * 100, 1) if total_count > 0 else 0
        }
    }

# 计算组合统计信息
def calculate_combo_stats(lottery_data):
    big_odd_count = 0
    big_even_count = 0
    small_odd_count = 0
    small_even_count = 0
    total_count = len(lottery_data)
    
    for record in lottery_data:
        if 'size' in record and 'odd_even' in record:
            if record['size'] == '大' and record['odd_even'] == '单':
                big_odd_count += 1
            elif record['size'] == '大' and record['odd_even'] == '双':
                big_even_count += 1
            elif record['size'] == '小' and record['odd_even'] == '单':
                small_odd_count += 1
            elif record['size'] == '小' and record['odd_even'] == '双':
                small_even_count += 1
    
    return {
        'big_odd': {
            'count': big_odd_count,
            'percentage': round(big_odd_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'big_even': {
            'count': big_even_count,
            'percentage': round(big_even_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'small_odd': {
            'count': small_odd_count,
            'percentage': round(small_odd_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'small_even': {
            'count': small_even_count,
            'percentage': round(small_even_count / total_count * 100, 1) if total_count > 0 else 0
        }
    }

# 计算和值统计信息
def calculate_sum_stats(lottery_data):
    sum_counts = {}
    total_count = len(lottery_data)
    
    # 初始化和值计数
    for i in range(28):
        sum_counts[f"{i:02d}"] = {'count': 0, 'percentage': 0}
    
    # 统计和值出现次数
    for record in lottery_data:
        if 'number_sum' in record:
            try:
                number_sum = str(int(record['number_sum'])).zfill(2)
                if number_sum in sum_counts:
                    sum_counts[number_sum]['count'] += 1
            except (ValueError, TypeError):
                # 跳过无法转换的值
                pass
    
    # 计算百分比
    if total_count > 0:
        for key in sum_counts:
            sum_counts[key]['percentage'] = round(sum_counts[key]['count'] / total_count * 100, 1)
    
    return sum_counts

# 计算形态统计信息
def calculate_pattern_stats(lottery_data):
    pattern_counts = {
        'mixed': {'count': 0, 'percentage': 0},
        'pair': {'count': 0, 'percentage': 0},
        'straight': {'count': 0, 'percentage': 0},
        'triple': {'count': 0, 'percentage': 0}
    }
    total_count = len(lottery_data)
    
    for record in lottery_data:
        pattern = record.get('pattern')
        if pattern is None or pattern == '杂六':
            pattern_counts['mixed']['count'] += 1
        elif pattern == '对子':
            pattern_counts['pair']['count'] += 1
        elif pattern == '顺子':
            pattern_counts['straight']['count'] += 1
        elif pattern == '豹子':
            pattern_counts['triple']['count'] += 1
    
    # 计算百分比
    if total_count > 0:
        for key in pattern_counts:
            pattern_counts[key]['percentage'] = round(pattern_counts[key]['count'] / total_count * 100, 1)
    
    return pattern_counts

# 计算位置统计信息
def calculate_position_stats(lottery_data):
    # 初始化统计计数
    extreme_small_count = 0
    extreme_big_count = 0
    middle_count = 0
    total_count = len(lottery_data)
    
    for record in lottery_data:
        if 'number_sum' in record:
            try:
                num_sum = int(record['number_sum'])
                if num_sum <= 5:
                    extreme_small_count += 1
                elif num_sum >= 22:
                    extreme_big_count += 1
                else:
                    middle_count += 1
            except (ValueError, TypeError):
                # 跳过无法转换的值
                pass
    
    # 计算百分比
    extreme_small_percentage = round(extreme_small_count / total_count * 100, 1) if total_count > 0 else 0
    extreme_big_percentage = round(extreme_big_count / total_count * 100, 1) if total_count > 0 else 0
    
    # 返回前端期望的格式
    return {
        'extreme_small': {
            'count': extreme_small_count,
            'percentage': extreme_small_percentage
        },
        'extreme_big': {
            'count': extreme_big_count,
            'percentage': extreme_big_percentage
        },
        'small_edge': {
            'count': extreme_small_count,
            'percentage': extreme_small_percentage
        },
        'middle': {
            'count': middle_count,
            'percentage': round(middle_count / total_count * 100, 1) if total_count > 0 else 0
        },
        'big_edge': {
            'count': extreme_big_count,
            'percentage': extreme_big_percentage
        }
    }

# 计算连续统计信息
def calculate_continuous_stats(lottery_data):
    # 初始化统计数据
    continuous_stats = {
        'big': {'max': 0, 'current': 0},
        'small': {'max': 0, 'current': 0},
        'odd': {'max': 0, 'current': 0},
        'even': {'max': 0, 'current': 0},
        'big_odd': {'max': 0, 'current': 0},
        'big_even': {'max': 0, 'current': 0},
        'small_odd': {'max': 0, 'current': 0},
        'small_even': {'max': 0, 'current': 0}
    }
    
    # 记录最后一次出现的类型
    last_size = None
    last_odd_even = None
    last_combo = None
    
    # 倒序分析，从最新一期开始
    for record in lottery_data:
        size = record.get('size')
        odd_even = record.get('odd_even')
        
        # 大小连续统计
        if size == '大':
            if last_size == '大':
                continuous_stats['big']['current'] += 1
            else:
                continuous_stats['big']['current'] = 1
            continuous_stats['small']['current'] = 0
        elif size == '小':
            if last_size == '小':
                continuous_stats['small']['current'] += 1
            else:
                continuous_stats['small']['current'] = 1
            continuous_stats['big']['current'] = 0
        
        # 单双连续统计
        if odd_even == '单':
            if last_odd_even == '单':
                continuous_stats['odd']['current'] += 1
            else:
                continuous_stats['odd']['current'] = 1
            continuous_stats['even']['current'] = 0
        elif odd_even == '双':
            if last_odd_even == '双':
                continuous_stats['even']['current'] += 1
            else:
                continuous_stats['even']['current'] = 1
            continuous_stats['odd']['current'] = 0
        
        # 组合连续统计
        combo = None
        if size and odd_even:
            if size == '大' and odd_even == '单':
                combo = 'big_odd'
            elif size == '大' and odd_even == '双':
                combo = 'big_even'
            elif size == '小' and odd_even == '单':
                combo = 'small_odd'
            elif size == '小' and odd_even == '双':
                combo = 'small_even'
            
            if combo:
                if last_combo == combo:
                    continuous_stats[combo]['current'] += 1
                else:
                    continuous_stats[combo]['current'] = 1
                
                # 重置其他组合
                for other_combo in ['big_odd', 'big_even', 'small_odd', 'small_even']:
                    if other_combo != combo:
                        continuous_stats[other_combo]['current'] = 0
        
        # 更新最大连续次数
        for key in continuous_stats:
            if continuous_stats[key]['current'] > continuous_stats[key]['max']:
                continuous_stats[key]['max'] = continuous_stats[key]['current']
        
        # 更新上一次类型
        last_size = size
        last_odd_even = odd_even
        last_combo = combo
    
    return continuous_stats

# 应用错误处理
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error('服务器错误: %s', error)
    return render_template('500.html'), 500

# 应用退出时的清理工作
@app.teardown_appcontext
def shutdown_scheduler(exception=None):
    scheduler.stop()

# 管理员路由 - 登录页面
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    # 如果已经登录，直接跳转到管理后台
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))
    
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 验证用户名和密码
        if username == config.ADMIN_USERNAME and password == config.ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            app.logger.info(f"管理员登录成功: {username}")
            return redirect(url_for('admin_dashboard'))
        else:
            app.logger.warning(f"管理员登录失败: {username}")
            error = '用户名或密码错误'
    
    return render_template('admin_login.html', error=error, title='管理员登录')

# 管理员路由 - 管理后台主页
@app.route('/admin', methods=['GET'])
def admin_dashboard():
    # 检查是否已登录
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    # 获取当前站点配置
    site_config = config.SITE_CONFIG
    
    # 获取成功消息（如果有）
    success_message = session.pop('success_message', None)
    
    return render_template(
        'admin_dashboard.html',
        title='管理后台',
        site_config=site_config,
        success_message=success_message
    )

# 管理员路由 - 保存网站配置
@app.route('/admin/save-config', methods=['POST'])
def admin_save_config():
    # 检查是否已登录
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    # 获取基本网站配置数据
    config.SITE_CONFIG['title'] = request.form.get('title', '').strip()
    config.SITE_CONFIG['description'] = request.form.get('description', '').strip()
    config.SITE_CONFIG['copyright'] = request.form.get('copyright', '').strip()
    config.SITE_CONFIG['keywords'] = request.form.get('keywords', '').strip()
    config.SITE_CONFIG['beian'] = request.form.get('beian', '').strip()
    config.SITE_CONFIG['contact_email'] = request.form.get('contact_email', '').strip()
    
    # 获取自定义HTML代码配置
    html_enabled = request.form.get('html_enabled') == 'on'
    head_code = request.form.get('head_code', '').strip()
    footer_code = request.form.get('footer_code', '').strip()
    la51_code = request.form.get('la51_code', '').strip()
    
    # 更新自定义HTML配置
    if 'custom_html' not in config.SITE_CONFIG:
        config.SITE_CONFIG['custom_html'] = {}
    
    config.SITE_CONFIG['custom_html']['enabled'] = html_enabled
    config.SITE_CONFIG['custom_html']['head_code'] = head_code
    config.SITE_CONFIG['custom_html']['footer_code'] = footer_code
    config.SITE_CONFIG['custom_html']['la51_code'] = la51_code
    
    # 更新应用名称
    app.config['APP_NAME'] = config.SITE_CONFIG['title']
    
    # 记录日志
    app.logger.info("网站配置已更新，包括自定义HTML代码")
    app.logger.info(f"HTML代码功能状态: {'启用' if html_enabled else '禁用'}")
    if html_enabled:
        if head_code:
            app.logger.info("已更新页面头部自定义代码")
        if footer_code:
            app.logger.info("已更新页面底部自定义代码")
        if la51_code:
            app.logger.info("已更新51LA统计代码")
    
    # 设置成功消息
    session['success_message'] = '网站配置已成功保存'
    
    return redirect(url_for('admin_dashboard'))

# 管理员路由 - 退出登录
@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

# ===== 广告管理相关路由 =====

# 工具函数：检查文件扩展名
def allowed_file(filename):
    """检查上传文件是否为允许的类型"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.UPLOAD_CONFIG['allowed_extensions']

# 工具函数：处理图片上传
def handle_image_upload(file):
    """处理图片上传，包括验证、压缩和保存"""
    try:
        if not file or file.filename == '':
            return None, "未选择文件"
        
        if not allowed_file(file.filename):
            return None, f"不支持的文件格式，仅支持: {', '.join(config.UPLOAD_CONFIG['allowed_extensions'])}"
        
        # 检查文件大小
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > config.UPLOAD_CONFIG['max_file_size']:
            return None, f"文件大小超过限制 ({config.UPLOAD_CONFIG['max_file_size'] // (1024*1024)}MB)"
        
        # 生成安全的文件名
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        # 确保上传目录存在
        upload_dir = config.UPLOAD_CONFIG['ads_folder']
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        
        # 保存原始文件
        file.save(file_path)
        
        # 使用PIL处理图片
        try:
            with Image.open(file_path) as img:
                # 获取原始尺寸
                width, height = img.size
                
                # 检查尺寸限制
                max_width = config.UPLOAD_CONFIG['max_width']
                max_height = config.UPLOAD_CONFIG['max_height']
                
                # 如果超过限制，等比例缩放
                if width > max_width or height > max_height:
                    # 计算缩放比例
                    ratio = min(max_width / width, max_height / height)
                    new_width = int(width * ratio)
                    new_height = int(height * ratio)
                    
                    # 缩放图片
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    img.save(file_path, optimize=True, quality=85)
                    
                    app.logger.info(f"图片已缩放: {width}x{height} -> {new_width}x{new_height}")
        
        except Exception as e:
            app.logger.error(f"图片处理失败: {e}")
            # 如果图片处理失败，删除文件
            if os.path.exists(file_path):
                os.remove(file_path)
            return None, "图片处理失败，请确保文件为有效的图片格式"
        
        # 返回相对路径（用于数据库存储和前端显示）
        relative_path = file_path.replace('static/', '')
        app.logger.info(f"图片上传成功: {relative_path}")
        return relative_path, None
        
    except Exception as e:
        app.logger.error(f"文件上传失败: {e}")
        return None, f"上传失败: {str(e)}"

# 广告管理页面
@app.route('/admin/ads')
def admin_ads():
    """广告管理页面"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    # 获取所有广告
    ads = db_manager.get_all_ads()
    
    # 获取成功消息
    success_message = session.pop('success_message', None)
    error_message = session.pop('error_message', None)
    
    return render_template(
        'admin_ads.html',
        title='广告管理',
        ads=ads,
        ads_config=config.ADS_CONFIG,
        success_message=success_message,
        error_message=error_message
    )

# 保存广告
@app.route('/admin/ads/save', methods=['POST'])
def admin_save_ad():
    """保存广告数据"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    try:
        # 获取表单数据
        ad_id = request.form.get('ad_id', '').strip()
        title = request.form.get('title', '').strip()
        link_url = request.form.get('link_url', '').strip()
        link_type = request.form.get('link_type', 'external')
        position = request.form.get('position', 'content')
        enabled = request.form.get('enabled') == 'on'
        sort_order = request.form.get('sort_order', type=int) or 1
        
        # 验证必要字段
        if not title:
            session['error_message'] = '广告标题不能为空'
            return redirect(url_for('admin_ads'))
        
        if not link_url:
            session['error_message'] = '广告链接不能为空'
            return redirect(url_for('admin_ads'))
        
        # 处理图片
        image_url = request.form.get('existing_image_url', '').strip()
        uploaded_file = request.files.get('image_file')
        
        # 如果上传了新图片
        if uploaded_file and uploaded_file.filename:
            new_image_path, error = handle_image_upload(uploaded_file)
            if error:
                session['error_message'] = f'图片上传失败: {error}'
                return redirect(url_for('admin_ads'))
            image_url = new_image_path
        
        # 如果没有图片，使用外链
        if not image_url:
            image_url = request.form.get('image_url', '').strip()
        
        if not image_url:
            session['error_message'] = '请上传图片或提供图片链接'
            return redirect(url_for('admin_ads'))
        
        # 构建广告数据
        ad_data = {
            'title': title,
            'image_url': image_url,
            'link_url': link_url,
            'link_type': link_type,
            'position': position,
            'enabled': enabled,
            'sort_order': sort_order
        }
        
        # 保存或更新广告
        if ad_id:
            # 更新现有广告
            success = db_manager.update_ad(ad_id, ad_data)
            if success:
                session['success_message'] = '广告更新成功'
                app.logger.info(f"广告更新成功: {title} (ID: {ad_id})")
            else:
                session['error_message'] = '广告更新失败'
                app.logger.error(f"广告更新失败: {title} (ID: {ad_id})")
        else:
            # 创建新广告
            new_ad_id = db_manager.save_ad(ad_data)
            if new_ad_id:
                session['success_message'] = '广告创建成功'
                app.logger.info(f"广告创建成功: {title} (ID: {new_ad_id})")
            else:
                session['error_message'] = '广告创建失败'
                app.logger.error(f"广告创建失败: {title}")
        
    except Exception as e:
        app.logger.error(f"保存广告时发生错误: {e}")
        session['error_message'] = f'保存广告时发生错误: {str(e)}'
    
    return redirect(url_for('admin_ads'))

# 删除广告
@app.route('/admin/ads/delete/<ad_id>', methods=['POST'])
def admin_delete_ad(ad_id):
    """删除广告"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    try:
        # 获取广告信息（用于删除本地图片文件）
        ad = db_manager.get_ad_by_id(ad_id)
        
        # 删除广告
        success = db_manager.delete_ad(ad_id)
        
        if success:
            # 如果是本地图片，尝试删除文件
            if ad and ad.get('image_url', '').startswith('uploads/'):
                image_path = os.path.join('static', ad['image_url'])
                if os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                        app.logger.info(f"已删除图片文件: {image_path}")
                    except Exception as e:
                        app.logger.warning(f"删除图片文件失败: {e}")
            
            session['success_message'] = '广告删除成功'
            app.logger.info(f"广告删除成功，ID: {ad_id}")
        else:
            session['error_message'] = '广告删除失败'
            app.logger.error(f"广告删除失败，ID: {ad_id}")
        
    except Exception as e:
        app.logger.error(f"删除广告时发生错误: {e}")
        session['error_message'] = f'删除广告时发生错误: {str(e)}'
    
    return redirect(url_for('admin_ads'))

# API: 获取指定位置的广告
@app.route('/api/ads/<position>')
def api_get_ads(position):
    """获取指定位置的广告数据"""
    try:
        # 检查广告功能是否启用
        if not config.ADS_CONFIG.get('enabled', False):
            return jsonify({'ads': []})
        
        # 验证位置参数
        if position not in config.ADS_CONFIG['positions']:
            return jsonify({'error': '无效的广告位置'}), 400
        
        # 获取该位置的广告
        ads = db_manager.get_ads_by_position(position, enabled_only=True)
        
        return jsonify({'ads': ads})
        
    except Exception as e:
        app.logger.error(f"获取广告数据失败: {e}")
        return jsonify({'error': '获取广告数据失败'}), 500

# 启动应用
if __name__ == '__main__':
    # 注意：Flask 2.3 使用了新的run参数
    app.run(debug=config.DEBUG, host='0.0.0.0', port=5000, use_reloader=True) 