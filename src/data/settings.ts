import { DEFAULT_ROLES } from "./roles";
import type { RoleConfig } from "./roles";

export interface PrinterSettings {
  printerName: string;
  paperWidth: number;
  copies: number;
  autoPrint: boolean;
  receiptLogo: string;
}

export interface BrandSettings {
  logo: string;
  name: string;
  tagline: string;
  loadingImage: string;
  loadingDescription: string;
}

export interface BarcodeSettings {
  mode: "camera" | "keyboard";
  beep: boolean;
  vibrate: boolean;
  stripPrefix: string;
  stripSuffix: string;
  enterEndsScan: boolean;
}

export type PaymentMethodKind = "cash" | "card";

export interface PaymentMethodOption {
  id: string;
  label: string;
  kind: PaymentMethodKind;
  enabled: boolean;
}

export interface TaxSettings {
  enabled: boolean;
  rate: number;
  label: string;
}

export interface RoundingSettings {
  enabled: boolean;
  step: number;
}

export interface PaymentSettings {
  methods: PaymentMethodOption[];
  tax: TaxSettings;
  rounding: RoundingSettings;
}

export interface AppSettings {
  printer: PrinterSettings;
  brand: BrandSettings;
  roles: Record<string, RoleConfig>;
  barcode: BarcodeSettings;
  payments: PaymentSettings;
}

export const defaultSettings: AppSettings = {
  printer: { printerName: "Printer Thermal", paperWidth: 80, copies: 1, autoPrint: false, receiptLogo: "" },
  brand: { logo: "logo.jpg", name: "NANDS BOUTIQUE", tagline: "Point of Sale System", loadingImage: "loadingscreen.png", loadingDescription: "sabar guys loading dulu" },
  roles: DEFAULT_ROLES,
  barcode: { mode: "camera", beep: true, vibrate: false, stripPrefix: "", stripSuffix: "", enterEndsScan: true },
  payments: {
    methods: [
      { id: "cash", label: "Tunai", kind: "cash", enabled: true },
      { id: "debit", label: "Kartu Debit", kind: "card", enabled: true },
      { id: "qris", label: "QRIS", kind: "card", enabled: true },
    ],
    tax: { enabled: true, rate: 10, label: "Pajak 10%" },
    rounding: { enabled: false, step: 500 },
  },
};