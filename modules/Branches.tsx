
import React, { useState } from 'react';
import { Branch, Address, BankDetails } from '../types';
import { Edit2, Plus, Trash2, MapPin, Building2, Globe, FileText, X, Save, Landmark, Lock, Key } from 'lucide-react';
import { INDIAN_STATES } from '../constants';

interface BranchesProps {
  branches: Branch[];
  setBranches: (branches: Branch[]) => void;
}

const Branches: React.FC<BranchesProps> = ({ branches, setBranches }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);

  const handleNewBranch = () => {
    setEditingBranch({
      id: `B00${branches.length + 1}`,
      name: '',
      contact: '',
      email: '',
      gstin: '',
      pan: '',
      invoicePrefix: 'VED-',
      nextInvoiceNumber: 1,
      address: { line1: '', city: '', state: 'Karnataka', pincode: '', country: 'INDIA' },
      bankDetails: { bankName: '', accountNumber: '', ifscCode: '', branchName: '' },
      portalUsername: '',
      portalPassword: ''
    });
    setShowModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch({ ...branch });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!editingBranch?.name || !editingBranch?.gstin) {
      alert("Branch Name and GSTIN are mandatory.");
      return;
    }
    const updated = branches.find(b => b.id === editingBranch.id)
      ? branches.map(b => b.id === editingBranch.id ? editingBranch as Branch : b)
      : [...branches, editingBranch as Branch];
    
    setBranches(updated);
    setShowModal(false);
  };

  const updateAddr = (field: keyof Address, value: string) => {
    if (!editingBranch) return;
    setEditingBranch({
      ...editingBranch,
      address: { ...((editingBranch.address || {}) as Address), [field]: value }
    });
  };

  const updateBank = (field: keyof BankDetails, value: string) => {
    if (!editingBranch) return;
    setEditingBranch({
      ...editingBranch,
      bankDetails: { ...((editingBranch.bankDetails || {}) as BankDetails), [field]: value }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently decommission this branch unit?')) {
      setBranches(branches.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white p-10 rounded-[32px] border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Branches</h3>
          <p className="text-[12px] text-gray-400 font-black uppercase tracking-[0.4em] mt-2">Multi-Branch Unit Configuration & Hierarchy</p>
        </div>
        <button 
          onClick={handleNewBranch} 
          className="flex items-center px-10 py-4 bg-[#0854a0] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-[#064280] transition-all active:scale-95"
        >
          <Plus size={20} className="mr-3" /> ADD BRANCH
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {branches.map(branch => (
          <div key={branch.id} className="bg-white rounded-[40px] border border-gray-200 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-3 transition-all group cursor-pointer">
            <div className="h-2.5 bg-[#0854a0] shadow-[0_4px_16px_rgba(8,84,160,0.3)]"></div>
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-6">
                  <div className="p-5 bg-blue-50 text-blue-600 rounded-[24px] shadow-inner group-hover:bg-[#0854a0] group-hover:text-white transition-all transform group-hover:scale-110">
                    <Building2 size={36} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg leading-tight uppercase tracking-tight">{branch.name}</h4>
                    <p className="text-[11px] text-gray-400 font-black tracking-widest mt-2">BRANCH ID: {branch.id}</p>
                  </div>
                </div>
                <div className="flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => { e.stopPropagation(); handleEditBranch(branch); }} className="p-3 bg-gray-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(branch.id); }} className="p-3 bg-gray-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-50">
                <div className="flex items-start text-[13px] text-gray-600 leading-relaxed font-bold">
                  <MapPin size={18} className="mr-4 text-blue-300 mt-1 shrink-0" />
                  <p className="uppercase">{branch.address.line1}, {branch.address.city}, {branch.address.state} - {branch.address.pincode}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 grid grid-cols-2 gap-10">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Tax Identifier</span>
                  <span className="text-sm font-mono font-black text-[#0854a0] uppercase tracking-wider">{branch.gstin}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Billing Prefix</span>
                  <span className="block text-sm font-black text-gray-800 uppercase tracking-tighter">{branch.invoicePrefix}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && editingBranch && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="bg-white w-full max-w-6xl rounded-[48px] shadow-[0_48px_160px_-16px_rgba(0,0,0,0.6)] flex flex-col border border-white/20 overflow-hidden max-h-[90vh]">
            <div className="p-10 border-b border-gray-100 bg-[#f8f9fa] flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-[#1c2d3d] uppercase tracking-tighter">Branch Architecture</h2>
                <p className="text-[12px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2">Configure Operational & Compliance Metadata</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-4 bg-white border border-gray-200 text-gray-400 rounded-full hover:shadow-lg transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-14 overflow-y-auto bg-white custom-scrollbar grid grid-cols-2 gap-20">
              {/* Left Column: Identity & Billing */}
              <div className="space-y-12">
                 <div className="space-y-8">
                    <h4 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8 flex items-center border-b border-blue-50 pb-4"><Globe size={18} className="mr-4" /> Legal Identity Records</h4>
                    <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch Name</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-black uppercase text-gray-800 text-lg focus:border-blue-600 outline-none transition-all" value={editingBranch.name} onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">GST Identification Number</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-mono font-black text-[#0854a0] text-lg focus:border-blue-600 outline-none transition-all" value={editingBranch.gstin} onChange={(e) => setEditingBranch({...editingBranch, gstin: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">PAN Account Number</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-mono font-black uppercase text-gray-800 text-lg focus:border-blue-600 outline-none transition-all" value={editingBranch.pan} onChange={(e) => setEditingBranch({...editingBranch, pan: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch Contact Email</label><input type="email" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-bold text-gray-800 text-base focus:border-blue-600 outline-none transition-all" value={editingBranch.email} onChange={(e) => setEditingBranch({...editingBranch, email: e.target.value})} /></div>
                 </div>
                 
                 <div className="space-y-8">
                    <h4 className="text-[12px] font-black text-amber-600 uppercase tracking-[0.2em] mb-8 flex items-center border-b border-amber-50 pb-4"><FileText size={18} className="mr-4" /> Invoice & Logistics</h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Voucher Prefix</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-black text-gray-800 text-lg focus:border-amber-600 outline-none transition-all" value={editingBranch.invoicePrefix} onChange={(e) => setEditingBranch({...editingBranch, invoicePrefix: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Serial Start</label><input type="number" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-black text-gray-800 text-lg focus:border-amber-600 outline-none transition-all" value={editingBranch.nextInvoiceNumber} onChange={(e) => setEditingBranch({...editingBranch, nextInvoiceNumber: Number(e.target.value)})} /></div>
                    </div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Street Terminal</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-bold text-gray-800 text-base focus:border-amber-600 outline-none transition-all" value={editingBranch.address?.line1} onChange={(e) => updateAddr('line1', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">City / Corporate HQ</label><input type="text" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-bold text-gray-800 text-base focus:border-amber-600 outline-none transition-all" value={editingBranch.address?.city} onChange={(e) => updateAddr('city', e.target.value)} /></div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">State / Province</label>
                            <select 
                                className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-bold text-gray-800 text-base focus:border-amber-600 outline-none transition-all" 
                                value={editingBranch.address?.state} 
                                onChange={(e) => updateAddr('state', e.target.value)}
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: Banking Details & Portal Access */}
              <div className="space-y-12">
                 <div className="space-y-8">
                    <h4 className="text-[12px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 flex items-center border-b border-emerald-50 pb-4"><Landmark size={18} className="mr-4" /> Banking Coordinates</h4>
                    <div className="bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Name</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-emerald-100 px-6 h-14 font-bold text-gray-800 text-lg focus:border-emerald-600 outline-none transition-all" value={editingBranch.bankDetails?.bankName} onChange={(e) => updateBank('bankName', e.target.value)} placeholder="e.g. HDFC Bank" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch Name</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-emerald-100 px-6 h-14 font-medium text-gray-800 text-base focus:border-emerald-600 outline-none transition-all" value={editingBranch.bankDetails?.branchName} onChange={(e) => updateBank('branchName', e.target.value)} placeholder="e.g. Lower Parel" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-emerald-100 px-6 h-14 font-mono font-black text-gray-800 text-lg focus:border-emerald-600 outline-none transition-all tracking-wider" value={editingBranch.bankDetails?.accountNumber} onChange={(e) => updateBank('accountNumber', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC / SWIFT Code</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-emerald-100 px-6 h-14 font-mono font-black text-gray-800 text-lg focus:border-emerald-600 outline-none transition-all" value={editingBranch.bankDetails?.ifscCode} onChange={(e) => updateBank('ifscCode', e.target.value)} />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h4 className="text-[12px] font-black text-purple-600 uppercase tracking-[0.2em] mb-8 flex items-center border-b border-purple-50 pb-4"><Key size={18} className="mr-4" /> Branch Portal Access</h4>
                    <div className="bg-purple-50/30 p-8 rounded-3xl border border-purple-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Portal Username</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-purple-100 px-6 h-14 font-bold text-gray-800 text-lg focus:border-purple-600 outline-none transition-all" value={editingBranch.portalUsername} onChange={(e) => setEditingBranch({...editingBranch, portalUsername: e.target.value})} placeholder="e.g. bangalore_admin" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Portal Password</label>
                            <input type="text" className="w-full bg-white rounded-2xl border-2 border-purple-100 px-6 h-14 font-bold text-gray-800 text-lg focus:border-purple-600 outline-none transition-all" value={editingBranch.portalPassword} onChange={(e) => setEditingBranch({...editingBranch, portalPassword: e.target.value})} placeholder="Enter secure password" />
                        </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-10 border-t border-gray-100 flex justify-end space-x-6 bg-[#f8f9fa] shadow-[0_-12px_40px_rgba(0,0,0,0.05)]">
              <button onClick={() => setShowModal(false)} className="px-12 py-4 border-2 border-gray-200 rounded-2xl text-[12px] font-black uppercase tracking-widest text-gray-600 hover:bg-white transition-all shadow-sm">Cancel Operation</button>
              <button 
                onClick={handleSave} 
                className="px-20 py-4 bg-[#0854a0] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-[#064280] transition-all active:scale-95 flex items-center group"
              >
                <Save size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Commit Branch Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
