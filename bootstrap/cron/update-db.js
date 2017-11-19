const mongoose = require('mongoose')
const Participation = mongoose.model('Participation')
const async = require('asyncawait/async')
const await = require('asyncawait/await')
const request = require('request')
const CHUNK = global.myCustomVars.const.CHUNK
const publicKey2Address = global.myCustomVars.function.publicKey2Address
const fs = require('fs')
const path = require('path')
const CryptoJS = require('crypto-js')
const SHA256 = CryptoJS.SHA256;
const RSAUtils = require('../../utils/RSAUtils')
const stringify = require('json-stable-stringify')

require('seedrandom');

const PAR_STT_PENDING = 'pending'
const PAR_STT_RECEIVED = 'received'
const PAR_STT_PROCESSING = 'processing'
const PAR_STT_REJECTED = 'rejected'
const PAR_STT_SUCCESS = 'success'
const PAR_STT_RETAINED = 'retained'

setInterval(() => {
  updatePendingParticipation()
}, 5000)

setInterval(() => {
  processValidParticipation()
}, 2000)

setInterval(() => {
  finishProcessingParticipation()
}, 2000)

function updatePendingParticipation() {
  async(() => {
    let participations = await (new Promise((resolve, reject) => {
      Participation.find({status: PAR_STT_PENDING}, (err, pars) => {
        if (err) {
          console.log(err);
          return resolve(null)
        }
        if (pars.length < 1) {
          return resolve(null)
        }
        return resolve(pars)
      })
    }))
    if (!participations) {
      return;
    }
    // console.log(`checking ${participations.length} pending participations`);
    for (var i = 0; i < participations.length; i++) {
      let participation = participations[i]
      let kesc = participation.kesc;
      let r = await (new Promise((resolve, reject) => {
        // console.log('http://localhost:2000/wallet/' + kesc);
        request('http://localhost:2000/wallet/' + kesc, (err, response, body) => {
          if (err) {
            console.log(err);
            return resolve(null)
          }
          if (response.statusCode != 200) {
            console.log(`GOT ${response.statusCode} while getting info about ${kesc}`);
            return resolve(null)
          }
          body = JSON.parse(body);
          resolve({status: 'success', balance: body.balance})
        })
      }))
      if (!r) {
        continue
      }
      // console.log(r);
      if (r.balance >= CHUNK) {
        console.log('participation ' + participation._id + ' received enough money');
        participation.status = PAR_STT_RECEIVED
        participation.save()
      }
    }
  })()
}

function processValidParticipation() {
  async(() => {
    let currentBlockChainLen = await (new Promise((resolve, reject) => {
      request('http://localhost:2000/healthy', (err, response, body) => {
        if (err) {
          console.log(err);
          return resolve(null)
        }
        if (response.statusCode != 200) {
          console.log(`GOT ${response.statusCode} while getting info about blockchain`);
          return resolve(null)
        }
        body = JSON.parse(body);
        // console.log(body);
        return resolve(body.chainLength > 0 ? body.chainLength : 0)
      })
    }))
    if (!currentBlockChainLen) {
      return console.log('Cannot not get info about blockchain');
    }
    let participations = await (new Promise((resolve, reject) => {
      Participation.find({status: PAR_STT_RECEIVED}, (err, pars) => {
        if (err) {
          console.log(err);
          return resolve(null)
        }
        if (pars.length < 1) {
          return resolve(null)
        }
        return resolve(pars)
      })
    }))
    if (!participations) {
      return;
    }
    let privateKeys = {}
    fs.readdirSync(path.join(__dirname, '../../pems'), {encoding: 'utf8'}).map((fileName) => {
      if (!fileName.localeCompare('main.pem')) {
        return;
      }
      let key = new RSAUtils();
      key.loadKeyPair(fs.readFileSync(path.join(__dirname, '../../pems', fileName)))
      let publicKey = key.exportPublicKey();
      let addr = publicKey2Address(publicKey);
      let r = await (new Promise((resolve, reject) => {
        request('http://localhost:2000/wallet/' + addr, (err, response, body) => {
          if (err) {
            console.log(err);
            return resolve(null)
          }
          if (response.statusCode != 200) {
            console.log(`GOT ${response.statusCode} while getting info about ${addr}`);
            return resolve(null)
          }
          body = JSON.parse(body);
          resolve({status: 'success', balance: body.balance, coins: body.coins})
        })
      }))
      if (!r || (r.balance <= CHUNK)) {
        return;
      }
      privateKeys[addr] = {
        addr: addr,
        balance: r.balance,
        publicKey: publicKey,
        privateKey: key.exportKeyPair(),
        key: key,
        coins: r.coins
      }
    });
    // console.log(Object.keys(privateKeys));
    let rsakeys = []
    let coins = []
    for(let k in privateKeys) {
      let key = privateKeys[k]
      privateKeys[k].coins.map(c => {
        coins.push(c)
        rsakeys.push(privateKeys[k].key)
      })
      console.log(`${key.addr} : ${key.balance}`);
    }
    for (var i = 0; (i < participations.length) && (Object.keys(coins).length > 0); i++) {
      let participation = participations[i];
      // check valid participation
      let p = participation.p;
      let block = await (new Promise((resolve, reject) => {
        request(`http://localhost:2000/block/${participation.t1 + participation.w}?datatype=json`, (err, response, body) => {
          if (err) {
            console.log(err);
            return resolve(false)
          }
          if (response.statusCode != 200) {
            console.log(body);
            console.log(`GOT ${response.statusCode} while trying to get blockchain info`);
            return resolve(false)
            
          }
          body = JSON.parse(body)
          return resolve(body.block)
        })
      }))
      if (!block) {
        continue
      }
      console.log(`t2: ${participation.t2}, nonce: ${participation.n}, proof: ${block.proof}`);
      let modifiedRandom = new Math.seedrandom((participation.n | block.proof) + '')
      let random = modifiedRandom();
      console.log('random: ', random);
      if (random < p) {
        console.log(`Participation ${participation._id} retained. Nice`);
        participation.status = PAR_STT_RETAINED
        return participation.save()
      }
      let transactionBody = createTransactionBody({addresses: [participation.kout], amounts: [CHUNK],
        coins,
        keys: rsakeys,
        fee: 0.01
      })
      if (!transactionBody) {
        continue;
      }
      // return;
      
      let r = await (new Promise((resolve, reject) => {
        request.post({
          url: 'http://localhost:2000/transaction',
          body: JSON.stringify({inputs: transactionBody.inputs, outputs: transactionBody.outputs}),
          headers: {
            'Content-Type': 'application/json'
          }
        }, (err, response, body) => {
          if (err) {
            console.log(err);
            return resolve(false)
          }
          if (response.statusCode != 200) {
            console.log(body);
            console.log(`GOT ${response.statusCode} while trying to add transaction`);
            return resolve(false)
            
          }
          body = JSON.parse(body)
          return resolve(body)
        })
      }))
      if (!r) {
        continue
      }
      if (r.status == 'success') {
        console.log(r);
        let noUsedCoins = transactionBody.inputs.length;
        console.log('now splice', noUsedCoins, 'coins');
        rsakeys.splice(0, noUsedCoins)
        coins.splice(0, noUsedCoins)
        console.log(`sent ${CHUNK} BTC to ${participation.kout}`);
        participation.txHash = r.transaction.hash
        participation.status = PAR_STT_PROCESSING
        participation.save()
      }
    }
  })()
}

