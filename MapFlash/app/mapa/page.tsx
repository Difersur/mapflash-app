'use client';
// Mapa interactivo con GPS real del dispositivo
import { useState } from 'react';
import Link from 'next/link';

const LUGARES = [
  {n:'Plaza Mayor de Lima',z:'Centro Historico'},
  {n:'Miraflores',z:'Av. Larco'},
  {n:'San Isidro',z:'Av. El Rosario'},
  {n:'San Juan de Lurigancho',z:'Av. Wiesse'},
  {n:'Los Olivos',z:'Av. Universitaria'},
  {n:'Callao',z:'Av. Saenz Pena'},
  {n:'Barranco',z:'Av. Grau'},
  {n:'Surco',z:'Av. Primavera'},
  {n:'La Molina',z:'Av. La Molina'},
  {n:'Ate',z:'Av. Nicolas Ayllon'},
];

// Tipos de reporte disponibles en el mapa
const REPORTES = [
  {id:'accidente', emoji:'🚨', label:'Accidente'},
  {id:'trafico',   emoji:'🐢', label:'Trafico'},
  {id:'operativo', emoji:'👮', label:'Operativo'},
  {id:'cierre',    emoji:'🚧', label:'Via cerrada'},
];

export default function Mapa() {
  const [gps,  setGps]   = useState('GPS inactivo — toca 📍');
  const [coord,setCoord] = useState<{lat:number;lng:number}|null>(null);
  const [dest, setDest]  = useState('');
  const [sugs, setSugs]  = useState<typeof LUGARES>([]);
  const [reporteActivo, setReporte] = useState('');
  const [reportes, setReportes] = useState<{tipo:string;emoji:string;tiempo:string}[]>([]);

  function activarGPS(){
    if(!navigator.geolocation){ setGps('Tu navegador no soporta GPS'); return; }
    setGps('Buscando senial GPS...');
    navigator.geolocation.getCurrentPosition(
      p=>{ setCoord({lat:p.coords.latitude,lng:p.coords.longitude});
           setGps(`GPS activo · ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`); },
      ()=>{ setGps('No se pudo obtener ubicacion — revisa los permisos'); },
      {enableHighAccuracy:true,timeout:8000}
    );
  }

  function buscar(v:string){
    setDest(v);
    setSugs(v.length<2?[]:LUGARES.filter(l=>l.n.toLowerCase().includes(v.toLowerCase())||l.z.toLowerCase().includes(v.toLowerCase())).slice(0,5));
  }

  function reportar(tipo:string, emoji:string){
    setReportes(r=>[{tipo, emoji, tiempo:'ahora'},...r.slice(0,4)]);
    setReporte('');
    alert(`✅ Reporte "${tipo}" enviado. +20 MapCoins acreditados.`);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-medium text-gray-700">
          ← Map<span className="text-blue-500">Flash</span>
        </Link>
        <span className="flex-1 text-sm font-medium text-gray-900">Mapa en tiempo real</span>
        <Link href="/entrega" className="text-xs text-blue-500">📦 Entrega</Link>
      </header>

      {/* Barra de busqueda con GPS */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"/>
          <span className="text-xs text-gray-500 flex-1 truncate">{gps}</span>
          <button onClick={activarGPS}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex-shrink-0">
            📍 Activar GPS
          </button>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"/>
            <input value={dest} onChange={e=>buscar(e.target.value)}
              placeholder="¿A donde vas? Escribe un distrito..."
              className="flex-1 h-9 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          {sugs.length>0&&(
            <div className="absolute z-10 left-5 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
              {sugs.map(s=>(
                <button key={s.n} onClick={()=>{setDest(s.n);setSugs([]);}}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                  <div className="font-medium text-gray-800">{s.n}</div>
                  <div className="text-xs text-gray-400">{s.z}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {coord&&dest&&(
          <button className="w-full h-9 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600">
            Calcular ruta optima con Dijkstra →
          </button>
        )}
      </div>

      {/* Area del mapa */}
      <div className="flex-1 bg-blue-50 flex flex-col items-center justify-center relative min-h-64 p-6">
        <div className="text-5xl mb-3">🗺️</div>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          {coord
            ? `Tu ubicacion: ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}${dest?` → ${dest}`:''}`
            : 'Activa el GPS para ver tu ubicacion en el mapa'}
        </p>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Google Maps JS SDK se integra aqui con tu API key
        </p>

        {/* Reportes activos */}
        {reportes.length>0&&(
          <div className="absolute top-3 left-3 right-3 flex gap-2 flex-wrap">
            {reportes.map((r,i)=>(
              <span key={i} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                {r.emoji} {r.tipo} · {r.tiempo}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Panel de reportes */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Reportar en esta zona</div>
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
