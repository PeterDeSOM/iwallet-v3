import { Injectable } from '@angular/core'
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'
import * as BitcoinLib from 'bitcoinjs-lib'
import BIP32 from 'bip32'
import BIP39 from 'bip39'
import * as BIP174 from '@som32/lib/swaps-service/bip174'
import { Txbuilder } from '@som32/transaction'
import { 
    IBitcoinjsBIP32, IBitcoinjsP2MS, IBitcoinjsP2PK, IBitcoinjsP2PKH, IBitcoinjsP2SH,
    IBlockchainInfoUnspent, 
    ISom32Account, ISom32Extenal, ISom32PsbtDecoded, ISOM32RawTxToSend, ISOM32TxFormToSend, ISom32AccountShared, ISom32AccountSingle, ISom32Balance 
} from '@som32/interfaces'
import { C } from '@som32/globals'

import * as EthUtil from 'ethereumjs-util'
const EthTx = require('ethereumjs-tx')

@Injectable({
    providedIn: 'root',
})
export class WalletService {

    private _network: BitcoinLib.Network

    public som32: Som32
    public balance: ISom32Balance

    constructor() {
        this.balance = {
            total_received      : 0,
            total_sent          : 0,
            balance             : 0,
            unconfirmed_balance : 0,
            final_balance       : 0,
            n_tx                : 0,
            unconfirmed_n_tx    : 0,
            final_n_tx          : 0,
        }
        this.initialize() 
    }

    public get network(): { name: string, c: BitcoinLib.Network } {
        return {
            name: this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET,
            c: this._network,
        }
    }

    public initialize(network?: string) {
        if('wallet' in sessionStorage) {
            let wallet = <ISom32Extenal>JSON.parse(sessionStorage.getItem(C.SESSION_PATH_WALLET))

            if(wallet.network == 'mainnet') this._network = BitcoinLib.networks.bitcoin
            else this._network = BitcoinLib.networks.testnet

            this.som32 = new Som32(this._network)
            this.som32.import(wallet)

        } else if(!!network) {

            if(network == 'mainnet') this._network = BitcoinLib.networks.bitcoin
            else this._network = BitcoinLib.networks.testnet

            this.som32 = new Som32(this._network)
        }
    }

    public isshared(): boolean {
        return this.som32.isshared
    }

    public isAddressValid(address: string): boolean {
        try {
            BitcoinLib.address.toOutputScript(address, this._network)
            return true
        } catch (e) {
            return false
        }
    }

    public isPassphraseValid(passphrase: string): boolean {
        if( 
            this.som32.publickey == this.som32.m(passphrase).publicKey.toString('hex') ||
            this.som32.publickey == this.som32.M(passphrase).publicKey.toString('hex')
        ) return true
        else return false
    }

    public isWalletValid(wallet: ISom32Extenal): { validated: boolean, message: string } {
        if(
            typeof wallet.version === 'undefined' ||
            typeof wallet.network === 'undefined' ||
            typeof wallet.account.opened === 'undefined' ||
            typeof wallet.account.type === 'undefined' ||
            typeof wallet.account.payto === 'undefined' || (
                wallet.account.type == 'single' &&  (
                    typeof wallet.bip32 === 'undefined' ||
                    typeof wallet.bip39 === 'undefined' 
                )
            ) || (
                typeof wallet.account.single === 'undefined' &&
                typeof wallet.account.shared === 'undefined'
            )
        ) {
            console.log()
            return { 
                validated: false, 
                message: 'not a som32-wallet file format ...' 
            }
        }
    }

    public addressValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
        if(!!!control) return null
    
        const address: string = control.value
    
        if(this.som32.currency == C.ACCOUNT_CURRENCY_EOS) {

            // TODO:
            
        } else if(this.som32.currency == C.ACCOUNT_CURRENCY_ETH) {
            if(!address || address.length < 40) return { minlength: true }
            if(address.search(/[\W_]+/g) >= 0) return { pattern: true }
            if(!EthUtil.isValidChecksumAddress(address)) return { invalidaddress: true }
        } else {
            if(!address || address.length < 32) return { minlength: true }
            if(address.search(/[\W_]+/g) >= 0) return { pattern: true }
            if(!this.isAddressValid(address)) return { invalidaddress: true }
        }
    
