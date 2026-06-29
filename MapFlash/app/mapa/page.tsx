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

interface LugarGuardado {
  id: string;
  nombre: string;
  direccionQuery: string;
  icono: string;
}

interface OpcionSugerida {
  nombreEspecifico: string;
  direccionQuery: string;
  descripcion: string;
}

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [destino, setDestino] = useState('');
  
  const [verPerfilDetallado, setVerPerfilDetallado] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  
  const [caminoCalculado, setCaminoCalculado] = useState<string>('Introduce un destino o selecciona un lugar guardado.');
  const [tiempoEstimado, setTiempoEstimado] = useState<string>('-- min');
  const [costoRuta, setCostoRuta] = useState<string>('-- Km');
  const [rutaActiva, setRutaActiva] = useState<string[]>([]);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<string | null>(null);
  
  const [lugaresGuardados, setLugaresGuardados] = useState<LugarGuardado[]>([]);
  const [nombreNuevoLugar, setNombreNuevoLugar] = useState('');
  const [mostrarFormLugar, setMostrarFormLugar] = useState(false);
  
  const [coordenadasActuales, setCoordenadasActuales] = useState({ lat: -12.0631, lng: -75.2124 });
  const [regionActual, setRegionActual] = useState<string>('Huancayo');
  
  const [urlMapa, setUrlMapa] = useState<string>('');
  const [queryDestinoActual, setQueryDestinoActual] = useState<string>('');

  const [opcionesEncontradas, setOpcionesEncontradas] = useState<OpcionSugerida[]>([]);
  const [mostrarPanelOpciones, setMostrarPanelOpciones] = useState(false);

  const [NODOS_MAPA] = useState<Record<string, NodoGrafo>>({
    "Nodo_A": { lat: -12.0544, lng: -75.1989, direccionGoogle: "Universidad+Continental+San+Carlos,Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 2.8, tiempoMin: 8 }] },
    "Nodo_B": { lat: -12.0672, lng: -75.2111, direccionGoogle: "Av.+Ferrocarril+con+Giraldez,Huancayo", conexiones: [{ idDestino: "Nodo_A", distanciaKm: 2.8, tiempoMin: 8 }, { idDestino: "Nodo_D", distanciaKm: 1.2, tiempoMin: 4 }] },
    "Nodo_D": { lat: -12.0728, lng: -75.2201, direccionGoogle: "Real+Plaza+Huancayo", conexiones: [{ idDestino: "Nodo_B", distanciaKm: 1.2, tiempoMin: 4 }] }
  });

  const BASE_CONOCIMIENTO_AMBIGUEDAD: Record<string, OpcionSugerida[]> = {
    "upla": [
      { nombreEspecifico: "UPLA - Campus Universitario (Chorrillos)", direccionQuery: "UPLA Campus Chorrillos, Huancayo", descripcion: "Sede principal del complejo universitario y facultades generales en El Tambo." },
      { nombreEspecifico: "UPLA - Facultad de Medicina Humana", direccionQuery: "UPLA Facultad de Medicina, Av. San Carlos, Huancayo", descripcion: "Pabellón e instalaciones de salud situado en el sector de San Carlos." },
      { nombreEspecifico: "UPLA - Escuela de Posgrado y Oficinas", direccionQuery: "UPLA Posgrado, Jirón Ancash, Huancayo", descripcion: "Sede administrativa central para trámites académicos." }
    ],
    "tupac amaru": [
      { nombreEspecifico: "Pasaje Túpac Amaru (San Carlos)", direccionQuery: "Pasaje Tupac Amaru, San Carlos, Huancayo", descripcion: "Pequeña vía residencial cercana al campus de la Universidad Continental." },
      { nombreEspecifico: "Avenida Túpac Amaru (El Tambo)", direccionQuery: "Av. Tupac Amaru, El Tambo, Huancayo", descripcion: "Arteria principal del distrito norte de El Tambo." },
      { nombreEspecifico: "Calle Túpac Amaru (Chilca)", direccionQuery: "Calle Tupac Amaru, Chilca, Huancayo", descripcion: "Vía urbana localizada en el sector sur del distrito de Chilca." }
    ],
    "continental": [
      { nombreEspecifico: "Universidad Continental - Campus Principal", direccionQuery: "Universidad Continental, Av. San Carlos 1980, Huancayo", descripcion: "Sede principal y pabellones de pregrado." },
      { nombreEspecifico: "Instituto Continental", direccionQuery: "Instituto Continental, Calle Real 125, Huancayo", descripcion: "Campus de carreras técnicas ubicado en el centro de la ciudad." }
    ]
  };

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) setUsuario(JSON.parse(sesionGuardada));

    const favoritosLocales = localStorage.getItem('favoritos_mapflash');
    // CORREGIDO: Se evalúa exactamente la misma variable declarada arriba sin provocar error de compilación
    if (favoritosLocales) {
      setLugaresGuardados(JSON.parse(favoritosLocales));
    } else {
      const porDefecto: LugarGuardado[] = [
        { id: '1', nombre: 'U. Continental (San Carlos)', direccionQuery: 'Universidad Continental, Av. San Carlos, Huancayo', icono: '🏫' },
        { id: '2', nombre: 'Real Plaza Huancayo', direccionQuery: 'Real Plaza Huancayo, Av. Ferrocarril, Huancayo', icono: '🛍️' },
        { id: '3', nombre: 'Av. Ferrocarril', direccionQuery: 'Av. Ferrocarril, Huancayo', icono: '🛤️' }
      ];
      setLugaresGuardados(porDefecto);
      localStorage.setItem('favoritos_mapflash', JSON.stringify(porDefecto));
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordenadasActuales({ lat, lng });
        
        if (lat < -11.9 && lat > -12.3 && lng < -76.8 && lng > -77.2) {
          setRegionActual('Lima');
        } else {
          setRegionActual('Huancayo');
        }
        setUrlMapa(`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`);
      }, () => {
        setUrlMapa(`https://maps.google.com/maps?q=-12.0631,-75.2124&z=15&output=embed`);
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
        setNodoSeleccionado(null);
        setQueryDestinoActual('');
        setMostrarPanelOpciones(false);
      });
    }
  };

  const ejecutarDijkstraDesdeUbicacion = (fin: string) => {
    if (!NODOS_MAPA[fin]) return;

    setNodoSeleccionado(fin);
    const origenLat = coordenadasActuales.lat;
    const origenLng = coordenadasActuales.lng;
    const destinoNodo = NODOS_MAPA[fin];

    const difLat = destinoNodo.lat - origenLat;
    const difLng = destinoNodo.lng - origenLng;
    const distanciaCalculada = Math.sqrt(difLat * difLat + difLng * difLng) * 111;
    const tiempoCalculadoMin = Math.round(distanciaCalculada * 4.5) || 5;

    let nombreFormateado = "Destino";
    if (fin === "Nodo_A") nombreFormateado = "Universidad Continental (San Carlos)";
    if (fin === "Nodo_B") nombreFormateado = "Av. Ferrocarril";
    if (fin === "Nodo_D") nombreFormateado = "Real Plaza Huancayo";

    setCaminoCalculado(`Mi Ubicación → ${nombreFormateado}`);
    setTiempoEstimado(`${tiempoCalculadoMin} min`);
    setCostoRuta(`${distanciaCalculada.toFixed(2)} Km`);
    setRutaActiva(['Mi Ubicación', nombreFormateado]);
    setQueryDestinoActual(destinoNodo.direccionGoogle);
    
    setUrlMapa(`https://maps.google.com/maps?saddr=${origenLat},${origenLng}&daddr=${destinoNodo.lat},${destinoNodo.lng}&z=15&output=embed`);
  };

  const irALugarGuardado = (lugar: LugarGuardado) => {
    setNodoSeleccionado(lugar.id);
    const queryDestino = encodeURIComponent(lugar.direccionQuery);
    setQueryDestinoActual(queryDestino);
    setMostrarPanelOpciones(false);
    
    setCaminoCalculado(`Mi Ubicación → ${lugar.nombre}`);
    setTiempoEstimado("Calculando...");
    setCostoRuta("Trazando ruta...");
    setRutaActiva(['Mi Ubicación', lugar.nombre]);
    
    setUrlMapa(`https://maps.google.com/maps?saddr=${coordenadasActuales.lat},${coordenadasActuales.lng}&daddr=${queryDestino}&z=15&output=embed`);
  };

  const seleccionarDestinoEspecifico = (opcion: OpcionSugerida) => {
    setMostrarPanelOpciones(false);
    const queryFinal = encodeURIComponent(opcion.direccionQuery);
    setQueryDestinoActual(queryFinal);

    setCaminoCalculado(`Mi Ubicación → ${opcion.nombreEspecifico}`);
    setTiempoEstimado("Calculando...");
    setCostoRuta("Filtrado por Sede/Calle exacta");
    setRutaActiva(['Mi Ubicación', opcion.nombreEspecifico]);
    
    setUrlMapa(`https://maps.google.com/maps?saddr=${coordenadasActuales.lat},${coordenadasActuales.lng}&daddr=${queryFinal}&z=15&output=embed`);
  };

  const handleBuscarDestinoUnificado = (e: React.FormEvent) => {
    e.preventDefault();
    const busqueda = destino.trim();
    if (!busqueda) return;

    let terminoLimpio = busqueda.toLowerCase();

    let claveAmbiguaEncontrada = "";
    if (terminoLimpio.includes("upla")) claveAmbiguaEncontrada = "upla";
    else if (terminoLimpio.includes("tupac amaru") || terminoLimpio.includes("tupac")) claveAmbiguaEncontrada = "tupac amaru";
    else if (terminoLimpio.includes("continental")) claveAmbiguaEncontrada = "continental";

    if (claveAmbiguaEncontrada && BASE_CONOCIMIENTO_AMBIGUEDAD[claveAmbiguaEncontrada]) {
      setOpcionesEncontradas(BASE_CONOCIMIENTO_AMBIGUEDAD[claveAmbiguaEncontrada]);
      setMostrarPanelOpciones(true);
      setCaminoCalculado(`Múltiples opciones encontradas para "${busqueda}". Selecciona una.`);
      return;
    }

    let nodoDestinoKey: string | null = null;
    if (regionActual === 'Huancayo') {
      if (terminoLimpio.includes("san carlos")) {
        nodoDestinoKey = "Nodo_A";
      } else if (terminoLimpio.includes("ferrocarril")) {
        nodoDestinoKey = "Nodo_B";
      } else if (terminoLimpio.includes("real plaza") || terminoLimpio.includes("plaza")) {
        nodoDestinoKey = "Nodo_D";
      }
    }

    if (nodoDestinoKey) {
      ejecutarDijkstraDesdeUbicacion(nodoDestinoKey);
    } else {
      const tieneEspecificacionGeografica = terminoLimpio.includes("huancayo") || terminoLimpio.includes("lima");
      const queryDestino = tieneEspecificacionGeografica ? busqueda : `${busqueda}, ${regionActual}, Peru`;
      const direccionDestinoQuery = encodeURIComponent(queryDestino);
      setQueryDestinoActual(direccionDestinoQuery);
      setMostrarPanelOpciones(false);
      
      setUrlMapa(`https://maps.google.com/maps?saddr=${coordenadasActuales.lat},${coordenadasActuales.lng}&daddr=${direccionDestinoQuery}&z=15&output=embed`);
      setCaminoCalculado(`Mi Ubicación → ${busqueda}`);
      setTiempoEstimado("Calculando...");
      setCostoRuta("Buscando dirección...");
      setRutaActiva(['Mi Ubicación', busqueda]);
    }
  };

  const handleAgregarLugarFrecuente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoLugar.trim() || !destino.trim()) return alert("Por favor ingresa un nombre.");

    const queryFinal = destino.trim().toLowerCase().includes(regionActual.toLowerCase()) 
      ? destino.trim() 
      : `${destino.trim()}, ${regionActual}, Peru`;

    const nuevoLugar: LugarGuardado = {
      id: Date.now().toString(),
      nombre: nombreNuevoLugar.trim(),
      direccionQuery: queryFinal,
      icono: '📍'
    };

    const listaActualizada = [...lugaresGuardados, nuevoLugar];
    setLugaresGuardados(listaActualizada);
    localStorage.setItem('favoritos_mapflash', JSON.stringify(listaActualizada));
    
    setNombreNuevoLugar('');
    setMostrarFormLugar(false);
    alert(`¡"${nuevoLugar.nombre}" guardado con éxito!`);
  };

  const eliminarLugarFrecuente = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtrados = lugaresGuardados.filter(item => item.id !== id);
    setLugaresGuardados(filtrados);
    localStorage.setItem('favoritos_mapflash', JSON.stringify(filtrados));
  };

  const handleCreateAlerta = async (tipo: string) => {
    if (!usuario) return alert("Inicia sesión primero.");
    setCargandoAlerta(true);
    const guardar = async (l: number, g: number) => {
      try {
        await supabase.from('alertas_trafico').insert([{ tipo_reporte: tipo, latitud: l, longitud: g, estado: 'activo' }]);
        alert(`¡Alerta de ${tipo} registrada!`);
        obtenerReportesEnVivo();
      } catch (err) {
        alert("Error al registrar reporte.");
      } final {
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
          {usuario && (
            <button onClick={() => setVerPerfilDetallado(true)} className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer transition text-left">
              <img src={usuario.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=Joaquien"} alt="Avatar" className="w-6 h-6 rounded-full border border-blue-500 object-cover" />
              <span className="text-xs font-semibold text-slate-200">{usuario.nombre}</span>
            </button>
          )}
        </div>
      </header>

      {/* MODAL PERFIL */}
      {verPerfilDetallado && usuario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-md bg-slate-900 h-full p-6 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-md font-bold text-white">👤 Detalles del Perfil</h2>
                <button onClick={() => setVerPerfilDetallado(false)} className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-2 rounded-xl transition">✕ Cerrar</button>
              </div>
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nombre de Usuario:</label>
                  <input type="text" readOnly value={usuario.nombre} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Correo Electrónico:</label>
                  <input type="text" readOnly value={usuario.email} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 outline-none" />
                </div>
              </div>
            </div>
            <button onClick={handleCerrarSesion} className="w-full bg-rose-500/10 hover:bg-rose-600 text-rose-400 border border-rose-500/20 text-xs font-semibold py-3 rounded-xl transition">Cerrar Sesión Completa</button>
          </div>
        </div>
      )}

      {/* CUERPO DEL MAPA */}
      <main className="flex-1 bg-slate-950 p-4 flex flex-col gap-4 relative z-10">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <form onSubmit={handleBuscarDestinoUnificado} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ej: Universidad UPLA, Pasaje Tupac Amaru, San Carlos..." 
              value={destino} 
              onChange={(e) => setDestino(e.target.value)} 
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500" 
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm font-semibold px-6 py-3 rounded-xl text-white transition">Buscar Ubicación 🔍</button>
          </form>

          {destino && (
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setMostrarFormLugar(!mostrarFormLugar)} className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition">⭐ Guardar dirección</button>
            </div>
          )}

          {mostrarFormLugar && (
            <form onSubmit={handleAgregarLugarFrecuente} className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <input type="text" placeholder="Alias para recordar este lugar..." value={nombreNuevoLugar} onChange={(e) => setNombreNuevoLugar(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none" />
              </div>
              <button type="submit" className="bg-emerald-600 text-xs font-bold px-4 py-2 rounded-lg text-white transition">Confirmar</button>
            </form>
          )}
        </div>

        {/* PANEL INTERACTIVO DE DESAMBIGUACIÓN */}
        {mostrarPanelOpciones && opcionesEncontradas.length > 0 && (
          <div className="bg-slate-900 border-2 border-amber-500/40 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Se encontraron múltiples sedes o calles con el mismo nombre:</span>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono">Acción requerida</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {opcionesEncontradas.map((opcion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => seleccionarDestinoEspecifico(opcion)}
                  className="bg-slate-950 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/50 p-3 rounded-xl text-left transition flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-200 group-hover:text-blue-400 transition mb-1">📍 {opcion.nombreEspecifico}</span>
                    <span className="block text-[11px] text-slate-400 leading-relaxed">{opcion.descripcion}</span>
                  </div>
                  <span className="block text-[10px] text-slate-600 mt-3 italic font-mono">Query: {opcion.direccionQuery}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAVORITOS */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">⭐ Tus Lugares Guardados (Frecuentes):</span>
          <div className="flex flex-wrap gap-2 items-center mt-1">
            {lugaresGuardados.map((lugar) => (
              <div key={lugar.id} onClick={() => irALugarGuardado(lugar)} className={`flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl border transition font-medium cursor-pointer relative group ${nodoSeleccionado === lugar.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}>
                <span>{lugar.icono}</span>
                <span>{lugar.nombre}</span>
                <button type="button" onClick={(e) => eliminarLugarFrecuente(lugar.id, e)} className="ml-1 text-[10px] text-slate-500 hover:text-rose-400 font-bold opacity-60 group-hover:opacity-100 transition">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">MÉTRICA DE RUTA</span><span className="text-xs text-slate-200 font-mono block mt-1">{caminoCalculado}</span></div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">TIEMPO ESTIMADO</span><span className="text-xs text-amber-400 font-mono block mt-1 font-bold">⏱️ {tiempoEstimado}</span></div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60"><span className="block text-[10px] font-bold text-slate-500 uppercase">DISTANCIA TOTAL</span><span className="text-xs text-blue-400 font-mono block mt-1 font-bold">📏 {costoRuta}</span></div>
        </div>

        {/* ENLACES RÁPIDOS DE RUTA */}
        {rutaActiva.length > 0 && !mostrarPanelOpciones && (
          <div className="bg-slate-900 border border-blue-500/20 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">🗺️ Asistencia de Navegación Directa:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${coordenadasActuales.lat},${coordenadasActuales.lng}&destination=${queryDestinoActual || encodeURIComponent(rutaActiva[1])}&travelmode=driving`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-slate-950 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/40 p-3 rounded-xl transition text-left cursor-pointer group"
              >
                <div>
                  <span className="block text-xs font-bold text-slate-200 group-hover:text-blue-400">Abrir en App de Navegación</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Indicaciones guiadas por voz paso a paso</span>
                </div>
                <span className="text-sm">🚀</span>
              </a>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                <span className="block text-xs font-bold text-slate-300">Sugerencia Local</span>
                <span className="block text-[10px] text-emerald-400 mt-0.5">🟢 Evitar congestión de transporte en horas punta de {regionActual}.</span>
              </div>
            </div>
          </div>
        )}

        {/* CONTROLES */}
        <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-xs text-emerald-400 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Región Geográfica: {regionActual}, Perú
          </span>
          <button onClick={localizarMiPosicion} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-semibold transition">📍 Sincronizar GPS</button>
        </div>

        {/* MAPA */}
        <div className="w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 min-h-[440px] z-20">
          {urlMapa ? (
            <iframe src={urlMapa} className="w-full h-full border-0 absolute inset-0 z-20" allowFullScreen={true} loading="lazy"></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Sincronizando visor satelital...</div>
          )}
        </div>

        {/* ALERTAS */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ALERTAR INCIDENTES DE TRÁNSITO</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => handleCreateAlerta('Accidente')} disabled={cargandoAlerta} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-3 px-4 rounded-xl transition">🚨 Accidente</button>
            <button onClick={() => handleCreateAlerta('Tráfico')} disabled={cargandoAlerta} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold py-3 px-4 rounded-xl transition">🚗 Tráfico</button>
            <button onClick={() => handleCreateAlerta('Operativo')} disabled={cargandoAlerta} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold py-3 px-4 rounded-xl transition">👮 Operativo</button>
            <button onClick={() => handleCreateAlerta('Vía Cerrada')} disabled={cargandoAlerta} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold py-3 px-4 rounded-xl transition">🚧 Vía Cerrada</button>
          </div>
        </div>
      </main>
    </div>
  );
}
