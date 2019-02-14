import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core'
import { AbstractControl, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms'
import { MatDialog, MatStepper } from '@angular/material'
import { Router } from '@angular/router'
import { MatPasswordStrengthComponent } from '@angular-material-extensions/password-strength'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { FuseConfigService } from '@fuse/services/config.service'
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { fuseAnimations } from '@fuse/animations'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { PasswordValidator, PasswordConfirmValidator, PublicKeyValidator } from '@som32/validators'
import { ISom32Extenal } from '@som32/interfaces'
import { Alert, AlertFileNotFound, AlertInvalidFileCode, AlertNotMatchedNetwork, DialogQRCodeScannerService, Som32ConfigService } from '@som32/services';
import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'
import * as Lodash from 'lodash';

@Component({
    selector        : 'create-wallet',
    templateUrl     : './create.wallet.component.html',
    styleUrls       : ['./create.wallet.component.scss'],
    encapsulation   : ViewEncapsulation.None,
    changeDetection : ChangeDetectionStrategy.OnPush,
    animations      : fuseAnimations
})
export class CreateWalletComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _mainKeypair: {
        address : string
        pubkey  : string
    }

    public address: string
    public dialogRef: any
    public formFinished: FormGroup
    public formSavingWallet: FormGroup
    public formStepDone: FormGroup
    public formTypeSecurity: FormGroup
    public isEditable: boolean
    public selectedTabIndex: number

    constructor(
        private _alert: Alert,
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _formBuilder: FormBuilder,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseConfigService: FuseConfigService,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
        public _matDialog: MatDialog
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
        this._unsubscribeAll = new Subject()
        this.isEditable = true
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.isEditable = true

        this.formTypeSecurity = this._formBuilder.group({
            formFieldResolver   : [''],
            accountName         : ['', [Validators.required, Validators.minLength(20), Validators.maxLength(70)]],
            network             : [C.NETWORK_MAINNET],
            password            : ['', PasswordValidator],
            passwordc           : ['', PasswordConfirmValidator]
        })
        this.formSavingWallet = this._formBuilder.group({
            formFieldResolver   : [''],
            formStoringResolver : ['', Validators.required],
            fileKept            : [false]
        })
        this.formFinished = this._formBuilder.group({
            formFieldResolver   : [''],
            formFinishResolver  : ['', Validators.required]
        })
        this.formTypeSecurity.get('password').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(_ => this.formTypeSecurity.get('passwordc').updateValueAndValidity())
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next()
        this._unsubscribeAll.complete()
    }

    private _createWallet() {

        // TODO: validate the entered address that came from right public key

        this._walletService.createWallet(
            this.formTypeSecurity.get('network').value,
            this.formTypeSecurity.get('accountName').value,
            this.formTypeSecurity.get('password').value,
        )
    }

    public stepReset(stepper: MatStepper): void {
        stepper.reset()
        this.ngOnInit()
    }

    public stepIn(stepper: MatStepper) {
        stepper.next()
        this.isEditable = !this.isEditable

        if(stepper.selectedIndex == 1) {
            this._createWallet()
        }
    }
    
    public checkFileKept(): void {
        let checked: boolean = this.formSavingWallet.get('fileKept').value

        if(checked) this.formSavingWallet.get('formStoringResolver').setValue('checked')
        else this.formSavingWallet.get('formStoringResolver').setValue('')
    }

    public export(): void {
        let filename = ''
        let type = <'shared' | 'single' | 'all' | 'pubkey'>'all'
        let data = this._walletService.som32.export(type)
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: 'text/json;charset=UTF-8' });
        let network = this.formTypeSecurity.get('network').value
        filename = network + '―' + Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        FileSaver.saveAs(blob, filename)
    }

    public exportToPDF(): void {
        window.print()
    }

    public openWWallet(): void {
        let wallet = this._walletService.som32.export('all')
        let som32Config = Lodash.cloneDeep(this._som32ConfigService.defaultConfig)

        som32Config.account.opened = wallet.account.opened
        som32Config.account.type = wallet.account.type
        som32Config.navigation.id = wallet.account.type == C.ACCOUNT_TYPE_SHARED ? (
            som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? C.NAVIGATION_ID_PSBTSOM32 : C.NAVIGATION_ID_SHARED
        ) : (
            wallet.account.currency == C.ACCOUNT_CURRENCY_ETH ?
            C.NAVIGATION_ID_ETHSINGLE :
            C.NAVIGATION_ID_SINGLE
        )
        this._fuseNavigationService.setCurrentNavigation(som32Config.navigation.id)
        this._som32ConfigService.config = som32Config

        sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))

        this._router.navigate([C.ROUTE_PATH_WALLET_HOME])
    }

    public readPubKey() {
        this._dialogQRCodeScannerService.pop().subscribe(res => {
            if(typeof res != 'undefined' && typeof res.qrcode != 'undefined' && res.qrcode != '') {
                if(!!res.qrcode) {
                    // TODO:
                }
            }}
        )
    }
}

