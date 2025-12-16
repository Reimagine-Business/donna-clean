"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Settings, Shield, LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

interface DesktopUserMenuProps {
  userName?: string;
}

const menuItems = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/legal", label: "Privacy & Legal", icon: Shield },
];

export function DesktopUserMenu({ userName }: DesktopUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 rounded-lg transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 rounded-full">
          <User className="w-4 h-4 text-purple-300" />
        </div>
        {userName && (
          <span className="text-purple-200 text-sm max-w-[150px] truncate hidden lg:block">
            {userName}
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-purple-300 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#1a1a2e] border border-purple-500/30 rounded-lg shadow-xl z-50">
          {/* User Info */}
          {userName && (
            <div className="px-4 py-3 border-b border-purple-500/30">
              <p className="text-purple-300 text-xs">Signed in as</p>
              <p className="text-white text-sm font-medium truncate mt-1">{userName}</p>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-purple-500/20 text-purple-200"
                      : "text-purple-200/70 hover:bg-purple-900/30 hover:text-purple-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div className="px-4 py-2 border-t border-purple-500/30">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
