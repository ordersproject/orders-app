import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as VueRouter from 'vue-router'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { VueQueryPlugin } from '@tanstack/vue-query'

import './style.css'
import routes, { geoGuard } from '@/routes'
import App from './App.vue'

import { Buffer } from 'buffer'
// @ts-ignore
globalThis.Buffer = Buffer

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
})
router.beforeEach(geoGuard)

const pinia = createPinia()

// wait until bitcoin is loaded then mount the app
const launchInterval = setInterval(() => {
  if (window.bitcoin && window.ecpair) {
    const app = createApp(App)
    // @ts-ignore
    app.use(router).use(pinia).use(VueQueryPlugin).mount('#app')
    clearInterval(launchInterval)
  }
}, 50)
