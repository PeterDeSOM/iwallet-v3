import { NgModule } from '@angular/core'
import { HttpClientModule } from '@angular/common/http'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import {
    MatCheckboxModule, MatDialogModule , MatFormFieldModule, MatButtonModule, MatInputModule, 
    MatIconModule    , MatToolbarModule,
    
    MatRadioModule   , MatSelectModule , MatRippleModule, MatStepperModule, MatTabsModule, 
    MatTooltipModule ,
} from '@angular/material'
import { MatPasswordStrengthModule } from '@angular-material-extensions/password-strength'
import { NgxChartsModule } from '@swimlane/ngx-charts'
import { TransferHttpCacheModule } from '@nguniversal/common'
import { QRCodeModule } from 'angularx-qrcode'

import { FuseSharedModule } from '@fuse/shared.module'
import { FuseWidgetModule } from '@fuse/components/widget/widget.module'

import { WalletHeaderComponent } from '@som32/components'
import { HomeComponent } from './home/home.component'
import { TransactionComponent } from './trans/trans.component'
import { SendComponent } from './send/send.component'
import { ConvenientComponent } from './psbt/convenient.component'
import { CreateComponent } from './psbt/create.component'
import { SignComponent } from './psbt/sign.component'
import { CombineComponent } from './psbt/combine.component'
import { PushComponent } from './psbt/push.component'
import { DialogPsbtInfoComponent } from './psbt/dialog.psbt.info.component'

// TODO: move to @som32/pipe
import { SatoshiToBitcoin, WeiToEther } from 'app/services/pipes'

const routes = [
    {
        path     : 'home',
        component: HomeComponent
    },
    {
        path     : 'trans',
        component: TransactionComponent
    },
    {
        path     : 'send',
        component: SendComponent
    },
    {
        path     : 'psbt/som32',
        component: ConvenientComponent
    },
    {
        path     : 'psbt/create',
        component: CreateComponent
    },
    {
        path     : 'psbt/sign',
        component: SignComponent
    },
    {
        path     : 'psbt/combine',
        component: CombineComponent
    },
    {
        path     : 'psbt/push',
        component: PushComponent
    },
]

@NgModule({
    declarations: [
        ConvenientComponent,
        CombineComponent,
        CreateComponent,
        DialogPsbtInfoComponent,
        HomeComponent,
        PushComponent,
        SatoshiToBitcoin, WeiToEther,
        SendComponent,
        SignComponent,
        TransactionComponent,
        WalletHeaderComponent
    ],
    imports     : [
        RouterModule.forChild(routes),

        HttpClientModule,
        TransferHttpCacheModule,

        MatCheckboxModule, MatDialogModule , MatFormFieldModule, MatButtonModule, MatInputModule, 
        MatIconModule    , MatToolbarModule,

        MatRadioModule   , MatSelectModule , MatRippleModule, MatStepperModule, MatTabsModule, 
        MatTooltipModule ,
        MatPasswordStrengthModule.forRoot(),

        NgxChartsModule,
            
        ReactiveFormsModule,
        QRCodeModule,
        
        FuseSharedModule,
        FuseWidgetModule,
    ],
    exports     : [
        ConvenientComponent,
        CombineComponent,
        CreateComponent,
        HomeComponent,
        PushComponent,
        SendComponent,
        SignComponent,
        TransactionComponent,
        MatPasswordStrengthModule,
    ],
    entryComponents: [
        DialogPsbtInfoComponent,
    ],
})

export class WalletModule {}
