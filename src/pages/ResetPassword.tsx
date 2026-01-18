import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase sets session automatically from URL
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Invalid or expired reset link");
        navigate("/auth");
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleReset = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      navigate("/auth");
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-6 border rounded-lg">
        <h1 className="text-xl font-bold text-center">Reset Password</h1>

        <div className="space-y-2">
          <Label>New Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={handleReset}>
          Update Password
        </Button>
      </div>
    </div>
  );
}
