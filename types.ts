
export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNTANT = 'Accountant',
  BRANCH_MANAGER = 'Branch Manager',
  CLIENT = 'Client',
  EMPLOYEE = 'Employee'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  allowedBranchIds: string[]; // 'ALL' or specific IDs
  displayName: string;
  clientId?: string; // Links a user to a specific client record
  employeeId?: string; // Links a user to a specific employee record
  password?: string; // Optional: stored for custom auth flow in this demo
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  swiftCode?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: Address;
  contact: string;
  email: string;
  gstin: string;
  pan: string;
  logoUrl?: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  bankDetails: BankDetails;
  portalUsername?: string; // New: Branch Portal Login
  portalPassword?: string; // New: Branch Portal Password
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  billingAddress: Address;
  shippingAddress: Address;
  gstin: string;
  branchIds: string[];
  status: 'Active' | 'Inactive';
  portalAccess?: boolean;
  portalPassword?: string; // Stored for the simulation of "Client ID" login
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  taxPercent: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  branchId: string;
  branchName: string;
  clientId: string;
  clientName: string;
  clientGstin: string;
  kindAttn: string;
  placeOfSupply: string; // New: To determine IGST vs CGST/SGST persistence
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Posted' | 'Paid' | 'Cancelled';
  archived?: boolean; // New: For Financial Year Close
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  date: string;
  method: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Online Gateway';
  reference: string;
  archived?: boolean; // New: For Financial Year Close
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Sales' | 'Purchase' | 'Receipt' | 'Payment';
  amount: number;
  description: string;
  referenceId: string;
  branchId: string;
}

export interface AppNotification {
  id: string;
  ticketNumber?: string; // Added for Ticket System
  date: string;
  branchId: string; // Used to route notification to specific branch manager
  clientId: string;
  clientName: string;
  subject: string;
  message: string;
  status: 'Open' | 'Closed' | 'Revoked'; // Simplified Workflow
  rating?: number; // 1-5 Stars
  feedback?: string; // Client feedback text
  adminResponse?: string; // New: Admin Reply
  responseDate?: string; // New: Date of reply
  archived?: boolean; // New: For Financial Year Close
}

// --- PAYROLL TYPES ---

export interface SalaryStructure {
  basic: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  pfDeduction: number; // Employee Share
  ptDeduction: number; // Professional Tax
  tdsDeduction: number;
}

export interface Employee {
  id: string; // Employee Code (e.g. 100548)
  name: string;
  designation: string;
  department: string;
  joiningDate: string;
  email: string;
  phone: string;
  pan: string;
  branchId: string;
  status: 'Active' | 'Resigned' | 'Terminated';
  bankDetails: {
    accountNumber: string;
    bankName: string;
    ifsc: string;
  };
  salary: SalaryStructure;
}

export interface PayrollRecord {
  id: string; // Run ID
  payslipNo?: string; // Unique Serial e.g. 911001/04/2025
  month: string; // e.g., "October 2023"
  year: number;
  employeeId: string;
  employeeName: string;
  branchId: string;
  designation: string;
  
  // Attendance Snapshot
  totalDays: number;
  presentDays: number;
  lopDays: number; // Loss of Pay

  // Financials
  earnings: {
    basic: number;
    hra: number;
    conveyance: number;
    specialAllowance: number;
    incentive: number; // Variable pay
    leaveEncashment: number; // New: Leave Encashment Amount
  };
  deductions: {
    pf: number;
    pt: number;
    tds: number;
    advanceSalary: number; // New: Advance Salary Deduction
    lopAmount: number;
  };
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  
  status: 'Draft' | 'Locked';
  generatedDate: string;
}

export type Module = 'Dashboard' | 'Invoices' | 'Payments' | 'Clients' | 'Branches' | 'Accounts' | 'Settings' | 'Scanner' | 'Notifications' | 'Payroll';