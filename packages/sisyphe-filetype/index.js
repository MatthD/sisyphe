'use strict';

const os = require('os'),
  platform = os.platform(),
  Promise = require('bluebird'),
  child_process = Promise.promisifyAll(require('child_process')),
  fs = Promise.promisifyAll(require('fs')),
  mime = Promise.promisifyAll(require('mime')),
  path = require('path'),
  isXml = require('is-xml'),
  firstline = require('firstline');

const sisypheXml = {};

sisypheXml.doTheJob = function (data, next) {

  if(data.mimetype){
    return next(null,data)
  }

  // Permet d'identifier les fichiers .nxml (BMJ) et .Meta (Springer) comme mimetype XML
  mime.define({
    'application/xml': ["nxml", "meta", "xlink_v03", "prime_v03", "plusxml_v02", "plusprime_v02", "info_V03", "citation_v03", "aux_v03"]
  });

  var datapath = data.path.replace(/ /g,'\ ');
  let mimetype = mime.lookup(data.path);

  //console.log(data.name, mimetype)

  firstline(data.path).then(line1=>{
    if(isXml(line1)){
      //console.log(data.name, 'firstline', 'application/xml')
      return 'application/xml'
    }
    //console.log(data.name, 'firstline', 'application/octet-stream');
    return 'application/octet-stream'
  }).catch(err=>{
    // Err loading first line 
    //console.log(data.name, 'CatchFirstline', 'application/octet-stream');
    return 'application/octet-stream'
  }).then(mimeResult=>{
    // Could now check all data of file
    if(mimeResult === 'application/octet-stream'){
      //console.log('X',data.name, mimeResult);
      return fs.readFileAsync(datapath,'utf8').then(dataFile=>{
        let nbOfXmlBalise = (dataFile.match(/<[\s\S]*?>/g) || []).length,
            seemsXml = isXml(dataFile);
        if(seemsXml || nbOfXmlBalise >= 10){
          return 'application/xml'
        }
        //console.log(data.name, 'fulldata', mimeResult);
        return mimeResult
      }).catch(err=>{
        console.log(data.name, 'CatchFulldata', mimeResult, err);
        // Err loading full data
        return mimeResult;
      })
    }
    return mimeResult;
  })
  // This is in test building ...
  .then(mimeResult=>{
    //will detect wia filesystem Info
    if(mimeResult != 'application/xml'){
      switch(platform){
        //OSX
        case 'darwin':
          return child_process.execAsync(`file -b --mime-type ${datapath}`)
          .then((stdout, stderr)=>{
            if(stderr){
              // add corrupt message here to data
              return mimeResult;
            }
            //console.log(stdout.replace(/\n|\r/g, ''));
            return stdout.replace(/\n|\r/g, '');
          }).catch(err=>{
            console.log('errFile',err)
            return mimeResult
          })
        //Windows
        case 'win32':
          return 
        //Linux
        default:
          return 
      }
    }
    return mimeResult;
  })
  .then(filetype=>{
    //console.log(data.name, filetype);
    data.mimetype = filetype;
    return next(null,data)
  })
};

module.exports = sisypheXml;