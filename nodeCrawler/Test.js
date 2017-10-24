"use strict";
const fs = require('fs');
var Q = require("q");
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var moment = require('moment');
var async = require('async');

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

function testAsyncParralLimit() {
  async.parallelLimit([
    function(callback){
      setTimeout(function() {
        console.log("one");
        callback(null, 'one');
      }, 5000);
    },
    function(callback){
      setTimeout(function() {
        console.log("two");
        callback(null, 'two');
      }, 4000);
    },
    function(callback){
      setTimeout(function() {
        console.log("three");
        callback(null, 'three');
      }, 3000);
    },
    function(callback){
      setTimeout(function() {
        console.log("four");
        callback(null, 'four');
      }, 2000);
    },
    function(callback){
      setTimeout(function() {
        console.log("five");
        callback(null, 'five');
      }, 1000);
    }
  ],
  2,
  function(err, results){
    console.log(results);
  });
}
function testeach(text, callback) {
  console.log('start:' + text);
  setTimeout(function() {
    console.log('end:' + text);
    console.log(text);
    callback();
  }, 2000)
  
}
function testAsyncEachLimit() {
  async.eachLimit(['1','2','3','4','5'],
  2,
  testeach, 
  function(err, results){
    console.log('allend:' + results);
  });
}

function testAsyncEachLimit2() {
  // assuming openFiles is an array of file names
  var openFiles = ['1','2','3','4','5'];
  async.eachLimit(openFiles,2, function(file, callback) {

      // Perform operation on file here.
      console.log('Processing file ' + file);
      setTimeout(function() {
        if( file.length > 32 ) {
          console.log('This file name is too long');
          callback('File name too long');
        } else {
          // Do work to process file here
          console.log('File processed');
          callback();
        }
      }, 2000);
      
  }, function(err) {
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        // One of the iterations produced an error.
        // All processing will now stop.
        console.log('A file failed to process');
      } else {
        console.log('All files have been processed successfully');
      }
  });
}

testAsyncEachLimit();
