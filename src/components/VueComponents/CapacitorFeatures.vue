<template>
  <div class="capacitor-features">
    <h3>{{ title }}</h3>
    <div class="feature-card">
      <h4>设备信息</h4>
      <button @click="getDeviceInfo" class="feature-btn">获取设备信息</button>
      <div v-if="deviceInfo" class="info-panel">
        <p><strong>平台:</strong> {{ deviceInfo.platform }}</p>
        <p><strong>操作系统:</strong> {{ deviceInfo.operatingSystem }} {{ deviceInfo.osVersion }}</p>
        <p><strong>制造商:</strong> {{ deviceInfo.manufacturer }}</p>
        <p><strong>型号:</strong> {{ deviceInfo.model }}</p>
        <p><strong>电池电量:</strong> {{ Math.round(deviceInfo.batteryLevel * 100) }}%</p>
        <p><strong>充电状态:</strong> {{ deviceInfo.isCharging ? '充电中' : '未充电' }}</p>
      </div>
    </div>

    <div class="feature-card">
      <h4>交互功能</h4>
      <div class="btn-group">
        <button @click="showToast('短消息')" class="feature-btn small">短消息提示</button>
        <button @click="showToast('这是一个较长的消息提示', 'long')" class="feature-btn small">长消息提示</button>
        <button @click="vibrateDevice('LIGHT')" class="feature-btn small">轻微振动</button>
        <button @click="vibrateDevice('MEDIUM')" class="feature-btn small">中等振动</button>
        <button @click="vibrateDevice('HEAVY')" class="feature-btn small">强烈振动</button>
      </div>
    </div>

    <div class="feature-card">
      <h4>WebView版本检测</h4>
      <div class="btn-group">
        <button @click="testEcho" class="feature-btn small">测试插件连接</button>
        <button @click="getWebViewInfo" class="feature-btn">检测WebView版本</button>
      </div>
      <div v-if="webViewInfo" class="info-panel">
        <p><strong>WebView版本:</strong> Chrome {{ webViewInfo.version }}</p>
        <p><strong>质量评级:</strong>
          <span :class="getQualityClass(webViewInfo.qualityLevel)">{{ webViewInfo.qualityLevel }}</span>
        </p>
        <p><strong>包名:</strong> {{ webViewInfo.packageName }}</p>
        <p><strong>是否为Google Chrome:</strong> {{ webViewInfo.isGoogleChrome ? '是' : '否' }}</p>
        <p><strong>支持现代特性:</strong> {{ webViewInfo.supportsModernFeatures ? '是' : '否' }}</p>
        <p><strong>需要升级:</strong>
          <span :class="webViewInfo.needsUpgrade ? 'upgrade-needed' : 'upgrade-ok'">
            {{ webViewInfo.needsUpgrade ? '是' : '否' }}
          </span>
        </p>
        <p><strong>升级建议:</strong> {{ webViewInfo.upgradeRecommendation }}</p>
      </div>
    </div>

    <div class="feature-card">
      <h4>相机功能</h4>
      <div class="btn-group">
        <button @click="takePicture('CAMERA')" class="feature-btn">拍照</button>
        <button @click="takePicture('PHOTOS')" class="feature-btn">选择照片</button>
      </div>
      <div v-if="photoPath" class="photo-container">
        <img :src="photoPath" alt="已拍照片" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { capacitorBridge } from '../../shared/services/vue/capacitor-bridge';

