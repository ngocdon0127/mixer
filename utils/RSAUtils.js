const NodeRSA = require('node-rsa');
const formatPublicKey = 'pkcs1-public-pem'
const formatPrivateKey = 'pkcs1-private-pem'
// const fs = require('fs')
// let key = new NodeRSA('donnn', 'pkcs1-private-pem')
// let key = new NodeRSA(`-----BEGIN RSA PUBLIC KEY-----
// MIGJAoGBAK4hiwPBT95kffY/2eqN/ZGAVOfJP2ByzbwMpIusaOj6RIm4TVcBN1RT
// QfGEhcVekWU2ey8xxnzIIE/ZBzcuIJAPAM1XSlcEP3uXh/o4gtormANtH3IVifHd
// 3h14PCA6Cses7A1Qm5X+k8Z/ESEsGr+dUMq/1zJTVdzqVGk9lSg5AgMBAAE=
// -----END RSA PUBLIC KEY-----`, 'pkcs1-public-pem')

// let text = 'Hello'
// let cipher = key.encrypt(text, 'base64')
// console.log('cipher', cipher);
// cipher = key.encrypt(text, 'base64')
// console.log('cipher', cipher);
// // console.log('cipher encrypted by private key', key.encryptPrivate(text, 'base64'));
// let decrypted = key.decryptPublic('kggZw9C8pO28hlIAzbBdOhotVd07G/SYmGdl5vGhac7TgbZDIqLd5eQESmMjixhT9jJv4o4pEU76dTIlRu5TaS03UmJHnPSeuAGEJ0aAktxIHm34dtEN+hHq1AV7V/wAUcQFlAbX0HORKUKfHUbovfz4MHa+x9PBo/HrRAHmVoI=', 'utf8')
// console.log('decrypted', decrypted);

// let exportedKey = key.exportKey('pkcs1-public-pem')
// console.log(exportedKey);
// // fs.writeFileSync('key.pub', exportedKey)

// // let signature = key.sign(text, 'base64')
// // console.log('signature', signature.toString('base64'));

// console.log(key.verify(new Buffer(text), 'ecLfThuza7ZbaVGJiCN5vrkZJUWQSGALrMUZID8D+WLv+O72h77lY5SU70Tzz08uXO6jFZ6du5LkgD12Ir2lYl5kJHBONNwKEcF5uZ6jt8eU5ydqINHGpM1of0kbllAT2O39Vp0FQqf5c6sj0BGv3dxPVN4oq1TaYuZGM7BRogk=', 'utf8', 'base64'));

let RSAUtils = function () {
  this.key = null;
  this.generateKeyPair = function (bitLen) {
    if (bitLen) {
      return this.key = NodeRSA({b: bitLen})
    }
    return this.key = NodeRSA({b: 1024})
  }

  this.loadKeyPair = function (str) {
    return this.key = NodeRSA(str, formatPrivateKey)
  }

  this.loadPublicKey = function (str) {
    return this.key = NodeRSA(str, formatPublicKey)
  }

  this.exportPublicKey = function () {
    return this.key.exportKey(formatPublicKey)
  }

  this.exportKeyPair = function () {
    return this.key.exportKey(formatPrivateKey)
  }

  this.encryptUsingPrivateKey = function (text) {
    return this.key.encryptPrivate(text, 'base64')
  }

  this.encryptUsingPublicKey = function (text) {
    return this.key.encrypt(text, 'base64')
  }

  this.decryptUsingPublicKey = function (cipher) {
    return this.key.decryptPublic(cipher, 'utf8')
  }

  this.decryptUsingPrivateKey = function (cipher) {
    return this.key.decrypt(cipher, 'utf8')
  }

  this.sign = function (text) {
    return this.key.sign(text, 'base64')
  }

  this.verify = function (text, signature) {
    return this.key.verify(text, signature, 'utf8', 'base64')
  }
  
  return this;
}

module.exports = RSAUtils;