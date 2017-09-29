const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var MongoDB = require("./mongodb.js");
var MySQLDB = require("./mysql");
var mongoDB = new MongoDB("localhost","ZhuJianBu");
var mySqlDB = new MySQLDB("localhost","root","123456","ZhuJianBuInfo");
var maxIndex = 31;
var version = 1;
var information = "ShangHaiInfo";
var runDate = moment().format('YYYY-MM-DD HH:mm:ss');
function ZhuJianBuInfo(config){
}
ZhuJianBuInfo.itemStr = "";
ZhuJianBuInfo.prototype.step1 = function(){
	var that = this;
	var itemData = [];
	var that = this;
	var nightmare = Nightmare({
	  waitTimeout: 20000, // in ms
	  show: false
	});
	var midN = nightmare
	  .goto('http://jzsc.mohurd.gov.cn/dataservice/query/comp/list')
	  .wait(".filter_right_tip.fa.fa-plus-circle")
	  .click(".filter_right_tip.fa.fa-plus-circle")
	/*  .wait("#live-search")
	  .type('#live-search', '上海建筑科学研究院')
	  .click(".search_button")*/
	  .wait(1000)
	  .click(".listing_filters>fieldset:nth-child(4) .comp_icon")
	  .wait(1000)
	  .click("[data-code='310000']")
	  .wait(1000)
	  .click(".aui-btn.aui-btn-primary")
	  .wait(1000)
	  .click(".query_submit")
	  .wait(5000)
	  //.html("/MyProjects/1.html", "HTMLOnly")
	  //this.getPage(midN, 2);
	  midN.evaluate(function(){
	  	return document.body.innerHTML;
	  })
	  .then(function(res){
	  	that.saveListData(res);
	  	//that.saveHTML("/MyProjects/1.html", res);
	  	that.getPage(midN, 2);
	  })
	  .catch(function(e){
	  	console.log(e);
	  });
	return this;
}
ZhuJianBuInfo.prototype.getPage = function(nightM, idx){
	var that = this;
	console.log("processing: "+idx);
	if(idx>maxIndex){
		console.log("get max page:"+maxIndex);
		return;
	}
	console.log("Exists idx:"+idx);
	nightM
		.wait(2000)
		.click(".quotes a[dt='"+idx+"']")
		.wait(6000)
		.evaluate(function(){
		  	return document.body.innerHTML;
		})
		.then(function(res){
		  //that.saveHTML("/MyProjects/"+idx+".html", res);
		  that.saveListData(res);
		  var isExists = nightM.exists(".quotes a[dt='"+(idx+1)+"']");
		  if(isExists){
		  	that.getPage(nightM, idx+1);
		  }else{
			console.log("Not Exists: "+idx);
			nightM.end();
		  }
		})
}
ZhuJianBuInfo.prototype.saveListData = function(html){
	$ = cheerio.load(html);
	var items = $(".table_box .cursorDefault tr");
	for(var i=0;i<items.length;i++){
		var item = $(items[i]);
		var tdItems = item.find("td");
		var index = $(tdItems[0]).text();
		var id = $(tdItems[1]).text();
		var name = $(tdItems[2]).text();
		var url = "http://jzsc.mohurd.gov.cn"+$(tdItems[2]).find("a").attr("href");
		var lawMan = $(tdItems[3]).text();
		var place = $(tdItems[4]).text();
		var itemObj = {
			"index": parseInt(index),
			"id": id,
			"url": url,
			"name": name,
			"lawMan": lawMan,
			"place": place
		}
		mongoDB.insertZhuJianBu(itemObj);
	}
}

ZhuJianBuInfo.prototype.saveHTML = function(name, data, obj){
	fs.writeFile(name, data, 'utf8', function(){});
}



