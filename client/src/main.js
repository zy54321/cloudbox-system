import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './styles/global.css';
import './styles/proto.css';

createApp(App).use(router).mount('#app');
