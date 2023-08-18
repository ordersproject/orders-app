import { useBtcJsStore } from '@/store'
import { Buffer } from 'buffer'
import * as ecc from 'tiny-secp256k1'
import ECPairFactory from 'ecpair'
import { type Psbt } from 'bitcoinjs-lib'

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

  public fromPubKey(pubKey: string): any {
    return this.ECPair.fromPublicKey(pubKey)
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

  public tweakPubKey(pubKey: Buffer): Buffer {
    return pubKey.slice(1, 33)
  }

  public validate(signed: Psbt, indexes?: number[], pubKey?: Buffer) {
    const validator = (
      pubkey: Buffer,
      msghash: Buffer,
      signature: Buffer
    ): boolean => this.ECPair.fromPublicKey(pubkey).verify(msghash, signature)

    if (indexes) {
      return indexes.every((index) => {
        if (pubKey) {
          return signed.validateSignaturesOfInput(index, validator, pubKey)
        }

        return signed.validateSignaturesOfInput(index, validator)
      })
    }

    return signed.validateSignaturesOfAllInputs(validator)
  }
}

export default new BtcHelpers()
