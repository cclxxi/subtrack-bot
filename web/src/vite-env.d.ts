/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Signed initData captured from a real Telegram session, for browser dev. */
  readonly VITE_DEV_INIT_DATA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
