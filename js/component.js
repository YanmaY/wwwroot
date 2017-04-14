/**
 * Created by yaolei on 2016/4/7.
 */

angular.module("honzh.dictionary", ['honzh.popbox', 'treeControl'])
    .directive("dictionaryTree", ['$compile', '$popbox', '$position', '$templateCache', '$DataDictionaryItem', '$parse', '$timeout',
        function ($compile, $popbox, $position, $templateCache, $DataDictionaryItem, $parse) {
            return {
                restrict: 'EA',
                scope: {
                    templateUrl: "=?",
                    selected: "=?",
                    selectedNodes: "=?",
                    ngBind: "=?",
                    multi: "=?",
                    hideCode: "=?"
                },
                controller: ['$scope', '$element', '$attrs', '$q',
                    function ($scope, $element, $attrs, $q) {
                        $scope.popoffset = $position.offset($element);
                        $scope.templateUrl = $scope.templateUrl ? $scope.templateUrl : "dictionarytree.html";
                        $scope.open = function ($event) {
                            $popbox.popbox({
                                templateUrl: $scope.templateUrl,
                                //width: $scope.popoffset.width,
                                maxHeight: 600
                            }).open($event, $scope);
                        };
                        var hideCodeList = $scope.hideCode ? $scope.hideCode.split(",") : [];

                        $scope.init = function () {
                            $DataDictionaryItem.getTreeDitByGroupCode($scope.dictionaryTree.Group).then(function (result) {
                                var showDicList = angular.copy(result);
                                function clearHideCode(dicList, hideCode) {
                                    if (angular.isDefined(dicList))
                                        for (var i = 0; i < dicList.length; i++) {
                                            if (isHide(dicList[i], hideCode)) {
                                                dicList.splice(i, 1);
                                                i--;
                                                continue;
                                            }
                                            clearHideCode(dicList[i].Data, hideCode);
                                        }
                                }
                                function isHide(node, hideCode) {
                                    for (var i = 0; i < hideCode.length; i++) {
                                        if (hideCode[i] == node.id)
                                            return true;
                                    }
                                    return false;
                                }
                                clearHideCode(showDicList, hideCodeList);
                                $scope.diclist = showDicList;
                                if ($scope.multi == true) {
                                    if ($scope.selectedStr)
                                        $scope.selectedNodes = $scope.selectedStr.split(",");
                                    else
                                        $scope.selectedNodes = [];
                                    $DataDictionaryItem.getItems({ ItemCode: $scope.selectedNodes })
                                        .then(function (result) {
                                            $scope.selectedNodes = result;
                                            $scope.expandedNodes = [];
                                            var expandMap = {};
                                            for (var i = 0; i < $scope.selectedNodes.length; i++) {
                                                $scope.selectedNodes[i] = {
                                                    id: $scope.selectedNodes[i].ItemCode,
                                                    attributes: $scope.selectedNodes[i]
                                                };

                                                var path = $scope.selectedNodes[i].id;
                                                while ($scope.selectedNodes && path != "" && path != undefined && path.length > 8) {
                                                    path = path.substring(0, path.length - 4);
                                                    if (typeof (expandMap[path]) == "undefined") {
                                                        var item = $DataDictionaryItem.getExpandTreeNode(path);
                                                        expandMap[path] = item;
                                                    }
                                                }
                                            }
                                            for (var n in expandMap) {
                                                $scope.expandedNodes.push(expandMap[n]);
                                            }
                                            $setBindValue($scope.$parent, $scope.selectedNodes);
                                        });
                                }
                                else {
                                    if (typeof ($scope.selectedId) != "undefined") {
                                        $DataDictionaryItem.getItem({ ItemCode: $scope.selectedId })
                                            .then(function (result) {
                                                $scope.selected = {
                                                    id: result.ItemCode,
                                                    attributes: result
                                                };
                                                var path = $scope.selected ? $scope.selected.attributes.ItemCode : "";
                                                $scope.expandedNodes = [];
                                                while ($scope.selected && path != "" && path != undefined && path.length > 8) {
                                                    path = path.substring(0, path.length - 4);
                                                    var item = $DataDictionaryItem.getExpandTreeNode(path);
                                                    $scope.expandedNodes.push(item);
                                                }
                                                $setBindValue($scope.$parent, $scope.selected.attributes);
                                            });
                                    }
                                }
                            });
                            $scope.opts = {
                                nodeChildren: "Data",
                                multiSelection: $scope.multi,
                                isLeaf: function (node) {
                                    return node.leaf;
                                },
                                injectClasses: {},
                                isSelectable: function (node) {
                                    return node.attributes.IsSelected == 1;
                                },
                                equality: function (node1, node2) {
                                    return node1 && node2 && node1.id == node2.id;
                                }
                            };

                        };
                        $scope.getItem = function () {
                            var deferred = $q.defer();
                            var promise = deferred.promise;
                            if (typeof ($scope.selectedId) == "undefined") {
                                $scope.selected = {};
                                setTimeout(function () {
                                    deferred.resolve($scope.selected);
                                });
                            }
                            else
                                $DataDictionaryItem.getItem({ ItemCode: $scope.selectedId })
                                    .then(function (result) {
                                        $scope.selected = {
                                            id: result.ItemCode,
                                            attributes: result
                                        };
                                        var path = $scope.selected.attributes ? $scope.selected.attributes.ItemCode : "";
                                        $scope.expandedNodes = [];
                                        while ($scope.selected && path != "" && path != undefined && path.length > 8) {
                                            path = path.substring(0, path.length - 4);
                                            var node = $DataDictionaryItem.getExpandTreeNode(path);
                                            $scope.expandedNodes.push(node);
                                        }
                                        deferred.resolve($scope.selected);
                                    });
                            return promise;
                        }
                        if ($attrs.dictionaryTree.indexOf("{{") >= 0 && $attrs.dictionaryTree.indexOf("}}") >= 0) {
                            var watchStr = $attrs.dictionaryTree.replace("{{", "").replace("}}", "");
                            $scope.$parent.$watch(watchStr, function (newValue, oldValue) {
                                if (newValue != oldValue) {
                                    $scope.dictionaryTree = newValue;
                                    $scope.init();
                                }
                            });
                        }
                        var ngBind = $parse($attrs.ngBind);
                        $scope.$parent.$watch($attrs.ngBind, function (newValue, oldValue) {
                            if ($scope.multi == true) {
                                $scope.selectedStr = ngBind.bind()($scope.$parent);
                            }
                            else {
                                $scope.selectedId = ngBind.bind()($scope.$parent);
                                $scope.getItem().then(function (result) {
                                    if ($scope.selected.attributes)
                                        $element.val($scope.selected.attributes.ItemName);
                                    else
                                        $element.val("");
                                });
                            }
                        });
                        var invokeBindSetter = $parse($attrs.ngBind + '($$$p)');
                        var $setBindValue = function (scope, newValue) {
                            if ($scope.multi == true) {
                                var nameList = [];
                                var codeList = [];
                                for (var i = 0; i < newValue.length; i++) {
                                    nameList.push(newValue[i].attributes.ItemName);
                                    codeList.push(newValue[i].attributes.ItemCode);
                                }
                                var code = codeList.join(",");
                                var name = nameList.join(",");
                                if (angular.isFunction(ngBind($scope))) {
                                    return invokeBindSetter(scope, { $$$p: code });
                                }
                                $element.val(name);
                                return ngBind.assign(scope, code);
                            }
                            else {
                                if (angular.isFunction(ngBind($scope))) {
                                    return invokeBindSetter(scope, { $$$p: newValue.ItemCode });
                                }
                                $element.val(newValue.ItemName);
                                return ngBind.assign(scope, newValue.ItemCode);
                            }
                        };
                        var onSelectCallback = $parse($attrs.onSelected);

                        $scope.select = function (node) {
                            //if (node.attributes.IsSelected != 1) {//如果该节点不可被选中则直接返回。
                            //    for (var i = 0; i < $scope.selectedNodes.length; i++) {
                            //        if ($scope.selectedNodes[i].id == node.id) {
                            //            $scope.selectedNodes.split(i, 1);
                            //            i--;
                            //        }
                            //    }
                            //   $scope.selected==null;
                            //    return;
                            //}
                            if ($scope.multi == true) {
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selectedNodes)))
                                    onSelectCallback($scope.$parent, $scope.selected)($scope.selectedNodes);
                                $setBindValue($scope.$parent, $scope.selectedNodes);
                            }
                            else {
                                $scope.selected = node;
                                $scope.popbox_close();
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selected.attributes)))
                                    onSelectCallback($scope.$parent, $scope.selected.attributes)($scope.selected.attributes);
                                $setBindValue($scope.$parent, $scope.selected.attributes);
                            }
                        }

                        $scope.clear = function () {
                            ngBind.assign($scope.$parent, "");
                            $element.val("");
                        }
                    }
                ],
                compile: function (element, attrs, childTranscludeFn) {
                    $templateCache.put("dictionarytree.html",
                        "<div class='input-group'>\
                            <input type='text' class='form-control' placeholder='输入名称可以过滤' ng-model='predicate'/>\
                            <span ng-click='clear()' class='pointer input-group-addon' id='basic-addon2'>清除</span>\
                        </div>\
                        <div>\
                            <treecontrol class='tree-classic' filter-expression='predicate' item-code='itemCodeFilter' filter-comparator='false' options='opts' tree-model='diclist' on-selection='select(node)' expanded-nodes='expandedNodes' selected-node='selected' selected-nodes='selectedNodes'>\
                                <span id='tree_{{node.id}}'>{{node.text}}</span>\
                            </treecontrol>\
                        </div>");
                    return function ($scope, element, attrs, treemodelCntr) {
                        if (attrs.itemCode)
                            $scope.itemCodeFilter = { id: attrs.itemCode };
                        element.on("click", $scope.open);
                        $scope.dictionaryTree = $scope.$eval(attrs["dictionaryTree"]);
                        $scope.init();
                    }
                }
                //compile: function (element, attrs, childTranscludeFn) {
                //$templateCache.put("dictionarytree.html",
                //    "<div><input type='text' class='form-control' placeholder='输入名称可以过滤' ng-model='predicate'/></div><div><treecontrol class='tree-classic' filter-expression='predicate' filter-comparator='false' options='opts' tree-model='diclist' on-selection='select(node)' expanded-nodes='expandedNodes' selected-node='selected' selected-nodes='selectedNodes'><span id='tree_{{node.id}}'>{{node.text}}</span></treecontrol></div>");
                //    return function ($scope, element, attrs, treemodelCntr) {
                //        element.on("click", $scope.open);
                //        $scope.dictionaryTree = $scope.$eval(attrs["dictionaryTree"]);
                //        $scope.init();
                //    }
                //}
            }
        }])
    .directive("dictionaryList", ['$compile', '$popbox', '$position', '$templateCache', '$DataDictionaryItem', '$parse',
        function ($compile, $popbox, $position, $templateCache, $DataDictionaryItem, $parse) {
            return {
                restrict: 'A',
                //require: ['ngModel', 'dictionaryList'],
                scope: {
                    onSelected: "=",
                    ngBind: "=",
                    hideCode: "=?",
                    nullValue: "=?"
                },
                //replace: true,
                controller: ['$scope', '$element', '$attrs', '$q', '$templateCache', '$interpolate', 'treeConfig', function ($scope, $element, $attrs, $q, $templateCache, $interpolate, treeConfig) {
                    $scope.selected = {};
                    $scope.selectedId = "";
                    $scope.open = function ($event) {
                        $popbox.popbox({
                            templateUrl: "dictionarylist.html",
                            // width: $element.outerWidth(), // 不设置时为自动宽度
                            maxHeight: 400
                        }).open($event, $scope);
                    }
                    var hideCodeList = $scope.hideCode ? $scope.hideCode.split(",") : [];
                    $scope.opts = {
                        nodeChildren: "Data",
                        isLeaf: function (node) {
                            return true;
                        },
                        isSelectable: function (node) {
                            return node.IsSelected == 1;
                        }
                    };
                    $scope.init = function () {
                        $DataDictionaryItem.getListDicByGroupCode($scope.dictionaryList.Group).then(function (result) {
                            var showDicList = angular.copy(result);
                            function clearHideCode(dicList, hideCode) {
                                if (angular.isDefined(dicList))
                                    for (var i = 0; i < dicList.length; i++) {
                                        if (isHide(dicList[i], hideCode)) {
                                            dicList.splice(i, 1);
                                            i--;
                                            continue;
                                        }
                                    }
                            }
                            function isHide(node, hideCode) {
                                for (var i = 0; i < hideCode.length; i++) {
                                    if (parseInt(hideCode[i]) == node.IntCode)
                                        return true;
                                }
                                return false;
                            }
                            clearHideCode(showDicList, hideCodeList);
                            $scope.diclist = showDicList;
                            $scope.getItem().then(function (result) {
                                if ($scope.selected)
                                    $setModelValue($scope.$parent, $scope.selected)
                            });
                        });
                        //
                        $element.addClass('ng-pristine 【警告：因缺少NG-MODEL这里的CLASS是模拟的故ANGRLARJS的表单验证验证不了这一项】').removeClass('ng-dirty');
                        $scope.setElmClass();
                    }
                    // 模拟表单验证添加的class
                    $scope.setElmClass = function () {
                        if ('' != $element.val()) {
                            $element.addClass('ng-not-empty').removeClass('ng-empty');
                        }
                        if ('' == $element.val()) {
                            $element.addClass('ng-empty').removeClass('ng-not-empty');
                        }
                        if (null != $element.attr('required') && '' != $element.val()) {
                            $element.addClass('ng-valid-required ng-valid').removeClass('ng-invalid-required ng-invalid');
                        }
                        if (null != $element.attr('required') && '' == $element.val()) {
                            $element.addClass('ng-invalid-required ng-invalid').removeClass('ng-valid-required ng-valid');
                        }
                        if (null == $element.attr('required') && '' != $element.val()) {
                            $element.addClass('ng-valid').removeClass('ng-invalid');
                        }
                    }
                    if ($attrs.dictionaryList.indexOf("{{") >= 0 && $attrs.dictionaryList.indexOf("}}") >= 0) {
                        var watchStr = $attrs.dictionaryList.replace("{{", "").replace("}}", "");
                        $scope.$parent.$watch(watchStr, function (newValue, oldValue) {
                            if (newValue != oldValue) {
                                $scope.dictionaryList = newValue;
                                $scope.init();
                            }
                        });
                    }
                    $scope.getItem = function () {
                        var deferred = $q.defer();
                        var promise = deferred.promise;
                        $DataDictionaryItem.getItem({ group: $scope.dictionaryList.Group, IntCode: $scope.selectedId })
                            .then(function (item) {
                                $scope.selected = item;
                                deferred.resolve($scope.selected);
                            });
                        return promise;
                    }
                    var ngBind = $parse($attrs.ngBind);
                    $scope.selectedId = ngBind.bind()($scope.$parent);
                    var invokeModelSetter = $parse($attrs.ngBind + '($$$p)');
                    $scope.$parent.$watch($attrs.ngBind, function (newValue, oldValue) {


                        if (newValue && newValue != oldValue) {
                            if (!$scope.selectedId) {
                                $scope.selectedId = ngBind.bind()($scope.$parent);
                                $scope.getItem().then(function (result) {
                                    if ($scope.selected)
                                        $element.val($scope.selected.ItemName);
                                    else
                                        $element.val("");
                                });
                            }
                            if (!$scope.selected || !$scope.selected.IntCode || $scope.selectedId != newValue) {
                                $scope.selectedId = newValue;
                                $scope.getItem().then(function (result) {
                                    if (result)
                                        $element.val(result.ItemName);
                                    else
                                        $element.val("");
                                });
                            }
                            //
                            $element.addClass('ng-dirty').removeClass('ng-pristine');
                            $scope.setElmClass();
                        }
                        if (typeof (newValue) == "undefined") {
                            $scope.selectedId = "";
                            $scope.selected = undefined;
                            $element.val("");
                        }
                    });
                    var $setModelValue = function (scope, newValue) {
                        if (angular.isFunction(ngBind($scope))) {
                            return invokeModelSetter(scope, { $$$p: newValue.IntCode });
                        }
                        $element.val(newValue.ItemName);
                        return ngBind.assign(scope, newValue.IntCode);
                    };

                    var onSelectCallback = $parse($attrs.onSelected);
                    $scope.select = function (node) {
                        $scope.selected = node;
                        $scope.selectedId = node.IntCode;
                        if (angular.isFunction(onSelectCallback($scope.$parent, node)))
                            onSelectCallback($scope.$parent, node)(node);
                        $setModelValue($scope.$parent, node);
                        $scope.popbox_close();
                    }
                    $scope.clear = function () {
                        ngBind.assign($scope.$parent, $scope.nullValue);
                        $element.val("");
                    }
                }],
                compile: function (element, attrs, childTranscludeFn) {
                    $templateCache.put("dictionarylist.html", '\
                        <button class="form-control" type="button" ng-click="clear()">清除</button>\
                        <treecontrol class="tree-classic" options="opts" tree-model="diclist" on-selection="select(node)" expanded-nodes="expandedNodes" selected-node="selected">{{node.ItemName}}</treecontrol>')
                    return function (scope, element, attrs, treemodelCntr) {
                        scope.popoffset = $position.offset(element);
                        scope.dictionaryList = scope.$eval(attrs["dictionaryList"]);
                        element.on("click", scope.open);
                        scope.init();
                    }
                }
            }
        }])
    .directive("organizationDictionary", ['$compile', '$popbox', '$position', '$templateCache', '$DataDictionaryItem', '$parse',
        function ($compile, $popbox, $position, $templateCache, $DataDictionaryItem, $parse) {
            return {
                restrict: 'A',
                scope: {
                    onSelected: "=",
                    ngBind: "="
                },
                replace: true,
                controller: ['$scope', '$element', '$attrs', '$q', '$templateCache', '$interpolate', 'treeConfig', function ($scope, $element, $attrs, $q, $templateCache, $interpolate, treeConfig) {
                    $scope.selected = {};
                    $scope.selectedId = "";
                    $scope.open = function ($event) {
                        $popbox.popbox({
                            templateUrl: "dictionarylist.html",
                            width: $element.outerWidth(),
                            maxHeight: 400
                        }).open($event, $scope);
                    }
                    $scope.opts = {
                        nodeChildren: "Data",
                        isLeaf: function (node) {
                            return true;
                        }
                    };
                    $scope.init = function () {
                        $DataDictionaryItem.getOrganizationListDicByGroupCode($scope.dictionaryList.Group).then(function (result) {
                            $scope.diclist = result;
                            $scope.getItem().then(function (result) {
                                if ($scope.selected)
                                    $setModelValue($scope.$parent, $scope.selected)
                            });
                        });
                    }
                    $scope.getItem = function () {
                        var deferred = $q.defer();
                        var promise = deferred.promise;
                        $DataDictionaryItem.getItem({ group: $scope.dictionaryList.Group, IntCode: $scope.selectedId })
                            .then(function (item) {
                                $scope.selected = item;
                                deferred.resolve($scope.selected);
                            });
                        return promise;
                    }
                    var ngBind = $parse($attrs.ngBind);
                    $scope.selectedId = ngBind.bind()($scope.$parent);
                    var invokeModelSetter = $parse($attrs.ngBind + '($$$p)');
                    $scope.$parent.$watch($attrs.ngBind, function (newValue, oldValue) {


                        if (newValue && newValue != oldValue) {
                            if (!$scope.selectedId) {
                                $scope.selectedId = ngBind.bind()($scope.$parent);
                                $scope.getItem().then(function (result) {
                                    if ($scope.selected)
                                        $element.val($scope.selected.ItemName);
                                    else
                                        $element.val("");
                                });
                            }
                            if (!$scope.selected || !$scope.selected.IntCode || $scope.selectedId != newValue) {
                                $scope.selectedId = newValue;
                                $scope.getItem().then(function (result) {
                                    if (result)
                                        $element.val(result.ItemName);
                                    else
                                        $element.val("");
                                });
                            }
                        }
                        if (typeof (newValue) == "undefined") {
                            $scope.selectedId = "";
                            $scope.selected = undefined;
                            $element.val("");
                        }
                    });
                    var $setModelValue = function (scope, newValue) {
                        if (angular.isFunction(ngBind($scope))) {
                            return invokeModelSetter(scope, { $$$p: newValue.IntCode });
                        }
                        $element.val(newValue.ItemName);
                        return ngBind.assign(scope, newValue.IntCode);
                    };

                    var onSelectCallback = $parse($attrs.onSelected);
                    $scope.select = function (node) {
                        $scope.selected = node;
                        $scope.selectedId = node.IntCode;
                        if (angular.isFunction(onSelectCallback($scope.$parent, node)))
                            onSelectCallback($scope.$parent, node)(node);
                        $setModelValue($scope.$parent, node);
                        $scope.popbox_close();
                    }
                }],
                compile: function (element, attrs, childTranscludeFn) {
                    $templateCache.put("dictionarylist.html", "<treecontrol class='tree-classic' options='opts' tree-model='diclist' on-selection='select(node)' expanded-nodes='expandedNodes' selected-node='selected'>{{node.ItemName}}</treecontrol>")
                    return function (scope, element, attrs, treemodelCntr) {
                        scope.popoffset = $position.offset(element);
                        scope.dictionaryList = scope.$eval(attrs["organizationDictionary"]);
                        element.on("click", scope.open);
                        scope.init();
                    }
                }
            }
        }])
    .directive("dictionary", ['$DataDictionaryItem', function ($DataDictionaryItem) {
        return {
            restrict: 'A',
            scope: {
                group: "=",
                ngModel: "=",
                multi: "="
            },
            replace: true,
            link: function (scope, element, attrs) {
                var option =
                {
                    group: scope.group
                };

                function show() {
                    if (attrs["dictionary"] == "tree") {
                        option.ItemCode = scope.ngModel;
                        if (!option.ItemCode) {
                            element.html("");
                            return;
                        }
                    }
                    else {
                        option.IntCode = scope.ngModel;
                        if (!option.IntCode) {
                            element.html("");
                            return;
                        }
                    }
                    if (scope.multi == true) {
                        if (typeof (option.ItemCode) == "undefined") {
                            element.html("");
                            return;
                        }
                        option.ItemCode = option.ItemCode.split(",");
                        $DataDictionaryItem.getItems(option).then(function (result) {
                            var nameList = [];
                            for (var i = 0; i < result.length; i++) {
                                nameList.push(result[i].ItemName);
                            }
                            var name = nameList.join(",");
                            if (result)
                                element.html(name);
                            else
                                element.html("");
                        });
                    }
                    else
                        $DataDictionaryItem.getItem(option).then(function (result) {
                            if (result)
                                element.html(result.ItemName);
                            else
                                element.html("");
                        });
                }

                scope.$parent.$watch(attrs.ngModel, function (newValue, oldValue) {
                    show();
                });
            }
        }
    }]);
