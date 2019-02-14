import { Pipe, PipeTransform } from '@angular/core';

const SATOSHI_RELATIVE = Math.pow(10, 8) // 10^8
const ETH_WEI_RELATIVE = Math.pow(10, 18) // 10^18
const ETH_GWEI_RELATIVE = Math.pow(10, 9) // 10^9

@Pipe({name: 'satoshiToBitcoin'})
export class SatoshiToBitcoin implements PipeTransform {
    transform(value: number): number {
        return Number((value / SATOSHI_RELATIVE).toFixed(8))
    }
}

@Pipe({name: 'bitcoinToSatoshi'})
export class BitcoinToSatoshi implements PipeTransform {
    transform(value: number): number {
        return Number((value * SATOSHI_RELATIVE).toFixed(0))
    }
}

@Pipe({name: 'weiToEther'})
export class WeiToEther implements PipeTransform {
    transform(value: number): number {
        return Number((value / ETH_WEI_RELATIVE).toFixed(18))
    }
}

@Pipe({name: 'etherToWei'})
export class EtherToWei implements PipeTransform {
    transform(value: number): number {
        return Number((value * ETH_WEI_RELATIVE).toFixed(0))
    }
}