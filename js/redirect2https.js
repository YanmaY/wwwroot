// 重定向到 https 201704101746
(function() {
    var protocol = window.location.protocol;
    if ('https:' != protocol) {
        var exceptions = [ // 正则式例外：192.和127.开头的主机名及localhost
				/^123\..*/,
				/^192\..*/,
				/^127\..*/,
				/^localhost/
        ];
        var hostname = window.location.hostname;
        var jump = true;
        for (var x in exceptions) {
            var reg = exceptions[x];
            var pass = reg.test(hostname);
            if (true == pass) { // 只要主机名符合一项例外规则就不跳转
                jump = false;
                break;
            }
        }
        if (true == jump) {
            var search = window.location.search;
            var hash = window.location.hash;
            var port = window.location.port;
            var pathname = window.location.pathname;
            var url = window.location.href;
            port = ("80" == port || "" == port) ? "" : ":" + port;
            url = 'https://' + hostname + port + pathname + search + hash;
            // console.log(url);
            console.log('[direct2https] 正在从 http 转到 https ...');
            window.location.href = url;
        }
    }
})();

// 原IP:端口访问时转域名
(function () {
    var from = window.location.host;
    var to   = 'https://e.lydjw.gov.cn/';
    if ('123.56.204.211:8001' == from) {
        console.log('[direct2https] 正在从 '+from+' 转到 '+to+' ...');
        var search = window.location.search;
        var hash = window.location.hash;
        var pathname = window.location.pathname;
        to = to + pathname + search + hash;
        window.location.href = to;
    }
})();

// End