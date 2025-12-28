import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, User, Lock, FileText, Download, Printer, Settings, Shield, Building2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Employee, PayrollRecord, Branch } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, generateSecureQR, LOGO_DARK_BG } from '../constants';

// Helper for number to words (reused)
const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    return '';
  };

  let str = '';
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crores > 0) str += convert(crores) + ' crore ';
  if (lakhs > 0) str += convert(lakhs) + ' lakh ';
  if (thousands > 0) str += convert(thousands) + ' thousand ';
  if (remaining > 0) str += (str !== '' ? '' : '') + convert(remaining);

  return 'Rupees ' + str.trim() + ' only';
};

interface EmployeePortalProps {
  employee: Employee | undefined;
  payrollRecords: PayrollRecord[];
  branches: Branch[];
  onLogout: () => void;
  onUpdateCredentials: (id: string, pass: string) => Promise<void>;
  onLinkGoogle: () => Promise<void>;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ 
  employee, payrollRecords, branches, onLogout, onUpdateCredentials, onLinkGoogle 
}) => {
  const [activeTab, setActiveTab] = useState<'payslips' | 'profile' | 'settings'>('payslips');
  const [viewingSlip, setViewingSlip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Settings State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const branch = branches.find(b => b.id === employee?.branchId) || branches[0];

  const handleUpdatePass = async () => {
      if(!employee) return;
      if(newPassword !== confirmPassword) return alert("Passwords do not match");
      if(newPassword.length < 6) return alert("Password too short");
      await onUpdateCredentials(employee.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
  };

  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
      const isSettlement = record.type === 'Settlement';
      
      const qrValue = generateSecureQR({
          type: 'PAYSLIP',
          id: record.id,
          empId: record.employeeId,
          netPay: record.netPay,
          month: record.month,
          year: record.year
      });

      return (
        <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div className="flex items-center space-x-4">
                    <img src={COMPANY_LOGO} alt="Logo" className="h-12 object-contain" />
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-tight">{COMPANY_NAME}</h1>
                        <p className="text-[10px]">{branch?.address.line1}, {branch?.address.city}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-bold uppercase">{isSettlement ? 'Final Settlement' : 'Payslip'}</h2>
                    <p className="text-[11px] font-bold">{record.month} {record.year}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-[11px]">
                <div className="space-y-1">
                    <div className="flex"><span className="w-24 font-bold">Employee ID</span><span>: {record.employeeId}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Name</span><span>: {record.employeeName}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Designation</span><span>: {record.designation}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Date of Joining</span><span>: {employee?.joiningDate}</span></div>
                </div>
                <div className="space-y-1">
                    <div className="flex"><span className="w-24 font-bold">Bank Name</span><span>: {employee?.bankDetails.bankName}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Account No.</span><span>: {employee?.bankDetails.accountNumber}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Paid Days</span><span>: {record.presentDays} / {record.totalDays}</span></div>
                    <div className="flex"><span className="w-24 font-bold">LOP Days</span><span>: {record.lopDays}</span></div>
                </div>
            </div>

            <div className="border border-black mb-8">
                <div className="grid grid-cols-2 border-b border-black bg-gray-100 font-bold text-[11px] uppercase">
                    <div className="p-2 border-r border-black">Earnings</div>
                    <div className="p-2">Deductions</div>
                </div>
                <div className="grid grid-cols-2 text-[11px]">
                    <div className="border-r border-black">
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>Basic Salary</span><span>{record.earnings.basic.toFixed(2)}</span></div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>HRA</span><span>{record.earnings.hra.toFixed(2)}</span></div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>Conveyance</span><span>{record.earnings.conveyance.toFixed(2)}</span></div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>Special Allowance</span><span>{record.earnings.specialAllowance.toFixed(2)}</span></div>
                        {record.earnings.incentive > 0 && <div className="flex justify-between p-2 border-b border-gray-200"><span>Incentive</span><span>{record.earnings.incentive.toFixed(2)}</span></div>}
                        {isSettlement && record.earnings.leaveEncashment > 0 && <div className="flex justify-between p-2 border-b border-gray-200"><span>Leave Encashment</span><span>{record.earnings.leaveEncashment.toFixed(2)}</span></div>}
                    </div>
                    <div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>Provident Fund</span><span>{record.deductions.pf.toFixed(2)}</span></div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>Professional Tax</span><span>{record.deductions.pt.toFixed(2)}</span></div>
                        <div className="flex justify-between p-2 border-b border-gray-200"><span>TDS / Income Tax</span><span>{record.deductions.tds.toFixed(2)}</span></div>
                        {record.deductions.advanceSalary > 0 && <div className="flex justify-between p-2 border-b border-gray-200"><span>Salary Advance</span><span>{record.deductions.advanceSalary.toFixed(2)}</span></div>}
                        {record.deductions.lopAmount > 0 && <div className="flex justify-between p-2 border-b border-gray-200"><span>Loss of Pay</span><span>{record.deductions.lopAmount.toFixed(2)}</span></div>}
                    </div>
                </div>
                <div className="grid grid-cols-2 border-t border-black font-bold text-[11px] bg-gray-50">
                    <div className="p-2 border-r border-black flex justify-between"><span>Total Earnings</span><span>{record.grossPay.toFixed(2)}</span></div>
                    <div className="p-2 flex justify-between"><span>Total Deductions</span><span>{record.totalDeductions.toFixed(2)}</span></div>
                </div>
            </div>

            <div className="mb-8 p-4 border-2 border-black bg-gray-50 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Net Salary Payable</p>
                    <p className="text-[11px] font-bold mt-1 capitalize">{numberToWords(Math.round(record.netPay))}</p>
                </div>
                <div className="text-2xl font-black">
                    ₹ {record.netPay.toFixed(2)}
                </div>
            </div>

            <div className="mt-auto">
                 {/* Footer Notes */}
                <div className="mt-6 border border-black p-3 text-[10px]">
                    <p className="font-bold mb-1">Note:</p>
                    <p className="mb-1">1. This is a system generated report. This does not require any signature.</p>
                    {isSettlement ? (
                        <p>2. This document confirms the full and final settlement of all dues between the employee and {COMPANY_NAME}. No further claims shall be entertained.</p>
                    ) : (
                        <p>2. Private and Confidential Disclaimer: This payslip has been generated by the {COMPANY_NAME} payroll service provider. All compensation information has been treated as confidential.</p>
                    )}
                </div>

                {/* QR Code at Bottom */}
                <div className="mt-6 flex flex-col items-start">
                    <QRCode value={qrValue} size={120} level="M" />
                    <p className="text-[9px] font-bold mt-1 text-gray-500 uppercase tracking-widest">Scan to Verify</p>
                </div>
            </div>
        </div>
      );
  };

  const handlePrint = (record: PayrollRecord) => {
      setViewingSlip(record);
      setIsPrinting(true);
      setTimeout(() => {
          window.print();
          setIsPrinting(false);
          setViewingSlip(null);
      }, 500);
  };

  if (!employee) return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-[#f3f4f7] font-sans">
        {isPrinting && viewingSlip && createPortal(<PayslipDocument record={viewingSlip} />, document.getElementById('print-portal')!)}

        {/* Header */}
        <header className="bg-[#1c2d3d] text-white py-4 px-4 md:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <img src={LOGO_DARK_BG} alt="Logo" className="h-10 md:h-14 object-contain" />
                    <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>
                    <div>
                        <h1 className="text-sm md:text-lg font-bold tracking-tight">Employee Self Service</h1>
                        <p className="text-[10px] text-gray-400 font-medium hidden md:block">{employee.name} • {employee.designation}</p>
                    </div>
                </div>
                <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
                    <LogOut size={14} className="mr-2" /> Sign Out
                </button>
            </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                 {/* Sidebar Nav */}
                 <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col space-y-2">
                     <button onClick={() => setActiveTab('payslips')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center ${activeTab === 'payslips' ? 'bg-[#0854a0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                         <FileText size={16} className="mr-3" /> Payslips
                     </button>
                     <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center ${activeTab === 'profile' ? 'bg-[#0854a0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                         <User size={16} className="mr-3" /> My Profile
                     </button>
                     <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center ${activeTab === 'settings' ? 'bg-[#0854a0] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                         <Settings size={16} className="mr-3" /> Account Settings
                     </button>
                 </div>

                 {/* Content */}
                 <div className="flex-1 p-8">
                     {activeTab === 'payslips' && (
                         <div className="space-y-6">
                             <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Salary History</h2>
                             {payrollRecords.length === 0 ? (
                                 <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</div>
                             ) : (
                                 <div className="grid gap-4">
                                     {payrollRecords.map(rec => (
                                         <div key={rec.id} className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-md transition-all flex justify-between items-center group">
                                             <div>
                                                 <h4 className="font-bold text-gray-900 text-sm">{rec.month} {rec.year}</h4>
                                                 <p className="text-[10px] text-gray-500 mt-1">Processed: {new Date(rec.generatedDate).toLocaleDateString()}</p>
                                             </div>
                                             <div className="text-right flex items-center space-x-6">
                                                 <span className="font-black text-emerald-600 text-lg">₹ {rec.netPay.toLocaleString()}</span>
                                                 <button onClick={() => handlePrint(rec)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                                     <Download size={20} />
                                                 </button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     )}

                     {activeTab === 'profile' && (
                         <div className="space-y-8">
                             <div className="flex items-center space-x-6">
                                 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-[#0854a0] text-2xl font-black">
                                     {employee.name.substring(0,2).toUpperCase()}
                                 </div>
                                 <div>
                                     <h2 className="text-2xl font-black text-gray-900">{employee.name}</h2>
                                     <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{employee.designation}</p>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-8 bg-gray-50 p-8 rounded-2xl border border-gray-100">
                                 <div className="space-y-4">
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Employee ID</label><p className="font-bold text-gray-800">{employee.id}</p></div>
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Department</label><p className="font-bold text-gray-800">{employee.department}</p></div>
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Branch</label><p className="font-bold text-gray-800">{branch?.name}</p></div>
                                 </div>
                                 <div className="space-y-4">
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Date of Joining</label><p className="font-bold text-gray-800">{employee.joiningDate}</p></div>
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Contact Email</label><p className="font-bold text-gray-800">{employee.email}</p></div>
                                     <div><label className="text-[10px] font-black text-gray-400 uppercase">Phone</label><p className="font-bold text-gray-800">{employee.phone}</p></div>
                                 </div>
                             </div>

                             <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                 <div className="flex items-center mb-4">
                                     <Building2 size={16} className="text-[#0854a0] mr-2" />
                                     <span className="text-[10px] font-black text-[#0854a0] uppercase tracking-widest">Bank Details</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-700">
                                     <p>Bank: {employee.bankDetails.bankName}</p>
                                     <p>A/C No: {employee.bankDetails.accountNumber}</p>
                                     <p>IFSC: {employee.bankDetails.ifsc}</p>
                                 </div>
                             </div>
                         </div>
                     )}

                     {activeTab === 'settings' && (
                         <div className="max-w-md space-y-8">
                             <div>
                                 <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Security Settings</h2>
                                 <p className="text-xs text-gray-500">Update your access credentials</p>
                             </div>

                             <div className="space-y-4">
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Password</label>
                                     <div className="relative">
                                         <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                         <input type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#0854a0]" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                     </div>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confirm Password</label>
                                     <div className="relative">
                                         <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                         <input type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#0854a0]" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                     </div>
                                 </div>
                                 <button onClick={handleUpdatePass} className="w-full py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280]">
                                     Update Password
                                 </button>
                             </div>

                             <div className="pt-8 border-t border-gray-100">
                                 <h3 className="text-sm font-bold text-gray-800 mb-4">Linked Accounts</h3>
                                 <button onClick={onLinkGoogle} className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center justify-center">
                                     <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 mr-2" />
                                     Link Google Account for Login
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        </main>
    </div>
  );
};

export default EmployeePortal;