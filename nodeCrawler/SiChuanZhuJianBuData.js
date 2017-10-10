'use strict';
var fs = require('fs');
var Q = require('q');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var MongoDB = require('./mongodb.js');
var MySQLDB = require('./mysql.js');
var mongoDB = new MongoDB('localhost', 'SiChuanListData');
var mySqlDB = new MySQLDB('localhost', 'root', '123456', 'SiChuanListData');
var request = require('superagent');
require('superagent-proxy')(request);
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();
var GetProxy = require('./GetProxy.js');

var proxyServers = new GetProxy();
function SiChuanZhuJianBuData(config) {
  return '';
}
SiChuanZhuJianBuData.prototype.getNextProxy = function() {
  return proxyServers.getNextProxy();
};
SiChuanZhuJianBuData.prototype.getAllCompanyName = function() {
  var deferred = Q.defer();
  mongoDB.findSiChuanData().then(function(data) {
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
  return itemObj;
};

SiChuanZhuJianBuData.prototype.getCompanyDetailInfo = function(url) {
  request.get(url).end(function(err, res) {
    var html = res.res.text;
    self.saveCompanyDetailInfoOverall(html);
  });
};
SiChuanZhuJianBuData.prototype.saveCompanyDetailInfoOverall = function(html, saveIdx) {
  var $ = cheerio.load(html);
  var tdItems = $('.pro_table_box.datas_table td');
  var overAllInfo = {};
  overAllInfo['recordIndex'] = saveIdx;
  var replaceReg = '/\\t|\\n/g';
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
      // console.log(result);
    });
};











SiChuanZhuJianBuData.prototype.getZhuJianBuDetail = function() {
  var that = this;
  this.getZhuJianBuData()
    .then(function(result) {
      that.getZhuJianBuDetailOneCompany(result, 0);
    });
};