        return null
    }

    public createWallet(
        network : string,
        acctname: string,
        salt    : string,
    ) {
        this.som32.set({
            currency: C.ACCOUNT_CURRENCY_BTC,
            type    : accttype,
            payto   : (
                payment == C.PAYMENT_TYPE_SCRIPT ? 
                [C.ACCOUNT_PAYMENT_N2WPKH, C.ACCOUNT_PAYMENT_N2WSH] : 
                [C.ACCOUNT_PAYMENT_P2WPKH, C.ACCOUNT_PAYMENT_P2WSH]
            ),
        })

        let eth_privkey = this.som32.m(salt, "m/44'/60'/0'/0/0").privateKey
        let eth_pubKey = EthUtil.privateToPublic(eth_privkey)
        let eth_addr = EthUtil.publicToAddress(eth_pubKey).toString('hex')
        // let eth_address = '0x' + eth_addr
        let eth_address = EthUtil.toChecksumAddress(eth_addr)

        if(accttype == C.ACCOUNT_TYPE_SINGLE) {
            let addrsingle = (
                payment == C.PAYMENT_TYPE_SCRIPT ? 
                this.som32.n2wpkh(salt).address : 
                this.som32.p2wpkh(salt).address
            )
            this.som32.set({
                opened  : addrsingle,
                single  : [{
                    name    : acctname,
                    address : addrsingle,
                    pubkey  : this.som32.m(salt).publicKey.toString('hex'),
                    wif     : this.som32.m(salt).toWIF(),
                    multis  : [],
                    desc    : "sh(wpkh([cbe87c4c/44'/0'/0'/0/0'] " + this.som32.m(salt).publicKey.toString('hex') + "))",
                }],
                eth_single  : [{
                    name    : acctname,
                    address : eth_address,
                    pubkey  : eth_pubKey.toString('hex'),
                    wif     : eth_privkey.toString('hex'),
                    multis  : [],
                    desc    : "cbe87c4c/44'/60'/0'/0/0' " + eth_pubKey.toString('hex'),
                }],
            })

        } else {
            // set initial values to generate multisig address
            this.som32.set({
                shared  : [{
                    name    : acctname,
                    m       : m,
                    n       : n,
                    pubkeys : pubkeys,
                }]
            })
            
            let addrsingle = (
                payment == C.PAYMENT_TYPE_SCRIPT ? 
                this.som32.n2wpkh(salt).address : 
                this.som32.p2wpkh(salt).address
            )
            let addrshared = (
                payment == C.PAYMENT_TYPE_SCRIPT ? 
                this.som32.n2wsh().address : 
                this.som32.p2wsh().address
            )
            let sharedscript = (
                payment == C.PAYMENT_TYPE_SCRIPT ? {
                    pubkey: this.som32.n2wsh().output.toString('hex'),
                    redeem: this.som32.n2wsh().redeem.output.toString('hex'),
                    witess: this.som32.p2wsh().redeem.output.toString('hex'),
                } : {
                    pubkey: this.som32.p2wsh().output.toString('hex'),
                    redeem: '',
                    witess: this.som32.p2wsh().redeem.output.toString('hex'),
                }
            )

            // after initializing, generate multisig address and set wallet again 
            this.som32.set({
                opened  : addrshared,
                single  : [{
                    name    : acctname,
                    address : addrsingle,
                    pubkey  : this.som32.m(salt).publicKey.toString('hex'),
                    wif     : this.som32.m(salt).toWIF(),
                    multis  : [addrshared],
                    desc    : "sh(wpkh([cbe87c4c/44'/0'/0'/0/0'] " + this.som32.m(salt).publicKey.toString('hex') + "))",
                }],
                eth_single  : [{
                    name    : acctname,
                    address : eth_address,
                    pubkey  : eth_pubKey.toString('hex'),
                    wif     : eth_privkey.toString('hex'),
                    multis  : [],
                    desc    : "cbe87c4c/44'/60'/0'/0/0' " + eth_pubKey.toString('hex'),
                }],
                shared  : [{
                    name    : acctname,
                    address : addrshared,
                    m       : m,
                    n       : n,
                    pubkeys : pubkeys,
                    script  : sharedscript,
                    singles : singles, // [this.som32.n2wpkh(salt).address, ...]
                    desc    : "sh(wsh(multi(" + m + "," + (
                        pubkeys.map(
                            k => {

                                // TODO: validate address type, and enter right address type

                                if(k == this.som32.m(salt).publicKey.toString('hex')) {
                                    return "[241aafd7/44'/0'/0'/0/0'] " + this.som32.m(salt).publicKey.toString('hex')
                                } else {
                                    return "[f9842d14] " + k
                                }
                            }
                        ).toString()
                    ) + ")))"
                }]
            })
        }
    }

    public createPsbt(rawtx: ISOM32RawTxToSend, txhexs: { txid: string, hex: string }[]): string {

        let redeem      = this.som32.redeemscript
        let witness     = this.som32.witnessscript
        let sighash     = BitcoinLib.Transaction.SIGHASH_ALL
        let txs         = []
        let utxos       = []
        let outputs     = []
        let redeems     = []
        let witnesses   = []
        let sighashes   = []
        let additionals = []

        for(let input of rawtx.inputs) {
            utxos.push({ 
                id: input.txid, 
                vout: input.vout 
            })
            txs.push(txhexs.find(tx => tx.txid == input.txid).hex)
            redeems.push(redeem)
            witnesses.push(witness)
            sighashes.push({ id: input.txid, sighash: sighash, vout: input.vout })
        }
        for(let output of rawtx.outputs) {
            outputs.push({ 
                script: BitcoinLib.address.toOutputScript(output.address, this._network).toString('hex'), 
                tokens: output.value 
            })
            if(output.address == this.som32.address) {
                // type: 00 -  redeem script
                additionals.push({ type: '00', value: redeem, vout: output.n })
                // type: 01 - witness script 
                additionals.push({ type: '01', value: witness, vout: output.n })
            }
        }

        // TODO: for bitcoin network compatible, add user interactive function that converts hex string of 
        // the PSBT to base64 string, and export to a file or displays on the screen.
        // let psbt = Buffer.from(BIP174.createPsbt({ outputs: outputs, utxos: utxos }).psbt, 'hex').toString('base64')
        let psbt = BIP174.createPsbt({ outputs: outputs, utxos: utxos }).psbt

        return BIP174.updatePsbt({
            additional_attributes   : additionals,
            psbt                    : psbt,
            redeem_scripts          : redeems,
            sighashes               : sighashes,
            transactions            : txs,
            witness_scripts         : witnesses
        }).psbt
    }

    public updatePsbt(psbt: string): string {

        // TODO: validate this psbt's multisig address match with currently opened multisig address

        // to get and reset addtional information
        let tx          = BitcoinLib.Transaction.fromHex(BIP174.decodePsbt({ psbt: psbt }).unsigned_transaction)
        let scriptpub   = this.som32.scriptpbkey
        let redeem      = this.som32.redeemscript
        let witness     = this.som32.witnessscript
        let i           = 0
        let additionals = []

        for(let out of tx.outs) {
            if(out.script.toString('hex') == scriptpub) {
                // type: 00 -  redeem script
                additionals.push({ type: '00', value: redeem, vout: i })
                // type: 01 - witness script 
                additionals.push({ type: '01', value: witness, vout: i })
            }
            i++
        }

        return BIP174.updatePsbt({
            additional_attributes   : additionals,
            psbt                    : psbt
        }).psbt
    }

    public signPsbt(psbt: string): string {

        // TODO: validate this psbt's multisig address match with currently opened multisig address

        return BIP174.signPsbt({ 
            network     : (
                this._network === BitcoinLib.networks.bitcoin ? 
                C.NETWORK_MAINNET : 
                C.NETWORK_TESTNET
            ),
            psbt        : psbt,
            signing_keys: this.som32.wifs
        }).psbt
    }

    public finalizePsbt(psbt: string): string {

        // TODO: find and adopt correctly working finalizePsbt
        // return BIP174.finalizePsbt({ psbt: psbt }).psbt

        // TODO: validate psbt code

        let d = BIP174.decodePsbt({ psbt: psbt })
        let tx = BitcoinLib.Transaction.fromHex(d.unsigned_transaction)

        // TODO: check current balance is satisfied

        // get signatures
        let sighash: number = d.inputs[0].sighash_type
        let scriptpubkey    = Buffer.from(d.inputs[0].witness_utxo.script_pub, 'hex')
        let redeem          = !!d.inputs[0].redeem_script ? Buffer.from(d.inputs[0].redeem_script, 'hex') : null
        let witness         = Buffer.from(d.inputs[0].witness_script, 'hex')
        let sigpairs        = d.inputs.map(
            input => input.partial_sig.map(sig => { 
                return {  
                    network: this._network,
                    publicKey: Buffer.from(sig.public_key, 'hex'),
                    signature: Buffer.from(sig.signature, 'hex'),
                }
            }
        ))
        let inputs = tx.ins.map((input, i) => { 
            return { 
                txid: input.hash, 
                vout: input.index, 
                value: d.inputs[i].witness_utxo.tokens 
            }
        })
        let outputs = tx.outs.map(out => { 
            return { 
                address: BitcoinLib.address.fromOutputScript(out.script, this._network), 
                value: out.value 
            }
        })
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)
        let payto = <string>this.som32.payto

        for(let input of inputs) { txbuilder.addInput(input.txid, input.vout, null, scriptpubkey) }
        for(let output of outputs) { txbuilder.addOutput(output.address, output.value) }
        for(let i = 0; i < inputs.length; i++) { 
            for(let sigpair of sigpairs[i]) {
                // NOTE: no P2SH redeem script in p2wsh
                if(payto == C.ACCOUNT_PAYMENT_P2WSH) txbuilder.signHasSig(i, sigpair, null, null, inputs[i].value, witness)
                // build n2wsh payment type
                else txbuilder.signHasSig(i, sigpair, redeem, sighash, inputs[i].value, witness) 
            }
        }

        return txbuilder.build().toHex()
    }

    public convertPsbt(code: string) {
        console.log(`BIP174.decodePsbt({ psbt: psbt }): %s`, JSON.stringify(BIP174.decodePsbt({ psbt: code })))
    }

    public combinePsbt(psbts: string[]): string {

        // TODO: validate this psbt's multisig address match with currently opened multisig address

        return BIP174.combinePsbts({ psbts: psbts }).psbt
    }

    public decodePsbt(code: string): ISom32PsbtDecoded {

        let decoded = BIP174.decodePsbt({ psbt: code })
        let inputs = decoded.inputs.map(input => {
            if(!!input.partial_sig) {
                let ps = {}
                input.partial_sig.forEach(s => ps[s.public_key] = s.signature)
                return {
                    witness_utxo: {
                        amount: input.witness_utxo.tokens
                    },
                    partial_signatures: ps
                }
            } else {
                return {
                    witness_utxo: {
                        amount: input.witness_utxo.tokens
                    }
                }
            }
        })
        let tx = BitcoinLib.Transaction.fromHex(decoded.unsigned_transaction)
        let vout = tx.outs.map((o, i) => {
            return {
                value   : o.value,
                n       : i,
                scriptPubKey: {
                    addresses : [BitcoinLib.address.fromOutputScript(o.script, this._network)],
                },
            }
        })
        let insum = inputs.reduce((sum, inp) => sum + inp.witness_utxo.amount, 0)
        let outsum = vout.reduce((sum, out) => sum + out.value, 0)

        return {
            tx: {
                vout: vout,
            },
            inputs  : inputs,
            fee     : insum - outsum,
        }
    }

    public buildRawTx (
        txinfo      : ISOM32TxFormToSend, 
        unspents    : IBlockchainInfoUnspent[], 
        password?   : string
    ): ISOM32RawTxToSend {

        let txbuilder = new Txbuilder(
            this.som32.ecpair,
            this._network
        )

        // sorting for string
        // array.sort((a,b) => a.title.rendered.localeCompare(b.title.rendered))
        unspents = unspents.sort((a, b) => a.value - b.value)

        // let payto = this._addressValidator.identify(this.address)
        let payto = <string>this.som32.payto
        let inputs = []
        let outputs = []
        let dummybytes = 3000
        let targetSum = 0
        let totalfee = 0
        let rawtx: Buffer

        for(let i of [0,1]) {
            inputs = []
            outputs = []
            targetSum = 0
            totalfee = txinfo.fee * (i == 0 ? dummybytes : rawtx.byteLength)

            for (let unspent of unspents) {
                targetSum += unspent.value
                inputs.push({ txid: unspent.tx_hash_big_endian, vout: unspent.tx_output_n, value: unspent.value, n: 1 })

                if(targetSum >= txinfo.amount + totalfee) break
            }

            outputs.push({ type: 'payment', address: txinfo.to, value: txinfo.amount, n: 0 })
            if(targetSum > txinfo.amount + totalfee) {
                outputs.push({ type: 'change', address: this.som32.address, value: targetSum - (txinfo.amount + totalfee), n: 1 })
            }

            switch(payto) {
                case C.ACCOUNT_PAYMENT_P2PK: 
                    rawtx = txbuilder.p2pk(inputs, outputs)
                    break
                case C.ACCOUNT_PAYMENT_P2PKH: 
                    rawtx = txbuilder.p2pkh(inputs, outputs)
                    break
                case C.ACCOUNT_PAYMENT_P2SH: 
                    rawtx = txbuilder.p2sh(
                        inputs, 
                        outputs,
                        Buffer.from(this.som32.redeemscript, 'hex')
                    )
                    break
                case C.ACCOUNT_PAYMENT_P2WPKH: 
                    rawtx = txbuilder.p2wpkh(
                        inputs, 
                        outputs, 
                        this.som32.p2wpkh(password).output
                    )
                    break
                case C.ACCOUNT_PAYMENT_P2WSH: 
                    rawtx = txbuilder.p2wsh(
                        inputs, 
                        outputs,
                        Buffer.from(this.som32.scriptpbkey, 'hex'),
                        Buffer.from(this.som32.witnessscript, 'hex')
                    )
                    break
                case C.ACCOUNT_PAYMENT_N2WPKH: 
                    rawtx = txbuilder.n2wpkh(
                        inputs, 
                        outputs, 
                        this.som32.n2wpkh(password).redeem.output
                    )
                    break
                case C.ACCOUNT_PAYMENT_N2WSH: 
                    rawtx = txbuilder.n2wsh(
                        inputs, 
                        outputs,
                        Buffer.from(this.som32.scriptpbkey, 'hex'), 
                        {
                            redeem  : Buffer.from(this.som32.redeemscript, 'hex'),
                            witness : Buffer.from(this.som32.witnessscript, 'hex'),
                        }
                    )
                    break
                default:
            }
        }

        return {
            inputs  : inputs,
            outputs : outputs,
            bytes   : rawtx.byteLength,
            totalfee: totalfee,
            hex     : rawtx.toString('hex')
        }
    }

    public buildRawTxEth (
        txinfo      : ISOM32TxFormToSend, 
        data        : any, 
        password?   : string
    ): ISOM32RawTxToSend {

        let value = Number(txinfo.amount).toString(16)
        value = '0x' + (value.length % 2 != 0 ? '0' + value : value)

        let param = {
            nonce   : data.n,
            gasPrice: data.g, 
            gasLimit: C.APP_GASLIMIT_TX_HEX,
            to      : txinfo.to, 
            value   : value, 
            data    : '',
            // EIP 155 chainId - mainnet: 1, ropsten: 3
            chainId : this.network.name == C.NETWORK_MAINNET ? 1 : 3
        }

        let tx = new EthTx(param)
        tx.sign(Buffer.from(this.som32.wif, 'hex'))

        return {
            inputs  : null,
            outputs : null,
            bytes   : null,
            totalfee: data.f,
            hex     : tx.serialize().toString('hex')
        }
    }

    public getMainSharedKeypair(salt: string, type: 'script' | 'sigwit'): {
        address : string
        pubkey  : string
    } {
        return {
            address : type == C.PAYMENT_TYPE_SCRIPT ? this.som32.n2wpkh(salt).address : this.som32.p2wpkh(salt).address,
            pubkey  : this.som32.m(salt).publicKey.toString('hex'),
        }
    }
}

