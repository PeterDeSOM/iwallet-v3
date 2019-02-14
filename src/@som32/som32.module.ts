import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { C } from '@som32/globals'
import { SOM32_CONFIG } from '@som32/services';

@NgModule()
export class Som32Module {

    constructor(@Optional() @SkipSelf() parentModule: Som32Module) {
        if ( parentModule )
        {
            throw new Error('Som32Module is already loaded. Import it in the AppModule only!');
        }
    }

    static forRoot(config): ModuleWithProviders {
        /*
         * re-build som32 default configuration based by SOM32_CONFIG.
         * it's not the current configuration.
         */
        // Get wallet's initial value
        if(C.SESSION_PATH_CONFIG in sessionStorage) {
            let session = JSON.parse(sessionStorage.getItem(C.SESSION_PATH_CONFIG))
            config.account.currency = session.account.currency
            config.account.opened = session.account.opened
            config.account.type = session.account.type
        }
        // Get config's changed value
        if(C.SESSION_PATH_PSBT_USEOF in sessionStorage) config.psbt.useof = sessionStorage.getItem(C.SESSION_PATH_PSBT_USEOF)
        if(config.account.type == C.ACCOUNT_TYPE_SHARED) {
            if(config.psbt.useof == C.APP_PSBT_USEOF_ONLINE) config.navigation.id = C.NAVIGATION_ID_PSBTSOM32
            else config.navigation.id = C.NAVIGATION_ID_SHARED
        } else {
            if(config.account.currency == C.ACCOUNT_CURRENCY_ETH) config.navigation.id = C.NAVIGATION_ID_ETHSINGLE
            else config.navigation.id = C.NAVIGATION_ID_SINGLE
        }

        return {
            ngModule : Som32Module,
            providers: [
                {
                    provide : SOM32_CONFIG,
                    useValue: config
                }
            ]
        }
    }
}