SiChuanZhuJianBuData.prototype.getZhuJianBuDetailOneCompany = function(companyInfo) {
  var self = this;
  var personURL = companyInfo.registerPersonURL;
  var projectURL = companyInfo.projectURL;
  var certificateURL = companyInfo.certificateURL;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPerson = function(url, companyInfo){
  var deferred = Q.defer();
  mongoDB.removeLog("ZhuJianBuWebPersonalInfo");
  var self = this;
  var deferred = Q.defer();
  var companyid = companyInfo.companyid;
  request
    .proxy('http://'+self.getNextProxy())
    .get(url)
    .end(function(err, res) {
      if (err) {
        mongoDB.addLog('error', 'debug', 'error in processing url:'+url, 'ZhuJianBuWebPersonalInfo');
        deferred.reject();
        return;
      }
      var html = res.res.text;
      mongoDB.addLog('info', 'debug', 'start process person page:'+'1'+' companyinfo:'+companyInfo, 'ZhuJianBuWebPersonalInfo');
      self.getZhuJianBuPersonPageSave(html, companyid);
      deferred.resolve();
      return;
    });
  return deferred.promise;
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPageSave = function(html, companyid) {
  console.log('getZhuJianBuPersonPageSave');
  var $ = cheerio.load(html);
  var replaceReg = '/\\t|\\n/g';
  var columns = $('.pro_table_box.pro_table_borderright tr');
  for (var i = 0; i < columns.length; i++) {
    var column = $(columns[i]);
    var cells = column.find('td');
    var person = {
      'companyid': companyid
    };
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
  }
};
SiChuanZhuJianBuData.prototype.getZhuJianBuPersonPageSaveDB = function(person) {
  var sql = "INSERT INTO `companyPersonInfoZhuJianBu` (`indexid`, `companyid`, `name`, `personalid`, `regcategory`, `regnumber`, "
    +"`regmajor`, `version`, `updateDate`, `information`) VALUES "
    +"(?, ?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
  var params = [];
  params.push(person.index);
  params.push(person.companyid);
  params.push(person.name);
  params.push(person.personid);
  params.push(person.regcategory);
  params.push(person.regnumber);
  params.push(person.regmajor);
  mySqlDB.queryData(sql, params)
    .then(function(result) {
      return result;
    });
};
SiChuanZhuJianBuData.prototype.getZhuJianBuProject = function(url, companyInfo){
  mongoDB.removeLog("ZhuJianBuWebProjectInfo");
  var that = this;
  var deferred = Q.defer();
  var nightmare = Nightmare({
    waitTimeout: 20000, // in ms
    show: true
  });
  var random = parseInt(Math.random()*5) * 1000;
  mongoDB.addLog("info","debug","start process url:"+url+" companyinfo:"+companyInfo, "ZhuJianBuWebProjectInfo");
  var companyid = companyInfo.companyid;
  nightmare.goto(url)
    .wait("table")
    .wait(2000);
    nightmare.evaluate(function(){
      return document.body.innerHTML;
    })
    .then(function(res){
      mongoDB.addLog("info","debug","start process project page:"+"1"+" companyinfo:"+companyInfo, "ZhuJianBuWebProjectInfo");
      that.getZhuJianBuProjectPageSave(res, companyid);
      that.getZhuJianBuProjectPage(nightmare, 2, companyid, deferred);
    })
    .catch(function(e){
      mongoDB.addLog("error","debug","error in processing url:"+url, "ZhuJianBuWebProjectInfo");
        console.log("!!!!!!!!!!!!!!!!!!!!error!!!!!!!!!!!!!!!!!!!!");
        setTimeout(function(){
          that.getZhuJianBuProject(url, companyInfo);
        }, random*60);
        nightmare.evaluate(function(){
          return document.body.innerHTML;
        })
        .end()
        .then(function(){
          console.log("end");
        })
        .catch(function(){

        });
      /*console.log("error");
      console.log(e);
      nightmare.end();
      deferred.reject(e);*/
    });
  return deferred.promise;
}
SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPage = function(nightM, idx, companyid, deferred){
  var that = this;
  var random = parseInt(Math.random()*5) * 1000;
  //console.log("start getZhuJianBuProjectPage ");
  mongoDB.addLog("info","debug","start process project page:"+idx+" companyid:"+companyid, "ZhuJianBuWebProjectInfo");
  nightM
    .exists(".quotes a[dt='"+(idx)+"']")
    .then(function(res){
      if(res){
        console.log("next button exists, start");
        mongoDB.addLog("info","debug","Project page next button exists, start process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebProjectInfo");
        nightM.wait(2000)
          .click(".quotes a[dt='"+idx+"']")
          .wait(6000)
          .evaluate(function(){
              return document.body.innerHTML;
          })
          .then(function(res){
            //that.saveHTML("/MyProjects/"+idx+".html", res);
            that.getZhuJianBuProjectPageSave(res, companyid);
            //console.log(res);
            // nightM.exists(".quotes a[dt='"+(idx+1)+"']")
            // console.log(isExists);
            that.getZhuJianBuProjectPage(nightM, idx+1, companyid, deferred);
          })
          .catch(function(){
            setTimeout(function(){
                that.getZhuJianBuProjectPage(nightM, idx, companyid, deferred);
              }, random*60);
          })
      }else{
        //if button not exists then the page already saved in the previous code
        //so just close the browser and exit.
        //console.log("next button not exists, end");
        mongoDB.addLog("info","debug","Project page next button not exists, end process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebProjectInfo");
        nightM
          .wait(100)
          .evaluate(function(){
            return document.body.innerHTML;
          })
          .end()
          .then(function(){
            //console.log("next button not exists, end");
            mongoDB.addLog("info","debug","Project page done for company:"+companyid, "ZhuJianBuWebProjectInfo");
            deferred.resolve();
          })
          .catch(function(e){
            //console.log("next button not exists, end");
            mongoDB.addLog("error","debug","Project page error for company:"+companyid, "ZhuJianBuWebProjectInfo");
            deferred.resolve();
          });
      }
    })
}
SiChuanZhuJianBuData.prototype.getZhuJianBuProjectPageSave = function(html, companyid){
  console.log("getZhuJianBuProjectPageSave");
  $ = cheerio.load(html);
  var replaceReg = "/\\t|\\n/g";
  var columns = $(".pro_table_box.pro_table_borderright tr");
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
  mySqlDB.queryData(sql, params)
    .then(function(result){
      //console.log(result);
    });
}





SiChuanZhuJianBuData.prototype.getZhuJianBuCertificate = function(url, companyInfo){
  mongoDB.removeLog("ZhuJianBuWebCertificateInfo");
  var that = this;
  var random = parseInt(Math.random()*5) * 1000;
  var deferred = Q.defer();
  var nightmare = Nightmare({
    waitTimeout: 20000, // in ms
    show: true
  });
  mongoDB.addLog("info","debug","start process url:"+url+" companyinfo:"+companyInfo, "ZhuJianBuWebCertificateInfo");
  var companyid = companyInfo.companyid;
  nightmare.goto(url)
    .wait("table")
    .wait(2000);
    nightmare.evaluate(function(){
      return document.body.innerHTML;
    })
    .then(function(res){
      mongoDB.addLog("info","debug","start process certificate page:"+"1"+" companyinfo:"+companyInfo, "ZhuJianBuWebCertificateInfo");
      that.getZhuJianBuPCertificatePageSave(res, companyid);
      that.getZhuJianBuCertificatePage(nightmare, 2, companyid, deferred);
    })
    .catch(function(e){
      mongoDB.addLog("error","debug","error in processing url:"+url, "ZhuJianBuWebCertificateInfo");
        console.log("!!!!!!!!!!!!!!!!!!!!error!!!!!!!!!!!!!!!!!!!!");
        setTimeout(function(){
          that.getZhuJianBuCertificate(url, companyInfo);
        }, random*60);
        nightmare.evaluate(function(){
          return document.body.innerHTML;
        })
        .end()
        .then(function(){
          console.log("end");
        })
        .catch(function(){

        });
      /*console.log("error");
      console.log(e);
      nightmare.end();
      deferred.reject(e);*/
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
}
SiChuanZhuJianBuData.prototype.getZhuJianBuPCertificatePageSave = function(html, companyid){
  console.log("getZhuJianBuCertificatePageSave");
  $ = cheerio.load(html);
  var trs = $("table tr");
  var columns = new Array();
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
SiChuanZhuJianBuData.prototype.processTimeInterval = function(listdata) {
  var currentIndex = 0;
  var self = this;
  var intervalID = setInterval(function() {
    if (currentIndex >= listdata.length) {
      clearInterval(intervalID);
    } else {
      var item = listdata[currentIndex++];
      self.getCompanyInfo(item);
    }
  }, 3000);
};
proxyServers.getProxy()
  .then(function() {
    var test = new SiChuanZhuJianBuData();
    test.getAllCompanyName()
      .then(function(data) {
        test.processTimeInterval(data);
        //console.log(data);
      });
  });

module.exports = SiChuanZhuJianBuData;
