import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './components/Helpers/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>  
    {/* default in the flutter */}
    <BrowserRouter>
    {/* added to help with navigating */}
      <AuthProvider>
        {/* ensure routes are protected */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
