"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <button
        type="button"
        className="px-3 py-1.5 text-sm rounded border opacity-60 cursor-default"
        disabled
      >
        Loading…
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 max-w-[14rem] truncate" title={user.email ?? ""}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="px-3 py-1.5 text-sm rounded border bg-gray-900 text-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className="px-3 py-1.5 text-sm rounded border bg-blue-600 text-white"
    >
      Sign in
    </Link>
  );
}