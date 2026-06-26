'use client';
import { useState, useEffect, useRef } from 'react';
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

  // Estados para el control de la cámara web
  const [camaraActiva, setCamaraActiva] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      const datosUser = JSON.parse(sesionGuardada);
      setUsuario(datosUser);
      if (datosUser.avatar_url) {
        setVistaPrevia(datosUser.avatar_url);
      }
    }
    
    return () => {
      apagarCamara();
    };
  }, []);

  // Encender la cámara web o del celular
  const encenderCamara = async () => {
    setArchivo(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      setCamaraActiva(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("No se pudo acceder a la cámara. Asegúrate de otorgar los permisos en el navegador.");
    }
  };

  const apagarCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCamaraActiva(false);
  };

  // Capturar la foto instantánea desde el video
  const capturarFoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const archivoCapturado = new File([blob], "foto-camara.jpg", { type: "image/jpeg" });
          setArchivo(archivoCapturado);
          setVistaPrevia(URL.createObjectURL(archivoCapturado));
          apagarCamara();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleCambiarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    apagarCamara();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArchivo(file);
      setVistaPrevia(URL.createObjectURL(file));
    }
  };

  const handleSubirFoto = async () => {
    if (!usuario || !archivo) {
      alert("Por favor, selecciona o toma una fotografía primero.");
      return;
    }

    setGuardando(true);

    try {
      const nombreArchivo = `${usuario.email}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(nombreArchivo, archivo, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(nombreArchivo);

      const urlPublicaFoto = urlData.publicUrl;

      const usuarioActualizado = { ...usuario, avatar_url: urlPublicaFoto };
      localStorage.setItem('usuario_mapflash', JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);

      alert("¡Tu foto de perfil se ha guardado con éxito! 📸🚀");
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar la imagen: " + error.message);
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

  // Normalizamos el rol pasándolo a minúsculas para evitar problemas de cruces
  const rolNormalizado = usuario.rol ? usuario.rol.toLowerCase() : '';

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

        {/* Contenido */}
        <div className="p-6 flex flex-col items-center">
          
          <div className="relative w-24 h-24 mb-4">
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
          
          {/* AQUÍ CORREGIMOS EL SINO DE MAYÚSCULAS: Soporta 'Entrega' y 'entrega' */}
          <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 mb-6">
            {rolNormalizado === 'entrega' ? '📦 Conductor' : '👤 Usuario'}
          </span>

          <div className="w-full space-y-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <p className="text-sm text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{usuario.email}</p>
            </div>

            {/* SECCIÓN MULTIMEDIA COMPLETA */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Actualizar Fotografía</label>
              
              {camaraActiva ? (
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-slate-300">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={capturarFoto}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-xl transition"
                    >
                      📸 Capturar Foto
                    </button>
                    <button
                      type="button"
                      onClick={apagarCamara}
                      className="bg-slate-300 hover:bg-slate-400 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={encenderCamara}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    📷 Usar Cámara en Vivo
                  </button>
                </div>
              )}

              <div className="text-center my-2 text-[11px] text-slate-400 font-medium">— O SUBIR ARCHIVO LOCAL —</div>

              <input 
                type="file" 
                accept="image/*"
                onChange={handleCambiarArchivo}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSubirFoto}
              disabled={guardando || !archivo}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm mt-2"
            >
              {guardando ? 'Guardando en la nube...' : 'Confirmar Nueva Fotografía'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
