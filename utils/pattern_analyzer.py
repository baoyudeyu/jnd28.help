#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
PC28号码形态分析工具
"""

from config import PATTERN_TYPES

def get_numbers_from_result(result_str):
    """从开奖结果字符串中提取数字列表"""
    try:
        # 解析格式类似 "1+2+3" 的字符串
        if '+' in result_str:
            numbers = [int(num.strip()) for num in result_str.split('+')]
            return numbers
        # 尝试直接拆分每个字符
        numbers = [int(ch) for ch in result_str if ch.isdigit()]
        return numbers
    except:
        return []

def analyze_basic_pattern(numbers):
    """
    分析号码的基本形态（对子、顺子、豹子、杂六）
    
    参数:
        numbers: 号码列表，例如 [1, 2, 3]
        
    返回:
        dict: 包含形态分析结果的字典
    """
    if not numbers or len(numbers) != 3:
        return {'pattern': 'mixed', 'name': '杂六'}
    
    # 将号码排序
    sorted_nums = sorted(numbers)
    
    # 检查是否为豹子（三个数字完全相同）
    if sorted_nums[0] == sorted_nums[1] == sorted_nums[2]:
        return {'pattern': 'leopard', 'name': '豹子'}
    
    # 检查是否为对子（两个数字相同）
    if (sorted_nums[0] == sorted_nums[1] or 
        sorted_nums[1] == sorted_nums[2] or 
        sorted_nums[0] == sorted_nums[2]):
        return {'pattern': 'pair', 'name': '对子'}
    
    # 检查是否为顺子（三个连续数字）
    if sorted_nums[0] + 1 == sorted_nums[1] and sorted_nums[1] + 1 == sorted_nums[2]:
        return {'pattern': 'straight', 'name': '顺子'}
    
    # 默认为杂六
    return {'pattern': 'mixed', 'name': '杂六'}

def analyze_extreme_value(sum_value):
    """
    分析号码和值的极值情况（极大、极小）
    
    参数:
        sum_value: 号码和值
        
    返回:
        dict: 包含极值分析结果的字典，若不符合极值条件则返回None
    """
    extreme_types = PATTERN_TYPES['EXTREME']['types']
    
    # 检查极小
    min_range = extreme_types['MIN_EXTREME']['range']
    if min_range[0] <= sum_value <= min_range[1]:
        return {'pattern': 'min_extreme', 'name': '极小'}
    
    # 检查极大
    max_range = extreme_types['MAX_EXTREME']['range']
    if max_range[0] <= sum_value <= max_range[1]:
        return {'pattern': 'max_extreme', 'name': '极大'}
    
    return None

def analyze_position(sum_value):
    """
    分析号码和值的中边情况（小边、中数、大边）
    
    参数:
        sum_value: 号码和值
        
    返回:
        dict: 包含中边分析结果的字典
    """
    position_types = PATTERN_TYPES['POSITION']['types']
    
    # 检查小边
    small_range = position_types['SMALL_EDGE']['range']
    if small_range[0] <= sum_value <= small_range[1]:
        return {'pattern': 'small_edge', 'name': '小边'}
    
    # 检查中数
    middle_range = position_types['MIDDLE']['range']
    if middle_range[0] <= sum_value <= middle_range[1]:
        return {'pattern': 'middle', 'name': '中数'}
    
    # 检查大边
    big_range = position_types['BIG_EDGE']['range']
    if big_range[0] <= sum_value <= big_range[1]:
        return {'pattern': 'big_edge', 'name': '大边'}
    
    return None

def analyze_lottery_result(result, number_sum=None):
    """
    综合分析一组开奖号码的所有形态
    
    参数:
        result: 开奖结果字符串，例如 "1+2+3"
        number_sum: 预计算的和值，若为None则自动计算
        
    返回:
        dict: 包含所有形态分析结果的字典
    """
    numbers = get_numbers_from_result(result)
    if not numbers:
        return {
            'basic': {'pattern': 'unknown', 'name': '未知'},
            'extreme': None,
            'position': None
        }
    
    # 如果和值未提供，则计算和值
    sum_value = number_sum if number_sum is not None else sum(numbers)
    
    # 分析各种形态
    basic_pattern = analyze_basic_pattern(numbers)
    extreme_value = analyze_extreme_value(sum_value)
    position = analyze_position(sum_value)
    
    return {
        'basic': basic_pattern,
        'extreme': extreme_value,
        'position': position
    } 