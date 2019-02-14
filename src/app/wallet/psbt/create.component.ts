import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material'
import { Router } from '@angular/router'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { fuseAnimations } from '@fuse/animations'
import { ApiService } from '@app/services/api.service'
import { BitcoinToSatoshi, SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { AmountValidator } from '@som32/validators'
import { 
    IBitcoinfeesTypes, ISom32Balance, ISom32AccountShared, ISom32PsbtImportForm, ISOM32TxFormToSend, ISOM32RawTxToSend, 
} from '@som32/interfaces'
import { 
    Alert, AlertError, AlertInvalidPassword, 
    DialogPassphraseService 
} from '@som32/services'

import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'

@Component({
    selector   : 'wallet-psbt-create',
    templateUrl: './create.component.html',
    styleUrls  : ['./create.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class CreateComponent implements OnInit, OnDestroy {

    @ViewChild('confirmamount') InputCAmount: ElementRef

    private _unsubscribeAll: Subject<any>;

    private _stepper: MatStepper
    private _bitcoinToSatoshi: BitcoinToSatoshi
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _psbt: string
    private _psbtBn: string

    public txfees: IBitcoinfeesTypes
    public currentBalance: ISom32Balance
    public formTransactionInfo: FormGroup
    public formConfirmation: FormGroup
    public formFinished: FormGroup
    public isShared: boolean
    public isEditable: boolean
    public signed: boolean
    public codeButtonTooltip: string
    public codeTypeHex: boolean
    public txtotalfee: number
    public sum: number
    public notEnoughBalance: boolean

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
        this._unsubscribeAll = new Subject();
        this._bitcoinToSatoshi = new BitcoinToSatoshi()
        this._satoshiToBitcoin= new SatoshiToBitcoin()

        this.txfees = {
            fastestFee  : 0,
            halfHourFee : 0,
            hourFee     : 0
        }
        this.isShared = false;
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
        this.isEditable = true;
        this.txtotalfee = 0
        this.sum = 0

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted
                this.formTransactionInfo.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
                this.formConfirmation.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
            }, err => {
                console.log(err);
            }
        )
        this.isShared = this._walletService.isshared()
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
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
    private _getrawtx(password?: string): ISOM32RawTxToSend {
        // NOTE: getUnspents() set value of the this._apiService.entrusted with unspent list,
        // and unless the other type of api-service is called this._apiService.entrusted's 
        // value from getUnspents() will be retained.

        // TODO: The personal password should interactively be received from the user.
        return this._walletService.buildRawTx(this._getInput(), this._apiService.entrusted, password)
    }

    public get address(): string {
        return this._walletService.som32.address;
    }
    
    public stepIn(stepper: MatStepper): void {
        stepper.next();
        this._stepper = stepper
        this.isEditable = !this.isEditable;

        if(stepper.selectedIndex == 0) {
        } else if(stepper.selectedIndex == 1) {
            this._apiService.getTxFees().subscribe(
                res => {
                    this.txfees = res
                    this._apiService.getUnspents(this.address).subscribe(
                        _ => {
                            let rawtx = this._getrawtx()
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

    public stepReset(stepper: MatStepper): void {
        this.isEditable = true
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
        stepper.reset();
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
                let rawtx = this._getrawtx()
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

    public copyToClipboard(o) {
        o.select();
        document.execCommand('copy');
        o.setSelectionRange(0, 0);
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
