// This file provides workarounds for font loading in Chrome extensions

// Add this to your project to fix font loading issues
if (typeof window !== 'undefined') {
  // Create a mock font loader that doesn't require external URLs
  window.__NEXT_FONT_LOADER = function() {
    return {
      loadFont: function(options) {
        // Return default font metrics to avoid errors
        return {
          className: '',
          style: {
            fontFamily: options.name || 'sans-serif',
            fontWeight: options.weight || 400,
            fontStyle: options.style || 'normal'
          }
        };
      }
    };
  };
}

export {};

