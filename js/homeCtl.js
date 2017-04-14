var app = angular.module('app', ['chart.js', 'ui.bootstrap', 'sysconfigModule', 'treeControl', 'honzh', 'flow', 'ng.ueditor', 'ngTagsInput', 'ngResource', 'ngAnimate', 'noticeSercice']);
app.controller("homeCtl", ['$scope', '$uibModal', '$uibModalStack', '$location', '$homepage', '$interval', function ($scope, $uibModal, $uibModalStack, $location, $homepage, $interval) {
    $scope.pieOptions = {
        legendTemplate: '<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<segments.length; i++){%><li><span style="background-color:<%=segments[i].fillColor%>"></span><%if(segments[i].label){%><%=segments[i].label%><%=segments[i].value%><%}%></li><%}%></ul>'
    };
    $scope.barOptions = {
        scaleFontFamily: "'Arial'",
        scaleFontSize: 10,
        animation: true,
    };
    var dataReady = false;
    //#region 工作提醒 系统公告 照片墙
    $homepage.GetWorkRemindData().then(function (result) {
        $scope.BacklogCount = result.BacklogCount ? result.BacklogCount : 0;
        $scope.ReadMemberPositive = result.PositiveCount ? result.PositiveCount : 0;
        $scope.BirthdayMemberRemind = result.BirthdayMemberCount ? result.BirthdayMemberCount : 0;
        $scope.WithoutThoughtReportCount = result.WithoutThoughtReportCount ? result.WithoutThoughtReportCount : 0;
        $scope.ThreeMonthsCount = result.PartyDuesOverdueCount.ThreeMonths ? result.PartyDuesOverdueCount.ThreeMonths : 0;
        $scope.FourMonthsCount = result.PartyDuesOverdueCount.FourMonths ? result.PartyDuesOverdueCount.FourMonths : 0;
        $scope.SixMonthsCount = result.PartyDuesOverdueCount.SixMonths ? result.PartyDuesOverdueCount.SixMonths : 0;
        $scope.DefectArchiveCount = result.DefectArchiveCount ? result.DefectArchiveCount : 0;
        $scope.LastWeekBacklogData = result.LastWeekBacklogData;
        dataReady = true;
        $scope.NoteWithOrgList = result.NoteWithOrgList;

        $scope.ListOrganizationV2TypeCount = result.IndexTotalCount.ListOrganizationV2TypeCount;
        $scope.ListPartyMemberV2TypeCount = result.IndexTotalCount.ListPartyMemberV2TypeCount;
        $scope.PartyMemberTotal1 = result.IndexTotalCount.PartyMemberTotal.slice(0, 5);
        $scope.PartyMemberTotal2 = result.IndexTotalCount.PartyMemberTotal.slice(5, 10);

        // 活动图片墙
        var imgs = new Array;
        for (var i = 0; i < result.ActivityImgList.length; i++) {
            var img = {
                title: result.ActivityImgList[i].ActivityTitle,
                src: result.ActivityImgList[i].PhotoWallPath,
                href: "",
                id: result.ActivityImgList[i].ID

            };
            imgs.push(img);
        }
        $scope.IndexImgs = imgs;

    });

    //#endregion
    

    $homepage.scrollData = function () {
        if (dataReady && $scope.LastWeekBacklogData.length > 6) {
            $scope.LastWeekBacklogData.push($scope.LastWeekBacklogData.shift());
        }
    }
    $interval($homepage.scrollData, 3000);

    // 首页统计v2
    $homepage.GetHomePageStatistics().then(function (result) {
        // 排行
        $scope.PartyWorkingCommitteeActivityCountRank = result.PartyWorkingCommitteeActivityCountRank;
        $scope.PartyBranchActivityCountRank = result.PartyBranchActivityCountRank;
        $scope.PartyWorkingCommitteeInformationIntegrityRank = result.PartyWorkingCommitteeInformationIntegrityRank;
        $scope.PartyBranchInformationIntegrityRank = result.PartyBranchInformationIntegrityRank;
        // 党员年龄分析
        var PartyMemberAgeAnalysisLabels = ['30-', '30-40', '40-50', '50-60', '60-70', '70-80', '80+'];
        var PartyMemberAgeAnalysisData = new Array();
        for (var i = 0; i < PartyMemberAgeAnalysisLabels.length; i++) {
            PartyMemberAgeAnalysisData.push(result.PartyMemberAgeAnalysis[0][PartyMemberAgeAnalysisLabels[i]]);
        }
        $scope.PartyMemberAgeAnalysis = {
            labels: PartyMemberAgeAnalysisLabels,
            data: new Array(PartyMemberAgeAnalysisData)
        };
        // 党组织性质
        var PartyOrganizationNatureAnalysisLabels = ['机关党组织', '社区党组织', '村党组织', '学校党组织', '“两新”党组织'];
        var PartyOrganizationNatureAnalysisData = new Array();
        for (var j = 0; j < PartyOrganizationNatureAnalysisLabels.length; j++) {
            PartyOrganizationNatureAnalysisData.push(result.PartyOrganizationNatureAnalysis[0][PartyOrganizationNatureAnalysisLabels[j]]);
        }
        $scope.PartyOrganizationNatureAnalysis = {
            labels: PartyOrganizationNatureAnalysisLabels,
            data: PartyOrganizationNatureAnalysisData
        };
        // 党员党龄分布
        var PartyStandingDistributionLabels = ['10-', '10-15', '15-20', '20-30', '30-40', '40-50', '50+'];
        var PartyStandingDistributionData = new Array();
        for (var k = 0; k < PartyStandingDistributionLabels.length; k++) {
            PartyStandingDistributionData.push(result.PartyStandingDistribution[0][PartyStandingDistributionLabels[k]]);
        }
        $scope.PartyStandingDistribution = {
            labels: PartyStandingDistributionLabels,
            data: new Array(PartyStandingDistributionData)
        };
        // 党员学历分布
        var PartyMemberEducationDistributionLabels = ['研究生', '大学本科', '大学专科', '中专', '高中、中技', '初中及以下'];
        var PartyMemberEducationDistributionData = new Array();
        for (var l = 0; l < PartyMemberEducationDistributionLabels.length; l++) {
            PartyMemberEducationDistributionData.push(result.PartyMemberEducationDistribution[0][PartyMemberEducationDistributionLabels[l]]);
        }
        $scope.PartyMemberEducationDistribution = {
            labels: PartyMemberEducationDistributionLabels,
            data: PartyMemberEducationDistributionData
        };
    });
    
    //#endregion

    //#region 公告栏
    $scope.ID = -1;
    $scope.openNoticeRead = function (id) {
        var modalInstance = $uibModal.open({
            templateUrl: '/v2/config/html/noticeRead.html',
            animation: true,
            controller: 'noticeModelCtl',
            windowClass: 'partyMemberModal',
            size: 'lg',
            backdrop: 'static',
            resolve: {
                items: function () {
                    return id;
                }
            }
        });

    }
    $scope.IsDisplay = { IsDisplay: 1 };


    setTimeout(function () {
        $scope.waiting = false;
        $scope.$apply();
    }, 300);



}]);
app.controller('indexRemindCtrl', ['$scope', '$homepage', '$uibModal', '$uibModalInstance', '$uibModalStack', '$location', '$filter', 'flag', function ($scope, $homepage, $uibModal, $uibModalInstance, $uibModalStack, $location, $filter, flag) {
    $scope.titleName = flag.ItemName;
    $homepage.GetRemindMemberList().then(function (result) {
        switch (flag.ItemNameE) {
            case 'Activist':
                $scope.isJoinPartyOrganizationNameShow = true;
                $scope.dataList = result.Activist;
                break;
            case 'BecomeMember':
                $scope.isOrganizationNameShow = true;
                $scope.dataList = result.BecomeMember;
                break;
            case 'BirthdayMember':
                $scope.isOrganizationNameShow = true;
                $scope.dataList = result.BirthdayMember;
                break;
            case 'PotentialMember':
                $scope.isJoinPartyOrganizationNameShow = true;
                $scope.dataList = result.PotentialMember;
                break;
            case 'ProbationaryPartyMember':
                $scope.isJoinPartyOrganizationNameShow = true;
                $scope.dataList = result.ProbationaryPartyMember;
                break;
            case 'Proposer':
                $scope.isJoinPartyOrganizationNameShow = true;
                $scope.dataList = result.Proposer;
                break;

        }
    });
    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
    $scope.full = false;
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
}]);

