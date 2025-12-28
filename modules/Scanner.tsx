
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, XCircle, ShieldCheck, Loader2, Camera, Upload, Image as ImageIcon, RefreshCw, ZoomIn, ZoomOut, Crop, FileText as FileTextIcon } from 'lucide-react';
import { decodeSecureQR } from '../constants';
import { Invoice, Payment } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// --- ROBUST WORKER CONFIGURATION ---
// We fetch the worker script as text and create a local Blob URL.
// This prevents "Cross-Origin Worker" errors common with CDNs.
const configurePdfWorker = async () => {
    // @ts-ignore
    const pdfJs = pdfjsLib.default || pdfjsLib;
    
    if (pdfJs.GlobalWorkerOptions.workerSrc) return; // Already configured

    const workerVersion = '3.11.174';
    const workerUrl = `https://esm.sh/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;

    try {
        const response = await fetch(workerUrl);
        if (!response.ok) throw new Error("Failed to fetch worker script");
        const scriptText = await response.text();
        const blob = new Blob([scriptText], { type: 'application/javascript' });
        pdfJs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch (e) {
        console.warn("Blob worker setup failed, falling back to CDN URL (might fail on some strict CSPs)", e);
        pdfJs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
};

// Trigger config immediately
configurePdfWorker().catch(console.error);

interface ScannerProps {
  invoices: Invoice[];
  payments: Payment[];
}

const Scanner: React.FC<ScannerProps> = ({ invoices, payments }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [smartMessage, setSmartMessage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  
  // Zoom Controls
  const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Scanner Instance
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!scannerRef.current && document.getElementById('reader')) {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            
            if (activeTab === 'camera') {
                startCamera(html5QrCode);
            }
        }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Handle Tab Switching
  useEffect(() => {
      if (!scannerRef.current) return;

      if (activeTab === 'camera') {
          setUploadedImage(null);
          setIsPdfMode(false);
          setError(null);
          setDecodedData(null);
          setSmartMessage(null);
          startCamera(scannerRef.current);
      } else {
          if (scannerRef.current.isScanning) {
              scannerRef.current.stop().then(() => setIsScanning(false)).catch(console.error);
          }
          setIsScanning(false);
          setError(null);
          setDecodedData(null);
          setSmartMessage(null);
      }
  }, [activeTab]);

  const startCamera = (scanner: Html5Qrcode) => {
      const config = { 
          fps: 15, 
          qrbox: { width: 320, height: 320 }, 
          aspectRatio: 1.0,
          videoConstraints: {
              width: { min: 720, ideal: 1920, max: 3840 },
              height: { min: 480, ideal: 1080, max: 2160 },
              focusMode: "continuous",
              facingMode: "environment"
          }
      };

      scanner.start(
          { facingMode: "environment" }, 
          config, 
          (decodedText) => handleScanSuccess(decodedText),
          (errorMessage) => { /* ignore frames */ }
      ).then(() => {
          setIsScanning(true);
          try {
              const tracks = (scanner as any).getRunningTrackCameraCapabilities(); 
              if (tracks && typeof tracks.zoom === 'object') {
                  setZoomCapabilities({
                      min: tracks.zoom.min,
                      max: tracks.zoom.max,
                      step: tracks.zoom.step
                  });
                  setZoomLevel(tracks.zoom.min);
              }
          } catch(e) { /* Zoom not supported */ }
      }).catch(err => {
          console.error("Camera start failed", err);
          setError("Could not access camera. Please allow camera permissions in your browser.");
      });
  };

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(event.target.value);
      setZoomLevel(newZoom);
      if (scannerRef.current) {
          (scannerRef.current as any).applyVideoConstraints({
              advanced: [{ zoom: newZoom }]
          });
      }
  };

  const handleScanSuccess = (text: string) => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => setIsScanning(false)).catch(console.error);
      }
      processResult(text);
  };

  const processResult = (text: string) => {
      setScanResult(text);
      setAnalyzing(true);
      setSmartMessage("Verifying Digital Signature...");
      
      // Simulate Processing Delay for better UX
      setTimeout(() => {
          const decoded = decodeSecureQR(text);
          if (decoded && decoded._sec === 'VED') {
              setDecodedData(decoded);
              setError(null);
          } else {
              setDecodedData(null);
              setError("Invalid QR Code. Not a valid Vedartha Secure Document.");
          }
          setAnalyzing(false);
          setSmartMessage(null);
      }, 1000);
  };

  const attemptSmartCrops = async (base64Img: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(); return; }

            const w = img.naturalWidth;
            const h = img.naturalHeight;

            // Smart Crop Strategies for A4 Documents
            const strategies = [
                { name: "Full Scan", x: 0, y: 0, w: w, h: h },
                { name: "Bottom Right (Footer)", x: w * 0.5, y: h * 0.6, w: w * 0.5, h: h * 0.4 },
                { name: "Bottom Left (Footer)", x: 0, y: h * 0.6, w: w * 0.5, h: h * 0.4 },
                { name: "Center Zoom", x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 }
            ];

            for (const strat of strategies) {
                setSmartMessage(`Analysing: ${strat.name}...`);
                await new Promise(r => setTimeout(r, 100)); // UI Breath

                canvas.width = strat.w;
                canvas.height = strat.h;
                // Clear context to avoid artifacts
                ctx.clearRect(0,0, strat.w, strat.h);
                ctx.drawImage(img, strat.x, strat.y, strat.w, strat.h, 0, 0, strat.w, strat.h);
                
                try {
                    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.95));
                    if (!blob) continue;
                    
                    const file = new File([blob], "temp_crop.jpg", { type: "image/jpeg" });
                    const result = await scannerRef.current!.scanFile(file, false);
                    if (result) {
                        resolve(result); // Found it!
                        return;
                    }
                } catch (err) {
                    // Strategy failed, continue to next
                }
            }
            reject("No readable QR found in this document.");
        };
        img.onerror = () => reject("Image load error");
        img.src = base64Img;
    });
  };

  // Converts PDF first page to Base64 Image
  const convertPdfToImage = async (file: File): Promise<string> => {
      // @ts-ignore
      const pdf = pdfjsLib.default || pdfjsLib;
      
      if (!pdf.GlobalWorkerOptions.workerSrc) {
          await configurePdfWorker();
      }
      
      setSmartMessage("Parsing PDF Document...");
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        const loadingTask = pdf.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://esm.sh/pdfjs-dist@3.11.174/cmaps/', // Using standard CMAPS from ESM
            cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        const page = await doc.getPage(1); // Get first page
        
        // Scale 2.0 provides good balance of quality vs memory
        const viewport = page.getViewport({ scale: 2.0 }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) throw new Error("Canvas context failed");
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.95);
      } catch (e: any) {
          console.error("PDF Parsing Error", e);
          throw new Error(`PDF Error: ${e.message}`);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !scannerRef.current) return;

      setAnalyzing(true);
      setError(null);
      setDecodedData(null);
      setIsPdfMode(false);
      setUploadedImage(null);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      try {
          let imageBase64 = '';

          if (isPdf) {
              setIsPdfMode(true);
              setSmartMessage("Reading PDF Invoice...");
              imageBase64 = await convertPdfToImage(file);
          } else {
              setSmartMessage("Reading Image File...");
              imageBase64 = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => resolve(ev.target?.result as string);
                  reader.readAsDataURL(file);
              });
          }

          setUploadedImage(imageBase64); // Show preview
          
          setSmartMessage("Scanning Document...");
          
          // Try Smart Crops directly which includes Full Scan as step 1
          const smartResult = await attemptSmartCrops(imageBase64);
          processResult(smartResult);

      } catch (err: any) {
          console.error(err);
          setAnalyzing(false);
          setSmartMessage(null);
          setError(err.message || (typeof err === 'string' ? err : "Could not process this file."));
      }
      
      e.target.value = '';
  };

  const handleReset = () => {
    setScanResult(null);
    setDecodedData(null);
    setError(null);
    setUploadedImage(null);
    setAnalyzing(false);
    setSmartMessage(null);
    setIsPdfMode(false);
    if (activeTab === 'camera' && scannerRef.current) {
        startCamera(scannerRef.current);
    }
  };

  const renderResultCard = () => {
     if (!decodedData) return null;

     const dbInvoice = invoices.find(i => i.id === decodedData.id);
     const dbPayment = payments.find(p => p.id === decodedData.id);
     const data = dbInvoice || dbPayment || decodedData;
     const type = decodedData.type; 

     return (
       <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-[#0854a0] p-6 text-white flex justify-between items-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-800 opacity-90"></div>
             <div className="flex items-center space-x-3 relative z-10">
                <ShieldCheck size={28} className="text-emerald-400" />
                <div>
                   <h3 className="text-xl font-black uppercase tracking-wider">Verified Secure</h3>
                   <p className="text-[11px] opacity-90 font-medium">Digital Signature Validated</p>
                </div>
             </div>
             <button onClick={handleReset} className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-all">
                 <RefreshCw size={20} />
             </button>
          </div>

          <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
             <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{type === 'INV' ? 'TAX INVOICE' : 'PAYMENT RECEIPT'}</h2>
                <p className="text-base font-bold text-blue-600 font-mono mt-1 tracking-wide">{data.invoiceNumber || data.id}</p>
             </div>

             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Entity Name</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{data.clientName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Issue Date</span>
                    <span className="text-sm font-bold text-gray-900">{new Date(data.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Current Status</span>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wide ${data.status === 'Paid' || type === 'RCPT' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                        {type === 'RCPT' ? 'CONFIRMED' : data.status}
                    </span>
                </div>
             </div>

             <div className="flex justify-between items-end bg-[#1c2d3d] text-white p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">Total Value</span>
                    <span className="text-[10px] opacity-40">INR Currency</span>
                </div>
                <span className="text-3xl font-black tracking-tight">₹ {((data.grandTotal || data.amount) || 0).toLocaleString('en-IN')}</span>
             </div>
          </div>
       </div>
     );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] animate-in fade-in duration-500 pb-10 px-4 w-full max-w-4xl mx-auto">
       
       {/* Mode Switcher */}
       {!decodedData && (
           <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 mb-8 flex w-full max-w-xs">
               <button 
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'camera' ? 'bg-[#0854a0] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                   <Camera size={16} className="mr-2" /> Camera
               </button>
               <button 
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-[#0854a0] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
               >
                   <Upload size={16} className="mr-2" /> Upload
               </button>
           </div>
       )}

       {!decodedData && (
           <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-black text-[#1c2d3d] uppercase tracking-tighter">Secure Scanner</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Point at Vedartha Secure QR Code</p>
           </div>
       )}

       {/* Scanner Area */}
       {!decodedData && (
         <div className="relative w-full max-w-[360px] flex flex-col items-center">
             <div className="relative w-full aspect-square bg-black rounded-[40px] overflow-hidden border-[8px] border-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] ring-1 ring-gray-200">
                {/* The Reader Div */}
                <div 
                    id="reader" 
                    className={`w-full h-full object-cover ${activeTab === 'upload' ? 'hidden' : 'block'}`}
                    style={{ background: 'black' }}
                ></div>

                {/* Upload Area */}
                {activeTab === 'upload' && (
                    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        {uploadedImage ? (
                            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain p-4" />
                        ) : (
                            <div className="text-center p-6">
                                <div className="p-5 bg-white/10 rounded-full shadow-inner mb-4 inline-flex">
                                    <ImageIcon size={40} className="text-white" />
                                </div>
                                <p className="text-sm font-black text-white uppercase tracking-widest mb-2">Tap to Upload</p>
                                <p className="text-[10px] font-bold text-gray-400">Supports PDF, JPG, PNG</p>
                            </div>
                        )}
                        {/* ACCEPT PDF NOW */}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                    </div>
                )}
                
                {/* Overlays */}
                {!error && !analyzing && (activeTab === 'camera' || (activeTab === 'upload' && !uploadedImage)) && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {activeTab === 'camera' && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-100 animate-[scan_2s_ease-in-out_infinite] z-20 shadow-[0_0_20px_#10b981]"></div>
                        )}
                        
                        {/* High Contrast Frame */}
                        <div className="w-64 h-64 relative z-10 opacity-90">
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-3xl drop-shadow-md"></div>
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-3xl drop-shadow-md"></div>
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-3xl drop-shadow-md"></div>
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-3xl drop-shadow-md"></div>
                        </div>

                        {activeTab === 'camera' && (
                            <div className="absolute bottom-8 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full flex items-center space-x-3 border border-white/20 shadow-xl">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Scanning...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Analysis Loader */}
                {analyzing && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white text-center p-6">
                        {smartMessage ? (
                            isPdfMode ? <FileTextIcon size={48} className="animate-bounce text-blue-400 mb-6" /> : <Crop size={48} className="animate-bounce text-emerald-400 mb-6" />
                        ) : (
                            <Loader2 size={56} className="animate-spin text-blue-400 mb-6" />
                        )}
                        <p className="text-xs font-black uppercase tracking-[0.2em]">{smartMessage || "Processing Image"}</p>
                    </div>
                )}

                {/* Error Overlay - High Contrast */}
                {error && (
                    <div className="absolute inset-0 bg-white z-40 flex flex-col items-center justify-center p-8 text-center">
                        <div className="p-4 bg-rose-100 rounded-full mb-6">
                            <XCircle size={40} className="text-rose-600" />
                        </div>
                        <h4 className="text-lg font-black text-gray-900 uppercase mb-2 tracking-tight">Detection Failed</h4>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed mb-8">{error}</p>
                        <button 
                            onClick={() => { setError(null); setUploadedImage(null); if(activeTab === 'camera') startCamera(scannerRef.current!); }}
                            className="w-full py-4 bg-[#1c2d3d] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                        >
                            Retry Scan
                        </button>
                    </div>
                )}
             </div>

             {/* Zoom Slider - Only show if camera is active and capabilities exist */}
             {activeTab === 'camera' && !error && !analyzing && zoomCapabilities && (
                 <div className="mt-6 w-full px-4 flex items-center space-x-4 bg-white/50 backdrop-blur rounded-xl p-2 border border-gray-200">
                     <ZoomOut size={16} className="text-gray-500" />
                     <input 
                        type="range" 
                        min={zoomCapabilities.min} 
                        max={zoomCapabilities.max} 
                        step={zoomCapabilities.step} 
                        value={zoomLevel} 
                        onChange={handleZoomChange}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0854a0]"
                     />
                     <ZoomIn size={16} className="text-gray-500" />
                 </div>
             )}
         </div>
       )}

       {/* Result View */}
       {decodedData && renderResultCard()}

       <style>{`
            #reader video { 
                object-fit: cover; 
                width: 100% !important; 
                height: 100% !important; 
                border-radius: 32px;
            }
            @keyframes scan {
                0% { top: 10%; opacity: 0; }
                50% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
            }
       `}</style>
    </div>
  );
};

export default Scanner;
