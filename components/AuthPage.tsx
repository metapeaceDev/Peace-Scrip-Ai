import React, { useState } from 'react';
import { api } from '../services/api';

interface AuthPageProps {
    onLoginSuccess: (username: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const data = await api.login(email, password);
                localStorage.setItem('peace_token', data.token);
                localStorage.setItem('peace_username', data.username);
                // Ensure offline mode is off if we successfully logged in via cloud
                api.setOfflineMode(false);
                onLoginSuccess(data.username);
            } else {
                await api.register(username, email, password);
                setIsLogin(true);
                setError('Registration successful! Please login.');
            }
        } catch (err: any) {
            console.error(err);
            setError('Authentication failed. Check your connection or credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleOfflineMode = () => {
        api.setOfflineMode(true);
        onLoginSuccess('Guest (Offline)');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 z-10 relative">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-wide">PEACE SCRIPT</h1>
                    <p className="text-gray-400 text-sm">{isLogin ? 'Sign in to access your cloud studio' : 'Create your cloud account'}</p>
                </div>

                {error && <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded mb-6 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Username</label>
                            <input 
                                type="text" required 
                                value={username} onChange={e => setUsername(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="Choose a username"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Email</label>
                        <input 
                            type="email" required 
                            value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="name@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Password</label>
                        <input 
                            type="password" required 
                            value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-cyan-900/30 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Connecting...
                            </span>
                        ) : (isLogin ? 'Login to Cloud' : 'Register Account')}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-gray-500 text-xs uppercase">OR</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                </div>

                <button 
                    onClick={handleOfflineMode}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 rounded-lg border border-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    Continue as Guest (Offline)
                </button>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline text-sm transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;