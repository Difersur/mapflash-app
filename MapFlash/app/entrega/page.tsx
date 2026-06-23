'use client';

// Sistema de PIN de entrega y calificacion mutua
// El driver ingresa el PIN que el usuario tiene en su app
// El usuario califica al driver y el driver califica al usuario
// Ambas calificaciones son anonimas entre si pero visibles para el admin

import { useState } from 'react';
import Link from 'next/link';

// Estado del flujo de entrega
type Etapa =
  | 'esperando'    // driver en camino
  | 'llegando'     // driver llego, pide PIN
  | 'pin-correcto' // PIN validado, pedir calificacion del driver
  | 'pin-error'    // PIN incorrecto
  | 'completado';  // Todo listo

// PIN de prueba para demo
const PIN_DEMO = '4872';

export default function Entrega() {
  // Controla si se muestra la vista del driver o del usuario
  const [vista, setVista]       = useState<'driver' | 'usuario'>('driver');
  const [etapa, setEtapa]       = useState<Etapa>('llegando');
  const [pinIngresado, setPin]  = useState('');
  const [estrellas, setEstre]   = useState(0);
  const [estrellasU, setEstreU] = useState(0); // calificacion del usuario por el driver
  const [comentario, setCom]    = useState('');
  const [comentU, setComU]      = useState('');
  const [pinVisible, setPinV]   = useState(false);

  // El driver ingresa el PIN del usuario para confirmar la entrega
  function validarPin() {
    if (pinIngresado === PIN_DEMO) {
      setEtapa('pin-correcto');
    } else {
      setEtapa('pin-error');
      setTimeout(() => {
        setEtapa('llegando');
        setPin('');
      }, 2000);
    }
  }

  // Confirmar calificacion final
  function confirmarCalificacion() {
    if (estrellas === 0) return;
    setEtapa('completado');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm font-medium text-gray-700">
          ← Map<span className="text-blue-500">Flash</span>
        </Link>
        <h1 className="font-medium text-gray-900 flex-1">
          {vista === 'driver' ? 'Confirmar entrega' : 'Mi pedido'}
        </h1>
        {/* Toggle para demo: cambiar entre vista driver y usuario */}
        <button
          onClick={() => { setVista(v => v === 'driver' ? 'usuario' : 'driver'); setEtapa('llegando'); setPin(''); setEstre(0); setEstreU(0); }}
          className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500"
        >
          Ver como {vista === 'driver' ? 'usuario' : 'driver'}
        </button>
      </header>

      <div className="max-w-sm mx-auto px-4 py-6">

        {/* ══ VISTA DEL DRIVER ══ */}
        {vista === 'driver' && (
          <div>
            {/* Info del pedido */}
            <div className="bg-blue-900 rounded-xl p-4 mb-4 text-white">
              <div className="text-xs text-blue-300 mb-1">Pedido #MF-2847</div>
              <div className="font-medium mb-1">Carlos Quispe</div>
              <div className="text-sm text-blue-200">Jr. Las Flores 248, SJL · Piso 2</div>
              <div className="flex items-center gap-3 mt-3 text-sm">
                <span>📦 Paquete mediano</span>
                <span>·</span>
                <span>S/ 12.76</span>
                <span>·</span>
                <span className="text-green-400">S/ 8.00 para ti</span>
              </div>
            </div>

            {/* ETAPA: LLEGANDO — pide PIN */}
            {(etapa === 'llegando' || etapa === 'pin-error') && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-center mb-5">
                  <div className="text-3xl mb-2">📦</div>
                  <div className="font-medium text-gray-900">
                    Pide el PIN al cliente
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    El usuario tiene un PIN de 4 digitos en su app.
                    Ingresal aqui para confirmar la entrega.
                  </div>
                </div>

                {etapa === 'pin-error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center text-sm text-red-700">
                    ❌ PIN incorrecto — intentalo de nuevo
                  </div>
                )}

                {/* Teclado numerico de PIN */}
                <div className="flex justify-center gap-3 mb-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-medium ${
                        pinIngresado.length > i
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-300'
                      }`}
                    >
                      {pinIngresado.length > i ? '●' : '—'}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        if (k === '⌫') setPin(p => p.slice(0,-1));
                        else if (k !== '' && pinIngresado.length < 4) setPin(p => p + k);
                      }}
                      className={`h-12 rounded-xl text-lg font-medium transition ${
                        k === '' ? '' :
                        k === '⌫' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' :
                        'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  onClick={validarPin}
                  disabled={pinIngresado.length < 4}
                  className={`w-full h-11 rounded-xl text-sm font-medium transition ${
                    pinIngresado.length === 4
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar entrega con PIN
                </button>

                <div className="text-center mt-3 text-xs text-gray-400">
                  PIN de demo para probar: <strong>4872</strong>
                </div>
              </div>
            )}

            {/* ETAPA: PIN CORRECTO — calificar al usuario */}
            {etapa === 'pin-correcto' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-medium text-gray-900">
                    ¡Entrega confirmada!
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    PIN correcto · S/ 8.00 acreditados a tu Cartera
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    +100 MapCoins base por este viaje
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="text-sm font-medium text-gray-700 text-center mb-3">
                    ¿Como fue este cliente?
                  </div>
                  <div className="flex justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setEstreU(n)}
                        className={`text-2xl transition ${
                          n <= estrellasU ? 'text-amber-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={comentU}
                    onChange={(e) => setComU(e.target.value)}
                    placeholder="Comentario opcional sobre el cliente..."
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    rows={2}
                  />
                  <button
                    onClick={confirmarCalificacion}
                    disabled={estrellasU === 0}
                    className={`w-full h-10 rounded-xl text-sm font-medium ${
                      estrellasU > 0
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Enviar calificacion y cerrar pedido
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA: COMPLETADO */}
            {etapa === 'completado' && (
              <div className="bg-white rounded-xl border border-green-200 p-5 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <div className="font-medium text-gray-900 mb-1">
                  Pedido completado
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Calificacion enviada · Gracias por usar MapFlash
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-lg font-medium text-blue-600">S/8.00</div>
                    <div className="text-xs text-gray-500">Ganado en efectivo</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-lg font-medium text-amber-600">+100 MC</div>
                    <div className="text-xs text-gray-500">MapCoins ganados</div>
                  </div>
                </div>
                <button
                  onClick={() => { setEtapa('llegando'); setPin(''); setEstre(0); setEstreU(0); setCom(''); setComU(''); }}
                  className="mt-4 w-full h-10 bg-blue-500 text-white rounded-xl text-sm font-medium"
                >
                  Nuevo pedido
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ VISTA DEL USUARIO ══ */}
        {vista === 'usuario' && (
          <div>
            {/* Info del pedido */}
            <div className="bg-blue-900 rounded-xl p-4 mb-4 text-white">
              <div className="text-xs text-blue-300 mb-1">Pedido #MF-2847</div>
              <div className="font-medium mb-1">Tu pedido esta en camino</div>
              <div className="text-sm text-blue-200">Driver: JorgeMamani_Driver · 🏍️ Moto</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-300">ETA: 8 minutos</span>
              </div>
            </div>

            {/* PIN del usuario */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🔑</div>
                <div className="font-medium text-gray-900">
                  Tu PIN de confirmacion
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Cuando el driver llegue, dile este PIN para
                  confirmar que eres tu quien recibe el pedido.
                </div>
              </div>

              <div
                className="flex justify-center cursor-pointer"
                onClick={() => setPinV(v => !v)}
              >
                <div className="bg-blue-50 border-2 border-blue-500 rounded-xl px-8 py-4 text-center">
                  {pinVisible ? (
                    <div className="text-4xl font-bold text-blue-600 tracking-widest">
                      {PIN_DEMO}
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-blue-300 tracking-widest">
                      ••••
                    </div>
                  )}
                  <div className="text-xs text-blue-400 mt-2">
                    {pinVisible ? 'Toca para ocultar' : 'Toca para revelar'}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 text-xs text-amber-700">
                ⚠️ No compartas este PIN hasta que el driver este
                fisicamente frente a ti con tu pedido.
              </div>
            </div>

            {/* Calificacion del driver (despues de la entrega) */}
            {etapa === 'pin-correcto' || etapa === 'completado' ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-center mb-3">
                  <div className="text-2xl mb-1">📦 ✅</div>
                  <div className="font-medium">Pedido recibido</div>
                  <div className="text-sm text-gray-500">¿Como estuvo el servicio?</div>
                </div>
                <div className="flex justify-center gap-2 mb-3">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEstre(n)}
                      className={`text-3xl transition ${n <= estrellas ? 'text-amber-400' : 'text-gray-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={comentario}
                  onChange={(e) => setCom(e.target.value)}
                  placeholder="Deja un comentario para el driver..."
                  className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  rows={3}
                />
                <button
                  onClick={confirmarCalificacion}
                  disabled={estrellas === 0}
                  className={`w-full h-11 rounded-xl text-sm font-medium ${
                    estrellas > 0
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Calificar al driver →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-sm text-gray-500">
                  Una vez que el driver confirme tu PIN, podras
                  calificarlo aqui.
                </div>
                <button
                  onClick={() => setEtapa('pin-correcto')}
                  className="mt-3 text-xs text-blue-500"
                >
                  Simular entrega completada →
                </button>
              </div>
            )}

            {etapa === 'completado' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-center">
                <div className="text-2xl mb-2">🙌</div>
                <div className="font-medium text-green-700">
                  Gracias por calificar
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Tu opinion ayuda a mejorar el servicio para todos
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
