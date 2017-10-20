"use strict";
const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');

function T(){
  var list = [];
  var la = A();
  var lb = B();
  var lc = C();
  la.then(function() {
    console.log("A done");
  });
  lb.then(function() {
    console.log("B done");
  });
  lc.then(function() {
    console.log("C done");
  });
  list.push(la);
  list.push(lb);
  list.push(lc);
  Q.allSettled(list)
    .then(function () {
      console.log("---------ALL------END---------");
    });
}

function A() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve();
  }, 3000);
  return deferred.promise;
}

function B() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve();
  }, 2000);
  return deferred.promise;
}

function C() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve();
  }, 1000);
  return deferred.promise;
}

T();