var mysql = require('mysql');
var Q = require("q");
/*var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'ZhuJianBuInfo'
});*/
function MySqlDriver(host, uid, pwd, db){
	var connection = mysql.createConnection({
	    host: host,
	    user: uid,
	    password: pwd,
	    database: db
	});
	connection.connect(function(err) {
	  if (err) {
	    console.error('error connecting mysql: ' + err.stack);
	    return;
	  }
	 
	  console.log('mysql connected as id ' + connection.threadId);
	});
	this.connection = connection;
}
MySqlDriver.prototype.queryData = function(sql, params){
	var deferred = Q.defer();
	console.log("start My SQL query data");
	if(params==null){
		this.connection.query(sql, function(err, result){
			deferred.resolve(result);
		});
	}else{
		this.connection.query(sql, params, function(err, result){
			if(err){
				console.log("error:"+err);
			}else{
				console.log("My SQL Query success.")
			}
			deferred.resolve(result);
		});
	}
	return deferred.promise;
}
MySqlDriver.prototype.close = function(){
	if(this.connection!=null){
		this.connection.end();
	}
}

module.exports = MySqlDriver;