angular.module("honzh.organization", [])
    .directive("sysOrganization", ['$SysOrganization', '$compile', function ($SysOrganization, $compile) {
        return {
            restrict: 'A',
            priority: 100,
            controller: function ($scope, $parse, $attrs) {
                $scope.countType = $attrs["countType"];
                $scope.showToggle = function (node) {
                    if (node.id != "" && node.id != null && typeof (node.Data) == "undefined") {
                        node.IsLoad = true;
                        $SysOrganization.getChild(node.id, $scope.countType).then(function (result) {
                            node.Data = result;
                            node.IsLoad = false;
                        });
                    }
                };
                function isRoot(node) {
                    var parent = $SysOrganization.getParentByNode(node);
                    if (parent)
                        return false;
                    return true;
                }
                $scope.getNodeClass = function (node) {
                    if (node.attributes) {
                        if (isRoot(node))
                            return "icon org"
                        if (node.attributes.OrganizationName) {
                            return "icon flag";
                        }
                    }
                    else {
                        if (node.Data)
                            return "icon folder";
                        else
                            return "icon person";
                    }

                }
                $scope.expandedNodes = [];
                $scope.setDefaultOrganization = function (node, defaultOrganizationCode) {
                    if (node && node.id != "" && node.id != null && typeof (node.Data) == "undefined") {
                        if (defaultOrganizationCode.indexOf(node.attributes.OrganizationCode) == 0 &&
                            defaultOrganizationCode != node.attributes.OrganizationCode) {
                            $scope.expandedNodes.push(node);
                            node.IsLoad = true;
                            $SysOrganization.getChild(node.id, $scope.countType).then(function (result) {
                                node.Data = result;
                                node.IsLoad = false;
                                for (var i = 0; i < node.Data.length; i++) {
                                    if (node.Data[i].attributes.ID)
                                        $scope.setDefaultOrganization(node.Data[i], defaultOrganizationCode);
                                    else {
                                        for (var j = 0; j < node.Data[i].Data.length; j++) {
                                            if (defaultOrganizationCode.indexOf(node.Data[i].Data[j].attributes.OrganizationCode) == 0 &&
                           defaultOrganizationCode != node.Data[i].Data[j].attributes.OrganizationCode) {
                                                $scope.expandedNodes.push(node.Data[i]);
                                                $scope.setDefaultOrganization(node.Data[i].Data[j], defaultOrganizationCode);
                                            }
                                        }
                                    }
                                }
                            });
                        }

                        if (defaultOrganizationCode == node.attributes.OrganizationCode)
                            $scope.selectedNode = node;
                    }
                };

                $SysOrganization.getChild(null, $scope.countType).then(function (result) {
                    $scope.orgnizationList = result;
                    if ($attrs["default"]) {
                        if ($scope[$attrs["default"]]) {
                            //如果default已经被设置则直接执行设置默认节点操作
                            for (var i = 0; i < $scope.orgnizationList.length; i++) {
                                $scope.setDefaultOrganization($scope.orgnizationList[i], $scope[$attrs["default"]]);
                            }
                        }
                        else {
                            //如果default还没有被设置，则进行监视
                            $scope.$watch($attrs["default"], function (newValue, oldValue) {
                                if (!angular.isUndefined(newValue)) {
                                    for (var i = 0; i < $scope.orgnizationList.length; i++) {
                                        $scope.setDefaultOrganization($scope.orgnizationList[i], newValue);
                                    }
                                }
                            });
                        }
                    }
                    if (result.length > 0 && $scope.expandedNodes.length == 0) {
                        $scope.expandedNodes.push(result[0]);
                        $scope.showToggle(result[0]);
                    }
                });
            },
            compile: function (element, attrs) {
                attrs["onNodeToggle"] = "showToggle(node)";
                return function ($scope) {
                }
            }
        };
    }])
    .directive("organizationTree", ['$SysOrganization', '$popbox', '$position', '$templateCache', '$parse', '$timeout',
        function ($SysOrganization, $popbox, $position, $templateCache, $parse, $timeout) {
            return {
                restrict: 'EA',
                scope: {
                    templateUrl: "=?",
                    selected: "=?",
                    selectedNodes: "=?",
                    multi: "=?",
                    organizationId: "=",
                    root: "=",
                    isSelectable: "=?",
                    full: "=?"
                },
                controller: ['$scope', '$element', '$attrs', '$templateCache', '$interpolate', 'treeConfig', '$location', '$anchorScroll',
                    function ($scope, $element, $attrs, $templateCache, $interpolate, treeConfig, $location, $anchorScroll) {
                        $scope.popoffset = $position.offset($element);
                        $scope.templateUrl = $scope.templateUrl ? $scope.templateUrl : "organizationtree.html";
                        $scope.open = function ($event) {
                            $popbox.popbox({
                                templateUrl: $scope.templateUrl,
                                width: $scope.popoffset.width,
                                maxHeight: 600
                            }).open($event, $scope);
                        };
                        $scope.getSelectedNode = function () {
                            if (typeof ($scope.selectedId) != "undefined" && $scope.selectedId != "" && $scope.selectedId != null) {
                                $scope.selected = $SysOrganization.getNodeById($scope.selectedId);
                                $scope.expandedNodes = [];
                                var currentNode = $scope.selected;
                                do {
                                    if (currentNode.attributes.OrganizationVirtualType) {
                                        var virtualNode = $SysOrganization.getVirtualNode(currentNode.attributes.ParentID + "_" + currentNode.attributes.OrganizationVirtualType);
                                        $scope.expandedNodes.push(virtualNode);
                                    }
                                    currentNode = $SysOrganization.getParentByNode(currentNode);
                                    if (typeof (currentNode) == "undefined")
                                        break;
                                    $scope.expandedNodes.push(currentNode);
                                } while (currentNode)
                            }
                        }
                        $scope.getSelectedNodes = function () {
                            if (typeof ($scope.selectedStr) != "undefined") {
                                var list = $scope.selectedStr.split(",");
                                for (var i = 0; i < list.length; i++) {
                                    list[i] = $SysOrganization.getNodeById(list[i]);
                                }
                            }
                        }
                        $scope.selectable = function (node) {
                            if ($scope.isSelectable) {
                                if (angular.isFunction(isSelectableCallback($scope.$parent, node)))
                                    return isSelectableCallback($scope.$parent, node)(node);
                            }
                            else
                                return true;
                        };
                        $scope.init = function () {
                            if ($scope.root == -1)
                                $SysOrganization.getChildFromServer(1).then(function (result) {
                                    $scope.orgList = result;
                                    if ($scope.multi == true) {
                                        $scope.getSelectedNodes();
                                        $setBindValue($scope.$parent, $scope.selectedNodes);
                                    }
                                    else {
                                        $scope.getSelectedNode();
                                        $setBindValue($scope.$parent, $scope.selected);
                                    }

                                });
                            else
                                $SysOrganization.getUserAllTree().then(function (result) {
                                    $scope.orgList = result;
                                    if ($scope.multi == true) {
                                        $scope.getSelectedNodes();
                                        $setBindValue($scope.$parent, $scope.selectedNodes);
                                    }
                                    else {
                                        $scope.getSelectedNode();
                                        $setBindValue($scope.$parent, $scope.selected);
                                    }

                                });
                            $scope.opts = {
                                nodeChildren: "Data",
                                multiSelection: $scope.multi,
                                isLeaf: function (node) {
                                    if (node.attributes)
                                        return node.attributes.NodeCount == 0;
                                    else return false;
                                },
                                isSelectable: $scope.selectable
                            };

                        };
                        var ngBind = $parse($attrs.ngModel);
                        var ngOrganizationId = $parse($attrs.organizationId);
                        if ($scope.multi == true)
                            $scope.selectedStr = ngOrganizationId.bind()($scope.$parent);
                        else
                            $scope.selectedId = ngOrganizationId.bind()($scope.$parent);
                        var invokeBindSetter = $parse($attrs.ngModel + '($$$p)');
                        var $setBindValue = function (scope, newValue) {
                            if (newValue == undefined) {
                                $element.html("");
                                return ngBind.assign($scope.$parent, undefined);
                            }
                            if (angular.isFunction(ngBind($scope))) {
                                return invokeBindSetter(scope, {
                                    $$$p: newValue.attributes
                                });
                            }
                            if (newValue.attributes)
                                $element.html(newValue.attributes.OrganizationName);
                            else
                                $element.html("");
                            return ngBind.assign($scope.$parent, newValue.attributes);
                        };


                        $scope.$parent.$watch($attrs.organizationId, function (newValue, oldValue) {
                            if (newValue && newValue != oldValue) {
                                if (!$scope.selectedId)
                                    $scope.selectedId = ngBind.bind()($scope.$parent);
                                if (!$scope.selected || $scope.selectedId != newValue) {
                                    if ($scope.multi == true)
                                        $scope.selectedStr = newValue;
                                    else {
                                        $scope.selectedId = newValue;
                                        if (!$scope.selected || $scope.selectedId != $scope.selected.id) {
                                            $scope.getSelectedNode();
                                            $element.html($scope.selected.attributes.OrganizationName);
                                        }
                                    }
                                }
                            }
                            if (typeof (newValue) == "undefined") {
                                $scope.selectedId = "";
                                $scope.selected = [];
                                $element.html("");

                            }
                        });
                        var onSelectCallback = $parse($attrs.onSelected);
                        var isSelectableCallback = $parse($attrs.isSelectable);
                        $scope.select = function (node) {
                            if (angular.isUndefined(node.attributes.ID)) //如果是虚拟节点跳出不影响选中事件
                                return;
                            if ($scope.multi == true) {
                                $setBindValue($scope.$parent, $scope.selectedNodes);
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selectedNodes)))
                                    onSelectCallback($scope.$parent, $scope.selected)($scope.selectedNodes);
                            }
                            else {
                                $scope.selected = node;
                                $scope.popbox_close();
                                $setBindValue($scope.$parent, $scope.selected);
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selected)))
                                    onSelectCallback($scope.$parent, $scope.selected)($scope.selected);
                            }
                        }
                        $scope.clear = function () {
                            ngBind.assign($scope.$parent, "");
                            $element.html("");
                        }
                    }],
                compile: function (element, attrs, childTranscludeFn) {
                    $templateCache.put("organizationtree.html",
                        "<div class='input-group'><span ng-click='clear()' class='pointer input-group-addon' id='basic-addon2'>清除</span></div><div><treecontrol class='tree-orgnization' sys-organization tree-model='orgList' filter-expression='predicate' filter-comparator='false' options='opts' on-selection='select(node)' expanded-nodes='expandedNodes' selected-node='selected' selected-nodes='selectedNodes'><span class='{{getNodeClass(node)}}'  aria-hidden='true'></span><span>{{node.text}}{{node.IsLoad?'[加载中...]':''}}</span><is-selected></is-selected></treecontrol></div>");
                    return function ($scope, element, attrs, treemodelCntr) {
                        element.on("click", $scope.open);
                        $scope.init();
                    }
                }
            }
        }])
    .directive("organizationTreeInput", ['$SysOrganization', '$popbox', '$position', '$templateCache', '$parse', '$timeout',
        function ($SysOrganization, $popbox, $position, $templateCache, $parse, $timeout) {
            return {
                restrict: 'EA',
                scope: {
                    templateUrl: "=?",
                    selected: "=?",
                    selectedNodes: "=?",
                    multi: "=?",
                    organizationId: "=",
                    root: "=",
                    isSelectable: "=?",
                    includeHistroy: "=?",
                    full: "=?"
                },
                controller: ['$scope', '$element', '$attrs', '$templateCache', '$interpolate', 'treeConfig', '$location', '$anchorScroll',
                    function ($scope, $element, $attrs, $templateCache, $interpolate, treeConfig, $location, $anchorScroll) {
                        $scope.popoffset = $position.offset($element);
                        $scope.templateUrl = $scope.templateUrl ? $scope.templateUrl : "/v2/template/organizationtree.html";
                        $scope.open = function ($event) {
                            $popbox.popbox({
                                templateUrl: $scope.templateUrl,
                                width: $scope.popoffset.width,
                                maxHeight: 600,
                                minHeight: 200,
                                minWidth: 300
                            }).open($event, $scope);
                        };
                        $scope.getSelectedNode = function () {
                            if (typeof ($scope.selectedId) != "undefined" && $scope.selectedId != "" && $scope.selectedId != null) {
                                $scope.selected = $SysOrganization.getNodeById($scope.selectedId);
                                $scope.expandedNodes = [];
                                var currentNode = $scope.selected;
                                do {
                                    if (currentNode.attributes.OrganizationVirtualType) {
                                        var virtualNode = $SysOrganization.getVirtualNode(currentNode.attributes.ParentID + "_" + currentNode.attributes.OrganizationVirtualType);
                                        $scope.expandedNodes.push(virtualNode);
                                    }
                                    currentNode = $SysOrganization.getParentByNode(currentNode);
                                    if (typeof (currentNode) == "undefined")
                                        break;
                                    $scope.expandedNodes.push(currentNode);
                                } while (currentNode)
                            }
                        }
                        $scope.getSelectedNodes = function () {
                            if (typeof ($scope.selectedStr) != "undefined") {
                                var list = $scope.selectedStr.split(",");
                                for (var i = 0; i < list.length; i++) {
                                    list[i] = $SysOrganization.getNodeById(list[i]);
                                }
                            }
                        }
                        $scope.selectable = function (node) {
                            if ($scope.isSelectable) {
                                if (angular.isFunction(isSelectableCallback($scope.$parent, node)))
                                    return isSelectableCallback($scope.$parent, node)(node);
                            }
                            else
                                return true;
                        };
                        $scope.init = function () {
                            if ($scope.root == -1)
                                $SysOrganization.getChildFromServer(1).then(function (result) {
                                    $scope.orgList = result;
                                    if ($scope.multi == true) {
                                        $scope.getSelectedNodes();
                                        $setBindValue($scope.$parent, $scope.selectedNodes);
                                    }
                                    else {
                                        $scope.getSelectedNode();
                                        $setBindValue($scope.$parent, $scope.selected);
                                    }

                                });
                            else
                                $SysOrganization.getUserAllTree().then(function (result) {
                                    $scope.orgList = result;
                                    if ($scope.multi == true) {
                                        $scope.getSelectedNodes();
                                        $setBindValue($scope.$parent, $scope.selectedNodes);
                                    }
                                    else {
                                        $scope.getSelectedNode();
                                        $setBindValue($scope.$parent, $scope.selected);
                                    }

                                });
                            $scope.opts = {
                                nodeChildren: "Data",
                                multiSelection: $scope.multi,
                                isLeaf: function (node) {
                                    if (node.attributes)
                                        return node.attributes.NodeCount == 0;
                                    else return false;
                                },
                                isSelectable: $scope.selectable
                            };

                        };
                        var ngBind = $parse($attrs.ngModel);
                        var ngOrganizationId = $parse($attrs.organizationId);
                        if ($scope.multi == true)
                            $scope.selectedStr = ngOrganizationId.bind()($scope.$parent);
                        else
                            $scope.selectedId = ngOrganizationId.bind()($scope.$parent);
                        var invokeBindSetter = $parse($attrs.ngModel + '($$$p)');
                        var $setBindValue = function (scope, newValue) {
                            if (newValue == undefined) {
                                return ngBind.assign($scope.$parent, undefined);
                            }
                            if (angular.isFunction(ngBind($scope))) {
                                return invokeBindSetter(scope, {
                                    $$$p: newValue.attributes
                                });
                            }
                            //return ngBind.assign($scope.$parent, newValue.attributes);
                            if (newValue.attributes) {
                                //ngBind.assign($scope.$parent, newValue.attributes.ID);
                                ngBind.assign($scope.$parent, newValue.attributes.OrganizationName);
                            }
                        };


                        $scope.$parent.$watch($attrs.organizationId, function (newValue, oldValue) {
                            if (newValue && newValue != oldValue) {
                                if (!$scope.selectedId)
                                    $scope.selectedId = ngBind.bind()($scope.$parent);
                                if (!$scope.selected || $scope.selectedId != newValue) {
                                    if ($scope.multi == true)
                                        $scope.selectedStr = newValue;
                                    else {
                                        $scope.selectedId = newValue;
                                        if (!$scope.selected || $scope.selectedId != $scope.selected.id) {
                                            $scope.getSelectedNode();
                                            $element.html($scope.selected.attributes.OrganizationName);
                                        }
                                    }
                                }
                            }
                            if (typeof (newValue) == "undefined") {
                                $scope.selectedId = "";
                                $scope.selected = [];
                                $element.html("");

                            }
                        });
                        var onSelectCallback = $parse($attrs.onSelected);
                        var isSelectableCallback = $parse($attrs.isSelectable);
                        $scope.select = function (node) {
                            if (angular.isUndefined(node.attributes.ID)) //如果是虚拟节点跳出不影响选中事件
                                return;
                            if ($scope.multi == true) {
                                $setBindValue($scope.$parent, $scope.selectedNodes);
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selectedNodes)))
                                    onSelectCallback($scope.$parent, $scope.selected)($scope.selectedNodes);
                            }
                            else {
                                $scope.selected = node;
                                $scope.popbox_close();
                                $setBindValue($scope.$parent, $scope.selected);
                                if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selected)))
                                    onSelectCallback($scope.$parent, $scope.selected)($scope.selected);
                            }
                        }
                        $scope.clear = function () {
                            ngBind.assign($scope.$parent, "");
                            $element.html("");
                        }
                        $scope.$watch("inputOrganizationName", function () {
                            beginSearchOrganization();
                        });

                        var beginSearchOrganization = function () {

                            if ($scope.inputOrganizationName && $scope.inputOrganizationName.length > 0) {
                                $SysOrganization.searchOrganization($scope.inputOrganizationName, $scope.includeHistroy)
                                    .then(function (result) {
                                        $scope.searchedOrganizationList = result.Data;
                                        $scope.tm = null;
                                    });
                            }
                            else {

                                $scope.searchedOrganizationList = [];
                            }
                        }

                        //regionend 智能输入部分代码
                    }],
                compile: function (element, attrs, childTranscludeFn) {
                    return function ($scope, element, attrs, treemodelCntr) {
                        element.on("click", $scope.open);
                        $scope.init();
                    }
                }
            }
        }])
    .directive("sysCompany", ['$SysCompany', '$compile', function ($SysCompany, $compile) {
        return {
            restrict: 'A',
            priority: 100,
            controller: function ($scope, $parse, $attrs) {

                $scope.showToggle = function (node) {
                    if (node.id != "" && node.id != null && typeof (node.Data) == "undefined") {
                        node.IsLoad = true;
                        $SysCompany.getChild(node.id).then(function (result) {
                            node.Data = result;
                            node.IsLoad = false;
                        });
                    }
                };
                function isRoot(node) {
                    var parent = $SysCompany.getParentByNode(node);
                    if (parent)
                        return false;
                    return true;
                }

                $scope.getNodeClass = function (node) {
                    if (node.attributes) {
                        if (isRoot(node))
                            return "icon org"
                        if (node.attributes.Name) {
                            return "icon flag";
                        }
                    }
                    else {
                        if (node.Data)
                            return "icon folder";
                        else
                            return "icon person";
                    }

                }
            },
            compile: function (element, attrs) {
                attrs["onNodeToggle"] = "showToggle(node)";
                return function ($scope) {
                    //$SysCompany.getChild(null).then(function (result) {
                    //    $scope.companyList = result;
                    //});
                }
            }
        };
    }])
    .directive("companyTree", ['$SysCompany', '$popbox', '$position', '$templateCache', '$parse', '$timeout',
        function ($SysCompany, $popbox, $position, $templateCache, $parse, $timeout) {
            return {
                restrict: 'EA',
                scope: {
                    templateUrl: "=?",
                    companyId: "="
                },
                controller: ['$scope', '$element', '$attrs', '$templateCache', '$interpolate', 'treeConfig', '$location', '$anchorScroll',
                    function ($scope, $element, $attrs, $templateCache, $interpolate, treeConfig, $location, $anchorScroll) {
                        $scope.popoffset = $position.offset($element);
                        $scope.templateUrl = $scope.templateUrl ? $scope.templateUrl : "companytree.html";
                        $scope.open = function ($event) {
                            $popbox.popbox({
                                templateUrl: $scope.templateUrl,
                                width: $scope.popoffset.width,
                                maxHeight: 600
                            }).open($event, $scope);
                        };
                        $scope.getSelectedNode = function () {
                            if (typeof ($scope.selectedId) != "undefined") {
                                $scope.selected = $SysCompany.getNodeById($scope.selectedId);
                                $scope.expandedNodes = [];
                                var currentNode = $scope.selected;
                                do {
                                    if (currentNode.attributes.OrganizationVirtualType) {
                                        var virtualNode = $SysCompany.getVirtualNode(currentNode.attributes.ParentID + "_" + currentNode.attributes.OrganizationVirtualType);
                                        $scope.expandedNodes.push(virtualNode);
                                    }
                                    currentNode = $SysCompany.getParentByNode(currentNode);
                                    if (typeof (currentNode) == "undefined")
                                        break;
                                    $scope.expandedNodes.push(currentNode);
                                } while (currentNode)
                            }
                        }
                        $scope.getSelectedNodes = function () {
                            if (typeof ($scope.selectedStr) != "undefined") {
                                var list = $scope.selectedStr.split(",");
                                for (var i = 0; i < list.length; i++) {
                                    list[i] = $SysCompany.getNodeById(list[i]);
                                }
                            }
                        }
                        $scope.init = function () {
                            $SysCompany.getUserAllTree().then(function (result) {
                                $scope.companyList = result;
                                $scope.getSelectedNode();
                                $setBindValue($scope.$parent, $scope.selected);
                            });
                            $scope.opts = {
                                nodeChildren: "Data",
                                multiSelection: false,
                                isLeaf: function (node) {
                                    return node.Data == undefined || node.Data == null;
                                }
                            };

                        };
                        var ngBind = $parse($attrs.ngModel);
                        var ngCompanyId = $parse($attrs.companyId);
                        $scope.selectedId = ngCompanyId.bind()($scope.$parent);
                        $scope.companyName = ngBind.bind()($scope.$parent)
                        var invokeBindSetter = $parse($attrs.ngModel + '($$$p)');
                        var $setBindValue = function (scope, newValue) {
                            if (newValue == undefined) {
                                //$element.html("");
                                return;
                                //return ngBind.assign($scope.$parent, undefined);
                            }
                            if (angular.isFunction(ngBind($scope))) {
                                return invokeBindSetter(scope, {
                                    $$$p: newValue.attributes
                                });
                            }
                            $element.val(newValue.attributes.Name);
                            return ngBind.assign($scope.$parent, newValue.attributes.Name);
                        };


                        $scope.$parent.$watch($attrs.companyId, function (newValue, oldValue) {
                            if (newValue && newValue != oldValue) {
                                if (!$scope.selectedId)
                                    $scope.selectedId = ngBind.bind()($scope.$parent);
                                if (!$scope.selected || $scope.selectedId != newValue) {

                                    $scope.selectedId = newValue;
                                    if (!$scope.selected || $scope.selectedId != $scope.selected.id) {
                                        $scope.getSelectedNode();
                                        $element.val($scope.selected.attributes.Name);
                                    }
                                }
                            }
                            if (typeof (newValue) == "undefined") {
                                $element.val($scope.companyName);
                            }
                        });
                        var onSelectCallback = $parse($attrs.onSelected);
                        $scope.select = function (node) {
                            $scope.selected = node;
                            $scope.predicate = node.text;
                            //$scope.popbox_close();
                        }
                        $scope.ok = function () {
                            var companyName = $scope.predicate;
                            if ($scope.selected && $scope.selected.text === companyName) {
                            }
                            else {
                                var selectedCompanyNode = findCompanyName(companyName, $scope.companyList);
                                if (selectedCompanyNode)
                                    $scope.selected = selectedCompanyNode;
                                else
                                    $scope.selected = { attributes: { Name: companyName } };
                            }
                            if (angular.isFunction(onSelectCallback, $scope.$parent, $scope.selected))
                                onSelectCallback($scope.$parent, { node: $scope.selected });

                            $element.val(companyName);
                            $scope.popbox_close();
                        }
                        function findCompanyName(cname, nodeList) {
                            for (var i = 0; i < nodeList.length; i++) {
                                var node = nodeList[i];
                                if (node.text === cname) {
                                    return node;
                                }
                                else if (node.Data) {
                                    return findCompanyName(cname, node.Data);
                                }
                            }
                        }
                    }],
                compile: function (element, attrs, childTranscludeFn) {
                    $templateCache.put("companytree.html",
                        "<div class='input-group' style='width:600px' ><input type='text' class='form-control' placeholder='输入名称可以过滤' ng-model='predicate'/> <span class='input-group-addon' ng-click='ok()'>确定</span></div><div ><treecontrol class='tree-orgnization' sys-company tree-model='companyList' filter-expression='predicate' filter-comparator='false' options='opts'  expanded-nodes='expandedNodes' on-selection='select(node)' selected-node='selected' selected-nodes='selectedNodes'><span class='{{getNodeClass(node)}}'  aria-hidden='true'></span><span>{{node.text}}{{node.IsLoad?'[加载中...]':''}}</span><is-selected></is-selected></treecontrol></div>");
                    return function ($scope, element, attrs, treemodelCntr) {
                        element.on("click", $scope.open);
                        $scope.init();
                    }
                }
            }
        }])
