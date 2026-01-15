import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, CloudRain, Mail, Lock, ArrowLeft, Sparkles, Shield, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import rainzLogo from '@/assets/rainz-logo-new.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const isReset = searchParams.get('reset') === 'true';
    setResetMode(isReset);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentIsReset = new URLSearchParams(window.location.search).get('reset') === 'true';
      
      if (session?.user) {
        setUser(session.user);
        if (!currentIsReset) {
          window.location.href = '/';
        }
      } else {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        if (!isReset) {
          window.location.href = '/';
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {}
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Sign In Failed", description: error.message });
        return;
      }
      if (data.user) {
        toast({ title: "Welcome back!", description: "You've been signed in successfully." });
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign In Failed", description: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address first." });
      return;
    }
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-password-reset', {
        body: {
          email,
          redirectUrl: `${window.location.origin}/auth?reset=true`
        }
      });
      
      if (response.error) {
        toast({ variant: "destructive", title: "Password Reset Failed", description: response.error.message });
        return;
      }
      
      if (response.data?.error) {
        toast({ variant: "destructive", title: "Password Reset Failed", description: response.data.error });
        return;
      }
      
      toast({ title: "Reset Link Sent!", description: "Check your email for a password reset link." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Password Reset Failed", description: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords Don't Match", description: "Please make sure both passwords are the same." });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password Too Short", description: "Password must be at least 6 characters." });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast({ variant: "destructive", title: "Password Update Failed", description: error.message });
        return;
      }
      
      toast({ title: "Password Updated!", description: "Your password has been successfully changed." });
      setResetMode(false);
      window.location.href = '/';
    } catch (error: any) {
      toast({ variant: "destructive", title: "Password Update Failed", description: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Database error')) {
          errorMessage = "This email may already be registered. Try signing in instead.";
        } else if (error.message.includes('already registered')) {
          errorMessage = "This email is already registered. Please sign in instead.";
        }
        toast({ variant: "destructive", title: "Sign Up Failed", description: errorMessage });
        return;
      }
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            username: email.split('@')[0],
            display_name: email.split('@')[0],
            notification_enabled: false,
            notification_time: '08:00'
          }, { onConflict: 'user_id' });
        } catch (profileErr) {
          console.log('Profile upsert skipped:', profileErr);
        }
        toast({ title: "Account Created!", description: "Please check your email to verify your account." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message || "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {}

      const redirectTo = `${window.location.origin}/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        toast({ variant: "destructive", title: "Google Sign In Failed", description: error.message });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  // Password reset form
  if (resetMode && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={rainzLogo} alt="Rainz" className="h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-muted-foreground mt-2">Enter your new password below</p>
          </div>
          
          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="new-password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter new password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      required 
                      minLength={6}
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(prev => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirm-password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Confirm new password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      required 
                      minLength={6}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-700" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <img src={rainzLogo} alt="Rainz" className="h-14 w-auto mb-8 brightness-0 invert" />
          
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Weather predictions<br />you can trust
          </h2>
          <p className="text-lg text-white/80 mb-12 max-w-md">
            Join thousands of weather enthusiasts who predict, compete, and earn points.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Accurate Forecasts</h3>
                <p className="text-sm text-white/70">Multi-source weather data for reliable predictions</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Compete & Earn</h3>
                <p className="text-sm text-white/70">Make predictions and climb the leaderboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Premium Features</h3>
                <p className="text-sm text-white/70">Unlock advanced tools and personalized alerts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Rainz
            </Link>
            <img src={rainzLogo} alt="Rainz" className="h-10 mx-auto mb-4" />
          </div>
          
          {/* Desktop back link */}
          <div className="hidden lg:block mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Rainz
            </Link>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
              <CardDescription className="text-center">
                Sign in to save preferences and get personalized alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                  <TabsTrigger value="signin" className="text-sm font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="mt-0">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signin-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          required 
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signin-password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter your password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          className="pl-10 pr-10 h-11"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(prev => !prev)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full text-sm text-muted-foreground hover:text-foreground" 
                      onClick={handleForgotPassword} 
                      disabled={loading}
                    >
                      Forgot your password?
                    </Button>
                  </form>
                  
                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground uppercase tracking-wide">
                      or
                    </span>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-11 flex items-center justify-center gap-3 font-medium" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          required 
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Create a password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          minLength={6}
                          className="pl-10 pr-10 h-11"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(prev => !prev)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                  
                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground uppercase tracking-wide">
                      or
                    </span>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-11 flex items-center justify-center gap-3 font-medium" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-6">
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
