// 使用AJAX加载分页数据
function loadPageData(page) {
    // 显示加载状态
    $('#lottery-results').html('<tr><td colspan="5" class="text-center"><i class="bi bi-hourglass-split"></i> 加载数据中...</td></tr>');
    
    // 判断当前是否在历史页面
    const isHistoryPage = window.location.pathname.includes('/history');
    const urlPath = isHistoryPage ? '/history' : '/';
    
    // 构建API URL
    let url = '/api/lottery/results?page=' + page;
    if (isHistoryPage) {
        url += '&history=1';
    }
    
    // 使用AJAX获取数据
    $.get(url)
        .done(function(response) {
            if (response.status === 'success') {
                // 清空表格
                $('#lottery-results').empty();
                
                // 检查是否有数据
                if (response.data && response.data.length > 0) {
                    // 添加数据行
                    response.data.forEach(function(item) {
                        
                        const row = `
                            <tr data-qihao="${item.qihao}">
                                <td class="text-center">${item.qihao}</td>
                                <td class="text-center">${item.opentime}</td>
                                <td class="text-center">${item.result}=${item.number_sum}</td>
                                <td class="text-center">
                                    <span class="combination">
                                        <span class="${item.size === '大' ? 'big' : 'small'}">${item.size}</span><span class="${item.odd_even === '单' ? 'odd' : 'even'}">${item.odd_even}</span>
                                    </span>
                                </td>
                                <td class="text-center">
                                    ${item.pattern ? 
                                    `<span class="pattern-badge ${item.pattern.toLowerCase()}">${item.pattern}</span>` : 
                                    '<span class="pattern-badge mixed">杂六</span>'}
                                </td>
                            </tr>
                        `;
                        $('#lottery-results').append(row);
                    });
                    
                    // 检查是否没有添加任何行
                    if ($('#lottery-results tr').length === 0) {
                        $('#lottery-results').html('<tr><td colspan="5" class="text-center">暂无数据</td></tr>');
                    }
                } else {
                    // 无数据显示
                    $('#lottery-results').html('<tr><td colspan="5" class="text-center">暂无数据</td></tr>');
                }
                
                // 更新分页按钮状态
                updatePagination(page, response.total_pages);
                
                // 更新URL，不刷新页面
                history.pushState(null, null, urlPath + '?page=' + page);
                
                // 应用样式
                highlightResults();
            } else {
                // 加载失败
                $('#lottery-results').html('<tr><td colspan="5" class="text-center text-danger">加载数据失败</td></tr>');
            }
        })
        .fail(function() {
            // 请求失败
            $('#lottery-results').html('<tr><td colspan="5" class="text-center text-danger">网络错误，请稍后重试</td></tr>');
        });
}

// 更新分页控件状态
function updatePagination(currentPage, totalPages) {
    // 将当前页码转换为数字
    currentPage = parseInt(currentPage);
    
    // 更新上一页按钮
    if (currentPage > 1) {
        $('.pagination li:first-child')
            .removeClass('disabled')
            .find('a')
            .attr('data-page', currentPage - 1)
            .addClass('page-ajax-link')
            .attr('href', 'javascript:void(0)');
    } else {
        $('.pagination li:first-child')
            .addClass('disabled')
            .find('a')
            .removeAttr('data-page')
            .removeClass('page-ajax-link');
    }
    
    // 更新下一页按钮
    if (currentPage < totalPages) {
        $('.pagination li:last-child')
            .removeClass('disabled')
            .find('a')
            .attr('data-page', currentPage + 1)
            .addClass('page-ajax-link')
            .attr('href', 'javascript:void(0)');
    } else {
        $('.pagination li:last-child')
            .addClass('disabled')
            .find('a')
            .removeAttr('data-page')
            .removeClass('page-ajax-link');
    }
    
    // 更新页码按钮
    const paginationItems = $('.pagination li:not(:first-child):not(:last-child)');
    paginationItems.each(function(index) {
        const pageNum = index + 1;
        if (pageNum === currentPage) {
            $(this).addClass('active').html(`<span class="page-link">${pageNum}</span>`);
        } else if (pageNum <= totalPages) {
            $(this).removeClass('active').html(`<a class="page-link page-ajax-link" href="javascript:void(0)" data-page="${pageNum}">${pageNum}</a>`);
        }
    });
    
    // 重新绑定点击事件
    $('.page-ajax-link').off('click').on('click', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        
        // 根据当前激活的按钮决定加载哪种数据
        if ($('#lottery-records-btn').hasClass('active')) {
            loadPageData(page);
        } else if ($('#trend-analysis-btn').hasClass('active')) {
            loadTrendAnalysisData(page);
        }
    });
} 