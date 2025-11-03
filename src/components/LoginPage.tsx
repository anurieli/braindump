'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Mail, Lock, Chrome, Lightbulb, Zap, Network } from 'lucide-react';
import { signIn, signUp, signInWithGoogle } from '@/lib/auth-helpers';
import { useStore } from '@/store/canvas-store';
import { createWelcomeBrainDump } from '@/lib/demo-data';

export default function LoginPage() {
  const router = useRouter();
  const setCurrentUser = useStore(state => state.setCurrentUser);
  const setBrainDumps = useStore(state => state.setBrainDumps);
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { user, error } = await signUp(email, password);
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        
        if (user) {
          // Create welcome brain dump for new users
          const welcomeBrainDump = createWelcomeBrainDump(user.id);
          const brainDumps = new Map([[welcomeBrainDump.id, welcomeBrainDump]]);
          setBrainDumps(brainDumps);
          
          setError('Account created! Please check your email to verify your account, then sign in.');
          setIsSignUp(false);
        }
      } else {
        const { user, token, error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        
        if (user && token) {
          setCurrentUser(user, token);
          // Redirect to main app where brain dumps will load
          router.push('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // OAuth will redirect to main app, so we don't need to handle success here
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      }}
    >
      {/* Hero Marketing Content - Left Side */}
      <div className="hidden lg:flex flex-col max-w-xl mr-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <Brain className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-white">
            Brain Dump Canvas
          </h1>
        </div>
        
        <p className="text-2xl mb-12 text-white/90 leading-relaxed">
          A visual thinking tool with an infinite 2D canvas where you can rapidly capture thoughts as spatial nodes and connect them with labeled relationships to form knowledge graphs.
        </p>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <Zap className="h-8 w-8 mt-1 flex-shrink-0 text-yellow-300" />
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">Zero-Friction Capture</h3>
              <p className="text-white/80">Persistent input box for rapid thought capture. No barriers between your ideas and the canvas.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <Lightbulb className="h-8 w-8 mt-1 flex-shrink-0 text-yellow-300" />
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">Spatial Organization</h3>
              <p className="text-white/80">Drag and drop ideas anywhere on an infinite canvas. Organize your thinking visually.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <Network className="h-8 w-8 mt-1 flex-shrink-0 text-yellow-300" />
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">Connected Thinking</h3>
              <p className="text-white/80">Create rich relationships by dragging ideas onto each other. Build your knowledge graph.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Box - Right Side */}
      <div 
        className="w-full max-w-md rounded-3xl p-8 backdrop-blur-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        }}
      >
        {/* Logo for mobile */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Brain className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Brain Dump Canvas
          </h1>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2 text-gray-900">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-center mb-8 text-gray-600">
          {isSignUp ? 'Start organizing your thoughts visually' : 'Sign in to access your brain dumps'}
        </p>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 p-4 rounded-lg text-sm"
            style={{
              background: error.includes('created') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${error.includes('created') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: error.includes('created') ? '#15803d' : '#dc2626',
            }}
          >
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <Button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full mb-6 h-12 text-base font-medium"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            border: 'none',
          }}
        >
          <Chrome className="h-5 w-5 mr-2" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span 
              className="px-4 bg-white text-gray-500"
            >
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-700">
              Email
            </Label>
            <div className="relative mt-1">
              <Mail 
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" 
              />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 h-12 bg-gray-50 border-gray-300 text-gray-900"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-700">
              Password {isSignUp && <span className="text-gray-500">(min. 6 characters)</span>}
            </Label>
            <div className="relative mt-1">
              <Lock 
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" 
              />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 h-12 bg-gray-50 border-gray-300 text-gray-900"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-medium"
            style={{
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              border: '2px solid #667eea',
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        {/* Toggle Sign Up/Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            disabled={loading}
            className="text-sm hover:underline text-purple-600 font-medium"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Terms */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

