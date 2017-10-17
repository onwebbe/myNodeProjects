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
var GetProxy = require('./GetProxy.js');



var runDate = moment().format('YYYY-MM-DD HH:mm:ss');
var version = 1;
var information = "SiChuanZhuJianBuInfo";



var proxyServers = new GetProxy();
function SiChuanZhuJianBuData(config) {
  return '';
}
SiChuanZhuJianBuData.prototype.getNextProxy = function() {
  return proxyServers.getNextProxy();
};
SiChuanZhuJianBuData.prototype.getAllCompanyName = function() {
  var deferred = Q.defer();
  mongoDB.findSiChuanData({'processed': false}).then(function(data) {
    deferred.resolve(data);
  });
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getCompanyInfo = function(companyInfo) {
  var self = this;
  var companyName = companyInfo.companyname;
  var id = companyInfo.id;
  var theProxy = this.getNextProxy();
  console.log('Start getCompanyInfo:id:'+id+':name:'+companyName+':proxy:'+theProxy);
  request
    .post('http://jzsc.mohurd.gov.cn/dataservice/query/comp/list')
    .proxy('http://'+theProxy)
    .set('Content-Type', 'application/x-www-form-urlencoded').send(
      {
        qy_type: '',
        apt_scope: '',
        apt_code: '',
        qy_name: '',
        qy_code: '',
        apt_certno: '',
        qy_fr_name: '',
        qy_gljg: '',
        qy_reg_addr: '',
        qy_region: '',
        complexname: companyName
      }
    ).end(function(err, res) {
      if (res == null || res.res == null ) {
        console.log('getCompanyInfo_error_noreply:companyid:' + id + ':name:' + companyName);
        console.log(res);
      } else {
        var html = res.res.text;
        self.saveListData(html, id);
      }
    });
};
SiChuanZhuJianBuData.prototype.saveListData = function(html, index) {
  var itemObj = {};
  var $ = null;
  var items = null;
  try {
    $ = cheerio.load(html);
    items = $('.table_box .cursorDefault tr');
  } catch (e) {
    console.log('saveListData_error:'+e);
  }
  if ($ && items && items.length && items.length>0) {
    var item = $(items[0]);
    var tdItems = item.find('td');
    var id = $(tdItems[1]).text();
    var name = $(tdItems[2]).text();
    var url = 'http://jzsc.mohurd.gov.cn'+$(tdItems[2]).find('a').attr('href');
    var lawMan = $(tdItems[3]).text();
    var place = $(tdItems[4]).text();
    itemObj = {
      'index': parseInt(index),
      'id': id,
      'url': url,
      'name': name,
      'lawMan': lawMan,
      'place': place
    };
  } else {
    itemObj = {
      'index': parseInt(index),
      'id': '',
      'url': '',
      'name': '',
      'lawMan': '',
      'place': ''
    };
  }
  mongoDB.insertZhuJianBu(itemObj);
  mongoDB.updateSiChuanData({id:parseInt(index)}, {processed: true});
  return itemObj;
};

SiChuanZhuJianBuData.prototype.getCompanyDetailInfo = function(item) {
  console.log('start getCompanyDetailInfo');
  console.log(item);
  var self = this;
  var url = item.url;
  var index = item.index;
  var companyname = item.name;
  if(url == null || url == "" || url.indexOf('undefined')>=0) {
    console.log('getCompanyDetailInfo_nodata_id:' + index);
    var info = {
      recordIndex: index,
      companyUniqueCode: '',
      lawMan: '',
      category: '',
      city: '',
      address: '',
      certificateURL: '',
      registerPersonURL: '',
      projectURL: '',
      companyName: companyname
    };
    this.saveCompanyDetailInfoOverallToDB(info);
    return;
  }
  var theProxy = this.getNextProxy();
  request.get(url)
    .proxy('http://'+theProxy)
    .end(function(err, res) {
      if (res && res.res) {
        var html = res.res.text;
        self.saveCompanyDetailInfoOverall(html, index);
      } else {
        console.log('getCompanyDetailInfo_error_id:' + index);
        var info = {
          recordIndex: index,
          companyUniqueCode: '',
          lawMan: '',
          category: '',
          city: '',
          address: '',
          certificateURL: '',
          registerPersonURL: '',
          projectURL: '',
          companyName: companyname
        };
        self.saveCompanyDetailInfoOverallToDB(info);
      }
      
    });
  return;
};
SiChuanZhuJianBuData.prototype.saveCompanyDetailInfoOverall = function(html, saveIdx) {
  var $ = cheerio.load(html);
  var tdItems = $('.pro_table_box.datas_table td');
  var overAllInfo = {};
  overAllInfo['recordIndex'] = saveIdx;
  var replaceReg = '/\\t|\\n|\\s/g';
  for (var i=0; i<tdItems.length; i++) {
    var tdItem = $(tdItems[i]);
    switch (i) {
    case 0:
      overAllInfo['companyUniqueCode'] = tdItem.text().replace(eval(replaceReg), '');
      break;
    case 1:
      overAllInfo['lawMan'] = tdItem.text().replace(eval(replaceReg), '');
      break;
    case 2:
      overAllInfo['category'] = tdItem.text().replace(eval(replaceReg), '');
      break;
    case 3:
      overAllInfo['city'] = tdItem.text().replace(eval(replaceReg), '');
      break;
    case 4:
      overAllInfo['address'] = tdItem.text().replace(eval(replaceReg), '');
      break;
    default:
      break;
    }
  }
  var urls = $('.tinyTab.datas_tabs li a');
  for (i=0; i<urls.length; i++) {
    var url = $(urls[i]);
    var href = 'http://jzsc.mohurd.gov.cn'+url.attr('data-url');
    switch (i) {
    case 0:
      overAllInfo['certificateURL'] = href;
      break;
    case 1:
      overAllInfo['registerPersonURL'] = href;
      break;
    case 2:
      overAllInfo['projectURL'] = href;
      break;
    default:
      break;
    }
  }
  var companyName = $('.user_info.spmtop').text().replace(eval(replaceReg), '');
  overAllInfo['companyName'] = companyName;
  mongoDB.addLog('info', 'debug', 'get data:'+overAllInfo+' saveIdx:'+saveIdx, 'ZhuJianBuWebOverall');
  this.saveCompanyDetailInfoOverallToDB(overAllInfo);
};

SiChuanZhuJianBuData.prototype.saveCompanyDetailInfoOverallToDB = function(allInfo) {
  var self = this;
  var version = '';
  var runDate = '';
  var information = '';
  var sql = 'INSERT INTO `companyInfoZhuJianBu` (`companyUniqueCode`, `recordIndex`, `companyName`, `lawMan`, `category`, '
  +'`city`, `address`, `registerPersonURL`, `projectURL`, `certificateURL`, `version`, `updateDate`, `information`) VALUES '
  +'(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \''+version+'\', \''+runDate+'\', \''+information+'\')';
  var params = [];
  params.push(allInfo.companyUniqueCode);
  params.push(allInfo.recordIndex);
  params.push(allInfo.companyName);
  params.push(allInfo.lawMan);
  params.push(allInfo.category);
  params.push(allInfo.city);
  params.push(allInfo.address);
  params.push(allInfo.registerPersonURL);
  params.push(allInfo.projectURL);
  params.push(allInfo.certificateURL);
  mySqlDB.queryData(sql, params)
    .then(function(result) {
      mongoDB.updateZhuJuanBu({index:parseInt(allInfo.recordIndex)},{processed: true});
      // console.log(result);
    });
};











SiChuanZhuJianBuData.prototype.getZhuJianBuDetail = function() {
  var self = this;
  var sql = 'select * from companyInfoZhuJianBu where processedPerson is null and processedProject is null and processedCertificate is null';
  mySqlDB.queryData(sql).then(function(data) {
    var item = data[1];
    console.log(item);
    self.getZhuJianBuDetailOneCompany(item);
  });
};
SiChuanZhuJianBuData.prototype.getZhuJianBuDetailOneCompany = function(companyInfo) {
  var self = this;
  var deferred = Q.defer();
  var thecompanyid = companyInfo.companyid;
  var personURL = companyInfo.registerPersonURL;
  var projectURL = companyInfo.projectURL;
  var certificateURL = companyInfo.certificateURL;



  var deferredArray = [];
  if (personURL != null && personURL.trim() != ''){
    var deferredPerson = this.getZhuJianBuDetailSubPage(personURL, companyInfo, function(html, companyid){
      self.getZhuJianBuPersonPageSave(html, companyid);
      //self.getZhuJianBuPCertificatePageSave(html, companyid);
      //self.getZhuJianBuProjectPageSave(html, companyid);
    }, "getZhuJianBuPersonPageSave");
    deferredArray.push(deferredPerson);
  }
  if (projectURL != null && projectURL.trim() != ''){
    var deferredProject = this.getZhuJianBuDetailSubPage(projectURL, companyInfo, function(html, companyid){
      //self.getZhuJianBuPersonPageSave(html, companyid);
      //self.getZhuJianBuPCertificatePageSave(html, companyid);
      self.getZhuJianBuProjectPageSave(html, companyid);
    }, "getZhuJianBuProjectPageSave");
    deferredArray.push(deferredProject);
  }
  if (certificateURL != null && certificateURL.trim() != ''){
    var deferredCertificate = this.getZhuJianBuDetailSubPage(certificateURL, companyInfo, function(html, companyid){
      //self.getZhuJianBuPersonPageSave(html, companyid);
      self.getZhuJianBuPCertificatePageSave(html, companyid);
      //self.getZhuJianBuProjectPageSave(html, companyid);
    }, "getZhuJianBuPCertificatePageSave");
    deferredArray.push(deferredCertificate);
  }
  Q.allSettled(deferredArray)
    .then(function () {
      self.updateOneCompanyProcessedFlag(thecompanyid);
      deferred.resolve();
    });
  return deferred.promise;
  /*this.getZhuJianBuDetailSubPage(projectURL, companyInfo, function(html, companyid){
    //self.getZhuJianBuPersonPageSave(html, companyid);
    //self.getZhuJianBuPCertificatePageSave(html, companyid);
    self.getZhuJianBuProjectPageSave(html, companyid);
  }, "getZhuJianBuProjectPageSave").then(function() {
    console.log("project end");
  });

  this.getZhuJianBuDetailSubPage(certificateURL, companyInfo, function(html, companyid){
    //self.getZhuJianBuPersonPageSave(html, companyid);
    self.getZhuJianBuPCertificatePageSave(html, companyid);
    //self.getZhuJianBuProjectPageSave(html, companyid);
  }, "getZhuJianBuPCertificatePageSave").then(function() {
    console.log("certificate end");
  });*/
};
SiChuanZhuJianBuData.prototype.updateOneCompanyProcessedFlag = function(companyid) {
  var sql = 'update `companyInfoZhuJianBu` set processedPerson=true, processedProject=true, processedCertificate=true where companyid=?';
  var params = [];
  params.push(companyid);
  mongoDB.addLog('info', 'debug', 'Execute inser query:'+sql+'params:'+params.join(','), 'updateOneCompanyProcessedFlag');
  mySqlDB.queryData(sql, params)
    .then(function(result){
      //console.log(result);
    });
} 




SiChuanZhuJianBuData.prototype.getZhuJianBuDetailSubPage = function(url, companyInfo, saveFunction, saveFunctionName){
  if (!saveFunctionName) {
    saveFunctionName = "Default_Save_Function";
  }
  var self = this;
  var deferred = Q.defer();
  var companyid = companyInfo.companyid;
  var nextProxyItem = self.getNextProxy();
  mongoDB.addLog('info', 'debug', 'Start_processing_getZhuJianBuDetailSubPage:companyid:'+companyid+':url:'+url+':proxy:'+nextProxyItem, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
  request
    .get(url)
    .proxy('http://'+nextProxyItem)
    .timeout({
        response: 30000,  // Wait 5 seconds for the server to start sending,
        deadline: 30000, // but allow 1 minute for the file to finish loading.
      })
    .end(function(err, res) {
      //console.log(err);
      //console.log(res);
      mongoDB.addLog('info', 'debug', 'Get Data from:companyid:'+companyid+':url:'+url+':proxy:'+nextProxyItem, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
      try {
        if (err) {
          if (err.timeout) {
            console.log('getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName + 'error timeout get from server');
            mongoDB.addLog('error', 'debug', 'error timeout get from url:'+url, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
          } else {
            mongoDB.addLog('error', 'debug', 'error get from url:'+url, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
            console.log('getZhuJianBuDetailSubPage:saveFunction:' + saveFunctionName + 'error other get from server')
          }
          mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
          deferred.resolve();
          return;
        } else {
          var html = res.res.text;
          if (!res || !res.res) {
            mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
            deferred.resolve();
            return;
          } else {
            mongoDB.addLog('info', 'debug', 'start process page data page:'+'1'+' companyid:'+companyid, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
            saveFunction(html, companyid);
            self.getZhuJianBuDetailSubPagePagenation(html, url, companyInfo, saveFunction, saveFunctionName).then(function(){
              console.log("--------------------"+saveFunctionName+":END:companyid:"+companyid+"-----------------------------");
              mongoDB.addLog('info', 'debug', 'End process page data companyid:'+companyid, 'getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName);
              deferred.resolve();
            });
          }
          
        }
        
      } catch(e) {
        console.log('getZhuJianBuDetailSubPage:saveFunction:'+ saveFunctionName + 'Exception throws from getZhuJianBuDetailSubPage'+e);
      } finally {
        return;
      }
      return;
      
    });
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuDetailSubPagePagenation = function(html, url, companyInfo, saveFunction, saveFunctionName){
  if (!saveFunctionName) {
    saveFunctionName = "Default_Save_Function";
  }
  var $ = cheerio.load(html);
  var companyid = companyInfo.companyid;

  mongoDB.addLog('info', 'debug', 'Start processing getZhuJianBuDetailSubPagePagenation:companyid:'+companyid, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);

  var deferred = Q.defer();
  var deferredList = [];
  var pagnationSize = $("[sf='pagebar']").length
  console.log('getZhuJianBuDetailSubPagePagenation:size:' + $("[sf='pagebar']").length);
  mongoDB.addLog('info', 'debug', 'isHavePagenation:companyid:'+companyid+':isHavePagnation:'+pagnationSize, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);
  if (pagnationSize > 0) {
    var pagedata = $("[sf='pagebar']").attr("sf:data");
    var pageDataJSON = eval(pagedata);
    console.log('getZhuJianBuDetailSubPagePagenation:pageObj');
    console.log(pageDataJSON);
    mongoDB.addLog('info', 'debug', 'have pagenation:companyid:'+companyid+':pageData:'+pagedata, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);
    var totalPageNum = pageDataJSON.pc;
    this.savePageData(companyid, saveFunctionName, pageDataJSON);
    for (var i = 2; i <= totalPageNum; i++) {
      mongoDB.addLog('info', 'debug', 'StartProcessPage:companyid:'+companyid+':pageID:'+i, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);
      console.log('getZhuJianBuDetailSubPagePagenation:start_page:' + i);
      var defItem = this.getZhuJianBuSubPagePagenationData(url, pageDataJSON, i, companyid, saveFunction, saveFunctionName, i);
      deferredList.push(defItem);
    }
    Q.allSettled(deferredList)
      .then(function () {
        mongoDB.addLog('info', 'debug', 'All Page done:companyid:'+companyid, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);
        deferred.resolve();
      });
  } else {
    setTimeout(function(){
      mongoDB.addLog('info', 'debug', 'No Page, all done:companyid:'+companyid, 'getZhuJianBuDetailSubPagePagenation:saveFunction:'+ saveFunctionName);
      deferred.resolve();
    }, 100);
    
  }
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuSubPagePagenationData = function(url, pageData, pageNum, companyid, saveFunction, saveFunctionName, currentIndex){
  if (!saveFunctionName) {
    saveFunctionName = "Default_Save_Function";
  }
  mongoDB.addLog('info', 'debug', 'Start_getZhuJianBuSubPagePagenationData:companyid:'+companyid, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
  var self = this;
  var deferred = Q.defer();
  mongoDB.addLog('info', 'debug', 'create pagenation innerFuntion:companyid:'+companyid+':pageNum:'+pageNum+':currentIndex:'+currentIndex, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
  var innerF = function(url, pageData, pageNum, companyid, saveFunction, saveFunctionName, currentIndex, deferredInner){
    console.log("Create InnerF:URL:"+url+":pageNum:"+pageNum);
    mongoDB.addLog('info', 'debug', 'Constractor of InnerF:companyid:'+companyid+':url:'+url+':pageNum:'+pageNum, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
    this.url = url;
    this.pageData = pageData;
    this.pageNum = pageNum;
    this.companyid = companyid;
    this.saveFunction = saveFunction;
    this.currentIndex = currentIndex;
    this.deferredInner = deferredInner;
  }
  innerF.prototype.innerInnerF = function(){
    let innerSelf = this;
    var url = this.url;
    var pageData = this.pageData;
    var pageNum = this.pageNum;
    var companyid = this.companyid;
    var saveFunction = this.saveFunction;
    var currentIndex = this.currentIndex;
    var deferredInner = this.deferredInner;
    setTimeout(function(){
      mongoDB.addLog('info', 'debug', 'execute innerInnerF of InnerF:companyid:'+companyid+':url:'+url+':pageNum:'+pageNum+":currentIndex:"+currentIndex, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
      console.log("start Processing:url:"+url+":pageNum:"+pageNum+":currentIndex:"+currentIndex);
      request
        .post(url)
        .timeout({
          response: 30000,  // Wait 5 seconds for the server to start sending,
          deadline: 30000, // but allow 1 minute for the file to finish loading.
        })
        .proxy('http://'+self.getNextProxy())
        .set('Content-Type', 'application/x-www-form-urlencoded').send(
          {
            $total: pageData.tt,
            $reload: 0,
            $pg: pageNum,
            $pgsz: pageNum.ps
          }
        )
        .end(function(err, res) {
          if (err) {
            if (err.timeout) {
              console.log('getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName + 'error timeout get from server');
              mongoDB.addLog('error', 'debug', 'error timeout get from url:'+url, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
            } else {
              mongoDB.addLog('error', 'debug', 'error get from url:'+url, 'getZhuJianBuSubPagePagenationData:saveFunction:'+ saveFunctionName);
              console.log('getZhuJianBuSubPagePagenationData:saveFunction:' + saveFunctionName + 'error other get from server')
            }
            mongoDB.addLog('error', 'debug', 'error in processing url have error:'+url, 'getZhuJianBuSubPagePagenationData:saveFunction:' + saveFunctionName);
            deferredInner.resolve();
            return;
          } else {
            var html = res.res.text;
            if (!res || !res.res) {
              mongoDB.addLog('error', 'debug', 'error in processing url no content:'+url, 'getZhuJianBuSubPagePagenationData:saveFunction:' + saveFunctionName);
              deferredInner.resolve();
              return;
            } else {
              mongoDB.addLog('info', 'debug', 'start process page data for page:'+pageNum+' companyid:'+companyid, 'getZhuJianBuSubPagePagenationData:saveFunction:' + saveFunctionName);
              saveFunction.call(self, html, companyid);
              deferredInner.resolve();
              return;
            }
          }
        });
    }, (currentIndex - 2) * 1000);
  }

  var execInner = new innerF(url, pageData, pageNum, companyid, saveFunction, saveFunctionName, currentIndex, deferred);
  execInner.innerInnerF();
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.savePageData = function(companyid, functionName, pageJSONObj) {
  var sql = "INSERT INTO `companyDetailPageInfo` (`companyid`, `pagetype`, `pagecontentraw`, `totalpage`, `totalrecord`, `pagesize`, `version`, `updateDate`, `information`) VALUES "
    +"(?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
  var params = [];
  var totalpage = pageJSONObj.pc;
  var totalrecord = pageJSONObj.tt;
  var pagesize = pageJSONObj.ps;
  params.push(companyid);
  params.push(functionName);
  params.push(JSON.stringify(pageJSONObj));
  params.push(totalpage);
  params.push(totalrecord);
  params.push(pagesize);
  mongoDB.addLog('info', 'debug', 'Execute inser query:'+sql+'params:'+params.join(','), 'savePageData');
  mySqlDB.queryData(sql, params)
    .then(function(result){
      //console.log(result);
    });
};





SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPageSave = function(html, companyid) {
  console.log('getZhuJianBuPersonPageSave');
  mongoDB.addLog('info', 'debug', 'get data from page:'+companyid, 'getZhuJianBuPersonPageSave');
  var $ = cheerio.load(html);
  var replaceReg = '/\\t|\\n/g';
  var columns = $('.pro_table_box.pro_table_borderright tr');
  for (var i = 0; i < columns.length; i++) {
    var column = $(columns[i]);
    var cells = column.find('td');
    var person = {
      'companyid': companyid
    };
    if (cells && cells.length) {
      mongoDB.addLog('info', 'debug', 'get data from person page item count:'+cells.length+':companyid:'+companyid, 'getZhuJianBuPersonPageSave');
      for (var j=0; j<cells.length; j++) {
        var cell = $(cells[j]);
        var cellText = cell.text().replace(eval(replaceReg), '');
        if (cellText==null) {
          break;
        }
        switch (j) {
        case 0:
          person.index = cellText;
          break;
        case 1:
          person.name = cellText;
          break;
        case 2:
          person.personid = cellText;
          break;
        case 3:
          person.regcategory = cellText;
          break;
        case 4:
          person.regnumber = cellText;
          break;
        case 5:
          person.regmajor = cellText;
          break;
        default:
          break;
        }
      }
      if (person.regmajor != null) {
        this.getZhuJianBuPersonPageSaveDB(person);
      }
    } else {
      mongoDB.addLog('info', 'debug', 'No data get from page:companyid:'+companyid, 'getZhuJianBuPersonPageSave');
    }
  }
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPageSaveDB = function(person) {
  var sql = "INSERT INTO `companyPersonInfoZhuJianBu` (`indexid`, `companyid`, `name`, `personalid`, `regcategory`, `regnumber`, "
    +"`regmajor`, `version`, `updateDate`, `information`) VALUES "
    +"(?, ?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
  var params = [];
  params.push(person.index);
  params.push(person.companyid);
  params.push((person && person.name) ? person.name.trim():'');
  params.push(person.personid);
  params.push(person.regcategory);
  params.push(person.regnumber);
  params.push(person.regmajor);
  mongoDB.addLog('info', 'debug', 'Execute inser query:'+sql+'params:'+params.join(','), 'getZhuJianBuPersonPageSaveDB');
  mySqlDB.queryData(sql, params)
    .then(function(result) {
      return result;
    });
};

SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPageSave = function(html, companyid){
  console.log("getZhuJianBuProjectPageSave");
  mongoDB.addLog('info', 'debug', 'get data from page:'+companyid, 'getZhuJianBuProjectPageSave');
  var $ = cheerio.load(html);
  var replaceReg = "/\\t|\\n/g";
  var columns = $(".pro_table_box.pro_table_borderright tr");
  if (columns && columns.length) {
    mongoDB.addLog('info', 'debug', 'get data from project page item count:'+columns.length+':companyid:'+companyid, 'getZhuJianBuProjectPageSave');
    for(var i=0;i<columns.length;i++){
      var column = $(columns[i]);
      var cells = column.find("td");
      var project = {
        "companyid": companyid
      };
      for(var j=0;j<cells.length;j++){
        var cell = $(cells[j]);
        var cellText = cell.text().replace(eval(replaceReg),"");;
        if(cellText==null){
          break;
        }
        switch(j){
          case 0:
            project.index = cellText;
            break;
          case 1:
            project.projectcode = cellText;
            break;
          case 2:
            project.projectname = cellText;
            break;
          case 3:
            project.projectlocation = cellText;
            break;
          case 4:
            project.projectcategory = cellText;
            break;
          case 5:
            project.projectcompany = cellText;
            break;
        }
      }
      if(project.projectcompany!=null){
        this.getZhuJianBuProjectPageSaveDB(project);
      }
    }
  } else {
    mongoDB.addLog('info', 'debug', 'No data get from page:companyid:'+companyid, 'getZhuJianBuProjectPageSave');
  }
  
  
}
SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPageSaveDB = function(project){
  var sql = "INSERT INTO `companyProjectInfoZhuJianBu` (`indexid`, `companyid`, `projectcode`, `projectname`, `projectlocation`, `projectcategory`, "
    +"`projectcompany`, `version`, `updateDate`, `information`) VALUES "
    +"(?, ?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
  var params = [];
  params.push(project.index);
  params.push(project.companyid);
  params.push(project.projectcode);
  params.push(project.projectname);
  params.push(project.projectlocation);
  params.push(project.projectcategory);
  params.push(project.projectcompany);
  mongoDB.addLog('info', 'debug', 'Execute inser query:'+sql+'params:'+params.join(','), 'getZhuJianBuProjectPageSaveDB');
  mySqlDB.queryData(sql, params)
    .then(function(result){
      //console.log(result);
    });
}

SiChuanZhuJianBuData.prototype.getZhuJianBuPCertificatePageSave = function(html, companyid){
  console.log("getZhuJianBuCertificatePageSave");
  mongoDB.addLog('info', 'debug', 'get data from page:'+companyid, 'getZhuJianBuCertificatePageSave');
  var $ = cheerio.load(html);
  var trs = $("table tr");
  var columns = new Array();
  if (trs && trs.length) {
    mongoDB.addLog('info', 'debug', 'get data from certificate page item count:'+trs.length+':companyid:'+companyid, 'getZhuJianBuCertificatePageSave');
    for(var i=0;i<trs.length;i++){
      var tr = $(trs[i]);
      var tds = tr.find("td");
      if(tds.length==0){
        continue;
      }
      var jgap = 0;
      for(var j=0;j<tds.length;){
        if(columns[j]==null){
          columns[j] = new Array(trs.length);
        }
        var currentRows = columns[j+jgap];
        var currentCell = currentRows[i];
        if(currentCell==null){
          var td = $(tds[j]);
          var tdtext = td.text();
          var rowspan = td.attr("rowspan");
          if(rowspan && rowspan>1){
            for(var k=0;k<rowspan;k++){
              currentRows[i+k] = tdtext;
            }
          }else{
            currentRows[i] = tdtext;
          }
          j++;
        }else{
            jgap++;
        }
      }
    }
  
    var rowCount = columns[0].length;
    var replaceReg = "/\\t|\\n/g";
    for(var i=0;i<rowCount;i++){
      var certificateInfo = {
        "companyid": companyid
      };
      for(var j=0;j<columns.length;j++){
        var cellData = columns[j][i]==null?"":columns[j][i].replace(eval(replaceReg),"");
        switch(j) {
        case 0:
          certificateInfo.index = cellData;
          break;
        case 1:
          certificateInfo.category = cellData;
          break;
        case 2:
          certificateInfo.number = cellData;
          break;
        case 3:
          certificateInfo.name = cellData;
          break;
        case 4:
          certificateInfo.issuedate = cellData;
          break;
        case 5:
          certificateInfo.expiredate = cellData;
          break;
        case 6:
          certificateInfo.issuer = cellData;
          break;
        default:
          break;
        }
      }
      if(certificateInfo.issuer != "" && certificateInfo.issuer != null){
        //console.log(certificateInfo);
        this.getZhuJianBuCertificatePageSaveDB(certificateInfo);
      }
    }
  } else {
    mongoDB.addLog('info', 'debug', 'No data get from page:companyid:'+companyid, 'getZhuJianBuPCertificatePageSave');
  }
  

/*
  certificatecategory varchar(30),
  certificateid varchar(30),
  certificatename varchar(20),
  certificateissuedate varchar(30),
  certificateexpiredate varchar(30),
  certificateissuer varchar(200),

*/
}
SiChuanZhuJianBuData.prototype.getZhuJianBuCertificatePageSaveDB = function(certificate){
  var sql = "INSERT INTO `companyCertificateInfoZhuJianBu` (`indexid`, `companyid`, `certificatecategory`, `certificateid`, `certificatename`, `certificateissuedate`, `certificateexpiredate`, "
    +"`certificateissuer`, `version`, `updateDate`, `information`) VALUES "
    +"(?, ?, ?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
  var params = [];
  params.push(certificate.index);
  params.push(certificate.companyid);
  params.push(certificate.category);
  params.push(certificate.number);
  params.push(certificate.name);
  params.push(certificate.issuedate);
  params.push(certificate.expiredate);
  params.push(certificate.issuer);
  mongoDB.addLog('info', 'debug', 'Execute inser query:'+sql+'params:'+params.join(','), 'getZhuJianBuCertificatePageSaveDB');
  mySqlDB.queryData(sql, params)
    .then(function(result){
      //console.log(result);
    });
}

SiChuanZhuJianBuData.prototype.getZhuJianBuData = function(){
  var deferred = Q.defer();
  var sql = "select * from companyInfoZhuJianBu limit 10;";
  mySqlDB.queryData(sql)
    .then(function(result) {
      deferred.resolve(result);
    });
  return deferred.promise;
};

SiChuanZhuJianBuData.prototype.processZhuJianBuDetailTimeInterval = function(listdata) {
  console.log('processZhuJianBuDetailTimeInterval');
  var currentIndex = 0;
  var self = this;
  var intervalID = setInterval(function() {
    console.log(currentIndex + '' + listdata.length);
    if (currentIndex >= listdata.length) {
      mySqlDB.close();
      mongoDB.close();
      clearInterval(intervalID);
    } else {
      var item = listdata[currentIndex++];
      self.getCompanyDetailInfo(item);
    }
  }, 3000);
};
SiChuanZhuJianBuData.prototype.getZhuJianBuDetailInformation = function(){
  var self = this;
  var deferred = Q.defer();
  proxyServers.getProxy()
    .then(function() {
      console.log("---------------");
      mongoDB.findZhuJianBu({"processed": false})
       .then(function(data) {
         self.processZhuJianBuDetailTimeInterval(data);
         //console.log(data);
       });
    }
  );
};


SiChuanZhuJianBuData.prototype.processZhuJianBuHomeTimeInterval = function(listdata) {
  var currentIndex = 0;
  var self = this;
  var intervalID = setInterval(function() {
    if (currentIndex >= listdata.length) {
      clearInterval(intervalID);
      mySqlDB.close();
      mongoDB.close();
    } else {
      var item = listdata[currentIndex++];
      self.getCompanyInfo(item);
    }
  }, 3000);
};
SiChuanZhuJianBuData.prototype.getZhuJianBuHomePageInformation = function(){
  var self = this;
  proxyServers.getProxy()
    .then(function() {
      console.log("---------------");
      self.getAllCompanyName()
       .then(function(data) {
          self.processZhuJianBuHomeTimeInterval(data);
          // console.log(data);
       });
    }
  );
};





SiChuanZhuJianBuData.prototype.processZhuJianBuDetailPagesTimeInterval = function(listdata, currentIndex) {
  if( currentIndex == null) {
    currentIndex = 0;
  }
  var self = this;
  console.log("currentIndex:"+currentIndex+":listdatalength:"+listdata.length);
  if (currentIndex >= listdata.length) {
    setTimeout(function(){
      mySqlDB.close();
      mongoDB.close();
      console.log("----------ALL END----------")
    }, 30000);
  } else {
    var item = listdata[currentIndex++];
    self.getZhuJianBuDetailOneCompany(item).then(function(){
      setTimeout(function(){
        console.log("Finish index:"+(currentIndex-1)+":start next:"+currentIndex);
        mongoDB.addLog('info', 'debug', "Finish index:"+(currentIndex-1)+":start next:"+currentIndex, 'processZhuJianBuDetailPagesTimeInterval');
        self.processZhuJianBuDetailPagesTimeInterval(listdata, currentIndex);
      }, 3000);
    });
  }
};
SiChuanZhuJianBuData.prototype.getZhuJianBuDetailPagesInformation = function(){
  var self = this;
  proxyServers.getProxy()
    .then(function() {
      console.log("---------------");
      var sql = 'select * from companyInfoZhuJianBu';
      mySqlDB.queryData(sql).then(function(data) {
        self.processZhuJianBuDetailPagesTimeInterval(data);
      });
    }
  );
};
var test = new SiChuanZhuJianBuData();
test.getZhuJianBuDetailPagesInformation();

module.exports = SiChuanZhuJianBuData;






















/*


SiChuanZhuJianBuData.prototype.getZhuJianBuPerson = function(url, companyInfo){
  var deferred = Q.defer();
  mongoDB.removeLog("ZhuJianBuWebPersonalInfo");
  var self = this;
  var deferred = Q.defer();
  var companyid = companyInfo.companyid;
  var nextProxyItem = self.getNextProxy();
  console.log('proxy:'+nextProxyItem+':'+url);
  request
    .timeout({
        response: 10000,  // Wait 5 seconds for the server to start sending,
        deadline: 10000, // but allow 1 minute for the file to finish loading.
      })
    .proxy('http://'+nextProxyItem)
    .get(url)
    .end(function(err, res) {
      console.log(err);
      console.log(res);
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      mongoDB.addLog('info', 'debug', 'start process person page:'+'1'+' companyinfo:'+companyInfo, 'ZhuJianBuWebPersonalInfo');
      self.getZhuJianBuPersonPageSave(html, companyid);
      self.getZhuJianBuPersonPagenation(html, url, companyInfo).then(function(){
        deferred.resolve();
      });
      return;
    });
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPagenation = function(html, url, companyInfo){
  var $ = cheerio.load(html);
  var companyid = companyInfo.companyid;
  var deferred = Q.defer();
  var deferredList = [];
  if ($("[sf='pagebar']").length > 0) {
    var pagedata = $("[sf='pagebar']").attr("sf:data");
    var pageDataJSON = eval(pagedata);
    var totalPageNum = pageDataJSON.pc;
    for (var i = 2; i <= totalPageNum; i++) {
      var defItem = this.getZhuJianBuPersonPagenationData(url, pageDataJSON, i, companyid);
      deferredList.push(defItem);
    }
    Q.allSettled(deferredList)
      .then(function () {
        deferred.resolve();
      });
  } else {
    setTimeout(function(){
      deferred.resolve();
    }, 100);
    
  }
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPagenationData = function(url, pageData, pageNum, companyid){
  var deferred = Q.defer();
  request
    .proxy('http://'+self.getNextProxy())
    .post(url)
    .set('Content-Type', 'application/x-www-form-urlencoded').send(
      {
        $total: pageData.tt,
        $reload: 0,
        $pg: pageNum,
        $pgsz: pageNum.ps
      }
    )
    .end(function(err, res) {
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      if (!res || !res.res) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      mongoDB.addLog('info', 'debug', 'start process person page:'+pageNum+' companyinfo:'+companyInfo, 'ZhuJianBuWebPersonalInfo');
      self.getZhuJianBuPersonPageSave(html, companyid);
      deferred.resolve();
      return;
    });
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuProject = function(url, companyInfo){
  mongoDB.removeLog("ZhuJianBuWebProjectInfo");
  var that = this;
  var deferred = Q.defer();

  var companyid = companyInfo.companyid;
  var nextProxyItem = self.getNextProxy();
  console.log('proxy:'+nextProxyItem+':'+url);
  request
    .timeout({
        response: 10000,  // Wait 5 seconds for the server to start sending,
        deadline: 10000, // but allow 1 minute for the file to finish loading.
      })
    .proxy('http://'+nextProxyItem)
    .get(url)
    .end(function(err, res) {
      console.log(err);
      console.log(res);
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      that.getZhuJianBuProjectPageSave(html, companyid);
      return;
    });
  return deferred.promise;
}
SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPage = function(html, url, companyInfo){
  var $ = cheerio.load(html);
  var companyid = companyInfo.companyid;
  var deferred = Q.defer();
  var deferredList = [];
  if ($("[sf='pagebar']").length > 0) {
    var pagedata = $("[sf='pagebar']").attr("sf:data");
    var pageDataJSON = eval(pagedata);
    var totalPageNum = pageDataJSON.pc;
    for (var i = 2; i <= totalPageNum; i++) {
      var defItem = this.getZhuJianBuProjectPagenationData(url, pageDataJSON, i, companyid);
      deferredList.push(defItem);
    }
    Q.allSettled(deferredList)
      .then(function () {
        deferred.resolve();
      });
  } else {
    setTimeout(function(){
      deferred.resolve();
    }, 100);
    
  }
  return deferred.promise;
}
SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPagenationData = function(url, pageData, pageNum, companyid) {
  var deferred = Q.defer();
  request
    .proxy('http://'+self.getNextProxy())
    .post(url)
    .set('Content-Type', 'application/x-www-form-urlencoded').send(
      {
        $total: pageData.tt,
        $reload: 0,
        $pg: pageNum,
        $pgsz: pageNum.ps
      }
    )
    .end(function(err, res) {
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      if (!res || !res.res) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      mongoDB.addLog('info', 'debug', 'start process person page:'+pageNum+' companyinfo:'+companyInfo, 'ZhuJianBuWebPersonalInfo');
      self.getZhuJianBuProjectPageSave(html, companyid);
      deferred.resolve();
      return;
    });
  return deferred.promise;
}
SiChuanZhuJianBuData.prototype.getZhuJianBuCertificate = function(url, companyInfo, saveFunction){
  mongoDB.removeLog("ZhuJianBuWebCertificateInfo");
  var that = this;
  var deferred = Q.defer();

  var companyid = companyInfo.companyid;
  var nextProxyItem = self.getNextProxy();
  console.log('proxy:'+nextProxyItem+':'+url);
  request
    .timeout({
        response: 10000,  // Wait 5 seconds for the server to start sending,
        deadline: 10000, // but allow 1 minute for the file to finish loading.
      })
    .proxy('http://'+nextProxyItem)
    .get(url)
    .end(function(err, res) {
      console.log(err);
      console.log(res);
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      saveFunction(html, companyid);
      return;
    });
  return deferred.promise;
}
SiChuanZhuJianBuData.prototype.getZhuJianBuCertificatePage = function(nightM, idx, companyid, deferred){
  var that = this;
  var random = parseInt(Math.random()*5) * 1000;
  //console.log("start getZhuJianBuCertificatePage ");
  mongoDB.addLog("info","debug","start process certificate page:"+idx+" companyid:"+companyid, "ZhuJianBuWebCertificateInfo");
  nightM
    .exists(".quotes a[dt='"+(idx)+"']")
    .then(function(res){
      if(res){
        //console.log("next button exists, start");
        mongoDB.addLog("info","debug","Certificate page next button exists, start process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebCertificateInfo");
        nightM.wait(2000)
          .click(".quotes a[dt='"+idx+"']")
          .wait(6000)
          .evaluate(function(){
              return document.body.innerHTML;
          })
          .then(function(res){
            //that.saveHTML("/MyProjects/"+idx+".html", res);
            that.getZhuJianBuPCertificatePageSave(res, companyid);
            //console.log(res);
            // nightM.exists(".quotes a[dt='"+(idx+1)+"']")
            // console.log(isExists);
            that.getZhuJianBuCertificatePage(nightM, idx+1, companyid, deferred);
          })
          .catch(function(){
            setTimeout(function(){
                that.getZhuJianBuCertificatePage(nightM, idx, companyid, deferred);
              }, random*60);
          });
      }else{
        //if button not exists then the page already saved in the previous code
        //so just close the browser and exit.
        //console.log("next button not exists, end");
        mongoDB.addLog("info","debug","Certificate page next button not exists, end process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebCertificateInfo");
        nightM
          .wait(100)
          .evaluate(function(){
            return document.body.innerHTML;
          })
          .end()
          .then(function(){
            //console.log("next button not exists, end");
            mongoDB.addLog("info","debug","Certificate page done for company:"+companyid, "ZhuJianBuWebCertificateInfo");
            deferred.resolve();
          })
          .catch(function(e){
            //console.log("next button not exists, end");
            mongoDB.addLog("error","debug","Certificate page error for company:"+companyid, "ZhuJianBuWebCertificateInfo");
            deferred.resolve();
          });
      }
    })
}*/
