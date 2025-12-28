
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Plus, Edit2, Calculator, Save, Download, Printer, Search, X, 
  CheckCircle2, Banknote, RefreshCcw, Lock, Briefcase
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Employee, PayrollRecord, Branch } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, generateSecureQR } from '../constants';

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

interface PayrollProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  branches: Branch[];
  onAddEmployee: (emp: Employee) => Promise<void>;
  onUpdateEmployee: (emp: Employee) => Promise<void>;
  onResetAccess: (emp: Employee) => Promise<void>;
  onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
}

const Payroll: React.FC<PayrollProps> = ({ 
    employees, 
    payrollRecords, 
    branches, 
    onAddEmployee, 
    onUpdateEmployee, 
    onResetAccess, 
    onProcessPayroll 
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'process' | 'history'>('employees');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Payroll Processing State
  const [processMonth, setProcessMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [draftRecords, setDraftRecords] = useState<PayrollRecord[]>([]);

  const filteredEmployees = employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewEmployee = () => {
      setEditingEmployee({
          id: `91${1000 + employees.length + 1}`,
          name: '',
          designation: '',
          department: '',
          joiningDate: new Date().toISOString().split('T')[0],
          email: '',
          phone: '',
          pan: '',
          branchId: branches[0]?.id || '',
          status: 'Active',
          bankDetails: { accountNumber: '', bankName: '', ifsc: '' },
          salary: {
              basic: 0, hra: 0, conveyance: 0, specialAllowance: 0,
              pfDeduction: 0, ptDeduction: 0, tdsDeduction: 0
          }
      });
      setShowModal(true);
  };

  const handleSaveEmployee = async () => {
      if (editingEmployee && editingEmployee.name && editingEmployee.id) {
          if (employees.find(e => e.id === editingEmployee.id)) {
              await onUpdateEmployee(editingEmployee as Employee);
          } else {
              await onAddEmployee(editingEmployee as Employee);
          }
          setShowModal(false);
          setEditingEmployee(null);
      }
  };

  const generateDraftPayroll = () => {
      const records: PayrollRecord[] = employees.filter(e => e.status === 'Active').map(emp => {
          const totalEarnings = emp.salary.basic + emp.salary.hra + emp.salary.conveyance + emp.salary.specialAllowance;
          const totalDeductions = emp.salary.pfDeduction + emp.salary.ptDeduction + emp.salary.tdsDeduction;
          const netPay = totalEarnings - totalDeductions;

          return {
              id: `PAY-${processMonth.replace(' ', '-')}-${emp.id}`,
              month: processMonth,
              year: new Date().getFullYear(),
              employeeId: emp.id,
              employeeName: emp.name,
              branchId: emp.branchId,
              designation: emp.designation,
              totalDays: 30,
              presentDays: 30,
              lopDays: 0,
              earnings: {
                  basic: emp.salary.basic,
                  hra: emp.salary.hra,
                  conveyance: emp.salary.conveyance,
                  specialAllowance: emp.salary.specialAllowance,
                  incentive: 0,
                  leaveEncashment: 0
              },
              deductions: {
                  pf: emp.salary.pfDeduction,
                  pt: emp.salary.ptDeduction,
                  tds: emp.salary.tdsDeduction,
                  advanceSalary: 0,
                  lopAmount: 0
              },
              grossPay: totalEarnings,
              totalDeductions: totalDeductions,
              netPay: netPay,
              status: 'Draft',
              generatedDate: new Date().toISOString()
          };
      });
      setDraftRecords(records);
  };

  const commitPayroll = async () => {
      if (draftRecords.length === 0) return;
      await onProcessPayroll(draftRecords.map(r => ({ ...r, status: 'Locked' })));
      setDraftRecords([]);
      setActiveTab('history');
      alert('Payroll Processed Successfully!');
  };

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
             <div className="flex"><span className="w-24 font-bold">Bank Name:</span><span>{employees.find(e => e.id === record.employeeId)?.bankDetails.bankName || 'N/A'}</span></div>
             <div className="flex"><span className="w-24 font-bold">Account No:</span><span>{employees.find(e => e.id === record.employeeId)?.bankDetails.accountNumber || 'N/A'}</span></div>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isPrinting && viewingPayslip && createPortal(<PayslipDocument record={viewingPayslip} />, document.getElementById('print-portal')!)}

      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-xl font-black text-[#1c2d3d] tracking-tight">Payroll & HR</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Employee Management & Compensation</p>
          </div>
          <div className="flex bg-gray-50 p-1 rounded-lg">
              {['employees', 'process', 'history'].map((tab) => (
                  <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-6 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#0854a0] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {activeTab === 'employees' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <div className="relative">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                       <input 
                          type="text" 
                          placeholder="Search Employees..." 
                          className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-bold w-64 outline-none focus:border-[#0854a0]"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                       />
                   </div>
                   <button onClick={handleNewEmployee} className="flex items-center px-6 py-2.5 bg-[#0854a0] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#064280]">
                       <Plus size={16} className="mr-2" /> Add Employee
                   </button>
               </div>
               <table className="w-full text-left text-[11px]">
                   <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-widest">
                       <tr>
                           <th className="px-6 py-4">ID</th>
                           <th className="px-6 py-4">Name</th>
                           <th className="px-6 py-4">Designation</th>
                           <th className="px-6 py-4">Branch</th>
                           <th className="px-6 py-4 text-right">CTC (M)</th>
                           <th className="px-6 py-4 text-center">Status</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {filteredEmployees.map(emp => (
                           <tr key={emp.id} className="hover:bg-blue-50/30">
                               <td className="px-6 py-4 font-mono font-bold text-gray-400">{emp.id}</td>
                               <td className="px-6 py-4 font-bold text-gray-800">{emp.name}</td>
                               <td className="px-6 py-4 text-gray-600">{emp.designation}</td>
                               <td className="px-6 py-4 text-gray-500">{branches.find(b => b.id === emp.branchId)?.name || emp.branchId}</td>
                               <td className="px-6 py-4 text-right font-black text-gray-800">₹ {(emp.salary.basic + emp.salary.hra + emp.salary.conveyance + emp.salary.specialAllowance).toLocaleString()}</td>
                               <td className="px-6 py-4 text-center">
                                   <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{emp.status}</span>
                               </td>
                               <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                   <button onClick={() => { setEditingEmployee(emp); setShowModal(true); }} className="p-2 bg-gray-100 rounded-lg hover:bg-blue-100 text-blue-600"><Edit2 size={14} /></button>
                                   <button onClick={() => onResetAccess(emp)} className="p-2 bg-gray-100 rounded-lg hover:bg-amber-100 text-amber-600" title="Reset Portal Access"><Lock size={14} /></button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      )}

      {activeTab === 'process' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
               <div className="max-w-xl mx-auto text-center space-y-6">
                   <div className="w-16 h-16 bg-blue-50 text-[#0854a0] rounded-2xl flex items-center justify-center mx-auto">
                       <Calculator size={32} />
                   </div>
                   <h3 className="text-xl font-black text-gray-900">Run Payroll Process</h3>
                   <div className="flex items-center justify-center space-x-4">
                       <input 
                          type="text" 
                          value={processMonth}
                          onChange={(e) => setProcessMonth(e.target.value)} 
                          className="border-2 border-gray-200 rounded-xl px-4 py-2 font-bold text-center w-64 outline-none focus:border-[#0854a0]"
                       />
                       <button onClick={generateDraftPayroll} className="px-6 py-3 bg-[#0854a0] text-white rounded-xl font-bold hover:bg-[#064280]">Generate Draft</button>
                   </div>
               </div>

               {draftRecords.length > 0 && (
                   <div className="mt-10">
                       <h4 className="font-bold text-gray-800 mb-4">Draft Summary</h4>
                       <table className="w-full text-[11px] border border-gray-200">
                           <thead className="bg-gray-50 font-bold">
                               <tr>
                                   <th className="p-3 text-left">Employee</th>
                                   <th className="p-3 text-right">Gross Earnings</th>
                                   <th className="p-3 text-right">Deductions</th>
                                   <th className="p-3 text-right">Net Pay</th>
                               </tr>
                           </thead>
                           <tbody>
                               {draftRecords.map(rec => (
                                   <tr key={rec.id} className="border-t border-gray-100">
                                       <td className="p-3">{rec.employeeName}</td>
                                       <td className="p-3 text-right">₹ {rec.grossPay.toLocaleString()}</td>
                                       <td className="p-3 text-right text-rose-500">₹ {rec.totalDeductions.toLocaleString()}</td>
                                       <td className="p-3 text-right font-black text-[#0854a0]">₹ {rec.netPay.toLocaleString()}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                       <div className="mt-6 flex justify-end">
                           <button onClick={commitPayroll} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg flex items-center">
                               <CheckCircle2 size={18} className="mr-2" /> Finalize & Lock Payroll
                           </button>
                       </div>
                   </div>
               )}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
               <table className="w-full text-left text-[11px]">
                   <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-widest">
                       <tr>
                           <th className="px-6 py-4">Run ID</th>
                           <th className="px-6 py-4">Period</th>
                           <th className="px-6 py-4">Employee</th>
                           <th className="px-6 py-4 text-right">Net Pay</th>
                           <th className="px-6 py-4 text-center">Status</th>
                           <th className="px-6 py-4 text-right">Action</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {payrollRecords.map(rec => (
                           <tr key={rec.id} className="hover:bg-blue-50/30">
                               <td className="px-6 py-4 font-mono text-gray-400">{rec.id.split('-')[0]}</td>
                               <td className="px-6 py-4 font-bold text-gray-600">{rec.month} {rec.year}</td>
                               <td className="px-6 py-4 font-bold text-gray-800">{rec.employeeName}</td>
                               <td className="px-6 py-4 text-right font-black text-emerald-600">₹ {rec.netPay.toLocaleString()}</td>
                               <td className="px-6 py-4 text-center">
                                   <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-bold text-[9px] uppercase">{rec.status}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                   <button onClick={() => setViewingPayslip(rec)} className="p-2 text-[#0854a0] hover:bg-blue-50 rounded-lg"><Printer size={16} /></button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      )}

      {/* Employee Modal */}
      {showModal && editingEmployee && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                   <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                       <h3 className="font-black text-lg text-gray-800">Employee Master</h3>
                       <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
                   </div>
                   <div className="p-8 grid grid-cols-2 gap-6">
                       <div className="space-y-4">
                           <h4 className="font-bold text-[#0854a0] border-b pb-2">Personal Details</h4>
                           <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} /></div>
                           <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Designation</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} /></div>
                           <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Email (Login ID)</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} /></div>
                           <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.phone} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} /></div>
                       </div>
                       <div className="space-y-4">
                           <h4 className="font-bold text-[#0854a0] border-b pb-2">Compensation Structure (Monthly)</h4>
                           <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Basic</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.salary?.basic} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, basic: Number(e.target.value)}})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">HRA</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.salary?.hra} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, hra: Number(e.target.value)}})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Conveyance</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.salary?.conveyance} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, conveyance: Number(e.target.value)}})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">Special Allow.</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={editingEmployee.salary?.specialAllowance} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, specialAllowance: Number(e.target.value)}})} /></div>
                           </div>
                           <div className="space-y-2 pt-4"><label className="text-[10px] font-bold uppercase text-gray-400">PF Deduction</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-rose-600" value={editingEmployee.salary?.pfDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, pfDeduction: Number(e.target.value)}})} /></div>
                           <div className="space-y-2"><label className="text-[10px] font-bold uppercase text-gray-400">PT Deduction</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-rose-600" value={editingEmployee.salary?.ptDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: {...editingEmployee.salary!, ptDeduction: Number(e.target.value)}})} /></div>
                       </div>
                   </div>
                   <div className="p-6 border-t border-gray-100 flex justify-end">
                       <button onClick={handleSaveEmployee} className="px-8 py-3 bg-[#0854a0] text-white rounded-xl font-bold hover:bg-[#064280]">Save Employee Record</button>
                   </div>
               </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;
