"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/settings/actions";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { Trash2 } from "lucide-react";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      showError("Please type the exact confirmation text");
      return;
    }

    setIsDeleting(true);
    const loadingToastId = showLoading("Deleting your account...");

    try {
      const result = await deleteAccount(confirmText);

      dismissToast(loadingToastId);

      if (result.success) {
        showSuccess("Account deleted successfully. Goodbye!");
        // Wait a moment before redirecting
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        showError(result.error || "Failed to delete account");
        setIsDeleting(false);
      }
    } catch (error) {
      dismissToast(loadingToastId);
      showError("An error occurred while deleting your account");
      setIsDeleting(false);
    }
  };

  const isConfirmTextValid = confirmText === "DELETE MY ACCOUNT";

  return (
    <section className="p-6 border border-red-500/50 rounded-lg bg-red-500/5">
      <div className="flex items-start gap-3 mb-4">
        <Trash2 className="w-6 h-6 text-red-500 mt-1" />
        <div>
          <h2 className="text-xl font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-purple-300 mb-2">
            Once you delete your account, there is no going back. This action is <strong>permanent</strong>.
          </p>
          <p className="text-sm text-purple-400">
            All your data will be permanently deleted, including:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-purple-300">
            <li>All entries (Cash IN, Cash OUT, Credit, Advance)</li>
            <li>All settlements and transaction history</li>
            <li>All parties (customers and vendors)</li>
            <li>All analytics and reports data</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => setShowDialog(true)}
        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
      >
        Delete My Account
      </button>

      {/* Custom Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Are you absolutely sure?
            </h3>

            <div className="space-y-4 mb-6">
              <p className="text-purple-300 text-sm">
                This action <strong className="text-red-400">cannot be undone</strong>. This will permanently delete your account and remove all your data from our servers.
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  This includes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-red-300">
                  <li>All your financial entries</li>
                  <li>All your settlements</li>
                  <li>All your parties (customers and vendors)</li>
                  <li>All your reports and analytics</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Type{" "}
                  <span className="font-mono bg-purple-900/30 px-2 py-1 rounded text-purple-100">
                    DELETE MY ACCOUNT
                  </span>{" "}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type here..."
                  className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/30 rounded-md text-white placeholder:text-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  disabled={isDeleting}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setConfirmText("");
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-white rounded-md font-medium transition-colors border border-purple-500/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isConfirmTextValid || isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