class Som32 {

    private _bip32: Bip32
    private _bip39: Bip39
    private _account: Account
    private _eth: Ethereum
    private _eos: Eos

    constructor(
        private _network: BitcoinLib.Network
    ) {
        this._bip32 = new Bip32(this._network)
        this._bip39 = new Bip39()
        this._eth = new Ethereum(this._network)
        this._eos = new Eos(this._network)
        this._account = new Account()
    }

    public get name(): string {
        return this._account.type == C.ACCOUNT_TYPE_SINGLE ?
        this._account.single.find(s => s.address == this._account.opened).name :
        this._account.shared.find(s => s.address == this._account.opened).name
    }

    public get currency(): 'btc' | 'eth' | 'eos' {
        return this._account.currency
    }

    public get address(): string {
        return this._account.opened
    }

    public get addressr(): string {
        let address = []

        this._account.type == C.ACCOUNT_TYPE_SINGLE ?
        this._account.single.find(s => s.address == this._account.opened).multis.forEach(a => {
            let target = this._account.shared.find(s => s.address == a)
            if(!!target) address.push(target.address)
        }) :
        this._account.shared.find(s => s.address == this._account.opened).singles.forEach(a => {
            let target = this._account.single.find(s => s.address == a)
            if(!!target) address.push(target.address)
        }) 

        return address.length > 0 ? address[0] : ''
    }

