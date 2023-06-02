/// <reference types="chrome" />
type BitcoinJs = typeof import('bitcoinjs-lib')

interface Window {
  bitcoin: BitcoinJs
  unisat: any
}
