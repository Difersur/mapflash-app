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

// 🗺️ Grafo de Nodos reales de tu mapa (Ejemplo basado en tu zona de Huancayo / Continental)
const NODOS_MAPA: Record<string, { lat: number; lng: number; conexiones: Record<string, number> }> = {
  "Parque Industrial": { lat: -12.0631, lng: -75.2124, conexiones: { "San Carlos": 5, "U. Continental": 8 } },
  "San Carlos": { lat: -12.0685, lng: -75.2010, conexiones: { "Parque Industrial": 5, "Centro": 3, "U. Continental": 4 } },
  "U. Continental": { lat: -12.0664, lng: -75.1974, conexiones: { "Parque Industrial": 8, "San Carlos": 4, "Centro": 6 } },
  "Centro": { lat: -12.0651, lng: -75.2048, conexiones: { "San Carlos": 3, "U. Continental": 6 } }
};

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [destino, setDestino] = useState('');
  
  // Estado del autómata Dijkstra
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Esperando destino...');

  // Configuración Nacional inicial (Perú)
  const [centroMapa, setCentroMapa] = useState({
    lat: -9.1900, 
    lng: -75.0152,
    zoom: 5 
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

  // 🧮 ALGORITMO DIJKSTRA REAL
  const calcularDijkstra = (inicio: string, fin: string) => {
    const distancias: Record<string, number> = {};
    const previos: Record<string, string | null> = {};
    const visitados = new Set<string>();

    Object.keys(NODOS_MAPA).forEach(nodo => {
      distancias[nodo] = Infinity;
      previos[nodo] = null;
    });
    distancias[inicio] = 0;

    while (visitados.size < Object.keys(NODOS_MAPA).length) {
      let nodoActual = null;
      let distanciaMinima = Infinity;

      Object.keys(NODOS_MAPA).forEach(nodo => {
        if (!visitados.has(nodo) && distancias[nodo] < distanciaMinima) {
          distanciaMinima = distancias[nodo];
          nodoActual = nodo;
        }
      });

      if (nodoActual === null || nodoActual === fin) break;
      visitados.add(nodoActual);

      const conexiones = NODOS_MAPA[nodoActual].conexiones;
      Object.keys(conexiones).forEach(vecino => {
        const alt = distancias[nodoActual!] + conexiones[vecino];
        if (alt < distancias[vecino]) {
          distancias[vecino] = alt;
          previos[vecino] = nodoActual;
        }
      });
    }

    // Reconstruir el camino
    const camino: string[] = [];
    let u = fin;
    while (u) {
      camino.unshift(u);
      u = previos[u]!;
    }
    return camino.join(' → ');
  };

  // 🔍 FUNCIÓN DEL BOTÓN BUSCAR
  const handleBuscarDestino = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) return;

    // Buscar si el destino coincide con un nodo (ignorando mayúsculas/minúsculas)
    const nodoEncontrado = Object.keys(NODOS_MAPA).find(
      n => n.toLowerCase().includes(destino.toLowerCase())
    );

    if (nodoEncontrado) {
      const coord = NODOS_MAPA[nodoEncontrado];
      setCentroMapa({
        lat: coord.lat,
        lng: coord.lng,
        zoom: 15
      });
      setCaminoCalculado(`Destino fijado en: ${nodoEncontrado}. Listo para Dijkstra.`);
    } else {
      alert("Nodo no encontrado en el mapa local. Intenta con 'Continental' o 'Centro'.");
    }
  };

  // ⚡ FUNCIÓN DEL BOTÓN DIJKSTRA
  const ejecutarRutaOptima = () => {
    const nodoDestino = Object.keys(NODOS_MAPA).find(
      n => n.toLowerCase().includes(destino.toLowerCase())
    ) || "U. Continental"; // Fallback por defecto si no ha escrito nada

    // Supongamos que inicia siempre desde el Parque Industrial como origen
    const ruta = calcularDijkstra("Parque Industrial", nodoDestino);
    setCaminoCalculado(`Camino: ${ruta}`);

    // Mover el mapa al destino final calculado
    const coordDestino = NODOS_MAPA[nodoDestino];
    setCentroMapa({
      lat: coordDestino.lat,
      lng: coordDestino.lng,
      zoom: 16
    });
  };

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
        () => alert("Activa los permisos de GPS.")
      );
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Barra Superior */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← MapFlash</Link>
          <h1 className="text-lg font-bold text-white tracking-tight">Mapa Nacional del Perú</h1>
        </div>

        <div className="flex items-center gap-3">
          {usuario && (
            <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Link href="/perfil" className="flex flex-col items-end gap-1 group">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition">
                  👤 {usuario.nombre}
                </span>
                {usuario.avatar_url && (
                  <img src={usuario.avatar_url} alt="Perfil" className="w-6 h-6 rounded-full object-cover border border-slate-600 shadow" />
                )}
              </Link>
              <button onClick={handleCerrarSesion} className="text-slate-400 hover:text-rose-400 transition ml-1 font-bold text-xs">✕</button>
            </div>
          )}
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        
        {/* Buscador de Destinos */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <form onSubmit={handleBuscarDestino} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-rose-500 text-sm">●</span>
              <input 
                type="text" 
                placeholder="Introduce tu destino (ej: Continental) y busca..." 
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-200"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-2 rounded-xl text-white transition">
              Buscar
            </button>
          </form>
          
          {/* Botón Dijkstra Conectado */}
          <button 
            onClick={ejecutarRutaOptima}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition text-center"
          >
            Calcular ruta óptma con Dijkstra →
          </button>
        </div>

        {/* Barra de Estado del Autómata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs bg-slate-800 border border-slate-700 text-emerald-400 px-3 py-1.5 rounded-xl font-medium">
              Ubicación GPS ({centroMapa.lat.toFixed(2)}, {centroMapa.lng.toFixed(2)})
            </span>
            <button onClick={localizarMiPosicion} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition">
              📍 Localizar mi Posición
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-xl text-right flex items-center justify-between sm:justify-end gap-4">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AUTOMÁTA DIJKSTRA</span>
              <span className="text-xs text-slate-300 font-mono">{caminoCalculado}</span>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">EN VIVO</span>
          </div>
        </div>

        {/* Mapa Visual */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[350px]">
          <iframe
            src={`https://maps.google.com/maps?q=${centroMapa.lat},${centroMapa.lng}&z=${centroMapa.zoom}&output=embed`}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen={true}
            loading="lazy"
          ></iframe>
        </div>
      </main>
    </div>
  );
}
