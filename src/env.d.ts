/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVICE_TESTNET_ADDRESS: string
  readonly VITE_SERVICE_LIVENET_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
