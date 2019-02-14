import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WalletService } from '@app/services/wallet.service'
import { FuseConfigService } from '@fuse/services/config.service';
import { C, blobExport } from '@som32/globals';

import * as Dateformat from 'dateformat'

@Component({
    selector   : 'footer',
    templateUrl: './footer.component.html',
    styleUrls  : ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _fuseConfig: any

    /**
     * Constructor
     */
    constructor(
        private _fuseConfigService: FuseConfigService,
        private _walletService: WalletService,
    ) {
        this._unsubscribeAll = new Subject();
        this._fuseConfigService.config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config) => {
                this._fuseConfig = config
            })
    }

    ngOnInit(): void { }
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public save() {
        sessionStorage.removeItem(C.SESSION_PATH_LAYOUT_FOOTER_HIDDEN)

        this._fuseConfig.layout.footer.hidden = true
        this._fuseConfigService.config = this._fuseConfig
        this._walletService.initialize()

        let data = this._walletService.som32.export('all')
        let type = !!data.account.shared ? C.ACCOUNT_TYPE_SHARED : C.ACCOUNT_TYPE_SINGLE
        let address = (
            type == C.ACCOUNT_TYPE_SHARED ? (
                data.account.shared[0].address + (
                    data.account.shared.length > 1 ? 
                    ' (+' + (data.account.shared.length - 1) + ')' :
                    ''
                ) + ' (' + data.account.single[0].address + ')' 
            ) : data.account.single[0].address
        )
        let filename = address + '―' + (type == C.ACCOUNT_TYPE_SINGLE ? C.ACCOUNT_TYPE_SINGLE + '―' : '') + Dateformat(new Date(), 'yymmddHHMMss') + '.som32'

        blobExport(data, filename)
    }
}
