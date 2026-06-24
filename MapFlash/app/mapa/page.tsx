'use client';
// Mapa interactivo dinámico nacional usando Google Maps Embed API con Perfil
import { useState, useEffect } from 'react';
import Link from 'next/link';

const REPORTES = [
  {id:'accidente', emoji:'🚨', label:'Accidente'},
  {id:'trafico',   emoji:'🐢', label:'Trafico'},
  {id:'operativo', emoji:'👮', label:'Operativo'},
  {id:'cierre',    emoji:'🚧', label:'Via cerrada'},
];

// Mapeo de emojis según el rol del usuario
const EMOJIS_ROLES: { [key: string]: string } = {
  usuario: '🧭',
  conductor: '🚗',
  mapeador: '🗺️',
  empresa: '🏢',
  admin: '👑'
};

export default function Mapa() {
  const [gps,  setGps]   = useState('GPS inactivo — toca 📍');
  const [coord,setCoord] = useState<{lat:number;lng:number}|null>(null);
  const [dest, setDest]  = useState('');
  const [lugarActual, setLugarActual] = useState('Peru');
  const [reportes, setReportes] = useState<{tipo:string;emoji:string;tiempo:string}[]>([]);
  
  // Estado para almacenar el usuario que inició sesión
  const [usuario, setUsuario] = useState<{ nombre: string; email: string; rol: string } | null>(null);

  // Efecto para leer la sesión guardada del localStorage al cargar la página
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      try {
        setUsuario(JSON.parse(sesionGuardada));
      } catch (e) {
        console.error("Error al leer la sesión", e);
      }
    }
  }, []);

  // Función para cerrar sesión limpiamente
  const cerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    setUsuario(null);
    window.location.href = '/';
  };

  // 100% CORREGIDO: Lee de forma exacta la variable de Vercel
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function activarGPS(){
    if(!navigator.geolocation){ setGps('Tu navegador no soporta GPS'); return; }
    setGps('Buscando señal GPS...');
    navigator.geolocation.getCurrentPosition(
      p=>{ 
        setCoord({lat:p.coords.latitude,lng:p.coords.longitude});
        setGps(`GPS activo · ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`);
        setLugarActual(`${p.coords.latitude},${p.coords.longitude}`);
      },
      ()=>{ setGps('No se pudo obtener ubicación — revisa los permisos'); },
      {enableHighAccuracy:true,timeout:8000}
    );
  }

  function ejecutarBusqueda(e: React.FormEvent) {
    e.preventDefault();
    if (dest.trim().length > 0) {
      setLugarActual(dest);
    }
  }

  function reportar(tipo:string, emoji:string){
    setReportes(r=>[{tipo, emoji, tiempo:'ahora'},...r.slice(0,4)]);
    alert(`✅ Reporte "${tipo}" enviado en esta zona. +20 MapCoins acreditados.`);
  }

  const querySegura = encodeURIComponent(lugarActual);
  
  const googleMapsUrl = apiKey 
    ? coord 
      ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${coord.lat},${coord.lng}&destination=${querySegura}&zoom=14`
      : `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${querySegura}&zoom=14`
    : '';

  // Obtener la inicial del nombre para el avatar por defecto
  const inicialNombre = usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';
  const emojiRol = usuario?.rol ? EMOJIS_ROLES[usuario.rol] || '👤' : '👤';

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
            ← Map<span className="text-blue-500">Flash</span>
          </Link>
          <span className="text-sm font-bold text-gray-900 border-l border-gray-200 pl-3">
            Mapa Nacional del Perú
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/entrega" className="text-xs text-blue-500 font-medium hover:underline">
            📦 Entrega
          </Link>

          {/* RECUADRO DE PERFIL INTEGRADO DENTRO DEL HEADER */}
          {usuario ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl p-1.5 pr-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-inner relative">
                {inicialNombre}
                <span className="absolute -bottom-1 -right-1 text-xs">{emojiRol}</span>
              </div>
              <div className="flex flex-col max-w-[120px]">
                <span className="text-xs font-semibold text-gray-800 truncate">{usuario.nombre}</span>
                <span className="text-[10px] text-gray-400 font-medium capitalize">{usuario.rol}</span>
              </div>
              <button 
                onClick={cerrarSesion}
                title="Cerrar sesión"
                className="ml-1 text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50"
              >
                ➔
              </button>
            </div>
          ) : (
            <Link href="/" className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </header>

      {/* Controladores del Mapa */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"/>
          <span className="text-xs text-gray-500 flex-1 truncate">{gps}</span>
          <button onClick={activarGPS}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex-shrink-0">
            📍 Mi Ubicación
          </button>
        </div>

        <form onSubmit={ejecutarBusqueda} className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 self-center flex-shrink-0"/>
          <input 
            value={dest} 
            onChange={e=>setDest(e.target.value)}
            placeholder="Busca un lugar (Ej: Huancayo, Lima, Cusco...)"
            className="flex-1 h-9 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="h-9 px-4 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600">
            Buscar
          </button>
        </form>

        {dest && (
          <button onClick={() => setLugarActual(`${dest} Peru`)} className="w-full h-9 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 mt-1">
            Calcular ruta óptima con Dijkstra →
          </button>
        )}
      </div>

      {/* Visor de Google Maps */}
      <div className="flex-1 relative min-h-64 bg-gray-100">
        {googleMapsUrl ? (
          <iframe
            title="Google Map Real"
            width="100%"
            height="100%"
            className="absolute inset-0 border-0 w-full h-full"
            loading="lazy"
            allowFullScreen
            src={googleMapsUrl}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-red-500 font-medium">Cargando mapa interactivo...</p>
          </div>
        )}

        {/* Marcadores de Incidentes */}
        {reportes.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex gap-2 flex-wrap z-10">
            {reportes.map((r,i)=>(
              <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 shadow-md font-medium">
                {r.emoji} {r.tipo} · {r.tiempo}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Panel inferior de alertas */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Alertar alertas de tránsito en tu posición actual</div>
        <div className="grid grid-cols-4 gap-2">
          {REPORTES.map(r=>(
            <button key={r.id} onClick={()=>reportar(r.label,r.emoji)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-center">
              <span className="text-xl">{r.emoji}</span>
              <span className="text-[10px] text-gray-600">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
