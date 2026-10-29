/// <reference types="vite/client" />

interface Window {
  xiaojingDesktop?: {
    version(): Promise<string>;
    openLibrary(): Promise<string>;
    backupLibrary(): Promise<{ canceled: boolean; path?: string }>;
    importLibrary(): Promise<{ canceled: boolean }>;
  };
}
