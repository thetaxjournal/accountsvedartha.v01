import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  LogOut, 
  User, 
  FileText, 
  Download, 
  Printer, 
  Calendar,
  Briefcase,
  Building2,
  Phone
} from 'lucide-react';
import { Employee, PayrollRecord } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, LOGO_DARK_BG } from '../constants';

interface EmployeePortalProps {
  employee: Employee | undefined;
  payrollRecords: PayrollRecord[];
  onLogout: () => void;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ employee, payrollRecords, onLogout }) => {
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setViewingPayslip(null);
    }, 500);
  };

  // Reusing the Payslip Document Component Logic locally to be self-contained
  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
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
              <div className="flex justify-between"><span className="font-bold text-gray-500">Date of Joining</span><span className="font-bold">{employee?.joiningDate}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Bank Account</span><span className="font-bold">{employee?.bankDetails.accountNumber}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">PAN Number</span><span className="font-bold">{employee?.pan}</span></div>
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

  if (!employee) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
              <p className="text-gray-500 font-bold mb-4">Employee Record Not Found or Inactive.</p>
              <button onClick={onLogout} className="text-blue-600 underline">Logout</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f7] font-sans">
      {/* Hidden Print Portal */}
      {isPrinting && viewingPayslip && createPortal(<PayslipDocument record={viewingPayslip} />, document.getElementById('print-portal')!)}

      {/* Header */}
      <header className="bg-[#1c2d3d] text-white py-4 px-4 md:px-8 shadow-lg">
         <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <img src={LOGO_DARK_BG} alt="Logo" className="h-10 md:h-12 object-contain" />
               <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>
               <div>
                  <h1 className="text-sm md:text-lg font-bold tracking-tight">Employee Self Service</h1>
                  <p className="text-[10px] text-blue-300 font-mono mt-0.5">{employee.id}</p>
               </div>
            </div>
            <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
               <LogOut size={14} className="mr-2" /> <span className="hidden md:inline">Sign Out</span>
            </button>
         </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
         {/* Profile Card */}
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-[#0854a0] rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {employee.name.charAt(0)}
            </div>
            
            <div className="flex-1 z-10">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{employee.name}</h2>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 mt-2">
                    <span className="flex items-center"><Briefcase size={14} className="mr-1.5 text-blue-500" /> {employee.designation}</span>
                    <span className="flex items-center"><Building2 size={14} className="mr-1.5 text-blue-500" /> {employee.department}</span>
                    <span className="flex items-center"><Calendar size={14} className="mr-1.5 text-blue-500" /> Joined: {employee.joiningDate}</span>
                    <span className="flex items-center"><Phone size={14} className="mr-1.5 text-blue-500" /> {employee.phone}</span>
                </div>
            </div>

            <div className="z-10 flex flex-col items-end">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${employee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {employee.status}
                </span>
            </div>
         </div>

         {/* Payslips Section */}
         <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-gray-800 tracking-tight flex items-center">
                        <FileText size={20} className="mr-2 text-[#0854a0]" /> My Payslips
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Salary & Compensation History</p>
                </div>
            </div>

            <div className="p-6">
                {payrollRecords.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <FileText size={24} className="text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">No Payslips Generated Yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {payrollRecords.map(record => (
                            <div key={record.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all group bg-white relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{record.year}</p>
                                        <h4 className="text-lg font-bold text-gray-900">{record.month}</h4>
                                    </div>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-[#0854a0] group-hover:text-white transition-colors">
                                        <FileText size={18} />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 border-t border-gray-50 pt-4 mb-6">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Gross Earnings</span>
                                        <span className="font-bold">₹ {record.grossPay.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Deductions</span>
                                        <span className="font-bold text-rose-500">- ₹ {record.totalDeductions.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                                        <span className="font-black text-gray-800">Net Pay</span>
                                        <span className="font-black text-[#0854a0]">₹ {record.netPay.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handlePrintPayslip(record)}
                                    className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#0854a0] hover:text-white transition-all flex items-center justify-center"
                                >
                                    <Download size={14} className="mr-2" /> Download PDF
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
         </div>
      </main>
    </div>
  );
};

export default EmployeePortal;