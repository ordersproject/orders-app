import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
} from 'react-router-dom'

import Home from './pages/home/index'

// export const basicRoutes = [
//   // { exact: true, path: '/', element: './pages/home' },
//   { path: '/swap', element: './pages/swapPage' },
//   { path: '/swap/:id', element: './pages/swapPage' },
//   { path: '/pool/add', element: './pages/addLiq' },
//   { path: '/pool/:id/add', element: './pages/addLiq' },
//   { path: '/pool/remove', element: './pages/remove' },
//   { path: '/pool/:id/remove', element: './pages/remove' },
//   { path: '/pool/create', element: './pages/createPair' },
//   { path: '/pool/:id/create', element: './pages/createPair' },
//   { path: '/webwallet', element: './pages/webwallet' },
//   { path: '/farm', element: './pages/farm' },
//   { path: '/farm/:id', element: './pages/farm' },
//   { path: '/stake', element: './pages/stake' },
//   { path: '/vote', element: './pages/vote' },
// ]

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Home />}>
      {/* {basicRoutes.map((d) => {
        return <Route path={d.path} lazy={() => import(d.element)} />
      })} */}
    </Route>
  )
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <RouterProvider router={router} /> */}
    <App />
  </React.StrictMode>
)
