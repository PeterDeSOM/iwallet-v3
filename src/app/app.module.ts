import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { 
    MatCheckboxModule, MatDialogModule  , MatFormFieldModule    , MatButtonModule         , MatInputModule   , 
    MatIconRegistry  , MatIconModule    , MatProgressBarModule  , MatProgressSpinnerModule, MatSelectModule  ,
    MatToolbarModule ,
} from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser'

import { TranslateModule } from '@ngx-translate/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner'

import { fuseConfig } from '@app/fuse-config';
import { som32Config } from '@app/som32-config';
import { AppComponent } from '@app/app.component';
import { LayoutModule } from '@app/layout/layout.module';
import { WalletService } from '@app/services/wallet.service';

import { FuseModule } from '@fuse/fuse.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { FuseProgressBarModule, FuseSidebarModule, FuseThemeOptionsModule } from '@fuse/components';

import { Alert, DialogPassphraseService } from '@som32/services';
import { DialogAlertComponent, DialogPassphraseComponent, DialogQRCodeScannerComponent } from '@som32/components'
import { Som32Module } from '@som32/som32.module';
import { CopyClipboardModule } from '@som32/copy-clipboard.module'
import { C } from '@som32/globals';


import 'hammerjs';

const routes: Routes = [
    {
        path        : 'wallet',
        loadChildren: './wallet/wallet.module#WalletModule'
    }, {
        path        : 'wallet',
        loadChildren: './wallet/wallet.module#WalletModule'
    }, {
        path        : 'main',
        loadChildren: './main/main.module#MainModule'
    }, {
        path        : 'print',
        loadChildren: './print/print.module#PrintModule'
    }, {
        path      : '**',
        redirectTo: C.ROUTE_PATH_MAIN_START.slice(1)
    }
];
    
@NgModule({
    declarations: [
        AppComponent,
        DialogAlertComponent,
        DialogPassphraseComponent,
        DialogQRCodeScannerComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,
        RouterModule.forRoot(routes),

        TranslateModule.forRoot(),

        // Material moment date module
        MatMomentDateModule,

        // Material
        MatCheckboxModule, MatDialogModule      , MatFormFieldModule      , MatButtonModule, MatInputModule   , 
        MatIconModule    , MatProgressBarModule , MatProgressSpinnerModule, MatSelectModule, MatToolbarModule ,
            
        // Som32 modules
        CopyClipboardModule,
        Som32Module.forRoot(som32Config),

        // Fuse modules
        FuseModule.forRoot(fuseConfig),
        FuseProgressBarModule,
        FuseSharedModule,
        FuseSidebarModule,
        FuseThemeOptionsModule,

        // App modules
        LayoutModule,

        ZXingScannerModule,
    ],
    bootstrap: [
        AppComponent
    ],
    providers   : [
        Alert,
        DialogPassphraseService,
        WalletService,
    ],
    entryComponents: [
        DialogAlertComponent,
        DialogPassphraseComponent,
        DialogQRCodeScannerComponent,
    ],
})
export class AppModule {
    constructor(
        private matIconRegistry: MatIconRegistry,
        private domSanitizer: DomSanitizer,
    ){
        this.matIconRegistry.addSvgIcon('qrcode-scan', this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/svgs/qrcode-scan.svg'))
        // this.matIconRegistry.addSvgIconSet(this.domSanitizer.bypassSecurityTrustResourceUrl('./assets/svgs/qrcode.svg'))
    }
}
