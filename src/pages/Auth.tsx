import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { SignupSurvey } from '@/components/weather/signup-survey';
import { useReferral } from '@/hooks/use-referral';
import rainzLogo from '@/assets/rainz-logo-new.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [newUserId, setNewUserId] = useState<string | undefined>();
  const [resetMode, setResetMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { processReferral } = useReferral();

  useEffect(() => {
    const isReset = searchParams.get('reset') === 'true';
    setResetMode(isReset);

    const postAuthRedirect = () => {
      window.location.href = '/';
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentIsReset = new URLSearchParams(window.location.search).get('reset') === 'true';
      if (session?.user) {
        setUser(session.user);
        if (!currentIsReset) postAuthRedirect();
      } else {
        setUser(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        if (!isReset) postAuthRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage || {}).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) sessionStorage.removeItem(key);
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast({ variant: "destructive", title: "Sign In Failed", description: error.message }); return; }
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
    if (!email) { toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address first." }); return; }
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-password-reset', {
        body: { email, redirectUrl: `${window.location.origin}/auth?reset=true` }
      });
      if (response.error) { toast({ variant: "destructive", title: "Password Reset Failed", description: response.error.message }); return; }
      if (response.data?.error) { toast({ variant: "destructive", title: "Password Reset Failed", description: response.data.error }); return; }
      toast({ title: "Reset Link Sent!", description: "Check your email for a password reset link." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Password Reset Failed", description: error.message || "An unexpected error occurred" });
    } finally { setLoading(false); }
  };

  const getPasswordErrors = (pw: string): string[] => {
    const errors: string[] = [];
    if (pw.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pw)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(pw)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(pw)) errors.push("One number");
    if (!/[^A-Za-z0-9]/.test(pw)) errors.push("One special character (!@#$...)");
    return errors;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast({ variant: "destructive", title: "Passwords Don't Match", description: "Please make sure both passwords are the same." }); return; }
    const pwErrors = getPasswordErrors(newPassword);
    if (pwErrors.length > 0) { toast({ variant: "destructive", title: "Weak Password", description: `Missing: ${pwErrors.join(", ")}` }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast({ variant: "destructive", title: "Password Update Failed", description: error.message }); return; }
      toast({ title: "Password Updated!", description: "Your password has been successfully changed." });
      setResetMode(false);
      window.location.href = '/';
    } catch (error: any) {
      toast({ variant: "destructive", title: "Password Update Failed", description: error.message || "An unexpected error occurred" });
    } finally { setLoading(false); }
  };

  const tryClaimSFFounder = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await supabase.functions.invoke('claim-sf-founder', {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (data?.awarded) {
            toast({
              title: '🌉 Welcome, SF Founder!',
              description: `Exclusive Bay Area badge unlocked + ${data.points ?? 500} bonus points.`,
            });
          }
        } catch { /* silent */ }
      },
      () => { /* denied — no reward, no error */ },
      { maximumAge: 60_000, timeout: 8000 },
    );
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) { toast({ variant: "destructive", title: "Weak Password", description: `Missing: ${pwErrors.join(", ")}` }); return; }
    setLoading(true);
    try {
      cleanupAuthState();
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } });
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Database error')) errorMessage = "This email may already be registered. Try signing in instead.";
        else if (error.message.includes('already registered')) errorMessage = "This email is already registered. Please sign in instead.";
        toast({ variant: "destructive", title: "Sign Up Failed", description: errorMessage });
        return;
      }
      if (data.user) {
        try {
          // Profiles live on Aiven now — go through the edge function instead
          // of supabase.from('profiles'), which is empty post-cleanup.
          await supabase.functions.invoke('profiles', {
            method: 'POST',
            body: {
              username: email.split('@')[0],
              display_name: email.split('@')[0],
              notification_enabled: false,
              notification_time: '08:00',
            },
          });
        } catch (profileErr) { console.log('Profile upsert skipped:', profileErr); }

        setNewUserId(data.user.id);
        setShowSurvey(true);
        const refCode = searchParams.get('ref');
        if (refCode) processReferral(refCode, data.user.id);
        toast({ title: "Account Created!", description: "Please check your email to verify your account." });
        // 🌉 SF Founder launch reward — try to claim if the user is in the Bay Area.
        tryClaimSFFounder();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: error.message || "An unexpected error occurred" });
    } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'select_account' } },
      });
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('provider is not enabled')) errorMessage = 'Google sign-in is not configured. Please contact support.';
        else if (error.message.includes('invalid')) errorMessage = 'Google sign-in configuration error. Please try email sign-in.';
        toast({ variant: "destructive", title: "Google Sign In Failed", description: errorMessage });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Google Sign In Failed", description: error.message || "An unexpected error occurred" });
    } finally { setLoading(false); }
  };

  const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  // Password reset form (minimal)
  if (resetMode && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <img src={rainzLogo} alt="Rainz" className="h-10 mx-auto" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password to secure your account.</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="pl-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-2xl font-medium" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Rainz
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <img src={rainzLogo} alt="Rainz" className="h-9" />
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to predict, compete and save your spots.</p>
          </div>
        </div>

        {/* Google first — friction-free */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-3 font-medium border-border/60 bg-muted/20 hover:bg-muted/40"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          <span className="h-px flex-1 bg-border/60" />
          or with email
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 rounded-full bg-muted/30 p-1">
            <TabsTrigger value="signin" className="rounded-full text-sm">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full text-sm">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="signin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl font-medium" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <button type="button" onClick={handleForgotPassword} disabled={loading} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot your password?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            {showSurvey ? (
              <SignupSurvey userId={newUserId} onComplete={() => setShowSurvey(false)} />
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-border/50" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { ok: password.length >= 8, label: "8+ chars" },
                      { ok: /[A-Z]/.test(password), label: "A-Z" },
                      { ok: /[a-z]/.test(password), label: "a-z" },
                      { ok: /[0-9]/.test(password), label: "0-9" },
                      { ok: /[^A-Za-z0-9]/.test(password), label: "!@#" },
                    ].map(c => (
                      <span key={c.label} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${c.ok ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-2xl font-medium" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  By continuing you agree to our{' '}
                  <Link to="/terms" className="text-foreground hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-foreground hover:underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
