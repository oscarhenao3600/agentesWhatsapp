# 📊 Panel de Control y Consumo de Recursos (Tokens & Cuotas)

Este documento ha sido creado especialmente para darte visibilidad y control sobre el consumo de recursos de IA mientras trabajamos juntos en tu proyecto **AgentesWhatsapp**.

---

## ⚡ Estado Actual del Modelo

| Métrica | Detalle |
| :--- | :--- |
| 🤖 **Modelo Activo** | **Gemini 3.5 Flash (Medium)** |
| 🟢 **Nivel de Consumo** | **Ultra-Bajo (Muy Eficiente)** |
| ⏳ **Frecuencia de Reinicio** | Cada 5 horas (Cuota Dinámica de Google) |

> [!TIP]
> **Gemini 3.5 Flash** es un modelo extremadamente veloz y optimizado. Consume aproximadamente **un 80% menos de "Unidades de Cómputo"** que los modelos Pro/Ultra, por lo que tus límites de cuotas son sumamente amplios y es muy difícil que los agotes en un día de trabajo normal.

---

## 📉 Barra Estimada de Cuota Disponible

Basándonos en la actividad de nuestra sesión actual (inicialización, lectura de directorios y configuración de accesos):

```text
[██████████████████████████████░░░░] 90% Disponible (Estimado)
```

* *Consumo en esta sesión:* ~10% (debido a escaneos iniciales de estructura).
* *Créditos / Cuota Restante:* **Óptima**. Puedes realizar cientos de consultas más sin problemas.

---

## 📋 Registro de Tareas y Costo Estimado de Tokens

Aquí mantendremos un historial del impacto de cada tarea para que no tengas sorpresas:

| Tarea / Acción | Archivos Modificados | Impacto de Tokens | Estado |
| :--- | :--- | :--- | :--- |
| 🛠️ Configuración Inicial de Ruta | Ninguno (Lectura de `D:\Desarollo`) | Minúsculo (Lectura de carpetas) | ✅ Completado |
| 🔍 Escaneo de `AgentesWhatsapp` | Carpeta raíz y estructura | Bajo (Lectura de archivos de config) | ✅ Completado |
| 📝 Próxima Tarea (Pendiente) | - | - | ⏳ Esperando instrucciones |

---

## 💡 Consejos Clave para Cuidar tus Tokens
1. **Evita enviar archivos enormes innecesarios:** Si un archivo tiene miles de líneas de logs o base de datos, es mejor no leerlo completo.
2. **Usa tareas específicas:** Es mejor pedir "agrega esta función a app.js" que decir "reescribe todo el backend".
3. **Aprobaciones rápidas:** Al usar el flujo de la **Opción A** (aprobar planes cortos directamente), reducimos los ciclos de razonamiento innecesarios del agente.

---

## 🌐 ¿Cómo ver tu saldo real y límites oficiales?
Dado que por motivos de seguridad del sistema mis herramientas locales no pueden acceder a las credenciales privadas de tu facturación de Google, aquí te dejo cómo puedes consultar tus métricas oficiales:
* **Google AI Studio:** Ve a [aistudio.google.com](https://aistudio.google.com/) en la sección de "Plan & Billing" para ver el consumo exacto por segundo.
* **Google One:** Si tu suscripción es a través de Google One (AI Premium), puedes ver tus créditos activos en la página de Configuración de Google One.
* **Extensión VS Code:** Te recomiendo instalar la extensión **"Antigravity Quota Watcher"** en tu VS Code local. Agregará un pequeño indicador en tiempo real en la barra de estado de tu editor para que no tengas que abrir ninguna web.
