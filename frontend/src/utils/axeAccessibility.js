// frontend/src/utils/axeAccessibility.js
// Conditionally load axe-core for development accessibility checking

let axeInitialized = false;

export const initAxe = async () => {
  // Only load in development
  if (process.env.NODE_ENV !== 'development' || axeInitialized) {
    return;
  }

  try {
    const axe = await import('@axe-core/react');
    const React = await import('react');
    const ReactDOM = await import('react-dom');
    
    axe.default(React.default, ReactDOM.default, 1000);
    axeInitialized = true;
    console.log('axe-core accessibility checker initialized');
  } catch (error) {
    console.warn('Failed to initialize axe-core:', error);
  }
};