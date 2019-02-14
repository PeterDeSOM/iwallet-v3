import { Component, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { Result } from '@zxing/library'
import { Subject, Observable, Subscription } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { timer } from 'rxjs/observable/timer';

@Component({
    selector     : 'dialog-qrcode-scanner',
    templateUrl  : './dialog.qrcode.scanner.component.html',
    styleUrls    : ['./dialog.qrcode.scanner.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DialogQRCodeScannerComponent implements OnInit, OnDestroy {

    @ViewChild('scanner') scanner: ZXingScannerComponent;
  
    private _unsubscribeAll: Subject<any>
    private _loadingSubscription: Subscription

    public hasDevices: boolean
    public hasPermission: boolean
    public qrResult: Result
    public devices: MediaDeviceInfo[]
    public selectedDevice: MediaDeviceInfo
    public reads: string[]
    public loaded: boolean
    public formScanner: FormGroup

    /**
     * Constructor
     *
     * @param { MatDialogRef<DialogQRCodeScannerComponent> } matDialogRef
     * @param _data
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) private _data: { },
        private _formBuilder: FormBuilder,
        public matDialogRef: MatDialogRef<DialogQRCodeScannerComponent>,
    ) {
        this._unsubscribeAll = new Subject()
        this.reads = []
        this.loaded = false
    }

    ngOnInit(): void {
        this._loadingSubscription = timer(500, 500).pipe(takeUntil(timer(5000))).subscribe(_ => {})

        this.formScanner = this._formBuilder.group({
            resolver: [''],
            devices : [''],
        })
        this.formScanner.get('devices').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(value => this.onDeviceSelectChange(value))
        this.scanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
            this.hasDevices = true;
            this.devices = devices;
      
            if(!!devices && devices.length > 0) {
                let _device_ = devices.find(d => d.label.search(/back/) > 0)
                if(!!!_device_) _device_ = devices[0]
                this.formScanner.get('devices').setValue(_device_.deviceId)
            }
        })
        this.scanner.camerasNotFound.subscribe(() => this.hasDevices = false)
        this.scanner.scanComplete.subscribe((result: Result) => this.qrResult = result)
        this.scanner.permissionResponse.subscribe((perm: boolean) => this.hasPermission = perm)
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next()
        this._unsubscribeAll.complete()
    }

    public displayCameras(cameras: MediaDeviceInfo[]) {
        this.devices = cameras
    }
    
    public handleQrCodeResult(resultString: string) {
        let sufficient = 1
        for(let read of this.reads) { if(read != resultString) return }
        if(this.reads.length == sufficient - 1) this.matDialogRef.close({ qrcode: resultString })
        else this.reads.push(resultString)
    }

    public onDeviceSelectChange(value: string) {
        this.selectedDevice = this.scanner.getDeviceById(value)
        this.loaded = true
        this._loadingSubscription.unsubscribe()
    }

    public close() {
        this.matDialogRef.close({
            qrcode: '',
         })        
    }
}
