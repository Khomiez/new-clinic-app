// app/page.js
"use client";

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
          <h1 className="text-2xl font-bold text-blue-800">Staff Portal</h1>
          <p className="text-blue-400 mt-2">Welcome back to the clinic system</p>
        </div>
        
        {/* Login Form */}
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-blue-400">📧</span>
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                placeholder="your.name@clinic.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2" htmlFor="password">
              Password
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
                className="block w-full pl-10 pr-3 py-3 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-500 border-blue-300 rounded focus:ring-blue-400"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-blue-600">
                Remember me
              </label>
            </div>
            
            <div className="text-sm">
              <Link href="/forgot-password" className="text-blue-500 hover:text-blue-700 font-medium">
                Forgot password?
              </Link>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-colors"
            >
              <span className="mr-2">🚪</span>
              Sign in to Portal
            </button>
          </div>
        </form>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-blue-100 text-center">
          <p className="text-sm text-blue-400">
            Need help? Contact <span className="font-medium">IT Support</span> at ext. 1234
          </p>
          <p className="text-xs text-blue-300 mt-2">
            © 2025 Medical Clinic Staff Portal
          </p>
        </div>
      </div>
    </div>
  );
}