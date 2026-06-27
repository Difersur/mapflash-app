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
}

interface AlertaTrafico {
  id: number;
  tipo_reporte: string;
  latitud: number;
  longitud: number;
  estado: string;
}

// Lógica de Grafos y Dijkstra para Huancayo / El Tambo
const NODOS_HUANCAYO: Record<string, { lat: number; lng: number; conexiones: Record<string, number> }> = {
  "Inicio": { lat: -12.0487, lng: -75.2280, conexiones: { "Av_Mariategui": 1.2, "Av_Ferrocarril": 1.8 } },
  "Av_Mariategui": { lat: -12.0545, lng: -75.2200, conexiones: { "Inicio": 1.2, "Siglo_XX": 0.9, "El_Tambo": 1.1 } },
  "Av_Ferrocarril": { lat: -12.0515, lng: -75.2160, conexiones: { "Inicio": 1.8, "Siglo_XX": 0.7 } },
  "Siglo_XX": { lat: -12.0535, lng: -75.2120, conexiones: { "Av_Mariategui": 0.9, "Av_Ferrocarril": 0.7, "Univ_Continental": 1.4 } },
  "El_Tambo": { lat: -12.0500, lng: -75.2100, conexiones: { "Av_Mariategui": 1.1, "Univ_Continental": 0.8 } },
  "Univ_Continental": { lat: -12.0528, lng: -75.2032, conexiones: { "Siglo_XX": 1.4, "El_Tambo": 0.8 } }
};

