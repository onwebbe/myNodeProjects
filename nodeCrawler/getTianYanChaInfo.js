var Nightmare = require('nightmare');
var Q = require("q");
function TianYanChaInfo(config){
	this.companyid = config.companyid;
	this.deferred = Q.defer();
}

TianYanChaInfo.prototype.getCompanyList = function(){
	var that = this;
	var companyid = this.companyid;
	var nightmare = Nightmare({
	  waitTimeout: 1000, // in ms
	  show: true
	});
	var middleURL = "";
	nightmare
	  .goto('http://www.tianyancha.com/search?key='+companyid+'&checkFrom=searchBox')
	/*  .wait("#live-search")
	  .type('#live-search', '上海建筑科学研究院')
	  .click(".search_button")*/
	  .wait(".search_result_container")
	  .evaluate(function () {
	  	var items = document.querySelector(".search_result_single .search_right_item a");
	  	if(document.querySelector(".search_result_single .search_right_item a")!=null){
	  		return document.querySelector(".search_result_single .search_right_item a").getAttribute("href");
	  	}else{
	  		return "";
	  	}
	    //return "www.baidu.com";
	  })
	  .end()
	  .then(function(res){
	  	console.log(res);
	  	middleURL = res;
	  	if(res!=""){
	  	  that.getCompanyDetail(middleURL);
	  	}
	  })
	  .catch(function(e){
	  	console.log(e);
	  })
	  
	return this.deferred.promise;
}
TianYanChaInfo.prototype.getCompanyDetail = function(url){
	var that = this;
	var nightmare = Nightmare({
	  waitTimeout: 1000, // in ms
	  show: true
	});
	nightmare
	  .goto(url)
	  .wait(".company_header_width .mr20 span")
	  .evaluate(function () {
	  	var datas = {};
	  	var telephone = document.querySelector(".company_header_width>div:nth-child(1)>div:nth-child(3)>div:nth-child(1)>span:nth-child(2)").innerHTML;
	  	datas["telephone"] = telephone;
	  	var email = document.querySelector(".company_header_width>div:nth-child(1)>div:nth-child(3)>div:nth-child(2)>span:nth-child(2)").innerHTML;
	  	datas["email"] = email;
	  	var homepage = document.querySelector(".company_header_width>div:nth-child(1)>div:nth-child(4)>div:nth-child(1)>*:nth-child(2)").innerHTML;
	  	datas["homepage"] = homepage;
	  	var address = document.querySelector(".company_header_width>div:nth-child(1)>div:nth-child(4)>div:nth-child(2)>*:nth-child(2)").innerHTML;
	  	datas["address"] = address;
	  	return datas;
	  })
	  .end()
	  .then(function(res){
	  	that.deferred.resolve(res);
	  })
	  .catch(function (e){
	  	console.log(e);	
	  });
}
/*var t = new TianYanChaInfo({companyid:"实业"});
t.getCompanyList()
	.then(function(res){
		console.log(res);
	});*/
module.exports = TianYanChaInfo;