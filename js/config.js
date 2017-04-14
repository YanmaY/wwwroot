var returnstatus = { SUCCESS: "success", ERROR: "error", WARNING: "warning", LOG_TIMEOUT: "log_timeout" }

angular.module('sysconfigModule', ['ng', "honzh.ui"])
.provider("$sysconfig", [function () {
    var sucessFunc = function (result) {
    }
    var logtimeoutFunc = function (result) {
    }
    var errorFunc = function (result) {
    }
    var norightFunc = function (result) {
    }
    var alertFunc = function (result) {
    }
    this.sysapi = {
        success: sucessFunc,
        error: errorFunc,
        logtimeout: logtimeoutFunc,
        noright: norightFunc,
        alert: alertFunc
    };
    this.setsysapi = function (option) {
        this.sysapi = angular.extend({}, this.sysapi, option);

    };
    this.$get = function () {
        return {
            sysapi: this.sysapi
        };
    };
}])
.controller("top_barCtl", ['$scope', '$location', '$uibModal', '$User', 'uibDatepickerPopupConfig', '$sysapi', '$DataDictionaryItem', '$LoadingTips', '$FieldValidateDefine', '$info', function ($scope, $location, $uibModal, $User, uibDatepickerPopupConfig, $sysapi, $DataDictionaryItem, $LoadingTips, $FieldValidateDefine, $info) {
    $scope.userName = $User.getCurrentNameFromCookie();
    $scope.numberOfUnreadMessages = 0;
    $scope.exit = function () {
        //if ($.connection) {
        //    var baseHub = $.connection.baseHub;
        //    if (typeof (baseHub) != "undefined" && baseHub) 
        //        baseHub.server.userCancellation($scope.userInfo.ID);
        //}

        $User.logout().then(function (result) {
            // 如果是客户端程序登录，调用客户端注销方法
            if (typeof (jsHandler) != "undefined" && jsHandler) {
                jsHandler.cancellation();
            }
            //下面两行代码的解释请看/v2/subsite/readme.txt
            var subsite = JSON.parse(window.sessionStorage["subsite"]);
            window.location.href = subsite.url;
        });
    }
    $scope.gotoInfo = function () {
        $location.path("/userinfo");
    }
    $User.getUserInfo().then(function (result) {
        $scope.userInfo = result;
        $scope.showDefault();
    });
    $scope.showDefault = function () {
        for (var i = 0; i < $scope.userInfo.UserTypes.length; i++) {
            if ($location.$$absUrl.indexOf($scope.userInfo.UserTypes[i].HomeUrl) > 0) {
                $scope.userInfo.UserTypes[i].Current = true;
            }
        }
    }
    $scope.refreshUserInfo = function () {
        $User.getUserInfoFromServer().then(function (result) {
            $scope.userInfo = result.Data;
        });
    }
    $scope.setDefaultUserType = function (typeid) {
        var _userInfo = angular.copy($scope.userInfo);
        _userInfo.DefaultUserTypeId = typeid;
        $User.setDefaultUserType(_userInfo).then(function (result) {
            $scope.userInfo.DefaultUserTypeId = typeid;
        });
    }
    uibDatepickerPopupConfig.altInputFormats = ['y-M-d', 'yyyy-MM-dd', 'y-M!-d!'];

    $scope.getLastModifyDate = function () {
        $sysapi.post({
            method: 'POST',
            url: "/Sys/LoadConfig/GetLastOperateDate"
        })
        .success(function (result) {
            var _dictionaryModifyDate = window.localStorage["DictionaryModifyDate"];
            var _tipsTextModifyDate = window.localStorage["TipsTextModifyDate"];
            var _fieldValidateDefineModifyDate = window.localStorage["FieldValidateDefineModifyDate"];
            $DataDictionaryItem.initAllDictionary(_dictionaryModifyDate, result.Data.DataDictionary);
            $LoadingTips.initAllTipsText(_tipsTextModifyDate, result.Data.LoadingTips);
            $FieldValidateDefine.initAllFieldValidateDefine(_fieldValidateDefineModifyDate, result.Data.FieldValidateDefine);
        });
    };
    $scope.getLastModifyDate();
        
    $scope.compelMessags = new Array();// 获取未读消息数
    $scope.compelMessagsIsShow = false;// 该状态变量是为了防止ajax轮询时，多次强制阅读
    $scope.getNumberOfUnreadMessages = function () {
        $sysapi.post({
            method: 'POST',
            url: "/Message/MsgMailBox/Query"
            , data: {
                BeginDate: "", // 开始时间点
                EndDate: "", // 结束时间点
                KeyName: "", // 搜索词
                page: {},
                mailtype: "in", // 收件箱
                pageSize: 9999999
            }

        })
        .success(function (result) {
            var data = result.Data.MailPageQuery.PageData
            var total = 0;
            for (var i = 0; i < data.length; i++) { // 挑出未读的
                if (result.Data.IsShowSystemMessage == 1) {  // 系统消息是否纳入计算，1是，2否
                    if (data[i].IsRead != 1) { // 是否已读：1是，2否，nN
                        total++;
                    }
                }
                else {
                    if (data[i].IsRead != 1 && data[i].CreateUID > 0) { // 是否已读：1是，2否，nN
                        total++;
                    }
                }
                if (data[i].IsCompel == 1 && data[i].IsRead != 1 && !$scope.compelMessagsIsShow)    // 强制消息
                    $scope.compelMessags.push(data[i]);
            }
            $scope.totalOfUnreadMessages = total;
            if ($scope.numberOfUnreadMessages != total && total >= 0) {
                $scope.numberOfUnreadMessages = total > 99 ? "99+" : total; // 100 is set to pageSize
            }

            if ($scope.compelMessags.length > 0 && !$scope.compelMessagsIsShow) {
                $scope.compelMessagsIsShow = true;// 该状态变量是为了防止ajax轮询时，多次强制阅读
                $scope.showCompelMessag(result.Data.FileList);
            }
        });
    }
        
    $scope.showCompelMessag = function (fileList) {
        var modalInstance = $uibModal.open({
            templateUrl: "/v2/message/html/msgCompelMessage.html",
            animation: false,
            controller: "compelMessageCtl",
            //size: 'lg',
            backdrop: 'static', //禁止点空白区域关闭
            keyboard: false,    //禁止esc关闭
            resolve: {
                compelMessags: function () {
                    return $scope.compelMessags;
                },
                fileList: function () {
                    return fileList;
                }
            }
        });
        modalInstance.result.then(function (result) {
        }, function () {
        });
    }

    /* SignalR 连接和推送 */
    var signalRError = false;    // SignalR连接出错

    if ($.connection) {
        var baseHub = $.connection.baseHub;
        var messageHub = $.connection.messageHub;

        // 判断SignalR是否连接成功
        if (typeof (baseHub) != "undefined" && baseHub) {
            baseHub.client.connect = function (result) {
                // 成功，只读取一次消息，然后等待服务端推送
                if (result) {
                    $scope.getNumberOfUnreadMessages();
                }
                else signalRError = true;
            }
            // 通讯发生重连时，重新调用服务端用户连接操作
            baseHub.client.reconnect = function () {
                if ($scope.userInfo)
                    baseHub.server.userConnected($scope.userInfo.ID);
                else
                    $User.getUserInfo().then(function (result) {
                        baseHub.server.userConnected(result.ID);
                    });
            }
            //// 客户端帐号串号时，强制刷新
            //baseHub.client.forceRefresh = function () {
            //    location.reload();
            //}
            //// 客户端帐号退出时，退出所有页面
            //baseHub.client.forceCancellation = function () {
            //    location.href = "/v2/guest";
            //}
            // 服务端新增消息，客户端页头显示未读消息数+1
            messageHub.client.push = function (message) {
                var remind = function(){
                    $scope.totalOfUnreadMessages++;
                    $scope.numberOfUnreadMessages = $scope.totalOfUnreadMessages > 99 ? "99+" : $scope.totalOfUnreadMessages;
                    //$scope.$apply();

                    // chrome桌面通知
                    if (window.Notification) {
                        Notification.requestPermission(function (status) {
                            var _options = {
                                body: message.Content || message.Title,
                                icon: "/v2/image/logo.png",
                                tag: message.Tag
                            };
                            var _notification = new Notification(message.Title, _options);
                            _notification.onclick = function () { // 点击消息后转到消息正文
                                window.focus();
                                if (message.url && '' != message.url) {
                                    window.location.href = url;
                                }
                            }
                        });
                    }
                }

                if (typeof ($scope.IsShowSystemMessage) == "undefined") {
                    $sysapi.post({
                        method: 'POST',
                        url: "/Message/MsgUserConfig/GetIsShowSystemMessageByUserID"
                    })
                    .success(function (result) {
                        $scope.IsShowSystemMessage = result.Data;

                        if ($scope.IsShowSystemMessage == 1) {
                            remind();
                        }
                        else {
                            if (!message.IsSystemMessage) remind();
                        }
                    });
                } else {
                    if ($scope.IsShowSystemMessage == 1) {
                        remind();
                    }
                    else {
                        if (!message.IsSystemMessage) remind();
                    }
                }
            }
            // 服务端阅读消息处理成功，客户端未读消息数-1
            messageHub.client.read = function (message) {
                var read = function () {
                    $scope.totalOfUnreadMessages--;
                    $scope.totalOfUnreadMessages = $scope.totalOfUnreadMessages < 0 ? 0 : $scope.totalOfUnreadMessages; // 防止出现负数（BUG：某条连设N次“已读”时会影响“totalOfUnreadMessages”）
                    $scope.numberOfUnreadMessages = $scope.totalOfUnreadMessages > 100 ? "99+" : $scope.totalOfUnreadMessages;
                    //$scope.$apply();
                }

                if (typeof ($scope.IsShowSystemMessage) == "undefined") {
                    $sysapi.post({
                        method: 'POST',
                        url: "/Message/MsgUserConfig/GetIsShowSystemMessageByUserID"
                    })
                    .success(function (result) {
                        $scope.IsShowSystemMessage = result.Data;

                        if ($scope.IsShowSystemMessage == 1) {
                            read();
                        }
                        else {
                            if (!message.IsSystemMessage)  read();
                        }
                    });
                } else {
                    if ($scope.IsShowSystemMessage == 1) {
                        read();
                    }
                    else {
                        if (!message.IsSystemMessage)  read();
                    }
                } 
            }
            // 服务端修改是否显示系统消息配置后，更新界面
            messageHub.client.configChange = function (config) {
                $scope.IsShowSystemMessage = config.IsShowSystemMessage;
                $scope.getNumberOfUnreadMessages();
            }

            //$.connection.hub.start({ transport: ['webSockets', 'longPolling'] });// 不用写，默认优先级就是ws、长轮询、轮询
            $.connection.hub.start({ xdomain: true }).done(function () {
                if ($scope.userInfo)
                    baseHub.server.userConnected($scope.userInfo.ID);
                else
                    $User.getUserInfo().then(function (result) {
                        baseHub.server.userConnected(result.ID);
                    });
            });

        } else signalRError = true;
    } else signalRError = true;

    // SignalR连接出错，启用ajax轮询
    if (signalRError)
        $scope.getNewMessageHandle = setInterval(function () {
            $scope.getNumberOfUnreadMessages();
        }, 5000); // 每5秒检查一次消息数量
    //判断当前用户账号是否是初始密码，如果是初始密码提示用户修改密码
    if (window.sessionStorage["isStartPwd"] == 'false') {
        var modalInstance = $uibModal.open({
            templateUrl: '/v2/config/html/updatePWD.html',
            animation: true,
            controller: 'updatePwdCtl',
            windowClass: 'partyMemberModal',
            size: 'md',
            backdrop: 'static',
            resolve: {

            }
        });
    }
}])
.service('msgService', function ($sysapi, $q) {
    //var getIsShowSysMsgFromUserConfig = function () {
    //    var deferred = $q.defer();
    //    var promise = deferred.promise;
    //    $sysapi.post({
    //        method: 'POST',
    //        url: "/Message/MsgUserConfig/GetIsShowSystemMessageByUserID"
    //    })
    //    .success(function (data) {
    //        var result = data;
    //        deferred.resolve(result);
    //    });
    //    return promise;
    //};
    var updateIsShowSysMsgFromUserConfig = function (IsShowSystemMessage) {
        var deferred = $q.defer();
        var promise = deferred.promise;
        $sysapi.post({
            method: 'POST',
            url: "/Message/MsgUserConfig/Update",
            data: { IsShowSystemMessage: IsShowSystemMessage }
        })
        .success(function (data) {
            var result = data;
            deferred.resolve(result);
        });
        return promise;
    };
    var getUserInfoByID = function (id) {
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Sys/SysUser/GetPaytyUserByID",
            data   : {ID:id}
        }).success(function (data) {
            var result = data;
            deferred.resolve(result);
        });
        return promise;
    };
    // groupList
    var addGroup = function (groupname) {  //添加分组
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/Insert",
            data   : { groupname: groupname }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var addUsers2Group = function (userList, groupList) {  //批量添加 分组-用户
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUserRelation/Insert",
            data   : { userList: userList, groupList: groupList }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    }
    var delGroup = function (groupID) {  //删除分组
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/Delete",
            data   : { groupID: groupID }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getGroups = function () {  //显示所有分组
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/GetUserGroupAll"
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getUsers = function (searchKeyword, pageIndex) {  //显示所有用户-分页
        var deferred  = $q.defer();
        var promise   = deferred.promise;
        var pageModel = { page: pageIndex ? pageIndex : null };
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUser/Query",
            data   : { userName: searchKeyword, pageModel: pageModel }
        })
        .success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getGroupOfUsers = function () {   // 获取分组和用户关系数据
        var deferred = $q.defer();
        var promise = deferred.promise;
        $sysapi.post({
            method: 'POST',
            url: "/Message/MsgGroupUser/GroupOfUsers"
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getAllUsersBygroupID = function (groupID) {   // 获取组中的用户（全部，无分页）
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/getUsersByGroupID",
            data   : { groupID: groupID }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getUsersByGroupID = function (groupID, pageIndex) {  // 获取组中的用户（分页）
        var deferred  = $q.defer();
        var promise   = deferred.promise;
        var pageModel = { page: pageIndex ? pageIndex : null };
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/GetUserBygroupID",
            data   : { groupID: groupID, pageModel: pageModel }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getPrecinctUsers = function (pageIndex) { // 本区及下级联系人
        var deferred = $q.defer();
        var promise = deferred.promise;
        var pageModel = { page: pageIndex ? pageIndex : null };
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUser/QueryGroupUser",
            //url  : "/Sys/SysUser/QuerySysUserByOrganizationCode"
            data   : { pageModel: pageModel }
        })
        .success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var getOnlineUsers = function () { // 在线联系人
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'GET',
            url    : "/Tools/OnLine/List"
        })
        .success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var removeUsersFromGroup = function (userIdList, groupID) {  //删除分组下的用户
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUserRelation/Delete",
            data   : { userList: userIdList, groupID: groupID }
        })
        .success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var updateGroupName = function (module) {  //更新分组名称
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgGroupUser/UpdateGroup",
            data   : module
        })
        .success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    var updateGroup = function (userID, groupIDs) {  //更新某个用户的分组
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUserRelation/UpdateUserGroup",
            data   : { userID: userID, groupIDs: groupIDs }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    }
    // mailBox
    var addMsg = function (msg) {  //添加消息
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/Insert",
            data   : {
                Model: msg,
            }
        })
        .success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var setUserRelation = function (mailid, userList) {  //添加消息收件人
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailRelation/Insert",
            data   : {
                mailID   : mailid,
                userList : userList,
            }
        })
        .success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var getUserByName = function (query) {  //收件人模糊联想
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgUser/GetUserByName",
            data   : { Name: query }
        }).success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var getDetailByMailID = function (mailID) {  //根据消息id显示消息的详细内容-编辑草稿
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/QueryByMailID",
            data   : { mailID: mailID }
        }).success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var updateMsg = function (msg) {  // 重新编辑草稿内容
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/Update",
            data   : {
                Model: msg,
            }
        })
        .success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var deleteFile = function (id) {  //删除上传文件
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Sys/SysFile/Delete/",
            data   : {
                id: id
            }
        }).success(function (data) {
            deferred.resolve(data);
        });
        return promise;
    };
    // mailBoxList
    var getMailList = function (beginDate, endDate, keyName, page, mailType, msgType, isRead) {
        var deferred = $q.defer();
        var promise  = deferred.promise;
        if('all' == isRead) isRead = null;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/Query", // 如果功能或参数变了，这里也需要修改：/js/config.js/controller/top_barCtl/getNumberOfUnreadMessages()
            data   : {
                query: { 
                    beginDate: beginDate,
                    endDate  : endDate,
                    keyName  : keyName,
                    mailType : mailType, // in 收件箱，out 发件箱，no 草稿箱
                    msgType  : msgType,  // system 系统消息 或 normal 非系统消息
                    isRead   : isRead    // true已读，false未读，null全部
                },
                page: page
            }
        })
        .success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var markAsReadAll = function (msgType) { // 全部设为已读
        var deferred = $q.defer();
        var promise  = deferred.promise;
        if('all' == msgType) msgType = null;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/SetMsgRead",
            data   : {
                msgType : msgType  // system 系统消息 或 normal 非系统消息 或 null全部
            }
        }).success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    };
    var markAsRead = function (mail) { // makeAsReadAndGetRecipients 标记为已读并且获取收件人
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/UpdateIsReadState",
            data   : {
                MailID            : mail.ID,
                OriginalReadState : mail.IsRead,
                IsRead            : mail.IsRead,
            }
        }).success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    }
    var getRecipients = function (mail) { // 获取收件人
        var deferred = $q.defer();
        var promise  = deferred.promise;
        $sysapi.post({
            method : 'POST',
            url    : "/Message/MsgMailBox/UpdateIsReadState",
            data   : {
                MailID            : mail.ID,
                OriginalReadState : 1,
                IsRead            : 1,
            }
        }).success(function (data) {
            deferred.resolve(data.Data);
        });
        return promise;
    }
    return {        
        getUserInfoByID      : getUserInfoByID,
        // groupList
        addGroup             : addGroup,
        addUsers2Group       : addUsers2Group,
        delGroup             : delGroup,
        getGroups            : getGroups,
        getUsers             : getUsers,
        getUsersByGroupID    : getUsersByGroupID,
        getPrecinctUsers     : getPrecinctUsers,
        getOnlineUsers       : getOnlineUsers,
        removeUsersFromGroup : removeUsersFromGroup,
        updateGroupName      : updateGroupName,
        updateGroup          : updateGroup,
        // mailBox
        addMsg               : addMsg,
        getUserByName        : getUserByName,
        getGroupOfUsers      : getGroupOfUsers,
        setUserRelation      : setUserRelation,
        getDetailByMailID    : getDetailByMailID,
        deleteFile           : deleteFile,
        updateMsg            : updateMsg,
        // mailBoxList
        getMailList          : getMailList,
        markAsRead           : markAsRead,
        markAsReadAll        : markAsReadAll,
        getRecipients        : getRecipients,
        //getIsShowSysMsgFromUserConfig: getIsShowSysMsgFromUserConfig,
        updateIsShowSysMsgFromUserConfig : updateIsShowSysMsgFromUserConfig
    };
})
.filter('btnText', function ($filter) {
    return function (str) {
        var text = '定时发送';
        if (str) {
            str  = $filter('date')(str, 'yyyy-MM-dd HH:mm:ss', '+0800');
            text = str + ' 时发送';
        }
        return text;
    }
})
.filter('int', function () {
    return function (str) {
        var val = parseInt(str);
        if (isNaN(val)) val = 0;
        return val;
    }
})
.filter('modifySystemUserName', function () {
    return function (str) {
        if('系统发送' == str) {
            str = '系统消息';
        }
        return str;
    }
})
.filter('arrLen', function () {
    return function (arr) {
        var len = -1;
        if(angular.isArray(arr)){
            len = arr.length;
        }
        return len;
    }
})
.provider('msgBoxFrame', function () {
    this.$get = ['$document', '$templateCache', '$templateRequest', '$compile', function ($document, $templateCache, $templateRequest, $compile) {
        return {
            config: function (options) {
                options = angular.extend({}, options);
                return {
                    open: function ($scope, $event) {
                        var delay     = 300;
                        var over      = true;
                        var body      = $document.find('body');
                        var boxSign   = (null == options.sign)  ? 'sign' : options.sign;
                        var boxWidth  = (null == options.width) ? '40%'  : options.width;

                        // var msgBoxElm = angular.element('<div class="message-box" style="width:' + boxWidth + ';right:-' + boxWidth + '">加载中...</div>');
                        // $(".message-box").each(function () {
                        //     angular.element(this).remove()
                        // });;

                        if(0 == $('.message-box').length){
                            body.append('<div class="message-box" style="width:' + boxWidth + ';right:-' + boxWidth + '"></div>');
                        }
                        var msgBox = $('.message-box');

                        if (!options.tpl) { try { console.error('msgBoxProvider 的 options.tpl 不能为空'); } catch (e) { } }

                        var modExist = $('.'+boxSign, msgBox).length;
                        if (!modExist) $templateRequest(options.tpl).then(function (html) {
                            var msgBoxElm = angular.element(html);
                            msgBox.append(msgBoxElm)
                            $compile(msgBoxElm)($scope);
                        });
                        //body.append(msgBoxElm);
                        //$compile(msgBoxElm)($scope);

                        var openBox = function () {
                            over = true;
                            if (0 == msgBox.css('right')) { // 已展开时不再展开
                                return;
                            }

                            $('.message-box > .panel').hide();
                            $('.'+boxSign, msgBox).show();

                            var initialCss = {
                                'width': '' + boxWidth,
                                'right': '-' + boxWidth
                            }
                            msgBox.css(initialCss);
                            msgBox.animate({ right: 0 }, delay, 'swing'); // 展开
                            msgBox.on('mouseenter', function () {
                                over = true;
                            });
                            msgBox.on('mouseleave', function () {
                                over = false;
                            });
                        };
                        var closeBox = function () {
                            var initialCss = {
                                right: '-' + msgBox.css('width')
                            };
                            msgBox.animate(initialCss, delay);
                        };
                        body.on('click', function () {
                            // var visible = msgBox.is(":visible");
                            var width = parseInt(msgBox.css('width'));
                            var right = parseInt(msgBox.css('right'));
                            var visible = (Math.abs(width + right) <= 100) ? false : true; // 100为了容错：width:659,right:-658
                            if (!over && visible){
                                closeBox();
                            }
                        });
                        openBox();

                        //
                        //var elm = $($event.target);
                    }
                };
            },
            close: function () {
                var box = $('.message-box');
                box.animate({
                    right: '-' + box.outerWidth()
                }, 300);
            }
        }
    }];
})
.directive('inbox',  ['msgBoxFrame', 'msgService', function (msgBoxFrame, msgService) {
    return {
        restrict: 'A',
        scope: {
            width: '@'
        },
        link: function (scope, elm, attrs) {
            scope.boxName   = '收件箱';
            scope.page      = { PageSize: 20 };
            scope.mail      = []; // 某个消息
            scope.users     = [];
            scope.boxList   = [];
            scope.keyName   = "";
            scope.beginDate = "";
            scope.endDate   = "";
            scope.mailType  = "in";     // in收件箱，out发件箱，no草稿箱
            scope.msgType   = "normal"; // sys系统消息，其它：非系统消息
            scope.isRead    = "all";     // true已读的，false未读的，"all"全部(service里会把 'all'转成null)
            scope.loading   = false;
            scope.NormalUnreadCount = 0;
            scope.SystemUnreadCount = 0;
            scope.IsShowSystemMessage = 0;
            //msgService.getIsShowSysMsgFromUserConfig().then(function (result) {
            //    scope.IsShowSystemMessage = result.Data;
            //});
            scope.updateIsShowSysMsgFromUserConfig = function () {
                msgService.updateIsShowSysMsgFromUserConfig(scope.IsShowSystemMessage);
            }
            scope.getMailList = function () {
                scope.inbox   = [];
                scope.loading = true;
                // 类型变更时分页回到第一页
                if(1 == arguments.length && arguments[0] != scope.mailType){ scope.page.PageIndex = 1;}
                if(2 == arguments.length && arguments[1] != scope.msgType ){ scope.page.PageIndex = 1; scope.isRead = "all"; scope.keyName = scope.keyword = '';}
                if(3 == arguments.length && arguments[2] != scope.isRead  ){ scope.page.PageIndex = 1; }
                if(4 == arguments.length && arguments[3] != scope.keyName ){ scope.page.PageIndex = 1; scope.keyName = arguments[3]}
                scope.mailType = 1 == arguments.length ? arguments[0] : scope.mailType;
                scope.msgType  = 2 == arguments.length ? arguments[1] : scope.msgType;
                scope.isRead   = 3 == arguments.length ? arguments[2] : scope.isRead;
                msgService.getMailList(scope.beginDate, scope.endDate, scope.keyName, scope.page, scope.mailType, scope.msgType, scope.isRead).then(function (resp) {
                    scope.loading   = false;
                    scope.inbox = resp.MailPageQuery.PageData;
                    scope.page = {
                        PageCount : resp.MailPageQuery.PageCount,
                        PageIndex : resp.MailPageQuery.PageIndex,
                        PageSize  : resp.MailPageQuery.PageSize,
                        RowCount  : resp.MailPageQuery.RowCount || (resp.MailPageQuery.PageCount * resp.MailPageQuery.PageSize)
                    };
                    scope.fileList = resp.FileList;
                    scope.NormalUnreadCount = resp.NormalUnreadCount;
                    scope.SystemUnreadCount = resp.SystemUnreadCount;
                    scope.IsShowSystemMessage = resp.IsShowSystemMessage;
                });
            };
            scope.markAsReadAll = function () { // 全部设为已读
                var msgType  = 1 == arguments.length ? arguments[0] : scope.msgType;
                msgService.markAsReadAll(msgType).then(function (resp) {
                    scope.getMailList();
                });
            };
            scope.markAsRead = function (mail) { // 设为已读
                msgService.markAsRead(mail).then(function(){
                    if (2 == mail.IsRead) { // 1是2否
                        mail.IsRead = 1;
                        if(-1 == mail.CreateUID){
                            scope.SystemUnreadCount--;
                        }else if(mail.CreateUID > 0){
                            scope.NormalUnreadCount--;
                        }
                    }
                });
            };
            scope.changePage = function () {
                scope.getMailList();
            };
            scope.downLoad = function (FileId) {
                window.open("/Sys/SysFile/Down?id=" + FileId);
            };
            scope.close = function () {
                msgBoxFrame.close();
            };
            scope.getInitialRecipients = function(){
                var recipients = [];
                for(var p in scope.mail.users){ // scope.mail.users 在 scope.view() 里赋值
                    recipients.push(scope.mail.users[p].UserName);
                }
                return recipients;
            }
            scope.view = function (mail) { // 查看消息
                scope.mail = mail;
                // 设为已读并返回收件人列表，再设置邮件回复的内容（其它地方没有收件人，不能设置回复的内容）
                msgService.markAsRead(mail).then(function (resp) {
                    scope.mail.users = resp.ReaderData.Data;
                    // 设置回复时的邮件主体
                    scope.mail.replyMailBody = {
                        Title   : '回复：' + scope.mail.Title,
                        Content : '<p></p><p></p><p></p>\
                                    <div class="initialMail">\
                                        ------------------ 原始消息 ------------------\
                                        <div class="initialMailHeader" style="font-size:12px;color:#333;padding:10px;margin-bottom:10px;">\
                                            <div><strong>发件人：</strong>'+scope.mail.UserName+'</div>\
                                            <div><strong>发送时间：</strong>'+scope.mail.SendDate+'</div>\
                                            <div><strong>收件人：</strong>'+(scope.getInitialRecipients().join('、'))+'</div>\
                                            <div><strong>主题：</strong>'+scope.mail.Title+'</div>\
                                        </div>\
                                        <div class="initialMailContent">'+scope.mail.Content+'</div>\
                                    </div>',
                        users   : [{
                            UserName : scope.mail.UserName,
                            UserID   : scope.mail.UserID || scope.mail.CreateUID
                        }]
                    };
                    // 1设为已读，2未读数--
                    if (2 == scope.mail.IsRead) { // 1是2否
                        mail.IsRead = 1;
                        if(-1 == mail.CreateUID){
                            scope.SystemUnreadCount--;
                        }else if(mail.CreateUID > 0){
                            scope.NormalUnreadCount--;
                        }
                    }
                });
            };
            elm.on('click', function (event) {
                var boxWidth = null == scope.width ? '40%' : scope.width;
                msgBoxFrame
                    .config({ 'width': boxWidth, 'tpl': attrs.inbox, 'sign': 'inbox' })
                    .open(scope, event);
                scope.changePage();
            });
        }
    }
}])
.directive('outbox', ['msgBoxFrame', 'msgService', function (msgBoxFrame, msgService) {
    return {
        restrict: 'A',
        scope: {
            width: '@'
        },
        link: function (scope, elm, attrs) {
            scope.boxName = '发件箱';
            scope.mail    = [];
            scope.users   = [];
            scope.page    = { PageSize: 20 };
            scope.getMailList = function () {
                scope.mailType = arguments[0] ? arguments[0] : 'out';     // in收件箱，out发件箱，no草稿箱
                scope.msgType  = arguments[1] ? arguments[1] : 'normal'; // sys系统消息，其它：非系统消息
                scope.isRead   = arguments[2] ? arguments[2] : null;     // true已读的，false未读的，null(不传值)全部
                msgService.getMailList(scope.beginDate, scope.endDate, scope.keyName, scope.page, scope.mailType, scope.msgType, scope.isRead).then(function (resp) {
                    scope.outbox = resp.MailPageQuery.PageData;
                    scope.page   = {
                        PageCount : resp.MailPageQuery.PageCount,
                        PageIndex : resp.MailPageQuery.PageIndex,
                        PageSize  : resp.MailPageQuery.PageSize,
                        RowCount  : resp.MailPageQuery.RowCount || (resp.MailPageQuery.PageCount * resp.MailPageQuery.PageSize)
                    };
                    scope.fileList = resp.FileList;
                });
            }
            scope.changePage = function () {
                scope.getMailList();
            };
            scope.downLoad = function (FileId) {
                window.open("/Sys/SysFile/Down?id=" + FileId);
            };
            scope.close = function () {
                msgBoxFrame.close();
            };
            scope.view = function (mail) { // 查看消息
                scope.mail = mail;
                // 设为已读并返回收件人列表
                msgService.getRecipients(mail).then(function (resp) {
                    scope.mail.users = resp.ReaderData.Data;
                });
                if (2 == scope.mail.IsRead) {
                    scope.mail.IsRead = 1;
                }
            };
            elm.on('click', function (event) {
                var boxWidth = null == scope.width ? '40%' : scope.width;
                msgBoxFrame
                    .config({ 'width': boxWidth, 'tpl': attrs.outbox, 'sign': 'outbox' })
                    .open(scope, event);
                scope.changePage();
            });
        }
    }
}])
.directive('drafts', ['msgBoxFrame', 'msgService', function (msgBoxFrame, msgService) {
    return {
        restrict: 'A',
        scope: {
            width: '@'
        },
        link: function (scope, elm, attrs) {
            scope.boxName = '草稿箱';
            scope.mail    = [];
            scope.users   = [];
            scope.page    = { PageSize: 20 };
            scope.getMailList = function () {
                scope.mailType = arguments[0] ? arguments[0] : 'no';     // in收件箱，out发件箱，no草稿箱
                scope.msgType  = arguments[1] ? arguments[1] : 'normal'; // sys系统消息，其它：非系统消息
                scope.isRead   = arguments[2] ? arguments[2] : null;     // true已读的，false未读的，null(不传值)全部
                msgService.getMailList(scope.beginDate, scope.endDate, scope.keyName, scope.page, scope.mailType, scope.msgType, scope.isRead).then(function (resp) {
                    scope.drafts = resp.MailPageQuery.PageData;
                    scope.page = {
                        PageCount : resp.MailPageQuery.PageCount,
                        PageIndex : resp.MailPageQuery.PageIndex,
                        PageSize  : resp.MailPageQuery.PageSize,
                        RowCount  : resp.MailPageQuery.RowCount || (resp.MailPageQuery.PageCount * resp.MailPageQuery.PageSize)
                    };
                    scope.fileList = resp.FileList;
                });
            };
            scope.downLoad = function (FileId) {
                window.open("/Sys/SysFile/Down?id=" + FileId);
            };
            scope.changePage = function () {
                scope.getMailList();
            };
            scope.close = function () {
                msgBoxFrame.close();
            };
            scope.view = function (mail) { // 查看消息
                scope.mail = mail;
                // 返回收件人列表
                msgService.getRecipients(mail).then(function (resp) {
                    scope.mail.users = resp.ReaderData.Data;
                });
            };
            elm.on('click', function (event) {
                var boxWidth = null == scope.width ? '40%' : scope.width;
                msgBoxFrame
                    .config({ 'width': boxWidth, 'tpl': attrs.drafts, 'sign': 'drafts' })
                    .open(scope, event);
                scope.changePage();
            });
        }
    }
}])
.directive('contacts', ['msgBoxFrame', 'msgService', function (msgBoxFrame, msgService) {
    return {
        restrict: 'A',
        scope: {
            width: '@',
            message: '=?'
        },
        link: function (scope, elm, attrs) {
            scope.boxName   = '通讯录';
            scope.groupName = '全部用户';
            scope.groupID   = 0; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
            scope.page      = {};
            scope.param     = [];
            scope.message   = (null == scope.message) ? {} : scope.message;
            scope.selected  = scope.message.users || []; // 将外部的 users 交给 selected，当 selected 变动时要同步回 users

            scope.syncSelected2MessageUsers = function () { // 当 selected 变动时要同步回 users
                scope.message.users = scope.selected;
            };
            scope.mergeData = function(Users, GroupOfUsers) { // 
                scope.users        = Users;
                scope.GroupOfUsers = GroupOfUsers;
                for (var i = 0; i < scope.users.length; i++) {  // 循环用户列表
                    var userID = scope.users[i].UserID;
                    scope.users[i].Groups = [];
                    for (var j = 0; j < scope.GroupOfUsers.length; j++) {
                        if (scope.GroupOfUsers[j].UserID == scope.users[i].UserID) {
                            scope.users[i].Groups.push({ ID: scope.GroupOfUsers[j].GroupID });
                        }
                    }
                }
                scope.isAllSelected();
            }
            scope.pickIdsFromUsers = function (arr) {
                var x;
                var ids = [];
                for (x in arr) {
                    ids.push(arr[x].UserID);
                }
                return ids;
            };
            scope.groupID2Name = function (ids) { // ids: [{ID:60},{ID:61}]
                var groupName = '';
                var result    = [];
                for (i in ids) {
                    for (item in scope.groups) {
                        if (ids[i].ID == scope.groups[item].ID) {
                            groupName = scope.groups[item].GroupName;
                            break;
                        }
                    }
                    if ('' == groupName) {
                        groupName = '[组名不存在]';
                    }
                    result.push(groupName);
                }
                return result.join('，');
            }
            scope.getGroups = function () {
                msgService.getGroups().then(function (resp) {
                    scope.groups = resp.Data;
                });
            };
            scope.getUsers = function (searchKeyword) {
                //var keyword = null == searchKeyword ? '' : searchKeyword;
                scope.page.PageIndex = scope.page.PageIndex || 1;
                scope.groupName = '全部联系人';
                scope.groupID   = 0; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                msgService.getUsers(scope.searchKeyword, scope.page.PageIndex || 1, scope.param).then(function (resp) {
                    scope.groupName = '全部联系人';
                    scope.groupID   = 0; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.groupID   = 0; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.page = {
                        PageCount : resp.Data.PageCount,
                        PageIndex : resp.Data.PageIndex,
                        PageSize  : resp.Data.PageSize,
                        RowCount  : resp.Data.RowCount || (resp.Data.PageCount * resp.Data.PageSize)
                    };
                    scope.mergeData(resp.Data.Users, resp.Data.GroupOfUsers);
                    if ('' == scope.searchKeyword) {
                        scope.totalUsersNumber = scope.page.RowCount;
                    }
                });
            };
            scope.getUsersByGroupID = function (groupID, groupName) { // 根据组ID获取组下面用户列表
                scope.page.PageIndex = scope.page.PageIndex || 1;
                scope.searchKeyword  = scope.searchKeyword  || "";
                scope.groupID        = groupID; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                if (groupName) scope.groupName = groupName;
                msgService.getUsersByGroupID(groupID, scope.page.PageIndex, scope.param).then(function (resp) {
                    scope.groupID        = groupID; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    if (groupName) scope.groupName = groupName;
                    scope.page = {
                        PageCount : resp.Data.PageCount,
                        PageIndex : resp.Data.PageIndex,
                        PageSize  : resp.Data.PageSize,
                        RowCount  : resp.Data.MembersNumber || resp.Data.RowCount || (resp.Data.PageCount * resp.Data.PageSize)
                    };
                    scope.mergeData(resp.Data.Users, resp.Data.GroupOfUsers);
                });
            };
            scope.getPrecinctUsers = function () { // 本区及下级
                scope.groupName = '本区及下级联系人';
                scope.groupID   = -2; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                msgService.getPrecinctUsers(scope.page.PageIndex || 1).then(function (resp) {
                    scope.groupName = '本区及下级联系人';
                    scope.groupID   = -2; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.page = {
                        PageCount : resp.Data.PageCount,
                        PageIndex : resp.Data.PageIndex,
                        PageSize  : resp.Data.PageSize,
                        RowCount  : resp.Data.RowCount || (resp.Data.PageCount * resp.Data.PageSize)
                    };
                    scope.mergeData(resp.Data.Users, resp.Data.GroupOfUsers);
                    scope.totalPrecinctUsersNumber = scope.page.RowCount;
                });
            };
            scope.getOnlineUsers = function () { // 在线联系人
                scope.groupName = '在线联系人';
                scope.groupID = -3; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                msgService.getOnlineUsers().then(function (resp) { // 目前不支持分页功能201611190954
                    scope.groupName = '在线联系人';
                    scope.groupID = -3; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.page = {
                        PageCount : resp.Data.PageCount || 0,
                        PageIndex : resp.Data.PageIndex || 1,
                        PageSize  : resp.Data.PageSize  || 99999, // 在线联系人目前不支持分页20改为99999避免出现分页
                        RowCount  : resp.Data.RowCount  || resp.Data.List.length || (resp.Data.PageCount * resp.Data.PageSize)
                    };
                    var list = resp.Data.List;
                    var users = [];
                    for (var x in list){ // 更改数组键名
                        users.push({
                            UserID: list[x].ID,
                            UserName: list[x].Name,
                            OrganizationName: list[x].OrganizationName
                        });
                    }
                    scope.users = users;
                    // 绑定组
                    msgService.getGroupOfUsers().then(function (resp) {
                        scope.mergeData(scope.users, resp.Data.GroupOfUsers);
                    });
                    scope.totalOnlineUsersNumber = scope.page.RowCount;
                });
            };
            scope.getUserInfoByID = function (id, data4merge) {
                scope.user = null;
                msgService.getUserInfoByID(id).then(function (resp) {
                    scope.user = resp.Data[0];
                    if (data4merge) {
                        var x;
                        for (x in data4merge) {
                            scope.user[x] = data4merge[x];
                        }
                    }
                });
                //PartyMemberID = data4merge.PartyMemberID;
            };
            scope.getUsersOfSelected = function () { // 已选择的用户
                scope.groupName = '已选择用户';
                scope.groupID   = -1; // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                scope.users     = scope.selected;
                scope.page      = {
                    PageCount : scope.selected.length,
                    PageIndex : 1,
                    PageSize  : scope.selected.length,
                    RowCount  : scope.selected.length
                };
            };
            scope.emptyUsersOfSelected = function () { // 清空已选择的用户
                scope.users = scope.selected = [];
                scope.syncSelected2MessageUsers();
                scope.getUsers();  // 显示“全部联系人组”
            };
            scope.reloadUserList = function () { // 编辑组成员时刷新成员列表和组列表
                scope.clearPageModel();
                if (scope.groupID > 0) { // 如果是在某一个分组下,则刷新该分组。 // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.getUsersByGroupID(scope.groupID);
                } else if (scope.groupID == -1) { // -1已选用户
                    /* 已选用户不更新（无分页） */
                } else if (scope.groupID == -2) { // -2本区及下级
                    scope.getPrecinctUsers();
                } else if (scope.groupID == -3) { // -3在线联系人
                    scope.getOnlineUsers();
                } else {
                    scope.getUsers();
                }
                scope.getGroups();
            };
            scope.addUsers2Group = function (groupID) { // 将用户添加到组
                msgService.addUsers2Group(scope.pickIdsFromUsers(scope.selected), groupID).then(function () {
                    scope.reloadUserList();
                });
            };
            scope.removeUsersFromGroup = function (groupID) { // 删除组成员
                msgService.removeUsersFromGroup(scope.pickIdsFromUsers(scope.selected), groupID).then(function () {
                    scope.reloadUserList();
                });
            };
            scope.addGroup = function () { // 添加组
                if ('' != scope.newGroupName && null != scope.newGroupName) {
                    msgService.addGroup(scope.newGroupName).then(function (result) {
                        scope.groups.push({ GroupName: scope.newGroupName, ID: result.Data, MembersNumber: 0 })
                        scope.showAddGroupPanel = false;
                    });
                }
            };
            scope.updateGroupName = function (data,newName) { //编辑组
                if ('' != scope.editGroupName && null != scope.editGroupName && data.GroupName != newName) {
                    data.GroupName = newName;
                    msgService.updateGroupName(data).then(function (result) {
                        scope.editGroupID = null;
                    })
                } else {
                    scope.editGroupID = null;
                }
            };
            scope.viewOwnGroups = function (user) { // 查看用户拥有的组
                scope.selectUser = user;
            };
            scope.showEditGroupPanel = function (group) {
                scope.editGroupName = group.GroupName;
                scope.editGroupID = group.ID;
            };
            scope.hideEditGroupPanel = function (group) {
                scope.editGroupID = null;
            };
            scope.isSelected = function (UserID) {
                var exist = false;
                var x;
                //console.table(scope.selected);
                for (x in scope.selected) {
                    if (UserID == scope.selected[x].UserID) {
                        exist = x;
                        break;
                    }
                }
                return exist; // return false or indexValue
            };
            scope.select = function (item) {
                var index = scope.isSelected(item.UserID);
                if (false === index) {
                    scope.selected.push({
                        UserID           : item.UserID,
                        UserName         : item.UserName,
                        OrganizationName : item.OrganizationName,
                        Groups           : item.Groups
                    });
                } else {
                    scope.selected.splice(index, 1);
                }
                scope.syncSelected2MessageUsers();
            };
            scope.selectAll = function (e) {
                var checked = e.target.checked;
                var x, index, userId, userName;
                for (x in scope.users) {
                    userId           = scope.users[x].UserID;
                    userName         = scope.users[x].UserName;
                    OrganizationName = scope.users[x].OrganizationName;
                    Groups           = scope.users[x].Groups;
                    index            = scope.isSelected(userId);
                    if (checked && false === index) { // 全选时只选本页未选中的
                        scope.selected.push({
                            UserID           : userId,
                            UserName         : userName,
                            OrganizationName : OrganizationName,
                            Groups           : Groups
                    });
                    }
                    if (!checked && false !== index) { // 取消全选时只取消本页的
                        scope.selected.splice(index, 1);
                    }
                }
                scope.syncSelected2MessageUsers();
            };
            scope.isAllSelected = function () {
                var x,userId;
                var allSelected = true;
                for (x in scope.users) {
                    userId = scope.users[x].UserID;
                    if (false === scope.isSelected(userId)) {
                        allSelected = false;
                        break;
                    }
                }
                return allSelected;
            };
            scope.changePage = function () { // 分页
                if (scope.groupID > 0) { // 如果是在某一个分组下,则刷新该分组。 // 0全部用户，-1已选用户，-2本区及下级，-3在线联系人
                    scope.getUsersByGroupID(scope.groupID);
                } else if (scope.groupID == -1) { // -1已选用户
                    /* 已选用户不更新（无分页） */
                } else if (scope.groupID == -2) { // -2本区及下级
                    scope.getPrecinctUsers();
                } else if (scope.groupID == -3) { // -3在线联系人
                    scope.getOnlineUsers();
                } else {
                    scope.getUsers();
                }
                //if (scope.groupID != null && scope.groupID != '' && scope.groupID > 0) { // 0全部用户，-1已选用户，-2本区及下级
                //    msgService.getUsersByGroupID(scope.groupID, scope.page.PageIndex).then(function (resp) {
                //        scope.page = {
                //            PageCount : resp.Data.PageCount,
                //            PageIndex : resp.Data.PageIndex,
                //            PageSize  : resp.Data.PageSize,
                //            RowCount  : resp.Data.RowCount || (resp.Data.PageCount * resp.Data.PageSize)
                //        };
                //        scope.mergeData(resp.Data.Users, resp.Data.GroupOfUsers);
                //    });
                //} else {
                //    msgService.getUsers(scope.searchKeyword, scope.page.PageIndex).then(function (resp) {
                //        scope.page = {
                //            PageCount : resp.Data.PageCount,
                //            PageIndex : resp.Data.PageIndex,
                //            PageSize  : resp.Data.PageSize,
                //            RowCount  : resp.Data.RowCount || (resp.Data.PageCount * resp.Data.PageSize)
                //        };
                //        scope.mergeData(resp.Data.Users, resp.Data.GroupOfUsers);
                //    });
                //}
            };
            scope.clearPageModel = function (action) {
                scope.page.PageIndex = 1;
                //scope.searchKeyword = "";
            };
            elm.on('click', function (event) {
                var boxWidth = null == scope.width ? '40%' : scope.width;
                scope.selected = scope.message.users || scope.selected;
                msgBoxFrame
                    .config({ 'width': boxWidth, 'tpl': attrs.contacts, 'sign': 'contacts' })
                    .open(scope, event);
                scope.getGroups(); // 组列表

                // 获取3项：1“本区组”成员及成员数 2“全员组”的成员数 3“在线联系人”的成员数
                scope.getPrecinctUsers(); // “本区及下级联系人组”及其成员数
                msgService.getUsers('', 1, scope.param).then(function (resp) { // “全部联系人组”的成员数
                    scope.totalUsersNumber = resp.Data.RowCount || resp.Data.PageCount * resp.Data.PageSize;
                });
                msgService.getOnlineUsers().then(function (resp) { // “在线联系人”成员数 // 目前不支持分页功能201611190954
                    scope.totalOnlineUsersNumber = resp.Data.List.length;
                });

                // 获取3项：1“全员组”成员及成员数 2“本区组”的成员数 3“在线联系人”的成员数
                // scope.getUsers();  // “全部联系人组”及其成员数
                // msgService.getPrecinctUsers().then(function (resp) { // “本区及下级联系人组”的成员数
                //     scope.totalPrecinctUsersNumber = resp.Data.RowCount || resp.Data.PageCount * resp.Data.PageSize;
                // });
                // msgService.getOnlineUsers().then(function (resp) { // “在线联系人”成员数 // 目前不支持分页功能201611190954
                //     scope.totalOnlineUsersNumber = resp.Data.List.length;
                // });
            });
            scope.close = function () {
                msgBoxFrame.close();
            };
        }
    }
}])
.directive('send',   ['$filter', '$alert', 'flowFactory', 'msgBoxFrame', 'msgService', function ($filter, $alert, flowFactory, msgBoxFrame, msgService) {
    return {
        restrict: 'A',
        scope: {
            width: '@',
            message: '=?' // 用途：联系人中的“给他们发消息”；草稿中的查看草稿；回复邮件
        },
        link: function (scope, elm, attrs) {
            window.UEDITOR_CONFIG.initialContent = "";  //编辑器初始值默认为空
            window.UEDITOR_CONFIG.autoHeightEnabled = true;

            scope.boxName = '发消息';
            scope.message = (null == scope.message) ? {} : scope.message;

            scope.uploader = flowFactory.create({ target: '/Message/MsgMailBox/Insert?op=upload' });
            scope.uploadState = false;

            scope.loadTags = function (query) {
                return msgService.getUserByName(query);
            };
            scope.showResult = function(){
                switch(scope.messageType){
                    case 1:
                        msg = '消息发送成功';
                        break;
                    case 2:
                        msg = '草稿保存成功';
                        break;
                    default:
                        msg = '未定义的保存或发送类型';
                }
                $alert.alert({ msg: msg });
                scope.message = {};
                scope.uploader.files = [];
            };
            scope.uploaded = function(){ // 附件上传完成后调用
                scope.showResult();
            };
            scope.send = function (type) {
                scope.messageType = type;
                /*
                 * 警告：
                 * 消息发送流程：
                 * 第一步、发消息获取消息ID
                 * 第二步、上传附件关联消息ID
                 * 第三步、消息发送完成
                 */
                if (angular.isUndefined(scope.message.users) == false || typeof (scope.message.users) != "") {
                    scope.message.IsSend      = type;
                    scope.message.IsMsgRemind = scope.message.IsMsgRemind == true ? 1 : 2;
                    scope.message.IsCompel = scope.message.IsCompel == true ? 1 : 2;
                    if (null == scope.message.ID) { // 非草稿
                        msgService.addMsg(scope.message).then(function (result) {
                            var mailID = result; //添加消息 返回消息ID
                            msgService.setUserRelation(mailID, scope.message.users).then(function (resp) { // 添加收件人
                                scope.uploadState = true;
                                scope.uploader.opts.query.dataId = mailID;
                                scope.uploader.upload();
                            });
                        });
                    } else { // 草稿
                        msgService.updateMsg(scope.message);
                        msgService.setUserRelation(scope.message.ID, scope.message.users).then(function (resp) { // 添加收件人
                            scope.uploadState = true;
                            scope.uploader.opts.query.dataId = scope.message.ID;  //不传dataId，SysFile表中无法保存数据id,这样业务数据表和文件的关联信息将丢失                    
                            scope.uploader.upload();//调用上传方法，开始上传
                            scope.message = {};
                        });
                    }
                }
            };
            scope.timedSend = function () {
                if (!scope.message.sendDate) {
                    scope.showDatepicker = true;
                } else {
                    var myDate = new Date();
                    var DateNow = $filter('date')(myDate, 'yyyy-MM-dd HH:mm');
                    if (scope.sendTime < DateNow) {
                        $alert.alert({ msg: "发送时间必须大于当前时间" });
                        return;
                    }
                    scope.message.mailTiming = scope.message.sendDate;
                    scope.send(1);
                }
            };
            scope.close = function () {
                msgBoxFrame.close();
            };
            elm.on('click', function (event) {
                var boxWidth = null == scope.width ? '40%' : scope.width;
                scope.message = scope.message || {};
                scope.message.users = scope.message.users || [];
                msgBoxFrame
                    .config({ 'width': boxWidth, 'tpl': attrs.send, 'sign': 'send' })
                    .open(scope, event);
            });
        }
    }
}])
.directive('showMsgDetial', function () {
    return {
        restrict: 'A',
        scope:{
            hideFooter : '@',
            parentClass: '@'
        },
        link: function (scope, elm, attrs) {
            scope.hideFooter  = (null == scope.hideFooter)  ? 'true'  : scope.hideFooter;
            scope.parentClass = (null == scope.parentClass) ? 'slide' : scope.parentClass;
            elm.on('click', function () {
                var parent = elm.parents('.'+scope.parentClass);
                $('.detial', parent).animate({
                    left: 0
                }, 200, function () {
                    $('.main > .list-group', parent).hide();
                    $('.detial a.back', parent).show();
                    if ('true' == scope.hideFooter) {
                        $('.main', parent).css('bottom',0);
                        $('.panel-footer', parent).hide();
                    }
                });
            });
        }
    }
})
.directive('hideMsgDetial', function () {
    return {
        restrict: 'A',
        scope: {
            showFooter  : '@',
            parentClass : '@'
        },
        link: function (scope, elm, attrs) {
            scope.showFooter  = (null == scope.showFooter)  ? 'true'  : scope.showFooter;
            scope.parentClass = (null == scope.parentClass) ? 'slide' : scope.parentClass;
            elm.on('click', function () {
                var parent = elm.parents('.'+scope.parentClass);
                $('.main > .list-group', parent).show();
                $('.detial a.back', parent).hide();
                $('.detial', parent).animate({
                    left: '100%'
                },200);
                if ('true' == scope.showFooter) {
                    $('.main', parent).css('bottom', '43px');
                    $('.panel-footer', parent).show();
                }
            });
        }
    }
})
.controller("compelMessageCtl", function ($scope, $uibModalInstance, $uibModalStack, $alert, $filter, msgService, compelMessags, fileList) {
    $scope.currentIndex = 0;
    $scope.isReadAll = false;
    $scope.compelMessags = compelMessags;
    $scope.fileList = fileList;
    $scope.close = function () {
        $uibModalInstance.dismiss('cancel');
    };
    $scope.downLoad = function (FileId) {
        window.open("/Sys/SysFile/Down?id=" + FileId);
    };
    $scope.view = function (index) { // 查看消息
        $scope.currentIndex = index;
        $scope.mail = $scope.compelMessags[index];
        // 设为已读并返回收件人列表，再设置邮件回复的内容（其它地方没有收件人，不能设置回复的内容）
        msgService.markAsRead($scope.mail).then(function (resp) {
            $scope.compelMessags[index].IsRead = 1;
            $scope.mail.users = resp.ReaderData.Data;
            var read = true;
            for (var i = 0; i < $scope.compelMessags.length; i++) {
                if ($scope.compelMessags[i].IsRead != 1) {
                    read = false;
                    break;
                }
            }
            $scope.isReadAll = read;
        });
    };
    $scope.view($scope.currentIndex);
})
     //判断当前用户账号是否是初始密码，如果是初始密码提示用户修改密码
