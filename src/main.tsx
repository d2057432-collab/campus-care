import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent unhandled rejections (e.g. Vite HMR WebSocket or transient network calls) from breaking the app
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('WebSocket') ||
      msg.includes('vite') ||
      msg.includes('hmr') ||
      msg.includes('Firestore') ||
      msg.includes('timed out') ||
      msg.includes('offline')
    ) {
      event.preventDefault();
      console.warn('[CampusCare Handled Async Warning]:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

