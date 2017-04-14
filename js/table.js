/**
 * Created by yaolei on 2016/4/13.
 */
angular.module('excel', ['ngRoute', 'ngResource'], function ($compileProvider) {
    $compileProvider.directive("excel", ['$compile', '$timeout', function ($compile, $timeout) {
        return {
            restrict: 'EA',
            transclude: true,
            //template: "<div ng-transclude='true'></div>",
            templateUrl: '/v2/template/excelTable.html',
            scope: {
                code: "=",
                arithmetic: "=",
                cells: "=",
                handler: "=",
                organizationName: "=",
                shortName: "=",
                formIndex: "=",
                inverse: "="
            },
            link: function ($scope, element, attr) {
                function getColChar(colIndex) {
                    var s = "";
                    colIndex--;
                    do {
                        s = String.fromCharCode(colIndex % 26 + 65) + s;
                        colIndex = colIndex / 26;
                        colIndex = Math.floor(colIndex) - 1;
                    } while (colIndex >= 0);
                    return s;
                }
                function getColIndex(colStr) {
                    var colIndex = 0;
                    do {
                        colIndex = colIndex * 26 + colStr.charCodeAt(0) - 64;
                        colStr = colStr.substring(1);

                    } while (colStr.length > 0)
                    return colIndex;
                }

                function render() {
                    //if (attr.ngCode) {
                    $scope.handler.loading();
                    var excel_html = $scope.code.$$unwrapTrustedValue();
                    var excel_content = element.find(".excel_content");
                    excel_content.html(excel_html);
                    excel_content.find("input").attr("ng-click", "inverseQuery($event)")
                    $compile(excel_content.contents())($scope);
                    //}
                    var tab = element.find(".excel_content table");
                    var trs = tab.find("tr");
                    var firstTds = trs[0].children;
                    var colCount = 0;
                    for (var i = 0; i < firstTds.length; i++) {
                        colCount++;
                        var colspan = firstTds[i].attributes["colspan"] ? firstTds[i].attributes["colspan"].value : 1;
                        if (!isNaN(colspan))
                            colCount += colspan - 1;
                    }
                    var lastTr = "<tr>";

                    for (var i = 0; i < colCount; i++) {
                        lastTr += "<td></td>";
                    }
                    lastTr += "</tr>";
                    angular.element(tab[0].tBodies[0]).append(lastTr);
                    trs = tab.find("tr");
                    var tds = trs[trs.length - 1].children;
                    $scope.rows = [];
                    $scope.cols = [];
                    for (var i = 0; i < trs.length - 1; i++) {
                        $scope.rows.push(i + 1);
                    }
                    for (var i = 0; i < tds.length; i++) {
                        $scope.cols.push(getColChar(i + 1));
                    }


                    var calcList = $scope.arithmetic ? $scope.arithmetic.split("\r\n") : [];
                    $scope.cellCalc = {};
                    var reger = new RegExp("([A-Z]{1,3}[0-9]{1,9})=");
                    for (var i = 0; i < calcList.length; i++) {
                        var key = reger.exec(calcList[i])[1];
                        calcList[i] = calcList[i].replace(/([A-Z]{1,3}[0-9]{1,9})/g, "cells.t" + $scope.formIndex + "_$1");
                        $scope.cellCalc[key] = calcList[i];
                    }

                    for (var key in $scope.cellCalc) {
                        var equreIndex = $scope.cellCalc[key].indexOf("=");
                        var calcList = $scope.cellCalc[key].substring(equreIndex + 1).split(/[+-]+/);
                        for (var i = 0; i < calcList.length; i++) {
                            if (typeof (eval("$scope." + calcList[i])) == "undefined") {
                                eval("$scope." + calcList[i] + "=0;");
                            }
                        }
                    }
                    element.find("input").each(function (index, dom) {
                        angular.element(dom).bind("change", function (el, a, b) {
                            el.target.style.color = "blue";
                            $scope.haschange = true;
                        });

                        angular.element(dom).bind("focus", function (el) {
                            var id = el.target.id;
                            var colStr = id.replace(/[0-9]*/g, "");
                            var rowStr = id.replace(/[A-Z]*/g, "");
                            var row = parseInt(rowStr);
                            $scope.currentRow = row;
                            $scope.currentCol = colStr;
                        });
                        angular.element(dom).bind("keydown", function (el, a, b) {
                            if (el.keyCode >= 37 && el.keyCode <= 40) {
                                var id = el.target.id;
                                var colStr = id.replace(/[0-9]*/g, "");
                                var rowStr = id.replace(/[A-Z]*/g, "");
                                var row = parseInt(rowStr);
                                var col = getColIndex(colStr);
                                var rowSpan = 0, colSpan = 0;
                                switch (el.keyCode) {
                                    case 37:
                                        colSpan = -1;
                                        break;
                                    case 39:
                                        colSpan = 1;
                                        break;
                                    case 38:
                                        rowSpan = -1;
                                        break;
                                    case 40:
                                        rowSpan = 1;
                                        break;
                                }
                                var newFocusID = "";
                                var newFocusDom;
                                do {
                                    row += rowSpan;
                                    col += colSpan;
                                    newFocusID = getColChar(col) + row;
                                    newFocusDom = document.getElementById(newFocusID);
                                } while (row > 0 && col > 0 && row < 50 && col < 50 && !newFocusDom);
                                if (newFocusDom) {
                                    newFocusDom.focus();
                                    newFocusDom.select();
                                }
                                el.originalEvent.returnValue = false;
                            }
                        });
                        angular.element(dom.parentElement).bind("click", function () {
                            dom.focus();
                        });
                    });
                    $scope.inverseQuery = function ($event) {
                        if ($scope.inverse)
                            $scope.inverse($event);
                    }
                    $scope.$watch(function () {
                        return tab[0].offsetWidth;
                    }, function (value) {
                        $scope.resize();
                    });
                    $scope.resize = function () {
                        if (trs[trs.length - 1].offsetHeight == 0)
                            return;
                        var rows = angular.element(element[0].querySelector('.excel_row tbody')).children();
                        rows[0].style.height = "20px";
                        for (var i = 0; i < trs.length - 1; i++) {
                            var height = angular.element(trs[i]).height();
                            var row = rows[i + 1];
                            row.style.height = height + "px";
                            row.style.lineHeight = height -1 + "px";
                            if (trs[i].style.display == "none"||height==0)
                                rows[i + 1].style.display = "none";
                            else
                                rows[i + 1].style.display = "";
                        }
                        var cols = angular.element(element[0].querySelector(".excel_col tbody tr")).children();
                        for (var i = 0; i < tds.length; i++) {
                            cols[i].style.width = (tds[i].offsetWidth) + "px";
                        }
                        var lastTr = trs[trs.length - 1];
                        lastTr.className = "noborder";
                    };
                    $scope.autoCalc = function (cells, str) {
                        eval(str);
                    };
                    $timeout(function () {
                        $scope.loading = false;
                        $scope.$applyAsync($scope.loading);
                        for (var key in $scope.cellCalc)
                            $scope.autoCalc($scope.cells, $scope.cellCalc[key]);
                        $timeout(function () { $scope.resize(); }, 100);
                    });
                    $scope.handler.resize = function () {
                        setTimeout(function () {
                            $scope.resize();
                        }, 10);
                    };
                }
                $scope.handler.loading = function () {
                    $scope.loading = true;
                    $scope.$applyAsync($scope.loading)
                }
                element.attr("class", "excel");
                render();
                $scope.handler.render = render;
                $scope.$watch("cells", function (newValue, oldValue) {
                    for (var key in $scope.cellCalc)
                        $scope.autoCalc($scope.cells, $scope.cellCalc[key]);
                }, true);

            }
        };
    }]);
});