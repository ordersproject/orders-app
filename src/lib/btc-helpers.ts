import { useBtcJsStore } from '@/store'
import { Buffer } from 'buffer'
import * as ecc from 'tiny-secp256k1'
import ECPairFactory from 'ecpair'

export function toXOnly(pubKey: Buffer) {
  return pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)
}

class BtcHelpers {
  private btcjs: any
  private ECPair: any

  constructor() {
    this.btcjs = useBtcJsStore().get!
    this.ECPair = ECPairFactory(ecc)
  }

  public tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
    return this.btcjs.crypto.taggedHash(
      'TapTweak',
      Buffer.concat(h ? [pubKey, h] : [pubKey])
    )
  }

  public tweakSigner(signer: any, opts: any = {}): any {
    let privateKey: Uint8Array | undefined = signer.privateKey!
    if (!privateKey) {
      throw new Error('Private key is required for tweaking signer!')
    }
    if (signer.publicKey[0] === 3) {
      privateKey = ecc.privateNegate(privateKey)
    }

    const tweakedPrivateKey = ecc.privateAdd(
      privateKey,
      this.tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
    )
    if (!tweakedPrivateKey) {
      throw new Error('Invalid tweaked private key!')
    }

    return this.ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
      network: opts.network,
    })
  }
}

export default new BtcHelpers()
