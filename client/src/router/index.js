import { createRouter, createWebHistory } from 'vue-router';

const StaticHome = () => import('../pages/StaticHome.vue');
const DynamicFlow = () => import('../pages/DynamicFlow.vue');

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: StaticHome },
    { path: '/dynamic', component: DynamicFlow }
  ]
});
