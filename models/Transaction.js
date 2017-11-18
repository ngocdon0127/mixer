const stringify = require('json-stable-stringify')
const RSAUtils = require('../utils/RSAUtils')
const CryptoJS = require('crypto-js')
const SHA256 = CryptoJS.SHA256
const publicKey2Address = global.myCustomVars.function.publicKey2Address

module.exports = (inputCoins, outputCoins, skipValid) => {
  let transaction = {
    time: new Date(),
    inputCoins: inputCoins,
    outputCoins: outputCoins
  }
  transaction.validAmount = function() {
    let ai = this.input();
    let ao = this.output();
    return (ai >= 0) && (ao >= 0) && (ai >= ao)
  }
  transaction.input = function () {
    let ai = 0;
    for (var i = 0; i < inputCoins.length; i++) {
      let input = inputCoins[i];
      if (Number.isNaN(input.val) || (input.val < 0)) {
        return -1;
      }
      ai += input.val
    }
    return ai;
  }
  transaction.output = function () {
    let ao = 0;
    for (var i = 0; i < outputCoins.length; i++) {
      let output = outputCoins[i];
      if (Number.isNaN(output.val) || (output.val < 0)) {
        return -1
      }
      ao += output.val
    }
    return ao;
  }

  transaction.fee = function () {
    let ai = this.input();
    let ao = this.output();
    return this.validAmount() ? (ai - ao) : 0
  }

  transaction.coinsOf = function (addr) {
    let result = {
      inputCoins: [],
      outputCoins: []
    }
    for(let coin of this.inputCoins) {
      if (coin.addr == addr) {
        result.inputCoins.push(coin)
      }
    }
    for(let i = 0; i < this.outputCoins.length; i++) {
      let coin = this.outputCoins[i]
      if (coin.addr == addr) {
        result.outputCoins.push({
          addr: coin.addr,
          val: coin.val,
          coinIdx: i
        })
      }
    }
    return result
  }

  transaction.getDetail = function () {
    let result = {}
    for (var i = 0; i < this.inputCoins.length; i++) {
      let coin = this.inputCoins[i];
      if (!(coin.addr in result)) {
        result[coin.addr] = 0;
      }
      result[coin.addr] -= coin.val;
    }

    for (var i = 0; i < this.outputCoins.length; i++) {
      let coin = this.outputCoins[i];
      if (!(coin.addr in result)) {
        result[coin.addr] = 0;
      }
      result[coin.addr] += coin.val;
    }

    return result
  }

  transaction.validCoinSignatures = function () {
    let keys = {}
    for (let i = 0; i < this.inputCoins.length; i++) {
      let coin = this.inputCoins[i];
      // console.log(coin);
      let key = null;
      if (!keys[coin.addr]) {
        key = new RSAUtils();
        key.loadPublicKey(coin.publicKey);
        let addr_ = publicKey2Address(key.exportPublicKey())
        if (coin.addr != addr_) {
          console.log('invalid coin addr', coin.addr, addr_);
          return false;
        }
        keys[coin.addr] = key;
      } else {
        key = keys[coin.addr]
      }
      let t = stringify({
        blockIdx: coin.blockIdx,
        transIdx: coin.transIdx,
        coinIdx: coin.coinIdx,
        publicKey: coin.publicKey
      })
      // console.log('text');
      // console.log(t);
      t = SHA256(t).toString()
      // console.log('hash');
      // console.log(t);
      // console.log(coin.signature);
      if (!key.verify(t, coin.signature)) {
        // console.log('validate coin failed');
        // console.log(t);
        // console.log(coin.signature);
        return false;
      }
    }
    return true;
  }

  return (skipValid || transaction.validAmount()) ? transaction : null;
}