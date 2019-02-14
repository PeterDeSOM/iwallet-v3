import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { ISom32AccountShared, ISom32PsbtImportForm } from '@som32/interfaces'
import { 
    Alert, AlertFileNotFound, AlertInvalidFileCode, AlertInvalidPassword, AlertInvalidPsbtImportFormat, AlertIncorrectMultiSig,
    DialogQRCodeScannerService, DialogPassphraseService 
} from '@som32/services'
import { multisigIdentical, psbtFromValid, psbtInfoFromImportForm } from '@som32/wallet.utils'

import * as FileSaver from 'file-saver'
import * as Dateformat from 'dateformat'

@Component({
    selector   : 'wallet-psbt-combine',
    templateUrl: './combine.component.html',
    styleUrls  : ['./combine.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class CombineComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _psbt: string
    private _psbtBn: string
    private _signers: number

    public formCombineTx: FormGroup
    public formPushTx: FormGroup
    public formFinished: FormGroup
    public isEditable: boolean
    public isFullSigners: boolean
    public currentSharedAccount: ISom32AccountShared
    public selectedPsbtIdx: number
    public codeButtonTooltip: string
    public codeTypeHex: boolean

    constructor(
        private _alert: Alert,
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _dialogPassphraseService: DialogPassphraseService,
        private _walletService: WalletService,
        private _formBuilder: FormBuilder,
        private _router: Router,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_MAIN_START]);
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject()
        this._satoshiToBitcoin = new SatoshiToBitcoin()
        this._signers = 0

        this.isFullSigners = false
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
        this.selectedPsbtIdx = 0
    }
    

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.formCombineTx = this._formBuilder.group({
            fakefield   : [''],
            psbts       : this._formBuilder.array([
                this._formBuilder.group({
                    psbt: ['', Validators.required]
                })
            ]),
            fileSelector: [''],
        });
        this.formPushTx = this._formBuilder.group({
            fakefield   : [''],
            code        : ['', Validators.required]
        });
        this.formFinished = this._formBuilder.group({
            fakefield   : [''],
            sent        : ['', Validators.required]
        });
        this.isEditable = true
        this.currentSharedAccount = <ISom32AccountShared>this._walletService.som32.getaccount()

        let form = JSON.parse(sessionStorage.getItem(C.SESSION_PATH_PSBT_SIGNED))
        let psbt = ''
        if(!!form) {
            this.importPsbt(form)
            psbt = form.hex
            sessionStorage.removeItem(C.SESSION_PATH_PSBT_SIGNED)
        }

        this.resetPsbts(psbt)
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get address(): string {
        return this._walletService.som32.address
    }
    
    public stepIn(stepper: MatStepper): void {
        stepper.next();
        this.isEditable = !this.isEditable

        // TODO:
    }

    public stepReset(stepper: MatStepper): void {
        this.isEditable = true;
        this.codeTypeHex = true
        this.codeButtonTooltip = 'Convert to bitcoin network compatible'
        this.resetPsbts()
        stepper.reset();
    }

    public get psbtcode(): string {
        return this.formPushTx.get('code').value
    }
    public set psbtcode(value: string) {
        this.formPushTx.get('code').setValue(value)
    }
    
    public get psbts(): FormArray {
        return this.formCombineTx.get('psbts') as FormArray
    }

    public resetPsbts(psbt?: string) {
        if(!!!psbt) {
            this._signers = 0
            this.isFullSigners = false
        }
        for(let i = this.psbts.controls.length - 1; i >= 0; i--) {
            this.psbts.removeAt(i)
        }
        for(let i = 0; i < this.currentSharedAccount.m; i++) {
            this.psbts.push(this._formBuilder.group({ psbt: [!!psbt&&i==0?psbt:'', Validators.required] }))
        }
    }

    public importPsbt(form: ISom32PsbtImportForm, inputed: boolean = false): boolean {
        if(!inputed && (!psbtFromValid(form) || form.type != C.PSBT_ACTION_NAME_SIGNED)) {
            this._alert.pop(AlertInvalidPsbtImportFormat)
            return false
        }
        if(!multisigIdentical(this.currentSharedAccount, form.multisig)) {
            this._alert.pop(AlertIncorrectMultiSig)
            return
        }

        // TODO: 
        // - validate multisig is identical with this account
        // - validate form value is valid

        // until that, assumes form value (psbt code) is valid

        // get previouslly existed psbt info to offset
        let prevform = this.psbts.controls[this.selectedPsbtIdx].get('psbt').value
        let prevsigners = 0
        if(!!prevform) {
            let d = this._walletService.decodePsbt(prevform)
            prevsigners = Object.keys(d.inputs[0].partial_signatures).length
        }

        // compare to existing psbt info to check duplicatating
        for(let i = 0; i < this.psbts.controls.length; i++) {
            if(i == this.selectedPsbtIdx) continue
            if(this.psbts.controls[i].get('psbt').value == form.hex) {
                this._alert.pop({
                    title   : 'PSBT already exists.',
                    msg     : 'A same signed PSBT already exists.',
                    desc    : '',
                    button  : ['OK']
                })
                return false
            }
        }

        // get current selected psbt info to add
        let decoded = this._walletService.decodePsbt(form.hex)
        let signers = 0
        if(!!decoded.inputs[0].partial_signatures) {
            signers = Object.keys(decoded.inputs[0].partial_signatures).length
        } else {
            this._alert.pop({
                title   : 'Invalid signed PSBT',
                msg     : 'It is not a signed PSBT.',
                desc    : '',
                button  : ['OK']
            })
            return false
        }
        if(this._signers - prevsigners + signers > this.currentSharedAccount.m) {
            this._alert.pop({
                title   : 'Mismatched signers',
                msg     : '',
                desc    : 'This Multi-Sig address needs ' + this.currentSharedAccount.m + ' signatures, but got ' + (this._signers - prevsigners + signers),
                button  : ['OK']
            })
            return false
        }

        // set result of success
        this._signers = this._signers - prevsigners + signers
        if(this._signers == this.currentSharedAccount.m) this.isFullSigners = true

        return true
    }

    public getPsbtCode(e) {
        let reader = new FileReader();

        reader.onload = () => {
            e.target.value = ''

            if(typeof(reader.result) == 'undefined') {
                this._alert.pop(AlertInvalidFileCode)
                return
            }

            let objPsbt= <ISom32PsbtImportForm>JSON.parse(Buffer.from(<string>reader.result, 'base64').toString())
            if(!this.importPsbt(objPsbt)) return
            this.psbts.controls[this.selectedPsbtIdx].get('psbt').setValue(<string>objPsbt.hex)
        }

        if(typeof e.target.files[0] === 'undefined') {
            this._alert.pop(AlertFileNotFound)
            return
        }
        reader.readAsText(e.target.files[0])
    }

    public showPsbt() {
        let code = this.psbts.controls[this.selectedPsbtIdx].get('psbt').value

        if(!code) return

        // let psbt = this._walletService.convertPsbt(code)

        // this._dialogRef = this._matDialog.open(DialogPsbtInfoComponent, {
        //     panelClass  : 'mail-compose-dialog',
        //     data        : code
        // })
    }

    public combinePsbt(stepper: MatStepper) {
        let execute: Function = (password) => {
            let psbts = this.psbts.controls.map(p => p.get('psbt').value)
            let psbt = this._walletService.combinePsbt(psbts)

            this._psbt = psbt
            this._psbtBn = Buffer.from(this._walletService.updatePsbt(psbt), 'hex').toString('base64')

            this.psbtcode = psbt
            this.stepIn(stepper)
        }

        let psbts = this.psbts.controls.map(p => p.get('psbt').value)
        let signers = []
        psbts.forEach(psbt => {
            Object.keys(this._walletService.decodePsbt(psbt).inputs[0].partial_signatures).forEach(
                k => signers.push(k)
            )
        })
        // check duplicates and removes
        let unique = Array.from(new Set(signers))
        if(signers.length != unique.length) {
            this._alert.pop({
                title   : 'Duplicated signatures',
                msg     : 'Signatures are duplicated.',
                desc    : '',
                button  : ['OK']
            })
            return
        }

        // TODO: check and combine each signer's addtional output information (ex, witness, redeem, ...)

        let title = 'Combine signed PSBTs.'
        if(C.SESSION_PATH_SALT in sessionStorage) {
            if(this._walletService.isPassphraseValid(sessionStorage.getItem(C.SESSION_PATH_SALT))) {
                this._alert.pop(
                    {
                        title   : title,
                        msg     : 'Do you want to combine these signed PSBTs?',
                        desc    : '',
                        button  : ['YES', 'NO']
                    },
                    action => { if(action == 'YES') execute(sessionStorage.getItem(C.SESSION_PATH_SALT)) }
                )
            } else this._alert.pop(AlertInvalidPassword)

        } else {
            this._dialogPassphraseService.pop(
                { 
                    title   : title,
                    msg     : '', 
                    wallet  : this._walletService.som32.export('all') 
                }, 
                (verified, password) => { if(verified) execute(password) }
            )
        }
    }

    public pushPsbt() {
        sessionStorage.setItem(C.SESSION_PATH_PSBT_COMBINED, JSON.stringify(this.dataFormed()))
        this._router.navigate([C.ROUTE_PATH_PSBT_PUSH])
    }

    public convertCode() {
        if(this.codeTypeHex) {
            this.psbtcode = this._psbtBn
            this.codeButtonTooltip = 'Convert to HEX Som32 compatible'
        } else {
            this.psbtcode = this._psbt
            this.codeButtonTooltip = 'Convert to BASE64 bitcoin network compatible'
        }
        this.codeTypeHex = !this.codeTypeHex
    }

    public copyToClipboard(o) {
        o.select();
        document.execCommand('copy');
        o.setSelectionRange(0, 0);
    }

    public export() {
        let data = this.dataFormed()
        let decoded = this._walletService.decodePsbt(data.hex)
        let psbtinfo = psbtInfoFromImportForm(data, decoded)
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: "text/json;charset=UTF-8" });
        let address = this._walletService.som32.address + '―' + psbtinfo.recipient
        let sum = psbtinfo.amount + psbtinfo.fee
        let filename = (
            address + '―' + 
            this._satoshiToBitcoin.transform(sum) + '―psbt―combined―' + 
            Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        )
        FileSaver.saveAs(blob, filename)
    }

    public dataFormed(): ISom32PsbtImportForm {
        return {
            network : this._walletService.network.name,
            version : C.APP_VERTION,
            type    : C.PSBT_ACTION_NAME_SIGNED,
            multisig: this.currentSharedAccount,
            by      : this._walletService.som32.addressr,
            hex     : this._psbt,
            base64  : this._psbtBn,
        }
    }

    public readPsbt() {
        this._dialogQRCodeScannerService.pop().subscribe(res => {
            if(typeof res != 'undefined' && typeof res.qrcode != 'undefined' && res.qrcode != '') {
                if(!!res.qrcode) {
                    // TODO:
                }
            }}
        )
    }
}
