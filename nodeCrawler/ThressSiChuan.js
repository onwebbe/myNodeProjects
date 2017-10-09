var Nightmare = require('nightmare');      
var nightmare = Nightmare({
    show: true,//显示electron窗口
    pollInterval: 7000,
    waitTimeout: 600000000/*, // in ms
    switches: {
      'proxy-server': '222.89.112.48:53281',
      'ignore-certificate-errors': true
    },
    openDevTools: {
      mode: 'detach'
    }*/
});
function gotoPage(nightmare, pageIndex){
    nightmare
//.useragent("Chrome")
    //加载页面
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51')
    .wait(".paginator")
    .wait(5000)
    .wait(function(){
        var listItem = jQuery(".paginator>a");
        for(var i=0;i<listItem.length;i++){
            var item = jQuery(listItem[i]);
            var itemC = item.text();
            console.log(itemC == '下页');
            if(itemC == '下页') {
                item.attr("href","javascript:__doPostBack('ctl00$mainContent$gvPager','"+pageIndex+"')")
                item[0].click();
                break;
            }
        }
        return true;
    }, pageIndex);
}
function getPageData(pageIndex){
    var nightmare = Nightmare({
        show: true,//显示electron窗口
        pollInterval: 7000,
        waitTimeout: 600000000/*, // in ms
        switches: {
          'proxy-server': '222.89.112.48:53281',
          'ignore-certificate-errors': true
        },*/
        ,openDevTools: {
          mode: 'detach'
        }
    });
    var tmpNightM = nightmare
//.useragent("Chrome")
    //加载页面
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51')
    .wait(".paginator")
    .wait(5000);
    if(pageIndex) {


        tmpNightM = tmpNightM.wait((pageIndex) => {
            console.log(pageIndex);
            // now we're executing inside the browser scope.
            var listItem = jQuery(".paginator>a");
            for(var i=0;i<listItem.length;i++){
                var item = jQuery(listItem[i]);
                var itemC = item.text();
                console.log(item[0]);
                console.log(itemC == '下页');
                if(itemC == '下页') {
                    console.log("found");
                    item.attr("href","javascript:__doPostBack('ctl00$mainContent$gvPager','"+pageIndex+"')")
                    item[0].click();
                    break;
                }
            }
            return true;
           }, pageIndex);
    }
    tmpNightM.wait(function(){
        if(document.querySelector(".paginator") == null) {
            return true;
        }
        if(jQuery("img[src='/CheckCode.aspx']").length>0) {  //如果有验证码出现了
            return true;
        }


        var rows = $(".table-tbody-bg tr");
        var pageIndex = $("td.paginator .cpb").text();
        this.pageIndex = pageIndex;
        var pageData = [];
        for(var i = 1; i < rows.length; i++) {
            var row = rows[i];
            var columns = $(row).find("td");
            var version = this.dataversion;
            var category = this.category;
            var subcategory = this.subcategory;
            var id = $(columns[0]).text();
            var pageindex = pageIndex;
            var place = $(columns[1]).text();
            var companyname = $(columns[2]).find("a").text();
            var certid = $(columns[3]).text();
            var lawman = $(columns[4]).text();
            var data = {
              'version': this.dataversion,
              'subcategory': subcategory,
              "category": category,
              "id": id,
              "pageindex": pageindex,
              "place": place,
              "companyname": companyname,
              "certid": certid,
              "lawman": lawman,
              "processed": false
            };
            pageData.push(data);
        }
        var pageDataStr = JSON.stringify(pageData);
        if(localStorage.savedData == null) {
            localStorage.savedData = pageDataStr;
        } else {
            var storedDataStr = localStorage.savedData;
            var storedDataObj = JSON.parse(storedDataStr);
            var concatedObj = storedDataObj.concat(pageData);
            localStorage.savedData = JSON.stringify(concatedObj);
        }



        var listItem = jQuery(".paginator>a");
        for(var i=0;i<listItem.length;i++){
            var item = jQuery(listItem[i]);
            var itemC = item.text();
            console.log(itemC == '下页');
            if(itemC == '下页') {
                console.log(item[0]);
                item[0].click();
                break;
            }
        }
    })
    .evaluate(function(){
        var storedDataStr = localStorage.savedData;
        var storedDataObj = JSON.parse(storedDataStr);
        return storedDataObj;
    })
    .end()
    .then(function(res){
      console.log(res);
    })
    .catch(function (error) {
      console.error('failed:', error);
    });
}

