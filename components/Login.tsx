import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { COMPANY_LOGO } from '../constants';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
        // STRATEGY 1: Check Client Portal Login (Client ID based)
        // If input does not look like an email, assume it's a Client ID.
        if (!email.includes('@') && !email.startsWith('EMP-')) {
           // We assume standard Client IDs don't start with EMP- (which is our Employee Code format)
           // But actually, the prompt says Username/Password = Employee Code.
           // Let's refine: try Client first, if fail, try User (Employee).
           
           const clientsRef = collection(db, 'clients');
           const q = query(clientsRef, where('id', '==', email), where('portalPassword', '==', password));
           const querySnapshot = await getDocs(q);

           if (!querySnapshot.empty) {
              const clientData = querySnapshot.docs[0].data();
              if (clientData.portalAccess) {
                 const syntheticUser = {
                    uid: clientData.id,
                    email: clientData.email,
                    displayName: clientData.name,
                    role: UserRole.CLIENT,
                    clientId: clientData.id,
                    isClient: true
                 };
                 onLogin(syntheticUser);
                 return; // Success
              } else {
                 throw new Error('Portal access is disabled for this client.');
              }
           }
        }

        // STRATEGY 2: Check Custom Staff Users (Stored in Firestore 'users' collection)
        // This handles both Admins/Accountants created in Settings AND Employees auto-created in Payroll.
        const usersRef = collection(db, 'users');
        const userQ = query(usersRef, where('email', '==', email), where('password', '==', password));
        const userSnapshot = await getDocs(userQ);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const syntheticStaff = {
                uid: userSnapshot.docs[0].id,
                email: userData.email,
                displayName: userData.displayName,
                role: userData.role,
                allowedBranchIds: userData.allowedBranchIds || [],
                isStaff: true, // Flag to identify staff in App.tsx
                employeeId: userData.employeeId // Important for Employee Portal
            };
            onLogin(syntheticStaff);
            return; // Success
        }

        // If 'email' looked like a Client ID but failed Strategy 1, and failed Strategy 2, 
        // AND it doesn't look like an email for Firebase Auth, throw error.
        if (!email.includes('@')) {
             throw new Error('Invalid Credentials.');
        }

        // STRATEGY 3: Fallback to Firebase Auth (Legacy/Root Admin)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLogin(userCredential.user);

    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed.';
      if (typeof err === 'string') msg = err;
      else if (err.message) msg = err.message;
      else if (err.code === 'auth/invalid-credential') msg = 'Invalid credentials.';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try later.';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f7fa] relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#0854a0]"></div>
      <div className="absolute top-0 right-0 w-1/2 h-screen bg-blue-50/50 -skew-x-12 transform translate-x-1/3 z-0"></div>
      
      <div className="w-full max-w-[480px] z-10 p-4">
        <div className="bg-white rounded-[32px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden transition-all duration-500">
          <div className="p-10 pb-6 text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={COMPANY_LOGO} 
                alt="VEDARTHA" 
                className="h-16 object-contain"
              />
            </div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase mb-1">
              Vedartha International Limited
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center animate-shake">
                <ShieldCheck size={16} className="mr-3 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-2xl pl-14 pr-6 text-sm font-bold transition-all outline-none"
                  placeholder="Login ID / Employee Code"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#0854a0] focus:bg-white rounded-2xl pl-14 pr-6 text-sm font-bold transition-all outline-none"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#0854a0] focus:ring-[#0854a0]" />
                <span className="ml-3 text-[11px] font-bold text-gray-500 group-hover:text-gray-700">Remember me</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#0854a0] text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-[#064280] transition-all transform active:scale-95 flex items-center justify-center group disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (
                 <>Secure Access <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="p-8 bg-gray-50/50 border-t border-gray-100 text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Secured by Vedartha Systems & Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;