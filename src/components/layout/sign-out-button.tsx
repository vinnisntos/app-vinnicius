import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-3 text-gray-400 hover:text-foreground"
      >
        <LogOut className="size-4" aria-hidden />
        Sair
      </Button>
    </form>
  );
}