ZhuJianBuInfo.prototype.getCompanyDetailInfo = function(url){
	var prom = mongoDB.findZhuJianBu();
	mongoDB.removeLog("ZhuJianBuWebOverall");
	var that = this;
	prom.then(function(data){
		var urls = [];
		that.getCompanyDetailInfoOverall(data, 0);
	})
	
}
ZhuJianBuInfo.prototype.getCompanyDetailInfoOverall = function(data, idx){
	var that = this;
	if(idx>=data.length){
		console.log("All urls been processed");
		return;
	}
	var url = data[idx].url;
	var saveIdx = data[idx].index;
	//console.log("idx:"+saveIdx+" start process url:"+url);
	mongoDB.addLog("info","debug","start process url:"+url+" idx:"+idx+" saveIdx"+saveIdx, "ZhuJianBuWebOverall");
	var nightmare = Nightmare({
	  waitTimeout: 20000, // in ms
	  show: true
	});
	var random = parseInt(Math.random()*5) * 1000;
	nightmare
	  .wait(1500)
	  .goto(url)
	  .wait(".bui_footer")
	  .wait(10000+random)
	  .evaluate(function(){
	  	return document.body.innerHTML;
	  })
	  .end()
	  .then(function(res){
	  	that.saveCompanyDetailInfoOverall(res, saveIdx);
	  	that.getCompanyDetailInfoOverall(data, idx+1);
	  })
	  .catch(function(){
	  	mongoDB.addLog("error","debug","error in processing url:"+url+" rerun:"+saveIdx+" idx:"+idx+" saveIdx:"+saveIdx, "ZhuJianBuWebOverall");
	  	console.log("!!!!!!!!!!!!!!!!!!!!error!!!!!!!!!!!!!!!!!!!!");
	  	setTimeout(function(){
	  		that.getCompanyDetailInfoOverall(data, idx);
	  	}, random*60);
	  });
}
ZhuJianBuInfo.prototype.saveCompanyDetailInfoOverall = function(html, saveIdx){
	$ = cheerio.load(html);
	var tdItems = $(".pro_table_box.datas_table td");
	var overAllInfo = {};
	overAllInfo["recordIndex"] = saveIdx;
	var replaceReg = "/\\t|\\n/g";
	for(var i=0;i<tdItems.length;i++){
		var tdItem = $(tdItems[i]);
		switch(i){
			case 0:
				overAllInfo["companyUniqueCode"] = tdItem.text().replace(eval(replaceReg),"");
				break;
			case 1:
				overAllInfo["lawMan"] = tdItem.text().replace(eval(replaceReg),"");
				break;
			case 2:
				overAllInfo["category"] = tdItem.text().replace(eval(replaceReg),"");
				break;
			case 3:
				overAllInfo["city"] = tdItem.text().replace(eval(replaceReg),"");
				break;
			case 4:
				overAllInfo["address"] = tdItem.text().replace(eval(replaceReg),"");
				break;
		}
	}
	var urls = $(".tinyTab.datas_tabs li a");
	for(var i=0;i<urls.length;i++){
		var url = $(urls[i]);
		var href = "http://jzsc.mohurd.gov.cn"+url.attr("data-url");
		switch(i){
			case 0:
				overAllInfo["certificateURL"] = href;
				break;
			case 1:
				overAllInfo["registerPersonURL"] = href;
				break;
			case 2:
				overAllInfo["projectURL"] = href;
				break;
		}
	}
	var companyName = $(".user_info.spmtop").text().replace(eval(replaceReg),"");
	overAllInfo["companyName"] = companyName;
	mongoDB.addLog("info","debug","get data:"+overAllInfo+" saveIdx:"+saveIdx, "ZhuJianBuWebOverall");
	this.saveCompanyDetailInfoOverallToDB(overAllInfo);
}
ZhuJianBuInfo.prototype.saveCompanyDetailInfoOverallToDB = function(allInfo){
	var sql = "INSERT INTO `companyInfoZhuJianBu` (`companyUniqueCode`, `recordIndex`, `companyName`, `lawMan`, `category`, "
		+"`city`, `address`, `registerPersonURL`, `projectURL`, `certificateURL`, `version`, `updateDate`, `information`) VALUES "
		+"(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '"+version+"', '"+runDate+"', '"+information+"')";
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
		.then(function(result){
			console.log(result);
		});
}
ZhuJianBuInfo.prototype.getZhuJianBuDetail = function(){
	var that = this;
	this.getZhuJianBuData()
		.then(function(result){
			that.getZhuJianBuDetailOneCompany(result, 0);
		})
}
ZhuJianBuInfo.prototype.getZhuJianBuDetailOneCompany = function(companyInfos, idx){
	var that = this;
	if(idx>=companyInfos.length){
		console.log("get all infos exit");
		return;
	}
	var companyInfo = companyInfos[idx];
	var personURL = companyInfo.registerPersonURL;
	var projectURL = companyInfo.projectURL;
	var certificateURL = companyInfo.certificateURL;
	//console.log("start processing person:"+personURL);

	
	/*that.getZhuJianBuCertificate(certificateURL, companyInfo)
		.then(function(){
			that.getZhuJianBuDetailOneCompany(companyInfos, idx+1);
		})*/
	that.getZhuJianBuPerson(personURL, companyInfo)
		.then(function(){
			console.log("start processing project:"+projectURL);
			that.getZhuJianBuProject(projectURL, companyInfo)
				.then(function(){
					that.getZhuJianBuCertificate(certificateURL, companyInfo)
						.then(function(){
							that.getZhuJianBuDetailOneCompany(companyInfos, idx+1);
						})
				});
		})
	
}
ZhuJianBuInfo.prototype.getZhuJianBuPerson = function(url, companyInfo){
	mongoDB.removeLog("ZhuJianBuWebPersonalInfo");
	var that = this;
	var deferred = Q.defer();
	var nightmare = Nightmare({
	  waitTimeout: 20000, // in ms
	  show: true
	});
	var random = parseInt(Math.random()*5) * 1000;
	mongoDB.addLog("info","debug","start process url:"+url+" companyinfo:"+companyInfo, "ZhuJianBuWebPersonalInfo");
	var companyid = companyInfo.companyid;
	nightmare.goto(url)
		.wait("table")
		.wait(2000);
		nightmare.evaluate(function(){
			return document.body.innerHTML;
		})
		.then(function(res){
			mongoDB.addLog("info","debug","start process person page:"+"1"+" companyinfo:"+companyInfo, "ZhuJianBuWebPersonalInfo");
			that.getZhuJianBuPersonPageSave(res, companyid);
			that.getZhuJianBuPersonPage(nightmare, 2, companyid, deferred);
		})
		.catch(function(e){
			mongoDB.addLog("error","debug","error in processing url:"+url, "ZhuJianBuWebPersonalInfo");
		  	console.log("!!!!!!!!!!!!!!!!!!!!error!!!!!!!!!!!!!!!!!!!!");
		  	setTimeout(function(){
		  		that.getZhuJianBuPerson(url, companyInfo);
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
ZhuJianBuInfo.prototype.getZhuJianBuPersonPage = function(nightM, idx, companyid, deferred){
	var that = this;
	var random = parseInt(Math.random()*5) * 1000;
	console.log("start getZhuJianBuPersonPage ");
	mongoDB.addLog("info","debug","start process person page:"+idx+" companyid:"+companyid, "ZhuJianBuWebPersonalInfo");
	nightM
		.exists(".quotes a[dt='"+(idx)+"']")
		.then(function(res){
			if(res){
				//console.log("next button exists, start");
				mongoDB.addLog("info","debug","Person page next button exists, start process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebPersonalInfo");
				nightM.wait(2000)
					.click(".quotes a[dt='"+idx+"']")
					.wait(6000)
					.evaluate(function(){
					  	return document.body.innerHTML;
					})
					.then(function(res){
					  //that.saveHTML("/MyProjects/"+idx+".html", res);
					  that.getZhuJianBuPersonPageSave(res, companyid);
					  //console.log(res);
					  // nightM.exists(".quotes a[dt='"+(idx+1)+"']")
					  // console.log(isExists);
					  that.getZhuJianBuPersonPage(nightM, idx+1, companyid, deferred);
					})
					.catch(function(){
						setTimeout(function(){
					  		that.getZhuJianBuPersonPage(nightM, idx, companyid, deferred);
					  	}, random*60);
					})
			}else{
				//if button not exists then the page already saved in the previous code
				//so just close the browser and exit.
				console.log("next button not exists, end");
				deferred.resolve();
				mongoDB.addLog("info","debug","Person page next button not exists, end process company:"+companyid+" buttonIndex:"+idx, "ZhuJianBuWebPersonalInfo");
				nightM
					.wait(100)
					.evaluate(function(){
						return document.body.innerHTML;
					})
					.end()
					.then(function(){
						//console.log("next button not exists, end");
						mongoDB.addLog("info","debug","Personal page done for company:"+companyid, "ZhuJianBuWebPersonalInfo");
						deferred.resolve();
					})
					.catch(function(e){
						//console.log("next button not exists, end");
						mongoDB.addLog("error","debug","Personal page error for company:"+companyid, "ZhuJianBuWebPersonalInfo");
						deferred.resolve();
					});
			}
		})
}
ZhuJianBuInfo.prototype.getZhuJianBuPersonPageSave = function(html, companyid){
	console.log("getZhuJianBuPersonPageSave");
	$ = cheerio.load(html);
	var replaceReg = "/\\t|\\n/g";
	var columns = $(".pro_table_box.pro_table_borderright tr");
	for(var i=0;i<columns.length;i++){
		var column = $(columns[i]);
		var cells = column.find("td");
		var person = {
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
			}
		}
		if(person.regmajor!=null){
			this.getZhuJianBuPersonPageSaveDB(person);
		}
	}
	
}
ZhuJianBuInfo.prototype.getZhuJianBuPersonPageSaveDB = function(person){
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
		.then(function(result){
			//console.log(result);
		});
}




ZhuJianBuInfo.prototype.getZhuJianBuProject = function(url, companyInfo){
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
ZhuJianBuInfo.prototype.getZhuJianBuProjectPage = function(nightM, idx, companyid, deferred){
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
ZhuJianBuInfo.prototype.getZhuJianBuProjectPageSave = function(html, companyid){
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
ZhuJianBuInfo.prototype.getZhuJianBuProjectPageSaveDB = function(project){
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





ZhuJianBuInfo.prototype.getZhuJianBuCertificate = function(url, companyInfo){
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
ZhuJianBuInfo.prototype.getZhuJianBuCertificatePage = function(nightM, idx, companyid, deferred){
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
ZhuJianBuInfo.prototype.getZhuJianBuPCertificatePageSave = function(html, companyid){
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
			switch(j){
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
ZhuJianBuInfo.prototype.getZhuJianBuCertificatePageSaveDB = function(certificate){
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

ZhuJianBuInfo.prototype.getZhuJianBuData = function(){
	var deferred = Q.defer();
	var sql = "select * from companyInfoZhuJianBu limit 10;";
	mySqlDB.queryData(sql)
		.then(function(result){
			
			deferred.resolve(result);
		});
	return deferred.promise;
}
var zhujian = new ZhuJianBuInfo();
zhujian.getZhuJianBuDetail();
//zhujian.getZhuJianBuPerson("http://jzsc.mohurd.gov.cn/dataservice/query/comp/regStaffList/001607220057224912", {id:"test"});
//zhujian.step1();
/*var overAllInfo = [];
overAllInfo["companyUniqueCode"] = "uiid";
overAllInfo["lawMan"] = "lawman";
overAllInfo["category"] = "category";
overAllInfo["city"] = "上海";
overAllInfo["address"] = "测试中文地址";
overAllInfo["certificateURL"] = "www.baidu.com";
overAllInfo["registerPersonURL"] = "www.baidu.com";
overAllInfo["projectURL"] = "www.baidu.com";
zhujian.saveCompanyDetailInfoOverallToDB(overAllInfo);*/
module.exports = ZhuJianBuInfo;