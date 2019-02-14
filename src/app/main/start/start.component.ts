import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfigService } from '@fuse/services/config.service';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { ISom32Extenal } from '@som32/interfaces'
import { 
    Alert, AlertError, AlertFileNotFound, AlertInvalidFileCode, AlerNotMatchedMultiSigWithSingle, 
    AlertInvalidWalletImportFormat,
    DialogQRCodeScannerService, DialogPassphraseService, 
    Som32ConfigService 
} from '@som32/services'
import { participantsFromWitness, walletFormValid } from '@som32/wallet.utils'
import * as Lodash from 'lodash';

@Component({
    selector   : 'app-start',
    templateUrl: './start.component.html',
    styleUrls  : ['./start.component.scss'],
    animations : fuseAnimations
})
export class StartComponent {

    /**
     * Constructor
     *
     * @param {FuseConfigService} _fuseConfigService
     */
    constructor(
        private _alert: Alert,
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _dialogPassphraseService: DialogPassphraseService,
        private _fuseConfigService: FuseConfigService,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
    ) {
        if(C.SESSION_PATH_WALLET in sessionStorage) {
            this._router.navigate([C.ROUTE_PATH_WALLET_HOME]);
        }
        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                navbar   : {
                    hidden: true
                },
                toolbar  : {
                    hidden: true
                },
                footer   : {
                    hidden: true
                },
                sidepanel: {
                    hidden: true
                }
            }
        }
    }

    private _walletFormValid(wallet: any): boolean {
        try {
            wallet = <ISom32Extenal>JSON.parse(Buffer.from(<string>wallet, 'base64').toString())
        } catch(err) {
            this._alert.pop(AlertError('Json parsing error occured.', err + '<br>It may not have the correct Wallet Import Format.'))
            return false
        }
        if( !walletFormValid(wallet) || (
                wallet.account.type == C.ACCOUNT_TYPE_SINGLE &&  (
                    typeof wallet.bip32 === 'undefined' ||
                    typeof wallet.bip39 === 'undefined' 
                )
            ) || (
                typeof wallet.account.single === 'undefined' &&
                typeof wallet.account.shared === 'undefined'
            )
        ) {
            this._alert.pop(AlertInvalidWalletImportFormat)
            return false
        }
        return true
    }

    public importWalletFile(e): void {
        let reader = new FileReader()
        
        reader.onload = () => {
            e.target.value = ''

            if(typeof(reader.result) == 'undefined') {
                this._alert.pop(AlertInvalidFileCode)
                return
            }

            this.import(reader.result)
        }

        if(typeof e.target.files[0] === 'undefined') {
            this._alert.pop(AlertFileNotFound)
            return
        }
        reader.readAsText(e.target.files[0])
    }

    public import(wallet: any, preverified: boolean = false) {

        if(!preverified) if(!this._walletFormValid(wallet)) return

        let open: Function = (wallet: ISom32Extenal) => {
            let config = Lodash.cloneDeep(this._som32ConfigService.defaultConfig)

            config.account.currency = wallet.account.currency
            config.account.opened = wallet.account.opened
            config.account.type = wallet.account.type
            if(config.account.type == C.ACCOUNT_TYPE_SHARED) {
                if(config.psbt.useof == C.APP_PSBT_USEOF_ONLINE) config.navigation.id = C.NAVIGATION_ID_PSBTSOM32
                else config.navigation.id = C.NAVIGATION_ID_SHARED
            } else {
                if(config.account.currency == C.ACCOUNT_CURRENCY_ETH) config.navigation.id = C.NAVIGATION_ID_ETHSINGLE
                else config.navigation.id = C.NAVIGATION_ID_SINGLE
            }

            sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))
            sessionStorage.setItem(C.SESSION_PATH_WALLET_ISIMPORTED, 'true')

            this._som32ConfigService.config = config
        }

        wallet = <ISom32Extenal>JSON.parse(Buffer.from(<string>wallet, 'base64').toString())
        
        if(wallet.account.type == C.ACCOUNT_TYPE_SHARED) {
            let shared = wallet.account.shared.find(s => s.address == wallet.account.opened)
            let single = wallet.account.single[0]

            if(!participantsFromWitness(Buffer.from(shared.script.witess, 'hex')).includes(single.pubkey)) {
                this._alert.pop(AlerNotMatchedMultiSigWithSingle)
                return false
            }
        }

        if(preverified) open(wallet)
        else this._dialogPassphraseService.pop({ title: '', msg: '', wallet: wallet }, _verified_ => {
            if(!_verified_) return
            open(wallet)
        })
    }

    public readWallet() {
        this._dialogQRCodeScannerService.pop().subscribe(res => {
            if(typeof res != 'undefined' && typeof res.qrcode != 'undefined' && res.qrcode != '') {
                if(!!res.qrcode) {
                    let parsed = this._parseQR(res.qrcode)
                    let som32 = Buffer.from(parsed).toString('base64')
                    if(!this._walletFormValid(som32)) return

                    let wallet = <ISom32Extenal>JSON.parse(Buffer.from(som32, 'base64').toString())
                    this._dialogPassphraseService.pop({ title: '', msg: '', wallet: wallet }, (verified, salt) => {
                        if(!verified) return
                        this._walletService.initialize(wallet.network)
                        wallet = this._walletService.som32.fromQR(wallet, salt, 'wallet')
                        this.import(Buffer.from(JSON.stringify(wallet)).toString('base64'), true)
                    })
                }
            }}
        )
    }

    private _parseQR(qr: string): string {
        let parsed = JSON.parse(qr)
        let singles: [] = parsed[2][3]
        let shareds: [] = parsed[2][4]
        let som32 = {
            version : parsed[0],
            network : parsed[1],
            account : {
                opened  : parsed[2][0],
                type    : parsed[2][1],
                payto   : parsed[2][2],
                single  : singles.map(s => {
                    return {
                        name    : s[0],
                        pubkey  : s[1],
                    }
                }),
                shared  : shareds.map(s => {
                    return {
                        name    : s[0],
                        m       : s[1],
                        n       : s[2],
                        pubkeys : s[3],
                    }
                }),
            },
            bip32   : {
                levels  : parsed[3][0],
                path    : parsed[3][1],
            },
            bip39   : {
                _entropy: parsed[4][0],
                _code   : parsed[4][1],
            }
        }
        return JSON.stringify(som32)
    }
}
