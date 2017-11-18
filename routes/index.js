var express = require('express');
var router = express.Router();
const async = require('asyncawait/async')
const await = require('asyncawait/await')
const request = require('request')
const BlockChain = require('../models/BlockChain');
const Transaction = require('../models/Transaction');
const CryptoJS = require('crypto-js');
const SHA256 = CryptoJS.SHA256;
const mongoose = require('mongoose');
const Participation = mongoose.model('Participation')
const RSAUtils = require('../utils/RSAUtils')

const PAR_STT_PENDING = 'pending'
const PAR_STT_RECEIVED = 'received'
const PAR_STT_PROCESSING = 'processing'
const PAR_STT_REJECTED = 'rejected'
const PAR_STT_SUCCESS = 'success'

// const address = SHA256((new Date()).getTime() + '' + Math.random() * 1000000).toString();
// const address = SHA256(process.env.PORT).toString();
const address = global.myCustomVars.const.address;
console.log('this node:', address);
const CHUNK = global.myCustomVars.const.CHUNK;

const checkRequiredParams = global.myCustomVars.function.checkRequiredParams;
const publicKey2Address = global.myCustomVars.function.publicKey2Address;
const mainKey = global.myCustomVars.const.mainKey;

router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'success',
    address: address,
    publicKey: mainKey.exportPublicKey()
  })
})

router.get('/participation-permalink/:pid', (req, res) => {
  async(() => {
    let r = await (new Promise((resolve, reject) => {
      Participation.findById(req.params.pid, (err, par) => {
        if (err) {
          res.status(500).json({
            status: 'error',
            error: err
          })
          return resolve({status: 'error'})
        }
        if (!par) {
          res.status(400).json({
            status: 'error',
            error: 'Not found'
          })
          return resolve({status: 'error'})
        }
        return resolve({
          status: 'success',
          participation: par
        })
      })
    }))
    if (r.status != 'success') {
      return;
    }
    let participation = r.participation;
    r = await (new Promise((resolve, reject) => {
      request('http://localhost:2000/wallet/' + participation.kesc, (err, response, body) => {
        if (err) {
          console.log(err);
          return resolve(null)
        }
        if (response.statusCode != 200) {
          console.log(`GOT ${response.statusCode} while getting info about ${participation.kesc}`);
          return resolve(null)
        }
        body = JSON.parse(body);
        resolve({status: 'success', balance: body.balance})
      })
    }))
    if (!r) {
      return res.status(500).json({
        status: 'error',
        error: 'Error while checking balance of ' + participation.kesc
      })
    }
    return res.status(200).json({
      status: 'success',
      participation: participation,
      balance: r.balance
    })
  })()
})

router.post('/participation', (req, res) => {
  let missingParam = checkRequiredParams(['t1', 'kout',
    't2', 'p', 'n', 'w'], req.body);
  if (missingParam) {
    return res.status(400).json({
      status: 'error',
      error: `Missing ${missingParam}`
    })
  }
  let t1 = parseInt(req.body.t1)
  let t2 = parseInt(req.body.t2)
  let p = parseFloat(req.body.p)
  let n = parseInt(req.body.n)
  let w = parseInt(req.body.w)
  if ((t1 <= 0) || (t2 <= 0) || (w <= 0) || (t1 + w >= t2)) {
    return res.status(400).json({
      status: 'error',
      error: `Invalid t1, t2, w`
    })
  }
  let mixRequest = new Participation();
  ['t1', 'kout',
    't2', 'p', 'n', 'w'].map(p => {
      mixRequest[p] = req.body[p]
    })
  mixRequest.status = PAR_STT_PENDING
  async(() => {
    let newKey = new RSAUtils();
    let kesc = '';
    while (1) {
      newKey.generateKeyPair();
      kesc = publicKey2Address(newKey.exportPublicKey());
      // kesc = '5a3023a2347601c15ca8770d5fb4870ccc096d15b126d7f63d2d4ce9d1094ae2';
      let r = await (new Promise((resolve, reject) => {
        Participation.find({$or: [{kesc: kesc}, {kout: kesc}]}, (err, pars) => {
          if (err) {
            console.log(err);
            return resolve({
              status: 'error'
            })
          }
          if (pars.length > 0) {
            console.log(pars);
            console.log('existed addr:', kesc);
            return resolve({status: 'existed'})
          }
          return resolve({status: 'ok'})
        })
      }))
      if (r.status == 'ok') {
        break;
      }
    }

    mixRequest.kesc = kesc;
    let now = new Date();
    mixRequest.timestamp = now

    mixRequest.save(e => {
      if (e) {
        console.log(e);
        return res.status(500).json({
          status: 'error',
          error: e
        })
      }
      let text =
`-----BEGIN RSA SIGNED MESSAGE-----
Hash: SHA256

This is Letter of Guarantee for the participation ${mixRequest._id}.
We confirms that the outputs stated bellow will be sent to you when we receive ${CHUNK} BTC to address ${kesc}.

List of the outputs
Address: ${mixRequest.kout}, delay: 0 hours, value: ${CHUNK} BTC

Permanent link for the participation
/participation-permalink/${mixRequest._id}

Date: ${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}
-----END RSA SIGNED MESSAGE-----
`
      let signature = mainKey.sign(text)
      let letter = text +
`-----BEGIN RSA SIGNATURE-----
${signature}
-----END RSA SIGNATURE-----
`
      return res.status(200).json({
        status: 'success',
        participation: mixRequest,
        letter: letter,
        signedText: text,
        signature: signature
      })
    })
  })()
  

})


module.exports = router;