.directive("sysArea", ['$SysArea', '$compile', function ($SysArea, $compile) {
    return {
        restrict: 'A',
        priority: 100,
        controller: function ($scope, $parse, $attrs) {
            //$scope.countType = $attrs["countType"];
            $scope.showToggle = function (node) {
                if (node.id != "" && node.id != null && typeof (node.Data) == "undefined") {
                    node.IsLoad = true;
                    $SysArea.getChild(node.id).then(function (result) {
                        node.Data = result;
                        node.IsLoad = false;
                    });
                }
            };
            function isRoot(node) {
                var parent = $SysArea.getParentByNode(node);
                if (parent)
                    return false;
                return true;
            }

            $scope.expandedNodes = [];
            $scope.setDefaultArea = function (node, defaultAreaCode) {

                if (node && node.id != "" && node.id != null && typeof (node.Data) == "undefined") {
                    if (defaultAreaCode.indexOf(node.attributes.Code) == 0 &&
                        defaultAreaCode != node.attributes.Code) {
                        $scope.expandedNodes.push(node);
                        node.IsLoad = true;
                        $SysArea.getChild(node.id).then(function (result) {
                            node.Data = result;
                            node.IsLoad = false;
                            for (var i = 0; i < node.Data.length; i++) {
                                if (node.Data[i].attributes.ID)
                                    $scope.setDefaultArea(node.Data[i], defaultAreaCode);
                                else {
                                    for (var j = 0; j < node.Data[i].Data.length; j++) {
                                        if (defaultAreaCode.indexOf(node.Data[i].Data[j].attributes.Code) == 0 &&
                       defaultAreaCode != node.Data[i].Data[j].attributes.Code) {
                                            $scope.expandedNodes.push(node.Data[i]);
                                            $scope.setDefaultArea(node.Data[i].Data[j], defaultAreaCode);
                                        }
                                    }
                                }
                            }
                        });
                    }

                    if (defaultAreaCode == node.attributes.Code)
                        $scope.selectedNode = node;
                }
            };

            $SysArea.getChild(null).then(function (result) {
                $scope.areaList = result;

                if ($attrs["default"]) {
                    if ($scope[$attrs["default"]]) {
                        //如果default已经被设置则直接执行设置默认节点操作
                        for (var i = 0; i < $scope.areaList.length; i++) {
                            $scope.setDefaultArea($scope.areaList[i], $scope[$attrs["default"]]);
                        }
                    }
                    else {
                        //如果default还没有被设置，则进行监视
                        $scope.$watch($attrs["default"], function (newValue, oldValue) {
                            if (!angular.isUndefined(newValue)) {
                                for (var i = 0; i < $scope.areaList.length; i++) {
                                    $scope.setDefaultArea($scope.areaList[i], newValue);
                                }
                            }
                        });
                    }
                }
            });
        },
        compile: function (element, attrs) {
            attrs["onNodeToggle"] = "showToggle(node)";
            return function ($scope) {
            }
        }
    };
}])
.directive("areaTree", ['$SysArea', '$popbox', '$position', '$templateCache', '$parse', '$timeout',
      function ($SysArea, $popbox, $position, $templateCache, $parse, $timeout) {
          return {
              restrict: 'EA',
              scope: {
                  templateUrl: "=?",
                  selected: "=?",
                  selectedNodes: "=?",
                  // multi: "=?",
                  areaId: "=",
                  // root: "=",
                  isSelectable: "=?",
                  full: "=?"
              },
              controller: ['$scope', '$element', '$attrs', '$templateCache', '$interpolate', 'treeConfig', '$location', '$anchorScroll',
                  function ($scope, $element, $attrs, $templateCache, $interpolate, treeConfig, $location, $anchorScroll) {
                      $scope.popoffset = $position.offset($element);
                      $scope.templateUrl = $scope.templateUrl ? $scope.templateUrl : "areatree.html";
                      $scope.open = function ($event) {
                          $popbox.popbox({
                              templateUrl: $scope.templateUrl,
                              width: $scope.popoffset.width,
                              maxHeight: 600
                          }).open($event, $scope);
                      };
                      $scope.getSelectedNode = function () {
                          if (typeof ($scope.selectedId) != "undefined" && $scope.selectedId != "" && $scope.selectedId != null) {
                              $scope.selected = $SysArea.getNodeById($scope.selectedId);
                              $scope.expandedNodes = [];
                              var currentNode = $scope.selected;
                              do {
                                  //if (currentNode.attributes.City == '市辖区' || currentNode.attributes.City == '县') {
                                  //    var virtualNode = $SysArea.getVirtualNode(currentNode.attributes.ParentID + "_" + currentNode.attributes.ID);
                                  //    $scope.expandedNodes.push(virtualNode);
                                  //}
                                  currentNode = $SysArea.getParentByNode(currentNode);
                                  if (typeof (currentNode) == "undefined")
                                      break;
                                  $scope.expandedNodes.push(currentNode);
                              } while (currentNode)
                          }
                      }
                      $scope.getSelectedNodes = function () {
                          if (typeof ($scope.selectedStr) != "undefined") {
                              var list = $scope.selectedStr.split(",");
                              for (var i = 0; i < list.length; i++) {
                                  list[i] = $SysArea.getNodeById(list[i]);
                              }
                          }
                      }
                      $scope.selectable = function (node) {
                          if ($scope.isSelectable) {
                              if (angular.isFunction(isSelectableCallback($scope.$parent, node)))
                                  return isSelectableCallback($scope.$parent, node)(node);
                          }
                          else
                              return true;
                      };
                      $scope.init = function () {
                          //if ($scope.root == -1)
                          //    $SysArea.getChildFromServer(1).then(function (result) {
                          //        $scope.orgList = result;
                          //        if ($scope.multi == true) {
                          //            $scope.getSelectedNodes();
                          //            $setBindValue($scope.$parent, $scope.selectedNodes);
                          //        }
                          //        else {
                          //            $scope.getSelectedNode();
                          //            $setBindValue($scope.$parent, $scope.selected);
                          //        }

                          //    });
                          //else
                          $SysArea.getUserAllTree().then(function (result) {
                              $scope.areaList = result;
                              ////if ($scope.multi == true) {
                              //    $scope.getSelectedNodes();
                              //    $setBindValue($scope.$parent, $scope.selectedNodes);
                              ////}
                              //else {
                              $scope.getSelectedNode();
                              $setBindValue($scope.$parent, $scope.selected);
                              //}

                          });
                          $scope.opts = {
                              nodeChildren: "Data",
                              // multiSelection: $scope.multi,

                              isLeaf: function (node) {

                                  if (node.attributes)
                                      return node.attributes.Count == 0;
                                  else return false;
                              },
                              isSelectable: $scope.selectable
                          };

                      };
                      var ngBind = $parse($attrs.ngModel);
                      var ngAreaId = $parse($attrs.areaId);
                      //if ($scope.multi == true)
                      //    $scope.selectedStr = ngOrganizationId.bind()($scope.$parent);
                      //else
                      $scope.selectedId = ngAreaId.bind()($scope.$parent);
                      var invokeBindSetter = $parse($attrs.ngModel + '($$$p)');
                      var $setBindValue = function (scope, newValue) {
                          if (newValue == undefined) {
                              $element.html("");
                              return ngBind.assign($scope.$parent, undefined);
                          }
                          if (angular.isFunction(ngBind($scope))) {
                              return invokeBindSetter(scope, {
                                  $$$p: newValue.attributes
                              });
                          }
                          if (newValue)
                              $element.html(newValue.text);
                          else
                              $element.html("");
                          return ngBind.assign($scope.$parent, newValue.attributes);
                      };


                      $scope.$parent.$watch($attrs.areaId, function (newValue, oldValue) {
                          if (newValue && newValue != oldValue) {
                              if (!$scope.selectedId)
                                  $scope.selectedId = ngBind.bind()($scope.$parent);
                              if (!$scope.selected || $scope.selectedId != newValue) {
                                  //if ($scope.multi == true)
                                  //    $scope.selectedStr = newValue;
                                  //else {
                                  $scope.selectedId = newValue;
                                  if (!$scope.selected || $scope.selectedId != $scope.selected.id) {
                                      $scope.getSelectedNode();
                                      $element.html($scope.selected.text);
                                  }
                                  // }
                              }
                          }
                          if (typeof (newValue) == "undefined") {
                              $scope.selectedId = "";
                              $scope.selected = [];
                              $element.html("");

                          }
                      });
                      var onSelectCallback = $parse($attrs.onSelected);
                      var isSelectableCallback = $parse($attrs.isSelectable);
                      $scope.select = function (node) {
                          if (node.text == '市辖区' || node.text == '县') //如果是虚拟节点跳出不影响选中事件
                              return;
                          //if ($scope.multi == true) {
                          //    $setBindValue($scope.$parent, $scope.selectedNodes);
                          //    if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selectedNodes)))
                          //        onSelectCallback($scope.$parent, $scope.selected)($scope.selectedNodes);
                          //}
                          //else {
                          $scope.selected = node;
                          $scope.popbox_close();
                          $setBindValue($scope.$parent, $scope.selected);
                          if (angular.isFunction(onSelectCallback($scope.$parent, $scope.selected)))
                              onSelectCallback($scope.$parent, $scope.selected)($scope.selected);

                          //}
                      }
                      $scope.clear = function () {
                          ngBind.assign($scope.$parent, "");
                          $element.html("");
                      }
                  }],
              compile: function (element, attrs, childTranscludeFn) {
                  $templateCache.put("areatree.html",
                      "<div class='input-group'><span ng-click='clear()' class='pointer input-group-addon' id='basic-addon2'>清除</span></div><div><treecontrol class='tree-orgnization' sys-area tree-model='areaList' filter-expression='predicate' filter-comparator='false' options='opts' on-selection='select(node)' expanded-nodes='expandedNodes' selected-node='selected' selected-nodes='selectedNodes'><span>{{node.text}}{{node.IsLoad?'[加载中...]':''}}</span><is-selected></is-selected></treecontrol></div>");
                  return function ($scope, element, attrs, treemodelCntr) {
                      element.on("click", $scope.open);
                      $scope.init();
                  }
              }
          }
      }])
    .directive("popedom", ["$User", function ($User) {
        return {
            restrict: 'A',
            compile: function (element, attr, $scope) {
                return function ($scope, element, attrs, treemodelCntr) {                    
                    var popedomCode = attr["popedom"].split(',');
                    for (var i = 0; i < popedomCode.length; i++) {  // 数组内权限需要全部拥有
                        $User.hasPopedom(popedomCode[i]).then(function (result) {
                            if (result != true) {
                                var replaceText = attr["replaceText"];
                                element.replaceWith(replaceText);
                                //element.remove();
                            }
                        });
                    }
                }
            }
        }
    }])
    // 传入数组内权限，只要拥有任意一个，即可显示
    .directive("popedomArbitrary", ["$User", function ($User) {
        return {
            restrict: 'A',
            compile: function (element, attr, $scope) {
                return function ($scope, element, attrs, treemodelCntr) {
                    var popedomCode = attr["popedomArbitrary"].split(',');
                    var hasPopedom = false;
                    var scaler = 1;
                    for (var i = 0; i < popedomCode.length; i++) {
                        $User.hasPopedom(popedomCode[i]).then(function (result) {
                            if (result == true)
                                hasPopedom = true;

                            if (!hasPopedom && scaler == popedomCode.length) {
                                var replaceText = attr["replaceText"];
                                element.replaceWith(replaceText);
                                //element.remove();
                            }
                            scaler++;
                        });
                    }
                }
            }
        }
    }])
    .directive("fieldAttribute", ["$FieldValidateDefine", "$position", function ($FieldValidateDefine, $position) {
        return {
            restrict: 'A',
            compile: function (element, attr, $scope) {
                return function ($scope, element, attr) {
                    var attribute = attr["fieldAttribute"];
                    $FieldValidateDefine.getFieldValidateType(attribute).then(function (result) {
                        if (result) {
                            if (result.IsRequired == 1) {
                                //element.addClass("label-danger");
                                // 加必填项样式
                            }
                            if (result.IsReportField == 1) {
                                element.addClass("party-report");
                                element.attr("title", "有党徽标记的项为党统需要的信息");
                                element.css('cursor', 'help');
                            }
                            if (attr["validateData"]) {
                                $scope.$watch(attr["validateData"], function (newValue, oldValue) {
                                    var dataValidateList = newValue;
                                    if (dataValidateList) {
                                        var errMsgDomHtml = "";
                                        for (var i = 0; i < dataValidateList.length; i++) {
                                            element.removeClass("data-validate-err");
                                        }
                                        for (var i = 0; i < dataValidateList.length; i++) {
                                            if (dataValidateList[i].FieldValidateID == result.ID) {
                                                element.addClass("data-validate-err");
                                                errMsgDomHtml += "<p>【" + dataValidateList[i].CheckLevelName + "】:" + dataValidateList[i].CheckDescription + "</p>"
                                            }
                                        }
                                        if (errMsgDomHtml != "") {
                                            errMsgDomHtml = "<div class='tooltip top'><div class='tooltip-arrow'></div><div class='tooltip-inner'>" + errMsgDomHtml + "</div>";
                                            var errMsgDom = angular.element(errMsgDomHtml);
                                            element.find('.tooltip.top').remove();
                                            element.append(errMsgDom);
                                            var offset = $position.offset(element);
                                            errMsgDom.css("bottom", offset.height + "px");
                                            errMsgDom.css("left", (offset.width - errMsgDom.width()) / 2 + "px");
                                        }
                                    } else {
                                        element.removeClass("data-validate-err");
                                        element.find('.tooltip.top').remove();
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }
    }])

angular.module("honzh.popbox", ["honzh.position"])
    .provider("$popbox", function () {
        this.$get = ["$document", "$templateCache", "$templateRequest", "$compile", "$rootScope", "$position",
            function ($document, $templateCache, $templateRequest, $compile, $rootScope, $position) {
                function popbox(options) {
                    var _this = this;
                    this.options = angular.extend({}, options);
                    var bodyEl = $document.find("body");
                    var dragAble = this.options.drag == true ? "drag" : "";
                    var resizable = this.options.resizable == true ? " resizable='se'" : ""
                    var dom = angular.element("<div class='popbox' " + dragAble + resizable + "></div>");

                    this.elmentEL = dom;
                    this.handleBackDropClick = function ($event) {
                        for (var element = $event.target, notpopbox = true; element;) {
                            if ($(element).hasClass("popbox")) {
                                notpopbox = !1;
                                break
                            }
                            element = element.parentNode
                        }
                        if (notpopbox)
                            _this.close();
                    };
                    popbox.prototype.close = function () {
                        $document.unbind("mousedown", this.handleBackDropClick);
                        _this.elmentEL.remove();
                    };
                    this.open = function ($event, $scope) {
                        $(".popbox").each(function (ele) {
                            angular.element(this).remove()
                            //$(this).scope().popbox.close();
                        })
                        $templateRequest(options.templateUrl).then(function (html) {
                            dom.append(html);
                            $scope = $scope ? $scope : options.scope;
                            _this.elmentEL.css("overflow", "auto");
                            _this.elmentEL.css("width", _this.options.width ? (isNaN(_this.options.width) ? _this.options.width : (_this.options.width + "px")) : "auto");
                            _this.elmentEL.css("min-width", _this.options.minWidth ? (isNaN(_this.options.minWidth) ? _this.options.minWidth : (_this.options.minWidth + "px")) : $($event.target).outerWidth());
                            _this.elmentEL.css("height", _this.options.height ? _this.options.height + "px" : "auto");
                            _this.elmentEL.css("max-height", (_this.options.maxHeight ? _this.options.maxHeight : 400) + "px");
                            if (_this.options.zIndex)
                                _this.elmentEL.css("z-index", _this.options.zIndex);
                            if (options.screenCenter == true) {
                                bodyEl.append(_this.elmentEL);
                                var top = ($document.height() - _this.elmentEL.height()) / 2;
                                var left = ($document.width() - _this.elmentEL.width()) / 2;
                                top = top < 0 ? 0 : top;
                                left = left < 0 ? 0 : left;

                                _this.elmentEL.css("top", top + "px");
                                _this.elmentEL.css("left", left + "px");
                            }
                            else {
                                var elm = $($event.target);
                                var parent = elm.parent();
                                var offsetLeft = elm.offset().left;
                                var offsetTop = elm.offset().top;
                                var boxWidth = _this.options.width ? _this.options.width : _this.elmentEL.outerWidth();
                                var boxHeight = _this.options.height ? _this.options.height : _this.elmentEL.outerHeight();
                                var btnWidth = elm.outerWidth();
                                var btnHeight = elm.outerHeight();
                                var winWidth = $document.width();
                                var winHeight = $document.height();
                                if (!boxHeight) boxHeight = 400; // css min-height
                                if (offsetLeft + boxWidth > winWidth) {
                                    left = -(boxWidth - btnWidth);
                                } else {
                                    left = 'initial';
                                }
                                // 显式要求“显示在上边”时再自动（临时代码:因下边的自动有BUG，临时用用，等下边的“自动”功能正常后这个 options.dir 就不要了 20161205）
                                if ('top' == _this.options.dir) {
                                    if (winHeight - offsetTop - btnHeight > boxHeight) { // 元素下边有空间显示popbox
                                        top = elm.position().top + btnHeight + 2;
                                    } else {
                                        top = -(boxHeight + 2);
                                    }
                                } else {
                                    top = elm.position().top + btnHeight + 2;
                                }
                                // 自动判断显示在元素上边还是下边（有BUG：获取不到弹出内容的height 20161205）
                                // if (winHeight - offsetTop - btnHeight > boxHeight) { // 元素下边有空间显示popbox
                                //     top = elm.position().top + btnHeight + 2;
                                // } else { // 空间不够显示 popbox
                                //     top = -(boxHeight + 2);
                                // }
                                _this.elmentEL.css("top", top + "px");
                                _this.elmentEL.css("left", left + "px");
                                parent.append(_this.elmentEL);
                            }

                            $compile(_this.elmentEL)($scope);
                            $scope.popbox_close = function () {
                                _this.close();
                                $scope.popbox_close = undefined;
                            }
                            if (options.manualclose != true)
                                $document.bind("mousedown", _this.handleBackDropClick);

                        });
                    };
                }

                return {
                    popbox: function (options) {
                        return new popbox(options)
                    }
                };
            }];
    });
angular.module("honzh.position", [])
    .factory("$position", ["$document", "$window", function ($document, $window) {
        function getStyle(element, styleName) {
            return element.currentStyle ? element.currentStyle[styleName] : $window.getComputedStyle ? $window.getComputedStyle(element)[styleName] : element.style[styleName];
        }

        function isStatic(element) {
            return "static" === (getStyle(element, "position") || "static")
        }

        var e = function (b) {
            for (var c = $document[0], e = b.offsetParent || c; e && e !== c && isStatic(e) ;)
                e = e.offsetParent;
            return e || c
        };
        return {
            position: function (element) {
                var offset = this.offset(element);
                return offset;
            },
            offset: function (c) {
                var d = c[0].getBoundingClientRect();
                return {
                    width: d.width || c.prop("offsetWidth"),
                    height: d.height || c.prop("offsetHeight"),
                    top: d.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
                    left: d.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
                }
            },
            positionElements: function (a, b, c, d) {
                var e, f, g, h, i = c.split("-"),
                    j = i[0],
                    k = i[1] || "center";
                e = d ? this.offset(a) : this.position(a),
                    f = b.prop("offsetWidth"),
                    g = b.prop("offsetHeight");
                var l = {
                    center: function () {
                        return e.left + e.width / 2 - f / 2
                    },
                    left: function () {
                        return e.left
                    },
                    right: function () {
                        return e.left + e.width
                    }
                },
                    m = {
                        center: function () {
                            return e.top + e.height / 2 - g / 2
                        },
                        top: function () {
                            return e.top
                        },
                        bottom: function () {
                            return e.top + e.height
                        }
                    };
                switch (j) {
                    case "right":
                        h = {
                            top: m[k](),
                            left: l[j]()
                        };
                        break;
                    case "left":
                        h = {
                            top: m[k](),
                            left: e.left - f
                        };
                        break;
                    case "bottom":
                        h = {
                            top: m[j](),
                            left: l[k]()
                        };
                        break;
                    default:
                        h = {
                            top: e.top - g,
                            left: l[k]()
                        }
                }
                return h
            }
        }
    }]);

angular.module('honzh.filter', ['ngSanitize'])
    .filter('timespan', function () {
        return function (time) {
            var str = "";
            var now = new Date();
            if (typeof (time) == 'string') {
                time = Date.parse(time);
            }
            var span = now - time;
            var minutes = (span / 1000).toFixed(0);
            if (minutes < -60 * 60 * 24 * 30)
                str = (-minutes / (60 * 60 * 24 * 30)).toFixed(0) + "月"
            else if (minutes < -60 * 60 * 24)
                str = (-minutes / (60 * 60 * 24)).toFixed(0) + "天"
            else if (minutes < 60 * 60)
                str = (minutes / (60)).toFixed(0) + "分钟前";
            else if (minutes < 60 * 60 * 24)
                if ((minutes / (60 * 60)).toFixed(0) >= 24 && (minutes / (60 * 60)).toFixed(0) <= 48) {
                    str = "昨天";
                } else {
                    str = (minutes / (60 * 60)).toFixed(0) + "小时前"
                }
            else if (minutes < 60 * 60 * 24 * 30)
                str = (minutes / (60 * 60 * 24)).toFixed(0) + "天前"
            else if (minutes < 60 * 60 * 24 * 365)
                str = (minutes / (60 * 60 * 24 * 30)).toFixed(0) + "月前"
            else
                str = (minutes / (60 * 60 * 24 * 365)).toFixed(0) + "年前"
            return str;
        }
    })
    .filter('timespan2', ['$filter', function ($filter) {
        return function (time) {
            var str = "";
            var now = new Date();
            if (typeof (time) == 'string') {
                time = Date.parse(time);
            }
            var HoursMinutes = "今天 " + $filter("date")(time, "HH:mm"); //time.substr(11, 5);
            var Day = $filter("date")(time, "yyyy-MM-dd");
            var span = now - time;
            var minutes = (span / 1000).toFixed(0);
            if (minutes < 60 * 60) //分钟
                str = (minutes / (60)).toFixed(0) + "分钟前";
            else if (minutes < 60 * 60 * 12) //小时
                str = HoursMinutes;
            else if (minutes < 60 * 60 * 24 * 30)
                if (minutes / (60 * 60 * 24) <= 2) {
                    str = "昨天";
                } else if (minutes / (60 * 60 * 24) > 2 && minutes / (60 * 60 * 24) <= 4) {
                    str = "前天";
                } else { str = Day; }
            return str;
        }
    }])

    .filter('week', function () {
        return function (time) {
            if (typeof (time) == "number")
                time = new Date(time);
            var str = "日一二三四五六";
            str = "周" + str.substr(time.getDay(), 1);
            return str;
        }
    })
    .filter('join', function () {
        return function (list, propertyName) {
            var arr = [];
            if (typeof (list) == 'undefined')
                return list
            for (var i = 0; i < list.length; i++)
                arr.push(list[i][propertyName]);
            return arr.join(",");
        };
    })
    .filter('toDate', ['$filter', function ($filter) {
        return function (input, params) {
            if (input) {
                input = Date.parse(input);
                return $filter("date")(input, params);
            }
            return input;
        }
    }])
    .filter('addGenderColor', ['$sce', function ($sce) { // 根据性别给姓名添加颜色，男加蓝色，女加紫色，可以省略性别那一列
        return function (name, gender) {
            var text = '';
            switch (gender) {
                case 10: // 男
                    text = '<span style="color:#2196F3">' + name + '</span>';
                    break;
                case 20: // 女
                    text = '<span style="color:#af00ff">' + name + '</span>';
                    break;
                default:
                    text = name;
            }
            return $sce.trustAsHtml(text);
        }
    }])

    .filter('addBranchColor', ['$sce', function ($sce) {
        return function (ChangeTypeName, IsBranchStart) {
            var text = '';
            switch (IsBranchStart) {
                case 2: // 非党支部发起的转接
                    text = '<span style="color:#F30">' + ChangeTypeName + '</span>';
                    break;
                default:
                    text = ChangeTypeName;
            }
            return $sce.trustAsHtml(text);
        }
    }])

    .filter('highlight', ['$filter', function ($filter) {
        return function (text, search) {
            if (!search) {
                return text;
            }
            var regex = new RegExp(search, 'gi')
            var result = text.replace(regex, '<span style="color:red">$&</span>');
            return result;
        }
    }])

    .filter('unsafe', function ($sce) { return $sce.trustAsHtml; })

    .filter('friendlyIdCardNo', ['$sce', function ($sce) { // 高亮身份证号出生年月
        return function (idCardNo) {
            var len = idCardNo.length;
            switch (len) {
                case 15: // 000000990000111
                    text = idCardNo.substr(0, 6)
                        + '<span style="color:#FF0000">' + idCardNo.substr(6, 2) + '</span>'
                        + '<span style="color:#03A9F4">' + idCardNo.substr(8, 2) + '</span>'
                        + '<span style="color:#03A9F4">' + idCardNo.substr(10, 2) + '</span>'
                        + idCardNo.substr(-3);
                    break;
                case 18: // 000000199900001111
                    text = idCardNo.substr(0, 6)
                        + '<span style="color:#FF0000">' + idCardNo.substr(6, 4) + '</span>'
                        + '<span style="color:#03A9F4">' + idCardNo.substr(10, 2) + '</span>'
                        + '<span style="color:#03A9F4">' + idCardNo.substr(12, 2) + '</span>'
                        + idCardNo.substr(-4);
                    break;
                default:
                    text = idCardNo;
            }
            return $sce.trustAsHtml(text);
        }
    }])
    .filter('friendlyGenderText', ['$sce', function ($sce) { // 男 -> 蓝色的男, 女 -> 紫色的女
        return function (gender) {
            var text = '';
            switch (gender) {
                case 10: // 男
                    text = '<span style="color:#2196F3">男</span>';
                    break;
                case 20: // 女
                    text = '<span style="color:#af00ff">女</span>';
                    break;
                default:
                    text = gender;
            }
            return $sce.trustAsHtml(text);
        }
    }])
    .filter('trustAsHtml', ['$sce', function ($sce) {
        return function (content) {
            return $sce.trustAsHtml(content);
        }
    }])
    .filter('getTextFromHtml', ['$sce', function ($sce) {
        return function (content) {
            if (typeof (content) != 'undefined') {
                var reg = /<[^>]*>/g;
                var content = content.replace(reg, "").substr(0, 180) + '...';
                return content;
            }
        }
    }])
     .filter('getTextFromHtmlFromFlowOutMember', ['$sce', function ($sce) {
         return function (content) {
             if (typeof (content) != 'undefined') {
                 var reg = /<[^>]*>/g;
                 var content = content.replace(reg, "").substr(0, 60) + '...';
                 return content;
             }
         }
     }])
    .filter('takeImage', ['$sce', function ($sce) {
        return function (html) {
            photoPath = [];
            var r = /src[\s]*=[\s]*['"]{0,1}([^'"]*)['"]{0,1}/g;
            var result = "";
            var resultUrl = [];
            while ((result = r.exec(html)) != null) {
                if (result[1].indexOf("spacer.gif") == -1) {
                    if (result[1].indexOf("?") != -1) {
                        resultUrl.push(result[1].substring(0, result[1].indexOf("?")));
                    } else {
                        resultUrl.push(result[1]);
                    }
                }
            }
            photoPath = resultUrl;
            return photoPath;
        }
    }])
    .filter('returnAge', ['$sce', function ($sce) {
        return function (birthday) {
            var Age;
            if (typeof (birthday) != 'undefined' && birthday != null) {
                var birthArry = birthday.split('-');
                var birthYear = "";
                var birthMonth = "";
                var birthDate = "";
                for (var i = 0; i < birthArry.length - 2; i++) {
                    birthYear = birthArry[i];
                    birthMonth = Number(birthArry[i + 1]) + 1;
                    birthDate = birthArry[i + 2].substring(0, 2);
                }
                d = new Date();
                var nowYear = d.getFullYear();
                var nowMonth = d.getMonth() + 1;
                var nowDay = d.getDate();

                if (nowYear <= birthYear)
                    Age = 0;
                else {
                    var ageDiff = nowYear - birthYear;                  //年之差
                    if (nowMonth == birthMonth) {
                        var dayDiff = nowDay - birthDate;                //日之差
                        if (dayDiff < 0)
                            Age = ageDiff - 1;
                        else
                            Age = ageDiff;
                    } else {
                        var monthDiff = nowMonth - birthMonth;          //月之差
                        if (monthDiff < 0)
                            Age = ageDiff - 1;
                        else
                            Age = ageDiff;
                    }
                }

            }
            return Age;
        }
    }])// 日期格式转换为中文大写数字
  .filter('DateFormatYear', ['$sce', function ($sce) {
      return function (year) {
          if (typeof (year) != 'undefined') {
              var cn = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
              var s = [];
              var YY = year.toString();
              for (var i = 0; i < YY.length; i++)
                  if (cn[YY.charAt(i)])
                      s.push(cn[YY.charAt(i)]);
                  else
                      s.push(YY.charAt(i));
              return s.join('');
          }
      }
  }])
  .filter('DateFormatMonth', ['$sce', function ($sce) {
      return function (month) {
          if (typeof (month) != 'undefined') {
              var cn = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
              var s = [];
              var MM = month;
              if (MM < 10)
                  s.push(cn[MM]);
              else
                  s.push("拾" + cn[MM % 10]);
              return s.join('');
          }
      }
  }])
  .filter('DateFormatIndate', ['$sce', function ($sce) {
      return function (indate) {
          if (typeof (indate) != 'undefined') {
              var cn = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
              var s = "";

              var indateSting = indate.toString();
              if (indate < 10) {
                  s = cn[indateSting];
              } else {
                  for (var i = 0; i < 1; i++)
                      if (indate >= 10 && indate < 20) {
                          if (cn[indateSting.charAt(i + 1)]) {
                              s = "拾";
                              if (indateSting.charAt(i + 1) != '0')
                                  s = "拾" + cn[indateSting.charAt(i + 1)];
                          }
                          else {
                              s = indateSting.charAt(i) + indateSting.charAt(i + 1);
                          }
                      } else if (indate >= 20) {
                          if (cn[indateSting.charAt(i + 1)]) {
                              s = cn[indateSting.charAt(i)] + "拾";
                              if (indateSting.charAt(i + 1) != '0')
                                  s = cn[indateSting.charAt(i)] + "拾" + cn[indateSting.charAt(i + 1)];

                          }
                          else {
                              s = indateSting.charAt(i) + indateSting.charAt(i + 1);
                          }
                      }
              }
          }
          return s;
      }

  }])
    .filter('friendlySexText', ['$sce', function ($sce) { // 男 -> 蓝色的男, 女 -> 红色的女
        return function (gender) {
            var text = '';
            switch (gender) {
                case 10: // 男
                    text = '男';
                    break;
                case 20: // 女
                    text = '女';
                    break;
                default:
                    text = gender;
            }
            return $sce.trustAsHtml(text);
        }
    }])
    .filter('substr', function () {
        return function (string, start, length, usetail) {
            var newString = '';
            var prefix = suffix = '';
            if ('string' == typeof (string)) {
                newString = string.substr(start, length);
                // 结尾的省略号
                var idx = string.indexOf(newString);
                if (newString.length < string.substr(idx).length) {
                    suffix = '...';
                }
                // 开头的省略号
                if (start < 0 && start > -string.length) {
                    prefix = '...';
                }
                // 是否关闭了“添加省略号功能”
                if (false == usetail) prefix = suffix = '';
                // 结果
                newString = prefix + newString + suffix;
            }
            return newString;
        }
    })
    .filter('replace', function () {
        return function (string, regexp, replacement) {
            var reg;
            try {
                reg = eval(regexp);
            } catch (e) {
                reg = regexp;
            }
            var newString = '';
            if ('string' == typeof (string)) {
                newString = string.replace(reg, replacement);
            }
            return newString;
        }
    })
    .filter('imageReplace', function () {
        return function (ImageStr) {
            if (typeof (ImageStr) != 'undefined') {
                ImageStr = ImageStr.replace('~', '');
            }
            return ImageStr;
        }
    })
    .filter('trim', function () {
        return function (string) {
            return 'string' == typeof (string) ? string.replace(/(^\s*)|(\s*$)/g, "") : '';
        }
    })
  .filter('toParagraph', ['$sce', function ($sce) {
      return function (text) {
          if (!text)
              return text;
          var html = '';
          text = text.replace(/\r\n/g, "<BR>")
          text = text.replace(/\n/g, "<BR>");
          html = text;
          return $sce.trustAsHtml(html);
      }
  }])
;

angular.module('honzh.ngScrollTo', [])
    .directive('scrollTo', ['ScrollTo', function (ScrollTo) {
        return {
            restrict: "AC",
            compile: function () {

                return function (scope, element, attr) {
                    element.bind("click", function (event) {
                        ScrollTo.idOrName(attr.scrollTo, attr.offset);
                    });
                };
            }
        };
    }])
    .service('ScrollTo', ['$window', 'ngScrollToOptions', function ($window, ngScrollToOptions) {

        this.idOrName = function (idOrName, offset, focus) {//find element with the given id or name and scroll to the first element it finds
            var document = $window.document;

            if (!idOrName) {//move to top if idOrName is not provided
                $window.scrollTo(0, 0);
            }

            if (focus === undefined) { //set default action to focus element
                focus = true;
            }
            //check if an element can be found with id attribute
            var el = document.getElementById(idOrName);
            if (!el) {//check if an element can be found with name attribute if there is no such id
                el = document.getElementsByName(idOrName);

                if (el && el.length)
                    el = el[0];
                else
                    el = null;
            }
            if (el) { //if an element is found, scroll to the element
                if (focus) {
                    el.focus();
                }

                ngScrollToOptions.handler(el, offset);
            }
            //otherwise, ignore
        }
    }])
    .provider("ngScrollToOptions", function () {
        this.options = {
            handler: function (el, offset) {
                if (offset) {
                    var top = $(el).offset().top - offset;
                    window.scrollTo(0, top);
                }
                else {
                    el.scrollIntoView();
                }
            }
        };
        this.$get = function () {
            return this.options;
        };
        this.extend = function (options) {
            this.options = angular.extend(this.options, options);
        };
    });

angular.module("honzh.ui", ["ui.bootstrap"])
    .constant('pagexConfig', {
        visiblePageCount: 10,
        firstText: '首页',
        lastText: '末页',
        prevText: '上一页',
        nextText: '下一页'
    })
    .directive("pager", ['pagexConfig', function (pagexConfig) {
        return {
            link: function (scope, element, attrs) {
                var visiblePageCount = angular.isDefined(attrs.visiblePageCount) ? attrs.visiblePageCount : pagexConfig.visiblePageCount;
                scope.firstText = angular.isDefined(attrs.firstText) ? attrs.firstText : pagexConfig.firstText;
                scope.lastText = angular.isDefined(attrs.lastText) ? attrs.lastText : pagexConfig.lastText;
                scope.prevText = angular.isDefined(attrs.prevText) ? attrs.prevText : pagexConfig.prevText;
                scope.nextText = angular.isDefined(attrs.nextText) ? attrs.nextText : pagexConfig.nextText;
                scope.currentPage = 1;
                scope.pageChange = function (page) {
                    if (page >= 1 && page <= scope.pageCount) {
                        scope.currentPage = page;
                    } else {
                        scope.currentPage = 1;
                    }
                    scope.page = page;
                }
                function build() {
                    var low,
                        high,
                        v;
                    scope.pagenums = [];
                    if (scope.pageCount == 0) {
                        return;
                    }
                    if (scope.currentPage > scope.pageCount) {
                        scope.currentPage = 1;
                    }
                    if (scope.pageCount <= visiblePageCount) {
                        low = 1;
                        high = scope.pageCount;
                    } else {
                        v = Math.ceil(visiblePageCount / 2);
                        low = Math.max(scope.currentPage - v, 1);
                        high = Math.min(low + visiblePageCount - 1, scope.pageCount);
                        if (scope.pageCount - high < v) {
                            low = high - visiblePageCount + 1;
                        }
                    }
                    for (; low <= high; low++) {
                        scope.pagenums.push(low);
                    }
                }

                scope.$watch('pageCount', function () {
                    build();
                });
                scope.$watch('currentPage', function () {
                    build();
                    scope.onPageChange();
                });
            },
            replace: true,
            restrict: "E",
            scope: {
                pageCount: '=',
                currentPage: '=',
                onPageChange: '&'
            },
            template: '<ul class="pagination"><li ng-click="pageChange(1)"><a>{{firstText}}</a></li>' +
            '<li ng-click="pageChange(currentPage-1>0?currentPage-1:1)"><a>{{prevText}}</a></li>' +
            '<li ng-click="pageChange(pagenums[0]-1)" ng-show="pagenums[0]>1"><a>...</a></li>' +
            '<li ng-repeat="pagenum in pagenums" ng-click="pageChange(pagenum)" ng-class="{active:currentPage===pagenum}"><a>{{pagenum}}</a></li>' +
            '<li ng-click="pageChange(pagenums[pagenums.length-1]+1)" ng-show="pagenums[pagenums.length-1]<pageCount"><a>...</a></li>' +
            '<li ng-click="pageChange(currentPage+1<=pageCount?currentPage+1:pageCount)"><a>{{nextText}}</a></li>' +
            '<li ng-click="pageChange(pageCount)"><a>{{lastText}}</li></ul>'
        }
    }])
    .directive("toogleMenu", function () {
        // //设置cookie
        // function setCookie(cname, cvalue, exdays) {
        //     var d = new Date();
        //     d.setTime(d.getTime() + (exdays*24*60*60*1000));
        //     var expires = "expires="+d.toUTCString();
        //     document.cookie = cname + "=" + cvalue + "; " + expires;
        // }
        // //获取cookie
        // function getCookie(cname) {
        //     var name = cname + "=";
        //     var ca = document.cookie.split(';');
        //     for(var i=0; i<ca.length; i++) {
        //         var c = ca[i];
        //         while (c.charAt(0)==' ') c = c.substring(1);
        //         if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
        //     }
        //     return "";
        // }
        return function (scope, elm) {
            // var fullmenu = getCookie("fullmenu");
            // if(true == fullmenu){
            //     elm.addClass("fullmenu");
            // }
            elm.has('dd').find('dt').click(function () {
                var dt = $(this);
                var isFullmenu = dt.parents('div.mainmenu').hasClass("fullmenu");
                if (isFullmenu) {
                    dt.parents('div.mainmenu').find("dd").each(function (i) {
                        var dtText = dt.text()
                        var curText = $(this).parents('dl').find('dt').text()
                        if (dtText != curText) {
                            $(this).slideUp(300);
                        }
                    });
                    dt.next().slideToggle(200);
                    //setCookie("fullmenu",true,30);
                }
            });
            elm.find('dd ul li a').click(function () {
                elm.find('dd ul li a').removeClass('active');
                $(this).addClass('active');
            });
        };
    })
    .directive("resizable", function () {
        return {
            restrict: "A",
            compile: function () {
                return function (scope, element, attr) {
                    var elm = $(element);
                    $(element).resizable({
                        helper: "ui-resizable-helper",
                        handles: attr["resizable"],
                        stop: function () {
                            var width = parseInt(elm.css('width'));
                            elm.parents('.body').find('.category-container').css('width', width + 'px');
                            elm.parents('.body').find('.content-container,.autosize').css('left', width + 5 + 'px'); // 中间的边距5用于展示div.ui-resize
                        }
                    });
                };
            }
        };
    })
    .directive("errSrc", function () {
        return {
            link: function (scope, element, attrs) {
                element.bind("error", function () {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set("src", attrs.errSrc);
                    }
                });
            }
        }
    })
    .directive("photoToText", function () {
        return {
            //restrict: 'A',
            link: function (scope, element, attrs) {
                if (attrs.src != attrs.errSrc) {
                    element.remove;
                }
            }
        }
    })
    .provider("$alert", [function () {
        var $alertProvider = {
            $get: ["$uibModal", function ($uibModal) {
                var alert = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/alert.html',
                        animation: false,
                        controller: 'alertCtrl',
                        size: option.size || 'md',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "ok":
                                option.ok ? option.ok() : "";
                                break;
                        }
                    }, function () {

                    });
                };
                var error = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/error.html',
                        animation: false,
                        controller: 'alertCtrl',
                        size: option.size || 'md',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "ok":
                                option.ok ? option.ok() : "";
                                break;
                        }
                    }, function () {

                    });
                };
                var failed = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/failed.html',
                        animation: false,
                        controller: 'alertCtrl',
                        size: option.size || 'md',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "ok":
                                option.ok ? option.ok() : "";
                                break;
                        }
                    }, function () {

                    });
                };
                var confirm = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/confirm.html',
                        animation: false,
                        controller: 'confirmCtrl',
                        size: option.size || 'md',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "ok":
                                option.ok ? option.ok() : "";
                                break;
                            case "cancel":
                                option.cancel ? option.cancel() : "";
                                break;
                        }
                    }, function () {

                    });
                };
                var dangerous = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/dangerous.html',
                        animation: false,
                        controller: 'dangerousCtrl',
                        size: option.size || 'md',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });

                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "cancel":
                                option.cancel ? option.cancel() : "";
                                break;
                            default:
                                option.ok ? option.ok(result) : "";
                                break;
                        }
                    }, function () {

                    });
                }
                return {
                    alert: alert,
                    confirm: confirm,
                    error: error,
                    failed: failed,
                    dangerous: dangerous
                };
            }]
        };
        return $alertProvider;
    }])
    .provider("$info", [function () {
        var $infoProvider = {
            $get: ["$compile", function ($compile) {
                var show = function (msg, timeout, msgtype) {
                    if (!timeout) timeout = 1500;
                    if (!msgtype) msgtype = "success"; // success info warning danger, More:http://v3.bootcss.com/components/#alerts
                    var bodyEl = angular.element("body");
                    var infoEl = angular.element('<div class="sys-info" style="display:none;"><div class="alert alert-{{msgtype}}">{{msg}}</div></div');
                    bodyEl.append(infoEl);
                    infoEl.show(200);
                    var scope = infoEl.scope();

                    scope.msg = msg;
                    scope.msgtype = msgtype;
                    $compile(infoEl)(scope);
                    var timer = setTimeout(function () {
                        infoEl.hide(200, function () {
                            infoEl.remove();
                            clearTimeout(timer);
                        });
                    }, timeout);

                }
                return {
                    show: show
                }
            }]
        };
        return $infoProvider;
    }])
    .controller("alertCtrl", ['$scope', '$uibModalInstance', 'option', function ($scope, $uibModalInstance, option) {
        option = angular.extend({}, option);
        option.okStr = option.okStr ? option.okStr : "确定";
        $scope.option = option;
        $scope.ok = function () {
            $uibModalInstance.close("ok");
        };
    }])
    .controller("confirmCtrl", ['$scope', '$uibModalInstance', 'option', function ($scope, $uibModalInstance, option) {
        option = angular.extend({}, option);
        option.okStr = option.okStr ? option.okStr : "确定";
        option.cancelStr = option.cancelStr ? option.cancelStr : "取消";
        $scope.option = option;
        $scope.ok = function () {
            $uibModalInstance.close("ok");
        };
        $scope.cancel = function () {
            $uibModalInstance.close("cancel");
        };
    }])
    .controller("dangerousCtrl", ['$scope', '$uibModalInstance', 'option', function ($scope, $uibModalInstance, option) {
        option = angular.extend({}, option);
        option.okStr = option.okStr ? option.okStr : "确定";
        option.cancelStr = option.cancelStr ? option.cancelStr : "取消";
        $scope.option = option;
        $scope.ok = function () {
            if ($scope.option.checkword1 == $scope.option.checkword) {
                $uibModalInstance.close($scope.option.checkword1);
            }
            else
                $scope.err = "输入错误";
        };
        $scope.cancel = function () {
            $uibModalInstance.close("cancel");
        };
    }])
    .provider("$memberInfo", [function () {
        var $memberInfoProvider = {
            $get: ["$uibModal", function ($uibModal) {
                var showMemberInfo = function (option) {
                    var modalInstance = $uibModal.open({
                        templateUrl: option.templateUrl ? option.templateUrl : '/v2/template/partyMember.html',
                        animation: false,
                        controller: 'memberCtrl',
                        size: 'lg',
                        windowClass: 'partyMemberModal',
                        resolve: {
                            option: function () {
                                return option;
                            }
                        }
                    });
                    modalInstance.result.then(function (result) {
                        switch (result) {
                            case "full":
                                option.ok ? option.full() : "";
                                break;
                            case "close":
                                option.close ? option.close() : "";
                                break;
                        }
                    }, function () {

                    });
                };
                return {
                    showMemberInfo: showMemberInfo,
                };
            }]
        };
        return $memberInfoProvider;
    }])
    .controller("memberCtrl", ['$scope', '$uibModalInstance', '$uibModalStack', 'option', '$PartyMember', function ($scope, $uibModalInstance, $uibModalStack, option, $PartyMember) {

        option = angular.extend({}, option);
        option.ID = option.ID;

        $PartyMember.getFullMemberModal(option.ID).then(function (result) {

            $scope.baseinfoview = result.PartyMember;
            $scope.degreeList = result.Education;
            $scope.jobList = result.Work;
            $scope.organtionofficeList = result.OrgAppointing;
            $scope.companyofficeList = result.Position;
            $scope.outflowMenberList = result.FlowOut;
            $scope.inflowMenberList = result.FlowIn;
            $scope.organizationRelationshipList = result.Relation;
            $scope.democraticAppraisalList = result.DemocraticAppraisal;
            $scope.technicalPositionList = result.TechnicalPosition;
            $scope.rewardList = result.Reward;
            $scope.punishmentList = result.Punished;
            $scope.abroadList = result.Abroad;
            $scope.difficultyList = result.Difficulty;
            $scope.familymembersList = result.FamilyMembers;
            $scope.trainList = result.Train;
            $scope.develop = result.Party;
        });
        $scope.option = option;
        $scope.full = function () {
            if ($scope.yes == true) {
                $uibModalStack.getTop().value.modalDomEl.addClass("fullscreen");
                $scope.yes = false;
            }
            else {
                $uibModalStack.getTop().value.modalDomEl.removeClass("fullscreen");
                $scope.yes = true;
            }

        };
        $scope.close = function () {

            $uibModalInstance.close("close");
        };
    }])
    .directive("partyReport", function () {
        return {
            restrict: 'C',
            link: function (scope, element, attrs) {
                element.attr("title", "有党徽标记的项为党统需要的信息");
                element.css('cursor', 'help');
            }
        };
    })
    .directive('stepProgress', ['$timeout', function ($timeout) { // 表单填写向导的步骤 进度提示
        return {
            restrict: 'A',
            replace: true, // default false
            scope: {
                list: '=',
                step: '=', // 第一个是零
                textpos: '@' // 提示文字显示在上边(above)还是下边(below)
            },
            link: function (scope, elm, attr) {
                scope.list = scope.list || [];
                var isNarrow = false; // 容器是否够显示全部的步骤
                var renderWatch = scope.$parent.$watch(attr.step, function (newValue, oldValue) {
                    scope.step = newValue;
                    if (null != newValue) {
                        // renderWatch(); // 释放 $watch
                        build();
                    }
                });
                function build() {
                    scope.apList = [];
                    scope.apClass = scope.textpos == 'below' ? 'belowText' : ''; // 提示放在下进度条下边
                    for (var i = 0, totalItem = scope.list.length; i < totalItem; i++) {
                        scope.apList.push({ "text": scope.list[i] });
                    }
                    for (i = 0; i < totalItem; i++) {
                        scope.apList[i].BarItemText = i + 1;
                        scope.apList[i].BarItemClass = "dot";
                        scope.apList[i].TextItemClass = "";
                        if (i <= scope.step) {
                            scope.apList[i].BarItemClass += " active";
                            scope.apList[i].TextItemClass += " active";
                        }
                    }
                    var containerWidth = elm.width(); // need jquery
                    var barProcessWidth = 0;
                    var dotWidth = 28;
                    var itemWidth = 120;

                    if (itemWidth * totalItem - totalItem * 20 > containerWidth) { // 20 = padding-left + padding-right
                        isNarrow = true;
                    } else {
                        isNarrow = false;
                    }

                    var stepWidth = (containerWidth - dotWidth) / (totalItem - 1)



                    if (scope.step == totalItem) {
                        barProcessWidth = containerWidth - dotWidth;
                    } else {
                        barProcessWidth = (scope.step) * stepWidth;
                    }

                    scope.barBgStyle = {
                        "width": (containerWidth - dotWidth) + 'px'
                    }
                    scope.barProcessStyle = {
                        "width": barProcessWidth + 'px'
                    }

                    for (var i = 0; i < totalItem; i++) {
                        // 进度点数字的位置
                        dotLeft = stepWidth * i;
                        scope.apList[i].dotStyle = {
                            "left": dotLeft
                        };

                        // 设置文字的位置
                        var textLeft = -((itemWidth + dotWidth) / 2) + dotLeft + dotWidth;
                        scope.apList[i].textStyle = {
                            "left": textLeft + 'px',
                            "display": isNarrow ? "none" : "block"
                        }
                    }

                    if (isNarrow) {
                        scope.apList[scope.step].textStyle.display = "block";
                        scope.apList[scope.step].TextItemClass += " current";
                        scope.apList[scope.step].BarItemClass += " current";
                    }
                }
                // build();
                $timeout(function () { build(); }, 100);

                scope.show = function (index) {
                    scope.step = index;
                    build();
                }

                scope.showCurItem = function (index, display) {
                    if (index == scope.step) return;
                    if (isNarrow) { // 宽度不够时再启用
                        switch (display) {
                            case "block":
                                scope.apList[index].textStyle.display = display;
                                scope.apList[index].textStyle.zIndex = 1;
                                break;
                            default:
                                scope.apList[index].textStyle.display = display;
                                scope.apList[index].textStyle.zIndex = "inherit";
                        }
                    }
                }

                $(window).resize(function () {
                    build();
                    scope.$apply();
                });
            },
            transclude: true,
            template: '\
                <div class="stepProgress {{apClass}}">\
                    <ol class="progessText">\
                        <li ng-repeat="text in apList" ng-class="text.TextItemClass" ng-style="text.textStyle" ng-click="show($index)">\
                            <span class="title">{{text.text}}</span>\
                        </li>\
                    </ol>\
                    <div class="progessBar">\
                        <div ng-repeat="bar in apList" ng-class="bar.BarItemClass" ng-style="bar.dotStyle" ng-click="show($index)">\
                            <span ng-mouseenter="showCurItem($index,\'block\')" ng-mouseout="showCurItem($index,\'none\')">{{bar.BarItemText}}</span>\
                        </div>\
                        <div class="barBg" ng-style="barBgStyle"></div>\
                        <div class="barProcess" ng-style="barProcessStyle"></div>\
                    </div>\
                </div>\
            '
        }
    }])
    .directive('autofontsize', function () {// 根据宽度设置能用的最大字号
        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            scope: {
                width: '=' // DIV的宽度值，根据这个宽度设置能使用的最大字号
            },
            link: function (scope, elm, attr) {
                function render() {
                    var oldFountSize = elm.css('font-size');
                    var newFontSize = scope.width / elm.text().length + 'px';
                    scope.style = {
                        'text-align': 'center',
                        'font-size': newFontSize > oldFountSize ? oldFountSize : newFontSize,
                        'width': scope.width + 'px',
                        'line-height': elm.height() + 'px',
                        'white-space': 'nowrap', // 强制不换行
                        'overflow': 'hidden'  // 浏览器有最小字体限制
                    };
                }
                render();

                scope.$watch('width', function () {
                    render();
                });
            },
            template: '<div ng-style="style" ng-transclude></div>'
        }
    })
    .directive('title', function () {
        return {
            restrict: 'A',
            link: function (scope, elm, attr) {
                elm.not('.glyphicon,.btn,.unUseTip,.unuseTip,.unusetip,[class^="ion-"]').mouseover(function (e) {
                    this.myTitle = this.title;
                    if (this.myTitle == 'undefined' || this.myTitle == '') this.myTitle = this.text;
                    if (this.myTitle == '') return;
                    this.title = "";
                    var tooltip = "<div class='titleTip'>" + this.myTitle + "</div>";
                    $('body').append(tooltip);
                    $('.titleTip').css({ "top": (e.pageY + 20) + "px", "left": (e.pageX + 10) + "px" }).show('fast');
                }).mouseout(function () {
                    this.title = this.myTitle; $('.titleTip').remove();
                }).mousemove(function (e) {
                    $('.titleTip').css({ "top": (e.pageY + 20) + "px", "left": (e.pageX + 10) + "px" });
                });
            }
        }
    })
    .directive('mainmenu', function () { // 页面加载后自动展开当前菜单
        return {
            restrict: 'C',
            link: function (scope, elm) {
                function main() {
                    if ('' != window.location.hash) {
                        var urlModel = window.location.pathname.split('/')[2]; // ["", "v2", "infoManage", "html", "index.html"]
                        var urlAction = window.location.hash.split('/')[1];     // #/organization/66 --> ["#", "organization", "66"]
                        elm.find('dd ul li a').each(function () {
                            var hrefModel = $(this).attr('href').split('/')[2];           // /v2/infoManage/html/index.html#/organization --> ["", "v2", "infoManage", "html", "index.html"] --> infoManage
                            var hrefHash = $(this).attr('href').match(/#\/\w+/) || ['']; // /v2/infoManage/html/index.html#/organization/66 --> #/organization
                            var hrefAction = hrefHash[0].match(/\w+/) || '';               // #/organization --> organization
                            if (hrefModel == urlModel && hrefAction == urlAction) {        // 找到一个 model 和 action 都匹配的a元素，添加高亮效果
                                // 高亮当前功能
                                $(this).addClass('active');
                                // 高亮整个当前模块
                                var model = $(this).parents('dl').attr('ng-click').match(/submenu='(\w+)'/)[1] // 取 ng-click="submenu='infoManage'" 中的 infoManage
                                scope.submenu = model; // 见模板：ng-class="{true:'active',false:''}[submenu=='infoManage']"
                            } else {
                                $(this).removeClass('active');
                            }
                        });
                    }
                }
                main();
                // 菜单展开 or 折叠
                var menuType = localStorage.useFullMenu || 'fullmenu'; // fullmenu minmenu
                switch (menuType) {
                    case 'fullmenu':
                        elm.removeClass('minmenu').addClass(menuType);
                        break;
                    default:
                        elm.removeClass('fullmenu').addClass(menuType);
                }
                scope.$parent.fullmenu = menuType;
                // 地址栏变动时更新
                var oldUrl = window.location.href;
                setInterval(function () {
                    var newUrl = window.location.href;
                    if (oldUrl != newUrl) {
                        main();
                        scope.$apply();
                        oldUrl = newUrl;
                    }
                }, 1000);
            }
        }
    })
    /* table行特效（梅） */
    .directive('fixExtInfoPos', function () {
        return {
            replace: true,
            transclude: true,
            link: function (scope, elm, attr) {
                elm.parents('tr').bind('mouseenter', function () {
                    setTimeout(function () { // hide 的元素获取不到 outerHeight，延时一会等 show 了再获取
                        var winHeight = $(window).height();
                        var elmTop = elm.parents('tr').offset().top;
                        var elmHeight = elm.outerHeight();
                        //console.log('winHeight:'+winHeight+ ' elmTop:'  +elmTop+ ' elmHeight:'+elmHeight);
                        if (winHeight - elmTop - 50 < elmHeight) { // “-50”的原因：贴边不好看
                            scope.style = {
                                'top': 'initial',
                                'bottom': '36px'
                            }
                            scope.$apply();
                        }
                    }, 50);
                });
            },
            template: '<dl class="ext-info" ng-style="style" ng-transclude></dl>'
        }
    })
    // 排序
    // 参考/v2/activity/html/highlightsEngineering.html页面
    // 需指定查询方法、排序字段名、queryModel名
    .directive('sort', function ($parse) {
        return {
            restrict: 'A',
            scope: {
                sortModel: '=?',
                sortAction: '&'
            },
            link: function (scope, element, attrs) {
                element.bind('click', function (event) {
                    var target = event.target;
                    if (!target.attributes["sort-property"] || !target.attributes["sort-property"].value)
                        return;

                    // 清除其他列样式
                    element.find("[sort-property]").each(function () {
                        $(this).removeClass("sort-asc");
                        $(this).removeClass("sort-desc");
                    });

                    // 排序model初始化
                    if (scope.property == target.attributes["sort-property"].value)
                        scope.direction = scope.direction == "desc" ? "asc" : "desc";
                    else
                        scope.direction = "desc";

                    if (scope.direction == "desc") $(target).addClass("sort-desc");
                    if (scope.direction == "asc") $(target).addClass("sort-asc");

                    // 绑定到model并执行方法
                    scope.property = target.attributes["sort-property"].value;
                    //ngBind.assign(scope.$parent, { Property: scope.property, Direction: scope.direction }); // 会把model原来的属性覆盖掉，改用传统赋值 - -!
                    if (scope.sortModel) {
                        scope.sortModel.Property = scope.property;
                        scope.sortModel.Direction = scope.direction;
                        scope.sortModel.Sort = JSON.stringify([{ Property: scope.property, Direction: scope.direction }]);
                    }
                    else
                        scope.sortModel = {
                            Property: scope.property,
                            Direction: scope.direction,
                            Sort: JSON.stringify([{ Property: scope.property, Direction: scope.direction }])
                        };

                    scope.sortAction();
                });
            }
        }
    })

    // 操作日志
    .directive("operateLog", function ($uibModal, $alert) {
        return {
            restrict: 'A',
            scope: {
                operateTables: '=?'
            },
            link: function (scope, element, attrs) {
                element.bind("click", function () {
                    if (!scope.operateTables) {
                        $alert.alert({ msg: '操作历史参数错误，请联系管理员处理！' });
                        return;
                    }
                    var modalInstance = $uibModal.open({
                        templateUrl: '/v2/template/operateLog.html',
                        animation: false,
                        controller: 'operateLogCtrl',
                        size: 'lg',
                        resolve: {
                            operateTables: function () {
                                return scope.operateTables;
                            }
                        }
                    });
                    modalInstance.result.then(function (result) {
                    }, function () {
                    });
                });
            }
        };
    })
    .controller("operateLogCtrl", ['$scope', '$uibModalInstance', '$uibModalStack', '$operateLog', 'operateTables', function ($scope, $uibModalInstance, $uibModalStack, $operateLog, operateTables) {
        $scope.onSelectPage = function () {
            $scope.loading = true;
            $operateLog.GetOperateLog(operateTables, $scope.currentPage || 1).then(function (result) {
                $scope.loading = false;
                $scope.currentPage = result.PageIndex;
                $scope.rowCount = result.RowCount;
                $scope.logs = result.PageData;
                $scope.currentIndex = $scope.currentPage;
            });
        };
        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
        $scope.togglefullscreen = function () {
            if ($scope.full == false) {
                $uibModalStack.getTop().value.modalDomEl.addClass("fullscreen");
                $scope.full = true;
            }
            else {
                $uibModalStack.getTop().value.modalDomEl.removeClass("fullscreen");
                $scope.full = false;
            }
        };
        $scope.full = false;
        $scope.onSelectPage();
    }])
    .service('$operateLog', function ($sysapi, $q) {
        var GetOperateLog = function (operateTables, pageIndex) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            var pageModel = { page: pageIndex ? pageIndex : null };
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysLog/GetOperateLog",
                data: {
                    _dc: Math.random,
                    operateTables: operateTables,
                    pageModel: pageModel
                }
            })
                .success(function (data) {
                    var result = data.Data;
                    deferred.resolve(result);
                });
            return promise;
        }
        return {
            GetOperateLog: GetOperateLog
        };
    })

    // 操作日志
    .directive("smsChatroom", function ($uibModal, $alert) {
        return {
            restrict: 'A',
            scope: {
                tel: '=?'
            },
            link: function (scope, element, attrs) {
                element.bind("click", function () {
                    if (!scope.tel) {
                        $alert.alert({ msg: '短信记录参数错误，请联系管理员处理！' });
                        return;
                    }
                    var modalInstance = $uibModal.open({
                        templateUrl: '/v2/template/smsChatroom.html',
                        animation: false,
                        controller: 'smsChatroomCtrl',
                        size: 'lg',
                        resolve: {
                            tel: function () {
                                return scope.tel;
                            }
                        }
                    });
                    modalInstance.result.then(function (result) {
                    }, function () {
                    });
                });
            }
        };
    })
    .controller("smsChatroomCtrl", ['$scope', '$uibModalInstance', '$uibModalStack', '$smsChatroom', 'tel', function ($scope, $uibModalInstance, $uibModalStack, $smsChatroom, tel) {
        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
        $scope.togglefullscreen = function () {
            if ($scope.full == false) {
                $uibModalStack.getTop().value.modalDomEl.addClass("fullscreen");
                $scope.full = true;
            }
            else {
                $uibModalStack.getTop().value.modalDomEl.removeClass("fullscreen");
                $scope.full = false;
            }
        };
        $scope.full = false;
        $smsChatroom.GetsmsChatroom(tel).then(function (result) {
            $scope.smsList = result;
        });
        //$scope.smsList = [{ SmsTime: '2016-09-12 17:02:30', Src: '/Upload/PartyMemberPhoto/201612/zgl.gif', Name: '奔波儿灞', Content: '为什么小鑫的名字里有三个金呢？', Tag: 'send' },
        //                  { SmsTime: '2016-09-12 17:02:56', Src: '/Upload/PartyMemberPhoto/201612/zgl.gif', Name: '霸波尔奔', Content: '他命里缺金，所以取名叫鑫，有些人命里缺水，就取名叫淼，还有些人命里缺木就叫森。', Tag: 'recv' },                                          
        //                  { SmsTime: '2016-09-12 17:03:36', Src: '/Upload/PartyMemberPhoto/201612/zgl.gif', Name: '奔波儿灞', Content: '那郭晶晶命里缺什么？', Tag: 'send' },
        //                  { SmsTime: '2016-09-12 17:03:46', Src: '/Upload/PartyMemberPhoto/201612/zgl.gif', Name: '霸波尔奔', Content: '此处省略一百字...', Tag: 'recv' }]

    }])
    .service('$smsChatroom', function ($sysapi, $q) {
        var GetsmsChatroom = function (tel, pageIndex) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            var pageModel = { page: pageIndex ? pageIndex : null };
            $sysapi.post({
                method: 'POST',
                url: "/Sms/SmsMessage/GetSmsChatListByTel",
                data: {
                    _dc: Math.random,
                    tel: tel
                }
            })
                .success(function (data) {
                    var result = data.Data;
                    deferred.resolve(result);
                });
            return promise;
        }
        return {
            GetsmsChatroom: GetsmsChatroom
        };
    })

    // 附件预览
    .directive("filePreview", function ($uibModal, $alert) {
        return {
            restrict: 'A',
            scope: {
                sysFile: '=?'
            },
            link: function (scope, element, attrs) {
                element.bind("click", function () {
                    if (!scope.sysFile) {
                        $alert.alert({ msg: '附件参数错误，请联系管理员处理！' });
                        return;
                    }
                    var modalInstance = $uibModal.open({
                        templateUrl: '/v2/template/preview.html',
                        animation: false,
                        controller: 'filePreviewCtrl',
                        size: 'lg',
                        resolve: {
                            sysFile: function () {
                                return scope.sysFile;
                            }
                        }
                    });
                    modalInstance.result.then(function (result) {
                    }, function () {
                    });
                });
            }
        };
    })
    .controller("filePreviewCtrl", ['$scope', '$uibModalInstance', '$uibModalStack', 'sysFile', '$sysapi', function ($scope, $uibModalInstance, $uibModalStack, sysFile, $sysapi) {
        var imgs = ['.gif', '.jpg', '.jpeg', '.png', '.bmp'];
        var videos = ['.flv', '.wav', '.wma', '.wmv', '.avi', '.mpg', '.asf', '.rm', '.rmvb', '.mp4'];
        var docs = ['.doc', '.docx', '.xls', '.xlsx', '.txt', '.pdf'];

        $scope.file = sysFile;
        var ext = sysFile.ExtName;
        if ($.inArray(ext, imgs) >= 0) {
            $scope.fileType = "img";
            $scope.filePath = sysFile.FilePath.substr(1);
        }
        else if ($.inArray(ext, videos) >= 0) {
            $scope.fileType = "video";
            $scope.filePath = '/Sys/sysfile/down/' + sysFile.FileId;
        }
        else if ($.inArray(ext, docs) >= 0) {
            $scope.fileType = "doc";
            $scope.previewWaiting = true;
            $sysapi.post({
                method: 'POST',
                url: "/Sys/SysFile/Preview",
                data: {
                    _dc: Math.random,
                    file: sysFile
                }
            })
            .success(function (data) {
                $scope.previewWaiting = false;
                //$scope.file = data.Data;
                $scope.filePath = data.Data.FilePath;

                $(".panel-body").addClass("preview");
                var scrollCss = "::-webkit-scrollbar {width: 6px;height: 9px;}" +
                    "::-webkit-scrollbar-thumb,::-webkit-scrollbar-thumb:horizontal,::-webkit-scrollbar-thumb:vertical {background-color: #700;}";
                $(window.frames["preview"].document).find("head").append("<style type='text/css'>" + scrollCss + "</style>");
            });
        }
        else
            $scope.fileType = "other";

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
        $scope.togglefullscreen = function () {
            if ($scope.full == false) {
                $uibModalStack.getTop().value.modalDomEl.addClass("fullscreen");
                $scope.full = true;
            }
            else {
                $uibModalStack.getTop().value.modalDomEl.removeClass("fullscreen");
                $scope.full = false;
            }
        };
        $scope.full = false;
    }])

    /* 弹出遮罩层 */
    // 提供遮盖层传参功能
    .provider('$coverLayerResolve', function () {
        var resolve = this;
        this.resolver = null;

        this.setResolver = function (resolver) {
            this.resolver = resolver;
        };

        this.$get = ['$injector', '$q', function ($injector, $q) {
            var resolver = resolve.resolver ? $injector.get(resolve.resolver) : null;
            return {
                resolve: function (invocables, locals, parent, self) {
                    if (resolver) {
                        return resolver.resolve(invocables, locals, parent, self);
                    }

                    var promises = [];

                    angular.forEach(invocables, function (value) {
                        if (angular.isFunction(value) || angular.isArray(value)) {
                            promises.push($q.resolve($injector.invoke(value)));
                        } else if (angular.isString(value)) {
                            promises.push($q.resolve($injector.get(value)));
                        } else {
                            promises.push($q.resolve(value));
                        }
                    });

                    return $q.all(promises).then(function (resolves) {
                        var resolveObj = {};
                        var resolveIter = 0;
                        angular.forEach(invocables, function (value, key) {
                            resolveObj[key] = resolves[resolveIter++];
                        });

                        return resolveObj;
                    });
                }
            };
        }];
    })
    // 弹出遮盖层
    .provider('$coverLayer', function () {
        var $layerProvider = {
            options: {
                layerContainer: "",
                templateUrl: ""
            },
            $get: ['$rootScope', '$q', '$document', '$templateRequest', '$templateCache', '$compile', '$controller', '$coverLayerResolve',
            function ($rootScope, $q, $document, $templateRequest, $templateCache, $compile, $controller, $coverLayerResolve) {
                var $layer = {};

                function getTemplatePromise(options) {
                    return options.template ? $q.when(options.template) :
                        $templateRequest(angular.isFunction(options.templateUrl) ?
                            options.templateUrl() : options.templateUrl);
                }

                var promiseChain = null;
                $layer.getPromiseChain = function () {
                    return promiseChain;
                };

                $layer.open = function (layerOptions) {
                    var layerResultDeferred = $q.defer();
                    var layerOpenedDeferred = $q.defer();
                    var layerClosedDeferred = $q.defer();
                    var layerRenderDeferred = $q.defer();

                    var layerInstance = {
                        deferred: layerResultDeferred,
                        result: layerResultDeferred.promise,
                        opened: layerOpenedDeferred.promise,
                        closed: layerClosedDeferred.promise,
                        rendered: layerRenderDeferred.promise,
                        close: function (result) {
                            return $layer.close(layerInstance, result);
                        },
                        dismiss: function (reason) {
                            return $layer.dismiss(layerInstance, reason);
                        },
                        fullscreen: function (full) {
                            return $layer.fullscreen(layerInstance, full);
                        }
                    };

                    layerOptions = angular.extend({}, $layerProvider.options, layerOptions);
                    layerOptions.resolve = layerOptions.resolve || {};
                    layerOptions.appendTo = layerOptions.appendTo || $document.find('body').eq(0);

                    if (!layerOptions.template && !layerOptions.templateUrl) {
                        throw new Error('One of template or templateUrl options is required.');
                    }

                    var templateAndResolvePromise =
                        $q.all([getTemplatePromise(layerOptions), $coverLayerResolve.resolve(layerOptions.resolve, {}, null, null)]);

                    function resolveWithTemplate() {
                        return templateAndResolvePromise;
                    }

                    var samePromise;
                    samePromise = promiseChain = $q.all([promiseChain])
                        .then(resolveWithTemplate, resolveWithTemplate)
                        .then(function resolveSuccess(tplAndVars) {
                            var providedScope = layerOptions.scope || $rootScope;

                            var layerScope = providedScope.$new();
                            layerScope.$close = layerInstance.close;
                            layerScope.$dismiss = layerInstance.dismiss;
                            layerScope.$fullscreen = layerInstance.fullscreen;

                            var ctrlInstance, ctrlInstantiate, ctrlLocals = {};

                            //controllers
                            if (layerOptions.controller) {
                                ctrlLocals.$scope = layerScope;
                                ctrlLocals.$layerInstance = layerInstance;
                                angular.forEach(tplAndVars[1], function (value, key) {
                                    ctrlLocals[key] = value;
                                });

                                ctrlInstantiate = $controller(layerOptions.controller, ctrlLocals, true);
                                if (layerOptions.controllerAs) {
                                    ctrlInstance = ctrlInstantiate.instance;

                                    if (layerOptions.bindToController) {
                                        ctrlInstance.$close = layerScope.$close;
                                        ctrlInstance.$dismiss = layerScope.$dismiss;
                                        angular.extend(ctrlInstance, providedScope);
                                    }

                                    ctrlInstance = ctrlInstantiate();

                                    layerScope[layerOptions.controllerAs] = ctrlInstance;
                                } else {
                                    ctrlInstance = ctrlInstantiate();
                                }

                                if (angular.isFunction(ctrlInstance.$onInit)) {
                                    ctrlInstance.$onInit();
                                }
                            }

                            // html
                            var showFrame = function (layerOptions, layerScope) {
                                var layerContainer = $('#' + layerOptions.layerContainer) || $('.layerContainer');
                                layerContainer.attr('role', 'layerContainer');// 标记个属性，方便别的地方取
                                //<a href="javascript:;" class="btn btn-default layer-close-btn" ng-click="cancel()"> <i class="glyphicon glyphicon-remove" title="关闭"></i> </a>
                                var layerContent = $('<div role="layerContent"></div>');// 关闭时取role=layerContent的层
                                layerContent.addClass(layerOptions.windowClass);
                                layerContent.addClass(layerContainer.attr('class'));
                                layerContent.zIndex(layerContainer.zIndex() + 11);// 人员信息图标zindex是11

                                $templateRequest(layerOptions.templateUrl).then(function (html) {
                                    var timer = 500;
                                    var templateHtml = angular.element(html);
                                    layerContainer.after(layerContent.append(templateHtml));
                                    layerContent.css({ opacity: 0.5, top: '50%', bottom: '50%', left: '40%', right: '40%' });
                                    layerContent.animate({
                                        opacity: 1,
                                        top: layerContainer.css('top'),
                                        bottom: layerContainer.css('bottom'),
                                        left: layerContainer.css('left'),
                                        right: layerContainer.css('right')
                                    }, timer);
                                    $compile(templateHtml)(layerScope);

                                    layerInstance.layerContent = layerContent;
                                    layerInstance.layerContainer = layerContainer;

                                    setTimeout(function () {
                                        layerContainer.hide();
                                    }, timer);
                                });

                                //layerContent.hover = true;
                                //layerContent.on('mouseenter', function () {
                                //    layerContent.hover = true;
                                //});
                                //layerContent.on('mouseleave', function () {
                                //    layerContent.hover = false;
                                //});

                                //$document.find('body').on('click', function () {
                                //    if (!layerContent.hover)
                                //        $layer.dismiss();
                                //});
                            }
                            showFrame(layerOptions, layerScope);

                            layerOpenedDeferred.resolve(true);

                        }, function resolveError(reason) {
                            layerOpenedDeferred.reject(reason);
                            layerResultDeferred.reject(reason);
                        })['finally'](function () {
                            if (promiseChain === samePromise) {
                                promiseChain = null;
                            }
                        });

                    return layerInstance;
                };

                $layer.close = function (layerInstance, result) {
                    layerInstance.deferred.resolve(result);
                    $layer.dismiss(layerInstance, '$layer.close');
                };

                $layer.dismiss = function (layerInstance, reason) {
                    var container = layerInstance ? layerInstance.layerContainer : $document.find('[role="layerContainer"]');
                    container.show();

                    var content = layerInstance ? layerInstance.layerContent : $document.find('[role="layerContent"]');

                    var timer = 300;
                    content.animate({
                        opacity: 0.5,
                        top: '50%',
                        bottom: '50%',
                        left: '40%',
                        right: '40%'
                    }, timer);
                    setTimeout(function () {
                        content.remove();
                    }, timer);

                    if (reason != '$layer.close' && layerInstance)
                        layerInstance.deferred.reject(reason);
                };

                $layer.fullscreen = function (layerInstance, full) {
                    if (full == true)
                        layerInstance.layerContent.addClass("fullscreen");
                    else
                        layerInstance.layerContent.removeClass("fullscreen");
                }

                return $layer;
            }
            ]
        };

        return $layerProvider;
    })

    // 该指令配合layer使用，点击某元素需要关闭弹出层时，使用该指令
    .directive("coverLayerClose", function ($coverLayer) {
        return {
            restrict: 'A',
            scope: {
                layerInstance: '=?'
            },
            link: function (scope, element, attrs) {
                element.bind("click", function () {
                    $coverLayer.dismiss(scope.layerInstance, 'cancel');
                });
            }
        };
    })
;