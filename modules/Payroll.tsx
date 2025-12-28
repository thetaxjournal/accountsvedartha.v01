import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, UserPlus, FileText, Banknote, CalendarCheck, Settings, 
  Search, Save, X, Eye, Printer, Download, Lock, CheckCircle2,
  AlertCircle, Key, Calculator, Briefcase, Building2, CreditCard,
  Upload, FileDown, Loader2, Check
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Employee, PayrollRecord, Branch, SalaryStructure } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, generateSecureQR } from '../constants';

interface PayrollProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  branches: Branch[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onResetAccess?: (employee: Employee) => Promise<void>;
  onProcessPayroll: (records: PayrollRecord[]) => void;
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
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'register' | 'reports'>('employees');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [grossSalaryInput, setGrossSalaryInput] = useState<string>('');
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Attendance/Processing State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [lopData, setLopData] = useState<{ [empId: string]: number }>({}); // Loss of Pay days
  const [incentiveData, setIncentiveData] = useState<{ [empId: string]: number }>({}); 
  const [encashData, setEncashData] = useState<{ [empId: string]: number }>({}); // Leave Encashment Days
  const [advanceData, setAdvanceData] = useState<{ [empId: string]: number }>({}); // Advance Salary

  // UI Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [processSuccess, setProcessSuccess] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED DATA ---
  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayroll = payrollRecords.filter(r => 
    r.month === selectedMonth && 
    (r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.employeeId.includes(searchTerm))
  );

  // Sync Gross Input when editing an employee
  useEffect(() => {
      if (editingEmployee && editingEmployee.salary) {
          const totalEarnings = editingEmployee.salary.basic + editingEmployee.salary.hra + editingEmployee.salary.conveyance + editingEmployee.salary.specialAllowance;
          if (totalEarnings > 0) {
              setGrossSalaryInput(totalEarnings.toString());
          } else {
              setGrossSalaryInput('');
          }
      }
  }, [editingEmployee?.id]); // Only run on ID change/open

  // --- HANDLERS ---

  const handleNewEmployee = () => {
    // ID Format: 91 + Sequence (e.g., 911001)
    const nextId = `91${1000 + employees.length + 1}`;
    setEditingEmployee({
      id: nextId,
      name: '', designation: '', department: '', joiningDate: new Date().toISOString().split('T')[0],
      email: '', phone: '', pan: '', branchId: branches[0]?.id || '',
      status: 'Active',
      bankDetails: { bankName: '', accountNumber: '', ifsc: '' },
      salary: { basic: 0, hra: 0, conveyance: 0, specialAllowance: 0, pfDeduction: 0, ptDeduction: 200, tdsDeduction: 0 }
    });
    setGrossSalaryInput('');
    setShowEmployeeModal(true);
  };

  const handleGrossCalculation = (value: string) => {
      setGrossSalaryInput(value);
      const gross = Number(value);
      if (!editingEmployee || isNaN(gross)) return;

      // Auto-Calculation Logic
      // 1. Basic = 50% of Gross
      const basic = Math.round(gross * 0.50);
      
      // 2. HRA = 40% of Basic
      const hra = Math.round(basic * 0.40);
      
      // 3. Conveyance = Fixed 1600 (Standard Norm) or remaining if low salary
      const conveyance = 1600;

      // 4. Special Allowance = Balancing Figure
      let special = gross - basic - hra - conveyance;
      if (special < 0) {
          // Adjust for very low salaries where formula exceeds gross
          special = 0;
      }

      // Deductions
      // 5. PF = 12% of Basic
      const pf = Math.round(basic * 0.12);

      // 6. PT = 200 if Gross > 15000, else 0 (Karnataka/General rule)
      const pt = gross >= 15000 ? 200 : 0;

      setEditingEmployee({
          ...editingEmployee,
          salary: {
              basic,
              hra,
              conveyance,
              specialAllowance: special,
              pfDeduction: pf,
              ptDeduction: pt,
              tdsDeduction: 0 // Default
          }
      });
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

  const downloadCSVTemplate = () => {
      const headers = "EmployeeCode,EmployeeName,LOP_Days,Incentive_Amount,Leave_Encashment_Days,Advance_Salary";
      const rows = employees.filter(e => e.status === 'Active').map(e => 
          `${e.id},${e.name.replace(/,/g, '')},0,0,0,0`
      ).join('\n');
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Payroll_Attendance_Template_${selectedMonth.replace(' ', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setProcessStep('Parsing CSV Data...');
      setProcessSuccess(false);

      // Animation delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 1000));

      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) {
              setIsProcessing(false);
              return;
          }

          const lines = text.split('\n');
          const newLop: { [key: string]: number } = {};
          const newIncentive: { [key: string]: number } = {};
          const newEncash: { [key: string]: number } = {};
          const newAdvance: { [key: string]: number } = {};
          let processedCount = 0;

          setProcessStep('Updating Attendance Records...');
          await new Promise(resolve => setTimeout(resolve, 800));

          // Skip header (index 0)
          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const parts = line.split(',');
              if (parts.length >= 6) {
                  const empId = parts[0].trim();
                  // Validate if employee exists
                  if (employees.some(e => e.id === empId)) {
                      newLop[empId] = parseFloat(parts[2]) || 0;
                      newIncentive[empId] = parseFloat(parts[3]) || 0;
                      newEncash[empId] = parseFloat(parts[4]) || 0;
                      newAdvance[empId] = parseFloat(parts[5]) || 0;
                      processedCount++;
                  }
              }
          }

          setLopData(prev => ({ ...prev, ...newLop }));
          setIncentiveData(prev => ({ ...prev, ...newIncentive }));
          setEncashData(prev => ({ ...prev, ...newEncash }));
          setAdvanceData(prev => ({ ...prev, ...newAdvance }));
          
          setProcessStep(`Imported ${processedCount} Records!`);
          setProcessSuccess(true);
          
          setTimeout(() => {
              setIsProcessing(false);
              // Reset input
              if (csvInputRef.current) csvInputRef.current.value = '';
          }, 1200);
      };
      reader.readAsText(file);
  };

  const calculatePayrollPreview = async () => {
    setIsProcessing(true);
    setProcessStep('Calculating Earnings & Deductions...');
    setProcessSuccess(false);

    // Simulate Calculation Step
    await new Promise(resolve => setTimeout(resolve, 1500));

    setProcessStep('Generating Payslips...');
    await new Promise(resolve => setTimeout(resolve, 800));

    const draftRecords: PayrollRecord[] = employees.filter(e => e.status === 'Active').map(emp => {
      const daysInMonth = 30; // Standardize for simplicity
      const lopDays = lopData[emp.id] || 0;
      const presentDays = Math.max(0, daysInMonth - lopDays);
      const lopFactor = presentDays / daysInMonth;

      // Earnings (Pro-rated)
      const earnedBasic = Math.round(emp.salary.basic * lopFactor);
      const earnedHra = Math.round(emp.salary.hra * lopFactor);
      const earnedConv = Math.round(emp.salary.conveyance * lopFactor);
      const earnedSpecial = Math.round(emp.salary.specialAllowance * lopFactor);
      const incentive = incentiveData[emp.id] || 0;

      // Leave Encashment Calculation: (Basic / 30) * Encash Days
      const encashDays = encashData[emp.id] || 0;
      const leaveEncashment = encashDays > 0 
          ? Math.round((emp.salary.basic / 30) * encashDays) 
          : 0;

      const totalEarnings = earnedBasic + earnedHra + earnedConv + earnedSpecial + incentive + leaveEncashment;

      // Deductions
      const pf = Math.round(emp.salary.pfDeduction); 
      const pt = emp.salary.ptDeduction;
      const tds = emp.salary.tdsDeduction;
      const advance = advanceData[emp.id] || 0;
      
      const totalDeductions = pf + pt + tds + advance;
      
      // Payslip Serial Code
      const serialCode = `${emp.id}${Date.now().toString().slice(-4)}`;

      return {
        id: `PAY-${Date.now()}-${emp.id}`,
        payslipNo: serialCode,
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
          incentive,
          leaveEncashment
        },
        deductions: {
          pf, pt, tds, advanceSalary: advance, lopAmount: 0 
        },
        grossPay: totalEarnings,
        totalDeductions,
        netPay: totalEarnings - totalDeductions,
        status: 'Draft',
        generatedDate: new Date().toISOString()
      };
    });

    onProcessPayroll(draftRecords);
    
    setProcessStep('Payroll Processed Successfully!');
    setProcessSuccess(true);

    setTimeout(() => {
        setIsProcessing(false);
        setActiveTab('register');
    }, 1000);
  };

  const handlePrintPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
    const originalTitle = document.title;
    
    // Auto-download Format: Payslip-911001_April25
    const monthShort = record.month.split(' ')[0]; // Take first word of "April 2025"
    const yearShort = record.year.toString().slice(-2);
    document.title = `Payslip-${record.employeeId}_${monthShort}${yearShort}`; 
    
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setViewingPayslip(null);
      document.title = originalTitle; // Restore
    }, 500);
  };

  // --- RENDERERS ---

  const ProcessingOverlay = () => (
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 rounded-2xl">
          {!processSuccess ? (
              <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-blue-100 border-t-[#0854a0] rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Settings size={24} className="text-[#0854a0] animate-pulse" />
                      </div>
                  </div>
                  <h3 className="text-xl font-black text-[#1c2d3d] animate-pulse">{processStep}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">Please Wait</p>
              </div>
          ) : (
              <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-50 text-emerald-600">
                      <Check size={40} strokeWidth={4} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800">{processStep}</h3>
              </div>
          )}
      </div>
  );

  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
    const emp = employees.find(e => e.id === record.employeeId);
    // Determine Branch details for display
    const branch = branches.find(b => b.id === record.branchId) || branches[0];
    const branchName = branch ? branch.name : 'Head Office';
    const branchLocation = branch ? branch.address.city : 'Bengaluru';

    // Unique QR Code generation for scanner
    const qrValue = generateSecureQR({
        type: 'PAYSLIP',
        id: record.id,
        empId: record.employeeId,
        month: record.month,
        netPay: record.netPay,
        generatedDate: record.generatedDate
    });

    return (
      <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] text-black font-sans text-[11px] leading-tight relative print:p-[10mm]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
           <img src={COMPANY_LOGO} className="h-16 object-contain" />
           <div className="text-right">
              <h1 className="text-xl font-bold uppercase tracking-tight text-black">{COMPANY_NAME}</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{branchName}</p>
           </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6 flex justify-between items-center px-4">
            <div className="text-left">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Payslip No</p>
                <p className="font-mono font-bold text-sm">{record.payslipNo || 'N/A'}</p>
            </div>
            <h2 className="text-[#0854a0] font-bold text-sm uppercase tracking-wide">Payslip for {record.month}</h2>
            <div className="text-right">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Generated</p>
                <p className="font-bold text-[10px]">{new Date(record.generatedDate).toLocaleDateString()}</p>
            </div>
        </div>

        {/* Main Content Border Box */}
        <div className="border-2 border-black">
            {/* Employee Details */}
            <div className="grid grid-cols-2 border-b-2 border-black p-4 gap-y-1 gap-x-8">
                <div className="space-y-1.5">
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Employee ID</span><span className="font-bold">: {record.employeeId}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Date of Birth</span><span className="font-bold">: {emp ? '01-Jan-1990' : 'N/A'}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Designation</span><span className="font-bold">: {record.designation}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Department</span><span className="font-bold">: {emp?.department}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">PF Number</span><span className="font-bold">: BLR/12345/000</span></div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Employee Name</span><span className="font-bold">: {record.employeeName}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Joining Date</span><span className="font-bold">: {emp?.joiningDate}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Location</span><span className="font-bold">: {branchLocation}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">PAN Number</span><span className="font-bold">: {emp?.pan}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">UAN Number</span><span className="font-bold">: 100000000000</span></div>
                </div>
            </div>

            {/* Financials Grid */}
            <div className="flex min-h-[300px]">
                {/* Earnings */}
                <div className="w-[40%] border-r-2 border-black flex flex-col">
                    <div className="font-bold border-b border-black p-1.5 bg-gray-100 flex justify-between">
                        <span>EARNINGS</span>
                        <span>Amount (Rs.)</span>
                    </div>
                    <div className="p-2 space-y-3 flex-1">
                        <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium">{record.earnings.basic.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span>House Rent Allowance</span><span className="font-medium">{record.earnings.hra.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span>Conveyance</span><span className="font-medium">{record.earnings.conveyance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span>Special Allowance</span><span className="font-medium">{record.earnings.specialAllowance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        {record.earnings.incentive > 0 && <div className="flex justify-between"><span>Incentive / Bonus</span><span className="font-medium">{record.earnings.incentive.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>}
                        {(record.earnings.leaveEncashment || 0) > 0 && <div className="flex justify-between"><span>Leave Encashment</span><span className="font-medium">{record.earnings.leaveEncashment.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>}
                    </div>
                    <div className="border-t border-black p-2 font-bold flex justify-between bg-gray-50 mt-auto">
                        <span>Total Earnings Rs.</span>
                        <span>{record.grossPay.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                {/* Deductions */}
                <div className="w-[30%] border-r-2 border-black flex flex-col">
                    <div className="font-bold border-b border-black p-1.5 bg-gray-100 flex justify-between">
                        <span>DEDUCTIONS</span>
                        <span>Amount (Rs.)</span>
                    </div>
                    <div className="p-2 space-y-3 flex-1">
                        <div className="flex justify-between"><span>Provident Fund</span><span className="font-medium">{record.deductions.pf.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span>Professional Tax</span><span className="font-medium">{record.deductions.pt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span>Tax Deducted (TDS)</span><span className="font-medium">{record.deductions.tds.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        {(record.deductions.advanceSalary || 0) > 0 && (
                            <div className="flex justify-between text-rose-600"><span>Advance Salary</span><span className="font-bold">{record.deductions.advanceSalary.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        )}
                    </div>
                    <div className="border-t border-black p-2 font-bold flex justify-between bg-gray-50 mt-auto">
                        <span>Total Deductions Rs.</span>
                        <span>{record.totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                {/* Summary / Attendance */}
                <div className="w-[30%] flex flex-col">
                    <div className="p-3 space-y-3 border-b border-black flex-1">
                        <div className="flex justify-between"><span className="font-bold text-gray-600">STANDARD DAYS</span><span className="font-bold">: {record.totalDays}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-gray-600">DAYS WORKED</span><span className="font-bold">: {record.presentDays}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-gray-600">LOP DAYS</span><span className="font-bold text-red-600">: {record.lopDays}</span></div>
                    </div>
                    <div className="p-3 border-b border-black flex-1 bg-gray-50/50">
                        <div className="font-bold mb-2 underline decoration-gray-300 underline-offset-4">PAYMENT DETAILS</div>
                        <div className="space-y-2 text-[10px]">
                            <div className="flex"><span className="w-16 font-bold text-gray-500">PAYMENT</span><span className="font-bold">: BANK TRANSFER</span></div>
                            <div className="flex"><span className="w-16 font-bold text-gray-500">BANK</span><span className="font-bold uppercase">: {emp?.bankDetails.bankName || 'N/A'}</span></div>
                            <div className="flex"><span className="w-16 font-bold text-gray-500">A/C No.</span><span className="font-bold">: {emp?.bankDetails.accountNumber || 'N/A'}</span></div>
                        </div>
                    </div>
                    <div className="p-3 bg-[#f0f0f0] font-black text-right border-t-2 border-black h-16 flex flex-col justify-center">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Net Salary Rs.</span>
                        <span className="text-xl">{record.netPay.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
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
        <div className="mt-6 flex flex-col items-center justify-center">
             <QRCode value={qrValue} size={80} level="M" />
             <p className="text-[9px] font-bold mt-1 text-gray-500 uppercase tracking-widest">Scan to Verify</p>
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
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:border-[#0854a0] w-64"
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
                                <div className="flex justify-end space-x-2">
                                    <button 
                                        onClick={() => onResetAccess && onResetAccess(emp)} 
                                        className="text-emerald-500 hover:bg-emerald-50 p-2 rounded-lg font-bold text-xs" 
                                        title="Reset Portal Access"
                                    >
                                        <Key size={14} />
                                    </button>
                                    <button onClick={() => { setEditingEmployee(emp); setShowEmployeeModal(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg font-bold text-xs">Edit</button>
                                </div>
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
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
            
            {/* Processing Overlay */}
            {isProcessing && <ProcessingOverlay />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-100 pb-6 gap-4">
               <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Run Payroll</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">Step 1: Input LOP, Incentives, Encashments & Advances</p>
               </div>
               
               <div className="flex items-center space-x-4">
                  {/* CSV Actions */}
                  <button onClick={downloadCSVTemplate} className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                      <FileDown size={14} className="mr-1.5" /> Template
                  </button>
                  <div className="relative">
                      <input 
                          type="file" 
                          ref={csvInputRef} 
                          accept=".csv" 
                          className="hidden" 
                          onChange={handleCSVImport}
                      />
                      <button onClick={() => csvInputRef.current?.click()} className="text-emerald-600 hover:text-emerald-800 text-[10px] font-bold flex items-center bg-emerald-50 px-3 py-2 rounded-lg transition-colors">
                          <Upload size={14} className="mr-1.5" /> Import CSV
                      </button>
                  </div>

                  <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>

                  <div className="flex flex-col">
                     <label className="text-[9px] font-black text-gray-400 uppercase">Payroll Month</label>
                     <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                     >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => {
                            const year = new Date().getFullYear();
                            const val = `${m} ${year}`;
                            return <option key={val} value={val}>{val}</option>
                        })}
                     </select>
                  </div>
                  <button onClick={calculatePayrollPreview} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center">
                     <Banknote size={16} className="mr-2" /> Process Salaries
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <div className="min-w-full inline-block align-middle">
                   <div className="border border-gray-100 rounded-xl overflow-hidden">
                       <table className="min-w-full divide-y divide-gray-100">
                           <thead className="bg-gray-50">
                               <tr>
                                   <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">Employee</th>
                                   <th scope="col" className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-wider">LOP Days</th>
                                   <th scope="col" className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-wider">Incentive (₹)</th>
                                   <th scope="col" className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-wider">Encash Days</th>
                                   <th scope="col" className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-wider">Advance (₹)</th>
                               </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-100">
                               {employees.filter(e => e.status === 'Active').map(emp => (
                                  <tr key={emp.id} className="hover:bg-blue-50/20">
                                     <td className="px-6 py-4 whitespace-nowrap">
                                         <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-blue-600 mr-3">{emp.name.charAt(0)}</div>
                                            <div>
                                               <p className="font-bold text-gray-800 text-xs">{emp.name}</p>
                                               <p className="text-[10px] text-gray-400 font-mono">{emp.id}</p>
                                            </div>
                                         </div>
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <input 
                                            type="number" 
                                            min="0" max="30"
                                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                                            value={lopData[emp.id] || 0}
                                            onChange={e => setLopData({...lopData, [emp.id]: Number(e.target.value)})}
                                         />
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <input 
                                            type="number" 
                                            min="0"
                                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                            value={incentiveData[emp.id] || 0}
                                            onChange={e => setIncentiveData({...incentiveData, [emp.id]: Number(e.target.value)})}
                                         />
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <input 
                                            type="number" 
                                            min="0"
                                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            value={encashData[emp.id] || 0}
                                            onChange={e => setEncashData({...encashData, [emp.id]: Number(e.target.value)})}
                                         />
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <input 
                                            type="number" 
                                            min="0"
                                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                                            value={advanceData[emp.id] || 0}
                                            onChange={e => setAdvanceData({...advanceData, [emp.id]: Number(e.target.value)})}
                                         />
                                     </td>
                                  </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
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

      {/* === ADD/EDIT EMPLOYEE MODAL (UPDATED UI) === */}
      {showEmployeeModal && editingEmployee && (
         <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
               <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div>
                      <h3 className="text-2xl font-black text-[#1c2d3d] uppercase tracking-tight">Employee Master</h3>
                      <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-1">Personnel Data & Compensation Structure</p>
                  </div>
                  <button onClick={() => setShowEmployeeModal(false)} className="p-3 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all shadow-sm border border-gray-100"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                     
                     {/* COLUMN 1: Personal Details */}
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center pb-2 border-b border-gray-100"><Briefcase size={14} className="mr-2 text-[#0854a0]" /> Personal Profile</h4>
                        
                        <div className="space-y-4">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Full Name</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} placeholder="e.g. Rahul Sharma" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Employee Code</label><input className="w-full bg-gray-100 border-2 border-transparent rounded-xl px-4 py-3 text-xs font-mono font-bold text-gray-500 cursor-not-allowed" value={editingEmployee.id} disabled /></div>
                           
                           {/* Branch Selector */}
                           <div className="space-y-1.5">
                               <label className="text-[10px] font-bold text-gray-500 uppercase">Branch Assignment</label>
                               <select 
                                   className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none cursor-pointer"
                                   value={editingEmployee.branchId}
                                   onChange={e => setEditingEmployee({...editingEmployee, branchId: e.target.value})}
                               >
                                   <option value="">Select Branch</option>
                                   {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                               </select>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Designation</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Department</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.department} onChange={e => setEditingEmployee({...editingEmployee, department: e.target.value})} /></div>
                           </div>

                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Official Email</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Phone Number</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.phone} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} /></div>
                           
                           <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Joining Date</label><input type="date" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">PAN Number</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold uppercase transition-all outline-none" value={editingEmployee.pan} onChange={e => setEditingEmployee({...editingEmployee, pan: e.target.value})} /></div>
                           </div>
                        </div>
                     </div>

                     {/* COLUMN 2: Salary Structure with Auto Calc */}
                     <div className="space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center"><Calculator size={14} className="mr-2 text-emerald-600" /> Salary Structure</h4>
                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100">Monthly</span>
                        </div>

                        {/* Gross Salary Auto-Calc Input */}
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                            <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center">
                                Gross Monthly Salary
                                {grossSalaryInput && <span className="ml-2 bg-emerald-200 text-emerald-800 text-[8px] px-1.5 rounded">CALCULATED</span>}
                            </label>
                            <input 
                                type="number" 
                                className="w-full bg-white border-2 border-emerald-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-lg font-black text-emerald-900 transition-all outline-none" 
                                placeholder="e.g. 50000"
                                value={grossSalaryInput}
                                onChange={(e) => handleGrossCalculation(e.target.value)}
                            />
                            <p className="text-[9px] text-emerald-600 font-medium leading-tight">
                                Entering amount here auto-fills the breakdown below based on standard norms (Basic 50%, HRA 40%, etc).
                            </p>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                               <label className="text-[10px] font-bold text-gray-500 uppercase">Basic Pay</label>
                               <input type="number" className="w-32 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-right font-bold focus:border-blue-500 outline-none" value={editingEmployee.salary?.basic} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, basic: Number(e.target.value) }})} />
                           </div>
                           <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                               <label className="text-[10px] font-bold text-gray-500 uppercase">HRA</label>
                               <input type="number" className="w-32 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-right font-bold focus:border-blue-500 outline-none" value={editingEmployee.salary?.hra} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, hra: Number(e.target.value) }})} />
                           </div>
                           <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                               <label className="text-[10px] font-bold text-gray-500 uppercase">Conveyance</label>
                               <input type="number" className="w-32 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-right font-bold focus:border-blue-500 outline-none" value={editingEmployee.salary?.conveyance} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, conveyance: Number(e.target.value) }})} />
                           </div>
                           <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                               <label className="text-[10px] font-bold text-gray-500 uppercase">Special Allow.</label>
                               <input type="number" className="w-32 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-right font-bold focus:border-blue-500 outline-none" value={editingEmployee.salary?.specialAllowance} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, specialAllowance: Number(e.target.value) }})} />
                           </div>
                           
                           <div className="pt-2 border-t border-dashed border-gray-200 grid grid-cols-2 gap-3">
                               <div className="flex flex-col bg-rose-50 p-2 rounded-xl border border-rose-100">
                                   <label className="text-[9px] font-black text-rose-600 uppercase mb-1">PF Deduction</label>
                                   <input type="number" className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 focus:border-rose-500 outline-none" value={editingEmployee.salary?.pfDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, pfDeduction: Number(e.target.value) }})} />
                               </div>
                               <div className="flex flex-col bg-rose-50 p-2 rounded-xl border border-rose-100">
                                   <label className="text-[9px] font-black text-rose-600 uppercase mb-1">Prof. Tax</label>
                                   <input type="number" className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 focus:border-rose-500 outline-none" value={editingEmployee.salary?.ptDeduction} onChange={e => setEditingEmployee({...editingEmployee, salary: { ...editingEmployee.salary!, ptDeduction: Number(e.target.value) }})} />
                               </div>
                           </div>
                        </div>
                     </div>

                     {/* COLUMN 3: Bank & Access */}
                     <div className="space-y-8">
                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center pb-2 border-b border-gray-100"><CreditCard size={14} className="mr-2 text-purple-600" /> Banking Details</h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Bank Name</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none" value={editingEmployee.bankDetails?.bankName} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, bankName: e.target.value }})} /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">Account Number</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold font-mono transition-all outline-none" value={editingEmployee.bankDetails?.accountNumber} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, accountNumber: e.target.value }})} /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-gray-500 uppercase">IFSC Code</label><input className="w-full bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-xl px-4 py-3 text-xs font-bold font-mono uppercase transition-all outline-none" value={editingEmployee.bankDetails?.ifsc} onChange={e => setEditingEmployee({...editingEmployee, bankDetails: { ...editingEmployee.bankDetails!, ifsc: e.target.value }})} /></div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <h4 className="text-[10px] font-black text-[#0854a0] uppercase tracking-widest mb-4 flex items-center"><Key size={12} className="mr-2" /> Portal Access Credentials</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs font-medium text-gray-600 border-b border-blue-100 pb-2">
                                    <span>Login ID</span>
                                    <span className="font-mono font-bold text-[#0854a0]">{editingEmployee.id}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                                    <span>Default Password</span>
                                    <span className="font-mono font-bold text-[#0854a0]">{editingEmployee.id}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-start text-[9px] text-blue-400 font-bold leading-relaxed">
                                <AlertCircle size={12} className="mr-1.5 mt-0.5 shrink-0" />
                                Credentials are auto-generated. Employees can change password after first login.
                            </div>
                        </div>
                     </div>

                  </div>
               </div>

               <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-4">
                  <button onClick={() => setShowEmployeeModal(false)} className="px-8 py-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all uppercase tracking-widest">Cancel</button>
                  <button onClick={saveEmployee} className="px-10 py-4 rounded-xl bg-[#0854a0] text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-[#064280] transition-all flex items-center active:scale-95">
                     <Save size={16} className="mr-2" /> Commit Record
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Payroll;