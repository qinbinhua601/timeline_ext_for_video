/**
 * Author: Alex Q
 * Description: 基于html5视频插件video.js的后台视频互动添加界面
 */

var intvVideo = (function(){

    // remove the base theme style
    window.VIDEOJS_NO_BASE_THEME = false;

    // init the video player instance
    var myPlayer = videojs('my-video', {
        bigPlayButton: true
    }, function () {

        var myFakePin, myActPin, duration,
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
            addList = [],
            currentActiveListId = 0,
            isDragging = false,
            startLeft = 0;

        player.on('loadedmetadata', function () {
            duration = player.duration();
            myCurrentTimeTip.html(formatTimeTip(0, duration));
        });

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

            isDragging = true;

            startLeft = parseInt((e.clientX - myControlPanel.position().left) / myControlPanel.width() * duration);
            
            
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

            var delta = e.clientX - myControlPanel.position().left;
            var currentMoment = parseInt(delta / myControlPanel.width() * duration);

            if (addMode) {
                console.log('add mode is on [mouse move]');
                if (isDragging) {
                    console.log('startleft : ' + startLeft);

                    console.log('addMode currentMoment : ' + currentMoment);
                    console.log('addMode delta : ' + delta);

                    if (lastMoment2 === currentMoment) {
                        return false;
                    }

                    lastMoment2 = currentMoment;

                    drawRect(myActPin, currentActiveListId, startLeft, currentMoment);

                    myProductInfo.find('.start > input.time').val(secondsToHms(startLeft > currentMoment ? currentMoment : startLeft));
                    myProductInfo.find('.end > input.time').val(secondsToHms(parseInt(currentMoment > startLeft ? currentMoment : startLeft)));

                    myCurrentTimeTip.html(formatTimeTip(currentMoment, duration));

                }
            } else {

                console.log('lastMoment: ' + lastMoment);
                console.log('currentMoment: ' + currentMoment);

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
                console.log('add mode is on [mouse leave]');
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

        // 添加新商品
        myProductInfo.on('click', 'button.add', function() {
            
            var id = getMaxId() + 1;
            currentActiveListId = id;
            addItem(id);
            addMode = true;
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
            } else if (e.keyCode === 40) { // down
                count -= weight;
                count = (count > 0) ? count : 0; // avoid negtive number
                $inputNode.val(secondsToHms(count));
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
                myProductInfo.find('.start > input.time').val(secondsToHms(item.startTime));
                myProductInfo.find('.end > input.time').val(secondsToHms(item.endTime));
            }
            
            
        });

        var secondsToHms = function(d) {

            d = Number(d);
            var h = Math.floor(d / 3600);
            var m = Math.floor(d % 3600 / 60);
            var s = Math.floor(d % 3600 % 60);
            return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);

        }

        var hmsToSeconds = function(s) {

            s = s.trim();
            var sum = 0;
            var weightList = [1, 60, 3600];
            var arr = s.split(':').reverse().forEach(function (item, index) { sum = sum + (+item * weightList[index]) });
            return sum;

        }

        var addItem = function(id) {
            
            addList.push({
                id: id,
                startTime: '',
                endTime: '',
            })

            log('[add item] : ', addList);

            myProductInfo.find('.start > input.time').val('')
            myProductInfo.find('.end > input.time').val('')

        }

        var updateList = function() {

            var id = currentActiveListId;
            var startTime = myProductInfo.find('.start > input.time').val();
            var endTime = myProductInfo.find('.end > input.time').val();
            
            // update the 
            addList = $.map(addList, function (item, index) {
                if (item.id == id) {
                    return {
                        id: +id,
                        startTime: hmsToSeconds(startTime),
                        endTime: hmsToSeconds(endTime),
                    };
                } else {
                    return item;
                }
            })

            log('[add item to the list] : ', addList);

            addMode = false;
            
            updateProductList();

        }

        var removeFromList = function(id) {

            var $actPinNode = $('#act-pin-' + id);

            // remove item from the addList by id
            addList = $.grep(addList, function (item, index) { return item.id != id; });

            // remove the node in .control-panel
            $actPinNode.remove();

            log('[remove item from the list] : ', addList);
            
            updateProductList();

        }

        var drawRect = function(dom, id, start, end) {

            console.log(arguments)

            var leftStyle;
            var $node = dom || $('#act-pin-' + id);

            // select from left to right [->] || right to left [<-]
            leftStyle = (end > start) ? (start / duration * 100) : (end / duration * 100)

            // re-adjust the position of the element
            $node.css({
                left: leftStyle + '%',
                width: (Math.abs(end - start) / duration * myControlPanel.width()) + 'px'
            })

        }

        var updateInput = function() {
            var start = hmsToSeconds(myProductInfo.find('.start > input.time').val());
            var end = hmsToSeconds(myProductInfo.find('.end > input.time').val());

            drawRect(null, currentActiveListId, start, end);
        }

        var getMaxId = function() {
            return addList.length ? (Math.max.apply(null, $.map(addList, function (item, index) { return Number(item.id) }))) : 0;
        }

        var formatTimeTip = function(now, overall) {
            return secondsToHms(parseInt(now)) + ' / ' + secondsToHms(parseInt(overall));
        }

        var log = function(msg, list) {
            console.log(msg);
            console && console.table && console.table(list);
        }
        
        var updateProductList = function() {
            var html = '';

            for(var i = 0; i < addList.length; i++) {
                var d = addList[i];
                if(d.id) {
                    html += '<tr>'+ [
                        d.id,
                        '商品名称：' + d.id,
                        '<img src="images/user-img.jpeg" height="30" width="30">',
                        secondsToHms(d.startTime),
                        secondsToHms(d.endTime),
                        '<span class="now-price">'+ d.id * 100 +'</span>/' + '<span class="original-price">'+ d.id * 50 +'</span>',
                        '<button class="update" data-active-id="'+ d.id +'">修改</button><button class="delete" data-active-id="'+ d.id +'">删除</button>'
                    ].map(function(item, index){return '<td>'+ item +'</td>'}).join() +'</tr>';  
                }
            }

            myProductList.html(html);
        }

        var getListItemById = function(id) {
            var result = addList.filter(function(item) {
                return item.id == id
            });

            return result.length ? result[0] : false
        }
    });
})();