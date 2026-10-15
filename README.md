# 🤖 Agentes WhatsApp - Guía de Primer Despliegue y Desarrollo

Sistema de agentes conversacionales para WhatsApp potenciado con Google Gemini AI, panel web React (Vite/Tailwind) y backend en Node.js con soporte multi-sucursal y pasarela WhatsApp Web.

Este proyecto está optimizado para ejecutarse en producción en una **Raspberry Pi 3B+ (ARMv8 64-bit)** conviviendo en el mismo servidor con **FormatosCuentas** sin conflicto alguno.

---

## 🌐 Convivencia en el Servidor (Raspberry Pi 3B+)

Ambos proyectos corren simultáneamente en el mismo servidor sin colisiones de puertos ni recursos:

| Servicio | FormatosCuentas | Agentes WhatsApp | URL / Conexión |
| :--- | :--- | :--- | :--- |
| **Panel Web (Frontend)** | Puerto `80` (3000, 5173) | **Puerto `8090`** | `http://<ip-servidor>:8090` |
| **API REST (Backend)** | Puerto `5000` | **Puerto `4050`** | `http://<ip-servidor>:4050/api` |
| **Healthcheck (Ping)** | `/api/health` | **`/ping`** | `http://<ip-servidor>:4050/ping` |
| **Base de Datos (Mongo)**| Puerto `27019` | **Puerto `48160`** | `mongodb://<ip-servidor>:48160` |
| **Contenedores Docker** | `formatos_cuentas_*` | **`agentes_whatsapp_*`** | Aislados |
| **Redes y Volúmenes** | `mongodb_data`, etc. | **`agentes_whatsapp_*`** | Independientes |

---

## ⚙️ Compatibilidad de Hardware (Raspberry Pi 3B+)

1. **Versión de MongoDB (`mongo:4.4.18`):**
   * El procesador Broadcom BCM2837 (ARM Cortex-A53) no soporta las extensiones ARMv8.2-A (LSE) que exigen MongoDB 5+. Usar versiones 5, 6 ó 7 provoca un bloqueo inmediato de `Illegal instruction (core dumped)`.
   * En `docker-compose.yml` se utiliza `mongo:4.4.18`, que es la versión oficial recomendada y 100% compatible con Raspberry Pi OS de 64 bits (`aarch64`).
2. **Límite de Memoria Caché:**
   * MongoDB tiene limitado el motor WiredTiger a **200MB** (`--wiredTigerCacheSizeGB 0.20`) para no agotar el 1GB de RAM compartida de la Pi.
3. **Persistencia de Sesión de WhatsApp Web:**
   * La sesión autenticada se almacena en el volumen Docker `agentes_whatsapp_auth:/app/.wwebjs_auth`. No perderás la conexión al reiniciar contenedores o el servidor.

---

## 🚀 PASO 1: Subir los Cambios al Repositorio (Desde tu PC Windows)

En tu equipo de desarrollo Windows, ejecuta los siguientes comandos en PowerShell dentro de `d:\Desarollo\AgentesWhatsapp`:

```powershell
# 1. Verificar el estado limpio del repositorio
git status

# 2. Agregar todos los archivos preparados (excluyendo automáticamente .env y node_modules)
git add .

# 3. Crear el commit para el primer despliegue
git commit -m "feat: configuracion de primer despliegue prod para raspberry pi 3b+ y perfiles dev/prod"

# 4. Subir los cambios a tu repositorio remoto (GitHub / GitLab / Gitea)
git push origin main
```

*(Si tu rama principal se llama `master`, usa `git push origin master`)*.

---

## 🖥️ PASO 2: Preparar la Raspberry Pi 3B+ (Servidor de Producción)

Conéctate por SSH a tu Raspberry Pi:
```bash
ssh oscarhenao@<ip-de-tu-raspberry>
```

### 1. Configurar Memoria Swap a 2048MB (¡Imprescindible!)
Para correr tanto FormatosCuentas como Agentes WhatsApp juntos en 1GB de RAM sin que el kernel cierre procesos por falta de memoria:
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
```
Busca la línea `CONF_SWAPSIZE` y cámbiala a:
```ini
CONF_SWAPSIZE=2048
```
Guarda con `Ctrl + O`, presiona `Enter`, y sal con `Ctrl + X`. Luego aplica los cambios:
```bash
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
free -m  # Verifica que en la fila Swap aparezcan ~2048 MB
```

### 2. Clonar o Actualizar el Proyecto en la Raspberry Pi
```bash
# Si es la primera vez que lo descargas en el servidor:
cd ~
git clone <URL_DE_TU_REPOSITORIO_GIT> AgentesWhatsapp
cd ~/AgentesWhatsapp

# (Si ya existía la carpeta, solo obtén los últimos cambios):
# cd ~/AgentesWhatsapp && git pull origin main
```

---

## 🔑 PASO 3: Configurar el Archivo `.env` en Producción

Copia la plantilla de ejemplo y edita tus claves reales:
```bash
cp .env.example .env
nano .env
```

Verifica que las siguientes variables estén activas para producción:
```env
# 1. Perfil activo en el servidor
NODE_ENV=production

