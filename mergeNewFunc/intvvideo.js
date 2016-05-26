/**
 * Author: Alex Q
 * Description: 基于html5视频插件video.js的后台视频互动添加界面
 */

var intvVideo = (function(){
    var debug = false;
    // remove the base theme style
    window.VIDEOJS_NO_BASE_THEME = false;
    var myFakePin, myActPin, duration, myControlPanel, myPin, myCurrentTimeTip, myProductList, myProductInfo, lastCurrentTime, lastTimestamp, lastMoment, lastMoment2, addMode, addListCount, currentActiveListId, isDragging, startLeft, myPlayer, goodsSaveUrl, goodsDelUrl, resizeMode;

    addList = [];

    var secondsToHms, hmsToSeconds, addItem, updateList, removeFromList, drawRect, updateInput, getMaxId, formatTimeTip, log, updateProductList, getListItemById, triggerKeyEvent, getAddList, init, updateProductInfo;

    init = function() {
        // init the video player instance
        myPlayer = videojs('my-video', {
            bigPlayButton: true
        }, function () {
            player = this,
            myControlPanel = $('.control-panel'),
            myPin = myControlPanel.find('span.current-time-pin'),
            myCurrentTimeTip = $('.time-tip'),
            myProductList = $('#product-list > tbody'),
            myProductInfo = $('#product-info')

            lastCurrentTime = 0,
            lastTimestamp = 0,
            lastMoment = 0,
            lastMoment2 = 0,

            addMode = false,
            addListCount = 0,
            currentActiveListId = 0,
            isDragging = false,
            startLeft = 0;

            player.on('loadedmetadata', function () {
                duration = player.duration();

                player.play();
                player.pause();

                myCurrentTimeTip.html(formatTimeTip(0, duration));


                player.on('timeupdate', function () {

                    var currentTime = this.currentTime();
                    // var duration = this.duration();

                    myPin.css({
                        'left': (currentTime / duration * 100) + '%',
                    })

                    myCurrentTimeTip.html(formatTimeTip(currentTime, duration));

                    lastCurrentTime = currentTime;

                });

                myControlPanel.on('mousedown', function (e) {

                    if (!addMode) return

                    var $node = $(e.target)
                    resizeMode = $node.is('.act-pin.active')

                    isDragging = true;

                    startLeft = parseInt((e.clientX - myControlPanel.offset().left) / myControlPanel.width() * duration);

                    if(resizeMode) {
                        var leftBorderPos = Number($node.css('left').replace(/px$/, ''))
                        var rightBorderPos = Number($node.css('width').replace(/px$/, '')) + leftBorderPos
                        console.log('resize mode')

                        if( ((e.clientX - myControlPanel.offset().left) - leftBorderPos) < 30 ) { //左边界
                            $node.css('cursor', 'ew-resize')
                            startLeft = parseInt((rightBorderPos / myControlPanel.width()) * duration)
                            console.log('------')
                            console.log(startLeft)
                        } else if( (rightBorderPos - (e.clientX - myControlPanel.offset().left)) < 30 ) { //右边界
                            $node.css('cursor', 'ew-resize')
                            startLeft = parseInt((leftBorderPos / myControlPanel.width()) * duration)
                            startLeft = startLeft ? startLeft + 1 : 0
                            console.log('------')
                            console.log(startLeft)
                        }
                    }

                    if ($.find('#act-pin-' + currentActiveListId).length) {
                        myActPin = $('#act-pin-' + currentActiveListId);
                    } else {
                        $('span.act-pin.active').removeClass('active');
                        myActPin = $('<span id="act-pin-' + currentActiveListId + '" class="act-pin active"></span>').appendTo(myControlPanel);
                    }

                });

                myControlPanel.on('mouseup', function (e) {

                    if (!addMode) return

                    myActPin.text(currentActiveListId);
                    startLeft = 0;
                    isDragging = false;

                });

                myControlPanel.on('mouseenter', function (e) {

                    if (!player.paused()) return

                    if (!addMode) {
                        myFakePin = $('<span class="fake-pin"></span>').appendTo(myControlPanel);
                    }

                });

                myControlPanel.on('mousemove', function (e) {

                    if (!player.paused() || (e.timeStamp - lastTimestamp < 50)) {
                        lastTimestamp = e.timeStamp;
                        return false;
                    }

                    var delta = e.clientX - myControlPanel.offset().left;
                    var currentMoment = parseInt(delta / myControlPanel.width() * duration);

                    if (addMode) {
                        debug && console.log('add mode is on [mouse move]');
                        if (isDragging) {
                            debug && console.log('startleft : ' + startLeft);

                            debug && console.log('addMode currentMoment : ' + currentMoment);
                            debug && console.log('addMode delta : ' + delta);

                            if (lastMoment2 === currentMoment) {
                                return false;
                            }

                            lastMoment2 = currentMoment;

                            drawRect(myActPin, currentActiveListId, startLeft, currentMoment);

                            myProductInfo.find('.start input.time').val(secondsToHms(startLeft > currentMoment ? currentMoment : startLeft));
                            myProductInfo.find('.end input.time').val(secondsToHms(parseInt(currentMoment > startLeft ? currentMoment : startLeft)));

                            myCurrentTimeTip.html(formatTimeTip(currentMoment, duration));

                            player.currentTime(currentMoment)

                        }
                    } else {

                        debug && console.log('lastMoment: ' + lastMoment);
                        debug && console.log('currentMoment: ' + currentMoment);

                        if (currentMoment === lastMoment) {
                            return false;
                        }

                        lastMoment = currentMoment;
                        var leftStyle = (currentMoment / duration) * 100;
                        myFakePin.css('left', leftStyle + '%');
                        myCurrentTimeTip.html(formatTimeTip(currentMoment, duration));

                    }
                });

                myControlPanel.on('mouseleave', function (e) {

                    if (!player.paused()) return

                    if (addMode) {
                        debug && console.log('add mode is on [mouse leave]');
                    } else {
                        myFakePin.remove();
                        var currentTime = player.currentTime();
                        myCurrentTimeTip.html(formatTimeTip(currentTime, duration));
                    }

                });

                myControlPanel.on('click', function (e) {

                    if (!player.paused()) return

                    if (!addMode) {
                        myPin.attr('style', myFakePin.attr('style'));
                        player.currentTime(myPin[0].style.left.replace('%', '') * duration / 100);
                    }

                });

                $(document.body).on('keyup', function (e) {

                    if (e.shiftKey && e.keyCode === 27) { // SHIFT + ESC
                        $('.help-layer').toggle();
                    } else if (e.keyCode === 27) { // if 'ESC' pressed reset the pin to 0
                        myPin.css('left', '0');
                        player.currentTime(0);
                    }

                });
                // 保存当前编辑商品
                myProductInfo.on('click', 'button.save', function(e) {
                    var $node = $(this);
                    updateList($node.parent());
                });

                // 按键调整输入标签的值
                myProductInfo.on('keydown', 'input.time', function (e) {

                    var $inputNode = $(this),
                        count = hmsToSeconds($inputNode.val()),
                        weight = e.shiftKey ? 10 : 1;

                    if (e.keyCode === 38) { //up
                        count += weight;
                        count = count > parseInt(duration) ? parseInt(duration) : count;
                        $inputNode.val(secondsToHms(count));
                        player.currentTime(count);
                    } else if (e.keyCode === 40) { // down
                        count -= weight;
                        count = (count > 0) ? count : 0; // avoid negtive number
                        $inputNode.val(secondsToHms(count));
                        player.currentTime(count);
                    } else {
                        $inputNode.trigger('input');
                    }

                    updateInput();

                });

                // 失去焦点的时候调整输入标签的值
                myProductInfo.on('blur', 'input.time', function () {

                    var $inputNode = $(this),
                        val = $(this).val();

                    val = hmsToSeconds(val)
                    val = Number.isNaN(val) ? 0 : val;

                    $inputNode.val(secondsToHms(val));
                    updateInput()

                });


                myProductInfo.on('click', '.input-time > span', function(e) {
                    var isAdd = e.target.className === 'plus';
                    var $nodeInput = $(this).parent().find('input');
                    triggerKeyEvent($nodeInput, isAdd);
                });


                myProductInfo.on('click', 'button.back', function() {
                    addMode = false;
                });

                // 更新当前添加的商品列表项
                $('#product-list').on('click', 'tbody > tr button', function(e) {

                    var id = $(e.target).data('activeId');

                    if(e.target.className === 'delete') {
                        removeFromList(id);
                    } else {
                        currentActiveListId = id;
                        addMode = true;
                        $('span.act-pin.active').removeClass('active');
                        $('#act-pin-' + currentActiveListId).addClass('active');
                        var item = getListItemById(currentActiveListId);

                        updateProductInfo(item);

                    }


                });

                updateProductList(true);
            });
        });
    }
    secondsToHms = function(d) {

        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        h = h < 10 ? ('0' + h) : h;
        m = m < 10 ? ('0' + m) : m;
        s = s < 10 ? ('0' + s) : s;

        return [h, m, s].join(':');

    }

    hmsToSeconds = function(s) {

        s = s.trim();
        var sum = 0;
        var weightList = [1, 60, 3600];
        var arr = s.split(':').reverse().forEach(function (item, index) { sum = sum + (+item * weightList[index]) });
        return sum;

    }

    addItem = function(goods) {
        var id = getMaxId() + 1;
        console.log('id: ' + id);
        currentActiveListId = id;

        addList.push({
            id: id,
            goodsId: goods.goodsId,
            vgId: '',
            price: goods.price,
            salePrice: goods.salePrice,
            goodTitle: goods.goodTitle,
            imgSrc: goods.imgSrc,
            startTime: '',
            endTime: '',
        })

        log('[add item] : ', addList);

        myProductInfo.find('.start input.time').val('')
        myProductInfo.find('.end input.time').val('')

        updateProductInfo(addList[addList.length - 1])

        addMode = true;

    }

    updateList = function() {

        var id = currentActiveListId;
        var startTime = myProductInfo.find('.start input.time').val();
        var endTime = myProductInfo.find('.end input.time').val();

        var goodItem = getListItemById(id);

        var currentItem = {
            id: +id,
            goodsId : goodItem.goodsId,
            vgId: goodItem.vgId,
            price: goodItem.price,
            salePrice: goodItem.salePrice,
            goodTitle: goodItem.goodTitle,
            imgSrc: goodItem.imgSrc,
            startTime: hmsToSeconds(startTime),
            endTime: hmsToSeconds(endTime),
        }

        // 添加/更新商品
        $.ajax({
            url: goodsSaveUrl,
            type: 'post',
            dataType: 'json',
            data: {
                item: JSON.stringify(currentItem)
            },
            success: function(json) {
                console.log(json)
                currentItem = json.data
                console.log(currentItem)
                // update the addList
                addList = $.map(addList, function (item, index) {
                    if (item.id == id) {
                        return currentItem
                    } else {
                        return item;
                    }
                })
                log('[add item to the list] : ', addList);

                addMode = false;

                updateProductList();
            },
            error: function(error) {
                console.log(error)
            }
        })

    }

    removeFromList = function(id) {

        var $actPinNode = $('#act-pin-' + id);


        art.dialog.confirm('你确认删除操作？', function(){
            var currentItem = getListItemById(id)

            // 删除商品
            $.ajax({
                url: goodsDelUrl,
                type: 'post',
                data: {
                    item: JSON.stringify(currentItem)
                },
                success: function(json) {
                    console.log(json)
                    // remove item from the addList by id
                    addList = $.grep(addList, function (item, index) {
                        return item.id != id;
                    });
                    // remove the node in .control-panel
                    $actPinNode.remove();
                    log('[remove item from the list] : ', addList);
                    updateProductList();
                },
                error: function(error) {
                    console.log(error)
                }
            })
        }, function(){
            art.dialog.tips('你取消了操作');
        });

    }

    drawRect = function(dom, id, start, end) {

        debug && console.log(arguments)

        var leftStyle;

        // 如果没有元素的话创建元素
        if(!document.getElementById('act-pin-' + id)) {
            $('<span id="act-pin-' + id + '" class="act-pin">'+ id +'</span>').appendTo(myControlPanel);
        }
        var $node = dom || $('#act-pin-' + id);

        console.log($node)

        // select from left to right [->] || right to left [<-]
        leftStyle = (end > start) ? (start / duration * 100) : (end / duration * 100)

        // re-adjust the position of the element
        $node.css({
            left: leftStyle + '%',
            width: (Math.abs(end - start) / duration * myControlPanel.width()) + 'px'
        })

    }

    updateInput = function() {
        var start = hmsToSeconds(myProductInfo.find('.start input.time').val());
        var end = hmsToSeconds(myProductInfo.find('.end input.time').val());

        drawRect(null, currentActiveListId, start, end);
    }

    getMaxId = function() {
        return addList.length ? (Math.max.apply(null, $.map(addList, function (item, index) { return Number(item.id) }))) : 0;
    }

    formatTimeTip = function(now, overall) {
        return secondsToHms(parseInt(now)) + ' / ' + secondsToHms(parseInt(overall));
    }

    log = function(msg, list) {
        debug && console.log(msg);
        console && console.table && console.table(list);
    }

    updateProductList = function(force) {
        var html = '';
        force = (typeof force === undefined) ? false : force
        for(var i = 0; i < addList.length; i++) {
            var d = addList[i];
            if(d.id) {
                html += '<tr>'+ [
                    d.id,
                    d.goodTitle,
                    '<img src="'+d.imgSrc+'" height="30" width="30">',
                    secondsToHms(d.startTime),
                    secondsToHms(d.endTime),
                    '<span class="now-price">'+ d.price +'</span>/' + '<span class="original-price">'+ d.salePrice +'</span>',
                    '<button class="update" data-active-id="'+ d.id +'">修改</button><button class="delete" data-active-id="'+ d.id +'">删除</button>'
                ].map(function(item, index){return '<td>'+ item +'</td>'}).join() +'</tr>';

                if(force) {
                    drawRect(null, d.id, d.startTime, d.endTime)
                }
            }
        }

        myProductList.html(html);
    }

    getListItemById = function(id) {
        var result = addList.filter(function(item) {
            return item.id == id
        });

        return result.length ? result[0] : false
    }

    triggerKeyEvent = function(node, isAdd) {
        var count = hmsToSeconds(node.val())

        if(isAdd) {
            count++;
            count = count > parseInt(duration) ? parseInt(duration) : count;
        } else {
            count--;
            count = count > 0 ? count : 0;
        }

        node.val(secondsToHms(count));
    }


    getAddList = function() {
        return addList;
    }

    setAddList = function(list) {
        addList = list;
    }


    setGoodsDelUrl = function(url) {
        goodsDelUrl = url
    }

    setGoodsSaveUrl = function(url) {
        goodsSaveUrl = url
    }

    updateProductInfo = function(goods) {
        myProductInfo.find('.basic-info .title').text(goods['goodTitle'])
        myProductInfo.find('.basic-info > img').attr('src', goods['imgSrc'])
        myProductInfo.find('.basic-info span.now-price').text(goods['price'])
        myProductInfo.find('.basic-info span.original-price').text(goods['salePrice'])
    }

    return {
        init: init,
        getGoods: getAddList,
        setGoods: setAddList,
        updateProductList: updateProductList,
        addItem: addItem,
        setGoodsDelUrl: setGoodsDelUrl,
        setGoodsSaveUrl: setGoodsSaveUrl
    }
})();