var videoUtil = (function(){
    var getVideoInfo, myPlayer

    // 获取视频信息
    getVideoInfo = function(url, cb) {
        var $videoNode = $('<video id="my-video" controls preload="auto" width="640" height="264" style="visibility: hidden;"><source src="'+ url +'" type="video/mp4"><p class="vjs-no-js"> To view this video please enable JavaScript, and consider upgrading to a web browser that <a href="http://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a></p></video>')
        $videoNode.appendTo(document.body)

        myPlayer = videojs('my-video', {}, function() {
            player = this;
            player.on('loadedmetadata', function() {
                var info = {
                    height: player.videoHeight(),
                    width: player.videoWidth()
                }

                $videoNode.remove()
                cb(info)
            })
        })
    }

    return {
        getVideoInfo: getVideoInfo
    }

})()