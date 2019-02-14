import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ISom32Extenal } from '@som32/interfaces'
import { C, ErrorMessagePassword } from '@som32/globals'

import * as BitcoinLib from 'bitcoinjs-lib'
import BIP32 from 'bip32'
import BIP39 from 'bip39'


@Component({
    selector     : 'dialog-passphrase',
    templateUrl  : './dialog.passphrase.component.html',
    styleUrls    : ['./dialog.passphrase.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DialogPassphraseComponent implements OnInit {

    private _wallet: ISom32Extenal
    private _passphraseValidator: ValidatorFn
    private _verified: boolean

    public formPassphrase: FormGroup
    public raiseErrorMsg: { [key: string]: string }
    public title: string
    public message: string

    /**
     * Constructor
     *
     * @param { FormBuilder } _formBuilder
     * @param { MatDialogRef<DialogPassphraseComponent> } _matDialogRef
     * @param _data
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: { title: string, msg: string, wallet: ISom32Extenal },
        private _matDialogRef: MatDialogRef<DialogPassphraseComponent>,
        private _formBuilder: FormBuilder,
    ) {
        this._wallet = this._data.wallet
        this._passphraseValidator = (control: AbstractControl): ValidationErrors | null => {
            this._verified = false

            if (!!!control || !!!control.parent || !!!control.parent.get('password')) return null
            if (!!!this._wallet || !!!this._wallet.bip32 || !!!this._wallet.bip39) return { invalidwallet: true }
            if (!!!this._wallet.bip32.path) return { nohdpath: true }
            if (!!!this._wallet.bip39._code) return { nomnemonic: true }
        
            const password = String(control.parent.get('password').value)
            
            if(!password || password.length < 1) return null
            if(this._publickey !== this._getPublicKey(password)) return { invalidpassword: true }

            this._verified = true
            
            return null
        }
        this.formPassphrase = this._formBuilder.group({
            formfieldresolver   : [''],
            password            : ['', [Validators.required, this._passphraseValidator]],
            // password            : ['', [Validators.required, Validators.minLength(8), PassphraseValidator]],
            keeppassword        : [false]
        })

        this.title = this._data.title
        this.message = this._data.msg
        this.raiseErrorMsg = ErrorMessagePassword
    }

    ngOnInit(): void {
    }
    
    private get _network(): BitcoinLib.Network {
        return (
            this._wallet.network == C.NETWORK_MAINNET ? 
            BitcoinLib.networks.bitcoin : 
            BitcoinLib.networks.bitcoin
        )
    }

    private get _publickey(): string {
        // if(this._wallet.account.type == C.ACCOUNT_TYPE_SINGLE) {
        //     return this._wallet.account.single.find(s => s.address == this._wallet.account.opened).pubkey
        // } else {
        //     return this._wallet.account.shared.find(s => s.address == this._wallet.account.opened).singles.map(
        //         address => this._wallet.account.single.find(s => s.address == address).pubkey
        //     )[0]
        // }
        return this._wallet.account.single[0].pubkey
    }

    private _getPublicKey(salt: string): string {
        const seed = BIP39.mnemonicToSeed(this._wallet.bip39._code, salt)
        const primitive = BIP32.fromSeed(seed, this._network)
        const extkey = primitive.derivePath(this._wallet.bip32.path)
        return extkey.publicKey.toString('hex')
    }

    public get password(): string {
        return this.formPassphrase.get('password').value
    }

    public confirm() {
        if(!this._verified) return
        if(this.formPassphrase.get('keeppassword').value === true) {
            sessionStorage.setItem(C.SESSION_PATH_SALT, String(this.password))
        }
        this._matDialogRef.close({
            message : 'Confirmed',
            data    : {
                verified: this._verified,
                password: this._verified ? this.formPassphrase.get('password').value : '',
            }
        })
    }

    public cancel() {
        this._matDialogRef.close({
            message : 'Canceled',
            data    : {
                verified: false,
                password: '',
            }
         })
    }
}
