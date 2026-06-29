'use client';
import { useState, useEffect, useRef } from 'react';
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
  
  // Estado para controlar la ventana flotante del perfil completo
  const [verPerfilDetallado, setVerPerfilDetallado] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Esperando origen y destino...');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('-- min');
  const [costoRuta, setCostoRuta] = useState<string>('-- Km');
  
  const [rutaActiva, setRutaActiva] = useState<string[]>([]);
  const [coordenadasActuales, setCoordenadasActuales] = useState({ lat: -12.0674, lng: -75.2102 });
  const [urlMapa, setUrlMapa] = useState<string>('https://maps.google.com/maps?q=-12.0674,-75.2102&z=14&output=embed');

  const [NODOS_MAPA] = useState<Record<string, NodoGrafo>>({
    "Nodo_A": { lat: -12.0565, lng: -75.2282, direccionGoogle: "Universidad+Continental,Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 5, tiempoMin: 7 }] },
    "Nodo_B": { lat: -12.0631, lng: -75.2124, direccionGoogle: "Av.+Ferrocarril,Huancayo", conexiones: [{ idDestino: "Nodo_A", distanciaKm: 5, tiempoMin: 7 }, { idDestino: "Nodo_D", distanciaKm: 3.5, tiempoMin: 5 }] },
    "Nodo_D": { lat: -12.0728, lng: -75.2201, direccionGoogle: "Real+Plaza+Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 3.5, tiempoMin: 5 }] }
  });

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      setUsuario({
        nombre: "Joaquien",
        email: "Acc2Prueba@gmail.com",
        rol: "conductor",
        avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien" 
      });
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordenadasActuales({ lat, lng });
        setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`);
      });
    }
    obtenerReportesEnVivo();
  }, []);

  const obtenerReportesEnVivo = async () => {
    const { data } = await supabase.from('alertas_trafico').select('*').eq('estado', 'activo');
    if (data) setReportes(data);
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    setUsuario(null);
    setVerPerfilDetallado(false);
    window.location.href = '/';
  };

  // Manejo de la subida o captura de foto de perfil
  const handleCambiarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && usuario) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const nuevoUsuario = { ...usuario, avatar_url: reader.result as string };
        setUsuario(nuevoUsuario);
        localStorage.setItem('usuario_mapflash', JSON.stringify(nuevoUsuario));
      };
      reader.readAsDataURL(file);
    }
  };

  const localizarMiPosicion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordenadasActuales({ lat, lng });
        setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`);
      });
    }
  };

  const ejecutarDijkstraDesdeUbicacion = (fin: string) => {
    if (!NODOS_MAPA[fin]) return;
    let nodoMasCercano = "Nodo_A";
    let distanciaMinima = Infinity;

    Object.entries(NODOS_MAPA).forEach(([nombre, datos]) => {
      const d = Math.sqrt(Math.pow(datos.lat - coordenadasActuales.lat, 2) + Math.pow(datos.lng - coordenadasActuales.lng, 2));
      if (d < distanciaMinima) { distanciaMinima = d; nodoMasCercano = nombre; }
    });

    const distancias: Record<string, number> = {};
    const tiempos: Record<string, number> = {};
    const previos: Record<string, string | null> = {};
    const visitados = new Set<string>();

    Object.keys(NODOS_MAPA).forEach(nodo => { distancias[nodo] = Infinity; tiempos[nodo] = Infinity; previos[nodo] = null; });
    distancias[nodoMasCercano] = 0; tiempos[nodoMasCercano] = 0;

    while (visitados.size < Object.keys(NODOS_MAPA).length) {
      let nodoActual: string | null = null; let distMin = Infinity;
      Object.keys(NODOS_MAPA).forEach(nodo => {
        if (!visitados.has(nodo) && distancias[nodo] < distMin) { distMin = distancias[nodo]; nodoActual = nodo; }
      });
      if (nodoActual === null || nodoActual === fin) break;
      visitados.add(nodoActual);

      const conexiones = NODOS_MAPA[nodoActual as string].conexiones || [];
      conexiones.forEach(conexion => {
        const vecino = conexion.idDestino;
        const altDistancia = distancias[nodoActual as string] + conexion.distanciaKm;
        const altTiempo = tiempos[nodoActual as string] + conexion.tiempoMin;
        if (altDistancia < distancias[vecino]) { distancias[vecino] = altDistancia; tiempos[vecino] = altTiempo; previos[vecino] = nodoActual; }
      });
    }

    const camino: string[] = []; let paso: string | null = fin;
    while (paso) { camino.unshift(paso); paso = previos[paso]; }
    setCaminoCalculado(`Mi Ubicación → ${camino.join(' → ')}`);
    setTiempoEstimado(`${distancias[fin] !== Infinity ? tiempos[fin] : 12} min`);
    setCostoRuta(`${distancias[fin] !== Infinity ? distancias[fin] : 3.5} Km`);
    setRutaActiva(['Mi Ubicación', ...camino]);
    setUrlMapa(`https://maps.google.com/maps?q=${NODOS_MAPA[fin].lat},${NODOS_MAPA[fin].lng}&z=14&output=embed`);
  };

  const handleBuscarDestinoUnificado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destino) return;
    const nodoEncontrado = Object.keys(NODOS_MAPA).find(n => n.toLowerCase().includes(destino.toLowerCase()));
    if (nodoEncontrado) {
      ejecutarDijkstraDesdeUbicacion(nodoEncontrado);
    } else {
      setUrlMapa(`https://maps.google.com/maps?q=${encodeURIComponent(destino + ", Huancayo")}&z=14&output=embed`);
      setCaminoCalculado(`Mi Ubicación → ${destino}`);
      setRutaActiva(['Mi Ubicación', destino]);
    }
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) return alert("Inicia sesión primero.");
    setCargandoAlerta(true);
    const guardar = async (l: number, g: number) => {
      await supabase.from('alertas_trafico').insert([{ tipo_reporte: tipo, latitud: l, longitud: g, estado: 'activo' }]);
      alert(`¡Alerta de ${tipo} registrada!`);
      obtenerReportesEnVivo();
      setCargandoAlerta(false);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => guardar(p.coords.latitude, p.coords.longitude), () => guardar(coordenadasActuales.lat, coordenadasActuales.lng));
    } else { guardar(coordenadasActuales.lat, coordenadasActuales.lng); }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden relative">
      
      {/* CABECERA PRINCIPAL */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md relative z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← MapFlash</Link>
          <h1 className="text-lg font-bold text-white">Mapa Nacional del Perú</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            🔥 {reportes.length} Alertas activas
          </span>
          
          {usuario ? (
            <button 
              onClick={() => setVerPerfilDetallado(true)}
              className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer transition select-none z-50 text-left"
            >
              <img 
                src={usuario.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien"} 
                alt="Avatar" 
                className="w-6 h-6 rounded-full border border-blue-500 object-cover" 
              />
              <span className="text-xs font-semibold text-slate-200">{usuario.nombre}</span>
              <span className="text-[10px] text-slate-500">⚙️</span>
            </button>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl text-white font-medium transition">Iniciar Sesión</Link>
          )}
        </div>
      </header>

      {/* MODAL / VENTANA LATERAL FLOTANTE DE PERFIL (CON CÁMARA / SUBIDA DE FOTO) */}
      {verPerfilDetallado && usuario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 h-full p-6 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-md font-bold text-white flex items-center gap-2">👤 Detalles del Perfil</h2>
                <button onClick={() => setVerPerfilDetallado(false)} className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-2 rounded-xl transition">✕ Cerrar</button>
              </div>

              {/* CONTENEDOR DE FOTO INTERACTIVO */}
              <div className="flex flex-col items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 mb-6">
                <div className="relative group w-24 h-24 rounded-full border-2 border-blue-500 overflow-hidden shadow-xl bg-slate-800">
                  <img 
                    src={usuario.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien"} 
                    alt="Foto Grande" 
                    className="w-full h-full object-cover" 
                  />
                  <div 
                    onClick={() => archivoInputRef.current?.click()}
                    className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <span className="text-[18px]">📷</span>
                    <span className="text-[10px] text-slate-300 font-semibold uppercase text-center px-1">Subir / Tomar</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user" // Habilita la cámara frontal directamente en celulares
                  ref={archivoInputRef} 
                  onChange={handleCambiarFoto} 
                  className="hidden" 
                />
                <button 
                  onClick={() => archivoInputRef.current?.click()}
                  className="text-xs bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-4 py-1.5 rounded-xl font-semibold transition"
                >
                  Cambiar Foto o Usar Cámara
                </button>
              </div>

              {/* CAMPOS DEL FORMULARIO DEL USUARIO */}
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nombre de Usuario:</label>
                  <input type="text" readOnly value={usuario.nombre} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Correo Electrónico:</label>
                  <input type="text" readOnly value={usuario.email} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Rol Asignado:</label>
                  <input type="text" readOnly value={usuario.rol} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-semibold uppercase tracking-wider" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleCerrarSesion}
              className="w-full bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold py-3 rounded-xl transition"
            >
              Cerrar Sesión Completa
            </button>
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL DEL MAPA */}
      <main className="flex-1 bg-slate-950 p-4 flex flex-col gap-4 relative z-10">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <form onSubmit={handleBuscarDestinoUnificado} className="flex gap-2">
            <input type="text" placeholder="Introduce tu destino (ej. Universidad Continental / Real Plaza / Nodo_D)..." value={destino} onChange={(e) => setDestino(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-3 rounded-xl text-white transition active:scale-95">Buscar y Calcular Ruta con Dijkstra →</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">MÉTRICA DE RUTA</span><span className="text-xs text-slate-200 font-mono block mt-1">{caminoCalculado}</span></div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">TIEMPO EN RUTA</span><span className="text-xs text-amber-400 font-mono block mt-1 font-bold">⏱️ {tiempoEstimado}</span></div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">COSTO DE LLEGADA</span><span className="text-xs text-blue-400 font-mono block mt-1 font-bold">📏 {costoRuta}</span></div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-xs text-emerald-400 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Visor GPS Activo</span>
          <button onClick={localizarMiPosicion} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition active:scale-95">📍 Localizar mi Posición</button>
        </div>

        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[440px] z-20">
          <iframe src={urlMapa} className="w-full h-full border-0 absolute inset-0 z-20" allowFullScreen={true} loading="lazy"></iframe>
          {rutaActiva.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl max-w-xs z-30">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Alternativas Generadas</h3>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="bg-slate-950 p-2 rounded border border-emerald-500/30"><span className="text-emerald-400 font-bold">🟢 Ruta Óptima (Dijkstra):</span><p className="text-slate-300 font-mono mt-0.5">{rutaActiva.join(' → ')}</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ALERTAR INCIDENTES DE TRÁNSITO</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => handleCrearAlerta('Accidente')} disabled={cargandoAlerta} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-3 px-4 rounded-xl transition">🚨 Accidente</button>
            <button onClick={() => handleCrearAlerta('Tráfico')} disabled={cargandoAlerta} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold py-3 px-4 rounded-xl transition">🚗 Tráfico</button>
            <button onClick={() => handleCrearAlerta('Operativo')} disabled={cargandoAlerta} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold py-3 px-4 rounded-xl transition">👮 Operativo</button>
            <button onClick={() => handleCrearAlerta('Vía Cerrada')} disabled={cargandoAlerta} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold py-3 px-4 rounded-xl transition">🚧 Vía Cerrada</button>
          </div>
        </div>
      </main>
    </div>
  );
}
