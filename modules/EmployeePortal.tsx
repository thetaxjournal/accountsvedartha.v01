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
  Phone,
  Settings,
  X,
  Lock,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Employee, PayrollRecord, Branch } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, LOGO_DARK_BG, generateSecureQR } from '../constants';
import QRCode from 'react-qr-code';

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
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePrintPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
    const originalTitle = document.title;
    document.title = `Payslip_${record.employeeId}`; // Dynamic Filename
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setViewingPayslip(null);
      document.title = originalTitle; // Restore original title
    }, 500);
  };

  const handleCredentialUpdate = async () => {
      if (!newLoginId || !newPassword) return alert("Please fill in both fields.");
      setIsUpdating(true);
      try {
          await onUpdateCredentials(newLoginId, newPassword);
          setNewLoginId('');
          setNewPassword('');
          setShowSettings(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsUpdating(false);
      }
  };

  const handleGoogleLink = async () => {
      setIsUpdating(true);
      try {
          await onLinkGoogle();
          setShowSettings(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsUpdating(false);
      }
  };

  // Reusing the Payslip Document Component Logic locally to be self-contained
  const PayslipDocument = ({ record }: { record: PayrollRecord }) => {
    // Note: 'employee' prop is already the logged-in employee context
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
        <div className="text-center mb-6">
            <h2 className="text-[#0854a0] font-bold text-sm uppercase tracking-wide">Payslip for the month of {record.month}</h2>
        </div>

        {/* Main Content Border Box */}
        <div className="border-2 border-black">
            {/* Employee Details */}
            <div className="grid grid-cols-2 border-b-2 border-black p-4 gap-y-1 gap-x-8">
                <div className="space-y-1.5">
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Employee ID</span><span className="font-bold">: {record.employeeId}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Date of Birth</span><span className="font-bold">: {employee ? '01-Jan-1990' : 'N/A'}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Designation</span><span className="font-bold">: {record.designation}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">Department</span><span className="font-bold">: {employee?.department}</span></div>
                    <div className="flex"><span className="w-28 font-bold text-gray-700">PF Number</span><span className="font-bold">: BLR/12345/000</span></div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Employee Name</span><span className="font-bold">: {record.employeeName}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Joining Date</span><span className="font-bold">: {employee?.joiningDate}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">Location</span><span className="font-bold">: {branchLocation}</span></div>
                    <div className="flex"><span className="w-32 font-bold text-gray-700">PAN Number</span><span className="font-bold">: {employee?.pan}</span></div>
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
                            <div className="flex"><span className="w-16 font-bold text-gray-500">BANK</span><span className="font-bold uppercase">: {employee?.bankDetails.bankName || 'N/A'}</span></div>
                            <div className="flex"><span className="w-16 font-bold text-gray-500">A/C No.</span><span className="font-bold">: {employee?.bankDetails.accountNumber || 'N/A'}</span></div>
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
            <div className="flex items-center space-x-3">
                <button onClick={() => setShowSettings(true)} className="flex items-center text-xs font-bold bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20 transition-all">
                    <Settings size={14} className="md:mr-2" /> <span className="hidden md:inline">Security</span>
                </button>
                <button onClick={onLogout} className="flex items-center text-xs font-bold bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
                    <LogOut size={14} className="mr-2" /> <span className="hidden md:inline">Sign Out</span>
                </button>
            </div>
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

      {/* Security Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
              <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-gray-800">Security Settings</h3>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                          <X size={20} className="text-gray-400" />
                      </button>
                  </div>

                  <div className="space-y-8">
                      {/* Change Credentials */}
                      <div className="space-y-4">
                          <h4 className="text-xs font-black text-[#0854a0] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center">
                              <Lock size={12} className="mr-1.5" /> Update Credentials
                          </h4>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">New Login ID / Email</label>
                              <input 
                                  type="text" 
                                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:border-[#0854a0] outline-none mt-1 transition-all"
                                  placeholder="Enter new Login ID"
                                  value={newLoginId}
                                  onChange={(e) => setNewLoginId(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">New Password</label>
                              <input 
                                  type="password" 
                                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:border-[#0854a0] outline-none mt-1 transition-all"
                                  placeholder="Enter new Password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                              />
                          </div>
                          <button 
                              onClick={handleCredentialUpdate}
                              disabled={isUpdating}
                              className="w-full bg-[#0854a0] text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280] transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
                          >
                              {isUpdating ? 'Updating...' : <><Save size={14} className="mr-2" /> Save Changes</>}
                          </button>
                      </div>

                      {/* Google Link */}
                      <div className="space-y-4 pt-2">
                          <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center">
                              <User size={12} className="mr-1.5" /> Social Login
                          </h4>
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <p className="text-[11px] font-medium text-gray-600 mb-4 leading-relaxed">
                                  Link your Google Account to login instantly without a password. This will update your registered email to your Google email.
                              </p>
                              <button 
                                  onClick={handleGoogleLink}
                                  disabled={isUpdating}
                                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center shadow-sm"
                              >
                                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4 mr-2" alt="Google" />
                                  Link Google Account
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmployeePortal;