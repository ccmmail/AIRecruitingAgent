// Type declarations for Chrome extension API
declare namespace chrome {
  export namespace runtime {
    export const id: string;
    export const lastError: {
      message: string;
    } | undefined;
    export function getManifest(): any;
  }

  export namespace tabs {
    export function query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
    }): Promise<{ url: string }[]>;
  }

  export namespace storage {
    export const local: {
      get: (key: string | string[], callback: (result: any) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
      remove: (key: string | string[], callback?: () => void) => void;
    };
  }

  export namespace identity {
    export function getRedirectURL(): string;
    export function launchWebAuthFlow(options: {
      url: string;
      interactive: boolean;
    }, callback: (responseUrl?: string) => void): void;
  }
}

