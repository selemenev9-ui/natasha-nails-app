import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from '@studio-freight/lenis';
import App from './App.jsx';
import { VKProvider } from './contexts/VKContext.jsx';
import './styles/global.css';

const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

document.getElementById('root').style.overflow = 'visible';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VKProvider>
      <App />
    </VKProvider>
  </React.StrictMode>
);
