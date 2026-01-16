import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Mail, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "signin" | "signup" | "forgot" | "otp" | "reset";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        },
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        if (data.user && !data.session) {
          // Email confirmation required
          setMode("otp");
          setOtpSent(true);
          toast.success("Verification email sent! Please check your inbox.");
        } else {
          // Auto-confirmed (development mode)
          navigate("/");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Email verified successfully!");
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Verification email resent!");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setOtpSent(true);
        toast.success("Password reset email sent! Please check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Password reset successfully!");
        setMode("signin");
        setNewPassword("");
        setConfirmPassword("");
        setOtpSent(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      signIn();
    } else if (mode === "signup") {
      signUp();
    } else if (mode === "forgot") {
      sendPasswordReset();
    } else if (mode === "otp") {
      verifyOTP();
    }
  };

  // Check if we're in password reset mode from URL or hash
  useEffect(() => {
    // Check for password reset token in URL hash (Supabase sends it this way)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    // Check for mode in query params
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get("mode");
    
    if (type === "recovery" || modeParam === "reset" || accessToken) {
      setMode("reset");
    } else if (urlParams.get("verified") === "true") {
      setMode("otp");
      setOtpSent(true);
    }
    
    // Clear hash after reading
    if (accessToken) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-primary text-primary-foreground">
              <ClipboardCheck className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Compliance Tracker</CardTitle>
          <CardDescription>
            {mode === "signin" && "Sign in to your account"}
            {mode === "signup" && "Create a new account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "otp" && "Verify your email"}
            {mode === "reset" && "Set new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => {
            setMode(v as AuthMode);
            setError(null);
            setOtpSent(false);
          }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Forgot Password */}
          {mode === "forgot" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || otpSent}
                />
              </div>
              {otpSent ? (
                <div className="p-3 text-sm bg-primary/10 text-primary rounded-md">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Password reset link sent! Check your email and click the link to reset your password.
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setOtpSent(false);
                }}
              >
                Back to Sign In
              </Button>
            </form>
          )}

          {/* OTP Verification */}
          {mode === "otp" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Verification Code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  disabled={loading}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the verification code sent to {email}
                </p>
              </div>
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resendOTP}
                disabled={loading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Code
              </Button>
            </form>
          )}

          {/* Reset Password */}
          {mode === "reset" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPassword();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
