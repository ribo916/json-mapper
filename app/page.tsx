"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
              >
                <circle cx="6" cy="12" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="18" cy="18" r="2" />
                <line x1="8" y1="12" x2="16" y2="6" />
                <line x1="8" y1="12" x2="16" y2="18" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Data Tools Suite</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a tool to work with your data. Transform JSON with mappings or analyze pricing engine results.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* JSON Converter Card */}
          <Link
            href="/json-converter"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 p-8 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center rounded-lg transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">JSON Converter</h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Transform and map JSON data between different formats using configurable mapping rules.
              Perfect for data integration and API transformations.
            </p>
            <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
              <span>Start Converting</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Pricing Inspector Card */}
          <Link
            href="/pricing-inspector"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 p-8 border border-gray-200 hover:border-green-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 flex items-center justify-center rounded-lg transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  <path d="M6 8h4" />
                  <path d="M14 8h4" />
                  <path d="M6 12h4" />
                  <path d="M14 12h4" />
                  <path d="M6 16h4" />
                  <path d="M14 16h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Pricing Inspector</h2>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Analyze and debug pricing engine (PPE) results. Understand eligibility rules,
              price adjustments, and why products are valid or invalid.
            </p>
            <div className="flex items-center text-green-600 font-medium group-hover:text-green-700">
              <span>Start Inspecting</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Data transformation and analysis tools for modern workflows</p>
        </div>
      </div>
    </div>
  );
}