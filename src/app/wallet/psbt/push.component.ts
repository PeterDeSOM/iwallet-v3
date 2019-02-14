import { Component, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { ISom32PsbtImportForm } from '@som32/interfaces'
import { Alert, AlertError, AlertInvalidPassword, DialogQRCodeScannerService, DialogPassphraseService } from '@som32/services'
import { PsbtComponent } from './psbt.component'

@Component({
    selector        : 'wallet-psbt-push',
    templateUrl     : './push.component.html',
    styleUrls       : ['./push.component.scss'],
    encapsulation   : ViewEncapsulation.None,
    animations      : fuseAnimations
})
export class PushComponent extends PsbtComponent {

    public formPushTx: FormGroup
    public formFinishTx: FormGroup

    constructor(
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _dialogPassphraseService: DialogPassphraseService,
        private _formBuilder: FormBuilder,
        _apiService: ApiService,
        _alert: Alert,
        _walletService: WalletService,
        _router: Router,
    ) {
        super(_apiService, _alert, _walletService, _router)
        this.psbtInfo = {
            type: C.PSBT_ACTION_NAME_COMBINED
        }
    }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        super.ngOnInit()

        this.formPushTx = this._formBuilder.group({
            fakefield   : [''],
            psbt        : ['', Validators.required],
        })
        this.formFinishTx = this._formBuilder.group({
            fakefield   : [''],
            txid        : ['', Validators.required]
        })

        let form = JSON.parse(sessionStorage.getItem(C.SESSION_PATH_PSBT_COMBINED))
        if(!!form) {
            this.importPsbt(form)
            sessionStorage.removeItem(C.SESSION_PATH_PSBT_COMBINED)
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        super.ngOnDestroy()
    }

    public get psbt(): string {
        return this.formPushTx.get('psbt').value
    }
    
    public set psbt(code: string) {
        this.formPushTx.get('psbt').setValue(code)
    }
    
    public get txid(): string {
        return this.formFinishTx.get('txid').value
    }
    public set txid(txid: string) {
        this.formFinishTx.get('txid').setValue(txid)
    }

    public stepReset(stepper: MatStepper): void {
        super.stepReset(stepper)

        this.txid = ''
    }

    public importPsbt(form: ISom32PsbtImportForm, inputed: boolean = false) {
        if(!super.importPsbt(form, inputed)) return
        if(this.psbtInfo.signers.length > 0) {

            // TODO: to push psbt with coming from signed
            // currently coming from the 'signed' is not accept to process -----

            if(!this.psbtInfo.complete) {
                this._alert.pop({
                    title   : 'Not fully signed.',
                    msg     : 'Not fully signed PSBT can not be pushed.',
                    desc    : '',
                    button  : ['OK']
                })
                return false
            }
        } else {
            this._alert.pop({
                title   : 'Unsigned signed PSBT.',
                msg     : 'Unsigned PSBT can not be pushed.',
                desc    : '',
                button  : ['OK']
            })
            return false
        }
    }

    public pushPsbt(stepper: MatStepper) {

        // TODO: find and adopt correctly working finalizePsbt

        // TODO: check the balance and utxo already spent

        let execute: Function = (password) => {
            // convert to raw transaction in hexadecimal
            let rawtx = this._walletService.finalizePsbt(this.psbt)
            // send raw transaction into the network
            this._apiService.pushTx(rawtx).subscribe(
                _ => {
                    let res = this._apiService.entrusted
                    if(res.success) {
                        this.txid = res.txid
                        this.stepIn(stepper)
                    } else {
                        this._alert.pop(AlertError('Fail to push PSBT.', ''))
                    }
                }, err => {
                    this._alert.pop(AlertError('Fail to push PSBT.', err))
                }
            )
        }

        let title = 'Push PSBT & Pay to.'
        let desc = 'After the success of pushing transaction to the network, its amount also be paid to the recipient.'
        if(C.SESSION_PATH_SALT in sessionStorage) {
            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                this._alert.pop(
                    {
                        title   : title,
                        msg     : 'Do you want to push this PSBT?',
                        desc    : desc,
                        button  : ['YES', 'NO']
                    },
                    action => { if(action == 'YES') execute(sessionStorage.getItem(C.SESSION_PATH_SALT)) }
                )
            } else this._alert.pop(AlertInvalidPassword)

        } else {
            this._dialogPassphraseService.pop(
                { 
                    title   : title,
                    msg     : desc, 
                    wallet  : this._walletService.som32.export('all') 
                }, 
                (verified, password) => { if(verified) execute(password) }
            )
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
