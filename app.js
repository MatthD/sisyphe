'use strict';

const ChainJobQueue = require('./src/chain-job-queue');
const walk = require('walk'),
  fs = require('fs'),
  mime = require('mime'),
  walker = walk.walk("/home/meja/Data/bmj");

const chain = new ChainJobQueue();
chain.addWorker('First Worker', (data, next) => {
  data.count++;
  console.log(JSON.stringify(data));
  next();
}).addWorker('Second Worker', (data, next) => {
  data.count++;
  console.log(JSON.stringify(data));
  next();
}).initialize();

let totalFile = 0;

walker.on("file", function (root, stats, next) {
  totalFile++;
  let item = {};
  item.path = root + '/' + stats.name;
  item.mimetype = mime.lookup(root + '/' + stats.name);
  item.count = 0;
  // console.log(JSON.stringify(item));
  chain.addTask(item);
  next();
});

walker.on("errors", function (root, nodeStatsArray, next) {
  console.log(root);
  next();
});

walker.on("end", function () {
  chain.addTask({
    stop: true
  });
  console.log("all done whith " + totalFile + " files.");
});

// setTimeout(() => {
//   chain.stopAll().then(() => {
//     console.log('chain stopped');
//   });
// }, 10000);