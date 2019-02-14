import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTabGroup, MatTabHeader, MatTab } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FuseConfigService } from '@fuse/services/config.service';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { SatoshiToBitcoin, WeiToEther } from '@app/services/pipes'
import { WalletService } from '@app/services/wallet.service'
import { C, toHex } from '@som32/globals'
import { 
    Alert, AlertInvalidFileCode, AlertFileNotFound, AlertInvalidPassword, AlertNotMatchedNetwork, AlerNotMatchedMultiSigWithSingle, DialogPassphraseService, Som32ConfigService 
} from '@som32/services';
import { ISom32Extenal, ISom32AccountShared, ISom32AccountSingle, ISom32Balance } from '@som32/interfaces'
import { multisigIdentical, participantsFromWitness, walletFormValid } from '@som32/wallet.utils'

import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'

@Component({
    selector        : 'wallet-home',
    templateUrl     : './home.component.html',
    styleUrls       : ['./home.component.scss'],
    encapsulation   : ViewEncapsulation.None,
    animations      : fuseAnimations,
})
export class HomeComponent implements OnInit, OnDestroy {

    @ViewChild('tabgroup') tabgroup: MatTabGroup;

    private _currencBal: ISom32Balance
    private _currencTransformed: ISom32Balance
    private _fuseConfig: any
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _weiToEther: WeiToEther
    private _unsubscribeAll: Subject<any>

    public accountInfo: {
        mnemonic: string
        seed: string
        extmkey: string
        extMkey: string
        extkey: string
        extkeypath: string
        extkeylevel: string
    }
    public balancePie: any
    public balancePieData: any
    public importType: 'single' | 'shared'
    public isShared: boolean
    public som32Config: any
    public toHex: Function

