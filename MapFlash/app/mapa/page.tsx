'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

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
  
  // 📍 CONFIGURADO: Coordenadas iniciales por defecto en Huancayo, Perú
  const [centroMapa, setCentroMapa] = useState({
    lat: -12.06513, 
    lng: -75.20486,
    zoom: 14 // Un zoom ideal para ver las calles principales de Huancayo
  });

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('usuario_mapflash');
    if (sesionGuardada) {
      setUsuario(JSON.parse(sesionGuardada));
    }
    obtenerReportesEnVivo();
  }, []);

  const obtenerReportesEnVivo = async () => {
    const { data, error } = await supabase
      .from('alertas_trafico')
      .select('*')
      .eq('estado', 'activo');

    if (data) setReportes(data);
    if (error) console.error("Error cargando alertas:", error.message);
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('usuario_mapflash');
    window.location.href = '/';
  };

  const getEmojiRol = (rol: string) => {
    const r = rol ? rol.toLowerCase() : '';
    if (r === 'admin') return '👑';
    if (r === 'entrega') return '📦';
    return '👤';
  };

  const handleCrearAlerta = async (tipo: string) => {
    if (!usuario) {
      alert("Debes iniciar sesión para reportar incidentes.");
      return;
    }
    setCargandoAlerta(true);
    
    // Si el GPS falla, la alerta se guardará en el centro de Huancayo
    let lat = -12.06513;
    let lng = -75.20486;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          
          // El mapa viaja automáticamente a donde el GPS diga que estás
          setCentroMapa({ lat, lng, zoom: 16 }); 
          
          await guardarAlerta(tipo, lat, lng);
        },
        async () => {
          await guardarAlerta(tipo, lat, lng);
        }
      );
    } else {
      await guardarAlerta(tipo, lat, lng);
    }
  };

  const guardarAlerta = async (tipo: string, lat: number, lng: number) => {
    try {
      const { error } =
