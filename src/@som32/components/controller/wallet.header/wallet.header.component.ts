import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { SatoshiToBitcoin, WeiToEther } from '@app/services/pipes'
import { Som32ConfigService } from '@som32/services'

@Component({
    selector   : 'wallet-header',
    templateUrl: './wallet.header.component.html',
    styleUrls  : ['./wallet.header.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class WalletHeaderComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _weiToEther: WeiToEther
    private _currencBal: Number
    private _currencTransformed: Number
    
    public som32Config: any
    public formAccount: FormGroup
    public formAccountSingle: FormGroup
    public accounts: any
    public accountAddress: string
    public selectedAddress: string
    public selectedAddressName: string
    public selectedAddressType: string

    constructor(
        private _formBuilder: FormBuilder,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
        private _apiService: ApiService,
    ) {
        this.accounts = []
        this.accountAddress = ''
        this.selectedAddress = ''
        this.selectedAddressName = ''
        this.selectedAddressType = ''

        // Set the private defaults
        this._unsubscribeAll = new Subject()
        this._satoshiToBitcoin = new SatoshiToBitcoin()
        this._weiToEther = new WeiToEther()
    
    }

    ngOnInit(): void {
        this.formAccount = this._formBuilder.group({
            fakefield: [''],
            addresses: [''],
        })
        this.formAccountSingle = this._formBuilder.group({
            fakefield: [''],
            addresses: [''],
        })

        // Subscribe to the config changes
        this._som32ConfigService.config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config) => {
                this.som32Config = config
                this.setAccountList()
            })

        // Subscribe to the specific form value changes (layout.style)
        this.formAccount.get('addresses').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(address => {
                let account = this.accounts.find(a => a.opened == address)

                this.som32Config.account.opened = account.opened
                this.som32Config.account.type = account.type
                this.som32Config.navigation.id = (
                    account.type == C.ACCOUNT_TYPE_SHARED ? (
                        this.som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? 
                        C.NAVIGATION_ID_PSBTSOM32 : 
                        C.NAVIGATION_ID_SHARED
                    ) : (
                        account.currency == C.ACCOUNT_CURRENCY_ETH ?
                        C.NAVIGATION_ID_ETHSINGLE :
                        C.NAVIGATION_ID_SINGLE
                    )
                )
                this._som32ConfigService.config = this.som32Config
            })

        this.setAccountList()
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next()
        this._unsubscribeAll.complete()
    }

    public get accountName(): string {
        return this._walletService.som32.getname(this.accountAddress)
    }

    public setAccountList() {
        // Set the defaults
        if(this.selectedAddress != this._walletService.som32.address) {
            this.accounts = this._walletService.som32.getaccountall()
            this.accountAddress = this.accounts.find(a => a.type == C.ACCOUNT_TYPE_SINGLE).opened
            this.selectedAddress = this._walletService.som32.address
            this.selectedAddressName = this.accounts.find(a => a.opened == this.selectedAddress).name
            this.selectedAddressType = this.accounts.find(a => a.opened == this.selectedAddress).type
            this.formAccount.get('addresses').setValue(this.selectedAddress, {emitEvent: false})
        }
    }

    public get balance() {
        // if(C.SESSION_PATH_WALLET_PREVBAL in sessionStorage) {
        //     return Number(sessionStorage.getItem(C.SESSION_PATH_WALLET_PREVBAL))
        // } else 

        let balance = this._walletService.balance.balance

        if(this._currencBal == balance) return this._currencTransformed
        else {
            this._currencBal = balance
            this._currencTransformed = (
                this.som32Config.account.currency == C.ACCOUNT_CURRENCY_BTC ?
                this._satoshiToBitcoin.transform(balance) :
                this._weiToEther.transform(balance)
            )
            return this._currencTransformed
        }
    }
}