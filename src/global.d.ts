/// <reference types="chrome" />
type BitcoinJs = typeof import('bitcoinjs-lib')
type ECPairFactory = typeof import('ecpair')

interface Window {
  bitcoin: BitcoinJs
  ecpair: ECPairFactory
  unisat: any
  unisat: {
    requestAccounts: () => Promise<string[]>
    inscribeTransfer: (tick: string) => Promise<string>
    signPsbt: (psbt: string) => Promise<string>
    pushPsbt: (psbt: string) => Promise<string>
    signPsbts: (psbts: string[], options: any[]) => Promise<string[]>
  }
  okxwallet: {
    on: (event: string, callback: (data: any) => void) => void
    removeListener: (event: string, callback: (data: any) => void) => void
    bitcoin: {
      connect: () => Promise<{
        address: string
        publicKey: string
      }>
      disconnect: () => Promise<void>
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
      signPsbt: (
        psbt: string,
        { from, type }: { from: string; type: any }
      ) => Promise<string>
      inscribe: ({
        type,
        from,
        tick,
      }: {
        type: 51
        from: string
        tick: string
      }) => Promise<string>
      sendPsbt: (
        txs: {
          itemId: string
          signedTx: string
          type: 52 | 22 | 59 // 22: NFT, 52: BRC20, 59: BRC20-s
        }[],
        from: string
      ) => Promise<
        Record<
          string, // unique id
          string // txid
        >[]
      >
    }
  }
}
