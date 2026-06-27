'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
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

export default function MapaPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [reportes, setReportes] = useState<AlertaTrafico[]>([]);
  const [cargandoAlerta, setCargandoAlerta] = useState(false);
  const [busqueda, setBusqueda] = useState('universida continental');
  
  // Coordenadas GPS del usuario o por defecto
  const [gpsCoords, setGpsCoords] = useState({ lat: -12.0487, lng: -75.2280 });
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    // 1. Cargar usuario del localStorage
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    } else {
      // Mock de usuario basado en tu imagen si no hay sesión para pruebas
      setUsuario({ nombre: 'Admin', email: 'admin@mapflash.com', rol: 'admin' });
    }
    
    obtenerReportesEnVivo();

    // 2. Inicializar Mapa Dinámico con Leaflet (Carga del lado del cliente)
    if (typeof window !== 'undefined' && mapRef.current && !leafletMap.current) {
      import('leaflet').then((L) => {
        // Fix de iconos por defecto de Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Crear mapa centrado en Huancayo según tu diseño
        leafletMap.current = L.map(mapRef.current).setView([-12.055, -75.215], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap.current);

        // Marcador de Origen (Lope de Vega)
        const origenMarker = L.marker([-12.0560, -75.2230]).addTo(leafletMap.current)
          .bindPopup('<b>Lope de Vega 164</b><br>Huancayo 12006').openPopup();

        // Marcador de Destino (Universidad Continental)
        const destinoMarker = L.marker([-12.0528, -75.2032]).addTo(leafletMap.current)
          .bindPopup('<b>Universidad Continental</b><br>Campus Huancayo');

        // Línea simulada del Camino Óptimo calculado con Dijkstra (Azul Eléctrico)
        const rutaDijkstra = [
          [-12.0560, -75.2230],
          [-12.0545, -75.2200],
          [-12.0515, -75.2160],
          [-12.0535, -75.2120],
          [-12.0505, -75.2080],
          [-12.0528, -75.2032]
        ];

        L.polyline(rutaDijkstra, { color: '#3b82f6', weight: 6, opacity: 0.9 }).addTo(leafletMap.current);
      });
    }
  }, []);

  const obtenerReportesEnVivo = async () => {
    try {
      const { data, error } = await supabase
        .from('alertas_trafico')
        .select('*')
        .eq('estado', 'activo');

      if (data) setReportes(data);
      if (error) console.error("Error cargando alertas:", error.message);
    } catch (e) {
      console.log("Supabase offline o sin configurar. Usando mocks.");
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
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
          setGpsCoords({ lat, lng });
          await guardarAlerta(tipo, lat, lng);
        },
        async () => {
          await guardarAlerta(tipo, -12.06513, -75.20486);
        }
      );
    } else {
      await guardarAlerta(tipo, -12.06513, -75.20486);
    }
  };

  const guardarAlerta = async (tipo: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('alertas_trafico')
        .insert([{ tipo_reporte: tipo, latitud: lat, longitud: lng, estado: 'activo' }]);
      
      if (!error) obtenerReportesEnVivo();
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoAlerta(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-800 font-sans select-none">
      {/* CSS Requerido para Leaflet Map */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Header Superior */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <span className="text-blue-600 font-bold text-lg flex items-center">
            <span className="mr-1">←</span> MapFlash
          </span>
          <h1 className="text-gray-700 font-medium text-sm border-l pl-4 border-gray-300">
            Mapa Nacional del Perú
          </h1>
        </div>
        
        {/* Perfil del Usuario de la Esquina Superior Derecha */}
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <span className="flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
            📦 Entrega
          </span>
          <div className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">
              ?
            </span>
            <span className="font-semibold text-gray-700">Admin</span>
            <span className="text-gray-400 cursor-pointer hover:text-red-500" onClick={handleCerrarSesion}>➔</span>
          </div>
        </div>
      </header>

      {/* Barra de estado GPS y Ubicación */}
      <div className="bg-white px-6 py-2 flex justify-between items-center text-xs text-gray-600 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          <span>GPS activo: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span>
        </div>
        <button className="flex items-center space-x-1 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
          <span>📍</span>
          <span>Mi Ubicación</span>
        </button>
      </div>

      {/* Buscador Principal */}
      <div className="p-4 bg-white space-y-3 shadow-inner">
        <div className="flex items-center border-2 border-blue-500 rounded-md overflow-hidden bg-white">
          <span className="px-3 text-red-500 text-lg">●</span>
          <input
            type="text"
            className="w-full py-2 px-1 text-sm outline-none font-medium text-gray-700"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar universidad o destino..."
          />
          <button className="bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700 transition">
            Buscar
          </button>
        </div>

        {/* Botón Verde Elegante de Dijkstra de la Imagen */}
        <button className="w-full bg-emerald-500 text-white font-semibold py-2.5 rounded-md text-sm hover:bg-emerald-600 transition shadow-sm flex items-center justify-center space-x-1">
          <span>Calcular ruta óptima con Dijkstra →</span>
        </button>
      </div>

      {/* Contenedor del Mapa Interactivo de Leaflet */}
      <div className="flex-1 relative min-h-[380px] bg-gray-200 border-b border-gray-300">
        <div ref={mapRef} className="w-full h-full z-10" />

        {/* Cuadro Flotante informativo del camino (Imitando el estilo de tu UI) */}
        <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-md shadow-md border border-gray-200 max-w-xs text-xs space-y-1">
          <div className="font-semibold text-gray-800 flex items-center">
            <span className="text-gray-400 mr-1.5">○</span> Lope de Vega 164, Huancayo 12006
          </div>
          <div className="font-semibold text-blue-600 flex items-center border-t pt-1 mt-1">
            <span className="text-red-500 mr-1.5">📍</span> Universidad Continental - Campus Huan...
          </div>
          <span className="text-blue-500 text-[11px] block cursor-pointer hover:underline">Más opciones</span>
        </div>
      </div>

      {/* Alertas de Tránsito Inferiores */}
      <footer className="bg-white p-4 border-t border-gray-200">
        <span className="text-xs text-gray-500 block mb-3 font-medium">Alertas de tránsito en tu posición actual</span>
        
        <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-gray-600">
          <button onClick={() => handleCrearAlerta('Accidente')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-red-50 transition">
            <span className="text-xl mb-1 text-red-500">🚨</span>
            <span>Accidente</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Tráfico')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-yellow-50 transition">
            <span className="text-xl mb-1 text-yellow-500">🚗</span>
            <span>Tráfico</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Operativo')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-blue-50 transition">
            <span className="text-xl mb-1 text-blue-500">👮</span>
            <span>Operativo</span>
          </button>
          
          <button onClick={() => handleCrearAlerta('Vía Cerrada')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-orange-50 transition">
            <span className="text-xl mb-1 text-orange-500">🚧</span>
            <span>Vía cerrada</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
