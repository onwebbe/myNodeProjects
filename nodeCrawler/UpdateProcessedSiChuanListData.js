'use strict';
var config = require('config');
var fs = require('fs');
var Q = require('q');
var MongoDB = require('./mongodb.js');
var mongoDB = new MongoDB(config.get('databases.mongo.url'), config.get('databases.mongo.schema'));
var MySQLDB = require('./mysql.js');
var mySqlDB = new MySQLDB(config.get('databases.mysql.url'), config.get('databases.mysql.username'), config.get('databases.mysql.password'), config.get('databases.mysql.schema'));
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

function UpdateProcessedSiChuanListData(){

}
UpdateProcessedSiChuanListData.prototype.update = function() {
  var self = this;
  var deferred = Q.defer();
  mongoDB.findZhuJianBu().then(function(data) {
    var updatePromiseList = [];
    for(let i = 0; i < data.length; i++) {
      let item = data[i];
      let index = item.index;
      let name = item.name;
      if (name != null) {
        name = name.trim();
      }
      if (name != '') {
        updatePromiseList.push(self.checkUpdateMySQLDB(index, name));
      }
      
    }
    Q.allSettled(updatePromiseList).then(function() {
      deferred.resolve();
    });
  });
  return deferred.promise;
}

UpdateProcessedSiChuanListData.prototype.checkUpdateMySQLDB = function(index, name) {
  var deferred = Q.defer();
  let sql1 = 'select * from companyInfoZhuJianBu where recordIndex=?';
  let params1 = [];
  params1.push(index);
  console.log('params:' + params1.join());
  mySqlDB.queryData(sql1, params1).then(function(data) {
    if (data && data.length && data.length > 0) {
      let item = data[0];
      let companyName = item.companyName;
      let companyid = item.companyid;
      if (companyName == null) {
        companyName = '';
      }
      console.log('companyname:'+companyName);
      if (companyName.trim() == '') {
        let sql2 = 'update companyInfoZhuJianBu set companyName=? where companyid=?';
        let params2 = [];
        params2.push(name);
        params2.push(companyid);
        mySqlDB.queryData(sql2, params2).then(function(err, result){
          console.log('----------------start---companyid:'+companyid+':companyname:'+name+'-----------------------');
          console.log(err);
          console.log(result);
          console.log('----------------end---companyid:'+companyid+':companyname:'+name+'-----------------------');
          deferred.resolve();
        });
      } else {
        setTimeout(function() {
          deferred.resolve();
        }, 100);
      }
    } else {
      setTimeout(function() {
        deferred.resolve();
      }, 100);
    }
  });
  return deferred.promise;
}
var processor = new UpdateProcessedSiChuanListData();
processor.update().then(function() {
  console.log('--------------All Done---------------');
  setTimeout(function() {
    mongoDB.close();
    mySqlDB.close();
  }, 30000);
});
module.exports = UpdateProcessedSiChuanListData;