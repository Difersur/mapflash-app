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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string>('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      const datosUser = JSON.parse(sesionGuardada);
      setUsuario(datosUser);
      if (datosUser.avatar_url) {
        setVistaPrevia(datosUser.avatar_url);
      }
    }
  }, []);

  // Manejar la selección del archivo desde el dispositivo
  const handleCambiarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArchivo(file);
      // Crear una URL temporal para mostrar la foto en el círculo azul antes de subirla
      setVistaPrevia(URL.createObjectURL(file));
    }
  };

  const handleSubirFoto = async () => {
    if (!usuario || !archivo) {
      alert("Por favor, selecciona una imagen primero.");
      return;
    }

    setGuardando(true);

    try {
      // 1. Crear un nombre único para el archivo basado en el correo del usuario
      const nombreArchivo = `${usuario.email}-${Date.now()}.${archivo.name.split('.').pop()}`;

      // 2. Subir el archivo al bucket "avatars" de Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(nombreArchivo, archivo, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública del archivo subido
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(nombreArchivo);

      const urlPublicaFoto = urlData.publicUrl;

      // 4. Actualizar la sesión local en el navegador
      const usuarioActualizado = { ...usuario, avatar_url: urlPublicaFoto };
      localStorage.setItem('usuario_mapflash', JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);

      alert("¡Fotografía actualizada con éxito! 📸");
    } catch (error: any) {
      console.error(error);
      alert("Error al subir la imagen: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <p className="text-sm text-slate-500 mb-4">No has iniciado sesión de forma activa.</p>
          <Link href="/" className="bg-blue-600 text-white text-xs px-4 py-2 rounded-xl">Ir al Inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
        
        {/* Cabecera */}
        <div className="bg-slate-950 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Mi Perfil</h1>
            <p className="text-[11px] text-slate-400">MapFlash ID verificado</p>
          </div>
          <Link href="/mapa" className="text-[11px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition">
            ← Volver al Mapa
          </Link>
        </div>

        {/* Contenido de la Tarjeta */}
        <div className="p-6 flex flex-col items-center">
          
          {/* Círculo de Avatar Interactivo */}
          <div className="relative w-24 h-24 mb-4 group">
            {vistaPrevia ? (
              <img 
                src={vistaPrevia} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-full border-4 border-blue-500 shadow-sm"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-sm">
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-base font-bold text-slate-800">{usuario.nombre}</h2>
          <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 mb-6">
            {usuario.rol === 'entrega' ? '📦 Conductor' : '👤 Usuario'}
          </span>

          <div className="w-full space-y-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <p className="text-sm text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{usuario.email}</p>
            </div>

            {/* SELECCIÓN DE IMAGEN DESDE DISPOSITIVO */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Seleccionar nueva foto (JPG / PNG)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleCambiarArchivo}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSubirFoto}
              disabled={guardando || !archivo}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm mt-2"
            >
              {guardando ? 'Subiendo imagen...' : 'Guardar Cambios'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
