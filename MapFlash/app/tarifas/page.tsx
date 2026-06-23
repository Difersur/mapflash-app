'use client';
// Calculadora de tarifas definitiva MapFlash v2.3
// S/1.22/km hasta 10km | S/1.10/km mas de 10km | Driver recibe S/1.00/km fijo
import { useState } from 'react';
import Link from 'next/link';

const VEHICULOS = [
  { id:'moto',      emoji:'🏍️', nombre:'Moto',     base:3,  cap:'15 kg'    },
  { id:'auto',      emoji:'🚗', nombre:'Auto',     base:5,  cap:'80 kg'    },
  { id:'camioneta', emoji:'🚙', nombre:'Camioneta',base:6,  cap:'500 kg'   },
  { id:'furgon',    emoji:'🚐', nombre:'Furgon',   base:8,  cap:'1,000 kg' },
  { id:'camion',    emoji:'🚚', nombre:'Camion',   base:12, cap:'5,000 kg' },
];

const KM_CORTO  = 1.22; // precio por km hasta 10km
const KM_LARGO  = 1.10; // precio por km mas de 10km
const DRIVER_KM = 1.00; // driver recibe siempre esto

export default function Tarifas() {
  const [km,  setKm]  = useState(8);
  const [veh, setVeh] = useState('moto');
  const [modo,setModo]= useState<'usuario'|'driver'>('usuario');

  const v = VEHICULOS.find(x=>x.id===veh)!;

  // Formula de cobro con tramos de distancia
  const cobro = km<=10
    ? v.base + km*KM_CORTO
    : v.base + 10*KM_CORTO + (km-10)*KM_LARGO;

  const driverRecibe  = km * DRIVER_KM;
  const margen        = cobro - driverRecibe - v.base;
  const fondoOp       = margen * 0.50;
  const fondoMap      = margen * 0.31;
  const reserva       = margen * 0.19;
  const comisionPct   = (margen/cobro*100);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-medium text-gray-700">
          ← Map<span className="text-blue-500">Flash</span>
        </Link>
        <span className="flex-1 text-sm font-medium text-gray-900">Calculadora de tarifas</span>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['usuario','driver'] as const).map(m=>(
            <button key={m} onClick={()=>setModo(m)}
              className={`px-3 py-1 text-xs rounded-md transition ${modo===m?'bg-white shadow font-medium':'text-gray-500'}`}>
              {m==='usuario'?'Usuario':'Driver'}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5">
        {/* Selector de vehiculo */}
        <div className="text-xs font-medium text-gray-500 mb-2">Tipo de vehiculo</div>
        <div className="grid grid-cols-5 gap-1.5 mb-5">
          {VEHICULOS.map(x=>(
            <button key={x.id} onClick={()=>setVeh(x.id)}
              className={`flex flex-col items-center py-2 rounded-xl border text-xs transition ${veh===x.id?'border-2 border-blue-500 bg-blue-50':'border-gray-200'}`}>
              <span className="text-lg">{x.emoji}</span>
              <span className="text-[10px] mt-0.5 text-gray-600">{x.nombre}</span>
            </button>
          ))}
        </div>

        {/* Slider de distancia */}
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Distancia</span>
          <span className="font-medium text-gray-900">{km} km</span>
        </div>
        <input type="range" min={1} max={30} value={km} onChange={e=>setKm(Number(e.target.value))}
          className="w-full accent-blue-500 mb-5"/>

        {/* Resultado principal */}
        <div className={`rounded-2xl p-5 mb-4 ${modo==='usuario'?'bg-blue-600':'bg-slate-800'}`}>
          <div className="text-xs text-white/70 mb-1">
            {modo==='usuario'?'Pagas por este viaje':'Recibes por este viaje'}
          </div>
          <div className="text-4xl font-bold text-white mb-1">
            S/ {modo==='usuario'?cobro.toFixed(2):driverRecibe.toFixed(2)}
          </div>
          <div className="text-xs text-white/60">
            {modo==='usuario'
              ? `Comision visible: ${comisionPct.toFixed(1)}% — 7 puntos bajo Uber Eats`
              : `S/1.00/km fijo · ${km} km · pago diario a las 8pm via Yape`}
          </div>
        </div>

        {/* Desglose completo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-3">Desglose del viaje</div>

          <Fila l="Tarifa base" v={`S/ ${v.base.toFixed(2)}`}/>
          <Fila l={`${km} km x S/${km<=10?KM_CORTO:KM_LARGO}/km`} v={`S/ ${(cobro-v.base).toFixed(2)}`}/>
          <div className="border-t border-gray-100 my-2"/>
          <Fila l="Total cobrado al cliente" v={`S/ ${cobro.toFixed(2)}`} bold/>
          <Fila l="Driver recibe en efectivo" v={`S/ ${driverRecibe.toFixed(2)}`} color="text-green-600" bold/>
          <Fila l="+MapCoins por viaje" v="+100 MC" color="text-amber-500"/>
          <div className="border-t border-gray-100 my-2"/>
          <div className="text-[10px] font-medium text-gray-400 mb-1">Fondos que gestiona MapFlash</div>
          <Fila l="Fondo Operativo (50%)" v={`S/ ${fondoOp.toFixed(3)}`} color="text-indigo-500"/>
          <Fila l="Fondo Mapeadores (31%)" v={`S/ ${fondoMap.toFixed(3)}`} color="text-amber-500"/>
          <Fila l="Reserva Servidor (19%)" v={`S/ ${reserva.toFixed(3)}`} color="text-emerald-500"/>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Comision 18% · 7 puntos bajo Uber · 12 bajo Rappi · Capacidad {v.cap}
        </p>
      </div>
    </main>
  );
}

function Fila({l,v,bold,color}:{l:string;v:string;bold?:boolean;color?:string}){
  return(
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{l}</span>
      <span className={`${bold?'font-semibold':''} ${color||'text-gray-800'}`}>{v}</span>
    </div>
  );
}
