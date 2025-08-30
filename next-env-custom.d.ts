/// <reference types="next" />

// Extend Next.js types for font handling
declare module "*.woff2" {
  const content: string;
  export default content;
}

declare module "*.woff" {
  const content: string;
  export default content;
}

// Add custom Next.js font handling
interface Window {
  __NEXT_FONT_MANIFEST?: any;
  __NEXT_ROUTER_BASEPATH?: string;
  EXTENSION_ID?: string;
  __NEXT_FONT_LOADER?: () => {
    loadFont: (options: { name?: string; weight?: number; style?: string }) => {
      className: string;
      style: {
        fontFamily: string;
        fontWeight: number;
        fontStyle: string;
      };
    };
  };
}
