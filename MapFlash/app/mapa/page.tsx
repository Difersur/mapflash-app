'use client';
import { useState, useEffect } from 'react';
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
  const [busqueda, setBusqueda] = useState('universida continental');
  
  // Coordenadas iniciales por defecto en Huancayo, Perú
  const [gpsCoords, setGpsCoords] = useState({
    lat: -12.0487, 
    lng: -75.2280
  });

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      // Mock de respaldo por si no hay sesión iniciada
      setUsuario({ nombre: 'Admin', email: 'admin@mapflash.com', rol: 'admin' });
    }
    obtenerReportesEnVivo();
    cargarUbicacionGps();
  }, []);

  const cargarUbicacionGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error cargando GPS, usando coordenadas fijas:", error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

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

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) {
      alert("Debes iniciar sesión para reportar incidentes.");
      return;
    }
    setCargandoAlerta(true);
    try {
      const { error } = await supabase
        .from('alertas_trafico')
        .insert([{ tipo_reporte: tipo, latitud: gpsCoords.lat, longitud: gpsCoords.lng, estado: 'activo' }]);
      
      if (!error) obtenerReportesEnVivo();
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoAlerta(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-800 font-sans select-none">
      {/* Header Superior */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <span className="text-blue-600 font-bold text-lg flex items-center">← MapFlash</span>
          <h1 className="text-gray-700 font-medium text-sm border-l pl-4 border-gray-300">Mapa Nacional del Perú</h1>
        </div>
        
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <span className="flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">📦 Entrega</span>
          <div className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">?</span>
            <span className="font-semibold text-gray-700">Admin</span>
            <span className="text-gray-400 cursor-pointer hover:text-red-500 ml-1" onClick={handleCerrarSesion}>➔</span>
          </div>
        </div>
      </header>

      {/* Barra de Estado de Ubicación */}
      <div className="bg-white px-6 py-2 flex justify-between items-center text-xs text-gray-600 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          <span>GPS activo: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span>
        </div>
        <button onClick={cargarUbicacionGps} className="flex items-center space-x-1 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
          <span>📍</span>
          <span>Mi Ubicación</span>
        </button>
      </div>

      {/* Buscador Principal */}
      <div className="p-4 bg-white space-y-3 shadow-inner">
        <div className="flex items-center border-2 border-blue-500 rounded-md overflow-hidden bg-white">
          <span className="px-3 text-red-500 text-lg">●</span>
          <input
            type="text"
            className="w-full py-2 px-1 text-sm outline-none font-medium text-gray-700"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-6 py-2 text-sm font-medium">Buscar</button>
        </div>

        {/* Botón Verde de Dijkstra */}
        <button className="w-full bg-emerald-500 text-white font-semibold py-2.5 rounded-md text-sm hover:bg-emerald-600 transition shadow-sm">
          Calcular ruta óptima con Dijkstra →
        </button>
      </div>

      {/* Contenedor del Mapa (Iframe de Google Maps) */}
      <div className="flex-1 relative min-h-[380px] bg-gray-200 border-b border-gray-300">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.42847952405!2d-75.2155!3d-12.0555!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x910e964f4b16259f%3A0x67dbdfedfd6864de!2sUniversidad%20Continental!5e0!3m2!1ses-419!2spe!4v1719515000000!5m2!1ses-419!2spe"
          className="w-full h-full border-0"
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>

        {/* Cuadro Informativo de Ruta Flotante */}
        <div className="absolute top-4 left-4 z-50 bg-white p-3 rounded-md shadow-md border border-gray-200 max-w-xs text-xs space-y-1">
          <div className="font-semibold text-gray-800 flex items-center">
            <span className="text-gray-400 mr-1.5">○</span> Lope de Vega 164, Huancayo 12006
          </div>
          <div className="font-semibold text-blue-600 flex items-center border-t pt-1 mt-1">
            <span className="text-red-500 mr-1.5">📍</span> Universidad Continental - Campus Huan...
          </div>
          <span className="text-blue-500 text-[11px] block cursor-pointer hover:underline">Más opciones</span>
        </div>
      </div>

      {/* Botones de Alertas Inferiores */}
      <footer className="bg-white p-4 border-t border-gray-200">
        <span className="text-xs text-gray-500 block mb-3 font-medium">Alertas de tránsito en tu posición actual</span>
        <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-gray-600">
          <button onClick={() => handleCrearAlerta('Accidente')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-red-50">
            <span className="text-xl mb-1">🚨</span><span>Accidente</span>
          </button>
          <button onClick={() => handleCrearAlerta('Tráfico')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-yellow-50">
            <span className="text-xl mb-1">🚗</span><span>Tráfico</span>
          </button>
          <button onClick={() => handleCrearAlerta('Operativo')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-blue-50">
            <span className="text-xl mb-1">👮</span><span>Operativo</span>
          </button>
          <button onClick={() => handleCrearAlerta('Vía Cerrada')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-orange-50">
            <span className="text-xl mb-1">🚧</span><span>Vía cerrada</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
