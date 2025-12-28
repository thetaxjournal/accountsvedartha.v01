
import { Branch, Client } from './types';

export const COMPANY_NAME = "Vedartha International Limited";
// The user explicitly provided this URL for invoices and receipts (White version intended for document processing)
export const COMPANY_LOGO = "https://res.cloudinary.com/dtgufvwb5/image/upload/v1765442492/White_Vedartha_Global_Consultancy_LOGO_2_re1hew.png";
// Logo used for UI elements with light/colored backgrounds (like sidebar/dashboard)
export const LOGO_DARK_BG = "https://res.cloudinary.com/dtgufvwb5/image/upload/v1765436446/Vedartha_Global_Consultancy_LOGO-removebg-preview_xt90yx.png";

export const HSN_MASTER = [
  { code: '998311', description: 'MANAGEMENT CONSULTING AND MANAGEMENT SERVICES' },
  { code: '998312', description: 'BUSINESS CONSULTING SERVICES' },
  { code: '998313', description: 'STRATEGIC MANAGEMENT SERVICES' },
  { code: '998314', description: 'FINANCIAL MANAGEMENT CONSULTING' },
  { code: '998713', description: 'IT INFRASTRUCTURE MANAGEMENT' },
  { code: '998319', description: 'OTHER MANAGEMENT CONSULTANCY' },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", 
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'B001',
    name: 'Vedartha International - Bengaluru HQ',
    address: {
      line1: '13th to 22nd Floor, Ward no.77',
      line2: 'Prestige Trade Tower, Municipal No.46, Palace Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India'
    },
    contact: '+91 80 61886000',
    email: 'info@vedartha.com',
    gstin: '29AALFD7157J1ZV',
    pan: 'AALFD7157J',
    defaultTaxRate: 18,
    invoicePrefix: 'VED-BLR-',
    nextInvoiceNumber: 2075060834,
    bankDetails: {
      bankName: 'RBL BANK LTD',
      branchName: 'Lower Parel, Mumbai',
      accountNumber: '409000032439',
      ifscCode: 'RATN0000088'
    }
  }
];

export const INITIAL_CLIENTS: Client[] = [];

export const APP_CONFIG = {
  currency: 'INR',
  currencySymbol: '₹',
  dateFormat: 'DD-MMM-YYYY',
  bankDetails: {
    bankName: 'RBL BANK LTD',
    branchName: 'Lower Parel, Mumbai',
    accountNumber: '409000032439',
    ifscCode: 'RATN0000088'
  }
};

/**
 * ULTRA UNIQUE QR SECURITY - V2
 * 1. Accepts a JSON object.
 * 2. Injects a 'salt' (random timestamp) to ensure the QR pattern looks different every single time it renders.
 * 3. Encrypts the string so no standard scanner can read it.
 */
const SECRET_KEY = "VEDARTHA_SYSTEMS_INTERNAL_KEY_V2";

export const generateSecureQR = (data: any): string => {
  // 1. Prepare Payload with Salt
  const payload = JSON.stringify({
    ...data,
    _salt: Date.now(), // Randomizer to change visual pattern
    _sec: 'VED'
  });

  // 2. Encrypt (XOR)
  const obf = payload.split('').map((c, i) => 
    String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
  ).join('');
  
  // 3. Base64 Encode
  const b64 = btoa(obf);
  
  // 4. Return without standard prefix to confuse standard readers further, 
  // or use a custom one that doesn't look like text.
  return `VDS:${b64}`;
};

export const decodeSecureQR = (scannedString: string): any | null => {
  if (!scannedString.startsWith('VDS:')) return null;
  
  try {
    // 1. Strip Prefix
    const b64 = scannedString.replace('VDS:', '');
    
    // 2. Decode Base64
    const obf = atob(b64);
    
    // 3. Reverse XOR
    const jsonStr = obf.split('').map((c, i) => 
      String.fromCharCode(c.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
    ).join('');
    
    // 4. Parse JSON
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Secure QR Decode Failed", e);
    return null;
  }
};
