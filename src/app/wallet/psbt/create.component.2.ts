import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import { MatStepper } from '@angular/material'
import { Router } from '@angular/router'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { fuseAnimations } from '@fuse/animations'
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { AmountValidator } from '@som32/validators'
import { 
    IBitcoinfeesTypes, 
    ISom32Balance, ISom32AccountShared, ISom32PsbtImportForm, ISOM32TxFormToSend, ISOM32RawTxToSend, 
} from '@som32/interfaces'
import { 
    Alert, AlertError, AlertInvalidPassword, 
    DialogPassphraseService 
} from '@som32/services'

import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'

import { PsbtComponent } from './psbt.component'

@Component({
    selector   : 'wallet-psbt-create',
    templateUrl: './create.component.html',
    styleUrls  : ['./create.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class CreateComponent extends PsbtComponent {

    @ViewChild('confirmamount') InputCAmount: ElementRef

    private _stepper: MatStepper

    public formTransactionInfo: FormGroup
    public formConfirmation: FormGroup
    public formFinished: FormGroup
    public signed: boolean
    public txtotalfee: number
    public sum: number

    constructor(
        private _dialogPassphraseService: DialogPassphraseService,
        private _formBuilder: FormBuilder,
        _apiService: ApiService,
        _alert: Alert,
        _walletService: WalletService,
        _router: Router,
    ) {
        super(_apiService, _alert, _walletService, _router)

        this.txfees = {
            fastestFee  : 0,
            halfHourFee : 0,
            hourFee     : 0
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

        this.formTransactionInfo = this._formBuilder.group({
            fakefield   : [''],
            to          : ['', [
                Validators.required, 
                Validators.minLength(32), 
                Validators.pattern(/^[a-zA-Z0-9]+$/), 
                this._walletService.addressValidator,
            ]],
            amount      : [, [
                Validators.required, 
                Validators.pattern(/^[+]?([0-9]+(?:[\.][0-9]*)?|\.[0-9]+)$/),
                AmountValidator,
            ]],
            curbalance  : [,],
            description : ['']
        });
        this.formConfirmation = this._formBuilder.group({
            fakefield   : [''],
            amount      : [, [Validators.required, AmountValidator]],
            curbalance  : [,],
            verified    : ['', Validators.required],
        });
        this.formFinished = this._formBuilder.group({
            fakefield   : [''],
            code        : ['', Validators.required]
        });
        this.formTransactionInfo.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formTransactionInfo.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.formConfirmation.get('amount').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                let amount = (
                    Number(this.formTransactionInfo.get('amount').value) + 
                    this._satoshiToBitcoin.transform(this.txtotalfee)
                ).toFixed(8)
                if(Number(n) != Number(amount)) this.formConfirmation.get('amount').setValue(amount, {emitEvent: false})
            })
        this.formConfirmation.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formConfirmation.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.txtotalfee = 0
        this.sum = 0
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        super.ngOnDestroy()
    }

    onAmount(e) {
        this.formTransactionInfo.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false}) 
        this.formConfirmation.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
    }

    private _getInput(): ISOM32TxFormToSend {
        let input = {
            to          : this.formTransactionInfo.get('to').value,
            amount      : this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value),
            fee         : this.txfees.fastestFee,
            description : this.formTransactionInfo.get('description').value,
        }
        return input
    }

    public stepIn(stepper: MatStepper): void {
        super.stepIn(stepper)

        this._stepper = stepper

        if(stepper.selectedIndex == 0) {

        } else if(stepper.selectedIndex == 1) {
            this._apiService.getTxFees().subscribe(
                res => {
                    this.txfees = res
                    this._apiService.getUnspents(this.address).subscribe(
                        _ => {
                            let rawtx = this._getrawtx(this._getInput())
                            this.txtotalfee = rawtx.totalfee
                            this.sum = (
                                this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value) +
                                rawtx.totalfee
                            )
                            this.formConfirmation.get('amount').setValue(
                                Number(this.formTransactionInfo.get('amount').value) + 
                                this._satoshiToBitcoin.transform(this.txtotalfee)
                            )

                            let amount = this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value) + this.txtotalfee
                            if(this.currentBalance.balance >= amount) {
                                this.notEnoughBalance = false
                                this.formConfirmation.get('verified').setValue('true')
                            } else {
                                this.notEnoughBalance = true
                                this.formConfirmation.get('verified').setValue('')
                            }

                            this.InputCAmount.nativeElement.focus()
                            this.InputCAmount.nativeElement.blur()

                    }, err => {
                            this._alert.pop(AlertError('Fail to get unspents.', err))
                        }
                    )
                }
            )
        }
    }

    public createPsbt(sign: boolean) {
        let execute: Function = (password, rawtx) => {
            let psbt = this._walletService.createPsbt(rawtx, this._apiService.entrusted)
            // if(sign) psbt = this._walletService.signPsbt(psbt)

            this._psbt = psbt
            this._psbtBn = Buffer.from(this._walletService.updatePsbt(psbt), 'hex').toString('base64')
            this.signed = sign
            this.psbtcode = psbt
        
            this.stepIn(this._stepper)
        }

        this._apiService.getUnspents(this.address).subscribe(
            _ => {
                let rawtx = this._getrawtx(this._getInput())
                let txs = []
                
                for(let input of rawtx.inputs) {
                    txs.push(input.txid)
                }

                this._apiService.getTx(txs.toString(), true).subscribe(
                    _ => {
                        let title = 'Create a PSBT.'
                        if(C.SESSION_PATH_SALT in sessionStorage) {
                            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                                this._alert.pop(
                                    {
                                        title   : title,
                                        msg     : 'Do you want to create a PSBT?',
                                        desc    : '',
                                        button  : ['YES', 'NO']
                                    },
                                    action => { if(action == 'YES') execute(sessionStorage.getItem(C.SESSION_PATH_SALT), rawtx) }
                                )
                            } else this._alert.pop(AlertInvalidPassword)
                        } else {
                            this._dialogPassphraseService.pop(
                                { 
                                    title   : title,
                                    msg     : '', 
                                    wallet  : this._walletService.som32.export('all') 
                                }, 
                                (verified, password) => { if(verified) execute(password, rawtx) }
                            )
                        }
                    }
                ), err => {
                    this._alert.pop(AlertError('Fail to get transaction.', err))
                }
            }, err => {
                this._alert.pop(AlertError('Fail to get unspents.', err))
            }
        )
    }

    public signPsbt() {
        sessionStorage.setItem(C.SESSION_PATH_PSBT_CREATED, JSON.stringify(this.dataFormed()))
        this._router.navigate([C.ROUTE_PATH_PSBT_SIGN])
    }

    public get psbtcode(): string {
        return this.formFinished.get('code').value
    }
    public set psbtcode(value: string) {
        this.formFinished.get('code').setValue(value)
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

    public export() {
        let data = this.dataFormed()
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: "text/json;charset=UTF-8" });
        let address = this._walletService.som32.address + '―' + this.formTransactionInfo.get('to').value
        let filename = address + '―' + this._satoshiToBitcoin.transform(this.sum) + '―psbt―created―' + Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        FileSaver.saveAs(blob, filename)
    }

    public dataFormed(): ISom32PsbtImportForm {
        return {
            network : this._walletService.network.name,
            version : C.APP_VERTION,
            type    : C.PSBT_ACTION_NAME_CREATED,
            multisig: <ISom32AccountShared>this._walletService.som32.getaccount(),
            by      : this._walletService.som32.addressr,
            hex     : this._psbt,
            base64  : this._psbtBn,
        }
    }
}