    constructor(
        private _alert: Alert,
        private _apiService: ApiService,
        private _dialogPassphraseService: DialogPassphraseService,
        private _fuseConfigService: FuseConfigService,
        private _fuseNavigationService: FuseNavigationService,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_MAIN_START]);
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._satoshiToBitcoin = new SatoshiToBitcoin()
        this._weiToEther = new WeiToEther()
        this._balancePieData = [50, 50, 0, 0];

        this.balancePie = {
            currentRange : 'portion',
            legend       : false,
            explodeSlices: false,
            labels       : true,
            doughnut     : true,
            gradient     : false,
            scheme       : {
                domain: ['#03a9f4', '#e91e63']
            },
            onSelect     : (ev) => {
                console.log(ev);
            }
        }
        this.accountInfo = {
            mnemonic    : '',
            seed        : '',
            extmkey     : '',
            extMkey     : '',
            extkey      : '',
            extkeypath  : '',
            extkeylevel : '',
        }
        this.isShared = false
        this.toHex = toHex

        // Subscribe to the config changes
        this._som32ConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((config) => {
            if(!!this.som32Config) setTimeout(() => { this.ngOnInit() }, 1200)
            this.som32Config = config
        })
        // Subscribe to the config changes
        this._fuseConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((config) => {
            this._fuseConfig = config
        })

        this._apiService.getBalance(this.address, this._walletService.som32.currency).subscribe(
            _ => {
                this._walletService.balance = this._apiService.entrusted
                this._setBalancePie()
            }, err => {
                console.log(err);
            }
        )
    }
    

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._setBalancePie()
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

    private set _balancePieData(values: number[]) {
        this.balancePieData = {
            mainChart  : {
                portion: [
                    {
                        name : 'Received',
                        value: values[0]
                    },
                    {
                        name : 'Sent',
                        value: values[1]
                    }
                ]
            },
            footerLeft : {
                title: 'Received',
                value: values[2]
            },
            footerRight: {
                title: 'Sent',
                value: values[3]
            }
        }
    }

    private _setBalancePie() {
        this._balancePieData = [
            parseFloat((this.balance.total_received / this.balance.balance * 100).toFixed(2)),
            parseFloat((this.balance.total_sent / this.balance.balance * 100).toFixed(2)),
            this.balance.total_received,
            this.balance.total_sent,
        ]
    }

    private async _interceptTabChange(tab: MatTab, tabHeader: MatTabHeader, idx: number) {
        if(idx > 0) {
            let salt = ''

            if(C.SESSION_PATH_SALT in sessionStorage) {
                if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                    salt = sessionStorage.getItem(C.SESSION_PATH_SALT)
                    this.tabgroup.selectedIndex = idx
                } else {
                    this._alert.popn(AlertInvalidPassword)
                    return
                }
            } else {
                let result = await this._dialogPassphraseService.popn({ 
                    title   : 'Password Verification',
                    msg     : '', 
                    wallet  : this._walletService.som32.export('all') 
                }).toPromise()
                if(typeof result != 'undefined' && result.message == 'Confirmed' && result.data.verified === true) {
                    salt = result.data.password
                    this.tabgroup.selectedIndex = idx
                } else return
            }

            let wallet = this._walletService.som32.export('all')
            this.accountInfo = {
                mnemonic    : this._walletService.som32.mnemonic(salt),
                seed        : this._walletService.som32.seed(salt),
                extmkey     : this._walletService.som32.primitivekey(salt).toBase58(),
                extMkey     : this._walletService.som32.primitivekey(salt).neutered().toBase58(),
                extkey      : this._walletService.som32.m(salt).toBase58(),
                extkeypath  : wallet.bip32.path,
                extkeylevel : wallet.bip32.levels,
            }
        } else {
            this.accountInfo = {
                mnemonic    : '',
                seed        : '',
                extmkey     : '',
                extMkey     : '',
                extkey      : '',
                extkeypath  : '',
                extkeylevel : '',
            }
            this.tabgroup.selectedIndex = idx
        }
        
        return

        // return MatTabGroup.prototype._handleClick.apply(this.tabgroup, arguments)
    }

    public get address(): string {
        return this._walletService.som32.address
    }

    public get balance(): ISom32Balance {
        let transform = (balance: ISom32Balance) => {
            if(this.som32Config.account.currency == C.ACCOUNT_CURRENCY_BTC) {
                this._currencTransformed = {
                    total_received      : this._satoshiToBitcoin.transform(balance.total_received),
                    total_sent          : this._satoshiToBitcoin.transform(balance.total_sent),
                    balance             : this._satoshiToBitcoin.transform(balance.balance),
                    n_tx                : balance.n_tx,
                    unconfirmed_balance : this._satoshiToBitcoin.transform(balance.unconfirmed_balance),
                    unconfirmed_n_tx    : balance.unconfirmed_n_tx,
                    final_balance       : this._satoshiToBitcoin.transform(balance.final_balance),
                    final_n_tx          : balance.final_n_tx,
                }
            } else if(this.som32Config.account.currency == C.ACCOUNT_CURRENCY_ETH) {
                this._currencTransformed = {
                    total_received      : this._weiToEther.transform(balance.total_received),
                    total_sent          : this._weiToEther.transform(balance.total_sent),
                    balance             : this._weiToEther.transform(balance.balance),
                    n_tx                : balance.n_tx,
                    unconfirmed_balance : this._weiToEther.transform(balance.unconfirmed_balance),
                    unconfirmed_n_tx    : balance.unconfirmed_n_tx,
                    final_balance       : this._weiToEther.transform(balance.final_balance),
                    final_n_tx          : balance.final_n_tx,
                }
            }
        }

        let balance = this._walletService.balance

        if(!!!this._currencBal || this._currencBal.balance != balance.balance) {
            this._currencBal = balance
            transform(this._walletService.balance)
            return this._currencTransformed

        } else return this._currencTransformed
    }

    public get publicKey(): string {
        return this._walletService.som32.publickey
    }

    public get wif(): string {
        return this._walletService.som32.wif
    }

    public get shareds(): ISom32AccountShared[] {
        return this._walletService.som32.getshared()
    }

    public get singles(): ISom32AccountSingle[] {
        return this._walletService.som32.getsingle()
    }

    public forQR(type: 'wallet' | 'single' | 'shared' | 'pubkey', address?: string): string {
        return this._walletService.som32.forQR(type, address)
    }

    public export(type: 'pubkey' | 'single' | 'shared' | 'all') {
        let filename = ''
        let data = this._walletService.som32.export(type)
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: "text/json;charset=UTF-8" })
        let address = type == 'all' ? this.address + ' (' + this._walletService.som32.addressr + ')' : this.address
        filename = address + '―' + (type == 'all' ? '' : type + '―') + Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        FileSaver.saveAs(blob, filename)
    }

    public import(event) {
        let reader = new FileReader();

        reader.onload = () => {
            event.target.value = ''

            if(typeof(reader.result) == 'undefined') {
                this._alert.pop(AlertInvalidFileCode)
                return
            }
    
            // TODO: eliminate new line and etc, not JSON compatible, characters
            // JSON.parse((<string>reader.result).replace(/\n/g, "\\n"))

            let wallet = <ISom32Extenal>JSON.parse(Buffer.from(<string>reader.result, 'base64').toString())
            if(this.importType == C.ACCOUNT_TYPE_SHARED) {
                if( !walletFormValid(wallet) || 
                    typeof wallet.account.shared === 'undefined' || 
                    !!wallet.bip32 || 
                    !!wallet.bip39 || 
                    !!wallet.account.single
                ) {
                    this._alert.pop({
                        title   : 'Invalid MultiSig Import Format.',
                        msg     : 'Invalid MultiSig Import Format.',
                        desc    : 'Imported file does not have valid MultiSig Import Format. You may need to recreate a file with valid MultiSig Import Format.',
                        button  : ['OK']
                    })
                    return
                }

                let shared = wallet.account.shared.find(s => s.address == wallet.account.opened)
                let single = this._walletService.som32.getsingle()[0]

                if(!participantsFromWitness(Buffer.from(shared.script.witess, 'hex')).includes(single.pubkey)) {
                    this._alert.pop(AlerNotMatchedMultiSigWithSingle)
                    return
                }

                let som32shared = this._walletService.som32.getshared()
                if(!!som32shared) {
                    let existed = false
                    som32shared.forEach(s => { if(multisigIdentical(shared, s)) existed = true })
                    if(existed) {
                        this._alert.pop({
                            title   : 'MultiSig exists.',
                            msg     : 'Imported or selected MultiSig already exists in this Wallet.',
                            desc    : '',
                            button  : ['OK']
                        })
                        return
                    }
                }
            } else if(this.importType == C.ACCOUNT_TYPE_SINGLE) {
                if( !walletFormValid(wallet) || 
                    typeof wallet.bip32 === 'undefined' || 
                    typeof wallet.bip39 === 'undefined' || 
                    typeof wallet.account.single === 'undefined' ||
                    !!wallet.account.shared
                ) {
                    this._alert.pop({
                        title   : 'Invalid Single Import Format.',
                        msg     : 'Invalid Single Import Format.',
                        desc    : 'Imported file does not have valid Single Import Format. You may need to recreate a file with valid Single Import Format.',
                        button  : ['OK']
                    })
                    return
                }
            }
            if(wallet.network != this._walletService.network.name) {
                this._alert.pop(AlertNotMatchedNetwork)
                return
            }

            wallet = this._walletService.som32.add(wallet)

            this._fuseConfig.layout.footer.hidden = false
            this._fuseConfigService.config = this._fuseConfig

            // update datebase
            sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))
            sessionStorage.setItem(C.SESSION_PATH_LAYOUT_FOOTER_HIDDEN, 'false')

            this.som32Config.account.opened = wallet.account.opened
            this.som32Config.account.type = wallet.account.type
            this.som32Config.navigation.id = wallet.account.type == C.ACCOUNT_TYPE_SHARED ? (
                this.som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? C.NAVIGATION_ID_PSBTSOM32 : C.NAVIGATION_ID_SHARED
            ) : (
                wallet.account.currency == C.ACCOUNT_CURRENCY_ETH ?
                C.NAVIGATION_ID_ETHSINGLE :
                C.NAVIGATION_ID_SINGLE
            )
            this._fuseNavigationService.setCurrentNavigation(this.som32Config.navigation.id)
            this._som32ConfigService.config = this.som32Config
            this.ngOnInit()
        }
        if(typeof event.target.files[0] === 'undefined') {
            this._alert.pop(AlertFileNotFound)
            return
        }
        reader.readAsText(event.target.files[0]);
    }
}
