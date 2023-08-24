export const VERSION = '0.6.2 (beta)'
export const CHARGE_SERVICE_FEES = false
export const DEBUG = import.meta.env.DEV

export const DUMMY_UTXO_VALUE = 600
export const DUST_UTXO_VALUE = 546

// feeb
export const MIN_FEEB = 10
export const EXTREME_FEEB = 1
export const FEEB_MULTIPLIER = 1.3

// Sighash types
export const SIGHASH_ALL = 0x01
export const SIGHASH_SINGLE = 0x03
export const SIGHASH_ANYONECANPAY = 0x80
export const SIGHASH_SINGLE_ANYONECANPAY = 0x83

// exchange
export const SERVICE_TESTNET_ADDRESS = import.meta.env
  .VITE_SERVICE_TESTNET_ADDRESS
export const SERVICE_LIVENET_ADDRESS = import.meta.env
  .VITE_SERVICE_LIVENET_ADDRESS
