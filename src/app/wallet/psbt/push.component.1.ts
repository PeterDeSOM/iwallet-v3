import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { ISom32AccountShared, ISom32Balance, ISom32PsbtImportForm } from '@som32/interfaces'
import { 
    Alert, AlertError, AlertFileNotFound, AlertNotEnoughBalance, AlertInvalidPassword, 
    AlertInvalidFileCode, AlertInvalidPsbtImportFormat, AlertIncorrectMultiSig,
    DialogPassphraseService
} from '@som32/services'
import { psbtFromValid, psbtInfoFromImportForm } from '@som32/wallet.utils'

@Component({
    selector        : 'wallet-psbt-push',
    templateUrl     : './push.component.html',
    styleUrls       : ['./push.component.scss'],
    encapsulation   : ViewEncapsulation.None,
    animations      : fuseAnimations
})
export class PushComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>

    public currentBalance: ISom32Balance
    public currentSharedAccount: ISom32AccountShared
    public formPushTx: FormGroup
    public formFinishTx: FormGroup
    public isShared: boolean
    public isEditable: boolean
    public psbtInfo: any

    constructor(
        private _apiService: ApiService,
        private _alert: Alert,
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
        this.psbtInfo = {
            type: C.PSBT_ACTION_NAME_COMBINED
        }
        this.isShared = false
    }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.formPushTx = this._formBuilder.group({
            fakefield   : [''],
            psbt        : ['', Validators.required],
        })
        this.formFinishTx = this._formBuilder.group({
            fakefield   : [''],
            txid        : ['', Validators.required]
        })
        this.isEditable = true;
        this.isShared = this._walletService.isshared()
        this.currentSharedAccount = <ISom32AccountShared>this._walletService.som32.getaccount()

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted;
            }, err => {
                console.log(err);
            }
        )

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
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get address(): string {
        return this._walletService.som32.address
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

    public stepIn(stepper: MatStepper): void {
        stepper.next()
        this.isEditable = !this.isEditable
    }

    public stepReset(stepper: MatStepper): void {
        stepper.reset();
        this.isEditable = true
        this.txid = ''
    }

    public importPsbt(form: ISom32PsbtImportForm, inputed: boolean = false) {
        if(!inputed && (!psbtFromValid(form) || ![C.PSBT_ACTION_NAME_SIGNED, C.PSBT_ACTION_NAME_COMBINED].includes(form.type))) {
            this._alert.pop(AlertInvalidPsbtImportFormat)
            return false
        }
        if(JSON.stringify(this.currentSharedAccount) != JSON.stringify(form.multisig)) {
            this._alert.pop(AlertIncorrectMultiSig)
            return false
        }

        // TODO: validate psbt code

        let decoded = this._walletService.decodePsbt(form.hex)
        this.psbtInfo = psbtInfoFromImportForm(form, decoded)

        if(this.currentBalance.balance < this.psbtInfo.amount + this.psbtInfo.fee) {
            this._alert.pop(AlertNotEnoughBalance)
            return
        }
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
        let desc = 'After the success of pushing transaction to the network, its amount also be paid to recipient.'
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
}
