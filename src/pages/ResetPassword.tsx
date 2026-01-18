import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) alert(error.message);
    else alert("Password updated. You can login now.");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Reset Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={updatePassword}>Update Password</button>
    </div>
  );
}
