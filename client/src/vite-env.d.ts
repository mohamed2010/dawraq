interface ImportMetaEnv {
  readonly VITE_FRONTEND_FORGE_API_KEY: string;
  readonly VITE_FRONTEND_FORGE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
