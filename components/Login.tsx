import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Video, Globe } from 'lucide-react';
import { COMPANY_LOGO } from '../constants';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Logo specifically requested for this screen
  const VEDARTHA_LOGO = "https://res.cloudinary.com/dtgufvwb5/image/upload/v1765436446/Vedartha_Global_Consultancy_LOGO-removebg-preview_xt90yx.png";

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        const email = googleUser.email;

        if (!email) {
            throw new Error("No email address linked to this Google Account.");
        }

        // --- AUTH STRATEGY: MAP GOOGLE EMAIL TO INTERNAL ROLE ---
        let authenticatedUser: any = null;

        // 1. Check Clients
        const clientsRef = collection(db, 'clients');
        const clientQ = query(clientsRef, where('email', '==', email));
        const clientSnap = await getDocs(clientQ);

        if (!clientSnap.empty) {
            const clientData = clientSnap.docs[0].data();
            if (clientData.portalAccess) {
                authenticatedUser = {
                    uid: clientData.id,
                    email: clientData.email,
                    displayName: clientData.name,
                    role: UserRole.CLIENT,
                    clientId: clientData.id,
                    isClient: true
                };
            } else {
                throw new Error('Portal access is disabled for this client account.');
            }
        }

        // 2. Check Custom Staff/Employee Users
        if (!authenticatedUser) {
            const usersRef = collection(db, 'users');
            const userQ = query(usersRef, where('email', '==', email));
            const userSnap = await getDocs(userQ);

            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                authenticatedUser = {
                    uid: userSnap.docs[0].id,
                    email: userData.email,
                    displayName: userData.displayName,
                    role: userData.role,
                    allowedBranchIds: userData.allowedBranchIds || [],
                    isStaff: true,
                    employeeId: userData.employeeId
                };
            }
        }

        // 3. Check Branches (Managers)
        if (!authenticatedUser) {
            const branchesRef = collection(db, 'branches');
            const branchQ = query(branchesRef, where('email', '==', email));
            const branchSnap = await getDocs(branchQ);

            if (!branchSnap.empty) {
                const branchData = branchSnap.docs[0].data();
                authenticatedUser = {
                    uid: branchData.id,
                    email: branchData.email,
                    displayName: `${branchData.name} (Manager)`,
                    role: UserRole.BRANCH_MANAGER,
                    allowedBranchIds: [branchData.id],
                    isBranchUser: true
                };
            }
        }

        // 4. Final Check: Proceed or Deny
        if (authenticatedUser) {
            // We use the internal 'vedartha_user' persistence for consistency with role-based features.
            // We sign out of the Firebase 'auth' session immediately to prevent 'App.tsx' from 
            // treating this as a generic Admin session via onAuthStateChanged default logic.
            // The synthetic user object carries all necessary permissions.
            await signOut(auth);

            if (rememberMe) {
                localStorage.setItem('vedartha_user', JSON.stringify(authenticatedUser));
            } else {
                localStorage.removeItem('vedartha_user');
            }
            onLogin(authenticatedUser);
        } else {
            // If email is not in database, we don't allow login, even if Google Auth passed.
            await signOut(auth);
            throw new Error("Access Denied: This email is not registered in our system.");
        }

    } catch (err: any) {
        console.error("Google Login Error:", err);
        let msg = "Google Authentication Failed.";
        if (err.code === 'auth/popup-closed-by-user') msg = "Login cancelled.";
        else if (err.message) msg = err.message;
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const cleanLoginId = loginId.trim();
    const cleanPassword = password.trim();

    if (!cleanLoginId || !cleanPassword) {
      setError('Please enter both Username and Password.');
      setLoading(false);
      return;
    }
    
    try {
        let authenticatedUser: any = null;

        // STRATEGY 1: Check Client Portal Login
        if (!cleanLoginId.includes('@')) {
           const clientsRef = collection(db, 'clients');
           const clientQ = query(clientsRef, where('id', '==', cleanLoginId), where('portalPassword', '==', cleanPassword));
           const clientSnapshot = await getDocs(clientQ);

           if (!clientSnapshot.empty) {
              const clientData = clientSnapshot.docs[0].data();
              if (clientData.portalAccess) {
                 authenticatedUser = {
                    uid: clientData.id,
                    email: clientData.email,
                    displayName: clientData.name,
                    role: UserRole.CLIENT,
                    clientId: clientData.id,
                    isClient: true
                 };
              } else {
                 throw new Error('Portal access is disabled for this client.');
              }
           }

           // STRATEGY 2: Check Branch Portal Login
           if (!authenticatedUser) {
               const branchesRef = collection(db, 'branches');
               const branchQ = query(branchesRef, where('portalUsername', '==', cleanLoginId), where('portalPassword', '==', cleanPassword));
               const branchSnapshot = await getDocs(branchQ);

               if (!branchSnapshot.empty) {
                   const branchData = branchSnapshot.docs[0].data();
                   authenticatedUser = {
                       uid: branchData.id,
                       email: branchData.email,
                       displayName: `${branchData.name} (Manager)`,
                       role: UserRole.BRANCH_MANAGER,
                       allowedBranchIds: [branchData.id],
                       isBranchUser: true 
                   };
               }
           }
        }

        // STRATEGY 3: Check Custom Staff/Employee Users
        if (!authenticatedUser) {
            const usersRef = collection(db, 'users');
            let userQ;
            if (cleanLoginId.includes('@')) {
                 userQ = query(usersRef, where('email', '==', cleanLoginId), where('password', '==', cleanPassword));
            } else {
                 userQ = query(usersRef, where('employeeId', '==', cleanLoginId), where('password', '==', cleanPassword));
            }
            
            const userSnapshot = await getDocs(userQ);

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                authenticatedUser = {
                    uid: userSnapshot.docs[0].id,
                    email: userData.email,
                    displayName: userData.displayName,
                    role: userData.role,
                    allowedBranchIds: userData.allowedBranchIds || [],
                    isStaff: true, 
                    employeeId: userData.employeeId 
                };
            }
        }

        // STRATEGY 4: Fallback to Firebase Auth (Admin/Owner)
        if (!authenticatedUser && cleanLoginId.includes('@')) {
            const userCredential = await signInWithEmailAndPassword(auth, cleanLoginId, cleanPassword);
            authenticatedUser = userCredential.user;
        }

        if (authenticatedUser) {
            // PERSISTENCE LOGIC
            if (rememberMe) {
                localStorage.setItem('vedartha_user', JSON.stringify(authenticatedUser));
            } else {
                localStorage.removeItem('vedartha_user');
            }
            
            onLogin(authenticatedUser);
        } else {
            throw new Error('Invalid Credentials. Please check your ID and Password.');
        }

    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed.';
      if (typeof err === 'string') msg = err;
      else if (err.message) msg = err.message;
      else if (err.code === 'auth/invalid-credential') msg = 'Invalid credentials.';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try later.';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email format.';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white overflow-hidden">
      {/* LEFT SIDE: Video Background & Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-16 text-white overflow-hidden">
         {/* Video Background */}
         <div className="absolute inset-0 z-0">
            <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
            >
                {/* Updated to a high-quality abstract tech loop for seamless background */}
                <source src="https://cdn.pixabay.com/video/2019/04/20/22908-331624479_large.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#001f3f]/90 via-[#001f3f]/70 to-[#001f3f]/40"></div>
         </div>

         {/* Content Layer */}
         <div className="relative z-10 h-full flex flex-col justify-between">
             <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl w-fit border border-white/10 shadow-lg">
                <img src={VEDARTHA_LOGO} alt="Vedartha Global" className="h-16 object-contain" />
             </div>

             <div className="space-y-6 max-w-lg">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-200 text-[10px] font-bold uppercase tracking-widest">
                    <Globe size={12} />
                    <span>Cloud ERP System</span>
                </div>
                <h1 className="text-5xl font-bold leading-tight tracking-tight drop-shadow-lg">
                  Vedartha Global Consultancy
                </h1>
                <p className="text-lg text-blue-100 font-medium leading-relaxed drop-shadow-md">
                  Seamlessly manage enterprise invoicing, multi-branch accounting, and client relations through our secure, centralized portal.
                </p>
             </div>

             <div className="text-[10px] text-blue-200/60 font-mono">
                System Status: Operational | v2.4.0
             </div>
         </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50 overflow-y-auto">
         <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-right-8 duration-700 bg-white p-10 rounded-[32px] shadow-xl border border-gray-100">
            
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Portal Access</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Secure Login Terminal</p>
            </div>

            <div className="space-y-6">
               {error && (
                 <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-start animate-shake">
                   <ShieldCheck size={16} className="mr-3 shrink-0 mt-0.5" />
                   <span className="leading-relaxed">{error}</span>
                 </div>
               )}

               <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1">Identity (ID / Email)</label>
                  <input 
                    type="text" 
                    placeholder="Enter Client ID, Branch Code, or Email"
                    className="w-full h-14 px-6 rounded-2xl border-2 border-gray-100 bg-gray-50/50 text-sm font-bold text-gray-900 focus:border-[#0854a0] focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                     <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Secure Key</label>
                     <button type="button" className="text-[10px] font-bold text-[#0854a0] hover:underline transition-colors" onClick={() => alert('Please contact IT Admin to reset credentials.')}>Forgot?</button>
                  </div>
                  <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••••••"
                        className="w-full h-14 px-6 rounded-2xl border-2 border-gray-100 bg-gray-50/50 text-sm font-bold text-gray-900 focus:border-[#0854a0] focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
               </div>

               <div className="flex items-center justify-between py-2">
                  <label className="flex items-center cursor-pointer group">
                      <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0854a0]"></div>
                      </div>
                      <span className="ml-3 text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors select-none">Keep me logged in</span>
                  </label>
               </div>

               <button 
                 onClick={handleSubmit}
                 disabled={loading}
                 className="w-full h-14 bg-[#0854a0] hover:bg-[#064280] text-white font-black uppercase tracking-widest rounded-2xl text-xs transition-all shadow-xl shadow-blue-100 flex items-center justify-center transform active:scale-[0.98]"
               >
                 {loading ? <Loader2 className="animate-spin" /> : 'Authenticate & Access'}
               </button>

               <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-gray-400 uppercase">Or Continue With</span>
                    <div className="flex-grow border-t border-gray-100"></div>
               </div>

               {/* Google Login Button */}
               <button 
                 onClick={handleGoogleLogin}
                 disabled={loading}
                 type="button"
                 className="w-full h-14 border-2 border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-2xl text-xs transition-all flex items-center justify-center transform active:scale-[0.98]"
               >
                 <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-3" alt="Google" />
                 Login with Google
               </button>
            </div>
            
            <p className="text-center text-[10px] text-gray-400 font-medium mt-6">
                By logging in, you agree to our internal data privacy policies.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Login;