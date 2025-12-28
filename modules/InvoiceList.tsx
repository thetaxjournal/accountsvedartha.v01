import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, FileText, Edit2, Ban, CheckCircle, XCircle, MessageCircle, Mail, Send, X, Loader2, Check } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Invoice, Branch, Client } from '../types';
import { COMPANY_NAME, COMPANY_LOGO, APP_CONFIG, INITIAL_BRANCHES, generateSecureQR } from '../constants';
import emailjs from '@emailjs/browser';

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

interface InvoiceListProps {
  invoices: Invoice[];
  clients: Client[];
  branches: Branch[];
  onNewInvoice: () => void;
  onEdit: (invoice: Invoice) => void;
  onRevoke: (id: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, clients, branches, onNewInvoice, onEdit, onRevoke }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Email State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvForEmail, setSelectedInvForEmail] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWhatsAppShare = (inv: Invoice) => {
    // 1. Trigger Print
    setPrintingInvoice(inv);
    setTimeout(() => {
        window.print();
        setPrintingInvoice(null);
        
        // 2. Open WhatsApp after print dialog closes (user saves PDF)
        const text = `Dear ${inv.clientName},%0A%0APlease find attached Invoice *${inv.invoiceNumber}* dated ${inv.date}.%0A%0A*Total Amount:* ₹ ${(inv.grandTotal || 0).toLocaleString('en-IN')}%0A%0ARegards,%0A${COMPANY_NAME}`;
        setTimeout(() => {
             window.open(`https://wa.me/?text=${text}`, '_blank');
        }, 1000);
    }, 500);
  };

  const handleEmailClick = (inv: Invoice) => {
    const client = clients.find(c => c.id === inv.clientId);
    const email = client?.email || '';
    
    setSelectedInvForEmail(inv);
    setEmailTo(email);
    // Updated Message Body with Website URL and Client ID
    setEmailMessage(`Dear ${inv.clientName},\n\nPlease find attached the invoice ${inv.invoiceNumber} for your recent services.\n\nClient ID: ${inv.clientId}\nTotal Amount: ₹ ${inv.grandTotal.toLocaleString('en-IN')}\nDue Date: ${inv.date}\n\nYou can login to the client portal to view and pay this invoice here:\nhttps://accountsvedartha.vercel.app`);
    setEmailStatus('idle');
    setEmailModalOpen(true);
  };

  const sendEmail = async () => {
    if (!selectedInvForEmail) return;
    
    // Configured EmailJS Credentials - UPDATED to service_ibfej4o
    const SERVICE_ID = 'service_ibfej4o'; 
    const TEMPLATE_ID = 'template_scjyi8o';
    const PUBLIC_KEY = 'DQ9tmUQaTNMAqpyJa';

    setEmailStatus('sending');

    try {
        const templateParams = {
            to_email: emailTo,
            client_name: selectedInvForEmail.clientName,
            client_code: selectedInvForEmail.clientId, // Explicitly added as requested
            invoice_number: selectedInvForEmail.invoiceNumber,
            company_name: COMPANY_NAME,
            message: emailMessage,
            invoice_amount: `₹ ${selectedInvForEmail.grandTotal.toLocaleString('en-IN')}`,
            date: selectedInvForEmail.date
        };

        // Send Email
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        
        // Show Success Animation
        setEmailStatus('success');
        
        // Auto close after 2.5 seconds
        setTimeout(() => {
            setEmailModalOpen(false);
            setEmailStatus('idle');
        }, 2500);

    } catch (error: any) {
        console.error('Email Error Details:', error);
        setEmailStatus('error');
        
        // Parse the error to avoid [object Object]
        let errorMessage = "Unknown Error";
        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (typeof error === 'object') {
                // EmailJS returns { status: 4xx, text: "..." }
                if (error.text) {
                    errorMessage = error.text;
                } else if (error.message) {
                    errorMessage = error.message;
                } else {
                    errorMessage = JSON.stringify(error);
                }
            }
        }
        
        alert(`Email Failed: ${errorMessage}\n\nPlease check your internet connection or EmailJS quota.`);
    }
  };

  const activeBranches = branches.length > 0 ? branches : INITIAL_BRANCHES;

  const InvoiceDocument = ({ invoice }: { invoice: Invoice }) => {
    const activeBranch = activeBranches.find(b => b.id === invoice.branchId) || activeBranches[0];
    const selectedClient = clients.find(c => c.id === invoice.clientId);

    // If client data is missing (deleted), mock basic structure from invoice snapshot
    const clientName = selectedClient?.name || invoice.clientName;
    const clientGstin = selectedClient?.gstin || invoice.clientGstin;

    // GST Logic
    const placeOfSupply = invoice.placeOfSupply || selectedClient?.billingAddress.state || activeBranch.address.state;
    const isInterState = activeBranch.address.state.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase();

    // Branch specific bank details
    const bankName = activeBranch?.bankDetails?.bankName || APP_CONFIG.bankDetails?.bankName || 'N/A';
    const bankAddress = activeBranch?.bankDetails?.branchName || APP_CONFIG.bankDetails?.branchName || 'N/A';
    const bankAccount = activeBranch?.bankDetails?.accountNumber || APP_CONFIG.bankDetails?.accountNumber || 'N/A';
    const bankIfsc = activeBranch?.bankDetails?.ifscCode || APP_CONFIG.bankDetails?.ifscCode || 'N/A';
    
    return (
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
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Invoice no.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{invoice.invoiceNumber}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Kind attn.</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{invoice.kindAttn}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Mailing address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                {clientName}<br/>
                {selectedClient?.billingAddress.line1 || 'Address on file'}, {selectedClient?.billingAddress.line2},<br/>
                {selectedClient?.billingAddress.city} {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
          </div>
          <div className="space-y-[2px]">
            <div className="flex items-start"><span className="w-32 font-bold shrink-0">Date</span><span className="w-4 shrink-0 text-center">:</span><span className="font-medium">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <div className="flex items-start pt-2"><span className="w-32 font-bold shrink-0">Client name</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold">{clientName}</span></div>
            <div className="flex items-start pt-1">
              <span className="w-32 font-bold shrink-0">Address</span>
              <span className="w-4 shrink-0 text-center">:</span>
              <div className="flex-1 font-medium leading-[1.3]">
                 {selectedClient?.billingAddress.line1 || 'Address on file'}, {selectedClient?.billingAddress.line2},<br/>
                 {selectedClient?.billingAddress.city} {selectedClient?.billingAddress.pincode}, {selectedClient?.billingAddress.state}, India.
              </div>
            </div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Place of supply</span><span className="w-4 shrink-0 text-center">:</span><span>{placeOfSupply}</span></div>
            <div className="flex items-start pt-1"><span className="w-32 font-bold shrink-0">Gstin/Unique id</span><span className="w-4 shrink-0 text-center">:</span><span className="font-bold tracking-tight">{clientGstin}</span></div>
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
              {invoice.items.map((item, i) => (
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
            <div className="flex justify-between items-center"><span className="font-bold">Amount</span><span className="w-36 flex justify-between"><span>:</span><span>{(invoice.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            
            {isInterState ? (
                <div className="flex justify-between items-center"><span className="font-bold">IGST @ 18.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{(invoice.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
            ) : (
                <>
                    <div className="flex justify-between items-center"><span className="font-bold">CGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{((invoice.taxAmount || 0)/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                    <div className="flex justify-between items-center"><span className="font-bold">SGST @ 9.00 %</span><span className="w-36 flex justify-between"><span>:</span><span>{((invoice.taxAmount || 0)/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span></div>
                </>
            )}

            <div className="h-[1px] bg-[#000000] my-1"></div>
            <div className="flex justify-between font-bold text-[14px]">
              <span className="font-bold">Gross amount</span>
              <span className="w-36 flex justify-between">
                <span>:</span>
                <span className="font-bold">{(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="h-[0.5px] bg-[#000000] mt-0.5"></div>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-bold text-[#000000] shrink-0">
          {numberToWords(invoice.grandTotal || 0)}
        </div>

        <div className="mt-6 border-t-[1.5px] border-b-[1.5px] border-[#000000] py-3 grid grid-cols-2 gap-x-12 text-[10px] leading-[1.4] text-[#000000] shrink-0">
          <div className="space-y-1">
            <div className="flex"><span className="w-36 font-bold">Pan number</span><span className="w-4 text-center">:</span><span className="font-bold">{activeBranch?.pan}</span></div>
            <div className="flex"><span className="w-36 font-bold align-top">Hsn code & description</span><span className="w-4 text-center align-top">:</span>
              <span className="flex-1 font-medium leading-tight">{invoice.items[0]?.hsnCode}</span>
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
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    clientName: clientName,
                    clientGstin: clientGstin,
                    date: invoice.date,
                    grandTotal: invoice.grandTotal,
                    status: invoice.status
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
          <div className="flex"><span className="w-24">Invoice no.</span><span className="px-2">:</span><span>{invoice.invoiceNumber}</span></div>
          <div className="flex"><span className="w-24">Date</span><span className="px-2">:</span><span>{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
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
            c) For payment made by electronic fund transfer, please send details to <span className="font-bold underline">receipt@vedartha.com</span> quoting invoice number <span className="font-bold">{invoice.invoiceNumber}</span>.
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hidden Print Portal */}
      {printingInvoice && createPortal(<InvoiceDocument invoice={printingInvoice} />, document.getElementById('print-portal')!)}

      {/* Email Composition Modal */}
      {emailModalOpen && selectedInvForEmail && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Success View */}
                {emailStatus === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-[bounce_1s_infinite]">
                            <Check size={48} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Email Sent Successfully!</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-8">
                            Dispatched to <span className="text-blue-600">{emailTo}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">Closing automatically...</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-800">Email Invoice</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                    {selectedInvForEmail.invoiceNumber}
                                </p>
                            </div>
                            <button onClick={() => setEmailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipient (Client Email)</label>
                                <input 
                                    type="email" 
                                    className="w-full mt-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-[#0854a0] transition-colors"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Body</label>
                                <textarea 
                                    className="w-full mt-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-[#0854a0] min-h-[150px] resize-none transition-colors"
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                />
                            </div>
                            
                            <button 
                                onClick={sendEmail} 
                                disabled={emailStatus === 'sending'}
                                className="w-full py-4 bg-[#0854a0] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#064280] shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {emailStatus === 'sending' ? (
                                    <><Loader2 size={16} className="animate-spin mr-2" /> Sending...</>
                                ) : (
                                    <><Send size={16} className="mr-2" /> Send Email</>
                                )}
                            </button>
                            
                            {emailStatus === 'error' && (
                                <p className="text-[10px] text-rose-500 font-bold text-center mt-2">
                                    Error sending email. Please check configuration.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Invoice #, Client Name..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-100 outline-none font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={onNewInvoice}
          className="flex items-center px-6 py-2.5 bg-[#0854a0] text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-[#064280] active:scale-95 transition-all"
        >
          <Plus size={16} className="mr-2" /> New Invoice
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Doc Number</th>
              <th className="px-6 py-4">Posting Date</th>
              <th className="px-6 py-4">Business Partner</th>
              <th className="px-6 py-4 text-right">Gross Value</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-400 uppercase tracking-widest font-black opacity-40">
                  <FileText size={48} className="mx-auto mb-4" />
                  No Records in Master
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-6 py-4 font-mono font-black text-blue-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-gray-600 font-bold">{inv.date}</td>
                  <td className="px-6 py-4 font-black text-gray-800 uppercase tracking-tight">{inv.clientName}</td>
                  <td className="px-6 py-4 text-right font-black text-[#0854a0]">₹ {(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center justify-center mx-auto w-fit ${
                      inv.status === 'Posted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                      inv.status === 'Cancelled' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.status === 'Posted' && <CheckCircle size={10} className="mr-1" />}
                      {inv.status === 'Cancelled' && <XCircle size={10} className="mr-1" />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => handleEmailClick(inv)} className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="Send Email">
                        <Mail size={14} />
                      </button>
                      <button onClick={() => handleWhatsAppShare(inv)} className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" title="Send via WhatsApp (Auto-Print PDF)">
                        <MessageCircle size={14} />
                      </button>
                      <button onClick={() => onEdit(inv)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => onRevoke(inv.id)} className="p-2 text-gray-400 hover:text-rose-600 transition-colors" title="Revoke">
                        <Ban size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceList;