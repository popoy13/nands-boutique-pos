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

export interface AppSettings {
  printer: PrinterSettings;
  brand: BrandSettings;
}

export const defaultSettings: AppSettings = {
  printer: { printerName: "Printer Thermal", paperWidth: 80, copies: 1, autoPrint: false },
  brand: { logo: "logo.jpg", name: "NAND'S BOUTIQUE", tagline: "Point of Sale System" },
};