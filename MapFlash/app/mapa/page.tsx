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

// Interfaz estricta para los nodos del grafo (Soporta nivel nacional/mundial)
interface NodoGrafo {
  lat: number;
  lng: number;
  conexiones: Record<string, number>;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [destino, setDestino] = useState('');
  
  // Estado para reflejar el camino óptimo del autómata Dijkstra
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Camino: Nodo_A → Nodo_B → Nodo_D');

  // Ubicación dinámica en el mapa (Nacional / Mundial)
  const [centroMapa, setCentroMapa] = useState({
    lat: -12.05, 
    lng: -77.04,
    zoom: 13 
  });

  // Tu Grafo cargado en el estado (Páralo o llénalo dinámicamente según tus ubicaciones nacionales o mundiales)
  const [grafoNodos, setGrafoNodos] = useState<Record<string, NodoGrafo>>({
    // Aquí van tus nodos cargados. Ejemplo de estructura:
    "Nodo_A": { lat: -12.05, lng: -77.04, conexiones: { "Nodo_B": 5 } },
    "Nodo_B": { lat: -12.06, lng: -75.21, conexiones: { "Nodo_A": 5, "Nodo_D": 3 } },
    "Nodo_D": { lat: -12.07, lng: -75.22, conexiones: { "Nodo_B": 3 } }
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

  const localizarMiPosicion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCentroMapa({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            zoom: 15
          });
        },
        () => {
          alert("No se pudo acceder a tu ubicación actual.");
        }
      );
    }
  };

  // Algoritmo Dijkstra con tipado estricto para evitar errores en Vercel
  const ejecutarDijkstra = (inicio: string, fin: string) => {
    if (!grafoNodos[inicio] || !grafoNodos[fin]) {
      alert("Nodos origen o destino no válidos en el grafo global.");
      return;
    }

    const distancias: Record<string, number> = {};
    const previos: Record<string, string | null> = {};
    const visitados = new Set<string>();

    Object.keys(grafoNodos).forEach(nodo => {
      distancias[nodo] = Infinity;
      previos[nodo] = null;
    });
    distancias[inicio] = 0;

    while (visitados.size < Object.keys(grafoNodos).length) {
      let nodoActual: string | null = null;
      let distanciaMinima = Infinity;

      Object.keys(grafoNodos).forEach(nodo => {
        if (!visitados.has(nodo) && distancias[nodo] < distanciaMinima) {
          distanciaMinima = distancias[nodo];
          nodoActual = nodo;
        }
      });

      if (nodoActual === null || nodoActual === fin) break;
      visitados.add(nodoActual);

      const conexiones = grafoNodos[nodoActual as string].conexiones;
      Object.keys(conexiones).forEach(vecino => {
        const alt = distancias[nodoActual as string] + conexiones[vecino];
        if (alt < distancias[vecino]) {
          distancias[vecino] = alt;
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

    setCaminoCalculado(`Camino: ${camino.join(' → ')}`);
    
    // Mover de inmediato el mapa al nodo destino calculado
    setCentroMapa({
      lat: grafoNodos[fin].lat,
      lng: grafoNodos[fin].lng,
      zoom: 15
    });
  };

  const handleBuscarDestino = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) return;

    // Buscar si el destino escrito coincide con alguna clave de tu grafo nacional/mundial
    const nodoEncontrado = Object.keys(grafoNodos).find(n => 
      n.toLowerCase().includes(destino.toLowerCase())
    );

    if (nodoEncontrado) {
      const nodo = grafoNodos[nodoEncontrado];
      setCentroMapa({
        lat: nodo.lat,
        lng: nodo.lng,
        zoom: 15
      });
      // Tomamos "Nodo_A" como origen de ejemplo global, o cámbialo por tu nodo actual
      ejecutarDijkstra("Nodo_A", nodoEncontrado);
    } else {
      alert("El destino no corresponde a ningún nodo registrado en el grafo.");
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
          
          {usuario && (
            <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs font-semibold text-slate-200">
                {getEmojiRol(usuario.rol)} {usuario.nombre}
              </span>
              {usuario.avatar_url && (
                <img 
                  src={usuario.avatar_url} 
                  alt="Miniatura" 
                  className="w-6 h-6 rounded-full object-cover border border-slate-600 shadow"
                />
              )}
              <button onClick={handleCerrarSesion} className="text-slate-400 hover:text-rose-400 transition font-bold text-xs">✕</button>
            </div>
          )}
        </div>
      </header>

      {/* Contenedor Principal del Mapa */}
      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        
        {/* Barra de Búsqueda Superior */}
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
          
          <button 
            type="button"
            onClick={() => ejecutarDijkstra("Nodo_A", Object.keys(grafoNodos).find(n => n.toLowerCase().includes(destino.toLowerCase())) || "Nodo_D")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition active:scale-95 text-center"
          >
            Calcular ruta óptma con Dijkstra →
          </button>
        </div>

        {/* Fila de Estado de Ubicación y Autómata */}
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
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AUTOMÁTA DIJKSTRA</span>
              <span className="text-xs text-slate-300 font-mono">{caminoCalculado}</span>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md">
              EN VIVO
            </span>
          </div>
        </div>

        {/* Contenedor del Mapa Físico (Renderiza cualquier coordenada mundial) */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[350px]">
          <iframe
            src={`http://googleusercontent.com/maps.google.com/maps?q=${centroMapa.lat},${centroMapa.lng}&z=${centroMapa.zoom}&output=embed`}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </main>
    </div>
  );
}
