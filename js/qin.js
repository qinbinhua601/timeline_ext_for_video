/**
 * Author: Alex Q
 * Description: 基于html5视频插件video.js的后台视频互动添加界面
 */

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
            myActPin = $('<span id="act-pin-' + currentActiveListId + '" class="act-pin"></span>').appendTo(myControlPanel);
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

                $('#start-' + currentActiveListId).val(secondsToHms(startLeft > currentMoment ? currentMoment : startLeft));
                $('#end-' + currentActiveListId).val(secondsToHms(parseInt(currentMoment > startLeft ? currentMoment : startLeft)));

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

        if (addMode) {
            if (e.target.className === 'act-pin') {
                var id = $(e.target).attr('id').split('-').pop();
                currentActiveListId = id;
                $('dd.active').removeClass('active');
                $('dd#item-' + id).addClass('active');
            }
        } else {
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

    $('dl.act-list dt span').on('click', function () {

        var id = getMaxId() + 1;

        currentActiveListId = id;
        addItem(id);
        addMode = true;

    });

    $('dl.act-list').on('click', 'dd > button', function (e) {

        var $node = $(this);

        if ($node.hasClass('del')) {
            removeFromList($node.parent());
        } else if ($node.hasClass('confirm')) {
            updateList($node.parent());
            $node.attr('class', 'del').text('del');
        }

    });

    $('dl.act-list').on('keydown', 'input.time', function (e) {
        
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

    $('dl.act-list').on('blur', 'input.time', function () {

        var $inputNode = $(this),
            val = $(this).val();

        val = hmsToSeconds(val)
        val = Number.isNaN(val) ? 0 : val;

        $inputNode.val(secondsToHms(val));
        updateInput()

    });


    $('dl.act-list').on('click', 'dd', function (e) {

        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
            return;
        }

        var $node = $(this); 

        currentActiveListId = $node.attr('class').split('-')[1];
        if ($node.hasClass('active')) {
            addMode = false;
            $node.removeClass('active');
        } else {
            addMode = true;
            $('dd.active').removeClass('active');
            $node.addClass('active');
        }

        console.log(addMode);

    });

    function secondsToHms(d) {

        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);
        return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);

    }

    function hmsToSeconds(s) {

        s = s.trim();
        var sum = 0;
        var weightList = [1, 60, 3600];
        var arr = s.split(':').reverse().forEach(function (item, index) { sum = sum + (+item * weightList[index]) });
        return sum;

    }

    function addItem(id) {

        var html = '<dd id="item-' + id + '" class="active item-' + id + '"><div class="input"><label for="title-' + id + '">活动编号:</label><input type="text" id="title-' + id + '" value="' + id + '"></div><div class="input"> 从 <input class="time" id="start-' + id + '"type="text" value=""> 到 <input class="time" id="end-' + id + '" type="text" value=""></div><button class="confirm">confirm</button></dd>';

        addList.push({
            id: id,
            title: '',
            startTime: '',
            endTime: ''
        })

        log('[add item] : ', addList);

        $('.act-list dd.active').removeClass('active');
        $('.act-list').append(html);

    }

    function updateList(node) {

        var id = node.attr('id').split('-').pop();
        var title = $('#title-' + id).val();
        var startTime = $('#start-' + id).val();
        var endTime = $('#end-' + id).val();


        // update the 
        addList = $.map(addList, function (item, index) {
            if (item.id == id) {
                return {
                    id: +id,
                    title: title,
                    startTime: hmsToSeconds(startTime),
                    endTime: hmsToSeconds(endTime)
                };
            } else {
                return item;
            }
        })

        log('[add item to the list] : ', addList);

        addMode = false;

    }

    function removeFromList(node) {

        var id = node.attr('id').split('-').pop();
        var $actPinNode = $('#act-pin-' + id);

        // remove item from the addList by id
        addList = $.grep(addList, function (item, index) { return item.id != id; });

        // remove the node in .control-panel
        $actPinNode.remove();
        // remove the node in .act-list 
        node.remove();

        // re-adjust the var addMode
        addMode = $.find('.act-list dd.active').length;

        log('[remove item from the list] : ', addList);

    }

    function drawRect(dom, id, start, end) {

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

    function updateInput() {
        var start = hmsToSeconds($('#start-' + currentActiveListId).val());
        var end = hmsToSeconds($('#end-' + currentActiveListId).val());

        drawRect(null, currentActiveListId, start, end);
    }

    function getMaxId() {
        return addList.length ? (Math.max.apply(null, $.map(addList, function (item, index) { return Number(item.id) }))) : 0
    }

    function formatTimeTip(now, overall) {
        return secondsToHms(parseInt(now)) + ' / ' + secondsToHms(parseInt(overall));
    }

    function log(msg, list) {
        console.log(msg);
        console && console.table && console.table(list);
    }

});

