# BailaChat Live

Prototipo separado para probar un juego de directo: quien comenta aparece en pantalla, y quien dona avanza hasta el escenario VIP para bailar.

## Como probar

Abrir `index.html` en un navegador. El panel de la derecha simula comentarios, regalos y cambios de musica.

Tambien se puede correr con servidor local:

```powershell
node server.js
```

Luego abrir:

- Panel completo: `http://127.0.0.1:8123`
- Solo overlay para OBS: `http://127.0.0.1:8123?overlay=1`

## TikTok Live real

Primero instalar dependencias:

```powershell
npm install
```

Despues iniciar con el usuario que esta en vivo:

```powershell
node server.js --tiktok nombre_del_usuario
```

No hace falta poner `@`. El navegador recibe los eventos automaticamente:

- Comentario: aparece el usuario en pantalla.
- Regalo: avanza segun el valor estimado del regalo.
- Like: activa una animacion chica.

Tambien se puede usar variable de entorno:

```powershell
$env:TIKTOK_USER="nombre_del_usuario"
node server.js
```

## Subir a internet

Esta app necesita hosting de Node.js porque escucha eventos del live y los manda al navegador. No alcanza con un hosting estatico.

Opcion recomendada: Render, Railway o Fly.io.

Variables necesarias en el hosting:

```text
NODE_ENV=production
TIKTOK_USER=nombre_del_usuario_sin_arroba
```

Comandos:

```text
Build command: npm install
Start command: npm start
```

Cuando el hosting te de una URL, el panel sera:

```text
https://tu-app.onrender.com
```

Y el overlay para OBS:

```text
https://tu-app.onrender.com?overlay=1
```

## Abrir desde otra PC en la misma red

Iniciar el servidor escuchando en la red local:

```powershell
$env:HOST="0.0.0.0"
node server.js --tiktok nombre_del_usuario
```

Buscar la IP local de esta PC:

```powershell
ipconfig
```

En la otra PC abrir `http://IP_LOCAL:PUERTO`. Ejemplo:

```text
http://192.168.1.35:8123
http://192.168.1.35:8123?overlay=1
```

## Idea para OBS o TikTok Live Studio

Capturar la ventana del navegador como fuente. En una version futura se puede separar el panel del streamer de la pantalla publica para dejar visible solo el escenario.

## Siguiente integracion

El juego ya tiene la logica central. El siguiente paso seria conectar eventos reales de TikTok Live desde una herramienta externa o conector:

- Comentario: llama a la accion `comment`.
- Regalo chico: llama a `gift(1)`.
- Regalo medio: llama a `gift(2)`.
- Regalo grande: llama a `gift(4)`.
