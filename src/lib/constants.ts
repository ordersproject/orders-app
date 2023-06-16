export const VERSION = '0.1.4 (beta)'
export const CHARGE_SERVICE_FEES = false

export const DUMMY_UTXO_VALUE = 600
export const ORD_UTXO_VALUE = 1000

// feeb
export const MIN_FEEB = 10
export const EXTREME_FEEB = 1

// exchange
export const SERVICE_TESTNET_ADDRESS = import.meta.env
  .VITE_SERVICE_TESTNET_ADDRESS
export const SERVICE_LIVENET_ADDRESS = import.meta.env
  .VITE_SERVICE_LIVENET_ADDRESS
