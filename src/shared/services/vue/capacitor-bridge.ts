import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Toast } from '@capacitor/toast';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Capacitor服务桥接层
 * 用于给Vue组件提供Capacitor原生功能
 */
class CapacitorBridge {
  /**
   * 拍照或从相册选择照片
   * @param source 图片来源（相机或相册）
   * @returns 照片信息
   */
  async takePicture(source: 'CAMERA' | 'PHOTOS' = 'CAMERA') {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: source === 'CAMERA' ? CameraSource.Camera : CameraSource.Photos,
      });
      return {
        webPath: image.webPath,
        format: image.format
      };
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  }

  /**
   * 显示Toast消息
   * @param message 要显示的消息
   * @param duration 持续时间('short'或'long')
   */
  async showToast(message: string, duration: 'short' | 'long' = 'short') {
    await Toast.show({
      text: message,
      duration: duration
    });
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo() {
    try {
      const info = await Device.getInfo();
      const battery = await Device.getBatteryInfo();
      
      return {
        model: info.model,
        platform: info.platform,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        batteryLevel: battery.batteryLevel,
        isCharging: battery.isCharging
      };
    } catch (error) {
      console.error('Device info error:', error);
      throw error;
    }
  }

  /**
   * 触发震动反馈
   * @param style 震动样式
   */
  async vibrate(style: 'HEAVY' | 'MEDIUM' | 'LIGHT' = 'MEDIUM') {
    let impactStyle: ImpactStyle;
    
    switch(style) {
      case 'HEAVY':
        impactStyle = ImpactStyle.Heavy;
        break;
      case 'LIGHT':
        impactStyle = ImpactStyle.Light;
        break;
      case 'MEDIUM':
      default:
        impactStyle = ImpactStyle.Medium;
        break;
    }
    
    await Haptics.impact({ style: impactStyle });
  }

  /**
   * 退出应用
   */
  async exitApp() {
    await App.exitApp();
  }
}

// 导出单例实例
export const capacitorBridge = new CapacitorBridge(); 