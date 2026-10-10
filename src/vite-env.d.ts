/// <reference types="vite/client" />
/// <reference types="@iwsdk/vite-plugin-dev/client" />

interface ImportMetaEnv {
  /** Optional override for the IWSDK starter stock example assets (starter content only; removed with it). */
  readonly VITE_IWSDK_EXAMPLE_ASSET_BASE_URL?: string;
}
