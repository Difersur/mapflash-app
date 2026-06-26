'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UsuarioSesion {
  nombre: string;
  email: string;
  rol: string;
  avatar_url?: string;
}

interface AlertaTrafico {
  id: number;
  tipo_reporte: string;
  latitud: number;
  longitud: number;
  estado: string;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    }
    obtenerReportesEnVivo();
  }, []);

  const obtenerReportesEnVivo = async () => {
    const { data, error } = await supabase
      .from('alertas_trafico')
      .select('*')
      .eq('estado', 'activo');

    if (data) setReportes(data);
    if (error) console.error("Error cargando alertas:", error.message);
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
  };

  const getEmojiRol = (rol: string) => {
    const r = rol ? rol.toLowerCase() : '';
    if (r === 'admin') return '👑';
    if (r === 'entrega') return '📦';
    return '👤';
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) {
      alert("Debes iniciar sesión para reportar incidentes.");
      return;
    }
    setCargandoAlerta(true);
    
    let lat = -12.046374;
    let lng = -77.042793;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          await guardarAlerta(tipo, lat, lng);
        },
        async () => {
          await guardarAlerta(tipo, lat, lng);
        }
      );
    } else {
      await guardarAlerta(tipo, lat, lng);
    }
  };

  const guardarAlerta = async (tipo: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('alertas_trafico')
        .insert([{ tipo_reporte: tipo, latitud: lat, longitud: lng, estado: 'activo' }]);

      if (error) throw error;
      alert(`¡Alerta de ${tipo} registrada con éxito!`);
      obtenerReportesEnVivo();
    } catch (err: any) {
      alert("No se pudo registrar el reporte: " + err.message);
    } finally {
      setCargandoAlerta(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Barra de Navegación Superior */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← MapFlash
          </Link>
          <h1 className="text-lg font-bold text-white tracking-tight">Mapa Nacional del Perú</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            🔥 {reportes.length} Alertas activas
          </span>
          
          {usuario ? (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Link 
                href="/perfil" 
                className="text-xs font-semibold text-slate-200 hover:text-blue-400 transition flex items-center gap-1"
                title="Ver mi Perfil"
              >
                {getEmojiRol(usuario.rol)} {usuario.rol === 'Entrega' || usuario.rol === 'entrega' ? 'Entrega' : usuario.nombre}
              </Link>
              <button 
                onClick={handleCerrarSesion}
                className="text-slate-400 hover:text-rose-400 transition ml-1 font-bold text-xs"
                title="Cerrar Sesión"
              >
                ✕
              </button>
            </div>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl text-white font-medium transition">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </header>

      {/* Contenedor Principal del Mapa */}
      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900">
          
          {/* MAPA OFICIAL CONFIGURADO PARA EL PERÚ */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3901.8656779834114!2d-77.042793!3d-12.046374!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses-419!2spe!4v1650000000000!5m2!1ses-419!2spe"
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>

          {/* Estado del Sistema flotante */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-lg flex items-center gap-2 z-10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">Sistema GPS Activo · Perú</span>
          </div>

          {/* Panel de reportes rápidos en la zona */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-lg w-64 z-10 hidden md:block">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Reportes en tu zona</h3>
            <div className="max-h-32 overflow-y-auto flex flex-col gap-2">
              {reportes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Todo despejado por ahora 👍</p>
              ) : (
                reportes.map((r) => (
                  <div key={r.id} className="text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 flex justify-between items-center">
                    <span className="capitalize text-slate-200 font-medium">⚠️ {r.tipo_reporte}</span>
                    <span className="text-[10px] text-amber-400 font-bold">Activo</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Panel Inferior para Reportar Incidentes */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertar Incidentes de Tránsito en tu Posición Actual</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleCrearAlerta('Accidente')}
              disabled={cargandoAlerta}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              🚨 Accidente
            </button>
            <button
              onClick={() => handleCrearAlerta('Tráfico')}
              disabled={cargandoAlerta}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              🚗 Tráfico
            </button>
            <button
              onClick={() => handleCrearAlerta('Operativo')}
              disabled={cargandoAlerta}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              👮 Operativo
            </button>
            <button
              onClick={() => handleCrearAlerta('Vía Cerrada')}
              disabled={cargandoAlerta}
              className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              🚧 Vía Cerrada
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
