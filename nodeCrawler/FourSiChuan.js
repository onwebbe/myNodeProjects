"use strict";
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
require('superagent-proxy')(request);
var runDate = moment().format('YYYY-MM-DD HH:mm:ss');
var GetProxy = require('./GetProxy.js');
var async = require('async');
/* 施工企业:101 监理企业:104 设计施工一体化:108 勘察单位:102 设计单位:103 检测机构:110*/
var index1 = '101';
var index2 = '51';
function FourSiChuan() {

}

FourSiChuan.protoytpe.testAsync = function () {
  var q = async.queue(function(task, callback) {
    console.log('hello ' + task.name);
    callback();
  }, 2);

  // assign a callback
  q.drain = function() {
  console.log('all items have been processed');
  };

  // add some items to the queue
  q.push({name: 'foo'}, function(err) {
    console.log('finished processing foo');
  });
  q.push({name: 'bar'}, function (err) {
    console.log('finished processing bar');
  });

  // add some items to the queue (batch-wise)
  q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
    console.log('finished processing item');
  });

}
FourSiChuan.prototype.getFirstPage = function () {
  var deferred = Q.defer();
  request.get('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type='+index1+'&arcode='+index2)
    .end(function (err, res) {
      let html = res.res.text;
      let $ = cheerio.load(html);
      let viewstate = $('#__VIEWSTATE').val();
      let viewstategenerator = $('#__VIEWSTATEGENERATOR').val();
      let eventtarget = $('#__EVENTTARGET').val();
      let eventargument = $('#__EVENTARGUMENT').val();
      let eventvalidation = $('#__EVENTVALIDATION').val();

      let viewObject = {
        'viewstate': viewstate,
        'viewstategenerator': viewstategenerator,
        'eventtarget': eventtarget,
        'eventvalidation': eventvalidation
      }
    });
}
FourSiChuan.prototype.getPageData = function (pageNum) {
  request.post('http://xmgk.scjst.gov.cn/QueryInfo/Ente/EnteList.aspx?type='+index1+'&arcode='+index2)
    .set('Content-Type', 'application/x-www-form-urlencoded').send(
      {
        '__VIEWSTATE': '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',
        '__VIEWSTATEGENERATOR': '__VIEWSTATEGENERATOR:E1A883C9',
        '__EVENTTARGET': 'ctl00$mainContent$gvPager',
        '__EVENTARGUMENT': pageNum,
        '__EVENTVALIDATION': 'ksNgTGRFTPhPB46JX2rKL98Uu5ye5ozPpz9s36YDl3ROKbWecUvrqyX/glfRuvSbZM9GIL3HWwx/VpfwDmX0n8TGOFGyr5pqS98c1VDpE4kh+7Rx94ipA3EkyqLpY65YVpnLjgH0vBo8rV2o7LhfKXTU5vIF7XZvv95sYKgzWKv23/ABy/eqOd9eygNvYBUH',
        'ctl00$mainContent$txt_entname': '',
        'ctl00$mainContent$lx114': '101',
        'ctl00$mainContent$cxtj': " where  1=1    and qylxbm = '"+index1+"'  and isnull(regadrCity,'') like '"+index2+"%'",
        'UBottom1:dg1': '',
        'UBottom1:dg2': '',
        'UBottom1:dg3': '',
        'UBottom1:dg4': '',
        'UBottom1:dg5': '',
        'UBottom1:dg6': ''
      }
    ).end(function(err, res) {
      var html = res.res.text;
      console.log(html);
    });
}
var t = new FourSiChuan();
t.getPageData(20);
