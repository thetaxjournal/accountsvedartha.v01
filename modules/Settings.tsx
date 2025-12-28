import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Lock, 
  Bell, 
  Cloud, 
  Link as LinkIcon, 
  Globe,
  Settings as SettingsIcon,
  CheckCircle2,
  Database,
  DownloadCloud,
  ShieldAlert,
  UserPlus,
  Users,
  CalendarClock,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { Invoice, Client, Branch, Payment, UserRole, UserProfile, AppNotification } from '../types';

interface SettingsProps {
  state?: {
    invoices: Invoice[];
    clients: Client[];
    branches: Branch[];
    payments: Payment[];
    notifications?: AppNotification[];
  };
  onAddUser?: (user: Omit<UserProfile, 'uid'>) => Promise<void>;
  onPurgeData?: () => Promise<void>;
  onCloseFinancialYear?: () => Promise<void>;
  onRestoreData?: (data: any) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ state, onAddUser, onPurgeData, onCloseFinancialYear, onRestoreData }) => {
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: UserRole.ACCOUNTANT,
    branchId: 'ALL',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = () => {
    if (!state) return;
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `VEDARTHA_ERP_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (onRestoreData) {
                await onRestoreData(json);
            }
        } catch (err) {
            alert('Invalid Backup File. Please ensure it is a valid JSON file.');
        }
        // Clear input to allow re-uploading the same file if needed (conceptually "removing" it)
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.displayName || !newUser.password || !onAddUser) {
        alert("All fields including Password are required.");
        return;
    }
    setIsAddingUser(true);
    try {
      await onAddUser({
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        allowedBranchIds: newUser.branchId === 'ALL' ? [] : [newUser.branchId],
        password: newUser.password
      });
      alert('User access record created successfully. They can now log in.');
      setNewUser({ email: '', displayName: '', role: UserRole.ACCOUNTANT, branchId: 'ALL', password: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to add user record.');
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">System Configuration</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Global Master Control Panel</p>
          </div>
          <button className="px-8 py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">
            Sync Cloud Config
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          
          {/* User Management Section */}
          <div className="p-10 space-y-8">
            <div className="flex items-center space-x-3">
              <Users size={20} className="text-[#0854a0]" />
              <h3 className="font-black text-[#1c2d3d] text-sm uppercase tracking-tight">User Access Management</h3>
            </div>
            
            <div className="bg-blue-50/30 p-8 rounded-3xl border border-blue-100">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display Name</label>
                  <input 
                    type="text" 
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-xs font-bold"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email (Login ID)</label>
                  <input 
                    type="email" 
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-xs font-bold"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="user@vedartha.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</label>
                  <select 
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-xs font-bold"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  >
                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Branch Access</label>
                  <select 
                    className="w-full h-12 rounded-xl border border-gray-200 px-4 text-xs font-bold"
                    value={newUser.branchId}
                    onChange={(e) => setNewUser({...newUser, branchId: e.target.value})}
                  >
                    <option value="ALL">Global Access (All Branches)</option>
                    {state?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                
                {/* Password Field */}
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assign Password</label>
                  <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="w-full h-12 rounded-xl border border-gray-200 px-4 text-xs font-bold focus:border-[#0854a0] outline-none"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Set a secure password for this user"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleCreateUser}
                disabled={isAddingUser}
                className="flex items-center px-6 py-3 bg-[#0854a0] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#064280] transition-all shadow-lg w-full justify-center"
              >
                <UserPlus size={16} className="mr-2" /> {isAddingUser ? 'Provisioning...' : 'Provision User Access'}
              </button>
            </div>
          </div>

          {/* Maintenance & Backup Section */}
          <div className="p-10 space-y-8 bg-gray-50/20">
            <div className="flex items-center space-x-3">
              <Database size={20} className="text-blue-600" />
              <h3 className="font-black text-[#1c2d3d] text-sm uppercase tracking-tight">Database & Lifecycle Management</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                    <DownloadCloud size={32} />
                  </div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter">System Data Backup</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Export all general ledger entries, client master records, and branch configurations into a secure JSON archive.
                  </p>
                  <button 
                    onClick={handleDownloadBackup}
                    className="w-full mt-4 flex items-center justify-center px-6 py-4 bg-white border-2 border-blue-100 text-[#0854a0] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#0854a0] hover:text-white hover:border-[#0854a0] transition-all shadow-md group"
                  >
                    Download Backup File <Database size={16} className="ml-3 group-hover:scale-110 transition-transform" />
                  </button>
               </div>

               {/* Restore Action */}
               <div className="bg-white p-8 rounded-3xl border border-purple-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                    <Upload size={32} />
                  </div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter">System Restore</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Upload a previous backup file to restore database records. This will merge/overwrite existing IDs.
                  </p>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileRestore} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-4 flex items-center justify-center px-6 py-4 bg-white border-2 border-purple-100 text-purple-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-md group"
                  >
                    Upload & Restore <Upload size={16} className="ml-3 group-hover:scale-110 transition-transform" />
                  </button>
               </div>

               {/* Close Year Action */}
               <div className="bg-white p-8 rounded-3xl border border-amber-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-amber-50 rounded-2xl text-amber-500">
                    <CalendarClock size={32} />
                  </div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter">Close Financial Year</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Archives all transactions (Invoices, Receipts). Resets dashboard to zero. Client Portal retains history.
                  </p>
                  <button 
                    onClick={onCloseFinancialYear}
                    className="w-full mt-4 flex items-center justify-center px-6 py-4 bg-white border-2 border-amber-100 text-amber-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-md"
                  >
                    End Financial Year
                  </button>
               </div>

               <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-rose-50 rounded-2xl text-rose-500">
                    <ShieldAlert size={32} />
                  </div>
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-tighter">Emergency Purge</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Clear all transactional cache and reset the system to factory master data. Use with caution.
                  </p>
                  <button 
                    onClick={onPurgeData}
                    className="w-full mt-4 flex items-center justify-center px-6 py-4 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-md"
                  >
                    Reset To Master
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;