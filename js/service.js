angular.module('honzh.service', ["ngCookies", "honzh.ui"])
    .service("$sysapi", ['$http', '$sysconfig', '$alert', '$info', '$location', function ($http, $sysconfig, $alert, $info, $location) {
        var postMap = {};
        $sysconfig.sysapi.error = function (result, config) {
            $alert.error({
                msg: result.Message,
                err: result.Data
            });
            //console.error("服务端异常:" + config.url + "\r\n" + result.Data.Message + "\r\n" + result.Data.StackTrace);
            $http({
                method: 'POST',
                url: "/Message/MsgMailBox/InsertErrorReport",
                data: { logGuid: result.Data }
            })
            .success(function (data) {
                $info.show("错误报告发送成功");
            });
        };
        $sysconfig.sysapi.failed = function (result, config) {
            $alert.failed({
                msg: result.Message
            });
        };
        $sysconfig.sysapi.noright = function (result, config) {
            $alert.error({
                msg: result.Message,
                templateUrl: "/v2/template/noright.html"
            });
            console.error("没有权限访问该请求。" + config.url);
        };
        $sysconfig.sysapi.alert = function (result) {

            //$alert.alert({ msg: result.Message });
        };
        $sysconfig.sysapi.logtimeout = function (result) {
            $alert.error({
                msg: "登录超时，请重新登录",
                templateUrl: "/v2/template/noright.html",
                ok: function () {
                    window.location.href = "/";
                }
            });
        };
        var post = function (option) {
            option.nocache = option.nocache == undefined ? true : false;
            var postedCallBack = function () {
                if (postMap[key] && postMap[key].posting == false) {
                    handler.success(postMap[key].data);
                }
                else
                    setTimeout(function () {
                        postedCallBack();
                    })
            }
            var handler = {};
            var success = function (func) {
                handler.success = func;
                return result;
            };
            var error = function (func) {
                handler.error = func;
                return result;
            };
            var alert = function (func) {
                handler.alert = func;
                return result;
            }
            var logtimeout = function (func) {
                handler.logtimeout = func;
                return result;
            }
            var noright = function (func) {
                handler.noright = func;
                return result;
            }
            var failed = function (func) {
                handler.failed = func;
                return result;
            }
            var result = {
                success: success,
                error: error,
                alert: alert,
                failed: failed,
                logtimeout: logtimeout,
                noright: noright
            };
            if (option.nocache != true) {
                var key = JSON.stringify(option);
                if (typeof (postMap[key]) == "undefined")
                    postMap[key] = { posting: false }
                if (postMap[key] && postMap[key].posting == true) {
                    setTimeout(postedCallBack)
                    return result;
                }
                else {
                    postMap[key].posting = true;
                }
            }
            option.headers = { 'X-Requested-With': "XMLHttpRequest", 'UrlReferrer': $location.absUrl() };
            $http(option).success(function (data, status, headers, config) {
                if (data.StatusCode == 200) {
                    if (option.nocache != true) {
                        postMap[key].data = data;
                        postMap[key].posting = false;
                    }
                    if (data.success) {
                        if (data.IsInfo) {
                            $info.show(data.Message);
                        }
                        if (handler.success)
                            handler.success(data);

                    } else {
                        if (data.IsInfo) {
                            $sysconfig.sysapi.failed(data, config);
                        }
                        if (handler.failed)
                            handler.failed(data, config);
                    }
                } else if (data.StatusCode == 401) {
                    if (handler.logtimeout)
                        handler.logtimeout(data);
                    else
                        $sysconfig.sysapi.logtimeout(data);
                } else if (data.StatusCode == 403) {
                    if (handler.noright)
                        handler.noright(data, config);
                    else
                        $sysconfig.sysapi.noright(data, config);
                }
                else {
                    if (handler.error)
                        handler.error(data, config);
                    else
                        $sysconfig.sysapi.error(data, config);
                }
            });
            return result
        }
        return {
            post: post
        };
    }])
    .service('$SysOrganization', ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {

        function pushToNodeMap(node) {
            //虚拟节点也要push到nodeMap中，否则加载默认节点时虚拟节点无法打开
            //如果是虚拟节点要从子节点中找到虚拟节点的父级节点的ID和虚拟类型
            if (!node.attributes) {
                node.id = node.Data[0].attributes.ParentID + "_" + node.Data[0].attributes.OrganizationVirtualType;
                node.selectable = false; //虚拟节点不可选
                nodeMap[node.id] = node;
            }
            else {
                nodeMap[node.id] = node;
                node.selectable = true; //非虚拟节点可选
            }
            if (node.Data)
                for (var i = 0; i < node.Data.length; i++) {
                    pushToNodeMap(node.Data[i]);
                }
        }
        var childMap = {};
        var nodeMap = {};
        var getChild = function (id, countType) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (!childMap[id] || (!angular.isUndefined(countType) && countType.length > 0))
                $sysapi.post({
                    method: 'POST',
                    url: "/PartyOrganization/PoOrganizationV2Extend/GetAllTree",
                    data: { node: id, _dc: Math.random(), countType: countType }
                })
                    .success(function (data) {
                        var result = data.Data;
                        deferred.resolve(result);
                        childMap[id] = data.Data;
                        for (var i = 0; i < data.Data.length; i++) {
                            pushToNodeMap(data.Data[i]);
                            //nodeMap[data.Data[i].id] = data.Data[i];
                        }
                    });
            else {
                setTimeout(function () {
                    deferred.resolve(childMap[id]);
                })
            }
            return promise;
        };
        var getChildFromServer = function (id, countType) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/PartyOrganization/PoOrganizationV2Extend/GetAllTree",
                data: { node: id, _dc: Math.random(), countType: countType }
            })
                .success(function (data) {
                    var result = data.Data;
                    deferred.resolve(result);
                    childMap[id] = data.Data;
                    for (var i = 0; i < data.Data.length; i++) {
                        nodeMap[data.Data[i].id] = data.Data[i];
                    }
                });
            return promise;
        };
        var getUserAllTree = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (!childMap["self"])
                $sysapi.post({
                    method: 'POST',
                    url: "/PartyOrganization/PoOrganizationV2Extend/GetUserAllTree",
                    data: { ischecked: true, _dc: Math.random() }
                })
                    .success(function (data) {
                        var result = data.Data;
                        deferred.resolve(result);
                        childMap["self"] = data.Data;
                        //childMap[data.Data.id] = data.Data.Data;
                        //nodeMap[data.Data.id] = data.Data;
                        for (var i = 0; i < data.Data.length; i++) {
                            pushToNodeMap(data.Data[i]);
                            childMap[data.Data[i].id] = data.Data[i].Data;
                        }
                    });
            else {
                setTimeout(function () {
                    deferred.resolve(childMap["self"]);
                })
            }
            return promise;
        };
        var getNodeById = function (id) {
            return nodeMap[id];
        };
        var getVirtualNode = function (nodeid) {
            //如果该节点父级是虚拟节点的话根据父节点的id和虚拟类型到nodeMap中找虚拟节点
            return getNodeById(nodeid);
        }
        var getParentByNode = function (node) {
            if (typeof (node) == "undefined")
                return undefined;
            return getNodeById(node.attributes.ParentID);
        };
        var removeOrganization = function (organization) {
            nodeMap[organization.ID] = undefined;
            var parent = nodeMap[organization.ParentID];

            for (var i = 0; i < parent.Data.length; i++) {
                if (parent.Data[i].id == organization.ID) {
                    parent.Data.splice(i, 1);
                    if (parent.Data.length == 0)
                        parent.leaf = true;
                    return;
                }
                if (parent.Data[i].Data)
                    for (var j = 0; j < parent.Data[i].Data.length; j++) {
                        if (parent.Data[i].Data[j].id == organization.ID) {
                            parent.Data[i].Data.splice(j, 1);
                            if (parent.Data[i].Data.length == 0)
                                parent.Data[i].leaf = true;
                            return;
                        }
                    }
            }
        }
        var updateNodeName = function (organization) {
            nodeMap[organization.ID].text = organization.OrganizationName;
        }
        var addOrganization = function (organization, countType) {
            nodeMap[organization.ID] = organization;
            var parent = nodeMap[organization.ParentID];
            parent.leaf = false;
            getChildFromServer(parent.id, countType).then(function (result) {
                parent.Data = result;
            });
        }
        var searchOrganization = function (organizationName, includeHistroy) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/PartyOrganization/PoOrganizationV2Extend/Search",
                data: {
                    _dc: Math.random(),
                    organizationName: organizationName,
                    includeHistroy: includeHistroy
                }
            })
                .success(function (data) {
                    var result = data;
                    deferred.resolve(result);
                });
            return promise;
        }
        return {
            getChild: getChild,
            getUserAllTree: getUserAllTree, //根据当前用户获取所有节点
            getNodeById: getNodeById,
            getParentByNode: getParentByNode,
            getVirtualNode: getVirtualNode,
            addOrganization: addOrganization,
            removeOrganization: removeOrganization,
            updateNodeName: updateNodeName,
            getChildFromServer: getChildFromServer,
            searchOrganization: searchOrganization
        };
    }])
    .service('$SysCompany', ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {

        function pushToNodeMap(node) {
            //虚拟节点也要push到nodeMap中，否则加载默认节点时虚拟节点无法打开
            //如果是虚拟节点要从子节点中找到虚拟节点的父级节点的ID和虚拟类型
            if (!node.attributes) {
                node.id = node.Data[0].attributes.ParentID + "_" + node.Data[0].attributes.OrganizationVirtualType;
                node.selectable = false; //虚拟节点不可选
                nodeMap[node.id] = node;
            }
            else {
                nodeMap[node.id] = node;
                node.selectable = true; //非虚拟节点可选
            }
            if (node.Data)
                for (var i = 0; i < node.Data.length; i++) {
                    pushToNodeMap(node.Data[i]);
                }
        }
        var childMap = {};
        var nodeMap = {};
        var getChild = function (id, memberCount) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (!childMap[id])
                $sysapi.post({
                    method: 'POST',
                    url: "/PartyOrganization/PoCompany/GetAllTree",
                    data: { node: id, _dc: Math.random(), isPartyMemberCount: memberCount }
                })
                    .success(function (data) {
                        var result = data.Data;
                        deferred.resolve(result);
                        childMap[id] = data.Data;
                        for (var i = 0; i < data.Data.length; i++) {
                            pushToNodeMap(data.Data[i]);
                            //nodeMap[data.Data[i].id] = data.Data[i];
                        }
                    });
            else {
                setTimeout(function () {
                    deferred.resolve(childMap[id]);
                })
            }
            return promise;
        };
        var getChildFromServer = function (id, memberCount) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/PartyOrganization/PoCompany/GetAllTree",
                data: { node: id, _dc: Math.random(), isPartyMemberCount: memberCount }
            })
                .success(function (data) {
                    var result = data.Data;
                    deferred.resolve(result);
                    childMap[id] = data.Data;
                    for (var i = 0; i < data.Data.length; i++) {
                        nodeMap[data.Data[i].id] = data.Data[i];
                    }
                });
            return promise;
        };
        var getUserAllTree = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (!childMap["self"])
                $sysapi.post({
                    method: 'POST',
                    url: "/PartyOrganization/PoCompany/GetUserAllTree",
                    data: { ischecked: true, _dc: Math.random() }
                })
                    .success(function (data) {
                        var result = data.Data;
                        deferred.resolve(result);
                        childMap["self"] = data.Data;
                        childMap[data.Data.id] = data.Data.Data;
                        nodeMap[data.Data.id] = data.Data;
                        for (var i = 0; i < data.Data.length; i++) {
                            pushToNodeMap(data.Data[i]);
                        }
                    });
            else {
                setTimeout(function () {
                    deferred.resolve(childMap["self"]);
                })
            }
            return promise;
        };
        var getNodeById = function (id) {
            return nodeMap[id];
        };
        var getVirtualNode = function (nodeid) {
            //如果该节点父级是虚拟节点的话根据父节点的id和虚拟类型到nodeMap中找虚拟节点
            return getNodeById(nodeid);
        }
        var getParentByNode = function (node) {
            if (typeof (node) == "undefined")
                return undefined;
            return getNodeById(node.attributes.ParentID);
        };
        return {
            getChild: getChild,
            getUserAllTree: getUserAllTree, //根据当前用户获取所有节点
            getNodeById: getNodeById,
            getParentByNode: getParentByNode,
            getVirtualNode: getVirtualNode
        };
    }])
    .service('$SysDataDictionaryItem', ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {
        var listDit = null;
        var treeDit = null;
        var treeItemMap = {};
        var listItemMap = {};
        var pushTreeItemListToMap = function (nodeList) {
            if (nodeList != undefined && nodeList != null)
                for (var i = 0; i < nodeList.length; i++) {
                    treeItemMap[nodeList[i].id] = nodeList[i];
                    pushTreeItemListToMap(nodeList[i].Data);
                }
        }
        var getAllListDit = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysDataDictionaryItem/GetAllListDit",
                data: { dc: window.localStorage.DictionaryModifyDate }
            })
                .success(function (data) {
                    var result = data.Data;
                    listDit = result;
                    deferred.resolve(listDit);
                });
            return promise;
        }
        var getAllTreeDit = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysDataDictionaryItem/GetAllTreeDit",
                data: { dc: window.localStorage.DictionaryModifyDate }
            })
                .success(function (data) {

                    var result = data.Data;
                    treeDit = result;
                    deferred.resolve(listDit);
                });
            return promise;
        };
        var getListDitByCode = function (code) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (listDit == null) {
                getAllListDit().then(function (data) {
                    deferred.resolve(listDit[code]);
                    if (listDit[code]) {
                        var itemList = listDit[code]
                        for (var i = 0; i < itemList.length; i++) {
                            listItemMap[itemList[i].ItemCode] = itemList[i];
                        }
                    }
                })
            }
            else {
                setTimeout(function () {
                    deferred.resolve(listDit[code]);
                });
            }
            return promise;
        };
        var getTreeDitByCode = function (code) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (listDit == null) {
                getAllTreeDit().then(function (data) {
                    deferred.resolve(treeDit[code]);
                    pushTreeItemListToMap(treeDit[code]);
                })
            }
            else {
                setTimeout(function () {
                    deferred.resolve(treeDit[code]);
                });
            }
            return promise;
        };
        var getTreeItemById = function (id) {
            return treeItemMap[id];
        }
        var getListItemByCode = function (code) {
            return listItemMap[code];
        }
        return {
            getListDitByCode: getListDitByCode,
            getTreeDitByCode: getTreeDitByCode,
            getTreeItemById: getTreeItemById,
            getListItemByCode: getListItemByCode
        };
    }])
    .service('$DataDictionaryItem', ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {
        var listDic = { loading: false, data: {} };
        var treeDic = { loading: false, data: {} };
        var itemList = {};
        var itemListLoading = false;
        var getAllListDicFromServer = function (remoteModifyDate) {
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysDataDictionaryItem/GetAllListDit",
                data: { dc: window.localStorage.DictionaryModifyDate }
            })
                .success(function (data) {
                    listDic.data = data.Data;
                    //window.localStorage.listDic = JSON.stringify(listDic.data);
                    for (var key in listDic.data) {
                        window.localStorage[key] = JSON.stringify(listDic.data[key]);
                    }
                    listDic.loading = false;
                    window.localStorage["DictionaryModifyDate"] = remoteModifyDate;
                });
        }
        var getAllTreeDicFromServer = function (remoteModifyDate) {
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysDataDictionaryItem/GetAllTreeDit",
                data: { dc: window.localStorage.DictionaryModifyDate }
            })
                .success(function (data) {
                    treeDic.data = data.Data;
                    //window.localStorage.treeDic = JSON.stringify(treeDic.data);
                    for (var key in treeDic.data) {
                        window.localStorage[key] = JSON.stringify(treeDic.data[key]);
                    }
                    treeDic.loading = false;
                    window.localStorage["DictionaryModifyDate"] = remoteModifyDate;
                });
        }
        var getListDicByGroupCode = function (groupCode) {
            var deferred = $q.defer();
            var promise = deferred.promise;

            function addListDicToItem(listDic, group) {
                for (var i = 0; i < listDic.length; i++) {
                    itemList[group + "_" + listDic[i].IntCode] = listDic[i];
                }
            }

            function resolve() {
                if (!treeDic.loading && !listDic.loading) {
                    if (!listDic.data[groupCode]) {
                        if (window.localStorage[groupCode]) {
                            var modal = JSON.parse(window.localStorage[groupCode]);
                            listDic.data[groupCode] = modal;
                        }
                        else
                            return;
                    }
                    addListDicToItem(listDic.data[groupCode], groupCode);
                    deferred.resolve(listDic.data[groupCode]);
                }
                else
                    setTimeout(resolve);
            }

            setTimeout(resolve);
            return promise;
        };
        var getOrganizationListDicByGroupCode = function (code) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysOrganizationDataDictionaryItem/QuerySysDataDictionaryItem",
                data: { DictionaryCode: code }
            })
                .success(function (data) {
                    deferred.resolve(data);
                });
            return promise;
        };
        var getTreeDitByGroupCode = function (groupCode) {
            var deferred = $q.defer();
            var promise = deferred.promise;

            function addTreeItem(list, group) {
                if (list)
                    for (var i = 0; i < list.length; i++) {
                        itemList[list[i].attributes.ItemCode] = list[i].attributes;
                        addTreeItem(list[i].Data, group);
                    }
            }

            function resolve() {
                if (!treeDic.loading && !listDic.loading) {
                    if (!treeDic.data[groupCode]) {
                        if (window.localStorage[groupCode]) {
                            var modal = JSON.parse(window.localStorage[groupCode]);
                            treeDic.data[groupCode] = modal;
                        }
                        else
                            return;
                    }
                    addTreeItem(treeDic.data[groupCode], groupCode);
                    deferred.resolve(treeDic.data[groupCode]);
                }
                else
                    setTimeout(resolve);
            }

            setTimeout(resolve);
            return promise;
        };
        var initAllDictionary = function (localModifyDate, remoteModifyDate) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            listDic.loading = treeDic.loading = itemListLoading = true;
            if (localModifyDate == remoteModifyDate) {
                treeDic.loading = listDic.loading = false;
            }
            else {
                getAllListDicFromServer(remoteModifyDate);
                getAllTreeDicFromServer(remoteModifyDate);
            }
            setTimeout(resolve);
            function resolve() {
                if (!treeDic.loading && !listDic.loading) {
                    deferred.resolve({ treeDic: treeDic, listDic: listDic });
                    itemListLoading = false;
                }
                else
                    setTimeout(resolve);
            }

            return promise;
        };
        var getItem = function (option) {
            var deferred = $q.defer();
            var promise = deferred.promise;

            function resolve() {
                if (!treeDic.loading && !listDic.loading && !itemListLoading) {
                    if (option.ItemCode) {
                        getTreeDitByGroupCode(option.ItemCode.substring(0, 4)).then(function (result) {
                            var key = option.ItemCode ? option.ItemCode : option.group + "_" + option.IntCode;
                            deferred.resolve(itemList[key]);
                        });
                    }
                    else {
                        getListDicByGroupCode(option.group).then(function (result) {
                            var key = option.ItemCode ? option.ItemCode : option.group + "_" + option.IntCode;
                            deferred.resolve(itemList[key]);
                        });
                    }
                }
                else
                    setTimeout(resolve);
            }

            setTimeout(resolve);
            return promise;
        };
        var getItems = function (option) {
            var deferred = $q.defer();
            var promise = deferred.promise;

            function resolve() {
                if (!treeDic.loading && !listDic.loading && !itemListLoading) {
                    if (option.ItemCode) {
                        getTreeDitByGroupCode(option.ItemCode[0].substring(0, 4)).then(function (result) {
                            var list = option.ItemCode ? option.ItemCode : option.IntCode;
                            for (var i = 0; i < list.length; i++) {
                                var key = option.ItemCode ? list[i] : option.group + "_" + list[i];
                                list[i] = itemList[key]
                            }
                            deferred.resolve(list);
                        });
                    }
                    else {
                        getListDicByGroupCode(option.group).then(function (result) {
                            var list = option.ItemCode ? option.ItemCode : option.IntCode;
                            for (var i = 0; i < list.length; i++) {
                                var key = option.ItemCode ? list[i] : option.group + "_" + list[i];
                                list[i] = itemList[key]
                            }
                            deferred.resolve(list);
                        });
                    }
                }
                else
                    setTimeout(resolve, 10);
            }

            setTimeout(resolve, 10);
            return promise;
        };
        var getExpandTreeNode = function (itemCode) {
            var root = treeDic.data[itemCode.substring(0, 4)];
            if (!root)
                return undefined;
            for (var i = 0; i < root.length; i++) {
                if (root[i].attributes.ItemCode == itemCode)
                    return root[i];
                else {
                    var node = findSubTreeNode(root[i].Data);
                    if (node)
                        return node;
                }
            }
        }
        var findSubTreeNode = function (data, itemCode) {
            if (!data)
                return undefined;
            for (var i = 0; i < data.length; i++) {
                if (data[i].attributes.ItemCode == itemCode)
                    return data[i];
                else {
                    var node = findSubTreeNode(data[i].Data, itemCode);
                    if (node) return node;
                }
            }
        }
        return {
            getOrganizationListDicByGroupCode: getOrganizationListDicByGroupCode,
            getListDicByGroupCode: getListDicByGroupCode,
            getTreeDitByGroupCode: getTreeDitByGroupCode,
            initAllDictionary: initAllDictionary,
            getItem: getItem,
            getItems: getItems,
            getExpandTreeNode: getExpandTreeNode
        };
    }])
    .service("$User", ['$sysapi', '$resource', '$q', '$cookies', function ($sysapi, $resource, $q, $cookies) {

        var u = $cookies.get("30W");
        setInterval(function () {
            if (!$cookies.get("30W"))
                location.href = "/v2/guest";
            if (u != $cookies.get("30W"))
                location.reload();
        }, 1000);

        var getCurrentNameFromCookie = function () {
            return $cookies.get("username").replace(/\+/g, " ")
        }
        var logout = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysUser/Cancellation"
            })
               .success(function (data) {
                   deferred.resolve(data);
               });
            return promise;
        }
        var popedomRequesting = false;
        var hasPopedom = function (key) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (window.sessionStorage["popedom"]) {
                setTimeout(function () {
                    var has = findPopedom(key);
                    deferred.resolve(has);
                });
            }
            else {
                if (popedomRequesting) {
                    var timer = function () {
                        if (!popedomRequesting) {
                            var has = findPopedom(key);
                            deferred.resolve(has);
                        }
                        else
                            setTimeout(timer, 1);
                    }
                    timer();
                    return promise;
                }
                else {
                    popedomRequesting = true;
                    getCodeByUserId().then(function (result) {
                        popedomRequesting = false;
                        var has = findPopedom(key);
                        deferred.resolve(has);
                    });
                }
            }
            return promise;
        }
        var getCodeByUserId = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: "POST",
                url: "/Sys/SysPopedom/GetCodeByUserId"
            }).success(function (result) {
                window.sessionStorage["popedom"] = JSON.stringify(result.Data);
                deferred.resolve(result.Data);
            });
            return promise;
        }
        var findPopedom = function (key) {
            var popdomList = JSON.parse(window.sessionStorage["popedom"]);
            for (var i = 0; i < popdomList.length; i++) {
                if (popdomList[i] == key) {
                    return true;
                }
            }
            return false;
        }
        var getPopedom = function () {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysPopedom/GetByUserId"
            })
                .success(function (data) {
                    deferred.resolve(data);
                });
            return promise;
        }

        var getUserInfo = function (id) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (window.sessionStorage["UserInfo"]) {
                setTimeout(function () {
                    var userInfo = JSON.parse(window.sessionStorage["UserInfo"]);
                    deferred.resolve(userInfo);
                });
            }
            else {
                getUserInfoFromServer().then(function (result) {
                    deferred.resolve(result.Data);
                });
            }
            return promise;
        }
        var getUserInfoFromServer = function (id) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysUser/UserInfo"
            }).success(function (data) {
                window.sessionStorage["UserInfo"] = JSON.stringify(data.Data);
                deferred.resolve(data);
            });
            return promise;
        }
        var setDefaultUserType = function (userInfo) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysUser/SetDefaultUserType",
                data: { typeid: userInfo.DefaultUserTypeId }
            }).success(function (data) {
                window.sessionStorage["UserInfo"] = JSON.stringify(userInfo);
                deferred.resolve(data);
            });
            return promise;
        }
        return {
            getCurrentNameFromCookie: getCurrentNameFromCookie,
            logout: logout,
            hasPopedom: hasPopedom,
            getPopedom: getPopedom,
            getUserInfo: getUserInfo,
            getUserInfoFromServer: getUserInfoFromServer,
            setDefaultUserType: setDefaultUserType
        };
    }])
    .service("$ajax2form", function () {
        var post = function (url, data) {
            var form = $("<form>");
            form.attr("method", "post");
            form.attr("action", url);
            var input = $("<input>");
            input.attr("name", "model");
            input.attr("value", JSON.stringify(data));
            form.append(input);
            $("body").append(form);
            form.submit();
            form.remove();
        };
        return {
            post: post
        };
    })
    .service("$print", ['$alert', function ($alert) {
        var checkInstall = function () {
            if (typeof (LODOP) != "undefined")
                if (LODOP.webskt.readyState == 1)
                    return true;
            $alert.alert({
                templateUrl: "/v2/template/printInstall.html"
            });
            return false;
        };
        return {
            checkInstall: checkInstall
        };
    }])
    .service("$LoadingTips", ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {

        var getLoadingTipsFromServer = function () {
            $sysapi.post({
                method: 'POST',
                url: "/Tools/ToolsLoadingTips/GetList",
                data: {
                    _dc: Math.random,
                }
            }).success(function (data) {
                if (true == data.success) {
                    window.localStorage["AllTipsText"] = data.Data.join("|");
                    getLoadingTips();

                } else {
                    localStorage.loadingTip = "加载中...";
                }
            });
        };

        var getLoadingTips = function () {

            var _allTipsText = window.localStorage["AllTipsText"].split("|");

            var info = Math.random() * _allTipsText.length;

            var _index = parseInt(info);

            localStorage.loadingTip = _allTipsText[_index];

        }

        var initAllTipsText = function (localModifyDate, remoteModifyDate) {

            var _allTipsText = window.localStorage["AllTipsText"];

            if (localModifyDate == remoteModifyDate && _allTipsText != undefined) {
                getLoadingTips();
                return;
            }
            else {
                getLoadingTipsFromServer();
                window.localStorage["TipsTextModifyDate"] = remoteModifyDate;
            }

        };

        return {
            initAllTipsText: initAllTipsText
        };

    }])
    .service("$FieldValidateDefine", ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {
        var loading = false;
        var initAllFieldValidateDefine = function (localModifyDate, remoteModifyDate) {
            if (localModifyDate != remoteModifyDate) {
                loading = true;
                $sysapi.post({
                    method: 'POST',
                    url: "/Tools/ToolsFieldValidateDefine/GetAll",
                    data: {
                        _dc: Math.random,
                    }
                }).success(function (data) {
                    if (true == data.success) {
                        for (var item in data.Data) {
                            var key = data.Data[item].TableDescription + '.' + data.Data[item].FieldDescription;
                            window.localStorage["FieldValidateDefine_" + key] = JSON.stringify(data.Data[item]);
                        }
                        window.localStorage["FieldValidateDefineModifyDate"] = remoteModifyDate;
                        loading = false;
                    }
                });
            }
        };
        var getFieldValidateType = function (attribute) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            setTimeout(resolve);
            function resolve() {
                if (!loading) {
                    var define = window.localStorage["FieldValidateDefine_" + attribute];
                    if (define)
                        deferred.resolve(JSON.parse(define));
                    loading = false;
                }
                else
                    setTimeout(resolve);
            }
            return promise;
        }
        return {
            getFieldValidateType: getFieldValidateType,
            initAllFieldValidateDefine: initAllFieldValidateDefine
        };
    }])
    //判断当前用户账号是否是初始密码，如果是初始密码提示用户修改密码
    .service("$updatePWD", ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {
        //获取旧密码
        var GetOldPwd = function (OldLoginPWD) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysUser/GetOldPwd",
                data: {
                    OldLoginPWD: OldLoginPWD
                }
            }).success(function (data) {
                var result = data;
                deferred.resolve(result);
            });
            return promise;
        };
        //修改密码
        var UpdatePwd = function (OldLoginPWD, NewLoginPWD) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysUser/UpdatePwd",
                data: {
                    OldLoginPWD: OldLoginPWD,
                    NewLoginPWD: NewLoginPWD
                }
            }).success(function (data) {
                var result = data;
                deferred.resolve(result);
            });
            return promise;
        };
        return { GetOldPwd: GetOldPwd, UpdatePwd: UpdatePwd }
    }])
 .service('$SysArea', ['$sysapi', '$resource', '$q', function ($sysapi, $resource, $q) {

     function pushToNodeMap(node) {
         //虚拟节点也要push到nodeMap中，否则加载默认节点时虚拟节点无法打开
         //如果是虚拟节点要从子节点中找到虚拟节点的父级节点的ID和虚拟类型

         nodeMap[node.id] = node;
         node.selectable = true; //非虚拟节点可选

         if (node.Data)
             for (var i = 0; i < node.Data.length; i++) {
                 pushToNodeMap(node.Data[i]);
             }
     }

     var childMap = {};
     var nodeMap = {};
     var getChild = function (id) {
         var deferred = $q.defer();
         var promise = deferred.promise;
         if (!childMap[id])
             $sysapi.post({
                 method: 'POST',
                 url: "/Sys/SysArea/GetTreeAsync",
                 data: { node: id, _dc: Math.random() }
             })
                 .success(function (data) {

                     var result = data.Data;
                     deferred.resolve(result);
                     childMap[id] = data.Data;
                     for (var i = 0; i < data.Data.length; i++) {
                         pushToNodeMap(data.Data[i]);

                     }
                 });
         else {
             setTimeout(function () {
                 deferred.resolve(childMap[id]);
             })
         }
         return promise;
     };

     var getUserAllTree = function () {
         var deferred = $q.defer();
         var promise = deferred.promise;
         if (!childMap["self"])
             $sysapi.post({
                 method: 'POST',
                 url: "/Sys/SysArea/GetTreeAsync",
                 data: { ischecked: true, _dc: Math.random() }
             })
                 .success(function (data) {
                     var result = data.Data;
                     deferred.resolve(result);
                     childMap["self"] = data.Data;
                     //childMap[data.Data.id] = data.Data.Data;
                     //nodeMap[data.Data.id] = data.Data;
                     for (var i = 0; i < data.Data.length; i++) {
                         pushToNodeMap(data.Data[i]);
                         childMap[data.Data[i].id] = data.Data[i].Data;
                     }
                 });
         else {
             setTimeout(function () {
                 deferred.resolve(childMap["self"]);
             })
         }
         return promise;
     };
     var getNodeById = function (id) {
         return nodeMap[id];
     };
     var getVirtualNode = function (nodeid) {
         //如果该节点父级是虚拟节点的话根据父节点的id和虚拟类型到nodeMap中找虚拟节点
         return getNodeById(nodeid);
     }
     var getParentByNode = function (node) {
         if (typeof (node) == "undefined")
             return undefined;
         return getNodeById(node.attributes.ParentID);
     };



     return {
         getChild: getChild,
         getUserAllTree: getUserAllTree, //根据当前用户获取所有节点
         getNodeById: getNodeById,
         getParentByNode: getParentByNode,
         getVirtualNode: getVirtualNode
     };
 }]);;;;;