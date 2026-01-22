import { ClipboardCheck, LogOut, Shield, User, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut, isAdmin, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 flex items-center justify-center">
              <img
                src="/sharma-logo.png"
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Compliance Tracker
              </h1>
              {profile && (
                <div className="opacity-10 hover:opacity-100 transition-opacity cursor-help text-[8px] bg-muted px-1 rounded inline-block">
                  Role: {profile.role} | Org: {profile.organization_id?.slice(0, 8)}...
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Indian Statutory Deadline Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && location.pathname !== "/admin" && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
            {location.pathname === "/admin" && (
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Dashboard
              </Button>
            )}

            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(profile.full_name, profile.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile.email}
                      </p>
                      <Badge
                        variant={isAdmin ? "default" : "secondary"}
                        className="mt-2 w-fit"
                      >
                        {profile.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
