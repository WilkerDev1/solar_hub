'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/core/database/supabase';
import { useAuth } from '@/core/auth/AuthContext';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Sun, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg('Sesión iniciada con éxito. Redirigiendo...');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al iniciar sesión.');
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!fullName.trim()) {
      setErrorMsg('El nombre completo es requerido.');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Check if session is already created (email confirmations disabled)
      if (data?.session) {
        setSuccessMsg('Registro exitoso e inicio de sesión automático.');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setSuccessMsg('Usuario registrado. Ya puedes iniciar sesión con tus credenciales.');
        setIsSignUp(false);
        setSubmitting(false);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al registrar usuario.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-zinc-400 text-sm font-medium">Verificando sesión...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Sun className="h-9 w-9 text-amber-500 animate-spin-slow" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-wider">
            SOLAR HUB
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Plataforma SaaS de Ingeniería y Operación de Campo
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-850 p-8 rounded-2xl shadow-2xl shadow-black/50">
          <div className="flex border-b border-zinc-800 pb-4 mb-6">
            <button
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all border-b-2 ${
                !isSignUp
                  ? 'text-emerald-400 border-emerald-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center pb-2 text-sm font-semibold transition-all border-b-2 ${
                isSignUp
                  ? 'text-emerald-400 border-emerald-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Registrarse
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-start space-x-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg flex items-start space-x-2 text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={isSignUp ? handleSignUp : handleLogin}>
            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-zinc-400 text-xs">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="text-zinc-400 text-xs">Correo Electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tecnico@solarhub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-zinc-400 text-xs">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors mt-6 h-11 text-sm shadow-lg shadow-emerald-700/10"
            >
              {submitting ? (
                <span className="flex items-center space-x-2 justify-center">
                  <Sun className="h-4 w-4 animate-spin text-white" />
                  <span>Procesando...</span>
                </span>
              ) : isSignUp ? (
                'Crear Cuenta de Prueba'
              ) : (
                'Entrar al Dashboard'
              )}
            </Button>
          </form>
        </div>

        <div className="text-center text-xs text-zinc-600 mt-4 flex items-center justify-center space-x-1">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
          <span>Multi-tenant RLS activado por defecto.</span>
        </div>
      </div>
    </div>
  );
}
