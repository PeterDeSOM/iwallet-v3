# Som32 Multi-Featured Wallet

Som32 Multi-Featured Wallet is a Wallet that supports Multi-Currency and Multi-Signature functionalities. It could also resolve some issues on keeping their wallets secure with not store in the centralized server or any machines online.

## Featues

- **Multi-Currency:** It provides Bitcoin, Ethereum and EOS, also their tokens as well. 

- **Hierarchical Deterministic Wallets:** For handling and keeping user's keys and
  wallet safer, it supports to create the Extended Private/Public Keys.

- **Mnemonic code for generating deterministic keys:** For easy to remember
  security keyword or code than raw binary or hexadecimal representations of a wallet,
  it provides automatically generating the Mmenonic Words.

- **15-of-15 Multi-Signature:** Som32 Wallet supports multi-signature and
  provides up to 15-of-15 authorizers to sign a transaction.

- **Offline Wallet:** Som32 Wallet is a secure offline savings wallet with simplified
  wallet process, everyone can easily access and transact.

- **Partially Signed Transaction:** Also it can process their transaction with
  Partially Signed Transaction feature either online or offline.

  - Bitcoin ― Som32 Convenient PSBT Service (Complete)
  - Ethereum ― Smart Contract for Som32 Multi-Signature Service (In progress)
  - EOS ― (Scheduled)

## Usage

Som32 Wallet is not in production mode yet. It is currently developing mode on the 
testnet, so it can not be used in the real world's bitcoin transaction, sending and 
receiving user's money yet, but could be soon.

As of January 2019,

- Bitcoin ― Most of the features are completed and testing.
- Ethereum ― Developing
- EOS ― Scheduled

### Key libraries for this wallet are;

```javascript
import * as BitcoinLib from 'bitcoinjs-lib'
import BIP32 from 'bip32'
import BIP39 from 'bip39'
import * as BIP174 from '@som32/lib/swaps-service/bip174'
import * as EthUtil from 'ethereumjs-util'
import { Transaction as EthTx } from 'ethereumjs-tx'
import * as EosLib from 'eosjs'
```
Most of these libraries work fine but not some, e.g., BIP174, that's why some part of 
source files of the library was modified in coding the Som32 Wallet's library [as below](#library-souce-files-modified).

### Som32 Wallet Import Format

To export and import Som32 wallet you created, it has to comply with the rule of the 
Som32 Wallet Import Format (Som32 WIF), if not, it could be caused not to bring them 
correctly. It is composed 3 main parts that are for the single account handling the whole wallet process at the bottom, shared account to manage the multi-sig 
functionalities at the next level and the BIPs fundamentals of the wallet's security 
policies.

```
{
    "version":"0.2.1",
    "network":"testnet",
    "account":{
        "type":"shared",
        "payto":["n2wpkh","n2wsh"],
        "opened":"2N1cpjDkRQsvTi6NxzKkcdNwehcMSZQog2r",
        "single":[
            {
                "name":"First MultiSig",
                "address":"2MvimbZVaddWxsuhDH3SKSSy89KKqrVQiDE",
                "pubkey":"028a56af1b94e65bd63cad4d0bac28ce6d05d4f12c769545495aaf222cb2f527a7",
                "wif":"cQwCQpax18dh6eV4cRNp8BRWCFqb2z7G51f1T6UzRc5ALCvL87vh",
                "multis":[
                    "2N1cpjDkRQsvTi6NxzKkcdNwehcMSZQog2r"
                ],
                "desc":"sh(wpkh([cbe87c4c/44'/0'/0'/0/0'] 028a56af1b94e65bd63cad4d0bac28ce6d05d4f12c769545495aaf222cb2f527a7))"
            }
        ],
        "shared":[
            {
                "name":"First MultiSig",
                "address":"2N1cpjDkRQsvTi6NxzKkcdNwehcMSZQog2r",
                "m":2,
                "n":3,
                "pubkeys":[
                    "028a56af1b94e65bd63cad4d0bac28ce6d05d4f12c769545495aaf222cb2f527a7",
                    "02663965e88d09f86576bb60d6b2d3b035fa4c33a41c3a77e7fbceed160e51d5d3",
                    "032dd4a3bbd16b2a1f388924eaaa0ae57c69c0ebd4b288fc756f263e293868fdba"
                ],
                "script":{
                    "pubkey":"a9145bd6bdbf3c956f659e3f3a3ee146905c8f3d6d0f87",
                    "redeem":"0020d270870b3cf4dca0664f4164b9db68bd6737ea00f470a40a2b50dab1db8ddc4a",
                    "witess":"5221028a56af1b94e65bd63cad4d0bac28ce6d05d4f12c769545495aaf222cb2f527a72102663965e88d09f86576bb60d6b2d3b035fa4c33a41c3a77e7fbceed160e51d5d321032dd4a3bbd16b2a1f388924eaaa0ae57c69c0ebd4b288fc756f263e293868fdba53ae"
                },
                "singles":[
                    "2MvimbZVaddWxsuhDH3SKSSy89KKqrVQiDE",
                    "2N2Wo5dCWvyvL65eTWHvPNzQFSriKzbkLyt"
                ],
                "desc":"sh(wsh(multi(2,[241aafd7/44'/0'/0'/0/0'] 028a56af1b94e65bd63cad4d0bac28ce6d05d4f12c769545495aaf222cb2f527a7,[f9842d14] 02663965e88d09f86576bb60d6b2d3b035fa4c33a41c3a77e7fbceed160e51d5d3,[f9842d14] 032dd4a3bbd16b2a1f388924eaaa0ae57c69c0ebd4b288fc756f263e293868fdba)))"
            }
        ],
        "bip32":{
            "levels":"BIP44","path":"m/44'/0'/0'/0/0"
        },
        "bip39":{
            "_entropy":128,
            "_code":"truck version void empty actress clock practice roof pond tissue kit please"
        }
    },
    eth: {
        single:[
            ...
        ],
        shared:[
            ...
        ],
        totken:[
            {
                abi: ...
            }
        ],
    },
    eos: {
        single:[
            ...
        ],
        shared:[
            ...
        ],
        totken:[
            ...
        ],
    }
}
```

