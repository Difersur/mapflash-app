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

interface ConexionNodo {
  idDestino: string;
  distanciaKm: number;  
  tiempoMin: number;    
}

interface NodoGrafo {
  lat: number;
  lng: number;
  direccionGoogle: string; 
  conexiones: ConexionNodo[]; 
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [destino, setDestino] = useState('');
  
  // Visores métricos superiores interactivos
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Esperando origen y destino...');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('-- min');
  const [costoRuta, setCostoRuta] = useState<string>('-- Km');
  
  const [rutaActiva, setRutaActiva] = useState<string[]>([]);
  
  // Coordenadas de respaldo para incidentes
  const [coordenadasActuales, setCoordenadasActuales] = useState({
    lat: -12.065,
    lng: -75.215
  });

  // URL del iframe - Carga inicial limpia
  const [urlMapa, setUrlMapa] = useState<string>(
    "https://maps.google.com/maps?q=-12.065,-75.215&z=14&output=embed"
  );

  // Nodos georreferenciados originales
  const [NODOS_MAPA] = useState<Record<string, NodoGrafo>>({
    "Nodo_A": { 
      lat: -12.056, 
      lng: -75.228, 
      direccionGoogle: "Universidad+Continental,Huancayo",
      conexiones: [{ idDestino: "Nodo_B", distanciaKm: 5, tiempoMin: 7 }] 
    },
    "Nodo_B": { 
      lat: -12.063, 
      lng: -75.212, 
      direccionGoogle: "Av.+Ferrocarril,Huancayo",
      conexiones: [
        { idDestino: "Nodo_A", distanciaKm: 5, tiempoMin: 7 },
        { idDestino: "Nodo_D", distanciaKm: 3.5, tiempoMin: 5 }
      ] 
    },
    "Nodo_D": { 
      lat: -12.072, 
      lng: -75.220, 
      direccionGoogle: "Real+Plaza+Huancayo",
      conexiones: [{ idDestino: "Nodo_B", distanciaKm: 3.5, tiempoMin: 5 }] 
    }
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

  // Geolocalización por GPS activa para marcar posición
  const localizarMiPosicion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordenadasActuales({ lat, lng });
          setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`);
        },
        () => {
          alert("No se pudo acceder a tu ubicación actual.");
        }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  // Dijkstra con template strings arreglados `${}` sin romper la sintaxis
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

    setCaminoCalculado(`Camino: ${camino.join(' → ')}`);
    setTiempoEstimado(`${tiempos[fin]} min`);
    setCostoRuta(`${distancias[fin]} Km`);
    setRutaActiva(camino);
    
    const origenDir = NODOS_MAPA[inicio].direccionGoogle;
    const destinoDir = NODOS_MAPA[fin].direccionGoogle;
    setUrlMapa(`https://maps.google.com/maps?saddr=${origenDir}&daddr=${destinoDir}&z=14&output=embed`);
  };

  const handleBuscarDestino = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) return;

    const nodoEncontrado = Object.keys(NODOS_MAPA).find(n => 
      n.toLowerCase().includes(destino.toLowerCase()) || 
      NODOS_MAPA[n].direccionGoogle.toLowerCase().includes(destino.toLowerCase())
    );

    if (nodoEncontrado) {
      ejecutarDijkstra("Nodo_A", nodoEncontrado);
    } else {
      const destinoGlobal = encodeURIComponent(destino + ", Peru");
      setUrlMapa(`https://maps.google.com/maps?q=${destinoGlobal}&z=13&output=embed`);
      setCaminoCalculado(`Buscando: ${destino}`);
      setTiempoEstimado(`-- min`);
      setCostoRuta(`-- Km`);
    }
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) {
      alert("Debes iniciar sesión para reportar incidentes.");
      return;
    }
    setCargandoAlerta(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordenadasActuales({ lat, lng });
          await guardarAlerta(tipo, lat, lng);
        },
        async () => {
          await guardarAlerta(tipo, coordenadasActuales.lat, coordenadasActuales.lng);
        }
      );
    } else {
      await guardarAlerta(tipo, coordenadasActuales.lat, coordenadasActuales.lng);
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
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      alert("No se pudo registrar el reporte: " + mensaje);
    } finally {
      setCargandoAlerta(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← MapFlash</Link>
          <h1 className="text-lg font-bold text-white">Mapa Nacional del Perú</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            🔥 {reportes.length} Alertas activas
          </span>
          {usuario ? (
            <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-xs font-semibold text-slate-200">{getEmojiRol(usuario.rol)} {usuario.nombre}</span>
              <button onClick={handleCerrarSesion} className="text-slate-400 hover:text-rose-400 font-bold text-xs">✕</button>
            </div>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl text-white font-medium transition">Iniciar Sesión</Link>
          )}
        </div>
      </header>

      <main className="flex-1 relative bg-slate-950 p-4 flex flex-col gap-4">
        {/* Buscador */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <form onSubmit={handleBuscarDestino} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Introduce tu destino (ej. Real Plaza / Nodo_D)..." 
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-2 rounded-xl text-white">Buscar</button>
          </form>
          <button 
            type="button"
            onClick={() => ejecutarDijkstra("Nodo_A", "Nodo_D")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm"
          >
            Calcular ruta óptma con Dijkstra →
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
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

        {/* Barra GPS */}
        <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-xs text-emerald-400 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Visor GPS Activo
          </span>
          <button onClick={localizarMiPosicion} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition active:scale-95">
            📍 Localizar mi Posición
          </button>
        </div>

        {/* Mapa original */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[400px]">
          <iframe
            src={urlMapa}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen={true}
            loading="lazy"
          ></iframe>

          {/* Caja lateral de alternativas */}
          {rutaActiva.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl max-w-xs z-10">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Alternativas de Ruta Generadas</h3>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="bg-slate-950 p-2 rounded border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold">🟢 Ruta Óptima (Dijkstra):</span>
                  <p className="text-slate-300 font-mono mt-0.5">{rutaActiva.join(' → ')}</p>
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

        {/* Alertas */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ALERTAR INCIDENTES DE TRÁNSITO</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => handleCrearAlerta('Accidente')} disabled={cargandoAlerta} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-3 px-4 rounded-xl transition active:scale-95 disabled:opacity-50">🚨 Accidente</button>
            <button onClick={() => handleCrearAlerta('Tráfico')} disabled={cargandoAlerta} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold py-3 px-4 rounded-xl transition active:scale-95 disabled:opacity-50">🚗 Tráfico</button>
            <button onClick={() => handleCrearAlerta('Operativo')} disabled={cargandoAlerta} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold py-3 px-4 rounded-xl transition active:scale-95 disabled:opacity-50">👮 Operativo</button>
            <button onClick={() => handleCrearAlerta('Vía Cerrada')} disabled={cargandoAlerta} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold py-3 px-4 rounded-xl transition active:scale-95 disabled:opacity-50">🚧 Vía Cerrada</button>
          </div>
        </div>
      </main>
    </div>
  );
}