    public get type(): string {
        return this._account.type
    }

    public get wif(): string {
        if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
            return this._eos.single[0].wif
        } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            return this._eth.single[0].wif
        } else {
            return this._account.single[0].wif
        }
    }

    public get wifs(): string[] {
        // get current shared(multi-sig) account
        let shared = this._account.shared.find(s => s.address == this._account.opened)
        // get the address(es) of single account current multisig account have, participants.
        return shared.singles.map(address => {
            // if the related single account with current multisig account are found, 
            // get its wif.
            return this._account.single.find(s => s.address == address).wif
        })
    }

    public get publickey(): string {
        if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {

        } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            if(this._account.type == C.ACCOUNT_TYPE_SINGLE) {
                return this._eth.single.find(s => s.address == this._account.opened).pubkey
            } else {
                return this._eth.shared.find(s => s.address == this._account.opened).singles.map(
                    address => this._eth.single.find(s => s.address == address).pubkey
                )[0]
            }
        } else {
            if(this._account.type == C.ACCOUNT_TYPE_SINGLE) {
                return this._account.single.find(s => s.address == this._account.opened).pubkey
            } else {
                return this._account.shared.find(s => s.address == this._account.opened).singles.map(
                    address => this._account.single.find(s => s.address == address).pubkey
                )[0]
            }
        }
    }

    public get ecpair(): BitcoinLib.ECPair | BitcoinLib.ECPair[] {
        if(this._account.type == C.ACCOUNT_TYPE_SINGLE) {
            return BitcoinLib.ECPair.fromWIF(<string>this.wif, this._network)
        } else {
            return this.wifs.map(w => BitcoinLib.ECPair.fromWIF(w, this._network))
        }
    }

    public get scriptpbkey(): string {
        return this._account.shared.find(s => s.address == this._account.opened).script.pubkey
    }

    public get redeemscript(): string {
        return this._account.shared.find(s => s.address == this._account.opened).script.redeem
    }

    public get witnessscript(): string {
        return this._account.shared.find(s => s.address == this._account.opened).script.witess
    }

    public get payto(): 'p2pk' | 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'n2wpkh' | 'n2wsh' {
        return (
            this._account.type == C.ACCOUNT_TYPE_SINGLE ?
            this._account.payto[0] : 
            this._account.payto[1]
        )
    }

    public get isshared(): boolean {
        return this._account.type == C.ACCOUNT_TYPE_SINGLE ? false : true
    }

    public mnemonic(salt: string): string {
        return this._bip39.words
    }

    public seed(salt: string): string {
        return this._bip39.getSeed(salt).toString('hex')
    }

    public primitivekey(salt: string): IBitcoinjsBIP32 {
        return this._bip32.getPrimitive(this._bip39.getSeed(salt))
    }

    public getname(address: string): string {
        let single: Single
        let shared: Shared

        if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
            single = !!this._eos.single ? this._eos.single.find(s => s.address == address) : null
            shared = !!this._eos.shared ? this._eos.shared.find(s => s.address == address) : null
        } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            single = !!this._eth.single ? this._eth.single.find(s => s.address == address) : null
            shared = !!this._eth.shared ? this._eth.shared.find(s => s.address == address) : null
        } else {
            single = !!this._account.single ? this._account.single.find(s => s.address == address) : null
            shared = !!this._account.shared ? this._account.shared.find(s => s.address == address) : null
        }

        if(!!single) return single.name
        else if(!!shared) return shared.name
        else return ''
    }

    public getshared(): ISom32AccountShared[] {
        if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
            return !!this._eos.shared ? this._eos.shared : []
        } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            return !!this._eth.shared ? this._eth.shared : []
        } else {
            return !!this._account.shared ? this._account.shared : []
        }
    }

    public getsingle(): ISom32AccountSingle[] {
        if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
            return !!this._eos.single ? this._eos.single : []
        } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            return !!this._eth.single ? this._eth.single : []
        } else {
            return !!this._account.single ? this._account.single : []
        }
    }

    public m(salt: string, path?: string): IBitcoinjsBIP32 {
        return this._bip32.m(this._bip39.getSeed(salt), path)
    }

    public M(salt: string, path?: string): IBitcoinjsBIP32 {
        return this._bip32.M(this._bip39.getSeed(salt), path)
    }

    public p2pk(salt: string): IBitcoinjsP2PK {
        return BitcoinLib.payments.p2pk({
            pubkey          : this.m(salt).publicKey,
            network         : this._network 
        })
    }

    public p2pkh(salt: string): IBitcoinjsP2PKH {
        return BitcoinLib.payments.p2pkh({
            pubkey          : this.m(salt).publicKey,
            network         : this._network 
        })
    }

    public p2ms(): IBitcoinjsP2MS {
        let shared: Shared
        
        if(this._account.type == C.ACCOUNT_TYPE_SINGLE) {
        } else {
            if(!!this._account.opened) {
                shared = this._account.shared.find(s => s.address == this._account.opened)
            } else {
                // to create wallet when address is not yet generated
                shared = this._account.shared[0]
            }
        }

        // TODO: throw exception
        if(!shared) {
            console.log(`[ERROR] p2ms() IBitcoinjsP2MS: not found shared account`)
            return null
        }

        return BitcoinLib.payments.p2ms({
            m       : shared.m, 
            n       : shared.n, 
            pubkeys : shared.pubkeys.map(k => Buffer.from(k, 'hex')),
            network : this._network 
        })
    }

    public p2sh(): IBitcoinjsP2SH {
        return <IBitcoinjsP2SH>BitcoinLib.payments.p2sh({
            redeem  : this.p2ms(),
            network : this._network 
        })
    }

    public p2wpkh(salt: string): IBitcoinjsP2PKH {
        return BitcoinLib.payments.p2wpkh({
            pubkey          : this.m(salt).publicKey,
            network         : this._network 
        })
    }

    public p2wsh(): IBitcoinjsP2SH {
        return <IBitcoinjsP2SH>BitcoinLib.payments.p2wsh({
            redeem  : this.p2ms(),
            network : this._network 
        })
    }

    public n2wpkh(salt: string): IBitcoinjsP2SH {
        return <IBitcoinjsP2SH>BitcoinLib.payments.p2sh({
            redeem  : this.p2wpkh(salt),
            network : this._network 
        })
    }

    public n2wsh(): IBitcoinjsP2SH {
        return <IBitcoinjsP2SH>BitcoinLib.payments.p2sh({
            redeem  : this.p2wsh(),
            network : this._network 
        })
    }

    public set(account: any, salt?: string, entropy?: number) {
        if(!!account.currency) this._account.currency = account.currency
        if(!!account.opened) this._account.opened = account.opened
        if(!!account.type) this._account.type = account.type
        if(!!account.payto) this._account.payto = account.payto
        if(!!account.single) {
            this._account.single = account.single.map(a => {
                return {
                    name    : !!a.name ? a.name : '',
                    address : !!a.address ? a.address : '',
                    pubkey  : !!a.pubkey ? a.pubkey : '',
                    wif     : !!a.wif ? a.wif : '',
                    multis  : !!a.multis ? a.multis : [],
                    desc    : !!a.desc ? a.desc : '',
                }
            })
        }
        if(!!account.eth_single) {
            this._eth.single = account.eth_single.map(a => {
                return {
                    name    : !!a.name ? a.name : '',
                    address : !!a.address ? a.address : '',
                    pubkey  : !!a.pubkey ? a.pubkey : '',
                    wif     : !!a.wif ? a.wif : '',
                    multis  : !!a.multis ? a.multis : [],
                    desc    : !!a.desc ? a.desc : '',
                }
            })
        }
        if(!!account.shared) {
            this._account.shared = account.shared.map(a => {
                return {
                    name    : !!a.name ? a.name : '',
                    address : !!a.address ? a.address : '',
                    m       : !!a.m ? a.m : 0,
                    n       : !!a.n ? a.n : 0,
                    pubkeys : !!a.pubkeys ? a.pubkeys : [],
                    script  : !!a.script ? a.script : {
                        pubkey: '',
                        redeem: '',
                        witess: '',
                    },
                    singles : !!a.singles ? a.singles : [],
                    desc    : !!a.desc ? a.desc : '',
                }
            })
        }
    }

    public add(wallet: any): ISom32Extenal {

        // TODO: validate wallet's version, network and ect necessaries ... 

        if(!!wallet.account.single) {

            // Not tested and debugged yet, just coded ---
            
            let addedsingles: string[] = []

            if(!!this._account.single) {
                wallet.account.single.forEach(s => {
                    this._account.single.push(s)
                    addedsingles.push(s.address)
                })
            } else {
                this._account.single = wallet.account.single
                this._account.single.forEach(s => addedsingles.push(s.address))
            }

            if(!!this._account.shared) {
                this._account.shared.forEach(s => {
                    s.singles.concat(addedsingles)
                })
            }
        }
        if(!!wallet.account.shared) {
            let addedmultis: string[] = []

            if(!!this._account.shared) {

                // Not tested and debugged yet, just coded ---

                wallet.account.shared.forEach(s => {
                    this._account.shared.push(s)
                    addedmultis.push(s.address)
                })

                // -------------------------------------------

            } else {
                this._account.shared = wallet.account.shared
                this._account.shared.forEach(s => addedmultis.push(s.address))
            }
            if(!!this._account.single) {
                // make relation using addred multisig account into the single account multisiges
                this._account.single.forEach(s => {
                    s.multis.length > 0 ? s.multis.concat(addedmultis) : s.multis = addedmultis
                })
                // make relation using single account's address into the shared account's singles
                addedmultis.forEach(a => {
                    let shared = this._account.shared.find(s => s.address == a)
                    shared.singles.length > 0 ?
                    shared.singles.concat(this._account.single.map(s => s.address)) :
                    shared.singles = this._account.single.map(s => s.address)
               })
            }
        }

        this._account.opened = wallet.account.opened
        this._account.type = wallet.account.type

        return this.export('all')
    }


    public changeCurrency(symbol: 'btc' | 'eth' | 'eos') {
        let _account_ = (
            symbol == C.ACCOUNT_CURRENCY_BTC ?
            this._account : (
                symbol == C.ACCOUNT_CURRENCY_ETH ?
                this._eth :
                this._eos
            )
        )

        this._account.currency = symbol
        if(!!_account_.shared) {
            this._account.opened = _account_.shared[0].address
            this._account.type = C.ACCOUNT_TYPE_SHARED
        } else {
            this._account.opened = _account_.single[0].address
            this._account.type = C.ACCOUNT_TYPE_SINGLE
        }
    }

    public export(type: 'pubkey' | 'single' | 'shared' | 'all', address?: string): ISom32Extenal {

        let som32: any
        let _address_ = address || this._account.opened

        if(type == 'pubkey') {
            let cursingle = this._account.single.find(s => s.address == _address_)
            som32 = {
                version : C.APP_VERTION,
                network : this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET,
                account : {
                    payto   : this._account.payto,
                    single  : [{
                            name     : cursingle.name,
                            address  : cursingle.address,
                            pubkey   : cursingle.pubkey,
                            desc     : cursingle.desc,
                    }],
                },
                bip32   : {
                    levels  : 'BIP44',
                    path    : "m/44'/0'/0'/0/0",
                },
            }
        } else if(type == C.ACCOUNT_TYPE_SINGLE) {
            let cursingle = this._account.single.find(s => s.address == _address_)
            som32 = {
                version : C.APP_VERTION,
                network : this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET,
                account : {
                    opened  : cursingle.address,
                    type    : C.ACCOUNT_TYPE_SINGLE,
                    payto   : this._account.payto,
                    single  : {
                        name     : cursingle.name,
                        address  : cursingle.address,
                        pubkey   : cursingle.pubkey,
                        wif      : cursingle.wif,
                        multis   : [],
                        desc     : cursingle.desc,
                    }
                },
                bip32   : {
                    levels  : 'BIP44',
                    path    : "m/44'/0'/0'/0/0",
                },
                bip39   : this._bip39,
            }
        } else if(type == C.ACCOUNT_TYPE_SHARED) {
            let curshared = this._account.shared.find(s => s.address == _address_)
            som32 = {
                version : C.APP_VERTION,
                network : this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET,
                account : {
                    opened  : curshared.address,
                    type    : C.ACCOUNT_TYPE_SHARED,
                    payto   : this._account.payto,
                    shared  : [{
                        name    : curshared.name,
                        address : curshared.address,
                        m       : curshared.m,
                        n       : curshared.n,
                        pubkeys : curshared.pubkeys,
                        script  : curshared.script,
                        singles : [],
                        desc    : curshared.desc,
                    }]
                },
            }
        } else { // for the type 'all'
            som32 = {
                version     : C.APP_VERTION,
                network     : this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET,
                account     : this._account,
                eth         : {
                    single: this._eth.single,
                    shared: this._eth.shared,
                },
                eos         : {
                    single: this._eos.single,
                    shared: this._eos.shared,
                },
                bip32   : {
                    levels  : 'BIP44',
                    path    : "m/44'/0'/0'/0/0",
                    eth_path: "m/44'/60'/0'/0/0",
                    eos_path: "m/44'/61'/0'/0/0",
                },
                bip39   : this._bip39,
            }
        }

        return som32
    }

    public import(wallet: any) {

        // NOTE: network was already set when the wallet service is on

        this._bip39.mnemonic = {
            entropy : wallet.bip39._entropy,
            code    : wallet.bip39._code
        }
        this._eth.single = wallet.eth.single
        this._eth.shared = wallet.eth.shared
        this._eos.single = wallet.eos.single
        this._eos.single = wallet.eos.single

        this.set(wallet.account)
    }

    public getaccount() {
        return (
            this._account.type == C.ACCOUNT_TYPE_SINGLE ?
            this._account.single.find(s => s.address == this.address) :
            this._account.shared.find(s => s.address == this.address)
        )
    }

    public getaccountall(): { opened: string, type: string, name: string }[] {
        let accounts = []

        if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
            if(!!this._eth.shared) {
                this._eth.shared.forEach(s => accounts.push({
                    opened: s.address,
                    type: C.ACCOUNT_TYPE_SHARED,
                    name: s.name,
                }))
            }
            if(!!this._eth.single) {
                this._eth.single.forEach(s => accounts.push({
                    opened: s.address,
                    type: C.ACCOUNT_TYPE_SINGLE,
                    name: s.name,
                }))
            }
        } else {
            if(!!this._account.shared) {
                this._account.shared.forEach(s => accounts.push({
                    opened: s.address,
                    type: C.ACCOUNT_TYPE_SHARED,
                    name: s.name,
                }))
            }
            if(!!this._account.single) {
                this._account.single.forEach(s => accounts.push({
                    opened: s.address,
                    type: C.ACCOUNT_TYPE_SINGLE,
                    name: s.name,
                }))
            }
        }

        return accounts
    }

    public forQR(type: 'wallet' | 'single' | 'shared' | 'pubkey', address?: string): string {
        let network = this._network === BitcoinLib.networks.bitcoin ? C.NETWORK_MAINNET : C.NETWORK_TESTNET
        let som32 = {}

        switch(type) {
            case 'wallet':
                let singles = []
                let shareds = []

                let bip39: any = JSON.parse(JSON.stringify(this._bip39))
                this._account.single.forEach(s => singles.push([s.name, s.pubkey]))
                if(!!this._account.shared) this._account.shared.forEach(s => shareds.push([s.name, s.m, s.n, s.pubkeys]))
                som32 = [
                    C.APP_VERTION,
                    network,
                    [this._account.opened, this._account.type, this._account.payto, singles, shareds],
                    ['BIP44', "m/44'/0'/0'/0/0"],
                    [bip39._entropy, bip39._code],
                ]
                break

            case C.ACCOUNT_TYPE_SINGLE:
                let single: Single
                if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
                    single = this._eos.single.find(s => s.address == address)
                } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
                    single = this._eth.single.find(s => s.address == address)
                } else {
                    single = this._account.single.find(s => s.address == address)
                }
                som32 = {
                    version : C.APP_VERTION,
                    network : network,
                    account : {
                        opened  : this._account.opened,
                        type    : this._account.type,
                        payto   : this._account.payto,
                        single  : [{
                            name    : single.name,
                            pubkey  : single.pubkey,
                        }],
                    },
                    bip32   : {
                        levels  : 'BIP44',
                        path    : "m/44'/0'/0'/0/0",
                    },
                    bip39   : this._bip39,
                }
                break

            case C.ACCOUNT_TYPE_SHARED:
                let shared: Shared
                if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
                    shared = this._eos.shared.find(s => s.address == address)
                } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
                    shared = this._eth.shared.find(s => s.address == address)
                } else {
                    shared = this._account.shared.find(s => s.address == address)
                }
                som32 = {
                    version : C.APP_VERTION,
                    network : network,
                    account : {
                        opened  : this._account.opened,
                        type    : this._account.type,
                        payto   : this._account.payto,
                        shared  : [{
                            name    : shared.name,
                            m       : shared.m,
                            n       : shared.n,
                            pubkeys : shared.pubkeys,
                        }],
                    },
                }
                break

            case 'pubkey':
                if(this._account.currency == C.ACCOUNT_CURRENCY_EOS) {
                    single = this._eos.single.find(s => s.address == address)
                } else if(this._account.currency == C.ACCOUNT_CURRENCY_ETH) {
                    single = this._eth.single.find(s => s.address == address)
                } else {
                    single = this._account.single.find(s => s.address == address)
                }
                som32 = {
                    version : C.APP_VERTION,
                    network : network,
                    account : {
                        opened  : this._account.opened,
                        type    : this._account.type,
                        payto   : this._account.payto,
                        single  : [{
                            name    : single.name,
                            pubkey  : single.pubkey,
                        }],
                    },
                }
                break
        }
        return JSON.stringify(som32)
    }

    public fromQR(som32: ISom32Extenal, salt: string, type: 'wallet' | 'single' | 'shared' | 'pubkey', address?: string): ISom32Extenal {

        let network = som32.network == C.NETWORK_MAINNET ? BitcoinLib.networks.bitcoin : BitcoinLib.networks.testnet
        let singles = som32.account.single.map(s => {
            let seed = BIP39.mnemonicToSeed(som32.bip39._code, salt)
            let primitive = BIP32.fromSeed(seed, network)
            let m = primitive.derivePath(som32.bip32.path)
            let p2wpkh = BitcoinLib.payments.p2wpkh({ pubkey: m.publicKey, network : network })
            let n2wpkh = BitcoinLib.payments.p2sh({ redeem: p2wpkh, network : network })
            let address = som32.account.payto[0] == C.ACCOUNT_PAYMENT_N2WPKH ? n2wpkh.address : p2wpkh.address
            return {
                name    : s.name,
                address : address,
                pubkey  : m.publicKey.toString('hex'),
                wif     : m.toWIF(),
                multis  : [],
                desc    : "sh(wpkh([cbe87c4c/44'/0'/0'/0/0'] " + m.publicKey.toString('hex') + "))",
            }
        })
        let singleAddresses = singles.map(s => s.address)
        let shareds = som32.account.shared.map(s => {
            let p2ms = BitcoinLib.payments.p2ms({
                m       : s.m, 
                n       : s.n, 
                pubkeys : s.pubkeys.map(k => Buffer.from(k, 'hex')),
                network : network
            })
            let p2wsh = BitcoinLib.payments.p2wsh({ redeem: p2ms, network: network })
            let n2wsh = BitcoinLib.payments.p2sh({ redeem: p2wsh, network: network })
            let address = som32.account.payto[1] == C.ACCOUNT_PAYMENT_N2WSH ? n2wsh.address : p2wsh.address
            return {
                name    : s.name,
                address : address,
                m       : s.m,
                n       : s.n,
                pubkeys : s.pubkeys,
                script  : (
                    som32.account.payto[1] == C.ACCOUNT_PAYMENT_N2WSH ? {
                        pubkey: n2wsh.output.toString('hex'),
                        redeem: n2wsh.redeem.output.toString('hex'),
                        witess: p2wsh.redeem.output.toString('hex'),
                    } : {
                        pubkey: p2wsh.output.toString('hex'),
                        redeem: '',
                        witess: p2wsh.redeem.output.toString('hex'),
                    }
                ),
                singles : singleAddresses,
                desc    : "sh(wsh(multi(" + s.m + "," + (
                    s.pubkeys.map(
                        k => {
                            if(k == singles[0].pubkey.toString('hex')) {
                                return "[241aafd7/44'/0'/0'/0/0'] " + singles[0].pubkey.toString('hex')
                            } else {
                                return "[f9842d14] " + k
                            }
                        }
                    ).toString()
                ) + ")))"
            }
        })
        let sharedAddresses = shareds.map(s => s.address)
        singles.forEach(s => s.multis = sharedAddresses)

        som32.account.single = singles
        som32.account.shared = shareds

        return som32
    }
}

