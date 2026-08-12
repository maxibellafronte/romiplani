import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'

inject()

// Google Analytics
const script = document.createElement('script')
script.async = true
script.src = 'https://www.googletagmanager.com/gtag/js?id=G-V4S7V452CQ'
document.head.appendChild(script)
window.dataLayer = window.dataLayer || []
function gtag(){window.dataLayer.push(arguments)}
gtag('js', new Date())
gtag('config', 'G-V4S7V452CQ')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
