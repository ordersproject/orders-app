import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import Home from './pages/Home.vue'
import * as VueRouter from 'vue-router'
import 'element-plus/theme-chalk/dark/css-vars.css'

const routes = [{ path: '/', component: Home }]
const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
})

const pinia = createPinia()

// wait until bitcoin is loaded then mount the app
const launchInterval = setInterval(() => {
  if (window.bitcoin) {
    createApp(App).use(router).use(pinia).mount('#app')
    clearInterval(launchInterval)
  }
}, 100)
