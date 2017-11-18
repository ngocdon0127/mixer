const request = require('request')
const CryptoJS = require('crypto-js');
const SHA256 = CryptoJS.SHA256;
global.myCustomVars = {
  const: {CHUNK: 5},
  function: {}
}

const RSAUtils = require('../utils/RSAUtils')
const fs = require('fs')
const path = require('path')
const mainKey = new RSAUtils();
mainKey.loadKeyPair(fs.readFileSync(path.join(__dirname, '../pems/main.pem')));

global.myCustomVars.const.run = true;
global.myCustomVars.const.mainKey = mainKey

function publicKey2Address (publicKey) {
  const CryptoJS = require('crypto-js');
  const SHA256 = CryptoJS.SHA256;
  return SHA256(publicKey).toString()
}

global.myCustomVars.function.publicKey2Address = publicKey2Address;

global.myCustomVars.const.address = publicKey2Address(mainKey.exportPublicKey());

/**
 * Check required parameters
 */

function checkRequiredParams (requiredParams, object) {
  if (requiredParams instanceof Array){
    for (var i = 0; i < requiredParams.length; i++) {
      if (!(requiredParams[i] in object)){
        return requiredParams[i];
      }
    }
  }
  return false;
}

global.myCustomVars.function.checkRequiredParams = checkRequiredParams;