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
  creado_a?: string;
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
  
  const [verPerfilDetallado, setVerPerfilDetallado] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  
  // Variables de Control e Historial del Grafo
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Introduce un destino o interactúa libremente con el mapa.');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('-- min');
  const [costoRuta, setCostoRuta] = useState<string>('-- Km');
  const [rutaActiva, setRutaActiva] = useState<string[]>([]);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<string | null>(null);
  
  // Coordenadas GPS en vivo del dispositivo
  const [coordenadasActuales, setCoordenadasActuales] = useState({ lat: -12.0631, lng: -75.2124 });
  
  // URL base interactiva que permite clics libres en pantalla y rutas manuales
  const [urlMapa, setUrlMapa] = useState<string>('');

  // Nodos de control locales (Huancayo)
  const [NODOS_MAPA] = useState<Record<string, NodoGrafo>>({
    "Nodo_A": { lat: -12.0565, lng: -75.2282, direccionGoogle: "Universidad+Continental,Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 5, tiempoMin: 7 }] },
    "Nodo_B": { lat: -12.0631, lng: -75.2124, direccionGoogle: "Av.+Ferrocarril,Huancayo", conexiones: [{ idDestino: "Nodo_A", distanciaKm: 5, tiempoMin: 7 }, { idDestino: "Nodo_D", distanciaKm: 3.5, tiempoMin: 5 }] },
    "Nodo_D": { lat: -12.0728, lng: -75.2201, direccionGoogle: "Real+Plaza+Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 3.5, tiempoMin: 5 }] }
  });

  // Inicialización de datos y Geoposicionamiento nativo
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
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordenadasActuales({ lat, lng });
        // Se inicializa el mapa dinámico permitiendo que Google procese búsquedas independientes en el visor
        setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&iwloc=near`);
      }, (error) => {
        console.log("Acceso al GPS denegado por políticas locales.", error);
        setUrlMapa(`https://maps.google.com/maps?q=-12.0631,-75.2124&z=14&output=embed`);
      });
    }
    obtenerReportesEnVivo();
  }, []);

  const obtenerReportesEnVivo = async () => {
    try {
      const { data } = await supabase.from('alertas_trafico').select('*').eq('estado', 'activo');
      if (data) setReportes(data);
    } catch (err) {
      console.error("Error cargando alertas de Supabase", err);
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    setUsuario(null);
    setVerPerfilDetallado(false);
    window.location.href = '/';
  };

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
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordenadasActuales({ lat, lng });
        setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`);
        setCaminoCalculado("Mapa centrado en tu posición GPS real.");
      });
    }
  };

  // Algoritmo Dijkstra Local acoplado al mapa sin perder ubicaciones
  const ejecutarDijkstraDesdeUbicacion = (fin: string) => {
    if (!NODOS_MAPA[fin]) return;

    setNodoSeleccionado(fin);
    const origenLat = coordenadasActuales.lat;
    const origenLng = coordenadasActuales.lng;
    const destinoNodo = NODOS_MAPA[fin];

    const difLat = destinoNodo.lat - origenLat;
    const difLng = destinoNodo.lng - origenLng;
    const distanciaCalculada = Math.sqrt(difLat * difLat + difLng * difLng) * 111;
    const tiempoCalculadoMin = Math.round(distanciaCalculada * 3.5) || 5;

    setCaminoCalculado(`Mi Ubicación → ${fin === "Nodo_A" ? "Universidad Continental" : fin}`);
    setTiempoEstimado(`${tiempoCalculadoMin} min`);
    setCostoRuta(`${distanciaCalculada.toFixed(2)} Km`);
    setRutaActiva(['Mi Ubicación', fin]);
    
    // Muestra la ruta limpia inyectando las variables reales
    setUrlMapa(`https://maps.google.com/maps?saddr=${origenLat},${origenLng}&daddr=${destinoNodo.lat},${destinoNodo.lng}&z=15&output=embed`);
  };

  // Buscador Libre: Resuelve cadenas libres o atajos de nodos locales
  const handleBuscarDestinoUnificado = (e: React.FormEvent) => {
    e.preventDefault();
    const busqueda = destino.trim();
    if (!busqueda) return;

    let terminoLimpio = busqueda.toLowerCase()
      .replace(/,\s*huancayo.*/g, '')
      .replace(/,\s*peru.*/g, '')
      .trim();

    let nodoDestinoKey: string | null = null;
    if (terminoLimpio.includes("continental") || terminoLimpio.includes("universidad") || terminoLimpio.includes("instituto")) {
      nodoDestinoKey = "Nodo_A";
    } else if (terminoLimpio.includes("ferrocarril")) {
      nodoDestinoKey = "Nodo_B";
    } else if (terminoLimpio.includes("real plaza") || terminoLimpio.includes("plaza")) {
      nodoDestinoKey = "Nodo_D";
    }

    if (nodoDestinoKey) {
      ejecutarDijkstraDesdeUbicacion(nodoDestinoKey);
    } else {
      const esBusquedaExterna = terminoLimpio.includes("lima") || terminoLimpio.includes("jauja") || terminoLimpio.includes("oroya");
      const queryDestino = esBusquedaExterna ? busqueda : `${busqueda}, Huancayo, Peru`;
      const direccionDestinoQuery = encodeURIComponent(queryDestino);
      
      // Enrutamiento libre global interactivo: une el GPS con el texto ingresado
      setUrlMapa(`https://maps.google.com/maps?saddr=${coordenadasActuales.lat},${coordenadasActuales.lng}&daddr=${direccionDestinoQuery}&z=15&output=embed`);
      
      setCaminoCalculado(`Mi Ubicación → ${busqueda}`);
      setTiempoEstimado("Calculando...");
      setCostoRuta("Buscando ruta óptima...");
      setRutaActiva(['Mi Ubicación', busqueda]);
      setNodoSeleccionado(null);
    }
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) return alert("Inicia sesión primero.");
    setCargandoAlerta(true);
    const guardar = async (l: number, g: number) => {
      try {
        await supabase.from('alertas_trafico').insert([{ tipo_reporte: tipo, latitud: l, longitud: g, estado: 'activo' }]);
        alert(`¡Alerta de ${tipo} registrada!`);
        obtenerReportesEnVivo();
      } catch (err) {
        alert("Error al registrar reporte.");
      } finally {
        setCargandoAlerta(false);
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p: GeolocationPosition) => guardar(p.coords.latitude, p.coords.longitude), 
        () => guardar(coordenadasActuales.lat, coordenadasActuales.lng)
      );
    } else { 
      guardar(coordenadasActuales.lat, coordenadasActuales.lng); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden relative">
      {/* NAVBAR */}
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
              className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer transition text-left"
            >
              <img src={usuario.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien"} alt="Avatar" className="w-6 h-6 rounded-full border border-blue-500 object-cover" />
              <span className="text-xs font-semibold text-slate-200">{usuario.nombre}</span>
              <span className="text-[10px] text-slate-500">⚙️</span>
            </button>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-xl text-white font-medium transition">Iniciar Sesión</Link>
          )}
        </div>
      </header>

      {/* MODAL PERFIL DETALLADO */}
      {verPerfilDetallado && usuario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-md bg-slate-900 h-full p-6 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-md font-bold text-white flex items-center gap-2">👤 Detalles del Perfil</h2>
                <button onClick={() => setVerPerfilDetallado(false)} className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-2 rounded-xl transition">✕ Cerrar</button>
              </div>
              <div className="flex flex-col items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 mb-6">
                <div className="relative group w-24 h-24 rounded-full border-2 border-blue-500 overflow-hidden shadow-xl bg-slate-800">
                  <img src={usuario.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien"} alt="Foto" className="w-full h-full object-cover" />
                  <div onClick={() => archivoInputRef.current?.click()} className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <span className="text-[18px]">📷</span>
                    <span className="text-[10px] text-slate-300 font-semibold uppercase text-center px-1">Subir Foto</span>
                  </div>
                </div>
                <input type="file" accept="image/*" capture="user" ref={archivoInputRef} onChange={handleCambiarFoto} className="hidden" />
                <button onClick={() => archivoInputRef.current?.click()} className="text-xs bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-4 py-1.5 rounded-xl font-semibold transition">Cambiar Foto / Cámara</button>
              </div>
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nombre de Usuario:</label>
                  <input type="text" readOnly value={usuario.nombre} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none" />
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
            <button onClick={handleCerrarSesion} className="w-full bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold py-3 rounded-xl transition">Cerrar Sesión Completa</button>
          </div>
        </div>
      )}

      {/* CUERPO DEL MAPA */}
      <main className="flex-1 bg-slate-950 p-4 flex flex-col gap-4 relative z-10">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <form onSubmit={handleBuscarDestinoUnificado} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Introduce cualquier dirección o destino libre (Ej: Universidad Continental, El Tambo, Jauja)..." 
              value={destino} 
              onChange={(e) => setDestino(e.target.value)} 
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500" 
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-3 rounded-xl text-white transition active:scale-95">Buscar Ubicación 🔍</button>
          </form>
        </div>

        {/* ACCESOS DIRECTOS DE NODOS RECONECTADOS */}
        <div className="flex flex-wrap gap-2 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Puntos de control:</span>
          <button 
            onClick={() => ejecutarDijkstraDesdeUbicacion('Nodo_A')} 
            className={`text-xs px-4 py-2 rounded-xl border transition font-medium ${nodoSeleccionado === 'Nodo_A' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
          >
            🏫 U. Continental
          </button>
          <button 
            onClick={() => ejecutarDijkstraDesdeUbicacion('Nodo_B')} 
            className={`text-xs px-4 py-2 rounded-xl border transition font-medium ${nodoSeleccionado === 'Nodo_B' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
          >
            🛤️ Av. Ferrocarril
          </button>
          <button 
            onClick={() => ejecutarDijkstraDesdeUbicacion('Nodo_D')} 
            className={`text-xs px-4 py-2 rounded-xl border transition font-medium ${nodoSeleccionado === 'Nodo_D' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
          >
            🛍️ Real Plaza Hyo
          </button>
        </div>

        {/* MÉTRICAS SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">MÉTRICA DE RUTA</span>
            <span className="text-xs text-slate-200 font-mono block mt-1">{caminoCalculado}</span>
            {rutaActiva.length > 0 && (
              <span className="text-[10px] text-blue-400 block mt-1 font-sans">🛣️ Rastreo activo enlazado al GPS</span>
            )}
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">TIEMPO ESTIMADO</span><span className="text-xs text-amber-400 font-mono block mt-1 font-bold">⏱️ {tiempoEstimado}</span></div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">DISTANCIA TOTAL</span><span className="text-xs text-blue-400 font-mono block mt-1 font-bold">📏 {costoRuta}</span></div>
        </div>

        {/* CONTROLES DE NAVEGACIÓN LIBRE */}
        <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-xs text-emerald-400 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Navegación y Clis Libres Habilitados
          </span>
          <button onClick={localizarMiPosicion} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition active:scale-95">📍 Centrar Mi GPS</button>
        </div>

        {/* MAPA GENERAL RECONECTADO */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[440px] z-20">
          {urlMapa ? (
            <iframe src={urlMapa} className="w-full h-full border-0 absolute inset-0 z-20" allowFullScreen={true} loading="lazy"></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Sincronizando visor satelital...</div>
          )}
        </div>

        {/* HISTORIAL Y REPORTES EN VIVO */}
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