function createTransactionBody(bundle) {
  let addresses = bundle.addresses
  let amounts = bundle.amounts
  let coins = bundle.coins
  let keys = bundle.keys
  let fee = bundle.fee
  if (!(addresses instanceof Array) || !(amounts instanceof Array) || (addresses.length != amounts.length) || (addresses.length < 1)) {
    console.log('invalid addresses, amounts');
    return false;
  }
  if (!(coins instanceof Array) || !(keys instanceof Array) || (coins.length != keys.length) || (coins.length < 1)) {
    console.log('invalid coins, keys');
    return false;
  }
  let outputs = []
  var totalAmount = 0;
  for(var i = 0; i < amounts.length; i++) {
    var e = amounts[i];
    var a = addresses[i];
    var amount = parseFloat(e);
    if (Number.isNaN(amount) || (amount < 0)) {
      continue
    }
    if (!a) {
      continue;
    }
    totalAmount += amount;
    outputs.push({
      addr: a,
      val: amount
    })
  }
  fee = parseFloat(fee);
  if (Number.isNaN(fee) || (fee < 0)) {
    console.log('invalid fee');
    return false
  }

  var inputs = []
  var sum = 0;
  for (var i = 0; i < coins.length; i++) {
    var coin = coins[i];
    var key = keys[i];
    var input = {
      "blockIdx": coin.blockIdx,
      "transIdx": coin.transIdx,
      "coinIdx": coin.coinIdx,
      "publicKey": key.exportPublicKey()
    }
    var t = stringify(input);
    t = SHA256(t).toString();
    var signature = key.sign(t, 'base64');
    // console.log(signature);
    input.signature = signature
    inputs.push(input)
    sum += coin.val;
    if (sum >= totalAmount + fee) {
      break;
    }
  }

  if (sum < totalAmount + fee) {
    console.log('Not enough money')
    return false
  }

  if (sum > totalAmount + fee) {
    outputs.push({
      addr: publicKey2Address(keys[0].exportPublicKey()),
      val: sum - totalAmount - fee
    })
  }
  return {inputs, outputs}
}

function finishProcessingParticipation() {
  async(() => {
    let participations = await (new Promise((resolve, reject) => {
      Participation.find({status: PAR_STT_PROCESSING}, (err, pars) => {
        if (err) {
          console.log(err);
          return resolve(null)
        }
        if (pars.length < 1) {
          return resolve(null)
        }
        return resolve(pars)
      })
    }))
    if (!participations) {
      return;
    }

    for (var i = 0; i < participations.length; i++) {
      let participation = participations[i]
      let r = await (new Promise((resolve, reject) => {
        // console.log('http://localhost:2000/wallet/' + kesc);
        request('http://localhost:2000/transaction/' + participation.txHash, (err, response, body) => {
          if (err) {
            console.log(err);
            return resolve(null)
          }
          if (response.statusCode != 200) {
            console.log(`GOT ${response.statusCode} while getting info about ${kesc}`);
            return resolve(null)
          }
          body = JSON.parse(body);
          resolve({status: 'success', transaction: body.transaction, confirmations: body.confirmations})
        })
      }))
      if (!r) {
        continue
      }
      // console.log(r);
      if (r.confirmations >= 3) {
        console.log('participation ' + participation._id + ' sent enough money to kout');
        participation.status = PAR_STT_SUCCESS
        participation.save()
      }
    }
    
  })()
}