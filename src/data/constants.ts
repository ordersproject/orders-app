import changelog from './changelog'

export const VERSION = changelog[0].version
export const CHARGE_SERVICE_FEES = false
export const DEBUG = false

// all kinds of satoshis value
export const DUMMY_UTXO_VALUE = 600
export const DUST_UTXO_VALUE = 546
export const MS_BRC20_UTXO_VALUE = 1000
export const ONE_SERVICE_FEE = 10_000
export const SELL_SERVICE_FEE = 16_000
export const EXTRA_INPUT_MIN_VALUE = 600

// feeb
export const MIN_FEEB = 10
export const EXTREME_FEEB = 1
export const FEEB_MULTIPLIER = 1.3
export const MS_FEEB_MULTIPLIER = 2.2

// Sighash types
export const SIGHASH_DEFAULT = 0x00
export const SIGHASH_ALL = 0x01
export const SIGHASH_SINGLE = 0x03
export const SIGHASH_ANYONECANPAY = 0x80
export const SIGHASH_SINGLE_ANYONECANPAY = 0x83
export const SIGHASH_ALL_ANYONECANPAY = 0x81

// exchange
export const SERVICE_TESTNET_ADDRESS = import.meta.env
  .VITE_SERVICE_TESTNET_ADDRESS
export const SERVICE_LIVENET_ADDRESS = import.meta.env
  .VITE_SERVICE_LIVENET_ADDRESS
export const SERVICE_LIVENET_BID_ADDRESS = import.meta.env
  .VITE_SERVICE_LIVENET_BID_ADDRESS
export const SERVICE_LIVENET_RDEX_ADDRESS = import.meta.env
  .VITE_SERVICE_LIVENET_RDEX_ADDRESS

// BTC Liquidity Mode (1 for psbt, 2 for custody)
export const BTC_POOL_MODE: 1 | 2 = 1

export const POOL_REWARDS_TICK = 'rdex'