class Bip32 {

    constructor(
        private _network: BitcoinLib.Network
    ) {}

    public getPrimitive(seed: Buffer): IBitcoinjsBIP32 {
        return BIP32.fromSeed(seed, this._network)
    }

    public m(seed: Buffer, path?: string): IBitcoinjsBIP32 {

         // TODO: check m's deriving path is right

        // for the payment address
        return this.getPrimitive(seed).derivePath(path || "m/44'/0'/0'/0/0")
        // for the change address
        // return this.getPrimitive(seed).derivePath("m/44'/0'/1'/0/0")
    }

    public M(seed: Buffer, path?: string): IBitcoinjsBIP32 {

        // TODO: check M's deriving path is right

        // for the payment address
        return this.getPrimitive(seed).derivePath(path || "m/44'/0'/0'/0/0").neutered()
        // for the change address
        // return this.getPrimitive(seed).derivePath("M/44'/0'/1'/0/0/0")
    }
}


const MNEMONIC_DEFAULT_ENTROPY = 128

class Bip39 {

    private _entropy: number
    private _code   : string
    
    constructor() {}

    public get words() {
        return this._code
    }

    public set mnemonic(mnemonic: {
        entropy : number,
        code?   : string
    }) {
        this._entropy = mnemonic.entropy
        this._code = mnemonic.code || BIP39.generateMnemonic(mnemonic.entropy)
    }

