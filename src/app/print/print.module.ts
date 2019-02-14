import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FuseSharedModule } from '@fuse/shared.module';

import { LayoutComponent as PrintLayoutComponent } from './layout/layout.component';
import { Som32WalletComponent } from './components/som32.wallet.component';

const routes = [
    { 
        path        : 'wallet',
        component   : PrintLayoutComponent,
        children    : [
            { 
                path     : 'som32',
                component: Som32WalletComponent
            }
        ]
    }
];

@NgModule({
    declarations: [
        PrintLayoutComponent,
        Som32WalletComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        FuseSharedModule
    ],
    providers   : [
    ]
})
export class PrintModule { }
