"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "transparent",
        border: "1px solid #2a2a2e",
        borderRadius: "6px",
        padding: "6px 14px",
        color: "#71717a",
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      Salir
    </button>
  );
}
