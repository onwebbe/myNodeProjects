'use strict';
var config = require('config');
var fs = require('fs');
var Q = require('q');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var MongoDB = require('./mongodb.js');
var MySQLDB = require('./mysql.js');
var mongoDB = new MongoDB(config.get('databases.mongo.url'), config.get('databases.mongo.schema'));
var mySqlDB = new MySQLDB(config.get('databases.mysql.url'), config.get('databases.mysql.username'), config.get('databases.mysql.password'), config.get('databases.mysql.schema'));
var request = require('superagent');
require('superagent-proxy')(request);
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

function ClearnupSaveCompany() {

}

ClearnupSaveCompany.prototype.cleanZhuJianBuOverall = function() {

}
ClearnupSaveCompany.prototype.registEvent = function() {
  event.on('getRecordToRemove', function() { 
      console.log('some_event 事件触发'); 
  }); 
}
ClearnupSaveCompany.prototype.cleanZhuJianBuOverallOneCompany = function(companyid) {
  var sql = 'select * from companyInfoZhuJianBu where recordIndex=?';
  var params = [];
  params.push(companyid);
  mySqlDB.queryData(sql, params).then(function(data) {
    let recordToDelete = [];
    for (let i = 1; i < data.length; i ++) {
      let item = data[i];
      let companyid = item.companyid;
      recordToDelete.push(companyid);
    }
  })
}
ClearnupSaveCompany.prototype.clearCompany = function(companyids) {
  for (let i = 0; i < companyids.length; i++ ) {
    var companyId = companyids[i];
    var sql = 'delete companyInfoZhuJianBu where recordIndex=?';
  }
}

/* delete from companyInfoZhuJianBu WHERE recordIndex IN ( SELECT recordIndex FROM companyInfoZhuJianBu GROUP BY recordIndex HAVING count(recordIndex) > 1 ) AND companyid NOT IN ( SELECT min(companyid) FROM companyInfoZhuJianBu GROUP BY recordIndex HAVING count(recordIndex) > 1 )  
ORDER BY `companyInfoZhuJianBu`.`recordIndex` ASC
*/