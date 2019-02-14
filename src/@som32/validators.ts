
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

export const AmountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if(!!!control || !!!control.parent) return null

    const value: number = control.value
    const balanceavailable = !!control.parent.get('curbalance')
    const curbalance: number =  balanceavailable ? control.parent.get('curbalance').value : 0

    if(typeof value === 'undefined' || value === null) return null
    if(String(value).length == 0) return null
    if(String(value).search(/[^0-9.]+/g) >= 0) return null
    if(value == 0) return { notallowedzero: true }
    if(balanceavailable && curbalance < Number((value / 0.00000001).toFixed(0))) return { notenoughbalance: true }

    return null
}

export const PublicKeyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if(!!!control || !!!control.parent) return null

    const value: string = control.value

    if(typeof value === 'undefined' || value === null || value == 'null' || value.length == 0) return { required: true}
    if(value.length != 66) return { length: true}
    if(!['02', '03', '04'].includes(value.slice(0, 2)) || value.search(/[^a-z0-9]+/g) >= 0) return { invalid: true}
    // 04       : uncompressed
    // 02, 03   : compressed

    return null
}

export const PasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if(!!!control || !!!control.parent) return null

    const value: string = control.value

    if(typeof value === 'undefined' || value === null) return { required: true}
    if(value.length == 0) return { required: true}
    if(value.length < 8) return { minlength: true}
    if(value.length > 50) return { maxlength: true}
    if(value.search(/[0-9]+/g) == -1) return { nodigit: true}
    if(value.search(/[a-z]+/g) == -1) return { nolower: true}
    if(value.search(/[A-Z]+/g) == -1) return { noupper: true}
    if(value.search(/[!@#\$%\^\&*\)\(+=._-]+/g) == -1) return { nospecial: true}

    return null
}

export const PasswordConfirmValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {

    if(!!!control || !!!control.parent) return null

    const password = control.parent.get('password')
    const passwordConfirm = control.parent.get('passwordc')

    if(!!!password || !!!passwordConfirm ) return null
    if(passwordConfirm.value === '' ) return { required: true }
    if(password.value !== passwordConfirm.value) return { notmatched: true }

    return null
}
