import { useState, FormEvent } from "react";
import { supabase } from "../integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved email if "Remember Me" was checked
  useState(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    const remembered = localStorage.getItem("rememberMe");
    if (remembered === "true" && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  });

  const signIn = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("savedEmail");
      }

      toast.success(`Welcome back!`);
      navigate("/");
    }
  };

  const signUp = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Please check your email to verify before logging in.", {
        duration: 6000,
      });
      setIsSignUp(false);
      // Clear password field for security
      setPassword("");
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("✅ Password reset email sent! Please check your mail inbox.", {
        duration: 6000,
      });
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className="auth-page">
      <div className="background-overlay"></div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo and Branding Section */}
          <div className="brand-section">
            <div className="logo-icon">
              <div className="logo-icon p-1">
                <img
                  src="/sharma-logo.png"
                  alt="Sharma Accountant Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="brand-title">Sharma Accountant</h1>
            <p className="brand-tagline">Professional Financial Services</p>
          </div>

          {/* Login/Signup Form */}
          <form
            className="login-form"
            onSubmit={isSignUp ? signUp : signIn}
          >
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().substring(0, 100))}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={passwordVisible ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                  aria-label="Toggle password visibility"
                >
                  {passwordVisible ? (
                    <svg
                      className="eye-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="eye-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="forgot-password"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              <span className="button-text">
                {loading ? (
                  isSignUp ? "Creating account..." : "Signing in..."
                ) : (
                  isSignUp ? "Create Account" : "Login"
                )}
              </span>
              {!loading && (
                <svg
                  className="button-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          {/* Auth Toggle */}
          <div className="auth-toggle">
            <p>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="auth-toggle-link"
              >
                {isSignUp ? "Login" : "Create Account"}
              </button>
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </div>
  );
}