    /**
     * If the mnemonic-code not yet exists, it will be automatically generated 
     * with the entropy, default 128.
     * 
     * @param salt passphrase
     * @param entropy default 128
     */
    public getSeed(salt: string, entropy?: number): Buffer {
        if(!this._code) this.mnemonic = { entropy: entropy || MNEMONIC_DEFAULT_ENTROPY }
        return BIP39.mnemonicToSeed(this._code, salt)
    }
}

class Account {
    public currency    : ISom32Account["currency"]
    public opened       : string // address
    public type         : ISom32Account["type"]
    public payto        : ISom32Account["payto"]
    public single       : Single[]
    public shared       : Shared[]
}
class Single {
    public name     : string
    public address  : string
    public pubkey   : string
    public wif      : string
    public multis   : string[]
    public desc     : string
}
class Shared {
    public name     : string
    public address  : string
    public m        : number
    public n        : number
    public pubkeys  : string[]
    public script   : {
        pubkey: string
        redeem: string
        witess: string
    }
    public singles : string[]
    public desc     : string
}

class Ethereum {

    constructor(
        private _network: BitcoinLib.Network
    ) {
    }
    
    public single: Single[]
    public shared: Shared[]
}

class Eos {
    constructor(
        private _network: BitcoinLib.Network
    ) {
    }
    
    public single: Single[]
    public shared: Shared[]
}