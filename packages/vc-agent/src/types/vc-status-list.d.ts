declare module '@digitalbazaar/vc-status-list' {
  export interface StatusList {
    setStatus(index: number, status: boolean): void;
    getStatus(index: number): boolean;
    encode(): Promise<string>;
  }

  export interface CreateListOptions {
    length?: number;
  }

  export interface DecodeListOptions {
    encodedList: string;
  }

  export function createList(options?: CreateListOptions): Promise<StatusList>;
  export function decodeList(options: DecodeListOptions): Promise<StatusList>;
}
