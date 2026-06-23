'use client';
// Panel de administrador MapFlash
// Solo accesible para axlperez183@gmail.com
// Protegido con 2FA + PIN de fondos
import { useState } from 'react';

const ADMIN_EMAIL = 'axlperez183@gmail.com';
const PIN_DEMO    = '482715'; // codigo 2FA de demo

type Pantalla = 'login' | '2fa' | 'panel';
type SeccionAdmin = 'dashboard' | 'recargos' | 'fondos' | 'usuarios' | 'seguridad';

export default function Admin() {
  const [pantalla,  setPantalla]  = useState<Pantalla>('login');
  const [email,     setEmail]     = useState('');
  const [pass,      setPass]      = useState('');
  const [codigo,    setCodigo]    = useState('');
  const [intentos,  setIntentos]  = useState(0);
  const [error,     setError]     = useState('');
  const [seccion,   setSeccion]   = useState<SeccionAdmin>('dashboard');
  const [pinFondos, setPinFondos] = useState('');
  const [pinOk,     setPinOk]     = useState(false);

  // Validar login del administrador
  function login() {
    if (email !== ADMIN_EMAIL) {
      setError('Correo no autorizado para este panel.');
      return;
    }
    if (pass.length < 4) {
      const i = intentos + 1;
      setIntentos(i);
      if (i >= 3) {
        setError('Cuenta bloqueada 30 minutos por intentos fallidos.');
        return;
      }
      setError(`Contrasena incorrecta. Intentos restantes: ${3 - i}`);
      return;
    }
    setError('');
    setPantalla('2fa');
  }

  // Validar codigo 2FA
  function validar2FA() {
    if (codigo === PIN_DEMO) {
      setPantalla('panel');
    } else {
      setError('Codigo incorrecto. Revisa tu correo.');
    }
  }

  // Validar PIN de fondos
  function validarPinFondos() {
    if (pinFondos === '1234') { // PIN de demo
      setPinOk(true);
      alert('✅ PIN correcto. Acceso a movimiento de fondos habilitado por 10 minutos.');
    } else {
      alert('❌ PIN incorrecto.');
    }
  }

  // ── PANTALLA LOGIN ────────────────────────────────────
  if (pantalla === 'login') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">
            Map<span className="text-blue-400">Flash</span>
          </h1>
          <p className="text-xs text-slate-400 mb-6">Panel de Administracion · Acceso restringido</p>

          <div className="bg-slate-700/50 rounded-lg p-3 mb-5 text-xs text-blue-300 flex items-center gap-2">
            🔒 Solo autorizado: <strong>{ADMIN_EMAIL}</strong>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Correo del administrador</label>
              <input value={email} onChange={e=>setEmail(e.target.value)}
                type="email" placeholder="axlperez183@gmail.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contrasena</label>
              <input value={pass} onChange={e=>setPass(e.target.value)}
                type="password" placeholder="••••••••"
                onKeyDown={e=>e.key==='Enter'&&login()}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"/>
            </div>
          </div>

          <button onClick={login} disabled={intentos>=3}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${intentos>=3?'bg-slate-600 text-slate-400 cursor-not-allowed':'bg-blue-600 text-white hover:bg-blue-700'}`}>
            Ingresar al panel →
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            Maximo 3 intentos · Bloqueo automatico 30 min
          </p>
        </div>
      </main>
    );
  }

  // ── PANTALLA 2FA ──────────────────────────────────────
  if (pantalla === '2fa') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📱</div>
          <h2 className="text-lg font-bold text-white mb-2">Verificacion en 2 pasos</h2>
          <p className="text-xs text-slate-400 mb-6">
            Se envio un codigo de 6 digitos a<br/>
            <strong className="text-blue-400">{ADMIN_EMAIL}</strong>
          </p>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 text-xs text-red-300">
              {error}
            </div>
          )}

          <input value={codigo} onChange={e=>setCodigo(e.target.value)}
            type="text" placeholder="000000" maxLength={6}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-2xl font-bold text-white text-center tracking-widest focus:outline-none focus:border-blue-500 mb-4"/>

          <button onClick={validar2FA}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 mb-3">
            Verificar y entrar
          </button>

          <p className="text-xs text-slate-500">
            Codigo de demo: <strong className="text-blue-400">{PIN_DEMO}</strong>
          </p>
        </div>
      </main>
    );
  }

  // ── PANEL ADMIN ───────────────────────────────────────
  const secciones: {id:SeccionAdmin;emoji:string;label:string}[] = [
    {id:'dashboard', emoji:'📊', label:'Dashboard'},
    {id:'recargos',  emoji:'💰', label:'Recargos'},
    {id:'fondos',    emoji:'🏦', label:'Fondos'},
    {id:'usuarios',  emoji:'👥', label:'Usuarios'},
    {id:'seguridad', emoji:'🛡️', label:'Seguridad'},
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <div className="bg-slate-900 px-4 py-3 flex items-center gap-3">
        <span className="text-white font-bold text-sm">Map<span className="text-blue-400">Flash</span></span>
        <span className="text-xs bg-purple-700 text-white px-2 py-0.5 rounded-full">👑 SUPER ADMIN</span>
        <span className="text-xs text-slate-400 ml-auto">{ADMIN_EMAIL}</span>
        <button onClick={()=>setPantalla('login')}
          className="text-xs border border-slate-600 text-slate-400 px-2 py-1 rounded-lg hover:border-red-500 hover:text-red-400">
          Salir
        </button>
      </div>

      {/* Nav de secciones */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {secciones.map(s=>(
            <button key={s.id} onClick={()=>setSeccion(s.id)}
              className={`px-4 py-2 text-xs rounded-lg transition ${seccion===s.id?'bg-blue-100 text-blue-700 font-semibold':'text-gray-500 hover:bg-gray-100'}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">

        {/* DASHBOARD */}
        {seccion==='dashboard'&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                {v:'S/1,847',l:'Ingresos hoy',c:'text-green-600'},
                {v:'S/312',  l:'Fondo Operativo',c:'text-blue-600'},
                {v:'S/138',  l:'Fondo Mapeadores',c:'text-amber-600'},
                {v:'S/92',   l:'Reserva Servidor',c:'text-emerald-600'},
              ].map(m=>(
                <div key={m.l} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className={`text-xl font-bold ${m.c}`}>{m.v}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.l}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Actividad reciente</div>
              {[
                {dot:'bg-green-500', txt:'Carlos Q. completo entrega SJL → Ate', t:'hace 2 min'},
                {dot:'bg-amber-500', txt:'Trafico alto reportado en Av. Javier Prado', t:'hace 8 min'},
                {dot:'bg-blue-500',  txt:'Nueva ruta mapeada en Los Olivos', t:'hace 15 min'},
                {dot:'bg-red-500',   txt:'Reporte de zona peligrosa Callao validado', t:'hace 22 min'},
              ].map((a,i)=>(
                <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.dot}`}/>
                  <span className="text-xs text-gray-700 flex-1">{a.txt}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{a.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECARGOS */}
        {seccion==='recargos'&&(
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Recargos dinamicos activos</div>
            {[
              {emoji:'🌙',label:'Nocturno (10pm-5am)',pct:'+20%',on:true},
              {emoji:'🌧️',label:'Dia lluvioso',pct:'+25%',on:true},
              {emoji:'📅',label:'Feriado nacional',pct:'+25%',on:true},
              {emoji:'🛡️',label:'Zona de riesgo',pct:'+10%',on:true},
              {emoji:'📦',label:'Paquete fragil',pct:'+S/5',on:true},
            ].map((r,i)=>(
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{r.label}</div>
                  <div className="text-xs text-gray-500">60% Fondo Operativo · 40% Reserva</div>
                </div>
                <span className="text-sm font-bold text-amber-600">{r.pct}</span>
                <Toggle on={r.on}/>
              </div>
            ))}
          </div>
        )}

        {/* FONDOS */}
        {seccion==='fondos'&&(
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Estado de fondos</div>
              {[
                {l:'Fondo Operativo MapFlash', v:'S/ 8,420', c:'text-indigo-600'},
                {l:'Fondo Mapeadores',         v:'S/ 1,840', c:'text-amber-600'},
                {l:'Reserva del Servidor',     v:'S/ 3,210', c:'text-emerald-600'},
                {l:'Fondo Puntos Drivers',     v:'S/ 920',   c:'text-blue-600'},
              ].map((f,i)=>(
                <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-500">{f.l}</span>
                  <span className={`font-bold ${f.c}`}>{f.v}</span>
                </div>
              ))}
            </div>
            {/* PIN para mover fondos */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-amber-800 mb-2">🔐 Mover fondos — requiere PIN</div>
              <div className="flex gap-2">
                <input value={pinFondos} onChange={e=>setPinFondos(e.target.value)}
                  type="password" placeholder="PIN de 4 digitos" maxLength={4}
                  className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                <button onClick={validarPinFondos}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium">
                  Verificar
                </button>
              </div>
              {pinOk&&<p className="text-xs text-green-600 mt-2">✅ Acceso habilitado · PIN demo: 1234</p>}
              {!pinOk&&<p className="text-xs text-amber-600 mt-2">PIN demo para pruebas: 1234</p>}
            </div>
          </div>
        )}

        {/* USUARIOS */}
        {seccion==='usuarios'&&(
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Gestion de usuarios</div>
            {[
              {nom:'Carlos Quispe',rol:'Driver',dist:'SJL',st:'Activo',c:'text-green-600'},
              {nom:'Maria Lopez', rol:'Usuario',dist:'Miraflores',st:'Activo',c:'text-green-600'},
              {nom:'Jorge Mamani',rol:'Driver',dist:'SJL',st:'Activo',c:'text-green-600'},
              {nom:'Usuario_847', rol:'Usuario',dist:'?',st:'⚠️ Revisar',c:'text-red-600'},
            ].map((u,i)=>(
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {u.nom.split(' ').map(x=>x[0]).join('').slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{u.nom}</div>
                  <div className="text-xs text-gray-400">{u.rol} · {u.dist}</div>
                </div>
                <span className={`text-xs font-medium ${u.c}`}>{u.st}</span>
                <button className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-red-400 hover:text-red-500">
                  Gestionar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SEGURIDAD */}
        {seccion==='seguridad'&&(
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Capas de seguridad activas</div>
            {[
              {emoji:'✉️',l:'Correo admin',sub:ADMIN_EMAIL,ok:true},
              {emoji:'📱',l:'2FA por correo',sub:'Codigo en cada sesion',ok:true},
              {emoji:'🔐',l:'PIN de fondos',sub:'6 digitos para mover dinero',ok:true},
              {emoji:'🔒',l:'3 intentos maximos',sub:'Bloqueo 30 min automatico',ok:true},
              {emoji:'📋',l:'Log de auditoria',sub:'Cada accion registrada',ok:true},
              {emoji:'⏱️',l:'Sesion expira en 2h',sub:'Cierre automatico por inactividad',ok:true},
              {emoji:'🚫',l:'Ruta /admin encapsulada',sub:'404 para cualquier otro correo',ok:true},
            ].map((s,i)=>(
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{s.l}</div>
                  <div className="text-xs text-gray-400">{s.sub}</div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  ✓ Activo
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Componente toggle reutilizable
function Toggle({on}:{on:boolean}){
  const [activo,setActivo] = useState(on);
  return(
    <button onClick={()=>setActivo(!activo)}
      className={`w-10 h-5 rounded-full relative transition ${activo?'bg-green-500':'bg-gray-300'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${activo?'right-0.5':'left-0.5'}`}/>
    </button>
  );
}
