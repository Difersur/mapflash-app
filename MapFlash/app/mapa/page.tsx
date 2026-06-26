'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UsuarioSesion {
  nombre: string;
  email: string;
  rol: string;
}

export default function MapaPage() {
  // Estado para guardar el usuario logueado
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargandoAlerta, setCargandoAlerta] = useState<string | null>(null);

  // Al cargar la página, leemos el localStorage
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      try {
        setUsuario(JSON.parse(sesionGuardada));
      } catch (e) {
        console.error("Error leyendo la sesión", e);
      }
    }
  }, []);

  // Función para cerrar sesión
  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
  };

  // Retornar el emoji correcto según el rol
  const getEmojiRol = (rol?: string) => {
    switch (rol) {
      case 'conductor': return '🚗';
      case 'mapeador': return '🗺️';
      case 'empresa': return '🏢';
      default: return '🧭';
    }
  };

  // Función para enviar alertas a Supabase (Punto 1 y 2)
  const handleCrearAlerta = async (tipo: string) => {
    setCargandoAlerta(tipo);
    
    // Intentamos simular u obtener coordenadas (puedes expandir esto con el GPS real del navegador)
    const latitudSimulada = -12.046374; 
    const longitudSimulada = -77.042793;

    try {
      const { error } = await supabase
        .from('reportes_trafico')
        .insert([
          {
            tipo_reporte: tipo,
            latitud: latitudSimulada,
            longitud: longitudSimulada,
            estado: 'activo'
          }
        ]);

      if (error) throw error;
      alert(`🚨 Alerta de [${tipo.toUpperCase()}] reportada con éxito de manera global.`);
    } catch (error: any) {
      alert("Error al reportar: " + error.message);
    } finally {
      setCargandoAlerta(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      
      {/* ── NAVBAR SUPERIOR DINÁMICA ── */}
      <header className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition">
            ← MapFlash
          </Link>
          <h1 className="text-base font-black tracking-tight text-slate-800">Mapa Nacional del Perú</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/entrega" className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition">
            📦 Entrega
          </Link>
          
          {/* Aquí se refleja el usuario real logueado */}
          {usuario ? (
            <div className="flex items-center gap-2 bg-slate-900 text-white pl-3 pr-2 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
              <span>{getEmojiRol(usuario.rol)} {usuario.nombre}</span>
              <button 
                onClick={handleCerrarSesion}
                className="bg-white/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 p-1 rounded-md transition ml-1"
                title="Cerrar sesión"
              >
                ✕
              </button>
            </div>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition">
              🔑 Ingresar
            </Link>
          )}
        </div>
      </header>

      {/* ── MAPA COMPONENT (CONTENEDOR SIMULADO) ── */}
      <div className="flex-1 bg-blue-50 relative flex items-center justify-center overflow-hidden">
        {/* Aquí va tu iframe o mapa de Google actual */}
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1m2!1m3!1s-12.046374!2s-77.042793!5m2!1ses!2spe" 
          className="w-full h-full border-none absolute inset-0"
          allowFullScreen
          loading="lazy"
        />
        
        {/* Estado del GPS */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-[11px] font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          Sistema GPS Activo · Perú
        </div>
      </div>

      {/* ── BOTONES DE ALERTA CONECTADOS A SUPABASE ── */}
      <footer className="bg-white border-t border-slate-100 p-4 shadow-md z-10">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center md:text-left">
          Alertar incidentes de tránsito en tu posición actual
        </p>
        <div className="grid grid-cols-2 md:flex gap-3 justify-center md:justify-start">
          {[
            { id: 'accidente', emoji: '🚨', label: 'Accidente', color: 'hover:border-red-500 hover:bg-red-50 text-red-600' },
            { id: 'trafico',   emoji: '🚗', label: 'Tráfico',   color: 'hover:border-amber-500 hover:bg-amber-50 text-amber-600' },
            { id: 'operativo', emoji: '👮', label: 'Operativo', color: 'hover:border-blue-500 hover:bg-blue-50 text-blue-600' },
            { id: 'clausura',  emoji: '🚧', label: 'Vía Cerrada',color: 'hover:border-slate-700 hover:bg-slate-50 text-slate-700' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              disabled={cargandoAlerta !== null}
              onClick={() => handleCrearAlerta(btn.id)}
              className={`flex items-center justify-center gap-2 border border-slate-200 rounded-xl p-3 text-xs font-bold transition bg-white shadow-sm flex-1 md:flex-none md:px-6 ${btn.color} disabled:opacity-50`}
            >
              <span>{btn.emoji}</span>
              <span>{cargandoAlerta === btn.id ? 'Reportando...' : btn.label}</span>
            </button>
          ))}
        </div>
      </footer>

    </div>
  );
}
