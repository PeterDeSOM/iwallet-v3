import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { FuseConfigService } from '@fuse/services/config.service';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { WalletService } from '@app/services/wallet.service'
import { Som32ConfigService } from '@som32/services'
import { C } from '@som32/globals';
import * as _ from 'lodash';

@Component({
    selector     : 'toolbar',
    templateUrl  : './toolbar.component.html',
    styleUrls    : ['./toolbar.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class ToolbarComponent implements OnInit, OnDestroy {

    horizontalNavbar: boolean;
    rightNavbar: boolean;
    hiddenNavbar: boolean;
    languages: any;
    navigation: any;
    selectedLanguage: any;
    userStatusOptions: any[];

    // Private
    private _unsubscribeAll: Subject<any>;

    public formCoins: FormGroup
    public coinService: {
        symbol: string[]
    }
    public formPsbtService: FormGroup
    public psbtservice: {
        type: string
        name: string
        code: string
    }[]
    public som32Config: any

    /**
     * Constructor
     *
     * @param {FuseConfigService} _fuseConfigService
     * @param {FuseSidebarService} _fuseSidebarService
     * @param {FuseNavigationService} _fuseNavigationService
     * @param {Som32ConfigService} _som32ConfigService
     * @param {TranslateService} _translateService
     * @param {Router} Router
     * @param {FormBuilder} _formBuilder
     */
    constructor(
        private _formBuilder: FormBuilder,
        private _fuseConfigService: FuseConfigService,
        private _fuseSidebarService: FuseSidebarService,
        private _fuseNavigationService: FuseNavigationService,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _translateService: TranslateService,
        private _walletService: WalletService,
    )
    {
        // Set the defaults
        this.userStatusOptions = [
            {
                'title': 'Online',
                'icon' : 'icon-checkbox-marked-circle',
                'color': '#4CAF50'
            },
            {
                'title': 'Away',
                'icon' : 'icon-clock',
                'color': '#FFC107'
            },
            {
                'title': 'Do not Disturb',
                'icon' : 'icon-minus-circle',
                'color': '#F44336'
            },
            {
                'title': 'Invisible',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#BDBDBD'
            },
            {
                'title': 'Offline',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#616161'
            }
        ];

        this.languages = [
            {
                id   : 'en',
                title: 'English',
                flag : 'us'
            },
            {
                id   : 'tr',
                title: 'Turkish',
                flag : 'tr'
            }
        ];

        this.som32Config = {
            account: {
                type: C.ACCOUNT_TYPE_SHARED
            }
        }
        this.formCoins = this._formBuilder.group({
            fakefield: [''],
            coin: [''],
        })
        this.formPsbtService = this._formBuilder.group({
            fakefield: [''],
            service: [''],
        })
        this.coinService = {
            symbol: ['btc', 'eth', 'eos'],
        }
        this.psbtservice = [
            {
                type: C.APP_PSBT_USEOF_ONLINE,
                name: 'Use convenient Som32 PSBT Service',
                code: 'Som32 PSBT Service',
            },
            {
                type: C.APP_PSBT_USEOF_OFFLINE,
                name: 'Use PSBT file or code exported in manual',
                code: 'Offline PSBT file',
            }
        ]

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.navigation = this._fuseNavigationService.getCurrentNavigation()

        // Subscribe to the config changes
        this._fuseConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((settings) => {
            this.horizontalNavbar = settings.layout.navbar.position === 'top';
            this.rightNavbar = settings.layout.navbar.position === 'right';
            this.hiddenNavbar = settings.layout.navbar.hidden === true;
        })

        // Set the selected language from default languages
        this.selectedLanguage = _.find(this.languages, {'id': this._translateService.currentLang});

        // Subscribe to the config changes
        this._som32ConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((config) => {
            this.som32Config = config

            if(config.account.currency != this.formCoins.get('coin').value) {
                this.formCoins.get('coin').setValue(config.account.currency, {emitEvent: false})
            }
            if(config.psbt.useof != this.formPsbtService.get('service').value) {
                this.formPsbtService.get('service').setValue(config.psbt.useof, {emitEvent: false})
            }
        })

        // Subscribe to the specific form value changes (layout.style)
        this.formCoins.get('coin').valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((value) => {
            this._walletService.som32.changeCurrency(value)

            this.som32Config.account.currency = value
            this.som32Config.account.opened = this._walletService.som32.address
            this.som32Config.account.type = this._walletService.som32.type
            this.som32Config.navigation.id = (
                this._walletService.som32.type == C.ACCOUNT_TYPE_SHARED ? (
                    this.som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? 
                    C.NAVIGATION_ID_PSBTSOM32 : 
                    C.NAVIGATION_ID_SHARED
                ) : (
                    value == C.ACCOUNT_CURRENCY_ETH ?
                    C.NAVIGATION_ID_ETHSINGLE :
                    C.NAVIGATION_ID_SINGLE
                )
            )

            this._som32ConfigService.config = this.som32Config
        })
            
        this.formPsbtService.get('service').valueChanges
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((value) => {
            this.som32Config.psbt.useof = value
            this._som32ConfigService.config = this.som32Config
        })
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get currentCoin(): string {
        return this.formCoins.get('coin').value
    }

    public get currentServiceCode(): string {
        return this.psbtservice.find(p => p.type == this.formPsbtService.get('service').value).code
    }

    /**
     * Toggle sidebar open
     *
     * @param key
     */
    toggleSidebarOpen(key): void
    {
        this._fuseSidebarService.getSidebar(key).toggleOpen();
    }

    public exitWallet(): void {
        sessionStorage.removeItem(C.SESSION_PATH_CONFIG);
        sessionStorage.removeItem(C.SESSION_PATH_LAYOUT_FOOTER_HIDDEN);
        sessionStorage.removeItem(C.SESSION_PATH_PSBT_USEOF);
        sessionStorage.removeItem(C.SESSION_PATH_SALT);
        sessionStorage.removeItem(C.SESSION_PATH_WALLET);
        sessionStorage.removeItem(C.SESSION_PATH_WALLET_PREVBAL);
        this._router.navigate([C.ROUTE_PATH_MAIN_START]);
    }
}
