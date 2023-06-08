import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import Dev from './pages/Dev.vue'
import * as VueRouter from 'vue-router'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { VueQueryPlugin } from '@tanstack/vue-query'

const routes = [
  { path: '/', component: Home },
  { path: '/dev', component: Dev },
]
const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
})

const pinia = createPinia()

// wait until bitcoin is loaded then mount the app
const launchInterval = setInterval(() => {
  if (window.bitcoin) {
    createApp(App).use(router).use(pinia).use(VueQueryPlugin).mount('#app')
    clearInterval(launchInterval)
  }
}, 50)
