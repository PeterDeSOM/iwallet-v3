import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { ISom32Balance, ISom32AccountShared, ISom32PsbtImportForm, ISom32PsbtInfo } from '@som32/interfaces'
import { 
    Alert, AlertFileNotFound, AlertNotEnoughBalance, AlertInvalidPassword, 
    AlertInvalidFileCode, AlertInvalidPsbtImportFormat, AlertIncorrectMultiSig,
    DialogQRCodeScannerService, DialogPassphraseService 
} from '@som32/services'
import { multisigIdentical, psbtFromValid, psbtInfoFromImportForm } from '@som32/wallet.utils'

import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'

@Component({
    selector   : 'wallet-psbt-sign',
    templateUrl: './sign.component.html',
    styleUrls  : ['./sign.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class SignComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _psbt: string
    private _psbtBn: string

    public currentBalance: ISom32Balance
    public formSignTx: FormGroup
    public isEditable: boolean
    public isSigned: boolean
    public isCompleted: boolean
    public currentSharedAccount: ISom32AccountShared
    public codeButtonTooltip: string
    public codeTypeHex: boolean
    public psbtInfo: any

    constructor(
        private _apiService: ApiService,
        private _alert: Alert,
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _dialogPassphraseService: DialogPassphraseService,
        private _walletService: WalletService,
        private _formBuilder: FormBuilder,
        private _router: Router,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_MAIN_START]);
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject()
        this._satoshiToBitcoin = new SatoshiToBitcoin()
        this.psbtInfo = {
            type: C.PSBT_ACTION_NAME_CREATED
        }
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
    }
    

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.formSignTx = this._formBuilder.group({
            fakefield   : [''],
            psbt        : ['', Validators.required],
            code        : ['', Validators.required]
        })
        this.isEditable = true;
        this.currentSharedAccount = <ISom32AccountShared>this._walletService.som32.getaccount()

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted;
                
                let form = JSON.parse(sessionStorage.getItem(C.SESSION_PATH_PSBT_CREATED))
                if(!!form) {
                    this.importPsbt(form)
                    sessionStorage.removeItem(C.SESSION_PATH_PSBT_CREATED);
                }
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

    public get address(): string {
        return this._walletService.som32.address
    }
    
    public stepIn(stepper: MatStepper): void {
        stepper.next();
        this.isEditable = !this.isEditable

        // TODO:
    }

    public stepReset(stepper: MatStepper): void {
        this.isEditable = true;
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
        stepper.reset();
    }
    
    public get psbtcode(): string {
        return this.formSignTx.get('code').value
    }
    public set psbtcode(value: string) {
        this.formSignTx.get('code').setValue(value)
    }
    
    public get psbt(): string {
        return this.formSignTx.get('psbt').value
    }
    public set psbt(code: string) {
        this.formSignTx.get('psbt').setValue(code)
    }

    public importPsbt(form: ISom32PsbtImportForm, inputed: boolean = false) {
        if(!inputed && (!psbtFromValid(form) || ![C.PSBT_ACTION_NAME_CREATED, C.PSBT_ACTION_NAME_SIGNED].includes(form.type))) {
            this._alert.pop(AlertInvalidPsbtImportFormat)
            return
        }
        if(!multisigIdentical(this.currentSharedAccount, form.multisig)) {
            this._alert.pop(AlertIncorrectMultiSig)
            return
        }

        // TODO: validate psbt code

        let decoded = this._walletService.decodePsbt(form.hex)
        this.psbtInfo = psbtInfoFromImportForm(form, decoded)

        if(this.currentBalance.balance < this.psbtInfo.amount + this.psbtInfo.fee) {
            this._alert.pop(AlertNotEnoughBalance)
            return
        }

        if(this.psbtInfo.signers.length > 0) {

            // TODO: to combine psbt with coming from signed
            // currently coming from signed is not accept to process -----------

            // throw exception file type not mathced, or pop dialog to warn

            this._alert.pop({
                title   : 'Already signed',
                msg     : 'This PSBT was already signed.',
                desc    : '',
                button  : ['OK']
            })
            return

            // -----------------------------------------------------------------

            if(form.type != C.PSBT_ACTION_NAME_SIGNED) {

                // throw exception file type not mathced, or pop dialog to warn

                console.log(`imported form is not matched with...`)
                return
            }
        }

        this.isSigned = false
        this.isCompleted = this.psbtInfo.complete
        this.psbt = form.hex
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

    public showPsbt() {
        let code = this.psbt
        if(!code) return

        // let psbt = this._walletService.convertPsbt(code)
        // this._dialogRef = this._matDialog.open(DialogPsbtInfoComponent, {
        //     panelClass  : 'mail-compose-dialog',
        //     data        : code
        // })
    }

    public signPsbt() {
        let execute: Function = (password) => {
            this._psbt = this._walletService.signPsbt(this.psbt)
            this._psbtBn = Buffer.from(this._walletService.updatePsbt(this._psbt), 'hex').toString('base64')

            let decoded = this._walletService.decodePsbt(this._psbt)
            let signs = Object.keys(decoded.inputs[0].partial_signatures).length
    
            this.isCompleted = signs == this.currentSharedAccount.m ? true : false
            this.isSigned = true
            this.psbtcode = this._psbt
        }

        let title = 'Sign on a PSBT.'
        if(C.SESSION_PATH_SALT in sessionStorage) {
            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                this._alert.pop(
                    {
                        title   : title,
                        msg     : 'Do you want to sign on this PSBT?',
                        desc    : '',
                        button  : ['YES', 'NO']
                    },
                    action => { if(action == 'YES') execute(sessionStorage.getItem(C.SESSION_PATH_SALT)) }
                )
            } else this._alert.pop(AlertInvalidPassword)

        } else {
            this._dialogPassphraseService.pop(
                { 
                    title   : title,
                    msg     : '', 
                    wallet  : this._walletService.som32.export('all') 
                }, 
                (verified, password) => { if(verified) execute(password) }
            )
        }
    }

    public combinePsbt() {
        sessionStorage.setItem(C.SESSION_PATH_PSBT_SIGNED, JSON.stringify(this.dataFormed()))
        this._router.navigate([C.ROUTE_PATH_PSBT_COMBINE])
    }

    public pushPsbt() {
        sessionStorage.setItem(C.SESSION_PATH_PSBT_COMBINED, JSON.stringify(this.dataFormed()))
        this._router.navigate([C.ROUTE_PATH_PSBT_PUSH])
    }

    public convertCode() {
        if(this.codeTypeHex) {
            this.psbtcode = this._psbtBn
            this.codeButtonTooltip = 'Convert to HEX Som32 compatible'
        } else {
            this.psbtcode = this._psbt
            this.codeButtonTooltip = 'Convert to BASE64 bitcoin network compatible'
        }
        this.codeTypeHex = !this.codeTypeHex
    }

    public copyToClipboard(o) {
        o.select();
        document.execCommand('copy')
        o.setSelectionRange(0, 0)
    }

    public export() {
        let data = this.dataFormed()
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: "text/json;charset=UTF-8" });
        let address = this._walletService.som32.address + '―' + this.psbtInfo.recipient
        let sum = this.psbtInfo.amount + this.psbtInfo.fee
        let filename = (
            address + '―' + 
            this._satoshiToBitcoin.transform(sum) + '―psbt―signed―' + 
            this._walletService.som32.addressr + '―' + 
            Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        )
        FileSaver.saveAs(blob, filename)
    }

    public dataFormed(): ISom32PsbtImportForm {
        return {
            network : this._walletService.network.name,
            version : C.APP_VERTION,
            type    : C.PSBT_ACTION_NAME_SIGNED,
            multisig: this.currentSharedAccount,
            by      : this._walletService.som32.addressr,
            hex     : this._psbt,
            base64  : this._psbtBn,
        }
    }

    public readPsbt() {
        this._dialogQRCodeScannerService.pop().subscribe(res => {
            if(typeof res != 'undefined' && typeof res.qrcode != 'undefined' && res.qrcode != '') {
                if(!!res.qrcode) {
                    // TODO:
                }
            }}
        )
    }
}
