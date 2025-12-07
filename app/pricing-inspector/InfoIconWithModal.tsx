"use client";

import { useState } from "react";

export default function InfoIconWithModal({
  title,
  children,
  size = 14,
}: {
  title: string;
  children: React.ReactNode;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ICON */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center ml-1 text-gray-400 hover:text-gray-600 transition"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <circle cx="12" cy="8" r="1" />
        </svg>
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn"
          onClick={() => setOpen(false)}
        >
          {/* MODAL */}
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 relative animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                className="text-gray-400 hover:text-gray-600 transition"
                onClick={() => setOpen(false)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* CONTENT */}
            <div className="max-h-[70vh] overflow-y-auto pr-1 text-sm leading-relaxed text-gray-700 space-y-3">
              {/* Auto-format <pre> sections nicely */}
              <div className="[&>pre]:bg-gray-50 [&>pre]:border [&>pre]:border-gray-200 [&>pre]:rounded-lg [&>pre]:p-3 [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:whitespace-pre-wrap">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATIONS */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
