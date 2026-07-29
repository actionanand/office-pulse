export interface OfficePulseNativeSecurityBridge {
  isBiometricAvailable(): boolean;
  enableBiometric(secret: string): void;
  authenticateBiometric(): void;
  disableBiometric(): void;
}

declare global {
  interface Window {
    OfficePulseNative?: OfficePulseNativeSecurityBridge;
  }
}

export {};
