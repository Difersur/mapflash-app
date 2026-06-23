# MapFlash — Proyecto Base

Plataforma de rutas y servicios del Peru. Este es el codigo base de
Next.js 14 + TypeScript + Tailwind CSS con la pantalla de login y
registro de MapFlash ya disenada y funcional.

## Que incluye este starter

- Pagina principal (`app/page.tsx`) con login y registro de 4 roles:
  Usuario, Conductor, Mapeador, Empresa.
- Colores de marca configurados en `tailwind.config.js`
  (azul `#1a8fe3`, azul oscuro `#0f1f35`, etc.)
- Configuracion lista para desplegar en Vercel.

---

## PASO 1 — Subir este codigo a GitHub

1. Entra a [github.com](https://github.com) y crea una cuenta si no tienes.
2. Click en **"New repository"** (boton verde arriba a la derecha).
3. Nombre del repositorio: `mapflash-app`
4. Deja "Public" o "Private" segun prefieras (Private si quieres que
   solo tu lo veas por ahora).
5. **No** marques "Add a README" (ya tenemos uno).
6. Click **"Create repository"**.
7. En la pagina que aparece, busca la opcion **"uploading an existing
   file"** (subir un archivo existente).
8. Arrastra TODA la carpeta `mapflash-app` (o selecciona todos los
   archivos) y sube todo.
9. Click **"Commit changes"**.

> Si prefieres usar la terminal en tu computadora, en la carpeta
> `mapflash-app` ejecuta:
> ```bash
> git init
> git add .
> git commit -m "Primera version de MapFlash"
> git branch -M main
> git remote add origin https://github.com/TU_USUARIO/mapflash-app.git
> git push -u origin main
> ```

---

## PASO 2 — Conectar Vercel con GitHub

1. Entra a [vercel.com](https://vercel.com) y haz click en
   **"Sign Up"** → elige **"Continue with GitHub"**.
2. Autoriza a Vercel a acceder a tus repositorios.
3. Click en **"Add New..."** → **"Project"**.
4. Busca `mapflash-app` en la lista y click **"Import"**.
5. Vercel detecta automaticamente que es un proyecto Next.js —
   no cambies ninguna configuracion, solo click **"Deploy"**.
6. Espera 1-2 minutos. Al terminar, Vercel te da una URL tipo
   `mapflash-app.vercel.app` donde ya puedes ver tu pagina en vivo.

---

## PASO 3 — Conectar el dominio mapflash.app

### 3.1 Activar Cloudflare (si no lo has hecho)

1. Entra a [cloudflare.com](https://cloudflare.com) → crea cuenta gratis.
2. Click **"Add a site"** → escribe `mapflash.app` → plan **Free**.
3. Cloudflare te dara 2 nameservers (ejemplo:
   `ana.ns.cloudflare.com` y `ben.ns.cloudflare.com`). Copialos.

### 3.2 Cambiar nameservers en Namecheap

1. Entra a tu cuenta de Namecheap → **Domain List**.
2. Click **"Manage"** junto a `mapflash.app`.
3. Busca la seccion **"Nameservers"**.
4. Cambia de "Namecheap BasicDNS" a **"Custom DNS"**.
5. Pega los 2 nameservers que te dio Cloudflare.
6. Guarda los cambios (el icono de check verde).

> La propagacion puede tardar entre 10 minutos y 24 horas.

### 3.3 Agregar el dominio en Vercel

1. En tu proyecto de Vercel → **Settings** → **Domains**.
2. Escribe `mapflash.app` → click **"Add"**.
3. Vercel te mostrara 1-2 registros DNS que debes agregar
   (normalmente un registro tipo `A` apuntando a `76.76.21.21`
   y un `CNAME` para `www`).

### 3.4 Agregar esos registros en Cloudflare

1. Vuelve a Cloudflare → tu sitio `mapflash.app` → **DNS** → **Records**.
2. Click **"Add record"**.
3. Agrega exactamente el/los registro(s) que te indico Vercel
   (tipo, nombre y valor).
4. Guarda.

### 3.5 Verificar

- Espera unos minutos y entra a `https://mapflash.app` en tu navegador.
- Deberias ver tu pagina de MapFlash con el candado de SSL activo (🔒).

---

## PASO 4 — Que sigue (para mejorar la pagina)

Una vez que `mapflash.app` cargue correctamente, las siguientes
mejoras priorizadas son:

1. **Mapa interactivo con GPS real** — usar la Geolocation API del
   navegador y Google Maps JS SDK.
2. **Backend con Supabase** — crear las tablas de usuarios, drivers,
   pedidos, fondos y MapCoins.
3. **Calculadora de tarifas** — implementar la formula de precios
   (S/1.22/km hasta 10km, S/1.10/km mas alla, driver recibe S/1.00/km).
4. **Panel de administrador** — con 2FA y PIN, solo accesible para
   el correo del administrador.
5. **Carteras Activas + Yape/Plin** — integracion de pagos.

Cada uno de estos modulos se puede ir agregando como nuevas paginas
dentro de la carpeta `app/` (por ejemplo `app/mapa/page.tsx`,
`app/admin/page.tsx`, etc.) y Vercel los despliega automaticamente
cada vez que subes cambios a GitHub.

---

## Desarrollo local (opcional)

Si quieres ver los cambios en tu computadora antes de subirlos:

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000` en tu navegador.
