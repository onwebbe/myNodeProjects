"use strict";
const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var MongoDB = require("./mongodb.js");
var MySQLDB = require("./mysql");
var mongoDB = new MongoDB("localhost","TwoSiChuan");
//var mySqlDB = new MySQLDB("localhost","root","123456","TwoSiChuan");
var request = require('superagent');
var GetProxy = require('./GetProxy.js');
var runDate = moment().format('YYYY-MM-DD HH:mm:ss');
function TwoSiChuan(config){
  this.dataversion = 1;
  this.subcategory = '施工企业';
  this.category = '省内企业';
  this.logkey = "四川数据列表";
  this.executePageCount = 0;
  this.isLastPage = false;
  this.proxyServers = new GetProxy();
  this.pageIndex = 1;
}
TwoSiChuan.itemStr = "";
TwoSiChuan.prototype.start = function(){
  var self = this;
  this.proxyServers.getProxy()
  .then(function(){
    while(this.isLastPage) {
      var proxy = self.proxyServers.getNextProxy();
      self.step1(proxy);
    }
  });
  
}
TwoSiChuan.prototype.step1 = function(proxy){
  var that = this;
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_step1_Start_TwoSiChuan_step1", this.logkey);
  var itemData = [];
  var that = this;
  var nightmare = Nightmare({
    waitTimeout: 20000, // in ms
    gotoTimeout: 60000,
    pollInterval: 1000,
    show: true,
    switches: {
      'proxy-server': proxy,
      'ignore-certificate-errors': true
    }
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
      //that.getPage(midN, res);
      that.gotoPage(midN, that.pageIndex);
    })
    .catch(function(e){
      mongoDB.addLog(this.category+":"+this.subcategory, "error", "TwoSiChuan_step1_Start_TwoSiChuan:"+e, this.logkey);
      console.log(e);
    });
  return this;
}
TwoSiChuan.prototype.getPage = function(nightM, html, isSavePage){
  var that = this;
  this.executePageCount ++;
  if(this.executePageCount==3) {
    mongoDB.addLog(that.category+":"+that.subcategory, "info", "TwoSiChuan_getPage_PageCount:"+this.executePageCount+"，关闭:"+isSavePage, that.logkey);
    nightM.evaluate(function(){
      return "end";
    }).end().then(function(){
      return null;
    });
    mongoDB.close();
    return;
  }

  mongoDB.addLog(that.category+":"+that.subcategory, "info", "TwoSiChuan_getPage_start:isSavePage:"+isSavePage, that.logkey);
  if(!this.checkIfCorrectPage(nightM, html)) {
    return;
  }
  if(isSavePage == null) {
    isSavePage = true;
  }
  if(isSavePage){
    that.saveListData(html);
  }
  
  let $ = cheerio.load(html);
  var paginator = $("td.paginator>*");
  var nextPageEle = paginator[paginator.length-1];
  var nextEleIndx = paginator.length - 1;
  var isHaveNextPage = $(nextPageEle).attr("disabled");
  this.isLastPage = isHaveNextPage;
  mongoDB.addLog(that.category+":"+that.subcategory, "info", "TwoSiChuan_getPage_isHaveNextPage:"+isSavePage, that.logkey);
  if(isHaveNextPage != null){
    mongoDB.addLog(that.category+":"+that.subcategory, "info", "TwoSiChuan_getPage_没有下一页了，关闭:"+isSavePage, that.logkey);
    nightM.evaluate(function(){
      return "end";
    }).end().then(function(){
      return null;
    });
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
TwoSiChuan.prototype.gotoPage = function(nightM, pageIndex) {
  var that = this;
  let defer = Q.defer();
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_gotoPage_Start_goto_page_Index:"+pageIndex, this.logkey);
  nightM
    .wait(1000)
    .goto('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type=101&arcode=51&myparam='+pageIndex)
    .wait(".paginator")
    .evaluate(function() {
      var pageLocation = window.location.href;
      var params = pageLocation.split("=");
      var pageIndex = params[params.length-1];
      var jsRun  = "<a class='myownpaginator' onclick=\""+"__doPostBack('ctl00$mainContent$gvPager', " + pageIndex + ");" + "\">test</a>";
      var addEle = $(jsRun);
      $("body").append(addEle);
      return document.body.innerHTML;
    })
    .then(function(res) {
      nightM
        .wait(5000)
        .click("a.myownpaginator")
        .wait(".paginator")
        .wait(5000)
        .evaluate(function() {
          return document.body.innerHTML;
        })
        .then(function(reshtml) {
          that.getPage(nightM, reshtml, false);
        });
    })
    return defer.promise;
}
TwoSiChuan.prototype.checkIfCorrectPage = function(nightM, html) {
  var that = this;
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_checkIfCorrectPage_start_Check_If_Correct_Page", this.logkey);
  let $ = cheerio.load(html);
  if($("img[src='/CheckCode.aspx']").length>0) {
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_checkIfCorrectPage_!------Enter_Verify_Page-----", this.logkey);
    console.log("!!!!!!!!!!!!!error page!!!!!!!!!!!!!!!!");
    this.gotoPage(nightM, parseInt(this.pageIndex) + 1);
    return false;
  } else {
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_checkIfCorrectPage_page_correct:)", this.logkey);
    console.log("correct page");
  }
  return true;
}
TwoSiChuan.prototype.saveListData = function(html){
  mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_saveListData_start_save_page", this.logkey);
  let $ = cheerio.load(html);
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
    mongoDB.addLog(this.category+":"+this.subcategory, "info", "TwoSiChuan_saveListData_savecontent:"+JSON.stringify(data), this.logkey);
    mongoDB.insertSiChuanData(data);
  }
}
TwoSiChuan.prototype.processPageData = function(html){
  let $ = cheerio.load(html);
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

var sichuandata = new TwoSiChuan();
sichuandata.step1();
module.exports = TwoSiChuan;