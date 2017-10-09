var request = require('superagent');
require('superagent-proxy')(request);
var cheerio = require('cheerio');
var Q = require("q");
var verifyTimeout = 3000;
function GetProxy(){
  this.apiurl = "http://api.goubanjia.com/api/get.shtml?order=ab8a0dc28f69eafe14b26a8f91b01637&num=10&area=%E4%B8%AD%E5%9B%BD&carrier=2&protocol=1&an1=1&an2=2&an3=3&sp1=1&sort=2&system=1&distinct=0&rettype=1&seprator=%0D%0A";
  this.currentSetOfProxyList = [];
  this.validProxyList = [];
  this.notValidProxyList = [];
  this.allProxyValidatorPromise = [];
  this.usedProxyList = [];
}
GetProxy.prototype.getProxy = function(){
  var self = this;
  let defer = Q.defer();
  request
      .get(this.apiurl)
      .end(function (err, sres) {
            /*if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            var $ = cheerio.load(sres.text);
            var items = [];
            $('.day .postTitle2').each(function (index, element) {
                var $element = $(element);
                items.push({
                    标题: $element.text(),
                    网址: $element.attr('href')
                });
            });*/
            var dataText = sres.text;
            var datas = dataText.split("\n");
            datas.splice(datas.length-1,1);
            self.currentSetOfProxyList = datas;
            console.log(self.currentSetOfProxyList);
            self.validateAll()
              .then(function(){
                defer.resolve();
              });
        });
  return defer.promise;
}
GetProxy.prototype.getNextProxy = function(){
  let self = this;
  if(this.validProxyList.length == 0) {
    this.validProxyList = this.usedProxyList.slice();
    this.usedProxyList = [];
  }
  var itemIndex = Math.floor(Math.random() * this.validProxyList.length);
  var selectedItem = this.validProxyList.splice(itemIndex, 1);
  self.usedProxyList.push(selectedItem);
  return selectedItem;
}
GetProxy.prototype.validateAll = function() {
  let self = this;
  let defer = Q.defer();
  let proxys = this.currentSetOfProxyList;
  for(let i = 0; i < proxys.length; i ++ ) {
    let proxy = proxys[i];
    let tmpPromise = this.validateProxy(proxy);
    self.allProxyValidatorPromise.push(tmpPromise);
  }
  let promiseArray = this.allProxyValidatorPromise;
  Q.allSettled(promiseArray)
    .then(function () {
      defer.resolve();
    });
  return defer.promise;
}
GetProxy.prototype.validateProxy = function(proxy) {
  console.log("start validate:"+proxy);
  let self = this;
  let defer = Q.defer();
  let req = request
      .get("http://www.baidu.com/?param="+proxy)
      .proxy("http://"+proxy)
      .timeout({
        response: 5000,  // Wait 5 seconds for the server to start sending,
        deadline: 10000, // but allow 1 minute for the file to finish loading.
      })
      .end(function (err, sres) {
        if(sres && sres.req){
          let url = sres.req.path;
          let urlParams = url.split("=");
          let proxystr = urlParams[urlParams.length - 1];
          var dataText = sres.res.text;
          if(dataText == null || dataText == "null") {
            console.log("!!!!not valid:" + proxystr);
            self.notValidProxyList.push(proxystr);
          }
          let $ = cheerio.load(dataText);
          if ($(".s_ipt").length > 0) {
            console.log("valid:" + proxystr);
            self.validProxyList.push(proxystr);
          }else{
            console.log("!!!!not valid:" + proxystr);
            self.notValidProxyList.push(proxystr);
          }
        }
        defer.resolve();
      }).timeout(5000);
  return defer.promise;
}
/* let proxy = new GetProxy();
proxy.getProxy()
.then(function(){
  console.log("------------------------");
  console.log(proxy.validProxyList);
});*/
module.exports = GetProxy;
