const mongoose = require('mongoose');
const Q = require("q");

function MongoDB(ip, dbname){
	this.db = mongoose.createConnection("mongodb://"+ip+"/"+dbname);
	this.db.on("error", function (error) {
	    console.log("数据库连接失败：" + error);
	});
	this.db.on("open", function () {
	    console.log("------数据库连接成功！------");
	});
	this.prepareSchema();
}
MongoDB.prototype.connection = function(){
	this.db = mongoose.createConnection("mongodb://"+ip+"/"+dbname);
	this.db.on("error", function (error) {
	    console.log("数据库连接失败：" + error);
	});
	this.db.on("open", function () {
	    console.log("------数据库连接成功！------");
	});
}
MongoDB.prototype.close = function(){
	this.db.close();
}
MongoDB.prototype.prepareSchema = function(){
	this.prepareTestSchema();
	this.prepareZhuJianBuSchema();
	this.prepareLogSchema();
	this.prepareSiChuanData();
}
MongoDB.prototype.prepareTestSchema = function(){
	var TestSchema = new mongoose.Schema({
		name: String,   //定义一个属性name，类型为String
		id: Number
    });
    var TestModel = this.db.model('Test',TestSchema);
    this.TestModel = TestModel;
}
MongoDB.prototype.prepareLogSchema = function(){
	var LogSchema = new mongoose.Schema({
		key: String,
		type: String,  //error/info
		level: String, //debug/info
		content: String,
		time: {type: Date, default: Date.now}
    });
    var LogModel = this.db.model('Log',LogSchema);
    this.LogModel = LogModel;
}
MongoDB.prototype.prepareZhuJianBuSchema = function(){
	var ZhuJianBuSchema = new mongoose.Schema({
		index: Number,
		id: String,
		url: String,
		name: String,
		lawMan: String,
		place: String,
		processed: Boolean
    });
    var ZhuJianBuModel = this.db.model('ZhuJianBu',ZhuJianBuSchema);
    this.ZhuJianBuModel = ZhuJianBuModel;
}
MongoDB.prototype.prepareSiChuanData = function(){
	var SiChuanDataSchema = new mongoose.Schema({
		category: String,
		subcategory: String,
		id: Number,
		pageindex: Number,
		place: String,
		companyname: String,
		certid: String,
		lawman: String,
		processed: Boolean
  });
  var SiChuanDataModel = this.db.model('SiChuanData',SiChuanDataSchema);
  this.SiChuanDataModel = SiChuanDataModel;
}
MongoDB.prototype.addLog = function(type, level, content, key){
	var theData = {
		"key": key==null?"":key,
		"type": type,
		"level": level,
		"content": content
	};
	console.log("level:"+level+" key:"+key+" ttype:"+type+" content:"+content);
	var log = new this.LogModel(theData);
	log.save();
}
MongoDB.prototype.removeLog = function(key){
	var that = this;
	this.LogModel.remove({"key":key}, function(error, result){
		if(error) {
	        console.log(error);
	    } else {
	        console.log('delete log ok key:'+key+"!");
	    }
	});
}
MongoDB.prototype.insertZhuJianBu = function(data){
	var index = data.index;
	var replaceReg = "/\\t|\\n/g";
	var id = data.id==null?"":data.id.replace(eval(replaceReg), "");
	var url = data.url==null?"":data.url.replace(eval(replaceReg), "");
	var name = data.name==null?"":data.name.replace(eval(replaceReg), "");
	var lawMan = data.lawMan==null?"":data.lawMan.replace(eval(replaceReg), "");
	var place = data.place==null?"":data.place.replace(eval(replaceReg), "");
	var processed = false;
	var theData = {
			"index": index,
			"id": id,
			"url": url,
			"name": name,
			"lawMan": lawMan,
			"place": place,
			"processed": processed
		};
	console.log(theData);
	var zhuJianBu = new this.ZhuJianBuModel(theData);
	zhuJianBu.save();
}
MongoDB.prototype.insertSiChuanData = function(data){
	var category = data.category;
	var subcategory = data.subcategory;
	var replaceReg = "/\\t|\\n/g";
	var id = data.id==null?"":data.id.replace(eval(replaceReg), "");
	var pageindex = data.pageindex==null?"":data.pageindex.replace(eval(replaceReg), "");
	var place = data.place==null?"":data.place.replace(eval(replaceReg), "");
	var companyname = data.companyname==null?"":data.companyname.replace(eval(replaceReg), "");
	var certid = data.certid==null?"":data.certid.replace(eval(replaceReg), "");
	var lawman = data.lawman==null?"":data.lawman.replace(eval(replaceReg), "");
	var version = data.version;
	var processed = false;
	var theData = {
			"version": version,
			"category": category,
			"subcategory": subcategory,
			"id": parseInt(id),
			"pageindex": parseInt(pageindex),
			"place": place,
			"companyname": companyname,
			"certid": certid,
			"lawman": lawman,
			"processed": processed
		};
	console.log(theData);
	var siChuanData = new this.SiChuanDataModel(theData);
	siChuanData.save();
}
MongoDB.prototype.findSiChuanData = function(query) {
	var deferred = Q.defer();
	if(query==null){
		query = {};
	}
	this.SiChuanDataModel.find(query, function(err, data){
		deferred.resolve(data);
	});
	return deferred.promise;
}
MongoDB.prototype.findZhuJianBu = function(query){
	var deferred = Q.defer();
	if(query==null){
		query = {};
	}
	this.ZhuJianBuModel.find(query, function(err, data){
		deferred.resolve(data);
	});
	return deferred.promise;
}
MongoDB.prototype.insertTestRecord = function(){
	var testEntity = new this.TestModel({name:'alex', id: 2});
	testEntity.save();
}
MongoDB.prototype.findTestAll = function(){
	this.TestModel.find({}, function(err, data){
		console.log(data);
	});
}
/*var mongoDB = new MongoDB("localhost", "ZhuJianBu");
var prom = mongoDB.findZhuJianBu();
prom.then(function(data){
	console.log(data);
	mongoDB.close();
})*/

//mongoDB.insertTest Record();
module.exports = MongoDB;