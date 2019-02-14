var BitcoinLib = require("bitcoinjs-lib");
var BIP32 = require("bip32");
var BIP39 = require("bip39");
var BIP174 = require('@som32/lib/swaps-service/bip174');
var FileSaver = require('file-saver');

var mnemonic = BIP39.generateMnemonic(128, rng, mnenonic);
var seedBuf = BIP39.mnemonicToSeed(mnemonic, password);
var seedHex = seedBuf.toString('hex');
console.log(`mnemonic: %s`, mnemonic);
console.log(`mnemonic to string: %s`, mnemonic.toString());
console.log(`seed Buffer: %s`, seedBuf);
console.log(`seed Hex: %s`, seedBuf.toString('hex'));

var bip32Wallet = BIP32.fromSeed(seedBuf);
console.log(`bip32Wallet: %s`, JSON.stringify(bip32Wallet.derive()));


typeforce({
    privateKey: UINT256_TYPE,
    chainCode: UINT256_TYPE
}, { privateKey, chainCode })
network = network || BITCOIN


var network = BitcoinLib.networks.bitcoin

if (!ecc.isPrivate(privateKey)) throw new TypeError('Private key not in range [1, n)')

var _bip32 = new BIP32(privateKey, null, chainCode, network)
var pymtExtKey = _bip32.derivePath("m/44'/0'/0'/0/0");

pymtExtKey.priva

var _request = require('request')