function test(){
    var nightmare = Nightmare({
        show: true,//显示electron窗口
        pollInterval: 7000,
        waitTimeout: 600000000/*, // in ms
        switches: {
          'proxy-server': '222.89.112.48:53281',
          'ignore-certificate-errors': true
        },
        openDevTools: {
          mode: 'detach'
        }*/
    });
    nightmare
//.useragent("Chrome")
    //加载页面
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51')
    .wait(".paginator")
    .wait(5000)
    .wait(function(){
        if(document.querySelector(".paginator") == null) {
            return true;
        }
        if(jQuery("img[src='/CheckCode.aspx']").length>0) {  //如果有验证码出现了
            return true;
        }


        var rows = $(".table-tbody-bg tr");
        var pageIndex = $("td.paginator .cpb").text();
        this.pageIndex = pageIndex;
        var pageData = [];
        for(var i = 1; i < rows.length; i++) {
            var row = rows[i];
            var columns = $(row).find("td");
            var version = this.dataversion;
            var category = this.category;
            var subcategory = this.subcategory;
            var id = $(columns[0]).text();
            var pageindex = pageIndex;
            var place = $(columns[1]).text();
            var companyname = $(columns[2]).find("a").text();
            var certid = $(columns[3]).text();
            var lawman = $(columns[4]).text();
            var data = {
              'version': this.dataversion,
              'subcategory': subcategory,
              "category": category,
              "id": id,
              "pageindex": pageindex,
              "place": place,
              "companyname": companyname,
              "certid": certid,
              "lawman": lawman,
              "processed": false
            };
            pageData.push(data);
        }
        var pageDataStr = JSON.stringify(pageData);
        if(localStorage.savedData == null) {
            localStorage.savedData = pageDataStr;
        } else {
            var storedDataStr = localStorage.savedData;
            var storedDataObj = JSON.parse(storedDataStr);
            var concatedObj = storedDataObj.concat(pageData);
            localStorage.savedData = JSON.stringify(concatedObj);
        }



        var listItem = jQuery(".paginator>a");
        for(var i=0;i<listItem.length;i++){
            var item = jQuery(listItem[i]);
            var itemC = item.text();
            console.log(itemC == '下页');
            if(itemC == '下页') {
                console.log(item[0]);
                item[0].click();
                break;
            }
        }
    })
    .evaluate(function(){
        var storedDataStr = localStorage.savedData;
        var storedDataObj = JSON.parse(storedDataStr);
        return storedDataObj;
    })
    .end()
    .then(function(res){
      console.log(res);
    })
    .catch(function (error) {
      console.error('failed:', error);
    });
}

getPageData(30);
console.log("---------------------------------------");
getPageData(550);
/*nightmare
    //加载页面
    .goto('http://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=1&tn=baidu&wd=test&oq=test')
    .wait("#page")
    .wait(function(){
        if(document.querySelector("#page") == null) {
            return false;
        }
        if(window.count == null) {
            window.count = 2;
        }
        if(window.count>8) {
            return true;
        }
        var listItem = jQuery("#page>a");
        for(var i=0;i<listItem.length;i++){
            var item = jQuery(listItem[i]);
            var itemC = item.text();
            if(itemC == window.count) {
                item.click();
                window.count ++;
                break;
            }
        }
        return false;
    })
    .evaluate(function(){
        return window.count;
    })
    .end()
    .then(function(res){
      console.log(res);
    })
    .catch(function (error) {
      console.error('failed:', error);
    });*/