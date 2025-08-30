// Declare chrome namespace for TypeScript
declare namespace chrome {
  export namespace runtime {
    export const id: string;
    export const lastError: { message: string } | undefined;
  }

  export namespace identity {
    export function getRedirectURL(): string;
    export function launchWebAuthFlow(
      options: { url: string; interactive: boolean },
      callback: (responseUrl?: string) => void
    ): void;
  }

  export namespace storage {
    export interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    }
    export const local: StorageArea;
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      title?: string;
      favIconUrl?: string;
    }

    export function query(
      queryInfo: {
        active?: boolean;
        currentWindow?: boolean;
      },
      callback?: (result: Tab[]) => void
    ): Promise<Tab[]>;
  }
}

