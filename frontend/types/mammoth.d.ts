declare module 'mammoth' {
  export interface MammothMessage {
    type: string;
    message: string;
  }

  export interface MammothResult {
    value: string;
    messages?: MammothMessage[];
  }

  export interface Mammoth {
    convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
    extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
}

declare module 'mammoth/mammoth.browser.js' {
  import mammoth from 'mammoth';
  export default mammoth;
}
