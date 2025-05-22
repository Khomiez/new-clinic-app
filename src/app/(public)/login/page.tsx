// app/page.js
"use client";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/context";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const { login, loading, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      await login(username, password);
      // Redirect is handled inside the login function in AuthContext
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Head>
        <title>Staff Login | Medical Clinic</title>
      </Head>

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-blue-100">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <span className="text-4xl">👩‍⚕️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-800">
            เข้าสู่ระบบเจ้าหน้าที่
          </h1>
          <p className="text-blue-400 mt-2">ยินดีต้อนรับกลับสู่ระบบจัดการคลินิก</p>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-blue-700 mb-2"
            >
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-blue-400">👤</span>
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="font-bold block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                style={{ color: "var(--text-deep-blue)" }}
                placeholder="ีusername"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-blue-700 mb-2"
              htmlFor="password"
            >
              รหัสผ่าน
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-blue-400">🔒</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className=" font-bold block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                style={{ color: "var(--text-deep-blue)" }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-500 border-blue-300 rounded focus:ring-blue-400"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-blue-600"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div> */}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>

        {displayError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {displayError}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-blue-100 text-center">
          <p className="text-sm text-blue-400">
            ต้องการความช่วยเหลือ?<br/>ติดต่อ <span className="font-medium">IT Support</span>{" "}
            khom2559@gmail.com
          </p>
          <p className="text-xs text-blue-300 mt-2">
            © 2025 Medical Clinic Staff v.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
