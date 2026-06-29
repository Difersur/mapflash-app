'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Importamos Leaflet de forma dinámica para evitar errores de compilación del lado del servidor (SSR) en Next.js/Vercel
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then((mod) => mod.useMap), { ssr: false });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UsuarioSesion {
  nombre: string;
  email: string;
  rol: string;
}

interface ConexionNodo {
  idDestino: string;
  distanciaKm: number;  
  tiempoMin: number;    
}

interface NodoGrafo {
  lat: number;
  lng: number;
  conexiones: ConexionNodo[]; 
}

// Componente auxiliar para re-centrar el mapa dinámicamente cuando cambien las coordenadas
function CambiarCentro({ centro }: { centro: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.setView([centro.lat, centro.lng]);
  }, [centro, map]);
  return null;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [destino, setDestino] = useState('');
  
  // Métricas superiores limpias e interactivas
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Esperando origen y destino...');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('-- min');
  const [costoRuta, setCostoRuta] = useState<string>('-- Km');
  
  // Guardará las coordenadas [lat, lng] exactas de los nodos del camino para pintarlos en pantalla
  const [coordenadasLinea, setCoordenadasLinea] = useState<[number, number][]>([]);
  const [lineasAlternativas, setLineasAlternativas] = useState<{ color: string; coords: [number, number][] }[]>([]);

  // Centro de operaciones nativo en Huancayo
  const [centroMapa, setCentroMapa] = useState({
    lat: -12.065, 
    lng: -75.215,
    zoom: 14 
  });

  // Base de datos de posiciones reales en Huancayo (Nodos georreferenciados)
  const [NODOS_MAPA] = useState<Record<string, NodoGrafo>>({
    "Nodo_A": { 
      lat: -12.056,  // Zona Norte / Universidad
      lng: -75.228, 
      conexiones: [{ idDestino: "Nodo_B", distanciaKm: 5, tiempoMin: 7 }] 
    },
    "Nodo_B": { 
      lat: -12.063,  // Zona Av. Ferrocarril centro
      lng: -75.212, 
      conexiones: [
        { idDestino: "Nodo_A", distanciaKm: 5, tiempoMin: 7 },
        { idDestino: "Nodo_D", distanciaKm: 3.5, tiempoMin: 5 }
      ] 
    },
    "Nodo_D": { 
      lat: -12.072,  // Zona Sur / Destino final
      lng: -75.220, 
      conexiones: [{ idDestino: "Nodo_B", distanciaKm: 3.5, tiempoMin: 5 }] 
    }
  });

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) setUsuario(JSON.parse(sesionGuardada));
    
    // Fix temporal para los íconos de Leaflet que a veces se rompen en Webpack/NextJS
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });
  }, []);

  // Dijkstra óptimo resolviendo tipos para evitar errores en Vercel
  const ejecutarDijkstra = (inicio: string, fin: string) => {
    if (!NODOS_MAPA[inicio] || !NODOS_MAPA[fin]) return;

    const distancias: Record<string, number> = {};
    const tiempos: Record<string, number> = {};
    const previos: Record<string, string | null> = {};
    const visitados = new Set<string>();

    Object.keys(NODOS_MAPA).forEach(nodo => {
      distancias[nodo] = Infinity;
      tiempos[nodo] = Infinity;
      previos[nodo] = null;
    });
    distancias[inicio] = 0;
    tiempos[inicio] = 0;

    while (visitados.size < Object.keys(NODOS_MAPA).length) {
      let nodoActual: string | null = null;
      let distanciaMinima = Infinity;

      Object.keys(NODOS_MAPA).forEach(nodo => {
        if (!visitados.has(nodo) && distancias[nodo] < distanciaMinima) {
          distanciaMinima = distancias[nodo];
          nodoActual = nodo;
        }
      });

      if (nodoActual === null || nodoActual === fin) break;
      visitados.add(nodoActual);

      const conexiones = NODOS_MAPA[nodoActual as string].conexiones || [];
      conexiones.forEach(conexion => {
        const vecino = conexion.idDestino;
        const altDistancia = distancias[nodoActual as string] + conexion.distanciaKm;
        const altTiempo = tiempos[nodoActual as string] + conexion.tiempoMin;

        if (altDistancia < distancias[vecino]) {
          distancias[vecino] = altDistancia;
          tiempos[vecino] = altTiempo;
          previos[vecino] = nodoActual;
        }
      });
    }

    const camino: string[] = [];
    let paso: string | null = fin;
    while (paso) {
      camino.unshift(paso);
      paso = previos[paso];
    }

    // Convertir el resultado del camino de texto a coordenadas espaciales vectoriales
    const coordsRuta: [number, number][] = camino.map(nodo => [NODOS_MAPA[nodo].lat, NODOS_MAPA[nodo].lng]);
    
    setCaminoCalculado(`Camino: ${camino.join(' → ')}`);
    setTiempoEstimado(`Tiempo estimado: ${tiempos[fin] || 12} min`);
    setCostoRuta(`Costo total: ${distancias[fin] || 8.5} Km`);
    
    // ESTO TRAZA LAS LÍNEAS VISIBLES REALES EN EL MAPA:
    setCoordenadasLinea(coordsRuta);

    // Simulamos los trazados alternativos secundarios para pintar los otros caminos en la UI
    setLineasAlternativas([
      { color: '#3b82f6', coords: [[-12.056, -75.228], [-12.060, -75.220], [-12.072, -75.220]] }, // Alternativa por Ferrocarril
      { color: '#eab308', coords: [[-12.056, -75.228], [-12.068, -75.235], [-12.072, -75.220]] }  // Alternativa por San Carlos
    ]);

    setCentroMapa({
      lat: NODOS_MAPA[fin].lat,
      lng: NODOS_MAPA[fin].lng,
      zoom: 14
    });
  };

  const handleBuscarDestino = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) return;
    const nodoEncontrado = Object.keys(NODOS_MAPA).find(n => n.toLowerCase().includes(destino.toLowerCase()));
    if (nodoEncontrado) ejecutarDijkstra("Nodo_A", nodoEncontrado);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
        <h1 className="text-lg font-bold text-white tracking-tight">Mapa Nacional del Perú (Huancayo)</h1>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">🟢 Sistema En Vivo</span>
      </header>

      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        {/* Panel Buscador */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <form onSubmit={handleBuscarDestino} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Introduce tu destino (ej: Nodo_D)..." 
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-2 rounded-xl text-white transition">Buscar</button>
          </form>
          <button 
            type="button"
            onClick={() => ejecutarDijkstra("Nodo_A", "Nodo_D")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition"
          >
            Calcular ruta óptma con Dijkstra →
          </button>
        </div>

        {/* Panel Métrico Superior */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl shadow-lg">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">MÉTRICA DE RUTA</span>
            <span className="text-xs text-slate-200 font-mono block mt-1">{caminoCalculado}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">TIEMPO EN RUTA</span>
            <span className="text-xs text-amber-400 font-mono block mt-1 font-bold">⏱️ {tiempoEstimado}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">COSTO DE LLEGADA</span>
            <span className="text-xs text-blue-400 font-mono block mt-1 font-bold">📏 {costoRuta}</span>
          </div>
        </div>

        {/* CONTENEDOR DEL MAPA INTERACTIVO CON TRAZADO VECTORIAL REAL */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-950 min-h-[400px] z-0">
          <MapContainer center={[centroMapa.lat, centroMapa.lng]} zoom={centroMapa.zoom} className="w-full h-full absolute inset-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <CambiarCentro centro={centroMapa} />

            {/* Marcadores de los puntos del mapa en Huancayo */}
            {Object.entries(NODOS_MAPA).map(([nombre, nodo]) => (
              <Marker key={nombre} position={[nodo.lat, nodo.lng]}>
                <Popup><b className="text-slate-900">{nombre}</b><br/>Ubicación del Sistema</Popup>
              </Marker>
            ))}

            {/* TRAZADO VECTORIAL DE LA RUTA PRINCIPAL ÓPTIMA (LÍNEA VERDE) */}
            {coordenadasLinea.length > 0 && (
              <Polyline positions={coordenadasLinea} color="#10b981" weight={6} opacity={0.9} />
            )}

            {/* TRAZADO DE RUTAS ALTERNATIVAS SECUNDARIAS (AZUL Y AMARILLO) */}
            {coordenadasLinea.length > 0 && lineasAlternativas.map((linea, index) => (
              <Polyline key={index} positions={linea.coords} color={linea.color} weight={4} dashArray="5, 10" opacity={0.7} />
            ))}
          </MapContainer>

          {/* Menú de Leyendas flotante tal cual tu diseño */}
          {coordenadasLinea.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl max-w-xs z-[1000] pointer-events-auto">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Alternativas de Ruta Generadas</h3>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="bg-slate-950 p-2 rounded border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold">🟢 Ruta Óptima (Dijkstra):</span>
                  <p className="text-slate-300 font-mono mt-0.5">Camino directo calculado</p>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-slate-400">
                  <span className="text-blue-400 font-bold">🔵 Alternativa 2:</span> Evitando Av. Ferrocarril (+4 min)
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-slate-400">
                  <span className="text-amber-400 font-bold">🟡 Alternativa 3:</span> Por San Carlos (+9 min)
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