app.service('$homepage', ['$sysapi', '$q', function ($sysapi, $q) {
    //首页-月度工作提醒明细 
    
    //首页-工作提醒  
    var GetWorkRemindData = function () {
        var deferred = $q.defer();
        var promise = deferred.promise;
        $sysapi.post({
            method: 'POST',
            url: "/PartyMember/PmPartyMemberV2/GetWorkRemindData",
            data: {
                _dc: Math.random,
            }
        })
            .success(function (data) {
                var result = data.Data;
                deferred.resolve(result);
            });
        return promise;
    };
    
    //首页-统计v2
    var GetHomePageStatistics = function () {
        var deferred = $q.defer();
        var promise = deferred.promise;
        $sysapi.post({
            method: 'POST',
            url: "/Report/Statistics/GetHomePageStatistics",
            data: {
                _dc: Math.random,
                rankCount: 5
            }
        })
            .success(function (data) {
                var result = data.Data;
                deferred.resolve(result);
            });
        return promise;
    };

    //查看基层活动
    var getBaseActivityList = function (id) {
        var deferred = $q.defer();
        var promise = deferred.promise;
        $sysapi.post({
            method: 'POST',
            url: "/PartyActivity/PaPartyActivityV2/GetModelByID",
            data: { ID: id }
        })
            .success(function (data) {
                var result = data.Data;
                deferred.resolve(result);
            });
        return promise;
    };

    return {
        GetWorkRemindData: GetWorkRemindData,
        getBaseActivityList: getBaseActivityList,
        GetHomePageStatistics: GetHomePageStatistics
    };

}]);

