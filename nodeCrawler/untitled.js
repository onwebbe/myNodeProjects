"use strict";
const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');

function TestNightMare(config){
}
TestNightMare.prototype.step1 = function(){
  var that = this;
  var that = this;
  var nightmare = Nightmare({
    waitTimeout: 120000, // in ms
    show: false
  });
  console.log("start");
  var midN = nightmare
    .goto('http://www.baidu.com')
    .wait(10000)
    midN.evaluate(function(){
      return document.body.innerHTML;
    })
    .then(function(res){
      console.log(res);
    })
    .catch(function(e){
      console.log(e);
    });
  return this;
}
var test = new TestNightMare();
test.step1();
module.exports = TestNightMare;