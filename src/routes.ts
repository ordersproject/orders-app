const Home = () => import('./pages/Home.vue')
const Whitelist = () => import('./pages/Whitelist.vue')
const Changelog = () => import('./pages/Changelog.vue')
const Dev = () => import('./pages/Dev.vue')
const Pool = () => import('./pages/Pool.vue')
const Export = () => import('./pages/Export.vue')

const routes = [
  { path: '/orders/:pair?', component: Home, alias: '/' },
  { path: '/whitelist', component: Whitelist },
  { path: '/export', component: Export },
  { path: '/changelog', component: Changelog },
  { path: '/pool/:pair?', component: Pool },
  { path: '/dev', component: Dev },
]

export default routes
