import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import Privacy from './components/Privacy.jsx'
import Terms from './components/Terms.jsx'
import './index.css'

const path = window.location.pathname
const isAdmin = path.startsWith('/system/hq/portal/admin/secure/99x/mak')
const isPrivacy = path === '/privacy-policy' || path === '/privacy-policy/'
const isTerms = path === '/terms-of-service' || path === '/terms-of-service/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminApp /> : 
     isPrivacy ? <Privacy /> : 
     isTerms ? <Terms /> : 
     <App />}
  </React.StrictMode>
)
