"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { HamburgerMenu } from "./hamburger-menu";

export function TopNavMobile() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, business_name, logo_url")
          .eq("user_id", user.id)
          .single();

        if (profileData) setProfile(profileData);
      }
    }
    loadUserData();
  }, [supabase]);

  const displayName = profile?.username || user?.email?.split("@")[0] || "User";

  return (
    <>
      {/* Purple Header Bar */}
      <div className="md:hidden bg-[#2d1b4e] border-b border-purple-500/30 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          {/* Left: Donna Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/donna-logo.png"
              alt="Donna"
              width={40}
              height={40}
              className="rounded-lg"
            />
          </div>

          {/* Center: User Info */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            {/* User Logo or Initials */}
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Business"
                className="w-8 h-8 rounded-full object-cover border-2 border-purple-400"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-600 border-2 border-purple-400 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {displayName.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            {/* Username */}
            <span className="text-white text-sm font-medium truncate max-w-[140px]">
              {displayName}
            </span>
          </div>

          {/* Right: Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex-shrink-0 text-white p-2 hover:bg-purple-700/50 rounded-lg transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isMenuOpen && (
        <HamburgerMenu
          businessName={profile?.business_name || "Donna Clean"}
          userEmail={user?.email}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}
