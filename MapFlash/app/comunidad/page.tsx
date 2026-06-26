'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Mensaje {
  id: number;
  nombre_usuario: string;
  mensaje: string;
  creado_at: string;
}

export default function Comunidad() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [nombreFalso, setNombreFalso] = useState('');
  const [cargando, setCargando] = useState(false);

  // 1. Leer los mensajes de Supabase al cargar la pagina
  useEffect(() => {
    obtenerMensajes();
  }, []);

  const obtenerMensajes = async () => {
    const { data, error } = await supabase
      .from('comunidad_mensajes')
      .select('*')
      .order('creado_at', { ascending: true });
    
    if (data) setMensajes(data);
    if (error) console.error("Error al cargar comunidad:", error.message);
  };

  // 2. Enviar un nuevo mensaje a la base de datos
  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    setCargando(true);

    // Intentamos recuperar el nombre del usuario logueado en el Home
    let nombreAutor = "Anonimo";
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      const usuario = JSON.parse(sesionGuardada);
      if (usuario.nombre) nombreAutor = usuario.nombre;
    } else if (nombreFalso.trim()) {
      nombreAutor = nombreFalso;
    }

    try {
      const { error } = await supabase
        .from('comunidad_mensajes')
        .insert([{ nombre_usuario: nombreAutor, mensaje: nuevoMensaje }]);

      if (error) throw error;

      setNuevoMensaje('');
      obtenerMensajes(); // Recargamos la lista
    } catch (error: any) {
      alert("No se pudo enviar el comentario: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-blue-400">💬 Comunidad MapFlash</h1>
            <p className="text-xs text-slate-400">Interactua, reporta el trafico y conversa en vivo</p>
          </div>
          <Link href="/" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition">
            ← Volver al Inicio
          </Link>
        </div>

        {/* Zona de Comentarios */}
        <div className="p-6 h-[400px] overflow-y-auto flex flex-col gap-3 bg-slate-50/50">
          {mensajes.length === 0 ? (
            <p className="text-center text-slate-400 text-sm my-auto">Aun no hay comentarios. ¡Se el primero en escribir!</p>
          ) : (
            mensajes.map((m) => (
              <div key={m.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm max-w-[85%] self-start">
                <span className="block text-xs font-bold text-blue-600 mb-0.5">{m.nombre_usuario}</span>
                <p className="text-sm text-gray-800 leading-relaxed">{m.mensaje}</p>
                <span className="block text-[9px] text-slate-400 text-right mt-1">
                  {new Date(m.creado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Formulario de Entrada */}
        <form onSubmit={handleEnviar} className="p-4 border-t border-slate-100 bg-white flex flex-col gap-2">
          {!localStorage.getItem('usuario_mapflash') && (
            <input
              type="text"
              placeholder="Tu Apodo / Nombre (Opcional si no estas logueado)"
              value={nombreFalso}
              onChange={(e) => setNombreFalso(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe un comentario..."
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              required
              className="flex-1 text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 rounded-xl transition disabled:bg-gray-300"
            >
              {cargando ? '...' : 'Enviar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
