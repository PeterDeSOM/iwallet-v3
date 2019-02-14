import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FuseConfigService } from '@fuse/services/config.service';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { FuseSplashScreenService } from '@fuse/services/splash-screen.service';
import { FuseTranslationLoaderService } from '@fuse/services/translation-loader.service';

import { Navigation } from 'app/navigation/navigation';
import { locale as navigationEnglish } from 'app/navigation/i18n/en';
import { locale as navigationTurkish } from 'app/navigation/i18n/tr';

import { ApiService } from '@app/services/api.service'
import { C } from '@som32/globals';
import { Som32ConfigService } from '@som32/services';
import { WalletService } from '@app/services/wallet.service'

@Component({
    selector   : 'app',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy
{
    som32Config: any;
    fuseConfig: any;
    navigation: any;

    // Private
    private _unsubscribeAll: Subject<any>;

    constructor(
        @Inject(DOCUMENT) private document: any,
        private _apiService: ApiService,
        private _fuseConfigService: FuseConfigService,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseSidebarService: FuseSidebarService,
        private _fuseSplashScreenService: FuseSplashScreenService,
        private _fuseTranslationLoaderService: FuseTranslationLoaderService,
        private _platform: Platform,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _translateService: TranslateService,
        private _walletService: WalletService,
    ) {
        // Get default navigation
        this.navigation = Navigation[this._som32ConfigService.defaultConfig.navigation.id]

        // Register the navigation to the service
        Object.keys(Navigation).forEach(k => { this._fuseNavigationService.register(k, Navigation[k]) })

        // Set the wallet configuration as our current navigation
        this._fuseNavigationService.setCurrentNavigation(this._som32ConfigService.defaultConfig.navigation.id);

        // Add languages
        this._translateService.addLangs(['en', 'tr']);

        // Set the default language
        this._translateService.setDefaultLang('en');

        // Set the navigation translations
        this._fuseTranslationLoaderService.loadTranslations(navigationEnglish, navigationTurkish);

        // Use a language
        this._translateService.use('en');

        /**
         * ----------------------------------------------------------------------------------------------------
         * ngxTranslate Fix Start
         * ----------------------------------------------------------------------------------------------------
         */

        /**
         * If you are using a language other than the default one, i.e. Turkish in this case,
         * you may encounter an issue where some of the components are not actually being
         * translated when your app first initialized.
         *
         * This is related to ngxTranslate module and below there is a temporary fix while we
         * are moving the multi language implementation over to the Angular's core language
         * service.
         **/

        // Set the default language to 'en' and then back to 'tr'.
        // '.use' cannot be used here as ngxTranslate won't switch to a language that's already
        // been selected and there is no way to force it, so we overcome the issue by switching
        // the default language back and forth.
        /**
         setTimeout(() => {
            this._translateService.setDefaultLang('en');
            this._translateService.setDefaultLang('tr');
         });
         */

        /**
         * ----------------------------------------------------------------------------------------------------
         * ngxTranslate Fix End
         * ----------------------------------------------------------------------------------------------------
         */

        // Add is-mobile class to the body if the platform is mobile
        if ( this._platform.ANDROID || this._platform.IOS ) {
            this.document.body.classList.add('is-mobile');
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Subscribe to config changes
        this._fuseConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((config) => {
            this.fuseConfig = config

            // Boxed
            if( this.fuseConfig.layout.width === 'boxed' ) {
                this.document.body.classList.add('boxed');
            } else {
                this.document.body.classList.remove('boxed');
            }

            // Color theme - Use normal for loop for IE11 compatibility
            for( let i = 0; i < this.document.body.classList.length; i++ ) {
                const className = this.document.body.classList[i]

                if ( className.startsWith('theme-') ) {
                    this.document.body.classList.remove(className);
                }
            }
            this.document.body.classList.add(this.fuseConfig.colorTheme);
        })

        this._som32ConfigService.config
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((config) => {
            let sessionConfig = JSON.parse(sessionStorage.getItem(C.SESSION_PATH_CONFIG))

            // at the point of the wallet imported. coming from the "start.component's" config chagned 
            if(C.SESSION_PATH_WALLET_ISIMPORTED in sessionStorage) {
                sessionStorage.removeItem(C.SESSION_PATH_WALLET_ISIMPORTED)

                this._walletService.initialize()
                this._fuseNavigationService.setCurrentNavigation(config.navigation.id)
                // this._getBalance()
                this._router.navigate([C.ROUTE_PATH_WALLET_HOME])
            
            // at the point of the app opened.
            } else if(!!!this.som32Config || !!!sessionConfig) {
                this.som32Config = config
                sessionStorage.setItem(C.SESSION_PATH_CONFIG, JSON.stringify(config))
                return

            // currency changed
            // address and its type changed
            } else if(
                sessionConfig.account.currency != config.account.currency ||
                sessionConfig.account.opened != config.account.opened
            ) {
                let wallet = this._walletService.som32.export('all')

                if(sessionConfig.account.opened != config.account.opened) {
                    wallet.account.opened = config.account.opened
                    wallet.account.type = config.account.type
                }

                sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))

                this._fuseNavigationService.setCurrentNavigation(config.navigation.id)
                this._walletService.som32.import(wallet)
                this._walletService.initialize()
                this._getBalance()
                this._router.navigate([C.ROUTE_PATH_WALLET_HOME])

            // PSBT useof changed
            } else if(sessionConfig.psbt.useof != config.psbt.useof) {
                if(config.psbt.useof == C.APP_PSBT_USEOF_ONLINE) {
                    this._fuseNavigationService.setCurrentNavigation(C.NAVIGATION_ID_PSBTSOM32)
                    this._router.navigate([C.ROUTE_PATH_PSBT_SOM32])
                } else {
                    this._fuseNavigationService.setCurrentNavigation(C.NAVIGATION_ID_SHARED)
                    this._router.navigate([C.ROUTE_PATH_PSBT_CREATE])
                }
                sessionStorage.setItem(C.SESSION_PATH_PSBT_USEOF, config.psbt.useof)
            }

            this.som32Config = config
            sessionStorage.setItem(C.SESSION_PATH_CONFIG, JSON.stringify(config))
        })
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle sidebar open
     *
     * @param key
     */
    toggleSidebarOpen(key): void {
        this._fuseSidebarService.getSidebar(key).toggleOpen();
    }

    private _getBalance() {
        this._apiService.getBalance(this._walletService.som32.address, <"btc" | "eth" | "eos">this._walletService.som32.currency).subscribe(
            () => {
                this._walletService.balance = this._apiService.entrusted
                sessionStorage.setItem(C.SESSION_PATH_WALLET_PREVBAL, String(this._walletService.balance.balance))
            }, err => {
                console.log(err);
            }
        )

        if(this._walletService.som32.currency == C.ACCOUNT_CURRENCY_ETH) {
        } else if(this._walletService.som32.currency == C.ACCOUNT_CURRENCY_EOS) {
        } else {
        }
    }
}
