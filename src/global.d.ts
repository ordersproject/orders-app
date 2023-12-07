/// <reference types="chrome" />
type BitcoinJs = typeof import('bitcoinjs-lib')
type ECPairFactory = typeof import('ecpair')

interface Window {
  bitcoin: BitcoinJs
  ecpair: ECPairFactory
  unisat: any
  unisat: {
    inscribeTransfer: (tick: string) => Promise<string>
    signPsbt: (psbt: string) => Promise<string>
  }
  okxwallet: {
    bitcoin: {
      connect: () => Promise<{
        address: string
        publicKey: string
      }>
      signMessage: (
        message: string,
        { from }: { from: string }
      ) => Promise<string>
      send: ({
        from,
        to,
        value,
        satBytes,
      }: {
        from: string
        to: string
        value: string // in btc
        satBytes?: string
      }) => Promise<string>
      signPsbt: (psbt: string, { from }: { from: string }) => Promise<string>
      inscribe: ({
        type,
        from,
        tick,
      }: {
        type: 51
        from: string
        tick: string
      }) => Promise<string>
      sendPsbt: any
    }
  }
}