export default defineComponent({
  name: 'CapacitorFeatures',
  props: {
    title: {
      type: String,
      default: 'Capacitor 原生功能演示'
    }
  },
  setup() {
    const deviceInfo = ref<any>(null);
    const photoPath = ref<string | null>(null);
    const webViewInfo = ref<any>(null);

    // 获取设备信息
    const getDeviceInfo = async () => {
      try {
        deviceInfo.value = await capacitorBridge.getDeviceInfo();
      } catch (error) {
        console.error('获取设备信息失败:', error);
      }
    };

    // 测试插件连接
    const testEcho = async () => {
      try {
        console.log('🚀 测试插件连接...');
        const result = await capacitorBridge.testModernWebViewPlugin();
        console.log('✅ 插件测试成功:', result);
        await capacitorBridge.showToast(`插件连接成功: ${result.plugin} v${result.version}`, 'long');
      } catch (error) {
        console.error('❌ 插件测试失败:', error);
        await capacitorBridge.showToast(`插件连接失败: ${error.message || error}`, 'long');
      }
    };

    // 获取WebView版本信息
    const getWebViewInfo = async () => {
      try {
        console.log('🚀 开始获取WebView信息...');
        webViewInfo.value = await capacitorBridge.getWebViewInfo();
        console.log('✅ WebView信息获取成功:', webViewInfo.value);
        await capacitorBridge.showToast('WebView信息获取成功!', 'short');
      } catch (error) {
        console.error('❌ 获取WebView信息失败:', error);
        await capacitorBridge.showToast(`获取失败: ${error.message || error}`, 'long');

        // 显示错误详情
        webViewInfo.value = {
          version: 'ERROR',
          versionName: 'Failed to get info',
          packageName: 'error',
          userAgent: error.message || 'Unknown error',
          isGoogleChrome: false,
          isUpdatable: false,
          supportsModernFeatures: false,
          qualityLevel: '错误',
          needsUpgrade: true,
          strategy: 'ERROR',
          strategyDescription: '获取信息失败',
          upgradeRecommendation: `错误详情: ${error.message || error}`
        };
      }
    };

    // 显示Toast消息
    const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
      try {
        await capacitorBridge.showToast(message, duration);
      } catch (error) {
        console.error('显示Toast失败:', error);
      }
    };

    // 振动设备
    const vibrateDevice = async (style: 'HEAVY' | 'MEDIUM' | 'LIGHT') => {
      try {
        await capacitorBridge.vibrate(style);
      } catch (error) {
        console.error('振动失败:', error);
      }
    };

    // 拍照或从相册选择
    const takePicture = async (source: 'CAMERA' | 'PHOTOS') => {
      try {
        const result = await capacitorBridge.takePicture(source);
        photoPath.value = result.webPath;
      } catch (error) {
        console.error('拍照失败:', error);
      }
    };

    // 获取质量等级的CSS类
    const getQualityClass = (qualityLevel: string) => {
      switch (qualityLevel) {
        case '优秀': return 'quality-excellent';
        case '良好': return 'quality-good';
        case '一般': return 'quality-fair';
        case '需要升级': return 'quality-poor';
        default: return '';
      }
    };

    return {
      deviceInfo,
      photoPath,
      webViewInfo,
      getDeviceInfo,
      testEcho,
      getWebViewInfo,
      showToast,
      vibrateDevice,
      takePicture,
      getQualityClass
    };
  }
});
</script>

<style scoped>
.capacitor-features {
  border: 2px solid #42b983;
  border-radius: 8px;
  padding: 16px;
  margin: 0;
  background-color: #f8f8f8;
  font-family: 'Roboto', sans-serif;
  width: 100%;
  box-sizing: border-box;
  overflow: visible;
}

.feature-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  box-sizing: border-box;
}

.info-panel {
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 12px;
  margin-top: 12px;
  overflow-wrap: break-word;
  word-break: break-all;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.feature-btn {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  -webkit-tap-highlight-color: transparent; /* 移除移动端点击高亮 */
  touch-action: manipulation; /* 优化触摸行为 */
}

.feature-btn:active {
  background-color: #359268;
}

.feature-btn:hover {
  background-color: #3aa876;
}

.feature-btn.small {
  padding: 6px 12px;
  font-size: 0.9em;
}

.photo-container {
  margin-top: 16px;
  text-align: center;
}

.photo-container img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

h3, h4 {
  margin-top: 0;
  color: #2c3e50;
}

/* WebView质量等级样式 */
.quality-excellent {
  color: #27ae60;
  font-weight: bold;
}

.quality-good {
  color: #3498db;
  font-weight: bold;
}

.quality-fair {
  color: #f39c12;
  font-weight: bold;
}

.quality-poor {
  color: #e74c3c;
  font-weight: bold;
}

.upgrade-needed {
  color: #e74c3c;
  font-weight: bold;
}

.upgrade-ok {
  color: #27ae60;
  font-weight: bold;
}

/* 移动端优化 */
@media (max-width: 600px) {
  .capacitor-features {
    padding: 12px;
    border-width: 1px;
  }

  .feature-card {
    padding: 12px;
    margin-bottom: 12px;
  }

  .btn-group {
    gap: 6px;
  }

  .feature-btn {
    padding: 8px 12px;
    font-size: 0.9em;
  }

  .feature-btn.small {
    padding: 6px 10px;
    font-size: 0.8em;
  }
}
</style>