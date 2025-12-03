import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'rgba(20, 5, 10, 0.95)',
          color: '#F3F4F6',
          border: '1px solid rgba(139, 0, 0, 0.5)',
          fontFamily: 'Cinzel, serif',
        },
        success: {
          iconTheme: { primary: '#DC143C', secondary: '#F3F4F6' },
        },
        error: {
          iconTheme: { primary: '#8B0000', secondary: '#F3F4F6' },
        },
      }}
    />
    <App />
  </React.StrictMode>,
)

