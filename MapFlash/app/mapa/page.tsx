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
  const [destino, setDestino] = useState(''); // Estado para la barra de búsqueda

  // Coordenadas iniciales por defecto en Huancayo, Perú
  const [centroMapa, setCentroMapa] = useState({
    lat: -12.06513, 
    lng: -75.20486,
    zoom: 14 
  });

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

  // Función específica para el botón "Localizar mi Posición"
  const localizarMiPosicion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCentroMapa({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            zoom: 16
          });
        },
        () => {
          alert("No se pudo acceder a tu ubicación actual. Verifica los permisos de tu navegador.");
        }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) {
      alert("Debes iniciar sesión para reportar incidentes.");
      return;
    }
    setCargandoAlerta(true);
    
    let lat = -12.06513;
    let lng = -75.20486;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          setCentroMapa({ lat, lng, zoom: 16 }); 
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

  const irAUbicacion = (lat: number, lng: number) => {
    setCentroMapa({ lat, lng, zoom: 17 }); 
  };

  // Función para simular o procesar la búsqueda de destino con el autómata
  const handleBuscarDestino = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino.trim()) return;
    alert(`Buscando ruta hacia: ${destino}`);
    // Aquí puedes integrar tu lógica de Dijkstra pasándole el destino
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Barra de Navegación Superior */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← MapFlash
          </Link>
          <h1 className="text-lg font-bold text-white tracking-tight">Mapa de Huancayo</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            🔥 {reportes.length} Alertas activas
          </span>
          
          {usuario ? (
            <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Link 
                href="/perfil" 
                className="flex flex-col items-end gap-1 group"
                title="Ver mi Perfil y Agregar Fotos"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition flex items-center gap-1">
                  {getEmojiRol(usuario.rol)} {usuario.rol === 'Entrega' || usuario.rol === 'entrega' ? 'Entrega' : usuario.nombre}
                </span>
                
                {usuario.avatar_url ? (
                  <img 
                    src={usuario.avatar_url} 
                    alt="Miniatura de perfil" 
                    className="w-7 h-7 rounded-full object-cover border border-slate-600 shadow group-hover:border-blue-400 transition"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-slate-600 group-hover:border-blue-400 transition">
                    {getEmojiRol(usuario.rol)}
                  </div>
                )}
              </Link>

              <button 
                onClick={handleCerrarSesion}
                className="text-slate-400 hover:text-rose-400 transition ml-1 font-bold text-xs self-center"
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

      {/* Contenedor Principal del Mapa y las Herramientas */}
      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        
        {/* 🛠️ RESTAURADO: Buscador de Destino Superior */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <form onSubmit={handleBuscarDestino} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-rose-500 text-sm">●</span>
              <input 
                type="text" 
                placeholder="Introduce tu destino y presiona Buscar..." 
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-2 rounded-xl text-white transition active:scale-95">
              Buscar
            </button>
          </form>
          
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition active:scale-95 text-center">
            Calcular ruta óptima con Dijkstra →
          </button>
        </div>

        {/* 🛠️ RESTAURADO: Fila de Ubicación GPS, Localizador y Estado del Autómata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs bg-slate-800 border border-slate-700 text-emerald-400 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Ubicación GPS ({centroMapa.lat.toFixed(2)}, {centroMapa.lng.toFixed(2)})
            </span>
            
            <button 
              onClick={localizarMiPosicion}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1 active:scale-95"
            >
              📍 Localizar mi Posición
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-right flex items-center justify-between sm:justify-end gap-4">
            <div className="text-left sm:text-right">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Autómata Dijkstra</span>
              <span className="text-xs text-slate-300 font-mono">Camino: Nodo_A → Nodo_B → Nodo_D</span>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md animate-pulse">
              En vivo
            </span>
          </div>
        </div>

        {/* Área del Visualizador del Mapa */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[350px]">
          
          {/* MAPA DINÁMICO */}
          <iframe
            src={`https://maps.google.com/maps?q=${centroMapa.lat},${centroMapa.lng}&z=${centroMapa.zoom}&output=embed`}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>

          {/* Estado del Sistema flotante */}
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-lg flex items-center gap-2 z-10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">GPS Activo · Huancayo</span>
          </div>

          {/* Panel de reportes rápidos en la zona */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-lg w-64 z-10 hidden md:block">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Reportes en la Incontrastable</h3>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
              {reportes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Todo despejado por ahora 👍</p>
              ) : (
                reportes.map((r) => (
                  <div 
                    key={r.id} 
                    onClick={() => irAUbicacion(r
