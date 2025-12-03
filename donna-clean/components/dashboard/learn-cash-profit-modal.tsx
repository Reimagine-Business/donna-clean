"use client";

import { X } from "lucide-react";

interface LearnModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCash: number;
  userProfit: number;
  pendingCollections: number;
  pendingBills: number;
}

export function LearnCashProfitModal({
  isOpen,
  onClose,
  userCash,
  userProfit,
  pendingCollections,
  pendingBills
}: LearnModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-gray-900 rounded-xl border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 sm:px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">💡 Understanding Cash vs Profit</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* What is Profit */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-blue-400">📊 What is Profit?</h3>
            <p className="text-sm text-gray-300">
              Profit is money you've <strong>earned</strong>, whether you've received it yet or not.
            </p>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-200">
                Example: You sold goods worth ₹10,000 to a customer on credit.
                You've <strong>earned</strong> ₹10,000 profit, even though the customer
                hasn't paid you yet.
              </p>
            </div>
          </div>

          {/* What is Cash */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-green-400">💰 What is Cash?</h3>
            <p className="text-sm text-gray-300">
              Cash is the actual money you <strong>have</strong> in your bank or hand right now.
            </p>
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-200">
                Example: When that customer finally pays you the ₹10,000,
                it becomes <strong>cash</strong>. Until then, it's just a promise to pay.
              </p>
            </div>
          </div>

          {/* Your Situation */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-purple-400">🎯 Your Situation</h3>
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Your Profit:</span>
                <span className="text-lg font-bold text-blue-400">
                  ₹{userProfit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Your Cash:</span>
                <span className="text-lg font-bold text-green-400">
                  ₹{userCash.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-t border-purple-500/30 pt-3 mt-3">
                <p className="text-sm text-purple-200">
                  {userCash > userProfit ? (
                    <>You have <strong>more cash</strong> than profit because you might have received advances or collected old dues.</>
                  ) : userCash < userProfit ? (
                    <>You have <strong>less cash</strong> than profit because:</>
                  ) : (
                    <>Your cash and profit are equal - perfect alignment!</>
                  )}
                </p>
                {userCash < userProfit && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-400 list-disc list-inside">
                    {pendingCollections > 0 && (
                      <li>Customers owe you ₹{pendingCollections.toLocaleString('en-IN')}</li>
                    )}
                    {pendingBills > 0 && (
                      <li>You haven't paid ₹{pendingBills.toLocaleString('en-IN')} in bills yet</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Why It Matters */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-yellow-400">⚡ Why This Matters</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <strong>High profit, low cash?</strong> You need to collect payments faster
                or reduce credit sales.
              </p>
              <p>
                <strong>Low profit, high cash?</strong> Great! You're collecting well.
                Focus on increasing sales.
              </p>
              <p>
                <strong>Both growing?</strong> Your business is healthy and sustainable!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-4 sm:px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