## Installation

```
git clone https://github.com/PeterDeSOM/iwallet.git`
npm install
```

### Patching webpack-configs

In the Angular project, some issues with the angular package error could be occured. To solve this problem, we need to patch some webpack-config that is 'node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/browser.js'

```javascript
const fs = require('fs');
const f = 'node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/browser.js';

fs.readFile(f, 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    var result = data.replace(/node: false/g, 'node: {crypto: true, stream: true, fs: \'empty\', net: \'empty\', tls: \'empty\'}');

    fs.writeFile(f, result, 'utf8', function (err) {
        if (err) return console.log(err);
    });
});
```

Script above coded in 'patch.js', so we can execute it on running angular with this command;

```javascript
node patch.js
```

### Som32 Conveinent PSBT Service

[Som32 Conveinent PSBT Service](https://github.com/PeterDeSOM/api-server) is an API Service developed in Golang, and its data is stored in LevelDB.

### Ethereum Smart Contract for Som32 Multi-Signature Service

```javascript
    pragma solidity >=0.4.22 <0.6.0;
    import "./som32.token.erc20.sol";

    /**
     * @title Som32 Multi-Signature Service - Som32 Multi-Signature Service service supports Multi-Signature feature for the ETH transaction, and it provides up to 15-of-15 authorizers to sign a Multi-Sig transaction.
     * @author Peter Kim - <peterkim@crypblorm.com>
     */
    contract Som32MultiSigService {

        string private name;
        uint8 private m;
        uint8 private n;
        address[] private members;
        uint32 private txscount;

        ...

        struct PSET {
            address recipient;
            uint256 amount;
            uint32 timelimit;
            address[] signed;
            bytes1 state;
        }

        ...

        function createPset(address _recipient, uint256 _amount, uint32 _timelimit) public return (uint32 txid) {
            let txid_ = txscount;
            
            psets[_txid_] = PSET(_recipient, _amount, _timelimit, [], "0x00");
            psetstate[_txid_] = psets[_txid_].state;
            txscount += 1;

            ...

            return txid_;
        }

        function signPset(...) ... {
            ...
        }

        function completePset(...) ... {
            ...
        }

        function pushPset(...) ... {
            ...
        }

        ...

    }
```

### Library souce files modified

As metioned above, some library source files have been modified for specified functionalities in Som32 Wallet.

- bitcoinjs-lib/transaction_builder.js

  ```javascript
  TransactionBuilder.prototype.signHasSig = function (vin, sigPair, redeemScript, hashType, witnessValue, witnessScript) {

    ...

    const signature = sigPair.signature
    input.signatures[i] = bscript.signature.encode(signature, hashType)
  
    ...
  
  }
  ```

  To sign the bitcoin transaction(s) with already signed signature, there was no function in its original version to make it possible, that's why "signHasSig" function has been added to the "bitcoinjs-lib" library. This is not the forked version from the repository, it's just an added function to the existing node_module library. it means that we have to modify and update existing "bitcionjs-lib" under the "node_modules" source directory.

- bitcoinjs-lib@type/index.ts

  This is the package that contains type definitions for bitcoinjs-lib.

  ```javascript
  signHasSig(vin: number, sigPair: any, redeemScript?: Buffer, hashType?: number, witnessValue?: number, witnessScript?: Buffer): void;
  ```

- @som32/lib/swaps-service/bip174

  This library is providing by the Submarine swap service for the PSBT (Partially Signed Bitcoin Transaction), but they might not fully support on PSBT service, because of some parts of their BIP 174 package are defected. It was debugged, updated and marked with initial "PETERKIM" in the source code.


  ```javascript
    /* 
     * decode_psbt.js  - PETERKIM, 18/12/29 
     * - commented & assigned forced value 1.
     * - this causes raising an error "ERROR RangeError: offset is not uint"
     */
    // input.sighash_type = value.readUInt32LE();
    input.sighash_type = 1
    break;

    ,

    // sign_psbt.js - PETERKIM, 181229 change 'if' statement to 'else if' statement
    // if (!!input.witness_script && !!input.redeem_script) {
    } else if (!!input.witness_script && !!input.redeem_script) {

    ,

    // update_psbt.js - PETERKIM, 190123, commented and add condition for not hash ---
    // const [, hash] = decompile(script);
    [, hash, hashend] = decompile(script);
    // typeof hash must be a Uint8Array(20)
    if(typeof hash == 'number') hash = hashend
  ```

