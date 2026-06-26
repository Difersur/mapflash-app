'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AlertaAdmin {
  id: number;
  tipo_reporte: string;
  latitud: number;
  longitud: number;
  estado: string;
  created_at?: string;
}

export default function AdminPage() {
  const [reportes, setReportes] = useState<AlertaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    // Verificar si el usuario en sesión realmente tiene rol de administrador
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      const user = JSON.parse(sesionGuardada);
      const rol = user.rol ? user.rol.toLowerCase() : '';
      
      if (rol === 'admin') {
        setAutorizado(true);
        obtenerTodosLosReportes();
      } else {
        setCargando(false);
      }
    } else {
      setCargando(false);
    }
  }, []);

  const obtenerTodosLosReportes = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('alertas_trafico')
      .select('*')
      .order('id', { ascending: false });

    if (data) setReportes(data);
    if (error) console.error("Error cargando alertas globales:", error.message);
    setCargando(false);
  };

  // Función para dar de baja un reporte viejo o falso directamente desde la tabla
  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('alertas_trafico')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar la interfaz local inmediatamente
      setReportes(reportes.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    } catch (err: any) {
      alert("No se pudo actualizar el reporte: " + err.message);
    }
  };

  // Filtrar estadísticas rápidas para los cuadros superiores
  const alertasActivas = reportes.filter(r => r.estado === 'activo').length;
  const alertasResueltas = reportes.filter(r => r.estado === 'resuelto').length;

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <p className="text-sm font-semibold animate-pulse">Cargando Panel de Control...</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm text-center shadow-2xl">
          <span className="text-4xl">🛑</span>
          <h2 className="text-white font-bold text-lg mt-4 mb-2">Acceso Denegado</h2>
          <p className="text-slate-400 text-xs mb-6">Tu usuario no cuenta con privilegios de Administrador para ver esta sección.</p>
          <Link href="/mapa" className="w-full block bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition">
            Volver al Mapa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      
      {/* Encabezado del Panel */}
      <header className="bg-slate-900 border-b border-slate-800 p-5 flex justify-between items-center shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-md border border-blue-500/20 font-bold uppercase tracking-wider">Master</span>
            <h1 className="text-base font-bold text-white">MapFlash Central Panel</h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Control de incidencias de tránsito y conductores</p>
        </div>
        <Link href="/mapa" className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 transition font-medium">
          Ir al Mapa Nacional
        </Link>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6">
        
        {/* Fila de Estadísticas Rápidas (Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alertas Activas (Perú)</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{alertasActivas} <span className="text-xs font-normal text-slate-500">en vivo</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Incidentes Archivados</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{alertasResueltas} <span className="text-xs font-normal text-slate-500">atendidos</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Historial Registrado</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{reportes.length} <span className="text-xs font-normal text-slate-500">totales</span></p>
          </div>
        </div>

        {/* Tabla de Gestión de Incidentes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Listado General de Incidentes</h2>
            <button 
              onClick={obtenerTodosLosReportes}
              className="text-[11px] text-blue-400 hover:underline font-semibold"
            >
              🔄 Actualizar Datos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-4 font-bold uppercase tracking-wider">ID</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Tipo Reporte</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Ubicación (Lat, Lng)</th>
                  <th className="p-4 font-bold uppercase tracking-wider">Estado</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">No se encontraron alertas en la base de datos.</td>
                  </tr>
                ) : (
                  reportes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 text-slate-500 font-mono">#{r.id}</td>
                      <td className="p-4 font-semibold text-slate-200">
                        {r.tipo_reporte === 'Accidente' ? '🚨' : r.tipo_reporte === 'Tráfico' ? '🚗' : r.tipo_reporte === 'Operativo' ? '👮' : '🚧'} {r.tipo_reporte}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {r.latitud.toFixed(5)}, {r.longitud.toFixed(5)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.estado === 'activo' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {r.estado === 'activo' ? (
                          <button
                            onClick={() => handleCambiarEstado(r.id, 'resuelto')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold px-2.5 py-1 rounded-lg transition text-[10px]"
                          >
                            ✓ Resolver
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCambiarEstado(r.id, 'activo')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-lg transition text-[10px]"
                          >
                            ⚡ Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
