import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators'
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { BitcoinToSatoshi, SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { IBlockchainInfoUnspent, ISom32Balance, ISom32AccountShared, ISOM32TxFormToSend, ISOM32RawTxToSend } from '@som32/interfaces'
import { C } from '@som32/globals'
import { AmountValidator } from '@som32/validators'
import { Alert, AlertError, AlertInvalidPassword, DialogPassphraseService } from '@som32/services'

@Component({
    selector   : 'wallet-psbt-convenient',
    templateUrl: './convenient.component.html',
    styleUrls  : ['./convenient.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class ConvenientComponent implements OnInit, OnDestroy {

    @ViewChild('confirmamount') InputCAmount: ElementRef

    private _unsubscribeAll: Subject<any>
    private _bitcoinToSatoshi: BitcoinToSatoshi
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _txholder: {
        s: string
        u: IBlockchainInfoUnspent[]
    }

    public txfees: any
    public currentBalance: ISom32Balance
    public formCreate: FormGroup
    public formCreateFinish: FormGroup
    public currentSharedAccount: ISom32AccountShared
    public txtotalfee: number
    public sum: number
    public notEnoughBalance: boolean
    public steps: number[]
    public listCreated: any[]
    public listCreatedByMyself: any[]
    public listSigned: any[]
    public listSignedByMyself: any[]
    public listComplete: any[]
    public listHistory: any[]

    constructor(
        private _apiService: ApiService,
        private _alert: Alert,
        private _dialogPassphraseService: DialogPassphraseService,
        private _walletService: WalletService,
        private _formBuilder: FormBuilder,
        private _router: Router,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_WALLET_HOME]);
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._bitcoinToSatoshi = new BitcoinToSatoshi()
        this._satoshiToBitcoin= new SatoshiToBitcoin()
        this.steps = [0, 0, 0, 0, 0]
        this.listCreated = []
        this.listCreatedByMyself = []
        this.listSigned = []
        this.listSignedByMyself = []
        this.listComplete = []
        this.listHistory = []
        this.notEnoughBalance = false
    }
    
    ngOnInit(): void {
        this.formCreate = this._formBuilder.group({
            name        : ['', [Validators.required, Validators.minLength(20), Validators.maxLength(70)]],
            to          : ['', [
                Validators.required, 
                Validators.minLength(32), 
                Validators.pattern(/^[a-zA-Z0-9]+$/), 
                this._walletService.addressValidator,
            ]],
            amount      : [, [
                Validators.required, 
                Validators.pattern(/^[+]?([0-9]+(?:[\.][0-9]*)?|\.[0-9]+)$/),
                AmountValidator
            ]],
            curbalance  : [,],
            description : ['']
        })
        this.formCreateFinish = this._formBuilder.group({
            amount      : [, [Validators.required, AmountValidator]],
            curbalance  : [,],
            confirmed   : [false],
            confirm     : ['', Validators.required],
            verified    : ['', Validators.required],
        })
        this.formCreate.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formCreate.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.formCreateFinish.get('amount').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                let amount = (
                    Number(this.formCreate.get('amount').value) + 
                    this._satoshiToBitcoin.transform(this.txtotalfee)
                ).toFixed(8)
                if(Number(n) != Number(amount)) this.formCreateFinish.get('amount').setValue(amount, {emitEvent: false})
            })
        this.formCreateFinish.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formCreateFinish.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.currentSharedAccount = <ISom32AccountShared>this._walletService.som32.getaccount()
        this.setPsbtListCreated(this._walletService.som32.addressr)

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted
                this.formCreate.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
                this.formCreateFinish.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
            }, err => {
                console.log(err);
            }
        )
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }


    private _getInput(): ISOM32TxFormToSend {
        let input = {
            to          : this.to,
            amount      : this._bitcoinToSatoshi.transform(this.amount),
            fee         : this.txfees.fastestFee,
            description : this.description,
        }
        return input

    }
    private _getrawtx(unspents: IBlockchainInfoUnspent[], password?: string): ISOM32RawTxToSend {
        // NOTE: getUnspents() set value of the this._apiService.entrusted with unspent list,
        // and unless the other type of api-service is called this._apiService.entrusted's 
        // value from getUnspents() will be retained.

        // TODO: The personal password should interactively be received from the user.
        try {
            return this._walletService.buildRawTx(this._getInput(), unspents, password)
        } catch(err) {
            this._alert.pop(AlertError('Error on building TX.', err))
            return null
        }
    }

    public get name(): string {
        return this.formCreate.get('name').value
    }

    public get to(): string {
        return this.formCreate.get('to').value
    }

    public get amount(): number {
        return this.formCreate.get('amount').value
    }

    public get description(): string {
        return this.formCreate.get('description').value
    }

    public get fee(): number {
        return this.formCreateFinish.get('fee').value
    }

    public set to(value: string) {
        this.formCreate.get('to').setValue(value)
    }

    public get address(): string {
        return this._walletService.som32.address
    }

    public set name(value: string) {
        this.formCreate.get('name').setValue(value)
    }

    public set amount(value: number) {
        this.formCreate.get('amount').setValue(value)
    }

    public set description(value: string) {
        this.formCreate.get('description').setValue(value)
    }

    public stepIn(tab: number, step: number) {
        if(tab == 0) {
            if(step == 0) {
                this.name = ''
                this.to = ''
                this.amount = null
                this.description = ''

            } else if(step == 1) {
                this._apiService.getTxFees().subscribe(res => {
                    this.txfees = res
                    this._apiService.getUnspents(this.address).subscribe(() => {
                        
                        let execute = (unspents: any, salt: string) => {
                            this._txholder = { s: salt, u: unspents }

                            let rawtx = this._getrawtx(unspents, salt)
                            if(rawtx === null) return

                            this.txtotalfee = rawtx.totalfee
                            this.sum = this._bitcoinToSatoshi.transform(this.amount) + this.txtotalfee
                            this.formCreateFinish.get('amount').setValue(this.amount + this._satoshiToBitcoin.transform(this.txtotalfee))

                            if(this.currentBalance.balance >= this.sum) {
                                this.notEnoughBalance = false
                                this.formCreateFinish.get('verified').setValue('true')
                            } else {
                                this.notEnoughBalance = true
                                this.formCreateFinish.get('verified').setValue('')
                            }
            
                            this.InputCAmount.nativeElement.focus()
                            this.InputCAmount.nativeElement.blur()
                        }
                        
                        let unspents = <IBlockchainInfoUnspent[]>this._apiService.entrusted
                        if(C.SESSION_PATH_SALT in sessionStorage) execute(unspents, sessionStorage.getItem(C.SESSION_PATH_SALT))
                        else {
                            this._dialogPassphraseService.pop(
                                { 
                                    title   : 'Password Verification',
                                    msg     : '', 
                                    wallet  : this._walletService.som32.export('all') 
                                }, 
                                (verified, password) => { if(verified) execute(unspents, password) }
                            )
                        }
                    }, err => {
                        this._alert.pop(AlertError('Fail to get unspents.', err))
                    })}
                )
            } else {

            }
        }
        this.steps[tab] = step
    }

    public tabChanged(e) {
        switch(e.index) {
            case 0:
                this.setPsbtListCreated(this._walletService.som32.addressr)
                break
            case 1:
                this.setPsbtListSigned()
                break
            case 2:
                this.setPsbtListComplete()
                break
            case 3:
                this.setPsbtHistory()
                break
        }
    }

    public setPsbtListCreated(by: string = 'ALL') {
        this._apiService.getPsbtList(this.address, C.PSBT_ACTION_NAME_CREATED, by).subscribe(c => {
            this.getPsbtListCreated(c, by)
        })
    }

    public setPsbtListSigned() {
        this._apiService.getPsbtList(this.address, C.PSBT_ACTION_NAME_CREATED).subscribe(c => {
            this._apiService.getPsbtList(this.address, C.PSBT_ACTION_NAME_SIGNED, this._walletService.som32.addressr).subscribe(s => {
                this.getPsbtListCreated(c)
                this.getPsbtListSigned(s, this._walletService.som32.addressr)
            })
        })
    }

    public setPsbtListComplete() {
        this._apiService.getPsbtList(this.address, C.PSBT_ACTION_NAME_COMPLETE).subscribe(res => {
            if(!!res) {
                this.listComplete = res.map(c => { 
                    let timestemp = new Date(c.datetime)
                    return {
                        id          : c.datetime,
                        datetime    : timestemp.toLocaleDateString() + ' ' + timestemp.toLocaleTimeString(),
                        name        : c.name,
                        by          : c.by,
                        recipient   : c.recipient,
                        amount      : c.amount,
                        fee         : c.fee,
                        desc        : c.desc,
                        psbt        : c.psbt,
                        m           : c.m,
                        signers     : !!c.signed ? c.signed : [],
                        signed      : !!c.signed ? c.signed.find(
                            a => a == this._walletService.som32.addressr
                        ) : false,
                    }
                }).sort((a, b) => b.id - a.id)
            } else {
                this.listComplete = []
            }
        })
    }

    public setPsbtHistory() {
        this._apiService.getPsbtList(this.address, C.PSBT_ACTION_NAME_HISTORY).subscribe(res => {
            this.listHistory = res.map(c => {
                let timestemp = new Date(c.datetime)
                return {
                    id          : c.datetime,
                    datetime    : timestemp.toLocaleDateString() + ' ' + timestemp.toLocaleTimeString(),
                    action      : c.action,
                    name        : c.for,
                    by          : c.by,
                }
            }).sort((a, b) => b.id - a.id)
        })
    }

    public getPsbtListCreated(res: any, by: string = 'ALL') {
        if(!!res) {
            let r = res.map(c => { 
                let timestemp = new Date(c.datetime)
                return {
                    id          : c.datetime,
                    datetime    : timestemp.toLocaleDateString() + ' ' + timestemp.toLocaleTimeString(),
                    name        : c.name,
                    by          : c.by,
                    recipient   : c.recipient,
                    amount      : c.amount,
                    fee         : c.fee,
                    desc        : c.desc,
                    psbt        : c.psbt,
                    m           : c.m,
                    signers     : !!c.signed ? c.signed : [],
                    signed      : !!c.signed ? c.signed.find(
                        a => a == this._walletService.som32.addressr
                    ) : false,
                }
            }).sort((a, b) => b.id - a.id)

            if(by == 'ALL') this.listCreated = r
            else this.listCreatedByMyself = r
        } else {
            if(by == 'ALL') this.listCreated = []
            else this.listCreatedByMyself = []
        }
    }

    public getPsbtListSigned(res: any, by: string = 'ALL') {
        if(!!res) {
            let r = res.map(c => { 
                let timestemp = new Date(c.datetime)
                return {
                    id          : c.datetime,
                    datetime    : timestemp.toLocaleDateString() + ' ' + timestemp.toLocaleTimeString(),
                    refid       : c.id,
                    name        : c.name,
                    by          : c.by,
                    psbt        : c.psbt,
                }
            }).sort((a, b) => b.id - a.id)

            if(by == 'ALL') this.listSigned = r
            else this.listSignedByMyself = r
        } else {
            if(by == 'ALL') this.listSigned = []
            else this.listSignedByMyself = []
        }
    }

    public cancelPsbt(tab: number, id: string) {
        let execute: Function = (password) => {
            let data = {
                multisig: this.address,
                location: tab,
                id      : id,
                by      : this._walletService.som32.addressr,
            }
            this._apiService.cancelPsbt(data).subscribe(
                res => {

                    // TODO: check the result, success or not

                    if(tab == 0) this.setPsbtListCreated(this._walletService.som32.addressr)
                    else if(tab == 1) this.setPsbtListSigned()
                    else this.setPsbtListComplete()
                }, err => {
                    console.log(`Error On 'apiService.cancelPsbt' - %s`, err);
                }
            )
        }
        let title = ''
        let msg = ''
        let desc = ''
        
        if(tab == 0) {
            title = 'Delete the PSBT created by myself.'
            msg = 'Do you want to cancel this created?'
        } else if(tab == 1) {
            title = 'Delete a signature signed by myself.'
            msg = 'Do you want to cancel this signed?'
        } else {
            title = 'Cancel and delete a PSBT.'
            msg = 'Do you want to cancel this PSBT?'
            desc = 'This PSBT and all its signatures will be deleted.'
        }
        if(C.SESSION_PATH_SALT in sessionStorage) {
            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                this._alert.pop(
                    {
                        title   : title,
                        msg     : msg,
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

    public confirm() {
        let checked: boolean = this.formCreateFinish.get('confirmed').value
        if(checked) this.formCreateFinish.get('confirm').setValue('')
        else this.formCreateFinish.get('confirm').setValue('true')
    }

    public createPsbt() {
        let execute = (rawtx: any, txHexs: { txid: string, hex: string }[]) => {
            let psbt = this._walletService.createPsbt(rawtx, txHexs)
            let psbtBn = Buffer.from(this._walletService.updatePsbt(psbt), 'hex').toString('base64')
            let data = {
                name        : this.name,
                multisig    : this.address,
                m           : this.currentSharedAccount.m,
                recipient   : this.to,
                by          : this._walletService.som32.addressr,
                amount      : this._bitcoinToSatoshi.transform(this.amount),
                fee         : this.txtotalfee,
                psbt        : psbt,
                psbtbn      : psbtBn,
                desc        : this.description,
            }

            this._apiService.createPsbt(data).subscribe(
                _ => {
                    this.stepIn(0, 2)
                    this.setPsbtListCreated(this._walletService.som32.addressr)
                }, err => {
                    this._alert.pop(AlertError('Fail to get unspents.', err))
                }
            )

            this._txholder = null
        }

        let rawtx = this._getrawtx(this._txholder.u, this._txholder.s)
        if(rawtx === null) return

        let txs = rawtx.inputs.map(input => input.txid)

        this._apiService.getTx(txs.toString(), true).subscribe(() => {
            execute(rawtx, this._apiService.entrusted)
        }, err => {
            this._alert.pop(AlertError('Fail to get transaction.', err))
        })
    }

    public signPsbt(id: string) {
        let execute: Function = (password) => {
            let psbt: string
            try {
                psbt = this._walletService.signPsbt(this.listCreated.find(c => c.id == id).psbt)
            } catch(err) {
                this._alert.pop(AlertError('Error on signing a PSBT.', err))
                return
            }
    
            // TODO: validate signer

            let PsbtBn: string
            try {
                PsbtBn = Buffer.from(this._walletService.updatePsbt(psbt), 'hex').toString('base64')
            } catch(err) {
                this._alert.pop(AlertError('Error on updating a PSBT.', err))
                return
            }
    
            let data = {
                multisig: this.address,
                id      : id,
                by      : this._walletService.som32.addressr,
                psbt    : psbt,
                PsbtBn  : PsbtBn
            }
    
            this._apiService.signPsbt(data).subscribe(
                res => {
                    this.setPsbtListSigned()
                }, err => {
                    this._alert.pop(AlertError("Error on 'apiService.signPsbt'.", err))
                }
            )
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

    public pushPsbt(id: number) {
        let execute: Function = (password) => {
            let data = {
                multisig: this.address,
                id      : id,
            }
            this._apiService.getPsbtComplete(data).subscribe(res1 => {
                let psbts = res1.signed.map(s => s.psbt)
                let psbt = this._walletService.combinePsbt(psbts)
                let rawtx = this._walletService.finalizePsbt(psbt)

                this._apiService.pushTx(rawtx).subscribe(_ => {
                    let res2 = this._apiService.entrusted

                    if(res2.success) {
                        let txid = res2.txid
                        let data = {
                            multisig: this.address,
                            id      : id,
                            by      : this._walletService.som32.addressr,
                        }
                        this._apiService.pushPsbt(data).subscribe(res3 => {
                            if(res3.success) {
                                this._alert.pop({
                                    title   : 'PSBT pushed & paid',
                                    msg     : 'Successfully pushed and paid.',
                                    desc    : 'Transction ID :<br>' + txid,
                                    button  : ['OK']
                                })
                                this.setPsbtListComplete()
                            } else {
                                this._alert.pop(AlertError('Fail to clear complete PSBT data.', ''))
                            }}
                        )
                    } else { this._alert.pop(AlertError('Fail to push PSBT.', '')) }
                }, err => { this._alert.pop(AlertError('Fail to push PSBT.', err)) })
            }, err => { this._alert.pop(AlertError('Fail to get complete PSBT.', err)) })
        }

        let title = 'Push a PSBT & Pay to.'
        let desc = 'After the sucess of pushing this transaction, for the safety, its PSBT and all the signatures will be deleted from the database, but not history.'
        if(C.SESSION_PATH_SALT in sessionStorage) {
            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                this._alert.pop(
                    {
                        title   : title,
                        msg     :'Do you want to push & pay this PSBT?',
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
