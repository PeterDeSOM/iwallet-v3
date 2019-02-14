import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
    MatCheckboxModule, MatDialogModule , MatFormFieldModule, MatButtonModule, MatInputModule, 
    MatIconModule    , MatToolbarModule,
    
    MatDividerModule , MatRadioModule  , MatSelectModule, MatRippleModule, MatStepperModule, 
    MatTabsModule    ,
} from '@angular/material';
import { ReactiveFormsModule } from '@angular/forms';
import { MatPasswordStrengthModule } from '@angular-material-extensions/password-strength';

import { QRCodeModule } from 'angularx-qrcode'
import { FileSelectDirective } from 'ng2-file-upload';

import { FuseSharedModule } from '@fuse/shared.module';

import { StartComponent } from './start/start.component';
import { CreateWalletComponent } from './create/create.wallet.component';


const routes = [
    {
        path     : 'start',
        component: StartComponent
    }, {
        path     : 'create',
        component: CreateWalletComponent
    }, {
        path      : '**',
        redirectTo: 'start'
    }
];

@NgModule({
    declarations: [
        StartComponent,
        CreateWalletComponent,
        FileSelectDirective
    ],
    imports     : [
        RouterModule.forChild(routes),
        MatPasswordStrengthModule.forRoot(),

        MatCheckboxModule, MatDialogModule , MatFormFieldModule, MatButtonModule, MatInputModule, 
        MatIconModule    , MatToolbarModule,

        MatDividerModule , MatRadioModule  , MatSelectModule, MatRippleModule, MatStepperModule, 
        MatTabsModule    ,
                
        ReactiveFormsModule,
        QRCodeModule,
        
        FuseSharedModule,
    ],
    exports     : [
        StartComponent,
        CreateWalletComponent,
        MatPasswordStrengthModule    
    ],
    entryComponents: [
    ]
})

export class MainModule {}
