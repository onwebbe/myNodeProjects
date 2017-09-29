const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var MongoDB = require("./mongodb.js");
var MySQLDB = require("./mysql");
var mongoDB = new MongoDB("localhost","SiChuanListData");
//var mySqlDB = new MySQLDB("localhost","root","123456","SiChuanListData");
var request = require('superagent');
var runDate = moment().format('YYYY-MM-DD HH:mm:ss');
function SiChuanListData(config){
  this.dataversion = 1;
  this.subcategory = '施工企业';
  this.category = '省内企业';
  this.logkey = "四川数据列表";
}
SiChuanListData.itemStr = "";
SiChuanListData.prototype.step1 = function(){
  var that = this;
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_step1_Start_SiChuanListData_step1", this.logkey);
  var itemData = [];
  var that = this;
  var nightmare = Nightmare({
    waitTimeout: 120000, // in ms
    show: true
  });
  var midN = nightmare
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51')
    .wait(1000)
    .wait(".paginator")
    .wait(1000);
    midN.evaluate(function(){
      return document.body.innerHTML;
    })
    .then(function(res){
      //that.saveListData(res);
      //that.saveHTML("/MyProjects/1.html", res);
      that.getPage(midN, res);
      //that.gotoPage(midN, 100);
    })
    .catch(function(e){
      mongoDB.addLog(this.category+":"+this.subcategory, "error", "SiChuanListData_step1_Start_SiChuanListData:"+e, this.logkey);
      console.log(e);
    });
  return this;
}
SiChuanListData.prototype.getPage = function(nightM, html, isSavePage){
  var that = this;
  if(!this.checkIfCorrectPage(nightM, html)) {
    return;
  }
  if(isSavePage == null) {
    isSavePage = true;
  }
  if(isSavePage){
    that.saveListData(html);
  }
  
  $ = cheerio.load(html);
  var paginator = $("td.paginator>*");
  var nextPageEle = paginator[paginator.length-1];
  var nextEleIndx = paginator.length - 1;
  var isHaveNextPage = $(nextPageEle).attr("disabled");
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_getPage_isHaveNextPage:"+isSavePage, this.logkey);
  if(isHaveNextPage != null){
    mongoDB.addLog(that.category+":"+that.subcategory, "info", "SiChuanListData_getPage_没有下一页了，关闭:"+isSavePage, that.logkey);
    nightM.end();
    mongoDB.close();
    return;
  }
  var randomTime = Math.random()*1000 + 3000;
  nightM
    .wait(1000)
    .click("td.paginator>*:nth-child("+nextEleIndx+")")
    .wait(function() {
      if (document.querySelector(".paginator") != null ||
          document.querySelector("img[src='/CheckCode.aspx']") != null) {
        return true;
      }
    })
    .wait(1000 + randomTime)
    .evaluate(function(){
        return document.body.innerHTML;
    })
    .then(function(res){
      that.getPage(nightM, res);
    })
}
SiChuanListData.prototype.gotoPage = function(nightM, pageIndex) {
  var that = this;
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_gotoPage_Start_goto_page_Index:"+pageIndex, this.logkey);
  nightM
    .wait(60000)
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51&myparam='+pageIndex)
    .wait(".paginator")
    .evaluate(function() {
      var pageLocation = window.location.href;
      var params = pageLocation.split("=");
      var pageIndex = params[params.length-1];
      __doPostBack('ctl00$mainContent$gvPager', pageIndex);
    })
    .then(function() {
      nightM.wait(".paginator")
            .evaluate(function() {
              return document.body.innerHTML;
            })
            .then(function(res) {
              that.getPage(nightM, res, false);
            });
    })
}
SiChuanListData.prototype.checkIfCorrectPage = function(nightM, html) {
  var that = this;
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_checkIfCorrectPage_start_Check_If_Correct_Page", this.logkey);
  $ = cheerio.load(html);
  if($("img[src='/CheckCode.aspx']").length>0) {
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_checkIfCorrectPage_!------Enter_Verify_Page-----", this.logkey);
    console.log("!!!!!!!!!!!!!error page!!!!!!!!!!!!!!!!");
    this.gotoPage(nightM, parseInt(this.pageIndex) + 1);
    return false;
  } else {
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_checkIfCorrectPage_page_correct:)", this.logkey);
    console.log("correct page");
  }
  return true;
}
SiChuanListData.prototype.saveListData = function(html){
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_saveListData_start_save_page", this.logkey);
  $ = cheerio.load(html);
  var rows = $(".table-tbody-bg tr");
  var pageIndex = $("td.paginator .cpb").text();
  this.pageIndex = pageIndex;
  for(let i = 1; i < rows.length; i++) {
    let row = rows[i];
    let columns = $(row).find("td");
    let version = this.dataversion;
    let category = this.category;
    let subcategory = this.subcategory;
    let id = $(columns[0]).text();
    let pageindex = pageIndex;
    let place = $(columns[1]).text();
    let companyname = $(columns[2]).find("a").text();
    let certid = $(columns[3]).text();
    let lawman = $(columns[4]).text();
    let data = {
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
    }
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "SiChuanListData_saveListData_savecontent:"+JSON.stringify(data), this.logkey);
    mongoDB.insertSiChuanData(data);
  }
}
SiChuanListData.prototype.processPageData = function(html){
  $ = cheerio.load(html);
  var rows = $(".table-tbody-bg tr");

  var paginator = $(".paginator a");
  var nextPageEle = paginator[paginator.length-2];
  var isHaveNextPage = $(nextPageEle).attr("disabled");
  return;
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    let items = $(row).find("td");
    for (let j = 0; j < items.length; j++) {
      let item = items[j];
      console.log($(item).text());
    }
  }
}

var sichuandata = new SiChuanListData();
sichuandata.step1();
module.exports = SiChuanListData;