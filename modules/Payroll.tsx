import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, UserPlus, FileText, Banknote, CalendarCheck, Settings, 
  Search, Save, X, Eye, Printer, Download, Lock, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Employee, PayrollRecord, Branch, SalaryStructure } from '../types';
import { COMPANY_NAME, COMPANY_LOGO } from '../constants';

interface PayrollProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  branches: Branch[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onProcessPayroll: (records: PayrollRecord[]) => void;
}

const Payroll: React.FC<PayrollProps> = ({ 
  employees, 
  payrollRecords, 
  branches,
  onAddEmployee, 
  onUpdateEmployee, 
  onProcessPayroll 
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'register' | 'reports'>('employees');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Attendance/Processing State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [lopData, setLopData] = useState<{ [empId: string]: number }>({}); // Loss of Pay days
  const [incentiveData, setIncentiveData] = useState<{ [empId: string]: number }>({}); 

  // --- DERIVED DATA ---
  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayroll = payrollRecords.filter(r => 
    r.month === selectedMonth && 
    (r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.employeeId.includes(searchTerm))
  );

  // --- HANDLERS ---

  const handleNewEmployee = () => {
    const nextId = `EMP-${1000 + employees.length + 1}`;
    setEditingEmployee({
      id: nextId,
      name: '', designation: '', department: '', joiningDate: new Date().toISOString().split('T')[0],
      email: '', phone: '', pan: '', branchId: branches[0]?.id || '',
      status: 'Active',
      bankDetails: { bankName: '', accountNumber: '', ifsc: '' },
      salary: { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0, pfDeduction: 0, ptDeduction: 200, tdsDeduction: 0 }
    });
    setShowEmployeeModal(true);
  };

  const saveEmployee = () => {
    if (!editingEmployee?.name || !editingEmployee.id) return alert('Name is required');
    
    // Check if exists
    const exists = employees.find(e => e.id === editingEmployee.id);
    if (exists) {
      onUpdateEmployee(editingEmployee as Employee);
    } else {
      onAddEmployee(editingEmployee as Employee);
    }
    setShowEmployeeModal(false);
  };

  const calculatePayrollPreview = () => {
    // Basic Payroll Calculation Logic
    const draftRecords: PayrollRecord[] = employees.filter(e => e.status === 'Active').map(emp => {
      const daysInMonth = 30; // Standardize for simplicity or use real date math
      const lopDays = lopData[emp.id] || 0;
      const presentDays = Math.max(0, daysInMonth - lopDays);
      const lopFactor = presentDays / daysInMonth;

      // Earnings (Pro-rated)
      // Note: Usually only Basic/HRA is pro-rated, allowances might be fixed. 
      // For this ERP, we pro-rate Fixed components.
      const earnedBasic = Math.round(emp.salary.basic * lopFactor);
      const earnedHra = Math.round(emp.salary.hra * lopFactor);
      const earnedConv = Math.round(emp.salary.conveyance * lopFactor);
      const earnedSpecial = Math.round(emp.salary.specialAllowance * lopFactor);
      const incentive = incentiveData[emp.id] || 0;

      const totalEarnings = earnedBasic + earnedHra + earnedConv + earnedSpecial + incentive;

      // Deductions
      // PF typically 12% of Basic (capped at 15k usually, but using flat % here)
      const pf = Math.round(emp.salary.pfDeduction); // Assuming Master has the fixed monthly deduction
      const pt = emp.salary.ptDeduction;
      const tds = emp.salary.tdsDeduction;
      const lopAmount = Math.round((emp.salary.basic + emp.salary.hra + emp.salary.specialAllowance) / 30 * lopDays); 
      // Wait, if we pro-rated earnings, we don't subtract LOP again. 
      // Let's stick to Pro-rating Earnings approach, so 'lopAmount' is just for display/record.
      
      const totalDeductions = pf + pt + tds;
      
      return {
        id: `PAY-${Date.now()}-${emp.id}`,
        month: selectedMonth,
        year: new Date().getFullYear(),
        employeeId: emp.id,
        employeeName: emp.name,
        branchId: emp.branchId,
        designation: emp.designation,
        totalDays: daysInMonth,
        presentDays,
        lopDays,
        earnings: {
          basic: earnedBasic,
          hra: earnedHra,
          conveyance: earnedConv,
          specialAllowance: earnedSpecial,
          incentive
        },
        deductions: {
          pf, pt, tds, lopAmount: 0 // Already handled via earnings reduction
        },
        grossPay: totalEarnings,
        totalDeductions,
        netPay: totalEarnings - totalDeductions,
        status: 'Draft',
        generatedDate: new Date().toISOString()
      };
    });

    onProcessPayroll(draftRecords);
    alert(`Payroll processed for ${draftRecords.length} employees. Check Register.`);
    setActiveTab('register');
  };

  const handlePrintPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setViewingPayslip(null);
    }, 500);
  };

  // --- RENDERERS ---

  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
    const emp = employees.find(e => e.id === record.employeeId);
    return (
      <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] text-[#000000] font-sans flex flex-col relative print:p-[15mm]">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
           <img src={COMPANY_LOGO} className="h-16 object-contain" />
           <div className="text-right">
              <h1 className="text-xl font-bold uppercase tracking-widest text-[#0854a0]">{COMPANY_NAME}</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Payslip for {record.month}</p>
           </div>
        </div>

        {/* Employee Details Grid */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-8 text-[11px]">
           <div className="grid grid-cols-2 gap-y-2 gap-x-8">
              <div className="flex justify-between"><span className="font-bold text-gray-500">Employee Name</span><span className="font-bold">{record.employeeName}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Employee ID</span><span className="font-bold">{record.employeeId}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Designation</span><span className="font-bold">{record.designation}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Date of Joining</span><span className="font-bold">{emp?.joiningDate}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Bank Account</span><span className="font-bold">{emp?.bankDetails.accountNumber}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">PAN Number</span><span className="font-bold">{emp?.pan}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Paid Days</span><span className="font-bold">{record.presentDays} / {record.totalDays}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">LOP Days</span><span className="font-bold text-red-600">{record.lopDays}</span></div>
           </div>
        </div>

        {/* Earnings & Deductions Table */}
        <div className="flex border border-black mb-8">
           <div className="w-1/2 border-r border-black">
              <div className="bg-gray-100 p-2 font-bold text-center text-[12px] border-b border-black uppercase">Earnings</div>
              <div className="p-4 space-y-2 text-[11px]">
                 <div className="flex justify-between"><span>Basic Salary</span><span>{record.earnings.basic.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>HRA</span><span>{record.earnings.hra.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>Conveyance</span><span>{record.earnings.conveyance.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>Special Allowance</span><span>{record.earnings.specialAllowance.toLocaleString()}</span></div>
                 {record.earnings.incentive > 0 && <div className="flex justify-between"><span>Incentive / Bonus</span><span>{record.earnings.incentive.toLocaleString()}</span></div>}
              </div>
              <div className="border-t border-black p-2 flex justify-between font-bold text-[12px] bg-gray-50">
                 <span>Gross Earnings</span>
                 <span>₹ {record.grossPay.toLocaleString()}</span>
              </div>
           </div>
           <div className="w-1/2">
              <div className="bg-gray-100 p-2 font-bold text-center text-[12px] border-b border-black uppercase">Deductions</div>
              <div className="p-4 space-y-2 text-[11px]">
                 <div className="flex justify-between"><span>Provident Fund</span><span>{record.deductions.pf.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>Professional Tax</span><span>{record.deductions.pt.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span>TDS / Tax</span><span>{record.deductions.tds.toLocaleString()}</span></div>
              </div>
              <div className="border-t border-black p-2 flex justify-between font-bold text-[12px] bg-gray-50 mt-auto">
                 <span>Total Deductions</span>
                 <span>₹ {record.totalDeductions.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Net Pay */}
        <div className="border border-black p-4 bg-blue-50/50 mb-12 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Net Payable Amount</p>
              <p className="text-[9px] italic mt-1">(In words: Rupees Only)</p>
           </div>
           <div className="text-2xl font-black text-[#0854a0]">
              ₹ {record.netPay.toLocaleString('en-IN', {minimumFractionDigits: 2})}
           </div>
        </div>

        {/* Footer */}
        <div className="mt-auto text-[9px] text-center text-gray-500">
           <p>This is a computer-generated payslip and does not require a signature.</p>
           <p>{COMPANY_NAME} | Regd Office: Bengaluru, India.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Print Portal */}
      {isPrinting && viewingPayslip && createPortal(<PayslipDocument record={viewingPayslip} />, document.getElementById('print-portal')!)}

      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Payroll & HR Management</h2>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Employee Compensation System</p>
         </div>
         <div className="flex bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'employees', label: 'Employee Master', icon: Users },
              { id: 'attendance', label: 'Run Payroll', icon: CalendarCheck },
              { id: 'register', label: 'Salary Register', icon: FileText },
            ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#0854a0]' : 'text-gray-500 hover:text-gray-700'}`}
               >
                  <tab.icon size={14} />
                  <span>{tab.label}</span>
               </button>
            ))}
         </div>
      </div>

      {/* === EMPLOYEES TAB === */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Search employees..." 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:border-[#0854a0]"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
              <button onClick={handleNewEmployee} className="bg-[#0854a0] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#064280] transition-all flex items-center">
                 <UserPlus size={16} className="mr-2" /> Add Employee
              </button>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                 <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-black tracking-widest">
                    <tr>
                       <th className="px-6 py-4">Emp Code</th>
                       <th className="px-6 py-4">Name & Designation</th>
                       <th className="px-6 py-4">Department</th>
                       <th className="px-6 py-4">Contact</th>
                       <th className="px-6 py-4 text-right">Gross Salary (CTC)</th>
                       <th className="px-6 py-4 text-center">Status</th>
                       <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredEmployees.map(emp => {
                       const gross = emp.salary.basic + emp.salary.hra + emp.salary.conveyance + emp.salary.specialAllowance;
                       return (
                          <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                             <td className="px-6 py-4 font-mono font-bold text-gray-400">{emp.id}</td>
                             <td className="px-6 py-4">
                                <div className="font-bold text-gray-800">{emp.name}</div>
                                <div className="text-[10px] text-gray-500">{emp.designation}</div>
                             </td>
                             <td className="px-6 py-4 text-gray-600">{emp.department}</td>
                             <td className="px-6 py-4 text-gray-600">{emp.email}<br/>{emp.phone}</td>
                             <td className="px-6 py-4 text-right font-black text-[#0854a0]">₹ {gross.toLocaleString()}</td>
                             <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                   {emp.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => { setEditingEmployee(emp); setShowEmployeeModal(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg font-bold text-xs">Edit</button>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* === ATTENDANCE & PROCESS TAB === */}
      {activeTab === 'attendance' && (
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-6">
               <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Run Payroll</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">Step 1: Input LOP & Incentives</p>
               </div>
               <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                     <label className="text-[10px] font-black text-gray-400 uppercase">Payroll Month</label>
                     <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                     >
                        {['September 2024', 'October 2024', 'November 2024', 'December 2024'].map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
                  <button onClick={calculatePayrollPreview} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center">
                     <Banknote size={16} className="mr-2" /> Process Salaries
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               {employees.filter(e => e.status === 'Active').map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-all">
                     <div className="flex items-center space-x-4 w-1/3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-blue-600">{emp.name.charAt(0)}</div>
                        <div>
                           <p className="font-bold text-gray-800 text-xs">{emp.name}</p>
                           <p className="text-[10px] text-gray-400 font-mono">{emp.id}</p>
                        </div>
                     </div>
                     <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                           <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">LOP Days</label>
                           <input 
                              type="number" 
                              min="0" max="30"
                              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                              value={lopData[emp.id] || 0}
                              onChange={e => setLopData({...lopData, [emp.id]: Number(e.target.value)})}
                           />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">Incentive (₹)</label>
                           <input 
                              type="number" 
                              min="0"
                              className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                              value={incentiveData[emp.id] || 0}
                              onChange={e => setIncentiveData({...incentiveData, [emp.id]: Number(e.target.value)})}
                           />
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* === REGISTER TAB === */}
      {activeTab === 'register' && (
         <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                   <h3 className="font-bold text-gray-800">Salary Register: {selectedMonth}</h3>
                   <p className="text-xs text-gray-400 mt-1">{filteredPayroll.length} Records Generated</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-gray-400 uppercase">Total Payout</p>
                   <p className="text-xl font-black text-[#0854a0]">₹ {filteredPayroll.reduce((acc, r) => acc + r.netPay, 0).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPayroll.map(record => (
                  <div key={record.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h4 className="font-bold text-gray-900">{record.employeeName}</h4>
                           <p className="text-[10px] text-gray-500 font-mono">{record.employeeId}</p>
                        </div>
                        <span className={`text-[9px] px-2 py-1 rounded font-black uppercase ${record.status === 'Locked' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                           {record.status}
                        </span>
                     </div>
                     
                     <div className="space-y-2 text-xs border-t border-gray-100 pt-4 mb-4">
                        <div className="flex justify-between">
                           <span className="text-gray-500">Gross Earnings</span>
                           <span className="font-bold">₹ {record.grossPay.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-gray-500">Deductions</span>
                           <span className="font-bold text-rose-500">- ₹ {record.totalDeductions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-50">
                           <span className="font-black text-gray-800">Net Pay</span>
                           <span className="font-black text-[#0854a0]">₹ {record.netPay.toLocaleString()}</span>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <button 
                           onClick={() => handlePrintPayslip(record)}
                           className="flex-1 py-2 bg-[#0854a0] text-white rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-[#064280] transition-colors flex items-center justify-center"
                        >
                           <Printer size={14} className="mr-2" /> Payslip
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* === ADD/EDIT EMPLOYEE MODAL === */}
      {showEmployeeModal && editingEmployee && (
         <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Employee Master</h3>
                  <button onClick={() => setShowEmployeeModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Personal Info */}
                     <div className="space-y-4">
                        <h4 className="text-xs font-black text-[#0854a0] uppercase tracking-widest border-b border-blue-100 pb-2">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Name</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Code</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold bg-gray-50 text-gray-400" value={editingEmployee.id} disabled /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Designation</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Department</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.department} onChange={e => setEditingEmployee({...editingEmployee, department: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Email</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.phone} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Joining Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">PAN</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold uppercase" value={editingEmployee.pan} onChange={e => setEditingEmployee({...editingEmployee, pan: e.target.value})} /></div>
                        </div>
                     </div>

                     {/* Salary Info */}
                     <div className="space-y-4">
                        <h4 className="text-xs font-black text-[#0854a0] uppercase tracking-widest border-b border-blue-100 pb-2">Salary Structure (Monthly)</h4>
                        <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                           <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-600">Basic Pay</label><input type="number" className="w-24 border border-blue-200 rounded px-2 py-1 text-xs text-right font-bold" value={editingEmployee.salary?.basic} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, basic: Number(e.target.value) }})} /></div>
                           <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-600">HRA</label><input type="number" className="w-24 border border-blue-200 rounded px-2 py-1 text-xs text-right font-bold" value={editingEmployee.salary?.hra} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, hra: Number(e.target.value) }})} /></div>
                           <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-600">Conveyance</label><input type="number" className="w-24 border border-blue-200 rounded px-2 py-1 text-xs text-right font-bold" value={editingEmployee.salary?.conveyance} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, conveyance: Number(e.target.value) }})} /></div>
                           <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-600">Special Allow.</label><input type="number" className="w-24 border border-blue-200 rounded px-2 py-1 text-xs text-right font-bold" value={editingEmployee.salary?.specialAllowance} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, specialAllowance: Number(e.target.value) }})} /></div>
                           <div className="border-t border-blue-200 pt-2 flex justify-between items-center text-red-600"><label className="text-[10px] font-bold">PF Deduction</label><input type="number" className="w-24 border border-red-200 rounded px-2 py-1 text-xs text-right font-bold text-red-600" value={editingEmployee.salary?.pfDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, pfDeduction: Number(e.target.value) }})} /></div>
                           <div className="flex justify-between items-center text-red-600"><label className="text-[10px] font-bold">Prof. Tax</label><input type="number" className="w-24 border border-red-200 rounded px-2 py-1 text-xs text-right font-bold text-red-600" value={editingEmployee.salary?.ptDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, ptDeduction: Number(e.target.value) }})} /></div>
                        </div>
                     </div>

                     {/* Bank Info */}
                     <div className="space-y-4 md:col-span-2">
                        <h4 className="text-xs font-black text-[#0854a0] uppercase tracking-widest border-b border-blue-100 pb-2">Bank Details</h4>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Bank Name</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold" value={editingEmployee.bankDetails?.bankName} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, bankName: e.target.value }})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">Account Number</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold font-mono" value={editingEmployee.bankDetails?.accountNumber} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, accountNumber: e.target.value }})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">IFSC Code</label><input className="w-full border rounded-lg px-3 py-2 text-xs font-bold uppercase font-mono" value={editingEmployee.bankDetails?.ifsc} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, ifsc: e.target.value }})} /></div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
                  <button onClick={() => setShowEmployeeModal(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={saveEmployee} className="px-8 py-3 rounded-xl bg-[#0854a0] text-white text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#064280] transition-colors flex items-center">
                     <Save size={16} className="mr-2" /> Save Employee Record
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Payroll;