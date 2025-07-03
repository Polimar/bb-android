import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { DeviceInfo as DeviceInfoType } from '../types';

class DeviceInfoService {
  private cachedDeviceInfo: DeviceInfoType | null = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  public async getDeviceInfo(): Promise<DeviceInfoType> {
    const now = Date.now();
    
    if (this.cachedDeviceInfo && (now - this.lastUpdate) < this.CACHE_DURATION) {
      return this.cachedDeviceInfo;
    }

    const deviceInfo = await this.collectDeviceInfo();
    this.cachedDeviceInfo = deviceInfo;
    this.lastUpdate = now;
    
    return deviceInfo;
  }

  private async collectDeviceInfo(): Promise<DeviceInfoType> {
    try {
      const [
        deviceId,
        systemVersion,
        model,
        batteryLevel,
        netInfo,
      ] = await Promise.all([
        DeviceInfo.getUniqueId(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getModel(),
        DeviceInfo.getBatteryLevel(),
        NetInfo.fetch(),
      ]);

      const platform = await DeviceInfo.getSystemName();
      const networkType = netInfo.type || 'unknown';
      const connectionQuality = this.calculateConnectionQuality(netInfo);

      return {
        id: deviceId,
        platform: platform.toLowerCase() as 'ios' | 'android',
        version: systemVersion,
        model,
        batteryLevel: Math.round(batteryLevel * 100),
        networkType,
        connectionQuality,
      };
    } catch (error) {
      console.error('Error collecting device info:', error);
      
      // Return fallback device info
      return {
        id: Math.random().toString(36).substr(2, 9),
        platform: 'android' as const,
        version: 'unknown',
        model: 'unknown',
        batteryLevel: 50, // Default value
        networkType: 'unknown',
        connectionQuality: 50, // Default value
      };
    }
  }

  private calculateConnectionQuality(netInfo: any): number {
    if (!netInfo.isConnected) {
      return 0;
    }

    let quality = 50; // Base quality

    switch (netInfo.type) {
      case 'wifi':
        quality = 90;
        break;
      case 'cellular':
        // Check cellular generation
        if (netInfo.details?.cellularGeneration) {
          switch (netInfo.details.cellularGeneration) {
            case '5g':
              quality = 85;
              break;
            case '4g':
              quality = 75;
              break;
            case '3g':
              quality = 50;
              break;
            case '2g':
              quality = 25;
              break;
            default:
              quality = 60;
          }
        } else {
          quality = 60; // Unknown cellular
        }
        break;
      case 'ethernet':
        quality = 95;
        break;
      default:
        quality = 40;
    }

    // Adjust based on signal strength if available
    if (netInfo.details?.strength !== undefined) {
      const strengthMultiplier = netInfo.details.strength / 100;
      quality = Math.round(quality * strengthMultiplier);
    }

    return Math.max(0, Math.min(100, quality));
  }

  public async getBatteryLevel(): Promise<number> {
    try {
      const level = await DeviceInfo.getBatteryLevel();
      return Math.round(level * 100);
    } catch (error) {
      console.error('Error getting battery level:', error);
      return 50; // Default value
    }
  }

  public async getNetworkInfo(): Promise<{ type: string; quality: number }> {
    try {
      const netInfo = await NetInfo.fetch();
      return {
        type: netInfo.type || 'unknown',
        quality: this.calculateConnectionQuality(netInfo),
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        type: 'unknown',
        quality: 50,
      };
    }
  }

  public async getDeviceId(): Promise<string> {
    try {
      return await DeviceInfo.getUniqueId();
    } catch (error) {
      console.error('Error getting device ID:', error);
      return Math.random().toString(36).substr(2, 9);
    }
  }

  public isLowBattery(threshold: number = 20): boolean {
    return this.cachedDeviceInfo ? this.cachedDeviceInfo.batteryLevel < threshold : false;
  }

  public isGoodConnection(threshold: number = 60): boolean {
    return this.cachedDeviceInfo ? this.cachedDeviceInfo.connectionQuality >= threshold : false;
  }

  public clearCache(): void {
    this.cachedDeviceInfo = null;
    this.lastUpdate = 0;
  }
}

export default new DeviceInfoService(); 