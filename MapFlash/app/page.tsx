'use client';
// Pagina principal MapFlash — login + registro 4 roles conectado a Supabase
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente de Supabase usando tus variables de entorno de Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ROLES = [
  { id: 'usuario',    emoji: '🧭', nombre: 'Usuario',   desc: 'Busco rutas y pido servicios' },
  { id: 'conductor', emoji: '🚗', nombre: 'Conductor', desc: 'Ofrezco entregas y transporte' },
  { id: 'mapeador',  emoji: '🗺️', nombre: 'Mapeador',  desc: 'Trazo rutas en mi zona' },
  { id: 'empresa',   emoji: '🏢', nombre: 'Empresa',   desc: 'Gestiono una flota de envios' },
];

export default function Home() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [rol, setRol]   = useState('');
  
  // Estados para login convencional
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estados para capturar los datos del formulario de registro
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  // Función para manejar el inicio de sesión convencional
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !loginPassword) return alert("Por favor ingresa tus credenciales.");
    setCargando(true);

    try {
      // Buscamos en la base de datos por email o whatsapp alternativamente
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .or(`email.eq.${loginInput},whatsapp.eq.${loginInput}`)
        .eq('password', loginPassword)
        .single();

      if (error || !data) {
        throw new Error("Credenciales incorrectas o el usuario no existe.");
      }

      // Guardamos la sesión del usuario encontrado en el navegador
      localStorage.setItem('usuario_mapflash', JSON.stringify({ 
        nombre: data.nombre, 
        email: data.email, 
        rol: data.rol 
      }));

      window.location.href = '/mapa';
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para manejar el registro e insertar los datos en Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rol) return alert("Por favor, selecciona un rol primero.");
    if (!nombre || !whatsapp || !email || !password) return alert("Por favor, completa todos los campos.");

    setCargando(true);

    try {
      // Insertamos el nuevo usuario en tu tabla pública de Supabase
      const { error } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre,
            whatsapp,
            email,
            password, // Nota: En entornos de producción real se recomienda encriptar
            rol,
            comunidad: 'Ninguna'
          }
        ]);

      if (error) throw error;

      // 🔥 AQUÍ QUEDÓ INCORPORADO EL GUARDADO DE LA SESIÓN EN EL NAVEGADOR:
      localStorage.setItem('usuario_mapflash', JSON.stringify({ nombre, email, rol }));

      // Alerta visual confirmando el éxito de la operación
      alert("🎉 ¡Tu cuenta fue creada con éxito! Bienvenido a MapFlash.");
      
      // Redireccionamos de manera automática al mapa principal
      window.location.href = '/mapa';

    } catch (error: any) {
      alert("Error al registrar tu cuenta: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">

      {/* ── PANEL IZQUIERDO ── */}
      <div className="flex-1 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
        <div className="z-10">
          <h1 className="text-3xl font-black tracking-tight text-blue-400">MapFlash</h1>
          <p className="text-sm text-slate-400 mt-1">Plataforma de rutas y servicios · Peru</p>
        </div>
        <div className="my-auto z-10 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            Navega, entrega y conecta con conductores verificados
          </h2>
          <p className="text-slate-300 mt-4 text-sm leading-relaxed">
            Rutas optimizadas con Dijkstra. Conductores con DNI y placa verificados.
            Reparto, paqueteria, delivery de comida y mas.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[
              ['124', 'Conductores activos'],
              ['312', 'Rutas mapeadas'],
              ['18', 'Distritos'],
              ['4.8★', 'Calificacion media']
            ].map(([v, l]) => (
              <div key={l} className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="block text-xl font-bold text-blue-400">{v}</span>
                <span className="text-xs text-slate-400">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500 z-10">
          © {new Date().getFullYear()} MapFlash · mapflash.app
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="flex-1 bg-white p-8 flex flex-col justify-center items-center relative">
        {/* Navegacion rapida */}
        <div className="absolute top-5 right-6 flex gap-3 text-xs font-medium">
          <Link href="/mapa"      className="text-blue-600 hover:underline">🗺️ Mapa</Link>
          <Link href="/tarifas"   className="text-blue-600 hover:underline">💰 Tarifas</Link>
          <Link href="/comunidad" className="text-blue-600 hover:underline">💬 Comunidad</Link>
          <Link href="/entrega"   className="text-blue-600 hover:underline">📦 Entrega</Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm rounded-lg transition ${tab === t ? 'bg-white shadow font-semibold text-gray-900' : 'text-gray-500'}`}>
                {t === 'login' ? 'Ingresar' : 'Registrarse'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Bienvenido de vuelta 👋</h3>
                <p className="text-sm text-slate-500 mt-1">Ingresa con tu telefono o correo</p>
              </div>
              <input 
                type="text" 
                placeholder="987 654 321 o tu@correo.com"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
              />
              <input 
                type="password" 
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="text-right">
                <a href="#" className="text-xs text-blue-600 hover:underline">¿Olvidaste tu contrasena?</a>
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-blue-600 text-white p-3 rounded-lg text-center font-semibold text-sm hover:bg-blue-700 transition block"
              >
                {cargando ? 'Ingresando...' : 'Ingresar a MapFlash →'}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200"/>
                <span className="text-xs text-gray-400">o continua con</span>
                <div className="flex-1 h-px bg-gray-200"/>
              </div>
              <button type="button" className="w-full border border-gray-200 rounded-lg p-3 text-sm flex items-center justify-center gap-2 hover:bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Crear cuenta en MapFlash</h3>
              <p className="text-sm text-slate-500 mb-4">¿Como quieres usar la plataforma?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {ROLES.map(r => (
                  <button type="button" key={r.id} onClick={() => setRol(r.id)}
                    className={`text-left rounded-xl border p-3 transition ${rol === r.id ? 'border-2 border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="text-xl mb-1">{r.emoji}</div>
                    <div className="text-xs font-semibold text-gray-900">{r.nombre}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-snug">{r.desc}</div>
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Nombre completo" required value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 mb-2"/>
              <input type="text" placeholder="WhatsApp (987 654 321)" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 mb-2"/>
              <input type="email" placeholder="Correo electronico" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 mb-2"/>
              <input type="password" placeholder="Contrasena (min. 8 caracteres)" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 mb-4"/>
              
              <button type="submit" disabled={cargando || !rol}
                className={`w-full p-3 rounded-lg text-center font-semibold text-sm block transition ${rol && !cargando ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {cargando ? 'Creando tu cuenta...' : 'Crear mi cuenta →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
