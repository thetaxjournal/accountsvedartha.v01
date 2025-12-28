
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Search, 
  X, 
  Zap, 
  Printer,
  Download,
  EyeOff,
  Calendar,
  MessageCircle
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Branch, Client, InvoiceItem, Invoice } from '../types';
import { COMPANY_LOGO, APP_CONFIG, COMPANY_NAME, generateSecureQR, INDIAN_STATES } from '../constants';

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

interface InvoiceCreationProps {
  branches: Branch[];
  activeBranchId: string;
  clients: Client[];
  initialInvoice?: Invoice;
  onPost: (invoice: Invoice) => void;
  onCancel: () => void;
}

const InvoiceCreation: React.FC<InvoiceCreationProps> = ({ branches, activeBranchId, clients, initialInvoice, onPost, onCancel }) => {
  const [activeBranch, setActiveBranch] = useState<Branch | undefined>(branches.find(b => b.id === activeBranchId));
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(initialInvoice ? clients.find(c => c.id === initialInvoice.clientId) : undefined);
  const [clientSearch, setClientSearch] = useState(initialInvoice?.clientName || '');
  const [showClientList, setShowClientList] = useState(false);
  
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.date || new Date().toISOString().split('T')[0]);
  const [kindAttn, setKindAttn] = useState(initialInvoice?.kindAttn || '');
  const [placeOfSupply, setPlaceOfSupply] = useState(initialInvoice?.placeOfSupply || '');
  
  const [showPreview, setShowPreview] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [items, setItems] = useState<InvoiceItem[]>(initialInvoice?.items || [{ 
    id: '1', 
    description: '', 
    hsnCode: '998311 - Management consulting services', 
    quantity: 1, 
    rate: 0, 
    discountPercent: 0, 
    taxPercent: 18 
  }]);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = branches.find(b => b.id === activeBranchId);
    setActiveBranch(b);
    if (b && !invoiceNumber && !initialInvoice) {
      setInvoiceNumber(`${b.invoicePrefix}${b.nextInvoiceNumber}`);
    }
  }, [activeBranchId, branches, initialInvoice, invoiceNumber]);

  // Auto-select Place of Supply when client is selected
  useEffect(() => {
    if (selectedClient && !initialInvoice) {
        setPlaceOfSupply(selectedClient.billingAddress.state);
    }
  }, [selectedClient, initialInvoice]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scrollerRef.current && !scrollerRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subTotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const taxAmount = items.reduce((acc, item) => acc + (item.quantity * item.rate * (item.taxPercent / 100)), 0);
  const grandTotal = subTotal + taxAmount;

  // Logic for Inter-state (IGST) vs Intra-state (CGST+SGST)
  const isInterState = activeBranch && placeOfSupply && 
    (activeBranch.address.state.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase());

  const handleDownloadPDF = async () => {
    const originalTitle = document.title;
    document.title = `${invoiceNumber}_Tax_Invoice`;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 500);
  };

  const handleWhatsApp = () => {
    if (!selectedClient) {
      alert("Please select a client to generate the message.");
      return;
    }

    const originalTitle = document.title;
    document.title = `${invoiceNumber}_Tax_Invoice`;
    
    setIsPrinting(true);

    setTimeout(() => {
      window.print();
      
      setIsPrinting(false);
      document.title = originalTitle;

      const text = `Dear ${selectedClient.name},%0A%0APlease find attached Invoice *${invoiceNumber}* dated ${invoiceDate}.%0A%0A*Total Amount:* ₹ ${grandTotal.toLocaleString('en-IN')}%0A%0ARegards,%0A${COMPANY_NAME}`;
      
      setTimeout(() => {
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }, 1000); 
    }, 500);
  };

  const bankName = activeBranch?.bankDetails?.bankName || APP_CONFIG.bankDetails?.bankName || 'N/A';
  const bankAddress = activeBranch?.bankDetails?.branchName || APP_CONFIG.bankDetails?.branchName || 'N/A';
  const bankAccount = activeBranch?.bankDetails?.accountNumber || APP_CONFIG.bankDetails?.accountNumber || 'N/A';
  const bankIfsc = activeBranch?.bankDetails?.ifscCode || APP_CONFIG.bankDetails?.ifscCode || 'N/A';

  const InvoiceDocument = () => (
    <div className="flex flex-col text-[#000000]">
      {/* PAGE 1: MAIN INVOICE (A4) */}
      <div 
        id="invoice-render-p1" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakAfter: 'always' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}, {activeBranch?.address.line2}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
            <p>{activeBranch?.address.state}, India</p>
            <p className="mt-1">Tel : {activeBranch?.contact}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-3 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Original for recipient</h1>
        </div>

        <div className="grid grid-cols-2 gap-x-12 mb-8 text-[11px] leading-[1.4] shrink-0">
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Invoice no.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{invoiceNumber}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Kind attn.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{kindAttn}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Mailing address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {selectedClient?.name}<br/>
                {selectedClient?.billingAddress.line1}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} - {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
          </div>
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Date</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Client name</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{selectedClient?.name}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {selectedClient?.billingAddress.line1}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} - {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
            {/* Auto Selected Place of Supply */}
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Place of supply</span><span className="w-4 shrink-0 text-center">:</span><span>{placeOfSupply}</span></div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Gstin/Unique id</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold tracking-tight">{selectedClient?.gstin}</span></div>
          </div>
        </div>

        <div className="border-t-[1.5px] border-b-[1.5px] border-[#000000] shrink-0 mt-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#000000] font-bold text-[#000000]">
                <th className="text-left py-1.5 pl-1 font-bold">Particulars</th>
                <th className="text-right py-1.5 pr-1 w-40 font-bold">Amount (Inr)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="align-top border-b border-black/10 last:border-0 text-[#000000]">
                  <td className="py-3 pl-1 pr-6 whitespace-pre-wrap leading-relaxed font-medium">
                    <div className="flex items-start">
                      <span className="w-8 shrink-0">{i+1}.</span>
                      <div className="flex-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-1 font-bold">{(item.rate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4 text-[11px] shrink-0 text-[#000000]">
          <div className="w-72 space-y-1">
            <div className="flex justify-between items-center"><span className="font-bold">Amount</span><span className="w-36 flex justify-between"><span>:</span><span>{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            
            {/* Dynamic GST Logic */}
            {isInterState ? (
                <div className="flex justify-between items-center"><span className="font-bold">IGST @ 18.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            ) : (
                <>
                    <div className="flex justify-between items-center"><span className="font-bold">CGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(taxAmount/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                    <div className="flex justify-between items-center"><span className="font-bold">SGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(taxAmount/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                </>
            )}

            <div className="h-[1px] bg-[#000000] my-1"></div>
            <div className="flex justify-between font-bold text-[14px]">
              <span className="font-bold">Gross amount</span>
              <span className="w-36 flex justify-between">
                <span>:</span>
                <span className="font-bold">{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="h-[0.5px] bg-[#000000] mt-0.5"></div>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-bold text-[#000000] shrink-0">
          {numberToWords(grandTotal)}
        </div>

        <div className="mt-6 border-t-[1.5px] border-b-[1.5px] border-[#000000] py-3 grid grid-cols-2 gap-x-12 text-[10px] leading-[1.4] text-[#000000] shrink-0">
          <div className="space-y-1">
            <div className="flex"><span className="w-36 font-bold">Pan number</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.pan}</span></div>
            <div className="flex"><span className="w-36 font-bold align-top">Hsn code & description</span><span className="w-4 text-center align-top">:</span>
              <span className="flex-1 font-medium leading-tight">{items[0]?.hsnCode}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex"><span className="w-44 font-bold">Gstin of supplier</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.gstin}</span></div>
            <div className="flex"><span className="w-44 font-bold align-top">Principal place of business</span><span className="w-4 text-center align-top">:</span>
              <div className="flex-1 font-medium leading-tight">
                {activeBranch?.address.line1}, {activeBranch?.address.city} Urban, {activeBranch?.address.state} - {activeBranch?.address.pincode}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col pt-8">
          <div className="flex justify-between items-end mb-6">
            <div className="shrink-0">
              <QRCode 
                value={generateSecureQR({
                    type: 'INV',
                    id: initialInvoice?.id || `INV-${Date.now()}`, 
                    invoiceNumber,
                    clientName: selectedClient?.name,
                    clientGstin: selectedClient?.gstin,
                    date: invoiceDate,
                    grandTotal
                })} 
                size={160} 
                level="M" 
                fgColor="#000000" 
              />
            </div>

            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-bold text-[#000000] mb-1">For Vedartha International Limited</p>
              <div className="text-right space-y-1">
                 <div className="relative w-64 h-16 border-b border-dotted border-[#000000]"></div>
                 <div className="pt-2">
                   <p className="text-[11px] font-bold">Authorized signatory</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-4 border-t border-black/10 text-[#000000]">
            <div className="text-[9px] font-medium leading-tight opacity-70">
              <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
              <p className="italic text-[8.5px] mt-1">{activeBranch?.name} is part of Vedartha International Limited Group.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div 
        id="invoice-render-p2" 
        className="bg-white w-[210mm] min-h-[297mm] p-[15mm] relative text-[#000000] font-sans overflow-hidden flex flex-col"
        style={{ pageBreakBefore: 'always' }}
      >
        <div className="flex justify-between items-start mb-8 shrink-0">
          <div className="flex flex-col">
            <img src={COMPANY_LOGO} alt="Logo" className="h-[50px] object-contain mb-1" />
          </div>
          <div className="text-right text-[10px] leading-[1.3] text-[#000000] max-w-[340px] font-medium">
            <p className="font-bold">{activeBranch?.name}</p>
            <p>{activeBranch?.address.line1}</p>
            <p>{activeBranch?.address.city} - {activeBranch?.address.pincode}</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-[#000000] mb-4 pb-1 shrink-0">
          <h1 className="text-[16px] font-bold tracking-tight">Tax invoice - Terms & conditions</h1>
        </div>

        <div className="border border-[#000000] p-3 grid grid-cols-2 text-[11px] font-bold mb-10 text-[#000000]">
          <div className="flex"><span className="w-24">Invoice no.</span><span className="px-2">:</span><span>{invoiceNumber}</span></div>
          <div className="flex"><span className="w-24">Date</span><span className="px-2">:</span><span>{new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        </div>

        <div className="space-y-6 text-[11px] leading-[1.7] text-[#000000] text-justify">
          <p>
            a) This bill is payable by electronic transfer/ dd/ cheque in favor of <span className="font-bold">{activeBranch?.name}</span>. Please make payment within 15 days of receipt of this invoice.
          </p>
          <div className="space-y-1">
            <p>b) Bank details : <span className="font-bold">{bankName}, {bankAddress}</span></p>
            <p className="font-bold border-l-2 border-[#000000] pl-4 py-2 mt-2 bg-gray-50/50">
              Account number: {bankAccount}, Rtgs ifsc code: {bankIfsc}
            </p>
          </div>
          <p>
            c) For payment made by electronic fund transfer, please send details to <span className="font-bold underline">receipt@vedartha.com</span> quoting invoice number <span className="font-bold">{invoiceNumber}</span>.
          </p>
        </div>

        <div className="mt-auto flex flex-col pt-6 border-t border-black/10">
          <div className="text-[9px] font-medium opacity-70">
             <p>Branch office: {activeBranch?.address.line1}, {activeBranch?.address.city}, {activeBranch?.address.state} - {activeBranch?.address.pincode}</p>
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-[10px] font-medium">Page 2</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#f8f9fa] animate-in fade-in duration-300">
        {/* Print Portal */}
        {isPrinting && createPortal(<InvoiceDocument />, document.getElementById('print-portal')!)}

        {/* Form Side */}
        <div className={`w-full md:w-[45%] flex flex-col h-full border-r border-gray-200 bg-white shadow-xl z-10 ${showPreview ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                    <h2 className="text-xl font-black text-[#1c2d3d] tracking-tight">{initialInvoice ? 'Edit Invoice' : 'New Invoice'}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeBranch?.name}</p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Client Selection */}
                <div className="space-y-2 relative" ref={scrollerRef}>
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Bill To Client</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-2xl pl-12 pr-4 text-sm font-bold transition-all outline-none"
                            placeholder="Search Client Name..."
                            value={clientSearch}
                            onChange={(e) => { setClientSearch(e.target.value); setShowClientList(true); }}
                            onFocus={() => setShowClientList(true)}
                        />
                    </div>
                    {showClientList && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50">
                            {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
                                <div 
                                    key={client.id} 
                                    className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                    onClick={() => {
                                        setSelectedClient(client);
                                        setClientSearch(client.name);
                                        setPlaceOfSupply(client.billingAddress.state);
                                        setShowClientList(false);
                                    }}
                                >
                                    <p className="font-bold text-gray-800 text-sm">{client.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{client.gstin}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Invoice #</label>
                        <input type="text" className="w-full h-12 bg-gray-50 rounded-xl px-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                        <input type="date" className="w-full h-12 bg-gray-50 rounded-xl px-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Kind Attn.</label>
                        <input type="text" className="w-full h-12 bg-gray-50 rounded-xl px-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none" value={kindAttn} onChange={(e) => setKindAttn(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Place of Supply</label>
                         <select 
                            className="w-full h-12 bg-gray-50 rounded-xl px-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none"
                            value={placeOfSupply} 
                            onChange={(e) => setPlaceOfSupply(e.target.value)}
                        >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Billable Items</label>
                        <button 
                            onClick={() => setItems([...items, { id: Date.now().toString(), description: '', hsnCode: '998311', quantity: 1, rate: 0, discountPercent: 0, taxPercent: 18 }])}
                            className="text-[10px] font-bold text-[#0854a0] hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors flex items-center"
                        >
                            <Plus size={12} className="mr-1" /> Add Line Item
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {items.map((item, idx) => (
                            <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group hover:shadow-md transition-all">
                                <button 
                                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                    className="absolute top-2 right-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-12 space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Description</label>
                                        <textarea rows={2} className="w-full bg-white rounded-lg p-2 text-xs font-bold border border-gray-200 outline-none focus:border-blue-500" value={item.description} onChange={(e) => { const newItems = [...items]; newItems[idx].description = e.target.value; setItems(newItems); }} placeholder="Item description" />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">HSN Code</label>
                                        <input type="text" className="w-full h-8 bg-white rounded-lg px-2 text-xs font-bold border border-gray-200 outline-none focus:border-blue-500" value={item.hsnCode} onChange={(e) => { const newItems = [...items]; newItems[idx].hsnCode = e.target.value; setItems(newItems); }} />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Qty</label>
                                        <input type="number" className="w-full h-8 bg-white rounded-lg px-2 text-xs font-bold border border-gray-200 outline-none focus:border-blue-500" value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[idx].quantity = Number(e.target.value); setItems(newItems); }} />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Rate</label>
                                        <input type="number" className="w-full h-8 bg-white rounded-lg px-2 text-xs font-bold border border-gray-200 outline-none focus:border-blue-500" value={item.rate} onChange={(e) => { const newItems = [...items]; newItems[idx].rate = Number(e.target.value); setItems(newItems); }} />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Total</label>
                                        <div className="h-8 flex items-center px-2 text-xs font-black text-gray-700">
                                            ₹ {(item.quantity * item.rate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-xl font-black text-[#0854a0]">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex space-x-3">
                   <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className="md:hidden p-3 bg-gray-100 rounded-xl text-gray-600"
                   >
                       {showPreview ? <EyeOff size={20} /> : <Eye size={20} />}
                   </button>
                   <button 
                        onClick={() => {
                            if(!selectedClient) return alert('Select a client');
                            const invoice: Invoice = {
                                id: initialInvoice?.id || `INV-${Date.now()}`,
                                invoiceNumber,
                                date: invoiceDate,
                                branchId: activeBranch?.id || '',
                                branchName: activeBranch?.name || '',
                                clientId: selectedClient.id,
                                clientName: selectedClient.name,
                                clientGstin: selectedClient.gstin,
                                kindAttn,
                                placeOfSupply,
                                items,
                                subTotal,
                                taxAmount,
                                grandTotal,
                                status: initialInvoice?.status || 'Posted'
                            };
                            onPost(invoice);
                        }}
                        className="px-8 py-3 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280] shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center"
                   >
                        <Zap size={16} className="mr-2" /> {initialInvoice ? 'Update Invoice' : 'Post Invoice'}
                   </button>
                </div>
            </div>
        </div>

        {/* Live Preview Side */}
        <div className={`w-full md:w-[55%] h-full bg-gray-100 overflow-y-auto p-10 flex justify-center items-start ${!showPreview ? 'hidden md:flex' : 'flex'}`}>
            <div className="space-y-4">
               <div className="flex justify-center space-x-4 mb-4 sticky top-0 z-30">
                   <button onClick={handleDownloadPDF} className="bg-white/80 backdrop-blur px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center text-gray-700">
                      <Download size={14} className="mr-2" /> Download PDF
                   </button>
                   <button onClick={handleWhatsApp} className="bg-[#25D366]/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center text-white">
                      <MessageCircle size={14} className="mr-2" /> WhatsApp
                   </button>
               </div>
               <div className="shadow-2xl origin-top transform transition-transform duration-300 scale-[0.55] sm:scale-[0.65] md:scale-[0.6] lg:scale-[0.7] xl:scale-[0.8]">
                   <InvoiceDocument />
               </div>
            </div>
        </div>
    </div>
  );
};

export default InvoiceCreation;
