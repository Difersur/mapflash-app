'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Usuario {
  nombre: string;
  email: string;
  rol: string;
  avatar_url?: string;
}

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const sesion = localStorage.getItem('usuario_mapflash');
    if (sesion) {
      const datos = JSON.parse(sesion);
      setUsuario(datos);
      if (datos.avatar_url) setInputUrl(datos.avatar_url);
    }
  }, []);

  const handleActualizarFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setGuardando(true);

    try {
      // 1. Actualizamos en Supabase usando el correo como identificador
      const { error } = await supabase
        .from('usuarios')
        .update({ avatar_url: inputUrl })
        .eq('email', usuario.email);

      if (error) throw error;

      // 2. Actualizamos el LocalStorage para que el Mapa cambie al instante
      const usuarioActualizado = { ...usuario, avatar_url: inputUrl };
      localStorage.setItem('usuario_mapflash', JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);

      alert("📸 ¡Fotografía de perfil actualizada con éxito!");
    } catch (error: any) {
      alert("Error al actualizar: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-500 mb-4">Debes iniciar sesión para ver tu perfil.</p>
        <Link href="/" className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Ir al Login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Banner Superior */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Mi Perfil</h1>
            <p className="text-xs text-slate-400">MapFlash ID verificado</p>
          </div>
          <Link href="/mapa" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition">
            ← Volver al Mapa
          </Link>
        </div>

        {/* Cuerpo */}
        <div className="p-6 flex flex-col items-center text-center">
          
          {/* Avatar Circular Dinámico */}
          <div className="w-24 h-24 rounded-full bg-blue-600 text-white text-3xl font-bold flex items-center justify-center border-4 border-white shadow-md overflow-hidden mb-4">
            {usuario.avatar_url ? (
              <img src={usuario.avatar_url} alt={usuario.nombre} className="w-full h-full object-cover" />
            ) : (
              usuario.nombre.charAt(0).toUpperCase()
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-800">{usuario.nombre}</h2>
          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full uppercase mt-1 tracking-wider">
            {usuario.rol}
          </span>

          <div className="w-full border-t border-slate-100 my-6 pt-4 text-left flex flex-col gap-2">
            <p className="text-xs text-slate-400 font-medium">Correo Electrónico: <span className="text-slate-700 block font-normal">{usuario.email}</span></p>
          </div>

          {/* Formulario para cambiar/añadir foto por URL */}
          <form onSubmit={handleActualizarFoto} className="w-full text-left border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-500 mb-1">Enlace de tu fotografía (URL):</label>
            <input 
              type="url" 
              placeholder="https://ejemplo.com/tu-foto.jpg"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 mb-3"
            />
            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold p-2.5 rounded-xl transition"
            >
              {guardando ? 'Guardando cambios...' : 'Actualizar Fotografía'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
