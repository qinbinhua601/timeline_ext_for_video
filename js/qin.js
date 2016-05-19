/**
 * Author: Alex Q
 * Description: 基于html5视频插件video.js的后台视频互动添加界面
 */

// remove the base theme style
window.VIDEOJS_NO_BASE_THEME = false;


// global varibles
var addMode = false;
var addListCount = 0;
var addList = [];
var currentActiveListId = 0;
var isDragging = false;
var startLeft = 0;

// init the video player instance
var myPlayer = videojs('my-video', {
    bigPlayButton: true
}, function () {
    var player = this;
    var myControlPanel = $('.control-panel')
    var myPin = myControlPanel.find('span.current-time-pin');
    var myCurrentTimeTip = $('.time-tip');
    var myFakePin;
    var myActPin;

    var lastCurrentTime = 0;

    player.on('loadedmetadata', function () {
        myCurrentTimeTip.html(secondsToHms(0) + ' / ' + secondsToHms(parseInt(player.duration())));
    });

    player.on('timeupdate', function () {
        var currentTime = this.currentTime();
        var duration = this.duration();

        console.log((currentTime / duration * 100));

        myPin.css({
            'left': (currentTime / duration * 100) + '%',
        })

        myCurrentTimeTip.html(secondsToHms(parseInt(currentTime)) + ' / ' + secondsToHms(parseInt(duration)));

        lastCurrentTime = currentTime;
    });

    myControlPanel.on('mousedown', function (e) {
        if (!addMode) return
        isDragging = true;
        var duration = player.duration();
        startLeft = parseInt((e.clientX - $(this).position().left) / $(this).width() * duration);

        if ($.find('#act-pin-' + currentActiveListId).length) {
            myActPin = $('#act-pin-' + currentActiveListId);
        } else {
            myActPin = $('<span id="act-pin-' + currentActiveListId + '" class="act-pin"></span>').appendTo($(this));
        }
        // console.log(myActPin);
    });

    myControlPanel.on('mouseup', function (e) {
        if (!addMode) return
        myActPin.text(currentActiveListId);
        startLeft = 0;
        isDragging = false;
    });

    myControlPanel.on('mouseenter', function (e) {
        if (!player.paused()) return
        if (addMode) {
            console.log('add mode is on [mouse enter]');
            // myActPin = $('<span class="act-pin"></span>').appendTo($(this));
        } else {
            myFakePin = $('<span class="fake-pin"></span>').appendTo($(this));
        }
    });

    var lastTimestamp = 0;
    var lastMoment = 0;
    var lastMoment2 = 0;
    myControlPanel.on('mousemove', function (e) {
        if (!player.paused()) return

        if (e.timeStamp - lastTimestamp < 50) {
            lastTimestamp = e.timeStamp;
            return false;
        }
        if (addMode) {
            console.log('add mode is on [mouse move]');
            if (isDragging) {
                var duration = player.duration();
                console.log('startleft : ' + startLeft);
                var delta = e.clientX - $(this).position().left;
                var currentMoment = parseInt(delta / $(this).width() * duration);

                console.log('addMode currentMoment : ' + currentMoment);
                console.log('addMode delta : ' + delta);
                if (lastMoment2 === currentMoment) {
                    return false;
                }

                lastMoment2 = currentMoment;

                drawRect(myActPin, currentActiveListId, startLeft, currentMoment);

                $('#start-' + currentActiveListId).val(secondsToHms(startLeft > currentMoment ? currentMoment : startLeft));
                $('#end-' + currentActiveListId).val(secondsToHms(parseInt(currentMoment > startLeft ? currentMoment : startLeft)));

                myCurrentTimeTip.html(secondsToHms(currentMoment) + ' / ' + secondsToHms(parseInt(duration)));
            }
        } else {

            var delta = e.clientX - $(this).position().left;
            var duration = player.duration();
            var currentMoment = parseInt(delta / $(this).width() * duration);
            console.log('lastMoment: ' + lastMoment);
            console.log('currentMoment: ' + currentMoment);

            if (currentMoment === lastMoment) {
                return false;
            }

            lastMoment = currentMoment;
            var leftStyle = (currentMoment / duration) * 100;
            myFakePin.css('left', leftStyle + '%');
            // console.log(leftStyle / 100 * duration);
            myCurrentTimeTip.html(secondsToHms(currentMoment) + ' / ' + secondsToHms(parseInt(duration)));
        }
    });

    myControlPanel.on('mouseleave', function (e) {
        if (!player.paused()) return
        if (addMode) {
            console.log('add mode is on [mouse leave]');
        } else {
            myFakePin.remove();
            var duration = player.duration();
            var currentTime = player.currentTime();
            myCurrentTimeTip.html(secondsToHms(parseInt(currentTime)) + ' / ' + secondsToHms(parseInt(duration)));
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
            var duration = player.duration();
            myPin.attr('style', myFakePin.attr('style'));
            console.log(myFakePin.attr('style'))
            player.currentTime(myPin[0].style.left.replace('%', '') * duration / 100);
        }
    });


    $(document.body).on('keyup', function (e) {
        // if 'ESC' pressed reset the pin to 0
        if (e.shiftKey && e.keyCode === 27) {
            $('.help-layer').toggle();
        } else if (e.keyCode === 27) {
            myPin.css('left', '0');
            player.currentTime(0);
        }
    });

    $('dl.act-list dt span').on('click', function () {
        // var id = addList.length + 1;
        var id = getMaxId() + 1;
        console.log('max id : ' + id);
        addMode = true;
        currentActiveListId = id;
        console.log('[currentActiveListId] : ' + currentActiveListId);
        addItem(id);
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
        var count = hmsToSeconds($(this).val());
        var weight = e.shiftKey ? 10 : 1;
        var duration = player.duration();

        if (e.keyCode === 38) { //up
            count += weight;
            count = count > parseInt(duration) ? parseInt(duration) : count;
            $(this).val(secondsToHms(count));
        } else if (e.keyCode === 40) { // down
            count -= weight;
            count = (count > 0) ? count : 0; // avoid negtive number
            $(this).val(secondsToHms(count));
        } else {
            $(this).trigger('input');
        }

        updateInput();

    });

    $('dl.act-list').on('blur', 'input.time', function () {
        var val = $(this).val();
        val = hmsToSeconds(val)
        val = Number.isNaN(val) ? 0 : val;
        console.log(val);
        $(this).val(secondsToHms(val));
        updateInput()
    });


    $('dl.act-list').on('click', 'dd', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
            return;
        }

        currentActiveListId = $(this).attr('class').split('-')[1];
        if ($(this).hasClass('active')) {
            addMode = false;
            $(this).removeClass('active');
        } else {
            addMode = true;
            $('dd.active').removeClass('active');
            $(this).addClass('active');
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

        console.log(addList);
        $('.act-list dd.active').removeClass('active');
        $('.act-list').append(html);
    }

    function updateList(node) {
        var id = node.attr('id').split('-').pop();
        var title = node.find('#title-' + id).val();
        var startTime = node.find('#start-' + id).val();
        var endTime = node.find('#end-' + id).val();

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
        console.log('[add item to the list] : ');
        console.log(addList);

        addMode = false;
    }

    function removeFromList(node) {
        var id = node.attr('id').split('-').pop();
        addList = $.grep(addList, function (item, index) { return item.id != id; });
        $('#act-pin-' + id).remove();
        node.remove();
        addMode = $.find('.act-list dd.active').length;
        console.log('[remove item from the list] : ');
        console.log(addList);
    }

    function drawRect(dom, id, start, end) {

        console.log(arguments)

        var leftStyle;
        var duration = player.duration();
        var $node = dom || $('#act-pin-' + id);

        if (end > start) {
            leftStyle = start / duration * 100;
        } else {
            leftStyle = end / duration * 100;
        }

        $node.css({
            left: leftStyle + '%',
            width: (Math.abs(end - start) / duration * myControlPanel.width()) + 'px'
        })
    }

    function updateInput() {
        var start = hmsToSeconds($('#start-' + currentActiveListId).val());
        var end = hmsToSeconds($('#end-' + currentActiveListId).val());

        console.log(start);
        drawRect(null, currentActiveListId, start, end);
    }

    function getMaxId() {
        if (addList.length) {
            return Math.max.apply(null, $.map(addList, function (item, index) { return Number(item.id) }));
        } else {
            return 0;
        }
    }

});
