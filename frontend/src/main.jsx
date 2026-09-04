import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Globally prevent mouse wheel from changing values on any number inputs
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (e) => {
      const activeEl = document.activeElement;
      const targetEl = e.target;
      const isNumberInput = (el) => el && el.tagName === 'INPUT' && (el.type === 'number' || el.getAttribute('inputmode') === 'numeric');

      if (isNumberInput(targetEl) || isNumberInput(activeEl)) {
        if (isNumberInput(targetEl)) {
          e.preventDefault();
          targetEl.blur();
          // Forward scroll to nearest scrollable container or window
          const scrollable = targetEl.closest('.overflow-y-auto, .overflow-auto, [data-scrollable], main, form') || window;
          if (scrollable && scrollable !== window && scrollable.scrollHeight > scrollable.clientHeight) {
            scrollable.scrollTop += e.deltaY;
          } else {
            window.scrollBy({ top: e.deltaY, behavior: 'auto' });
          }
        } else if (isNumberInput(activeEl)) {
          activeEl.blur();
        }
      }
    },
    { passive: false }
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
