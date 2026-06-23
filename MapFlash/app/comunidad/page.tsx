'use client';

// Comunidad publica de drivers MapFlash
// Los drivers comparten experiencias, califican clientes y ven el ranking
// El foro es publico pero solo drivers verificados pueden publicar

import { useState } from 'react';
import Link from 'next/link';

// Tipos de post en el foro
type Post = {
  id: number;
  autor: string;
  avatar: string;
  vehiculo: string;
  distrito: string;
  tipo: 'experiencia' | 'consejo' | 'alerta' | 'logro';
  texto: string;
  likes: number;
  tiempo: string;
  calificacion?: number;
};

// Posts de ejemplo de la comunidad de drivers
const POSTS_INICIALES: Post[] = [
  {
    id: 1,
    autor: 'JorgeMamani_Driver',
    avatar: 'JM',
    vehiculo: '🏍️ Moto',
    distrito: 'SJL',
    tipo: 'alerta',
    texto: 'Ojo con la zona de Av. Wiesse con Jr. Las Flores despues de las 8pm. Cliente hoy me pidio que pare en esa zona y senti que algo raro. Active el SOS y ya. Tengan cuidado.',
    likes: 24,
    tiempo: 'hace 15 min',
  },
  {
    id: 2,
    autor: 'CarlosDriver_Lima',
    avatar: 'CL',
    vehiculo: '🚗 Auto',
    distrito: 'Miraflores',
    tipo: 'consejo',
    texto: 'Consejo para los nuevos: siempre confirmen el PIN de entrega antes de soltar el paquete. Ya me paso que el cliente decia que ya habia llegado sin dar el PIN y el pedido se marco como entregado sin serlo. Con el PIN eso no pasa.',
    likes: 41,
    tiempo: 'hace 1h',
  },
  {
    id: 3,
    autor: 'MotoFlash_PE',
    avatar: 'MF',
    vehiculo: '🏍️ Moto',
    distrito: 'Los Olivos',
    tipo: 'logro',
    texto: '100 entregas completadas en MapFlash! En 3 semanas. Los MapCoins que acumule ya los canjee dos veces a Yape. El sistema de pin de entrega da mucha confianza al cliente tambien.',
    likes: 67,
    tiempo: 'hace 2h',
    calificacion: 4.9,
  },
  {
    id: 4,
    autor: 'NightDriver_Callao',
    avatar: 'ND',
    vehiculo: '🚗 Auto',
    distrito: 'Callao',
    tipo: 'experiencia',
    texto: 'Cliente me califico con 5 estrellas y dejo comentario: "El driver llego exacto al tiempo estimado y el PIN de confirmacion me dio mucha seguridad saber que fue el correcto el que recibio mi paquete". Eso es lo que necesitamos.',
    likes: 33,
    tiempo: 'hace 3h',
  },
];

// Colores por tipo de post
const TIPO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  alerta:      { bg: '#fee2e2', color: '#991b1b', label: '⚠️ Alerta' },
  consejo:     { bg: '#dbeafe', color: '#1e40af', label: '💡 Consejo' },
  logro:       { bg: '#dcfce7', color: '#166534', label: '🏆 Logro' },
  experiencia: { bg: '#fef9c3', color: '#854d0e', label: '💬 Experiencia' },
};

export default function ComunidadDrivers() {
  const [posts, setPosts]       = useState<Post[]>(POSTS_INICIALES);
  const [filtro, setFiltro]     = useState<string>('todos');
  const [nuevoTexto, setNuevo]  = useState('');
  const [nuevoTipo, setTipo]    = useState<Post['tipo']>('experiencia');
  const [likeados, setLikeados] = useState<Set<number>>(new Set());

  // Filtra los posts segun el tipo seleccionado
  const postsFiltrados = filtro === 'todos'
    ? posts
    : posts.filter((p) => p.tipo === filtro);

  // Dar like a un post (solo una vez por post)
  function darLike(id: number) {
    if (likeados.has(id)) return;
    setLikeados((prev) => new Set(prev).add(id));
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  }

  // Publicar nuevo post en la comunidad
  function publicar() {
    if (!nuevoTexto.trim()) return;
    const nuevo: Post = {
      id: Date.now(),
      autor: 'Tu_Nickname',
      avatar: 'TU',
      vehiculo: '🏍️ Moto',
      distrito: 'Lima',
      tipo: nuevoTipo,
      texto: nuevoTexto.trim(),
      likes: 0,
      tiempo: 'ahora',
    };
    setPosts((prev) => [nuevo, ...prev]);
    setNuevo('');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-medium text-gray-700">
          ← Map<span className="text-blue-500">Flash</span>
        </Link>
        <h1 className="font-medium text-gray-900 flex-1">Comunidad de Drivers</h1>
        <Link href="/entrega" className="text-xs text-blue-500">
          PIN de entrega
        </Link>
      </header>

      {/* Stats rapidos */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-medium text-blue-600">124</div>
          <div className="text-xs text-gray-400">Drivers activos</div>
        </div>
        <div>
          <div className="text-lg font-medium text-green-600">4.8★</div>
          <div className="text-xs text-gray-400">Calificacion media</div>
        </div>
        <div>
          <div className="text-lg font-medium text-amber-600">2,840</div>
          <div className="text-xs text-gray-400">Posts esta semana</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Nuevo post */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">
            Compartir con la comunidad
          </div>
          <textarea
            value={nuevoTexto}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder="Comparte tu experiencia, consejo o alerta con otros drivers..."
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <select
              value={nuevoTipo}
              onChange={(e) => setTipo(e.target.value as Post['tipo'])}
              className="flex-1 h-9 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none"
            >
              <option value="experiencia">💬 Experiencia</option>
              <option value="consejo">💡 Consejo</option>
              <option value="alerta">⚠️ Alerta de zona</option>
              <option value="logro">🏆 Logro</option>
            </select>
            <button
              onClick={publicar}
              className="h-9 px-4 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600"
            >
              Publicar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {['todos', 'alerta', 'consejo', 'logro', 'experiencia'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                filtro === f
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {f === 'todos' ? 'Todos' :
               f === 'alerta' ? '⚠️ Alertas' :
               f === 'consejo' ? '💡 Consejos' :
               f === 'logro' ? '🏆 Logros' : '💬 Experiencias'}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-3">
          {postsFiltrados.map((post) => {
            const estilo = TIPO_STYLE[post.tipo];
            return (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                {/* Cabecera del post */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-300 flex-shrink-0">
                    {post.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {post.autor}
                    </div>
                    <div className="text-xs text-gray-400">
                      {post.vehiculo} · {post.distrito}
                      {post.calificacion && (
                        <span className="ml-2 text-amber-500">
                          {post.calificacion}★
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ background: estilo.bg, color: estilo.color }}
                  >
                    {estilo.label}
                  </span>
                </div>

                {/* Texto */}
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {post.texto}
                </p>

                {/* Acciones */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <button
                    onClick={() => darLike(post.id)}
                    className={`flex items-center gap-1 transition ${
                      likeados.has(post.id) ? 'text-blue-500' : 'hover:text-blue-500'
                    }`}
                  >
                    👍 {post.likes}
                  </button>
                  <span>💬 Comentar</span>
                  <span className="ml-auto">{post.tiempo}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
