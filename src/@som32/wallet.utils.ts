import * as BitcoinLib from 'bitcoinjs-lib'
import { ISom32PsbtImportForm, ISom32PsbtDecoded, ISom32PsbtInfo, ISom32Extenal, ISom32AccountShared } from '@som32/interfaces'
import { C } from '@som32/globals'

export const participantsFromWitness = (witnesscript: Buffer): string[] => {
    let participants = []
    let d = BitcoinLib.script.decompile(witnesscript)
    d.forEach(d => { if(typeof d != 'number') participants.push(d.toString('hex')) })
    return participants
}

export const psbtFromValid = (form: ISom32PsbtImportForm): boolean => {
    return (
        typeof form.network !== 'undefined' &&
        typeof form.version !== 'undefined' &&
        typeof form.type !== 'undefined' &&
        typeof form.multisig !== 'undefined' &&
        typeof form.by !== 'undefined' &&
        typeof form.hex !== 'undefined' &&
        typeof form.base64 !== 'undefined'
    )
}

export const psbtInfoFromImportForm = (form: ISom32PsbtImportForm, decoded: ISom32PsbtDecoded): ISom32PsbtInfo => {
    let recipient = decoded.tx.vout.find(out => out.scriptPubKey.addresses[0] != form.multisig.address)
    let signers = (
        !!decoded.inputs[0].partial_signatures ?
        Object.keys(decoded.inputs[0].partial_signatures).map(k => k) :
        []
    )
    let complete = signers.length > 0 ?  signers.length == form.multisig.m : false

    return {
        type        : form.type,
        typeDesc    : form.type + (
            form.type == C.PSBT_ACTION_NAME_SIGNED ? 
            (complete ? ' (Complete)' : ' (Incomplete)') : 
            ''
        ),
        by          : form.by,
        recipient   : recipient.scriptPubKey.addresses[0],
        complete    : complete,
        amount      : recipient.value,
        fee         : decoded.fee,
        signers     : signers,
    }
}

export const multisigIdentical = (m1: ISom32AccountShared, m2: ISom32AccountShared): boolean => {
    return (
        m1.address == m2.address &&
        m1.m == m2.m &&
        m1.n == m2.n &&
        JSON.stringify(m1.pubkeys) == JSON.stringify(m2.pubkeys) &&
        JSON.stringify(m1.script) == JSON.stringify(m2.script)
    )
}

export const walletFormValid = (wallet: ISom32Extenal): boolean => {
    return (
        typeof wallet.version !== 'undefined' &&
        typeof wallet.network !== 'undefined' &&
        typeof wallet.account.opened !== 'undefined' &&
        typeof wallet.account.type !== 'undefined' &&
        typeof wallet.account.payto !== 'undefined'
    )
}

