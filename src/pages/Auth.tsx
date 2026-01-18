import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      navigate("/"); // ✅ THIS WAS MISSING
    }
  };

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) alert(error.message);
    else alert("Signup successful. Please login.");
  };

  const forgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        "https://task-manager-3ah3-git-master-ishant14ggs-projects.vercel.app/reset-password",
    });

    if (error) alert(error.message);
    else alert("Password reset email sent");
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "auto" }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={signIn} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      <button onClick={signUp} style={{ marginLeft: 10 }}>
        Signup
      </button>

      <div style={{ marginTop: 10 }}>
        <button onClick={forgotPassword} style={{ fontSize: 12 }}>
          Forgot password?
        </button>
      </div>
    </div>
  );
}
