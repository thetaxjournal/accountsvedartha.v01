import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Plus, Edit2, Trash2, DollarSign, FileText, Download, Printer, Search, X, Save, RefreshCw, Lock, Briefcase
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
  employees, payrollRecords, branches, onAddEmployee, onUpdateEmployee, onResetAccess, onProcessPayroll 
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'run'>('employees');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);
  
  // Payroll Run State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatedRecords, setGeneratedRecords] = useState<PayrollRecord[]>([]);
  const [viewingSlip, setViewingSlip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleNewEmployee = () => {
    const branch = branches[0];
    setEditingEmp({
        id: `91${1000 + employees.length + 1}`,
        name: '',
        designation: '',
        department: '',
        joiningDate: new Date().toISOString().split('T')[0],
        email: '',
        phone: '',
        pan: '',
        branchId: branch?.id || '',
        status: 'Active',
        bankDetails: { accountNumber: '', bankName: '', ifsc: '' },
        salary: { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0, pfDeduction: 0, ptDeduction: 200, tdsDeduction: 0 }
    });
    setShowEmpModal(true);
  };

  const saveEmployee = async () => {
      if(!editingEmp?.name || !editingEmp.id) return alert('Name and ID required');
      if(employees.find(e => e.id === editingEmp.id)) {
          await onUpdateEmployee(editingEmp as Employee);
      } else {
          await onAddEmployee(editingEmp as Employee);
      }
      setShowEmpModal(false);
  };

  const generateRun = () => {
      const activeEmps = employees.filter(e => e.status === 'Active');
      const records: PayrollRecord[] = activeEmps.map(emp => {
          const gross = emp.salary.basic + emp.salary.hra + emp.salary.conveyance + emp.salary.specialAllowance;
          const totalDed = emp.salary.pfDeduction + emp.salary.ptDeduction + emp.salary.tdsDeduction;
          return {
              id: `PAY-${selectedMonth.substring(0,3).toUpperCase()}-${selectedYear}-${emp.id}`,
              month: selectedMonth,
              year: selectedYear,
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
              grossPay: gross,
              totalDeductions: totalDed,
              netPay: gross - totalDed,
              status: 'Draft',
              generatedDate: new Date().toISOString()
          };
      });
      setGeneratedRecords(records);
  };

  const commitPayroll = async () => {
      if(!generatedRecords.length) return;
      if(confirm(`Confirm processing payroll for ${generatedRecords.length} employees?`)) {
          await onProcessPayroll(generatedRecords.map(r => ({...r, status: 'Locked'})));
          setGeneratedRecords([]);
          alert('Payroll Processed Successfully');
      }
  };

  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
      const branch = branches.find(b => b.id === record.branchId) || branches[0];
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
                        <p className="text-[10px]">{branch.address.line1}, {branch.address.city}</p>
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
                    <div className="flex"><span className="w-24 font-bold">Date of Joining</span><span>: {employees.find(e => e.id === record.employeeId)?.joiningDate}</span></div>
                </div>
                <div className="space-y-1">
                    <div className="flex"><span className="w-24 font-bold">Bank Name</span><span>: {employees.find(e => e.id === record.employeeId)?.bankDetails.bankName}</span></div>
                    <div className="flex"><span className="w-24 font-bold">Account No.</span><span>: {employees.find(e => e.id === record.employeeId)?.bankDetails.accountNumber}</span></div>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        {isPrinting && viewingSlip && createPortal(<PayslipDocument record={viewingSlip} />, document.getElementById('print-portal')!)}

        <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit mb-6">
            <button 
                onClick={() => setActiveTab('employees')} 
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'employees' ? 'bg-[#0854a0] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Employees
            </button>
            <button 
                onClick={() => setActiveTab('run')} 
                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'run' ? 'bg-[#0854a0] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Process Payroll
            </button>
        </div>

        {activeTab === 'employees' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Staff Directory</h2>
                    <button onClick={handleNewEmployee} className="flex items-center px-6 py-2 bg-[#0854a0] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#064280]">
                        <Plus size={16} className="mr-2" /> Add Employee
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0854a0] flex items-center justify-center font-bold text-sm">
                                        {emp.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{emp.name}</h4>
                                        <p className="text-[10px] text-gray-500 font-mono">{emp.id}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {emp.status}
                                </span>
                            </div>
                            <div className="space-y-2 text-[11px] text-gray-600 mb-6">
                                <div className="flex justify-between"><span>Designation:</span><span className="font-bold">{emp.designation}</span></div>
                                <div className="flex justify-between"><span>Department:</span><span className="font-bold">{emp.department}</span></div>
                                <div className="flex justify-between"><span>Join Date:</span><span className="font-bold">{emp.joiningDate}</span></div>
                            </div>
                            <div className="flex space-x-2 pt-4 border-t border-gray-50">
                                <button onClick={() => { setEditingEmp(emp); setShowEmpModal(true); }} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-100"><Edit2 size={14} className="mx-auto" /></button>
                                <button onClick={() => onResetAccess(emp)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 flex items-center justify-center" title="Reset Portal Access"><Lock size={14} className="mr-1" /> Reset</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'run' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Payroll Cycle</h3>
                    <div className="flex gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Month</label>
                            <select className="h-10 px-4 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Year</label>
                            <input type="number" className="h-10 px-4 bg-gray-50 rounded-lg border border-gray-200 text-sm font-bold outline-none w-24" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} />
                        </div>
                        <button onClick={generateRun} className="h-10 px-6 bg-[#0854a0] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#064280]">
                            Generate Draft
                        </button>
                    </div>
                </div>

                {generatedRecords.length > 0 && (
                     <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Draft Review ({generatedRecords.length})</h3>
                            <button onClick={commitPayroll} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-700 flex items-center">
                                <Save size={14} className="mr-2" /> Commit & Lock
                            </button>
                        </div>
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-white border-b border-gray-100 text-gray-400 uppercase font-black">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3 text-right">Gross Pay</th>
                                    <th className="px-6 py-3 text-right">Deductions</th>
                                    <th className="px-6 py-3 text-right">Net Pay</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {generatedRecords.map(rec => (
                                    <tr key={rec.id}>
                                        <td className="px-6 py-3 font-bold text-gray-700">{rec.employeeName}</td>
                                        <td className="px-6 py-3 text-right">₹ {rec.grossPay.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-rose-500">₹ {rec.totalDeductions.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right font-black text-emerald-600">₹ {rec.netPay.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Draft</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                )}

                <div className="mt-8">
                     <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">History</h3>
                     <div className="grid gap-4">
                         {payrollRecords.map(rec => (
                             <div key={rec.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                                 <div className="flex items-center space-x-4">
                                     <div className="p-3 bg-blue-50 text-[#0854a0] rounded-lg">
                                         <FileText size={20} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-gray-800 text-sm">{rec.employeeName}</h4>
                                         <p className="text-[10px] text-gray-500">{rec.month} {rec.year} • Net: ₹{rec.netPay.toLocaleString()}</p>
                                     </div>
                                 </div>
                                 <button onClick={() => handlePrint(rec)} className="p-2 text-gray-400 hover:text-[#0854a0] hover:bg-gray-50 rounded-lg transition-all">
                                     <Printer size={18} />
                                 </button>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        )}

        {/* Employee Modal */}
        {showEmpModal && editingEmp && (
             <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white w-full max-w-4xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="text-xl font-black text-gray-800">Employee Master</h3>
                         <button onClick={() => setShowEmpModal(false)}><X size={24} className="text-gray-400" /></button>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-6 mb-6">
                         <div className="space-y-4">
                             <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b pb-2">Personal Details</h4>
                             <input className="w-full border rounded-lg p-3 text-xs font-bold" placeholder="Full Name" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} />
                             <input className="w-full border rounded-lg p-3 text-xs font-bold" placeholder="Designation" value={editingEmp.designation} onChange={e => setEditingEmp({...editingEmp, designation: e.target.value})} />
                             <input className="w-full border rounded-lg p-3 text-xs font-bold" placeholder="Department" value={editingEmp.department} onChange={e => setEditingEmp({...editingEmp, department: e.target.value})} />
                             <input className="w-full border rounded-lg p-3 text-xs font-bold" type="date" value={editingEmp.joiningDate} onChange={e => setEditingEmp({...editingEmp, joiningDate: e.target.value})} />
                             <input className="w-full border rounded-lg p-3 text-xs font-bold" placeholder="Email" value={editingEmp.email} onChange={e => setEditingEmp({...editingEmp, email: e.target.value})} />
                         </div>
                         <div className="space-y-4">
                             <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest border-b pb-2">Salary Structure (Monthly)</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">Basic</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.basic} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, basic: Number(e.target.value)}})} /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">HRA</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.hra} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, hra: Number(e.target.value)}})} /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">Conveyance</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.conveyance} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, conveyance: Number(e.target.value)}})} /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">Special</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.specialAllowance} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, specialAllowance: Number(e.target.value)}})} /></div>
                             </div>
                             <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest border-b pb-2 mt-4">Deductions</h4>
                             <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">PF</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.pfDeduction} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, pfDeduction: Number(e.target.value)}})} /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">PT</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.ptDeduction} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, ptDeduction: Number(e.target.value)}})} /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-bold">TDS</label><input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={editingEmp.salary?.tdsDeduction} onChange={e => setEditingEmp({...editingEmp, salary: {...editingEmp.salary!, tdsDeduction: Number(e.target.value)}})} /></div>
                             </div>
                         </div>
                     </div>
                     <div className="flex justify-end pt-4 border-t">
                         <button onClick={saveEmployee} className="px-8 py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280]">
                             Save Employee
                         </button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default Payroll;