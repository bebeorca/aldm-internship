declare module 'docx-preview' {
  export interface RenderOptions {
    inWrapper?: boolean;
    ignoreWidth?: boolean;
    ignoreHeight?: boolean;
    renderHeaders?: boolean;
    renderFooters?: boolean;
    renderFootnotes?: boolean;
    breakPages?: boolean;
    ignoreFonts?: boolean;
    [key: string]: any;
  }

  export const defaultOptions: RenderOptions;

  export function parseAsync(data: ArrayBuffer | Blob | Uint8Array | string, options?: Partial<RenderOptions>): Promise<any>;

  export function renderDocument(document: any, bodyContainer: HTMLElement, styleContainer?: HTMLElement | null, options?: Partial<RenderOptions>): Promise<any>;

  export function renderAsync(data: ArrayBuffer | Blob | Uint8Array | string, bodyContainer: HTMLElement, styleContainer?: HTMLElement | null, options?: Partial<RenderOptions>): Promise<any>;

  export default {
    defaultOptions,
    parseAsync,
    renderDocument,
    renderAsync,
  };
}
// declare module 'docx-preview' {
//   export function renderAsync(
//     content: ArrayBuffer,
//     element: HTMLElement,
//     data?: any,
//     options?: Record<string, any>
//   ): Promise<void>;
// }
