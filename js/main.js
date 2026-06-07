import { App } from './controls/UIController.js';

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    
    console.log('🐱 猫咪动作捕捉3D可视化系统已启动');
    console.log('快捷键:');
    console.log('  空格 - 播放/暂停');
    console.log('  ← → - 逐帧前进/后退');
    console.log('  R - 重置视图');
    console.log('  1-4 - 切换视图 (正/侧/俯/透视)');
});
