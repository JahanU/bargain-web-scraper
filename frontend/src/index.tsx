import './polyfills';
import config from './tamagui.config';
import React from 'react';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './store/index';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TamaguiProvider } from 'tamagui';
import App from './App';

const rootElement = document.getElementById('root') as HTMLElement;
const root = createRoot(rootElement);

root.render(
  <BrowserRouter>
    <React.StrictMode>
      <Provider store={store}>
        <TamaguiProvider config={config} defaultTheme="light">
          <App />
        </TamaguiProvider>
      </Provider>
    </React.StrictMode>
  </BrowserRouter>
);

reportWebVitals();
