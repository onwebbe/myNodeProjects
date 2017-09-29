create table projectInfoZhuJianBu(
	projectId integer not null primary key AUTO_INCREMENT,
	projectNum varchar(50), /*项目编号*/
	shenjiIndex varchar(20), /*省级项目编号*/
	area varchar(20), /*所在区划*/
	conductCompany varchar(100), /*建设单位*/
	uniqueCode varchar(30), /*建设单位组织机构代码（统一社会信用代码）*/
	category varchar(30), /*项目分类*/
	clarify varchar(50), /*建设性质*/
	projectUsage varchar(50), /*工程用途*/
	budget varchar(100), /*总投资*/
	areaSize varchar(60), /*总面积*/
	level varchar(20), /*立项级别*/
	documentNum varchar(60), /*立项文号*/
	version integer,
	updateDate date,
	last_updated_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB CHARSET=utf8;


create table companyInfoZhuJianBu(
	companyid int(11) not null primary key AUTO_INCREMENT,
	recordIndex int(5),
	companyName varchar(300),
	companyUniqueCode varchar(100) not null, /*组织机构代码/营业执照编号*/
	lawMan varchar(30), /*企业法定代表人*/
	category varchar(20), /*企业登记注册类型*/
	city varchar(60), /*企业注册属地*/
	address varchar(600), /*企业经营地址*/
	registerPersonURL varchar(200),
	projectURL varchar(200),
	certificateURL varchar(200),
	version integer,
	information varchar(100),
	updateDate date,
	last_updated_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB CHARSET=utf8;

create table companyPersonInfoZhuJianBu(
	companypersonid int(11) not null primary key AUTO_INCREMENT,
	companyid int(11),
	indexid int(5),
	name varchar(100),
	personalid varchar(50),
	regcategory varchar(60),
	regnumber varchar(50),
	regmajor varchar(100),
	version integer,
	information varchar(100),
	updateDate date,
	last_updated_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyPersonCompanyID` FOREIGN KEY (`companyid`) REFERENCES `companyInfoZhuJianBu` (`companyid`)
) ENGINE = InnoDB CHARSET=utf8;


create table companyProjectInfoZhuJianBu(
	companyprojectid int(11) not null primary key AUTO_INCREMENT,
	companyid int(11),
	indexid int(5),
	projectcode varchar(50),
	projectname varchar(300),
	projectlocation varchar(80),
	projectcategory varchar(30),
	projectcompany varchar(200),
	version integer,
	information varchar(100),
	updateDate date,
	last_updated_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyProjectCompanyID` FOREIGN KEY (`companyid`) REFERENCES `companyInfoZhuJianBu` (`companyid`)
) ENGINE = InnoDB CHARSET=utf8;


create table companyCertificateInfoZhuJianBu(
	companycertificateid int(11) not null primary key AUTO_INCREMENT,
	companyid int(11),
	indexid int(5),
	certificatecategory varchar(30),
	certificateid varchar(30),
	certificatename varchar(20),
	certificateissuedate varchar(30),
	certificateexpiredate varchar(30),
	certificateissuer varchar(200),
	version integer,
	information varchar(100),
	updateDate date,
	last_updated_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companyCertificateCompanyID` FOREIGN KEY (`companyid`) REFERENCES `companyInfoZhuJianBu` (`companyid`)
) ENGINE = InnoDB CHARSET=utf8;