app.directive('imgshow', function ($uibModal) { // 图片滚动（自动滚，可控制前进和后退，容器宽度随意）
    return {
        restrict: 'A',
        replace: true, // default false
        scope: {
            imgs: '=',// [{title:"",href:"",src:""}]
            delay: '=',// 滚动间隔(毫秒)
            speed: '='// 滚动速度(毫秒)

        },
        link: function (scope, elm, attr) {
            function render() {
                if (!scope.imgs)
                    return;
                scope.itemWidth = 0;
                scope.itemLength = scope.imgs.length;
                scope.ulLeft = 0;
                scope.prev = function () {
                    scope.itemMarginLeft = parseInt(elm.find('li:first').css('marginLeft'));
                    scope.itemMarginRight = parseInt(elm.find('li:first').css('marginRight'));
                    scope.itemWidth = parseInt(elm.find('li:first').outerWidth()) + scope.itemMarginLeft + scope.itemMarginRight;
                    scope.ulWidth = scope.itemLength * scope.itemWidth;
                    if (scope.ulWidth <= elm.width()) return; // 内容过小时不滚动
                    if (scope.ulLeft >= 0) {
                        scope.ulLeft = -(scope.ulWidth - elm.width() - scope.itemMarginRight);
                    }
                    scope.ulLeft += scope.itemWidth;
                    if (scope.ulLeft < scope.itemWidth && scope.ulLeft > 0) {
                        scope.ulLeft = 0; // 新的宽度值不足一个item时只滚动完这个item
                    }
                    elm.find('ul').css('width', scope.ulWidth + 'px');
                    elm.find('ul').stop().animate({ 'left': scope.ulLeft + 'px' }, scope.speed);
                }
                scope.next = function () {
                    scope.itemMarginLeft = parseInt(elm.find('li:first').css('marginLeft'));
                    scope.itemMarginRight = parseInt(elm.find('li:first').css('marginRight'));
                    scope.itemWidth = parseInt(elm.find('li:first').outerWidth()) + scope.itemMarginLeft + scope.itemMarginRight;
                    scope.ulWidth = scope.itemLength * scope.itemWidth;
                    if (scope.ulWidth <= elm.width()) return; // 内容过小时不滚动
                    scope.ulLeft -= scope.itemWidth;
                    var surplus = scope.ulWidth - elm.width() - Math.abs(scope.ulLeft);
                    if (surplus < 0 && Math.abs(surplus) >= scope.itemWidth - scope.itemMarginLeft - scope.itemMarginRight) {
                        scope.ulLeft = 0;
                    }
                    if (surplus < 0 && Math.abs(surplus) < scope.itemWidth - scope.itemMarginLeft - scope.itemMarginRight) {
                        scope.ulLeft = -(scope.ulWidth - elm.width() - scope.itemMarginRight);
                    }
                    elm.find('ul').css('width', scope.ulWidth + 'px');
                    elm.find('ul').stop().animate({ 'left': scope.ulLeft + 'px' }, scope.speed);
                }
                scope.openBaseActivity = function (id) {
                    var modalInstance = $uibModal.open({
                        templateUrl: '/v2/activity/html/baseActivityRead.html',
                        animation: true,
                        controller: 'baseActivityReadCtl',
                        windowClass: 'partyMemberModal',
                        size: 'lg',
                        backdrop: 'static',
                        resolve: {
                            activityID: function () {
                                return id;
                            }
                        }
                    });
                }
                var run;
                scope.play = function () {
                    run = setInterval(function () { scope.next() }, scope.delay);
                }
                scope.play();
                elm.bind('mouseover', function () {
                    clearInterval(run);
                });
                elm.bind('mouseleave', function () {
                    scope.play();
                });
            }
            render();

            scope.$watch('imgs', function () {
                render();
            });
        },
        template: '\
			<div class="imgshow">\
                <div class="box">\
				    <ul>\
					    <li ng-repeat="item in imgs">\
                            <a title="{{item.title}}" ng-click="openBaseActivity(item.id)">\
                                <img ng-src="{{item.src}}?width=240&height=180&mode=crop" err-src="/v2/image/default_error.gif"  />\
                                <div class="title" ng-show="item.title">{{item.title}}</div>\
                            </a>\
					    </li>\
				    </ul>\
                </div>\
                <div class="btn-group btn-group-xs">\
                    <a href="javascript:;" class="btn btn-default prev" ng-click="prev()"><span class="glyphicon glyphicon-chevron-left"></span></a>\
                    <a href="javascript:;" class="btn btn-default next" ng-click="next()"><span class="glyphicon glyphicon-chevron-right"></span></a>\
                </div>\
			</div>\
		'
    }
});
app.directive("autotail", function () { // 自动截短加省略号的文字添加title属性用于显示完整文字
    return {
        restrict: 'C',
        link: function (scope, elm, attr) {
            elm.attr("title", elm.text());
        }
    };
});
app.directive("autoSwitchTab", function () { // 自动切换选项卡
    return {
        restrict: 'A',
        scope: {
            delay: '='// 滚动间隔(毫秒)
        },
        link: function (scope, elm, attr) {
            scope.tabIndex = 0;
            scope.next = function () {
                scope.tabIndex = elm.find('.nav-tabs .active').index();
                scope.tabMaxIndex = elm.find('.nav-tabs li').size() - 1;
                scope.tabIndex += 1;
                if (scope.tabIndex > scope.tabMaxIndex) scope.tabIndex = 0;
                elm.find('.nav-tabs li').removeClass('active')
                    .eq(scope.tabIndex).addClass('active');
                elm.find('.tab-content .tab-pane').removeClass('active in')
                    .eq(scope.tabIndex).addClass('active in');
            };
            var run;
            scope.play = function () {
                run = setInterval(function () { scope.next() }, scope.delay);
            }
            scope.play();
            elm.bind('mouseover', function () {
                clearInterval(run);
            });
            elm.bind('mouseleave', function () {
                scope.play();
            });
        }
    };
});
app.controller('baseActivityReadCtl', function ($scope, $homepage, $uibModal, $uibModalInstance, $uibModalStack, $location, $DataDictionaryItem, $filter, activityID) {
    $homepage.getBaseActivityList(activityID).then(function (result) {
        $scope.baseActivityItem = result.Model;
        $scope.baseActivityItem.OrganizationName = result.OrganizationName;
    });
    //#region 全屏
    $scope.full = false; // true 时需要取消以下行的注释
    //setTimeout(function () { // full==true 时因为 modal 上没有 .fullscreen 并不是全屏效果，需要使用以下代码添加 .fullscreen
    //    $scope.waiting = false;
    //    $scope.togglefullscreen(); // true > false : 第一次执行变为非全屏，需要再执行一次
    //    $scope.togglefullscreen(); // false > true : addClass('fullscreen'); true 时添加 .fullscreen 后就正常了
    //    $scope.$apply();
    //});
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
    //#endregion
    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
});
