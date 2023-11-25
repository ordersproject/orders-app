import { fetchGeo } from '@/queries/geo'
import { useGeoStore } from '@/store'
import { isRestrictedRegion } from './lib/helpers'

const Home = () => import('./pages/Home.vue')
const Whitelist = () => import('./pages/Whitelist.vue')
const Changelog = () => import('./pages/Changelog.vue')
const Dev = () => import('./pages/Dev.vue')
const Pool = () => import('./pages/Pool.vue')
const NoService = () => import('./pages/NoService.vue')

const routes = [
  { path: '/orders/:pair?', component: Home, alias: '/' },
  { path: '/whitelist', component: Whitelist },
  { path: '/changelog', component: Changelog },
  { path: '/pool/:pair?', component: Pool },
  { path: '/dev', component: Dev },
  { path: '/not-available', component: NoService },
]

export const geoGuard = async (to: any, from: any, next: any) => {
  if (to.path === '/not-available') next()
  else {
    const geoStore = useGeoStore()
    const geo = await fetchGeo()
    if (isRestrictedRegion(geo)) {
      geoStore.pass = true
    }

    if (isRestrictedRegion(geo) && to.path !== '/not-available')
      next('/not-available')
    else {
      next()
    }
  }
}

export default routes