# 2. Puertos de servicio
FRONTEND_PORT=8090
BACKEND_PORT=4050
MONGO_EXTERNAL_PORT=48160

# 3. Base de datos (Conexión interna de Docker)
MONGODB_URI=mongodb://mongodb:27017/agentes_whatsapp

# 4. Seguridad
JWT_SECRET=tu_clave_secreta_jwt_de_produccion
ENCRYPTION_KEY=clave_secreta_exactamente_32ch!

# 5. Inteligencia Artificial
GEMINI_API_KEY=tu_api_key_de_gemini

# 6. Meta Cloud API (Opcional si usas solo WhatsApp Web)
WHATSAPP_TOKEN=tu_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=1251600254692830
WHATSAPP_VERIFY_TOKEN=tu_token_de_verificacion
```
Guarda con `Ctrl + O`, presiona `Enter` y sal con `Ctrl + X`.

---

## 🚢 PASO 4: Ejecutar el Primer Despliegue Automático

Otorga permisos de ejecución a los scripts y ejecuta el instalador:
```bash
chmod +x deploy-pi.sh backup-pi.sh
./deploy-pi.sh
```

El script se encargará automáticamente de:
1. Verificar la memoria Swap y la arquitectura de la Pi.
2. Compilar el frontend React con límite de memoria seguro (`512MB`) para no congelar la Pi.
3. Levantar los 3 contenedores (`agentes_whatsapp_db`, `agentes_whatsapp_backend`, `agentes_whatsapp_frontend`).
4. Mostrar el estado de los servicios y las URLs de acceso.

---

## ✅ PASO 5: Verificación y Primer Uso

### 1. Comprobar que los contenedores están arriba y saludables:
```bash
docker compose ps
```
Deberías ver los 3 contenedores en estado `Up` (o `healthy`).

### 2. Probar el endpoint de salud (Ping):
```bash
curl http://localhost:4050/ping
# Debe responder: pong
```

### 3. Acceder al Panel Web:
Abre cualquier navegador en tu red local e ingresa a:
👉 **`http://<IP_DE_TU_RASPBERRY>:8090`**

### 4. Conectar WhatsApp Web:
1. En el panel web, dirígete a la configuración de tu sucursal.
2. Selecciona la opción de conexión por **WhatsApp Web**.
3. Se generará un código QR en pantalla.
4. Escanéalo desde tu teléfono (WhatsApp > Dispositivos vinculados > Vincular un dispositivo).
5. ¡Listo! La sesión quedará guardada en el volumen permanente de Docker y auto-reconectará cada vez que el servidor se reinicie.

---

## 🔄 PASO 6: Auto-arranque al Reiniciar el Servidor (Systemd)

Para que Agentes WhatsApp inicie automáticamente cada vez que la Raspberry Pi se encienda o se reinicie:

```bash
sudo cp agentes_whatsapp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable agentes_whatsapp.service
sudo systemctl start agentes_whatsapp.service
```

Puedes verificar el estado del servicio con:
```bash
sudo systemctl status agentes_whatsapp.service
```

---

## 💾 PASO 7: Copias de Seguridad Automáticas Diarias

El script `backup-pi.sh` respalda:
1. La base de datos completa de MongoDB (`mongodump`).
2. Las credenciales de sesión de WhatsApp Web (`.wwebjs_auth`).
3. La configuración y secretos (`.env`).
4. Aplica rotación automática conservando los últimos 14 días.

Pruébalo manualmente:
```bash
./backup-pi.sh
```

Para programarlo automáticamente todos los días a las 3:30 AM:
```bash
crontab -e
```
Agrega al final del archivo:
```cron
30 3 * * * /home/oscarhenao/AgentesWhatsapp/backup-pi.sh >> /home/oscarhenao/backups/backup_whatsapp.log 2>&1
```

---

## 💻 Desarrollo Local en Windows (Flujo de Trabajo)

Cuando quieras trabajar localmente en tu PC Windows sin afectar la Raspberry Pi:

1. **Levanta únicamente MongoDB en Docker:**
   ```powershell
   docker compose up -d mongodb
   ```
2. **Configura tu [.env](file:///D:/Desarollo/AgentesWhatsapp/.env) local:**
   ```env
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:48160/agentes_whatsapp
   ```
3. **Inicia el Backend:**
   ```powershell
   cd backend
   npm run dev
   ```
4. **Inicia el Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```
   *Acceso local de desarrollo:* `http://localhost:8090`

---

## 🛠️ Comandos de Mantenimiento Frecuentes

* **Ver registros (logs) en tiempo real:**
  ```bash
  docker compose logs -f backend
  docker compose logs -f mongodb
  ```
* **Reiniciar el stack completo:**
  ```bash
  docker compose restart
  ```
* **Detener los servicios:**
  ```bash
  docker compose down
  ```
* **Actualizar a una nueva versión tras cambios en git:**
  ```bash
  ./deploy-pi.sh
  ```
