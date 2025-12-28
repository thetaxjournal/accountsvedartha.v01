
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, LogOut, Download, Key, Shield, CheckCircle, Smartphone, Printer, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Employee, PayrollRecord, Branch } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, generateSecureQR, LOGO_DARK_BG } from '../constants';

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
  onUpdateCredentials: (newId: string, newPass: string) => Promise<void>;
  onLinkGoogle: () => Promise<void>;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ 
    employee, 
    payrollRecords, 
    branches, 
    onLogout, 
    onUpdateCredentials, 
    onLinkGoogle 
}) => {
  const [activeTab, setActiveTab] = useState<'payslips' | 'profile'>('payslips');
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Profile Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const myPayslips = useMemo(() => {
      return [...payrollRecords].sort((a,b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());
  }, [payrollRecords]);

  const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `${viewingPayslip?.id || 'Payslip'}`;
      setIsPrinting(true);
      setTimeout(() => {
          window.print();
          setIsPrinting(false);
          document.title = originalTitle;
      }, 500);
  };

  const handleUpdatePassword = async () => {
      if(!employee) return;
      if(newPassword !== confirmPassword) return alert("Passwords do not match.");
      if(newPassword.length < 6) return alert("Password must be at least 6 characters.");
      
      await onUpdateCredentials(employee.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
  };

  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
    const branch = branches.find(b => b.id === record.branchId) || branches[0];
    const qrValue = generateSecureQR({
        type: 'PAYSLIP',
        id: record.id,
        empId: record.employeeId,
        netPay: record.netPay,
        date: record.generatedDate
    });

    return (
      <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        <div className="flex justify-between items-start mb-8">
            <div className="flex items-center space-x-4">
                 <img src={COMPANY_LOGO} alt="Logo" className="h-12 object-contain" />
                 <div>
                     <h1 className="text-xl font-bold uppercase">{COMPANY_NAME}</h1>
                     <p className="text-[10px]">{branch.address.city}, {branch.address.state}</p>
                 </div>
            </div>
            <div className="text-right">
                <h2 className="text-lg font-bold uppercase">Payslip</h2>
                <p className="text-[12px] font-medium">{record.month}</p>
            </div>
        </div>

        <div className="border border-black p-4 grid grid-cols-2 gap-y-2 gap-x-8 text-[11px] mb-6">
             <div className="flex"><span className="w-24 font-bold">Employee ID:</span><span>{record.employeeId}</span></div>
             <div className="flex"><span className="w-24 font-bold">Name:</span><span>{record.employeeName}</span></div>
             <div className="flex"><span className="w-24 font-bold">Designation:</span><span>{record.designation}</span></div>
             <div className="flex"><span className="w-24 font-bold">Days Paid:</span><span>{record.presentDays}</span></div>
             <div className="flex"><span className="w-24 font-bold">Bank Name:</span><span>{employee?.bankDetails.bankName || 'N/A'}</span></div>
             <div className="flex"><span className="w-24 font-bold">Account No:</span><span>{employee?.bankDetails.accountNumber || 'N/A'}</span></div>
        </div>

        <div className="flex-1">
            <table className="w-full text-[11px] border border-black mb-6">
                <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="p-2 text-left border-r border-black w-1/2">Earnings</th>
                        <th className="p-2 text-right border-r border-black w-24">Amount</th>
                        <th className="p-2 text-left border-r border-black w-1/2">Deductions</th>
                        <th className="p-2 text-right w-24">Amount</th>
                    </tr>
                </thead>
                <tbody className="align-top">
                    <tr>
                         <td className="border-r border-black p-0">
                             <div className="p-2 flex justify-between"><span>Basic Salary</span><span>{record.earnings.basic.toLocaleString('en-IN')}</span></div>
                             <div className="p-2 flex justify-between"><span>HRA</span><span>{record.earnings.hra.toLocaleString('en-IN')}</span></div>
                             <div className="p-2 flex justify-between"><span>Conveyance</span><span>{record.earnings.conveyance.toLocaleString('en-IN')}</span></div>
                             <div className="p-2 flex justify-between"><span>Special Allowance</span><span>{record.earnings.specialAllowance.toLocaleString('en-IN')}</span></div>
                             {record.earnings.incentive > 0 && <div className="p-2 flex justify-between"><span>Incentive</span><span>{record.earnings.incentive.toLocaleString('en-IN')}</span></div>}
                         </td>
                         <td className="border-r border-black text-right p-2 font-bold align-bottom">
                             {record.grossPay.toLocaleString('en-IN')}
                         </td>
                         <td className="border-r border-black p-0">
                             <div className="p-2 flex justify-between"><span>Provident Fund</span><span>{record.deductions.pf.toLocaleString('en-IN')}</span></div>
                             <div className="p-2 flex justify-between"><span>Professional Tax</span><span>{record.deductions.pt.toLocaleString('en-IN')}</span></div>
                             <div className="p-2 flex justify-between"><span>TDS</span><span>{record.deductions.tds.toLocaleString('en-IN')}</span></div>
                             {record.deductions.lopAmount > 0 && <div className="p-2 flex justify-between"><span>Loss of Pay</span><span>{record.deductions.lopAmount.toLocaleString('en-IN')}</span></div>}
                         </td>
                         <td className="text-right p-2 font-bold align-bottom">
                             {record.totalDeductions.toLocaleString('en-IN')}
                         </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="border-t border-black font-bold">
                         <td className="p-2 border-r border-black">Total Earnings</td>
                         <td className="p-2 text-right border-r border-black">{record.grossPay.toLocaleString('en-IN')}</td>
                         <td className="p-2 border-r border-black">Total Deductions</td>
                         <td className="p-2 text-right">{record.totalDeductions.toLocaleString('en-IN')}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="border border-black p-4 mb-6">
                 <div className="flex justify-between items-center">
                      <span className="font-bold uppercase text-lg">Net Pay</span>
                      <span className="font-bold text-xl">₹ {record.netPay.toLocaleString('en-IN')}</span>
                 </div>
                 <div className="text-[11px] mt-1 font-medium italic">
                      Amount in words: {numberToWords(record.netPay)}
                 </div>
            </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-6 border border-black p-3 text-[10px]">
            <p className="font-bold mb-1">Note:</p>
            <p className="mb-1">1. This is a system generated report. This does not require any signature.</p>
            <p>2. Private and Confidential Disclaimer: This payslip has been generated by the {COMPANY_NAME} payroll service provider. All compensation information has been treated as confidential.</p>
        </div>

        {/* QR Code at Bottom */}
        <div className="mt-6 flex flex-col items-start">
             <QRCode value={qrValue} size={120} level="M" />
             <p className="text-[9px] font-bold mt-1 text-gray-500 uppercase tracking-widest">Scan to Verify</p>
        </div>
      </div>
    );
  };

  if (!employee) {
      return <div className="min-h-screen flex items-center justify-center text-gray-500">Employee Data Unavailable. Contact HR. <button onClick={onLogout} className="ml-4 text-blue-600 underline">Logout</button></div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f7] font-sans">
      {isPrinting && viewingPayslip && createPortal(<PayslipDocument record={viewingPayslip} />, document.getElementById('print-portal')!)}

      {/* Header */}
      <header className="bg-[#1c2d3d] text-white py-4 px-6 shadow-lg">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <img src={LOGO_DARK_BG} alt="Logo" className="h-10 object-contain invert brightness-0" />
               <div className="h-8 w-[1px] bg-white/20"></div>
               <div>
                  <h1 className="text-lg font-bold tracking-tight">Employee Self Service</h1>
                  <p className="text-[10px] text-gray-400 font-medium">Welcome, {employee.name}</p>
               </div>
            </div>
            <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
               <LogOut size={14} className="mr-2" /> Sign Out
            </button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</p>
                   <h2 className="text-xl font-bold text-gray-900 mt-1">{employee.designation}</h2>
                   <p className="text-xs text-blue-600 font-bold mt-2">{employee.department}</p>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date of Joining</p>
                   <h2 className="text-xl font-bold text-gray-900 mt-1">{new Date(employee.joiningDate).toLocaleDateString()}</h2>
                   <p className="text-xs text-emerald-600 font-bold mt-2">{employee.status}</p>
               </div>
               <div className="bg-[#0854a0] p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                   <div className="relative z-10">
                       <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Net Pay (Latest)</p>
                       <h2 className="text-3xl font-black mt-2">
                           {myPayslips.length > 0 ? `₹ ${myPayslips[0].netPay.toLocaleString()}` : '---'}
                       </h2>
                       <p className="text-[10px] opacity-80 mt-2">
                           {myPayslips.length > 0 ? `${myPayslips[0].month} Cycle` : 'No payroll data'}
                       </p>
                   </div>
               </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
             <div className="flex border-b border-gray-100">
                 <button 
                    onClick={() => setActiveTab('payslips')}
                    className={`flex-1 py-5 text-center text-sm font-bold border-b-2 transition-all ${activeTab === 'payslips' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                 >
                    My Payslips
                 </button>
                 <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-5 text-center text-sm font-bold border-b-2 transition-all ${activeTab === 'profile' ? 'border-[#0854a0] text-[#0854a0] bg-blue-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                 >
                    Profile & Security
                 </button>
             </div>
             
             <div className="p-8">
                 {activeTab === 'payslips' && (
                     <div className="space-y-4">
                         {myPayslips.map(slip => (
                             <div key={slip.id} className="border border-gray-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-md transition-all group">
                                 <div className="flex items-center space-x-6">
                                     <div className="p-4 rounded-xl bg-blue-50 text-blue-600">
                                         <Download size={24} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-gray-900">{slip.month} {slip.year}</h4>
                                         <p className="text-xs text-gray-500 mt-1">Generated on {new Date(slip.generatedDate).toLocaleDateString()}</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center space-x-8">
                                     <div className="text-right">
                                         <p className="text-[10px] font-bold text-gray-400 uppercase">Net Pay</p>
                                         <p className="text-lg font-black text-gray-900">₹ {slip.netPay.toLocaleString()}</p>
                                     </div>
                                     <button 
                                        onClick={() => setViewingPayslip(slip)}
                                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                     >
                                        <Download size={20} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                         {myPayslips.length === 0 && <div className="text-center py-20 text-gray-400">No payslips available yet.</div>}
                     </div>
                 )}

                 {activeTab === 'profile' && (
                     <div className="max-w-2xl mx-auto space-y-12">
                         <div className="space-y-6">
                             <h3 className="font-bold text-lg text-[#1c2d3d] flex items-center"><Key size={20} className="mr-2" /> Change Password</h3>
                             <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded-lg px-4 py-3 text-sm font-bold" /></div>
                                 <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-4 py-3 text-sm font-bold" /></div>
                             </div>
                             <button onClick={handleUpdatePassword} className="px-8 py-3 bg-[#1c2d3d] text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black">Update Credentials</button>
                         </div>

                         <div className="space-y-6 pt-8 border-t border-gray-100">
                             <h3 className="font-bold text-lg text-[#1c2d3d] flex items-center"><Smartphone size={20} className="mr-2" /> Google Account Link</h3>
                             <p className="text-xs text-gray-500 max-w-lg">Link your corporate Google account to enable Single Sign-On (SSO). You can then login using the "Login with Google" button.</p>
                             <button onClick={onLinkGoogle} className="px-8 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-50 flex items-center">
                                 <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 mr-2" /> Link Google Account
                             </button>
                         </div>
                     </div>
                 )}
             </div>
          </div>
      </main>

      {viewingPayslip && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8 backdrop-blur-sm no-print">
          <div className="flex flex-col items-center space-y-4 max-h-screen overflow-y-auto w-full py-10">
            <div className="flex space-x-4 mb-4 bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md sticky top-0">
              <button onClick={handlePrint} className="flex items-center px-8 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <Printer size={18} className="mr-3" /> Execute print (A4)
              </button>
              <button onClick={() => setViewingPayslip(null)} className="flex items-center px-6 py-3 bg-white text-gray-800 rounded-xl text-[11px] font-bold shadow-2xl transition-all">
                <X size={18} className="mr-3" /> Exit
              </button>
            </div>
            <div className="shadow-2xl">
              <PayslipDocument record={viewingPayslip} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePortal;
