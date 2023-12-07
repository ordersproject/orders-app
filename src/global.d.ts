/// <reference types="chrome" />
type BitcoinJs = typeof import('bitcoinjs-lib')
type ECPairFactory = typeof import('ecpair')

interface Window {
  bitcoin: BitcoinJs
  ecpair: ECPairFactory
  unisat: any
  okxwallet: any
}
