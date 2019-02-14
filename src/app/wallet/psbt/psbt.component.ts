import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiService } from '@app/services/api.service'
import { BitcoinToSatoshi, SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { IBitcoinfeesTypes, ISom32AccountShared, ISom32Balance, ISom32PsbtImportForm, ISOM32RawTxToSend, ISOM32TxFormToSend } from '@som32/interfaces'
import { 
    Alert, AlertFileNotFound, AlertNotEnoughBalance, 
    AlertInvalidFileCode, AlertInvalidPsbtImportFormat, AlertIncorrectMultiSig
} from '@som32/services'
import { multisigIdentical, psbtFromValid, psbtInfoFromImportForm } from '@som32/wallet.utils'

export class PsbtComponent implements OnInit, OnDestroy {

    protected _unsubscribeAll: Subject<any>
    protected _bitcoinToSatoshi: BitcoinToSatoshi
    protected _satoshiToBitcoin: SatoshiToBitcoin
    protected _psbt: string
    protected _psbtBn: string

    public currentBalance: ISom32Balance
    public currentSharedAccount: ISom32AccountShared
    public txfees: IBitcoinfeesTypes
    public isShared: boolean
    public isEditable: boolean
    public notEnoughBalance: boolean
    public codeTypeHex: boolean
    public codeButtonTooltip: string
    public psbtInfo: any

    constructor(
        protected _apiService: ApiService,
        protected _alert: Alert,
        protected _walletService: WalletService,
        protected _router: Router,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_MAIN_START]);
        }

        // Set the protected defaults
        this._unsubscribeAll = new Subject()
        this._bitcoinToSatoshi = new BitcoinToSatoshi()
        this._satoshiToBitcoin= new SatoshiToBitcoin()

        this.isShared = false
        this.codeTypeHex = true
        this.notEnoughBalance = false
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
    }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.isEditable = true;
        this.isShared = this._walletService.isshared()
        this.currentSharedAccount = <ISom32AccountShared>this._walletService.som32.getaccount()

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted
            }, err => {
                console.log(err);
            }
        )
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    protected _getrawtx(input: ISOM32TxFormToSend, password?: string): ISOM32RawTxToSend {
        // NOTE: getUnspents() set value of the this._apiService.entrusted with unspent list,
        // and unless the other type of api-service is called this._apiService.entrusted's 
        // value from getUnspents() will be retained.

        // TODO: The personal password should interactively be received from the user.
        return this._walletService.buildRawTx(input, this._apiService.entrusted, password)
    }

    protected importPsbt(form: ISom32PsbtImportForm, inputed: boolean = false): boolean {
        if(!inputed && !psbtFromValid(form)) {
            this._alert.pop(AlertInvalidPsbtImportFormat)
            return false
        }
        if(!multisigIdentical(this.currentSharedAccount, form.multisig)) {
            this._alert.pop(AlertIncorrectMultiSig)
            return
        }

        // TODO: validate psbt code

        let decoded = this._walletService.decodePsbt(form.hex)
        this.psbtInfo = psbtInfoFromImportForm(form, decoded)

        if(!!this.currentBalance && this.currentBalance.balance < this.psbtInfo.amount + this.psbtInfo.fee) {
            this._alert.pop(AlertNotEnoughBalance)
            return false
        }
        this.psbt = form.hex
    }

    public get address(): string {
        return this._walletService.som32.address
    }
    
    public get psbt(): string { return }
    public set psbt(code: string) { return }

    public stepIn(stepper: MatStepper): void {
        stepper.next()
        this.isEditable = !this.isEditable
    }

    public stepReset(stepper: MatStepper): void {
        stepper.reset();
        this.isEditable = true
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
    }

    public getPsbtCode(e) {
        let reader = new FileReader();
        reader.onload = () => {
            e.target.value = ''

            if(typeof(reader.result) == 'undefined') {
                this._alert.pop(AlertInvalidFileCode)
                return
            }
            let objPsbt= <ISom32PsbtImportForm>JSON.parse(Buffer.from(<string>reader.result, 'base64').toString())
            this.importPsbt(objPsbt)
        }

        if(typeof e.target.files[0] === 'undefined') {
            this._alert.pop(AlertFileNotFound)
            return
        }
        reader.readAsText(e.target.files[0]);
    }

    public createPsbt(sign: boolean) { }
    public signPsbt() { }
    public combinePsbt() { }
    public pushPsbt(stepper?: MatStepper) { }

    public copyToClipboard(o) {
        o.select();
        document.execCommand('copy');
        o.setSelectionRange(0, 0);
    }
}
