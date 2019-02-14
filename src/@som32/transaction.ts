import * as BitcoinLib from 'bitcoinjs-lib';

export class Txbuilder {

    constructor(
        private _ecpair: BitcoinLib.ECPair | BitcoinLib.ECPair[],
        private _network: BitcoinLib.Network
    ) { }

    public unsignedtx(inputs: Array<any>, outputs: Array<any>): Buffer {

        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        // TODO: 

        return txbuilder.build().toBuffer()
    }

    public p2pk(inputs: Array<any>, outputs: Array<any>): Buffer {

        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        // TODO: 

        return txbuilder.build().toBuffer()
    }

    public p2pkh(inputs: Array<any>, outputs: Array<any>): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        // 1) add inputs as many as the amount matched
        for(let input of inputs) {
            txbuilder.addInput(input.txid, input.vout)
        }
        // 2) add ouput(s) for the actual "spend" and "change"
        for(let output of outputs) {
            txbuilder.addOutput(output.address, output.value)
        }
        // 3) after all input(s) and output(s) are added, sign inputs with the respective private key for
        for (let i = 0; i < inputs.length; i++) {
            txbuilder.sign(i, <BitcoinLib.ECPair>this._ecpair)
        }
        // 4) build the transaction 
        return txbuilder.build().toBuffer()
    }

    /**
     * p2sh
     * 
     * @param { Array<any> } inputs unspent list to spend
     * @param { Array<any> } outputs recipient(s) and change
     * @param { BitcoinLib.payments.Redeem.output } redeem locking script for ouput(s) <p2sh redeem script>
     */
    public p2sh(inputs: Array<any>, outputs: Array<any>, redeem: Buffer): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        for(let input of inputs) { txbuilder.addInput(input.txid, input.vout) }
        for(let output of outputs) { txbuilder.addOutput(output.address, output.value) }
        for(let i = 0; i < inputs.length; i++) {
            for(let ecpair of <BitcoinLib.ECPair[]>this._ecpair) {
                txbuilder.sign(i, ecpair, redeem)
            }
        }

        return txbuilder.build().toBuffer()
    }

    public p2wpk(inputs: Array<any>, outputs: Array<any>): Buffer {

        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        // TODO: 

        return txbuilder.build().toBuffer()
    }

    /**
     * p2wpkh - To spend the Segregated Witness output, the transaction has no signature on that input.
     * 
     * @param { Array<any> } inputs unspent list to spend
     * @param { Array<any> } outputs recipient(s) and change
     * @param { BitcoinLib.payments.p2wpkh.output } scriptpubkey locking script for ouput(s)
     */
    public p2wpkh(inputs: Array<any>, outputs: Array<any>, scriptpubkey: Buffer): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        for(let input of inputs) {
            // NOTE: provide the prevOutScript!
            txbuilder.addInput(input.txid, input.vout, null, scriptpubkey) 
        }
        for(let output of outputs) {
            txbuilder.addOutput(output.address, output.value)
        }
        for (let i = 0; i < inputs.length; i++) {
            // NOTE: no redeem script
            txbuilder.sign(i, <BitcoinLib.ECPair>this._ecpair, null, null, inputs[i].value) 
        }

        return txbuilder.build().toBuffer()
    }

    /**
     * p2wsh
     * 
     * @param { Array<any> } inputs unspent list to spend
     * @param { Array<any> } outputs recipient(s) and change
     * @param { BitcoinLib.payments.p2wsh.output } scriptpubkey  locking script for ouput(s)
     * @param { BitcoinLib.payments.Redeem.output } witness unlocking script for input(s) <p2wsh segregated witness script>
     */
    public p2wsh(inputs: Array<any>, outputs: Array<any>, scriptpubkey: Buffer, witness: Buffer): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        for(let input of inputs) {
            // NOTE: provide the prevOutScript!
            txbuilder.addInput(input.txid, input.vout, null, scriptpubkey) 
        }
        for(let output of outputs) {
            txbuilder.addOutput(output.address, output.value)
        }
        for (let i = 0; i < inputs.length; i++) {
            // NOTE: no P2SH redeem script
            for(let ecpair of <BitcoinLib.ECPair[]>this._ecpair) {
                txbuilder.sign(i, ecpair, null, null, inputs[i].value, witness) 
            }
        }

        return txbuilder.build().toBuffer()
    }

    /**
     * n2wpkh
     * 
     * @param { Array<any> } inputs unspent list to spend
     * @param { Array<any> } outputs recipient(s) and change
     * @param { BitcoinLib.payments.Redeem.output } redeem unlocking script for input(s) <p2sh redeem script p2wpkh 'witness' is included>
     */
    public n2wpkh(inputs: Array<any>, outputs: Array<any>, redeem: Buffer): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        for(let input of inputs) { txbuilder.addInput(input.txid, input.vout) }
        for(let output of outputs) { txbuilder.addOutput(output.address, output.value) }
        for (let i = 0; i < inputs.length; i++) {
            txbuilder.sign(i, <BitcoinLib.ECPair>this._ecpair, redeem, null, inputs[i].value)
        }
        
        return txbuilder.build().toBuffer()
    }

    /**
     * n2wsh
     * 
     * @param { Array<any> } inputs unspent list to spend
     * @param { Array<any> } outputs recipient(s) and change
     * @param { BitcoinLib.payments.p2sh.output } scriptpubkey n2wsh().output, locking script for ouput(s)
     * @param { BitcoinLib.payments.Redeem.output } redeem unlocking script for input(s)
     * {
     *      redeem  : n2wsh().redeem.output, <p2sh redeem script p2wsh 'witness' is included>,
     *      witness : p2wsh().redeem.output, <p2wsh segregated witness script>
     * }
     */
    public n2wsh(inputs: Array<any>, outputs: Array<any>, scriptpubkey: Buffer, redeem: { redeem: Buffer, witness: Buffer }): Buffer {
        let txbuilder = new BitcoinLib.TransactionBuilder(this._network)

        for(let input of inputs) { txbuilder.addInput(input.txid, input.vout, null, scriptpubkey) }
        for(let output of outputs) { txbuilder.addOutput(output.address, output.value) }
        for(let i = 0; i < inputs.length; i++) { 
            for(let ecpair of <BitcoinLib.ECPair[]>this._ecpair) {
                txbuilder.sign(i, ecpair, redeem.redeem, null, inputs[i].value, redeem.witness) 
            }
        }

        return txbuilder.build().toBuffer()
    }
}