.controller("updatePwdCtl",["$scope","$location","$uibModalInstance","$uibModalStack","$alert","$updatePWD", function ($scope, $location, $uibModalInstance, $uibModalStack, $alert, $updatePWD) {
    $scope.isDisabled = false;
    //新旧密码是否一致校验
    $scope.checkPWD1 = function () {
        if (angular.isUndefined($scope.pwd.originalLoginPWD)) {
            $alert.alert({
                msg: "请输入原始密码！"
            });
        }
        else {
            $updatePWD.GetOldPwd($scope.pwd.originalLoginPWD).then(function (result) {
                if (result.success == false) {
                    $scope.pwd.originalLoginPWD = "";
                }
            });
        }
    }
    $scope.checkPWD2 = function () {
        if (angular.isUndefined($scope.pwd.newLoginPWD)) {
            $alert.alert({
                msg: "请输入新密码！"
            });
        }
        else if ($scope.pwd.newLoginPWD != $scope.pwd.againLoginPWD && $scope.pwd.againLoginPWD) {
            $alert.alert({
                msg: "两次输入密码不一致！"
            });
            $scope.pwd.againLoginPWD = "";
            $scope.pwd.newLoginPWD = "";
        }

    }
    $scope.checkPWD3 = function () {
        if (angular.isUndefined($scope.pwd.againLoginPWD)) {
            $alert.alert({
                msg: "请重复输入新密码！"
            });
        }
        else if ($scope.pwd.newLoginPWD != $scope.pwd.againLoginPWD && $scope.pwd.newLoginPWD) {
            $alert.alert({
                msg: "两次输入密码不一致！"
            });
            $scope.pwd.againLoginPWD = "";
            $scope.pwd.newLoginPWD = "";
        }

    };
    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
    //修改密码
    $scope.save = function (pwd) {
        $scope.isDisabled = true;
        if (angular.isUndefined($scope.pwd) || angular.isUndefined($scope.pwd.originalLoginPWD) || angular.isUndefined($scope.pwd.againLoginPWD) || angular.isUndefined($scope.pwd.newLoginPWD)) {
            $alert.alert({
                msg: "请输入密码！"
            });
        }
        else {
            $updatePWD.UpdatePwd($scope.pwd.originalLoginPWD, $scope.pwd.againLoginPWD).then(function (result) {
                if (result.success == true) {
                    window.sessionStorage["isStartPwd"] = 'true';
                    $uibModalInstance.dismiss('cancel');
                    $alert.alert({
                        msg: "密码修改成功！"
                    });
                }
            });
        }
    }
}]);

angular.module('honzh', ['honzh.dictionary', 'honzh.organization', 'honzh.popbox', 'honzh.position', 'honzh.filter', 'honzh.service', 'honzh.ngScrollTo', 'honzh.ui'])
.controller("buildingCtl", ['$scope', '$location', function ($scope, $location) {
    $scope.url = $location.absUrl();
    $scope.$parent.waiting = false;
}]);


