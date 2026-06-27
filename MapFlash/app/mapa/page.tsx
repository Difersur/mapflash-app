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

// Grafo de nodos genérico para el autómata de Dijkstra (Nombres genéricos de ruta óptima)
const NODOS_GRAFO: Record<string, { lat: number; lng: number; conexiones: Record<string, number> }> = {
  "Nodo_A": { lat: -12.0464, lng: -77.0428, conexiones: { "Nodo_B": 1.5, "Nodo_C": 2.2 } },
  "Nodo_B": { lat: -12.0500, lng: -77.0300, conexiones: { "Nodo_A": 1.5, "Nodo_D": 1.8 } },
  "Nodo_C": { lat: -12.0600, lng: -77.0400, conexiones: { "Nodo_A": 2.2, "Nodo_D": 1.1 } },
  "Nodo_D": { lat: -12.0550, lng: -77.0200, conexiones: { "Nodo_B": 1.8, "Nodo_C": 1.1 } }
};

function resolverDijkstra(inicio: string, fin: string): string[] {
  const distancias: Record<string, number> = {};
  const previos: Record<string, string | null> = {};
  const nodosUnvisited = new Set<string>();

  for (let nodo in NODOS_GRAFO) {
    distancias[nodo] = nodo === inicio ? 0 : Infinity;
    previos[nodo] = null;
    nodosUnvisited.add(nodo);
  }

  while (nodosUnvisited.size > 0) {
    let nodoActual = Array.from(nodosUnvisited).reduce((minNodo, nodo) => 
      distancias[nodo] < distancias[minNodo] ? nodo : minNodo, Array.from(nodosUnvisited)[0]
    );

    if (distancias[nodoActual] === Infinity || nodoActual === fin) break;
    nodosUnvisited.delete(nodoActual);

    const conexiones = NODOS_GRAFO[nodoActual].conexiones;
    for (let vecino in conexiones) {
      if (nodosUnvisited.has(vecino)) {
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
  
  // Modificado: Buscador vacío e inicio neutro en Lima (Perú) por privacidad
  const [busqueda, setBusqueda] = useState('');
  const [caminoDijkstra, setCaminoDijkstra] = useState<string[]>(["Nodo_A", "Nodo_B", "Nodo_D"]);
  const [gpsCoords, setGpsCoords] = useState({ lat: -12.0464, lng: -77.0428 });
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      setUsuario({ nombre: 'Usuario', email: 'usuario@mapflash.com', rol: 'user' });
    }
    obtenerReportesEnVivo();
    // Carga inicial del mapa neutra sin rutas privadas expuestas
    trazarRutaMapa(gpsCoords.lat, gpsCoords.lng, '');
  }, []);

  const trazarRutaMapa = (origenLat: number, origenLng: number, destinoTexto: string) => {
    const origenParam = `${origenLat},${origenLng}`;
    // Si no busca nada, solo muestra la vista general del mapa en su ubicación actual o de inicio
    const urlSugerida = destinoTexto.trim() === '' 
      ? `https://maps.google.com/maps?q=${origenParam}&t=&z=13&ie=UTF8&iwloc=&output=embed`
      : `https://maps.google.com/maps?q=${origenParam}&saddr=${origenParam}&daddr=${encodeURIComponent(destinoTexto)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    setMapUrl(urlSugerida);
  };

  const cargarUbicacionGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nuevasCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGpsCoords(nuevasCoords);
          trazarRutaMapa(nuevasCoords.lat, nuevasCoords.lng, busqueda);
        },
        () => {
          trazarRutaMapa(gpsCoords.lat, gpsCoords.lng, busqueda);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleBuscar = () => {
    trazarRutaMapa(gpsCoords.lat, gpsCoords.lng, busqueda);
  };

  const handleCalcularDijkstra = () => {
    const rutaNodos = resolverDijkstra("Nodo_A", "Nodo_D");
    setCaminoDijkstra(rutaNodos);
    trazarRutaMapa(gpsCoords.lat, gpsCoords.lng, busqueda);
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
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">U</span>
            <span className="font-semibold">{usuario?.nombre || 'Usuario'}</span>
          </div>
        </div>
      </header>
      
      {/* Buscador de Direcciones */}
      <div className="p-4 bg-[#1c2541] rounded-xl border border-[#3a506b]/30 mb-4 space-y-3 shadow-lg">
        <div className="flex items-center border border-[#3a506b]/50 rounded-md overflow-hidden bg-[#0b1329]">
          <span className="px-3 text-red-500 text-lg">●</span>
          <input
            type="text"
            className="w-full py-2 px-1 text-sm outline-none bg-transparent text-white font-medium"
            placeholder="Introduce tu destino (Ej: Plaza de Armas, Lima)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
          />
          <button onClick={handleBuscar} className="bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700 transition">Buscar</button>
        </div>

        {/* Botón de Dijkstra */}
        <button onClick={handleCalcularDijkstra} className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-md text-sm hover:bg-emerald-700 transition shadow-sm">
          Calcular ruta óptima con Dijkstra →
        </button>
      </div>

      {/* Contenedor del Mapa */}
      <div className="flex-1 bg-[#1c2541] p-4 rounded-xl border border-[#3a506b]/30 mb-4 shadow-xl flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-[#111827]/50 px-4 py-2 rounded-full font-medium text-sm border border-[#3a506b]/20">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">Ubicación de red activa ({gpsCoords.lat.toFixed(2)}, {gpsCoords.lng.toFixed(2)})</span>
            </div>
            <button onClick={cargarUbicacionGps} className="bg-[#0b1329] border border-[#3a506b]/50 text-xs px-4 py-2 rounded-full text-gray-300 hover:text-white transition font-medium">
              📍 Localizar mi Posición
            </button>
          </div>
          
          {/* Panel del Autómata */}
          <div className="bg-[#111827]/80 p-4 rounded-xl w-80 shadow-2xl border border-[#3a506b]/30">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold text-xs tracking-wider text-gray-300 uppercase">AUTOMÁTA DIJKSTRA</h4>
              <span className="text-emerald-400 font-bold text-xs">EN VIVO</span>
            </div>
            <div className="text-gray-400 font-medium text-xs break-words">
              Camino: {caminoDijkstra.join(' ➔ ')}
            </div>
          </div>
        </div>
        
        {/* Iframe del Mapa */}
        <div className="w-full flex-1 min-h-[500px] bg-[#0b1329] rounded-xl overflow-hidden shadow-inner border border-[#3a506b]/30 relative">
          {mapUrl && (
            <iframe
              src={mapUrl}
              className="absolute inset-0 w-full h-full border-0 filter invert-[90%] hue-rotate-[180deg]"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          )}
        </div>
      </div>

      {/* Alertas Inferiores */}
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