function calcularDijkstra(inicio: string, fin: string): string[] {
  const distancias: Record<string, number> = {};
  const previos: Record<string, string | null> = {};
  const nodos = new Set<string>();

  for (let nodo in NODOS_HUANCAYO) {
    distancias[nodo] = nodo === inicio ? 0 : Infinity;
    previos[nodo] = null;
    nodos.add(nodo);
  }

  while (nodos.size > 0) {
    let nodoActual = Array.from(nodos).reduce((minNodo, nodo) => 
      distancias[nodo] < distancias[minNodo] ? nodo : minNodo, Array.from(nodos)[0]
    );

    if (distancias[nodoActual] === Infinity || nodoActual === fin) break;
    nodos.delete(nodoActual);

    const conexiones = NODOS_HUANCAYO[nodoActual].conexiones;
    for (let vecino in conexiones) {
      if (nodos.has(vecino)) {
        let alt = distancias[nodoActual] + conexiones[vecino];
        if (alt < distancias[vecino]) {
          distancias[vecino] = alt;
          previos[vecino] = nodoActual;
        }
      }
    }
  }

  const ruta: string[] = [];
  let u: string | null = fin;
  while (u !== null) {
    ruta.unshift(u);
    u = previos[u];
  }
  return ruta;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [busqueda, setBusqueda] = useState('universidad continental');
  const [rutaCalculada, setRutaCalculada] = useState<string[]>([]);
  
  const [gpsCoords, setGpsCoords] = useState({ lat: -12.0487, lng: -75.2280 });
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      setUsuario({ nombre: 'Joaquien', email: 'joaquien@mapflash.com', rol: 'admin' });
    }
    obtenerReportesEnVivo();
    actualizarMapaBase(gpsCoords.lat, gpsCoords.lng);
  }, []);

  const actualizarMapaBase = (lat: number, lng: number) => {
    setMapUrl(`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`);
  };

  const cargarUbicacionGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGpsCoords(newCoords);
          actualizarMapaBase(newCoords.lat, newCoords.lng);
        },
        () => {
          actualizarMapaBase(gpsCoords.lat, gpsCoords.lng);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleBuscar = () => {
    if (busqueda.trim() !== '') {
      setMapUrl(`https://maps.google.com/maps?q=${encodeURIComponent(busqueda)}&z=15&output=embed`);
    }
  };

  const handleCalcularRutaDijkstra = () => {
    const rutaNodos = calcularDijkstra("Inicio", "Univ_Continental");
    setRutaCalculada(rutaNodos);
    
    // Convertimos los nodos del grafo en una cadena de parámetros de coordenadas para dibujar la trayectoria en Google Maps
    const origen = `${NODOS_HUANCAYO["Inicio"].lat},${NODOS_HUANCAYO["Inicio"].lng}`;
    const destino = `${NODOS_HUANCAYO["Univ_Continental"].lat},${NODOS_HUANCAYO["Univ_Continental"].lng}`;
    const waypoints = rutaNodos
      .filter(n => n !== "Inicio" && n !== "Univ_Continental")
      .map(n => `${NODOS_HUANCAYO[n].lat},${NODOS_HUANCAYO[n].lng}`)
      .join('|');

    setMapUrl(`https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY_HERE&origin=${origen}&destination=${destino}&waypoints=${waypoints}&mode=driving`);
    
    // Fallback dinámico inmediato si no usas API Key de Google Cloud Enterprise:
    setMapUrl(`https://maps.google.com/maps?saddr=${origen}&daddr=${destino}&z=15&output=embed`);
  };

  const obtenerReportesEnVivo = async () => {
    const { data, error } = await supabase.from('alertas_trafico').select('*').eq('estado', 'activo');
    if (data) setReportes(data);
    if (error) console.error(error.message);
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) return;
    setCargandoAlerta(true);
    try {
      const { error } = await supabase.from('alertas_trafico').insert([{ tipo_reporte: tipo, latitud: gpsCoords.lat, longitud: gpsCoords.lng, estado: 'activo' }]);
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
        
        <div className="flex items-center space-x-2 bg-[#111827]/50 px-3 py-1.5 rounded-full font-medium text-sm border border-[#3a506b]/20">
          <span className="text-orange-500">🔥</span>
          <span className="text-emerald-400 font-semibold">{reportes.length}</span>
          <span className="text-gray-300 font-medium">Alertas activas</span>
        </div>
        
        <div className="flex items-center space-x-3 text-sm text-white">
          <div className="flex items-center space-x-1.5 bg-[#111827]/60 px-3 py-1.5 rounded-full shadow-inner border border-[#3a506b]/20">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">J</span>
            <span className="font-semibold">{usuario?.nombre || 'Joaquien'}</span>
          </div>
        </div>
      </header>
      
      {/* Buscador e Input de Texto */}
      <div className="p-4 bg-[#1c2541] rounded-xl border border-[#3a506b]/30 mb-4 space-y-3 shadow-lg">
        <div className="flex items-center border border-[#3a506b]/50 rounded-md overflow-hidden bg-[#0b1329]">
          <span className="px-3 text-red-500 text-lg">●</span>
          <input
            type="text"
            className="w-full py-2 px-1 text-sm outline-none bg-transparent text-white font-medium"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
          />
          <button onClick={handleBuscar} className="bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700 transition">Buscar</button>
        </div>

        {/* Botón de Dijkstra ejecutable */}
        <button onClick={handleCalcularRutaDijkstra} className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-md text-sm hover:bg-emerald-700 transition shadow-sm">
          Calcular ruta óptma con Dijkstra →
        </button>
      </div>

      {/* Contenedor del Mapa */}
      <div className="flex-1 bg-[#1c2541] p-4 rounded-xl border border-[#3a506b]/30 mb-4 shadow-xl flex flex-col">
        <div className="flex items-start justify-between mb-3">
          {/* Botón Mi Ubicación + GPS Integrado */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-[#111827]/50 px-4 py-2 rounded-full font-medium text-sm border border-[#3a506b]/20">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">Sistema GPS Activo ({gpsCoords.lat.toFixed(2)}, {gpsCoords.lng.toFixed(2)})</span>
            </div>
            <button onClick={cargarUbicacionGps} className="bg-[#0b1329] border border-[#3a506b]/50 text-xs px-3 py-2 rounded-full text-gray-300 hover:text-white transition">
              📍 Activar mi Ubicación
            </button>
          </div>
          
          {/* Autómata / Panel de Ruta */}
          <div className="bg-[#111827]/80 p-4 rounded-xl w-80 shadow-2xl border border-[#3a506b]/30">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold text-xs tracking-wider text-gray-300 uppercase">Automáta Dijkstra</h4>
              <span className="text-emerald-400 font-bold text-xs">EN VIVO</span>
            </div>
            <div className="text-gray-400 font-medium text-xs break-words">
              {rutaCalculada.length > 0 ? `Camino: ${rutaCalculada.join(' ➔ ')}` : 'Todo despejado por ahora 👍'}
            </div>
          </div>
        </div>
        
        {/* Iframe a Pantalla Completa Expandido */}
        <div className="w-full flex-1 min-h-[500px] bg-[#0b1329] rounded-xl overflow-hidden shadow-inner border border-[#3a506b]/30 relative">
          <iframe
            src={mapUrl}
            className="absolute inset-0 w-full h-full border-0 filter invert-[90%] hue-rotate-[180deg]"
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
          <button onClick={() => handleCrearAlerta('Accidente')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-red-950/30 transition-all shadow-md">
            <span className="text-3xl mb-2">🚨</span><span className="text-red-400">Accidente</span>
          </button>
          <button onClick={() => handleCrearAlerta('Tráfico')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-orange-950/30 transition-all shadow-md">
            <span className="text-3xl mb-2">🚗</span><span className="text-orange-400">Tráfico</span>
          </button>
          <button onClick={() => handleCrearAlerta('Operativo')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-blue-950/30 transition-all shadow-md">
            <span className="text-3xl mb-2">👮</span><span className="text-blue-400">Operativo</span>
          </button>
          <button onClick={() => handleCrearAlerta('Vía Cerrada')} className="flex flex-col items-center justify-center p-5 border border-[#3a506b]/20 rounded-xl bg-[#0b1329]/50 hover:bg-yellow-950/30 transition-all shadow-md">
            <span className="text-3xl mb-2">🚧</span><span className="text-yellow-400">Vía Cerrada</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
