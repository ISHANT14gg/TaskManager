import { useState } from "react";
import { supabase } from "../integrations/supabase/client";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful. You can login now.");
    }
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
    }
  };

  // 🔐 RESET PASSWORD EMAIL
  const resetPassword = async () => {
    if (!email) {
      alert("Please enter your email first");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        "https://task-manager-3ah3-git-master-ishant14ggs-projects.vercel.app/reset-password",
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent. Check your inbox.");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400 }}>
      <h2>Login / Signup</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <br /><br />

      <button onClick={signIn} disabled={loading}>
        Login
      </button>

      <button
        onClick={signUp}
        disabled={loading}
        style={{ marginLeft: 10 }}
      >
        Signup
      </button>

      <br /><br />

      {/* 🔑 Forgot password */}
      <button
        onClick={resetPassword}
        disabled={loading}
        style={{
          background: "none",
          color: "blue",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Forgot password?
      </button>
    </div>
  );
}
