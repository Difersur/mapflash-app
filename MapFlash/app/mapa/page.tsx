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
  avatar_url?: string; // Soportamos el campo opcional de foto de perfil
}

interface AlertaTrafico {
  id: number;
  tipo_reporte: string;
  latitud: number;
  longitud: number;
  estado: string;
  creado_at: string;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState<string | null>(null);

  // Cargar sesión e inicializar alertas
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      try {
        setUsuario(JSON.parse(sesionGuardada));
      } catch (e) {
        console.error("Error leyendo la sesión", e);
      }
    }
    
    obtenerReportesEnVivo();
  }, []);

  const obtenerReportesEnVivo = async () => {
    try {
      const { data, error } = await supabase
        .from('reportes_trafico')
        .select('*')
        .eq('estado', 'activo')
        .order('creado_at', { ascending: false });

      if (error) throw error;
      if (data) setReportes(data);
    } catch (error: any) {
      console.error("Error cargando reportes:", error.message);
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
  };

  const getEmojiRol = (rol?: string) => {
    switch (rol) {
      case 'conductor': return '🚗';
      case 'mapeador': return '🗺️';
      case 'empresa': return '🏢';
      default: return '🧭';
    }
  };

  const handleCrearAlerta = async (tipo: string) => {
    setCargandoAlerta(tipo);
    const latitudSimulada = -12.046374 + (Math.random() - 0.5) * 0.02; 
    const longitudSimulada = -77.042793 + (Math.random() - 0.5) * 0.02;

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
      obtenerReportesEnVivo();
      alert(`🚨 Alerta de [${tipo.toUpperCase()}] reportada con éxito de manera global.`);
    } catch (error: any) {
      alert("Error al reportar: " + error.message);
    } finally {
      setCargandoAlerta(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      
      {/* ── NAVBAR SUPERIOR DINÁMICA CON FOTO DE PERFIL ── */}
      <header className="bg-white border-b border-slate-100 p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition">
            ← MapFlash
          </Link>
          <h1 className="text-base font-black tracking-tight text-slate-800">Mapa Nacional del Perú</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-full animate-pulse">
            🔥 {reportes.length} Alertas activas
          </span>
          <Link href="/entrega" className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition">
            📦 Entrega
          </Link>
          
          {usuario ? (
            <div className="flex items-center gap-2 bg-slate-900 text-white pl-3 pr-2 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
              {/* Si el usuario tiene una avatar_url válida de Google, renderizamos la imagen de perfil */}
              {usuario.avatar_url ? (
                <img 
                  src={usuario.avatar_url} 
                  alt={usuario.nombre} 
                  className="w-5 h-5 rounded-full object-cover border border-white/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{getEmojiRol(usuario.rol)}</span>
              )}
              <span className="max-w-[100px] truncate">{usuario.nombre}</span>
              <button onClick={handleCerrarSesion} className="bg-white/10 hover:bg-red-500/20 text-red-400 p-1 rounded-md ml-1 text-[10px]">✕</button>
            </div>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition">🔑 Ingresar</Link>
          )}
        </div>
      </header>

      {/* CONTENEDOR DEL MAPA */}
      <div className="flex-1 bg-blue-50 relative flex items-center justify-center overflow-hidden">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1m2!1m3!1s-12.046374!2s-77.042793!5m2!1ses!2spe" 
          className="w-full h-full border-none absolute inset-0"
          allowFullScreen
          loading="lazy"
        />
        
        {/* Panel de reportes */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 max-w-xs text-xs z-20 flex flex-col gap-2">
          <p className="font-bold text-slate-800 border-b pb-1">Reportes en tu zona</p>
          <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 w-40">
            {reportes.length === 0 ? (
              <p className="text-slate-400 text-[11px]">Todo despejado por ahora 👍</p>
            ) : (
              reportes.map((r) => (
                <div key={r.id} className="flex justify-between items-center text-[11px] bg-slate-50 p-1 rounded border border-slate-100">
                  <span className="capitalize font-medium text-slate-700">
                    {r.tipo_reporte === 'accidente' ? '🚨 Accidente' : 
                     r.tipo_reporte === 'trafico' ? '🚗 Tráfico' : 
                     r.tipo_reporte === 'operativo' ? '👮 Operativo' : '🚧 Bloqueo'}
                  </span>
                  <span className="text-[9px] text-slate-400">¡Vivo!</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-[11px] font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          Sistema GPS Activo · Perú
        </div>
      </div>

      {/* BOTONES DE INCIDENTES */}
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
