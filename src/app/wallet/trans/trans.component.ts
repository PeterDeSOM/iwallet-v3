import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { SatoshiToBitcoin } from 'app/services/pipes';

@Component({
    selector   : 'wallet-trans',
    templateUrl: './trans.component.html',
    styleUrls  : ['./trans.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class TransactionComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    private _satoshiToBitcoin: SatoshiToBitcoin;

    public txItems: any;
    public txItemsIn: any;

    constructor(
        private _apiService: ApiService,
        private _router: Router,
        private _walletService: WalletService,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate(['/main/start']);
        }
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._satoshiToBitcoin = new SatoshiToBitcoin();
    }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._apiService.getTxs(this.address, this.currency).subscribe(
            _ => {
                if(this.currency == C.ACCOUNT_CURRENCY_ETH) {
                    let _txItems = this._apiService.entrusted
                    this.txItems = _txItems[0]
                    this.txItemsIn = _txItems[1]
                } else {
                    this.txItems = this._apiService.entrusted
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

    public get currency(): 'btc' | 'eth' | 'eos' {
        return this._walletService.som32.currency
    }

    public get address(): string {
        return this._walletService.som32.address;
    }
}
