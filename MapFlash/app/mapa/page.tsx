'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
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
  
  // Coordenadas fijas por defecto en Lima/Perú para el mapa limpio
  const [gpsCoords] = useState({
    lat: -12.0464, 
    lng: -77.0428
  });

  // URL corregida y limpia utilizando la API embebida oficial de Google Maps
  const [mapUrl, setMapUrl] = useState(`https://maps.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}&z=15&output=embed`);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      setUsuario({ nombre: 'Joaquien', email: 'joaquien@mapflash.com', rol: 'admin' });
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
    <div className="min-h-screen bg-[#0b1329] flex flex-col text-white font-sans select-none p-4">
      
      {/* Header Superior */}
      <header className="bg-[#1c2541] border border-[#3a506b]/30 px-4 py-3 flex items-center justify-between shadow-lg rounded-t-xl mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-white font-bold text-lg flex items-center">← MapFlash</span>
          <h1 className="text-gray-300 font-medium text-sm border-l pl-4 border-[#3a506b]/40">Mapa Nacional del Perú</h1>
        </div>
        
        {/* Contador de Alertas Activas */}
        <div className="flex items-center space-x-2 bg-[#111827]/50 px-3 py-1.5 rounded-full font-medium text-sm border border-[#3a506b]/20">
          <span className="text-orange-500">🔥</span>
          <span className="text-emerald-400 font-semibold">{reportes.length}</span>
          <span className="text-gray-300 font-medium">Alertas activas</span>
        </div>
        
        {/* Usuario Sesión */}
        <div className="flex items-center space-x-3 text-sm text-white">
          <div className="flex items-center space-x-1.5 bg-[#111827]/60 px-3 py-1.5 rounded-full shadow-inner border border-[#3a506b]/20">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">J</span>
            <span className="font-semibold">{usuario?.nombre || 'Joaquien'}</span>
            <span className="text-gray-400 cursor-pointer hover:text-red-400 ml-1 transition" onClick={handleCerrarSesion}>➔</span>
          </div>
        </div>
      </header>
      
      {/* Contenedor Principal del Mapa */}
      <div className="flex-1 bg-[#1c2541] p-4 rounded-xl border border-[#3a506b]/30 mb-4 shadow-xl flex flex-col">
        <div className="flex items-start justify-between mb-3">
          {/* Barra de Estado de GPS Simplificada */}
          <div className="flex items-center space-x-3 bg-[#111827]/50 px-4 py-2 rounded-full font-medium text-sm shadow-inner border border-[#3a506b]/20">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-emerald-400 font-semibold">Sistema GPS Activo</span>
            <span className="text-gray-500">●</span>
            <span className="text-white">Perú</span>
          </div>
          
          {/* Cuadro Informativo Flotante Superior */}
          <div className="bg-[#111827]/80 p-4 rounded-xl w-80 shadow-2xl border border-[#3a506b]/30">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold text-xs tracking-wider text-gray-300 uppercase">REPORTES EN TU ZONA</h4>
              <button className="text-emerald-400 font-bold hover:text-emerald-300 transition text-xs">AQUÍ</button>
            </div>
            <div className="text-gray-400 font-medium text-xs">Todo despejado por ahora 👍</div>
          </div>
        </div>
        
        {/* Iframe del Mapa de Google Corregido */}
        <div className="flex-1 relative min-h-[450px] bg-[#0b1329] rounded-xl overflow-hidden shadow-inner border border-[#3a506b]/30">
          <iframe
            src={mapUrl}
            className="w-full h-full border-0 filter invert-[90%] hue-rotate-[180deg]"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      {/* Botones de Alertas Inferiores */}
      <footer className="bg-[#1c2541] p-4 border border-[#3a506b]/30 rounded-xl shadow-xl">
        <span className="text-xs text-gray-400 block mb-4 font-bold uppercase tracking-wider">ALERTAR INCIDENTES DE TRÁNSITO EN TU POSICIÓN ACTUAL</span>
        <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-white">
          <button onClick={() => handleCrearAlerta('Accidente')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-red-950/30 border-red-900/20 transition-all hover:scale-[1.02] shadow-md">
            <span className="text-3xl mb-2">🚨</span>
            <span className="text-red-400">Accidente</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Tráfico')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-orange-950/30 border-orange-900/20 transition-all hover:scale-[1.02] shadow-md">
            <span className="text-3xl mb-2">🚗</span>
            <span className="text-orange-400">Tráfico</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Operativo')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-blue-950/30 border-blue-900/20 transition-all hover:scale-[1.02] shadow-md">
            <span className="text-3xl mb-2">👮</span>
            <span className="text-blue-400">Operativo</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Vía Cerrada')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-yellow-950/30 border-yellow-900/20 transition-all hover:scale-[1.02] shadow-md">
            <span className="text-3xl mb-2">🚧</span>
            <span className="text-yellow-400">Vía Cerrada</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
