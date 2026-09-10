import { DEFAULT_ROLES } from "./roles";
import type { RoleConfig } from "./roles";

export interface PrinterSettings {
  printerName: string;
  paperWidth: number;
  copies: number;
  autoPrint: boolean;
}

export interface BrandSettings {
  logo: string;
  name: string;
  tagline: string;
}

export interface BarcodeSettings {
  mode: "camera" | "keyboard";
  beep: boolean;
  vibrate: boolean;
  stripPrefix: string;
  stripSuffix: string;
  enterEndsScan: boolean;
}

export interface AppSettings {
  printer: PrinterSettings;
  brand: BrandSettings;
  roles: Record<string, RoleConfig>;
  barcode: BarcodeSettings;
}

export const defaultSettings: AppSettings = {
  printer: { printerName: "Printer Thermal", paperWidth: 80, copies: 1, autoPrint: false },
  brand: { logo: "logo.jpg", name: "NAND'S BOUTIQUE", tagline: "Point of Sale System" },
  roles: DEFAULT_ROLES,
  barcode: { mode: "camera", beep: true, vibrate: false, stripPrefix: "", stripSuffix: "", enterEndsScan: true },
};