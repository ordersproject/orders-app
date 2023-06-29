import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as VueRouter from 'vue-router'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query'

import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import Whitelist from './pages/Whitelist.vue'
import Dev from './pages/Dev.vue'

const routes = [
  { path: '/orders/:pair?', component: Home, alias: '/' },
  { path: '/whitelist', component: Whitelist },
  { path: '/dev', component: Dev },
]
const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
})

const pinia = createPinia()

// const vueQueryPluginOptions: VueQueryPluginOptions = {
//   queryClientConfig: {
//     defaultOptions: {
//       queries: {
//         staleTime: 1000 * 10, // 10 seconds
//       },
//     },
//   },
// }

// wait until bitcoin is loaded then mount the app
const launchInterval = setInterval(() => {
  if (window.bitcoin) {
    const app = createApp(App)
    // @ts-ignore
    app.use(router).use(pinia).use(VueQueryPlugin).mount('#app')
    clearInterval(launchInterval)
  }
}, 50)
