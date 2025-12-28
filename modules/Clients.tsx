
import React, { useState } from 'react';
import { Search, Plus, Edit2, Shield, Trash2, MapPin, CreditCard, PieChart, X, Save, CheckCircle2, AlertCircle, Key, Lock, Copy } from 'lucide-react';
import { Client, Branch, Address } from '../types';
import { INDIAN_STATES } from '../constants';

interface ClientsProps {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  branches: Branch[];
  onDeleteClient?: (id: string) => void; // New Prop
}

const Clients: React.FC<ClientsProps> = ({ clients, setClients, branches, onDeleteClient }) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewClient = () => {
    // Client ID now starts with C1548 as requested
    setEditingClient({
      id: `C1548${Date.now().toString().slice(-4)}`,
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstin: '',
      status: 'Active',
      branchIds: branches.map(b => b.id),
      billingAddress: { line1: '', city: '', state: 'Karnataka', pincode: '', country: 'INDIA' },
      shippingAddress: { line1: '', city: '', state: 'Karnataka', pincode: '', country: 'INDIA' },
      portalAccess: false,
      portalPassword: ''
    });
    setActiveTab(0);
    setShowModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
    setActiveTab(0);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!editingClient?.name || !editingClient?.gstin) {
      alert("Client name and Gstin are mandatory fields.");
      return;
    }
    const updatedList = clients.find(c => c.id === editingClient.id)
      ? clients.map(c => c.id === editingClient.id ? editingClient as Client : c)
      : [...clients, editingClient as Client];
    
    setClients(updatedList);
    setShowModal(false);
  };

  const generatePassword = () => {
    // Set password same as Client ID as requested
    if (editingClient?.id) {
        setEditingClient({ ...editingClient, portalAccess: true, portalPassword: editingClient.id });
    }
  };

  const updateAddr = (type: 'billingAddress' | 'shippingAddress', field: keyof Address, value: string) => {
    if (!editingClient) return;
    setEditingClient({
      ...editingClient,
      [type]: { ...((editingClient[type] || {}) as Address), [field]: value }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center flex-1 max-w-2xl relative group">
          <Search className="absolute left-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search clients (Name, Gst)..." 
            className="w-full pl-14 pr-6 py-4 border-2 border-gray-100 rounded-2xl text-base font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={handleNewClient}
          className="flex items-center px-10 py-4 bg-[#0854a0] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#064280] shadow-xl shadow-blue-100 transition-all active:scale-95"
        >
          <Plus size={18} className="mr-3" /> New client
        </button>
      </div>

      {/* Clients List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold tracking-tight">
            <tr>
              <th className="px-10 py-6 text-[12px]">Client id</th>
              <th className="px-10 py-6 text-[12px]">Legal name</th>
              <th className="px-10 py-6 text-[12px]">Tax identifier</th>
              <th className="px-10 py-6 text-[12px]">Contact point</th>
              <th className="px-10 py-6 text-center text-[12px]">Portal Access</th>
              <th className="px-10 py-6 text-right text-[12px]">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClients.map(client => (
              <tr key={client.id} className="hover:bg-blue-50/40 transition-all group">
                <td className="px-10 py-6 font-mono font-bold text-gray-400 text-sm">{client.id}</td>
                <td className="px-10 py-6">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 group-hover:text-[#0854a0] tracking-tight text-base">{client.name}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{client.email}</span>
                  </div>
                </td>
                <td className="px-10 py-6 font-mono text-[#0854a0] font-bold text-sm">{client.gstin}</td>
                <td className="px-10 py-6 font-medium text-gray-600 text-sm">{client.contactPerson}</td>
                <td className="px-10 py-6 text-center">
                  <span className={`px-4 py-1.5 rounded-full font-bold text-[10px] border ${client.portalAccess ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {client.portalAccess ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleEditClient(client)} 
                        className="p-3 hover:bg-blue-600 hover:text-white rounded-xl transition-all text-gray-400"
                        title="Edit Details"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteClient && onDeleteClient(client.id)}
                        className="p-3 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-gray-300 hover:shadow-lg"
                        title="Delete Client"
                      >
                        <Trash2 size={18} />
                      </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Master Data Modal */}
      {showModal && editingClient && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[1400px] rounded-[32px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh] border border-white/20 overflow-hidden">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa] shadow-sm">
              <div>
                <h2 className="text-3xl font-bold text-[#1c2d3d] tracking-tight">Client master records</h2>
                <p className="text-[11px] font-bold text-blue-500 mt-2 uppercase tracking-widest">Vedartha global erp central management systems</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-4 bg-white border border-gray-200 text-gray-400 hover:text-gray-900 rounded-full hover:shadow-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-[#eef2f6] border-b border-gray-200 px-10 overflow-x-auto">
              {['General master', 'Address & logistics', 'Payment conditions', 'Portal Access'].map((tab, i) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(i)}
                  className={`px-12 py-5 text-[12px] font-bold transition-all relative shrink-0 ${
                    activeTab === i 
                      ? 'text-[#0854a0]' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                  {activeTab === i && <div className="absolute bottom-0 left-6 right-6 h-1.5 bg-[#0854a0] rounded-t-full shadow-[0_-4px_12px_rgba(8,84,160,0.4)]"></div>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-14 bg-white custom-scrollbar">
              {activeTab === 0 && (
                <div className="grid grid-cols-2 gap-24 animate-in slide-in-from-bottom-6 duration-500">
                  <div className="space-y-8">
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                       <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-widest">Primary client identifiers</h4>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-gray-500 ml-1">Unique client code</label>
                       <input className="w-full bg-gray-50 rounded-2xl border border-gray-100 px-6 h-14 font-mono font-bold text-gray-400 text-lg" value={editingClient.id} disabled />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-gray-600 ml-1">Registered legal name</label>
                       <input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-16 font-bold text-gray-800 text-xl focus:border-[#0854a0] focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm" value={editingClient.name} onChange={(e) => setEditingClient({...editingClient, name: e.target.value})} placeholder="Enter legal entity name" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[11px] font-bold text-gray-600 ml-1">Key account contact</label>
                         <input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 text-base focus:border-[#0854a0] outline-none transition-all" value={editingClient.contactPerson} onChange={(e) => setEditingClient({...editingClient, contactPerson: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[11px] font-bold text-gray-600 ml-1">Corporate email</label>
                         <input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 text-base focus:border-[#0854a0] outline-none transition-all" value={editingClient.email} onChange={(e) => setEditingClient({...editingClient, email: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-gray-600 ml-1">Gstin registration number</label>
                       <input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-16 font-mono font-bold text-[#0854a0] text-2xl tracking-widest focus:border-[#0854a0] outline-none transition-all uppercase shadow-sm" value={editingClient.gstin} onChange={(e) => setEditingClient({...editingClient, gstin: e.target.value})} />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-12 rounded-[40px] border border-blue-100 flex flex-col items-center text-center shadow-xl">
                      <div className="w-24 h-24 bg-[#0854a0] rounded-[24px] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(8,84,160,0.3)] mb-8 transform hover:scale-105 transition-transform cursor-pointer">
                        <Shield size={48} />
                      </div>
                      <h4 className="text-xl font-bold text-gray-800 tracking-tight mb-4">Client verification hub</h4>
                      <p className="text-sm text-gray-500 leading-loose font-medium max-w-sm px-4">
                        Master data changes are subject to system-wide audit logging. 
                        Ensure all tax identifiers match legal documentation before persistence.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="grid grid-cols-2 gap-24 animate-in fade-in duration-500">
                  <div className="space-y-8">
                    <h4 className="text-[12px] font-bold text-blue-600 tracking-widest flex items-center mb-8 bg-blue-50 px-6 py-3 rounded-xl w-fit"><MapPin size={18} className="mr-3" /> Standard billing site</h4>
                    <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Street address / Floor</label><input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" value={editingClient.billingAddress?.line1} onChange={(e) => updateAddr('billingAddress', 'line1', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">City / District</label><input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" value={editingClient.billingAddress?.city} onChange={(e) => updateAddr('billingAddress', 'city', e.target.value)} /></div>
                      <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-500 ml-1">State / Region</label>
                          <select 
                            className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" 
                            value={editingClient.billingAddress?.state} 
                            onChange={(e) => updateAddr('billingAddress', 'state', e.target.value)}
                          >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                      </div>
                    </div>
                    <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Zip / Postal code</label><input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" value={editingClient.billingAddress?.pincode} onChange={(e) => updateAddr('billingAddress', 'pincode', e.target.value)} /></div>
                  </div>
                  <div className="space-y-8">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-[12px] font-bold text-gray-400 tracking-widest flex items-center bg-gray-50 px-6 py-3 rounded-xl"><MapPin size={18} className="mr-3" /> Shipping terminal</h4>
                      <button 
                        onClick={() => setEditingClient({...editingClient, shippingAddress: {...(editingClient.billingAddress as Address)}})}
                        className="text-[10px] font-bold text-[#0854a0] border-2 border-blue-50 px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-all tracking-tight shadow-sm"
                      >
                        Mirror billing address
                      </button>
                    </div>
                    <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Logistics entry point</label><input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" value={editingClient.shippingAddress?.line1} onChange={(e) => updateAddr('shippingAddress', 'line1', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Destination city</label><input className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" value={editingClient.shippingAddress?.city} onChange={(e) => updateAddr('shippingAddress', 'city', e.target.value)} /></div>
                      <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-500 ml-1">Destination state</label>
                          <select 
                            className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-medium text-gray-800 focus:border-[#0854a0] outline-none" 
                            value={editingClient.shippingAddress?.state} 
                            onChange={(e) => updateAddr('shippingAddress', 'state', e.target.value)}
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
              )}

              {activeTab === 2 && (
                <div className="grid grid-cols-2 gap-24 animate-in fade-in duration-500">
                   <div className="space-y-10">
                    <h4 className="text-[12px] font-bold text-amber-600 tracking-widest flex items-center mb-8 bg-amber-50 px-6 py-3 rounded-xl w-fit"><CreditCard size={18} className="mr-3" /> Commercial agreement</h4>
                    <div className="space-y-6">
                       <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Payment maturity cycle</label><select className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-14 font-bold text-gray-800 focus:border-[#0854a0] outline-none cursor-pointer"><option>Net 30 days (Standard)</option><option>Net 15 days (Accelerated)</option><option>Immediate cash settlement</option><option>Quarterly settlement (Eom+90)</option></select></div>
                       <div className="space-y-2"><label className="text-[11px] font-bold text-gray-500 ml-1">Operational exposure limit (Inr)</label><input type="number" className="w-full bg-white rounded-2xl border-2 border-gray-100 px-6 h-16 font-bold text-gray-800 text-xl focus:border-[#0854a0] outline-none" placeholder="Enter amount" /></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="animate-in fade-in duration-500">
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-16 rounded-[48px] border-2 border-blue-100 flex flex-col items-center justify-center text-center shadow-inner">
                    <div className="bg-white p-6 rounded-3xl shadow-lg mb-8">
                       <Key size={48} className="text-[#0854a0]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1c2d3d] mb-4">Client Dashboard Access</h3>
                    <p className="text-sm text-gray-600 max-w-lg mb-10 leading-relaxed font-medium">
                      Enable this client to login to the dedicated Client Portal to view invoices, download receipts, and make payments online.
                    </p>
                    
                    {!editingClient.portalPassword ? (
                      <button 
                        onClick={generatePassword}
                        className="bg-[#0854a0] text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#064280] shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center"
                      >
                         <Lock size={18} className="mr-3" /> Grant Access (Password = Client ID)
                      </button>
                    ) : (
                      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-blue-200 shadow-xl">
                        <div className="text-left space-y-6">
                           <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Login ID</label>
                             <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl mt-2 border border-gray-100">
                               <code className="text-lg font-mono font-bold text-[#0854a0]">{editingClient.id}</code>
                             </div>
                           </div>
                           <div>
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Password</label>
                             <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl mt-2 border border-gray-100">
                               <input 
                                  type="text"
                                  value={editingClient.portalPassword}
                                  onChange={(e) => setEditingClient({...editingClient, portalPassword: e.target.value})}
                                  className="text-lg font-mono font-bold text-gray-800 bg-transparent outline-none w-full"
                               />
                               <button className="text-gray-400 hover:text-blue-600" onClick={() => {navigator.clipboard.writeText(editingClient.portalPassword || ''); alert('Copied');}}><Copy size={18}/></button>
                             </div>
                           </div>
                           <div className="bg-amber-50 p-4 rounded-xl flex items-start text-amber-700 text-xs font-bold leading-relaxed">
                              <AlertCircle size={16} className="shrink-0 mr-2 mt-0.5" />
                              <p>Share these credentials securely with the client. By default, the Password matches the Client ID for simplicity.</p>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-gray-100 flex justify-end space-x-6 bg-[#f8f9fa] shadow-[0_-16px_48px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-10 py-4 border-2 border-gray-200 rounded-2xl text-[12px] font-bold text-gray-600 hover:bg-white hover:border-gray-300 transition-all shadow-sm"
              >
                Discard updates
              </button>
              <button 
                onClick={handleSave} 
                className="px-20 py-4 bg-[#0854a0] text-white rounded-2xl text-[12px] font-bold shadow-2xl shadow-blue-200 hover:bg-[#064280] transition-all active:scale-95 flex items-center group"
              >
                <Save size={18} className="mr-3 group-hover:scale-110 transition-transform" /> Persist client master
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
