'use strict';
var fs = require('fs');
var Q = require('q');
var MongoDB = require('./mongodb.js');
var mongoDB = new MongoDB('localhost', 'SiChuanListData');
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

function UpdateProcessedSiChuanListData(){

}
UpdateProcessedSiChuanListData.prototype.update = function() {
  mongoDB.findZhuJianBu().then(function(data) {
    var updateList = [];
    for(let i = 0; i < data.length; i++) {
      let item = data[i];
      let id = item.index;
      console.log('updating:id:'+id+':name:'+item.name);
      updateList.push(mongoDB.updateSiChuanData({id:id}, {processed: true}));
    }
    Q.allSettled(updateList)
      .then(function () {
        mongoDB.close();
      });
    //mongoDB.close();
  });
}
var processor = new UpdateProcessedSiChuanListData();
processor.update();
module.exports = UpdateProcessedSiChuanListData;