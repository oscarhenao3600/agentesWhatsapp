const { google } = require('googleapis');

/**
 * Parsea y valida las credenciales de la Cuenta de Servicio de Google (Service Account)
 */
const parseServiceAccountCredentials = (rawJson) => {
  if (!rawJson) {
    throw new Error('No se han proporcionado credenciales de Google Service Account.');
  }

  let creds;
  if (typeof rawJson === 'object' && rawJson !== null) {
    creds = rawJson;
  } else if (typeof rawJson === 'string') {
    try {
      creds = JSON.parse(rawJson);
    } catch (err) {
      throw new Error('El formato de las credenciales no es un JSON válido.');
    }
  } else {
    throw new Error('Tipo de credenciales inválido.');
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error('El JSON de credenciales debe contener "client_email" y "private_key".');
  }

  // Normalizar la clave privada (reemplazar \\n literales por saltos de línea reales si existen)
  let privateKey = creds.private_key;
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    client_email: creds.client_email,
    private_key: privateKey,
    project_id: creds.project_id || ''
  };
};

/**
 * Obtiene el cliente autenticado de Google Calendar
 */
const getCalendarClient = (aiConfig) => {
  if (!aiConfig || !aiConfig.googleCredentialsJson) {
    throw new Error('No hay credenciales de Google Calendar configuradas en esta sucursal.');
  }

  const creds = parseServiceAccountCredentials(aiConfig.googleCredentialsJson);

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = (aiConfig.googleCalendarId && aiConfig.googleCalendarId.trim()) 
    ? aiConfig.googleCalendarId.trim() 
    : 'primary';

  return {
    calendar,
    calendarId,
    serviceAccountEmail: creds.client_email,
    projectId: creds.project_id
  };
};

/**
 * Prueba la conexión con Google Calendar y valida que el calendario sea accesible
 */
const testCalendarConnection = async (aiConfig) => {
  try {
    const { calendar, calendarId, serviceAccountEmail } = getCalendarClient(aiConfig);

    // Consultar información básica del calendario para verificar permisos
    const res = await calendar.calendars.get({
      calendarId: calendarId
    });

    return {
      success: true,
      calendarId: calendarId,
      summary: res.data.summary || calendarId,
      timeZone: res.data.timeZone || 'UTC',
      serviceAccountEmail: serviceAccountEmail,
      message: `Conexión exitosa con el calendario "${res.data.summary || calendarId}".`
    };
  } catch (error) {
    console.error('[GoogleCalendar] Error probando conexión:', error.message);

    let friendlyMessage = error.message;
    if (error.code === 404 || (error.message && error.message.includes('Not Found'))) {
      friendlyMessage = 'Calendario no encontrado. Verifica el ID del calendario y asegúrate de haber compartido el calendario con el correo de la cuenta de servicio.';
    } else if (error.code === 403 || (error.message && error.message.includes('Forbidden'))) {
      friendlyMessage = 'Permiso denegado. Debes compartir tu calendario de Google con el correo de la cuenta de servicio y asignarle el permiso de "Hacer cambios en eventos".';
    } else if (error.message && error.message.includes('invalid_grant')) {
      friendlyMessage = 'Credenciales no válidas o clave privada incorrecta. Por favor descarga nuevamente el archivo JSON de la cuenta de servicio.';
    }

    return {
      success: false,
      error: friendlyMessage,
      details: error.message
    };
  }
};

const BOGOTA_TZ = 'America/Bogota';

const MONTH_NAME_MAP = {
  enero: 1, ene: 1, january: 1, jan: 1, janvier: 1,
  febrero: 2, feb: 2, february: 2, fevrier: 2, février: 2,
  marzo: 3, mar: 3, march: 3, mars: 3,
  abril: 4, abr: 4, april: 4, apr: 4, avril: 4,
  mayo: 5, may: 5, mai: 5,
  junio: 6, jun: 6, june: 6, juin: 6,
  julio: 7, jul: 7, july: 7, juillet: 7,
  agosto: 8, ago: 8, august: 8, aug: 8, aout: 8, août: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, september: 9, septembre: 9,
  octubre: 10, oct: 10, october: 10, octobre: 10,
  noviembre: 11, nov: 11, november: 11, novembre: 11,
  diciembre: 12, dic: 12, december: 12, dec: 12, decembre: 12, décembre: 12
};

/**
 * Convierte una fecha o ISO string a YYYY-MM-DD en zona horaria America/Bogota sin desfase UTC
 */
const toBogotaDateStr = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

/**
 * Suma o resta días a una fecha YYYY-MM-DD de forma segura (sin desfase de zona horaria)
 */
const addDaysToDateStr = (ymd, days) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
};

/**
 * Formatea YYYY-MM-DD en texto legible en español (ej: "sábado 7 de noviembre de 2026 (2026-11-07)")
 */
const formatHumanDateEs = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const human = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dt);
  return `${human} (${ymd})`;
};

/**
 * Detecta si el resumen de un evento es una nota operativa interna (deuda, masaje, decoración, transporte, mascota)
 * que no representa por sí misma un bloqueo de habitación adicional.
 */
const isAuxiliaryCalendarNote = (summary = '') => {
  const s = String(summary).trim();
  if (!s) return false;
  return /\bdebe\b|\bdecor|\bmasaje|\brelajante|\btransporte|\bmascota|\bcortes[ií]a/i.test(s);
};

/**
 * Identifica a qué suite/cabaña corresponde el resumen de un evento (ej. Noire, Blanc)
 */
const detectEventSuite = (summary = '') => {
  const s = String(summary || '');
  const hasNoire = /\bnoire\b/i.test(s);
  const hasBlanc = /\bblanc\b/i.test(s);
  if (hasNoire && hasBlanc) return ['Noire', 'Blanc'];
  if (hasNoire) return ['Noire'];
  if (hasBlanc) return ['Blanc'];
  return ['General'];
};

/**
 * Calcula la fecha del Domingo de Pascua para un año dado (Algoritmo de Butcher/Meeus)
 */
const getEasterSundayYmd = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Traslada una fecha YYYY-MM-DD al lunes siguiente si no cae en lunes (Ley Emiliani - Colombia)
 */
const moveToNextMondayYmd = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = dt.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  if (dow === 1) return ymd;
  const daysToAdd = dow === 0 ? 1 : (8 - dow);
  return addDaysToDateStr(ymd, daysToAdd);
};

/**
 * Obtiene el conjunto de días festivos oficiales en Colombia para un año dado
 */
const getColombianHolidaysForYear = (year) => {
  const y = String(year).padStart(4, '0');
  const holidays = new Set([
    `${y}-01-01`, // Año Nuevo
    `${y}-05-01`, // Día del Trabajo
    `${y}-07-20`, // Día de la Independencia
    `${y}-08-07`, // Batalla de Boyacá
    `${y}-12-08`, // Inmaculada Concepción
    `${y}-12-25`  // Navidad
  ]);

  // Festivos trasladables al lunes (Ley Emiliani)
  const emilianiFixed = [
    `${y}-01-06`, // Reyes Magos
    `${y}-03-19`, // San José
    `${y}-06-29`, // San Pedro y San Pablo
    `${y}-08-15`, // Asunción de la Virgen
    `${y}-10-12`, // Día de la Raza
    `${y}-11-01`, // Todos los Santos
    `${y}-11-11`  // Independencia de Cartagena
  ];
  emilianiFixed.forEach(dt => holidays.add(moveToNextMondayYmd(dt)));

  // Festivos basados en Pascua
  const easterYmd = getEasterSundayYmd(year);
  holidays.add(addDaysToDateStr(easterYmd, -3)); // Jueves Santo
  holidays.add(addDaysToDateStr(easterYmd, -2)); // Viernes Santo
  holidays.add(addDaysToDateStr(easterYmd, 43)); // Ascensión del Señor (Lunes)
  holidays.add(addDaysToDateStr(easterYmd, 64)); // Corpus Christi (Lunes)
  holidays.add(addDaysToDateStr(easterYmd, 71)); // Sagrado Corazón de Jesús (Lunes)

  return holidays;
};

/**
 * Determina si una fecha YYYY-MM-DD es festivo en Colombia
 */
const isColombianHoliday = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const year = Number(ymd.slice(0, 4));
  return getColombianHolidaysForYear(year).has(ymd);
};

/**
 * Calcula la tarifa oficial por noche para La Font Ecolodge (Suites Noire y Blanc)
 * - Domingo a jueves (cuando el lunes siguiente NO es festivo): $550.000 COP (Tarifa Estándar, Check-out 12:00 m.)
 * - Viernes, sábado, o domingo cuando el lunes siguiente ES FESTIVO en Colombia: $750.000 COP (Servicio Premium, Late Check-out hasta 1:30 p. m.)
 */
const getNoireBlancNightRateInfo = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = dt.getUTCDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  const nextDayYmd = addDaysToDateStr(ymd, 1);
  const isNextMondayHoliday = dow === 0 && isColombianHoliday(nextDayYmd);
  const isPremiumNight = dow === 5 || dow === 6 || isNextMondayHoliday;

  if (isPremiumNight) {
    const reason = dow === 5 ? 'Noche de Viernes' : dow === 6 ? 'Noche de Sábado' : 'Noche de Domingo con Lunes Festivo';
    return {
      priceCop: 750000,
      formattedPrice: '$750.000 COP',
      planName: 'Tarifa Servicio Premium',
      reason,
      checkOutInfo: 'Check-out estándar 12:00 m. | Incluye Late Check-out exclusivo Servicio Premium hasta la 1:30 p. m.',
      summaryText: `💰 TARIFA OFICIAL DE ESTA NOCHE: $750.000 COP por suite (${reason} - Servicio Premium para 2 adultos, desayuno incluido y Late Check-out hasta la 1:30 p. m.)`
    };
  }

  return {
    priceCop: 550000,
    formattedPrice: '$550.000 COP',
    planName: 'Tarifa Estándar (Domingo a Jueves)',
    reason: 'Noche entre domingo y jueves (sin lunes festivo)',
    checkOutInfo: 'Check-out a las 12:00 m.',
    summaryText: `💰 TARIFA OFICIAL DE ESTA NOCHE: $550.000 COP por suite (Tarifa Estándar para 2 adultos, desayuno incluido, Check-out 12:00 m.)`
  };
};

/**
 * Extrae las fechas (YYYY-MM-DD) por las que el usuario está consultando en su mensaje o historial reciente
 */
const extractQueriedDatesFromText = (text = '', referenceDate = new Date()) => {
  if (!text) return [];
  const norm = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const refYmd = toBogotaDateStr(referenceDate) || new Date().toISOString().slice(0, 10);
  const [refYear, refMonth, refDay] = refYmd.split('-').map(Number);
  const refUtcDate = new Date(Date.UTC(refYear, refMonth - 1, refDay, 12, 0, 0));
  const refDow = refUtcDate.getUTCDay(); // 0=Dom..6=Sab
  const foundDates = new Set();

  // 0. Expresiones relativas: "hoy", "esta noche", "mañana", "pasado mañana", "este fin de semana" y días de la semana
  if (/\b(hoy|esta\s+noche|tonight|today|ahora)\b/i.test(norm)) {
    foundDates.add(refYmd);
  }
  if (/\b(pasado\s+manana|day\s+after\s+tomorrow)\b/i.test(norm)) {
    foundDates.add(addDaysToDateStr(refYmd, 2));
  } else if (/\b(manana|tomorrow)\b/i.test(norm)) {
    foundDates.add(addDaysToDateStr(refYmd, 1));
  }
  if (/\b(fin\s+de\s+semana|finde|weekend)\b/i.test(norm)) {
    const daysUntilFri = (5 - refDow + 7) % 7;
    const friYmd = addDaysToDateStr(refYmd, daysUntilFri);
    const satYmd = addDaysToDateStr(friYmd, 1);
    const sunYmd = addDaysToDateStr(friYmd, 2);
    foundDates.add(friYmd);
    foundDates.add(satYmd);
    if (isColombianHoliday(addDaysToDateStr(sunYmd, 1))) {
      foundDates.add(sunYmd);
    }
  }

  const weekdayMap = {
    domingo: 0, sunday: 0,dimanche: 0,
    lunes: 1, monday: 1, lundi: 1,
    martes: 2, tuesday: 2, mardi: 2,
    miercoles: 3, wednesday: 3, mercredi: 3,
    jueves: 4, thursday: 4, jeudi: 4,
    viernes: 5, friday: 5, vendredi: 5,
    sabado: 6, saturday: 6, samedi: 6
  };
  for (const [dayName, targetDow] of Object.entries(weekdayMap)) {
    const dayRegex = new RegExp(`\\b${dayName}\\b`, 'i');
    if (dayRegex.test(norm)) {
      const delta = (targetDow - refDow + 7) % 7;
      foundDates.add(addDaysToDateStr(refYmd, delta));
    }
  }

  const resolveYear = (monthNum, explicitYear) => {
    if (explicitYear) {
      return explicitYear < 100 ? 2000 + explicitYear : explicitYear;
    }
    // Si el mes consultado es anterior al mes actual por más de 2 meses, asumir próximo año; de lo contrario año actual
    if (monthNum < refMonth - 1) {
      return refYear + 1;
    }
    return refYear;
  };

  const addSafeYmd = (year, month, day) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    const yStr = String(year).padStart(4, '0');
    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    foundDates.add(`${yStr}-${mStr}-${dStr}`);
  };

  // 1. Formato ISO YYYY-MM-DD
  for (const m of norm.matchAll(/\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g)) {
    addSafeYmd(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // 2. Rangos con nombre de mes: "del 7 al 9 de noviembre", "7 y 8 de noviembre", "entre el 7 y el 10 de noviembre"
  const monthNamesPattern = Object.keys(MONTH_NAME_MAP).join('|');
  const rangeRegex = new RegExp(`\\b(\\d{1,2})\\s*(?:al|a|y|hasta(?:\\s+el)?|-)\\s*(\\d{1,2})\\s*(?:de\\s+|d[e']\\s*)?(${monthNamesPattern})(?:\\s*(?:de|del)?\\s*(20\\d{2}))?\\b`, 'gi');
  for (const m of norm.matchAll(rangeRegex)) {
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    const monthNum = MONTH_NAME_MAP[m[3]];
    const year = resolveYear(monthNum, m[4] ? Number(m[4]) : null);
    if (monthNum && d1 >= 1 && d2 >= d1 && (d2 - d1) <= 15) {
      for (let d = d1; d <= d2; d++) {
        addSafeYmd(year, monthNum, d);
      }
    }
  }

  // 3. Día + Mes: "7 de noviembre", "07 nov", "7 noviembre 2026"
  const dayMonthRegex = new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+|d[e']\\s*|\\/|-|\\s)\\s*(${monthNamesPattern})(?:\\s*(?:de|del|,)?\\s*(20\\d{2}))?\\b`, 'gi');
  for (const m of norm.matchAll(dayMonthRegex)) {
    const day = Number(m[1]);
    const monthNum = MONTH_NAME_MAP[m[2]];
    const year = resolveYear(monthNum, m[3] ? Number(m[3]) : null);
    if (monthNum) addSafeYmd(year, monthNum, day);
  }

  // 4. Mes + Día: "noviembre 7", "november 7th"
  const monthDayRegex = new RegExp(`\\b(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:de|del|,)?\\s*(20\\d{2}))?\\b`, 'gi');
  for (const m of norm.matchAll(monthDayRegex)) {
    const monthNum = MONTH_NAME_MAP[m[1]];
    const day = Number(m[2]);
    const year = resolveYear(monthNum, m[3] ? Number(m[3]) : null);
    if (monthNum) addSafeYmd(year, monthNum, day);
  }

  // 5. Formato numérico DD/MM/YYYY o DD/MM
  for (const m of norm.matchAll(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])(?:[\/\-](20\d{2}|\d{2}))?\b/g)) {
    const day = Number(m[1]);
    const monthNum = Number(m[2]);
    const year = resolveYear(monthNum, m[3] ? Number(m[3]) : null);
    addSafeYmd(year, monthNum, day);
  }

  return [...foundDates].sort();
};

/**
 * Consulta los eventos ocupados en el calendario en un rango amplio de fechas (por defecto 365 días)
 */
const getCalendarBusyRanges = async (aiConfig, startDate, endDate) => {
  try {
    if (!aiConfig || !aiConfig.calendarSyncEnabled) return [];

    const { calendar, calendarId } = getCalendarClient(aiConfig);

    // Iniciar 1 día atrás para cubrir estadías en curso y consultar hasta 365 días hacia adelante
    const defaultStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const defaultEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const timeMin = startDate ? new Date(startDate).toISOString() : defaultStart.toISOString();
    const timeMax = endDate ? new Date(endDate).toISOString() : defaultEnd.toISOString();

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = (response.data.items || []).filter(ev => ev.status !== 'cancelled');
    return items.map(ev => ({
      id: ev.id,
      summary: ev.summary || 'Ocupado',
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      isAllDay: Boolean(ev.start?.date && !ev.start?.dateTime)
    }));
  } catch (error) {
    console.warn('[GoogleCalendar] No se pudieron obtener rangos ocupados:', error.message);
    return [];
  }
};

/**
 * Construye un mapa de ocupación noche por noche y genera el resumen estructurado para el prompt de IA
 */
const buildOccupancyByNight = (busyEvents = []) => {
  const nightsMap = new Map(); // YYYY-MM-DD -> Set('Noire' | 'Blanc' | 'General')

  for (const ev of busyEvents) {
    if (!ev || !ev.start) continue;
    if (isAuxiliaryCalendarNote(ev.summary)) continue;

    const startYmd = toBogotaDateStr(ev.start);
    const endYmd = ev.end ? toBogotaDateStr(ev.end) : addDaysToDateStr(startYmd, 1);
    if (!startYmd) continue;

    const suites = detectEventSuite(ev.summary);

    // En reservas de alojamiento, las noches ocupadas van desde startYmd (Check-in) hasta el día anterior a endYmd (Check-out)
    let cursor = startYmd;
    let safetyCount = 0;
    if (endYmd > startYmd) {
      while (cursor < endYmd && safetyCount < 60) {
        if (!nightsMap.has(cursor)) nightsMap.set(cursor, new Set());
        const set = nightsMap.get(cursor);
        suites.forEach(s => set.add(s));
        cursor = addDaysToDateStr(cursor, 1);
        safetyCount++;
      }
    } else {
      if (!nightsMap.has(startYmd)) nightsMap.set(startYmd, new Set());
      const set = nightsMap.get(startYmd);
      suites.forEach(s => set.add(s));
    }
  }

  return nightsMap;
};

/**
 * Genera el reporte detallado de disponibilidad para inyectar a la IA, destacando las fechas consultadas por el cliente
 */
const formatCalendarAvailabilityForPrompt = (busyEvents = [], { userMessage = '', history = [], aiConfig = null } = {}) => {
  const todayYmd = toBogotaDateStr(new Date());
  const todayHuman = formatHumanDateEs(todayYmd);

  const nightsMap = buildOccupancyByNight(busyEvents);

  // Detectar si el negocio maneja las suites Noire y Blanc
  const promptText = `${aiConfig?.basePrompt || ''} ${aiConfig?.menuContent || ''}`;
  const isNoireBlancHotel = /\bnoire\b/i.test(promptText) && /\bblanc\b/i.test(promptText);

  const describeNightStatus = (ymd) => {
    const occupiedSet = nightsMap.get(ymd) || new Set();
    if (isNoireBlancHotel) {
      const noireBusy = occupiedSet.has('Noire') || occupiedSet.has('General');
      const blancBusy = occupiedSet.has('Blanc') || occupiedSet.has('General');

      if (noireBusy && blancBusy) {
        return {
          fullyBooked: true,
          summaryLine: `❌ SIN DISPONIBILIDAD (Ambas suites: Noire OCUPADA y Blanc OCUPADA)`
        };
      }
      if (noireBusy && !blancBusy) {
        return {
          fullyBooked: false,
          summaryLine: `⚠️ DISPONIBILIDAD PARCIAL: Suite Noire OCUPADA | ✅ Suite Blanc DISPONIBLE`
        };
      }
      if (!noireBusy && blancBusy) {
        return {
          fullyBooked: false,
          summaryLine: `⚠️ DISPONIBILIDAD PARCIAL: Suite Blanc OCUPADA | ✅ Suite Noire DISPONIBLE`
        };
      }
      return {
        fullyBooked: false,
        summaryLine: `✅ TOTALMENTE DISPONIBLE (Suite Noire DISPONIBLE y Suite Blanc DISPONIBLE)`
      };
    }

    if (occupiedSet.size > 0) {
      return {
        fullyBooked: true,
        summaryLine: `❌ OCUPADO (${[...occupiedSet].join(', ')})`
      };
    }
    return {
      fullyBooked: false,
      summaryLine: `✅ DISPONIBLE`
    };
  };

  // Extraer fechas mencionadas en el mensaje actual y en los últimos mensajes de la conversación
  const recentText = [
    ...history.slice(-4).map(m => m.content || ''),
    userMessage || ''
  ].join(' ');
  const extractedDates = extractQueriedDatesFromText(recentText, new Date());
  // Asegurar que siempre se verifique al menos la fecha actual (hoy / esta noche)
  const queriedDates = [...new Set([todayYmd, ...extractedDates])].sort();

  const lines = [];
  lines.push(`📅 FECHA ACTUAL DEL SISTEMA (Colombia): ${todayHuman}`);
  if (isNoireBlancHotel) {
    lines.push(`🏨 UNIDADES DEL ALOJAMIENTO: Este hotel cuenta ÚNICAMENTE con 2 suites en total: Suite Noire y Suite Blanc.`);
    lines.push(`⚠️ REGLA DE OCUPACIÓN POR NOCHE: Cada fecha listada corresponde a la NOCHE de hospedaje (Check-in a las 3:00 PM de ese día y Check-out a las 12:00 PM del día siguiente; o Late Check-out hasta la 1:30 PM en noches de Servicio Premium). Si para una noche tanto Noire como Blanc aparecen OCUPADAS, significa que NO HAY NINGUNA SUITE DISPONIBLE para esa noche.`);
    lines.push(`💵 REGLA INQUEBRANTABLE DE TARIFAS OFICIALES (POR NOCHE Y POR SUITE PARA 2 ADULTOS CON DESAYUNO INCLUIDO):`);
    lines.push(`  1. Tarifa Mínima / Estándar (Domingo a Jueves, cuando el lunes siguiente NO es festivo): $550.000 COP por noche (Check-out 12:00 m.).`);
    lines.push(`  2. Tarifa Servicio Premium (Viernes, Sábado, y Domingo cuando el lunes siguiente ES FESTIVO en Colombia): $750.000 COP por noche (incluye Servicio Premium y Late Check-out hasta la 1:30 p. m.).`);
    lines.push(`  3. PROHIBICIÓN ABSOLUTA: La tarifa mínima del hotel es $550.000 COP. JAMÁS menciones precios de $350.000 ni ningún otro valor diferente a $550.000 o $750.000, y NUNCA escribas el signo "$" sin el número completo al lado.`);
  }

  if (queriedDates.length > 0) {
    lines.push(`\n🎯 VERIFICACIÓN EXACTA DE DISPONIBILIDAD Y TARIFA PARA HOY Y FECHAS CONSULTADAS:`);
    for (const qYmd of queriedDates) {
      const nextYmd = addDaysToDateStr(qYmd, 1);
      const status = describeNightStatus(qYmd);
      const rateInfo = isNoireBlancHotel ? getNoireBlancNightRateInfo(qYmd) : null;
      const rateSuffix = rateInfo ? ` | ${rateInfo.summaryText}` : '';
      lines.push(`  • Noche del ${formatHumanDateEs(qYmd)} [Check-in ${qYmd} -> Check-out ${nextYmd}]: ${status.summaryLine}${rateSuffix}`);

      // Si está totalmente ocupada, buscar las fechas cercanas disponibles para sugerirle al cliente
      if (status.fullyBooked) {
        const nearbyAvailable = [];
        for (let offset of [-2, -1, 1, 2, 3, 4, 7]) {
          const candYmd = addDaysToDateStr(qYmd, offset);
          if (candYmd >= todayYmd) {
            const candStatus = describeNightStatus(candYmd);
            if (!candStatus.fullyBooked) {
              const candRate = isNoireBlancHotel ? getNoireBlancNightRateInfo(candYmd) : null;
              nearbyAvailable.push(`${formatHumanDateEs(candYmd)} (${candStatus.summaryLine}${candRate ? ` - ${candRate.formattedPrice}` : ''})`);
            }
          }
          if (nearbyAvailable.length >= 3) break;
        }
        if (nearbyAvailable.length > 0) {
          lines.push(`    💡 Fechas cercanas con disponibilidad para ofrecer como alternativa: ${nearbyAvailable.join(' | ')}`);
        }
      }
    }
  }

  // Listar todas las noches con ocupación registrada desde hoy en adelante
  const occupiedDatesSorted = [...nightsMap.keys()].filter(d => d >= todayYmd).sort();
  if (occupiedDatesSorted.length > 0) {
    lines.push(`\n📋 REGISTRO DE NOCHES CON OCUPACIÓN EN GOOGLE CALENDAR (Las noches no listadas aquí tienen ambas suites disponibles):`);
    for (const ymd of occupiedDatesSorted.slice(0, 120)) {
      const status = describeNightStatus(ymd);
      lines.push(`  - Noche ${ymd} (${formatHumanDateEs(ymd)}): ${status.summaryLine}`);
    }
  } else {
    lines.push(`\n📋 Actualmente no hay noches ocupadas registradas a partir de hoy (${todayYmd}).`);
  }

  return lines.join('\n');
};

/**
 * Convierte una fecha de entrada/salida (YYYY-MM-DD o ISO) en un Date con la hora oficial de Check-In (15:00) o Check-Out (12:00) en Colombia (-05:00)
 */
const parseHotelBogotaDateTime = (rawDate, defaultHour = 15) => {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  const hStr = String(defaultHour).padStart(2, '0');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T${hStr}:00:00-05:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    const normalized = str.replace(/\s+/, 'T');
    return new Date(`${normalized}:00-05:00`);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Crea un evento de reservación en Google Calendar (validando previamente que no esté totalmente ocupado)
 */
const createReservationEvent = async (aiConfig, reservationData, customerPhone = '') => {
  try {
    if (!aiConfig || !aiConfig.calendarSyncEnabled) {
      return null;
    }

    const { calendar, calendarId } = getCalendarClient(aiConfig);

    const roomType = reservationData.roomType || 'Alojamiento';
    const customerName = reservationData.customerName || 'Cliente';
    const customerOrigin = (reservationData.customerOrigin || '').trim();
    const guestsCount = reservationData.guestsCount || 1;
    const total = reservationData.total || 0;
    const notes = reservationData.notes || '';

    // Determinar fechas de inicio (Check-in 15:00) y fin (Check-out 12:00) en hora de Colombia (-05:00)
    let checkInDate = parseHotelBogotaDateTime(reservationData.checkIn, 15) || new Date();
    let checkOutDate = parseHotelBogotaDateTime(reservationData.checkOut, 12);

    if (!checkOutDate || checkOutDate <= checkInDate) {
      const checkInYmd = toBogotaDateStr(checkInDate);
      const nextDayYmd = addDaysToDateStr(checkInYmd, 1);
      checkOutDate = new Date(`${nextDayYmd}T12:00:00-05:00`);
    }

    // Verificar ocupación antes de crear el evento para evitar sobre-reservas en fechas llenas
    const checkInYmd = toBogotaDateStr(checkInDate);
    const busyEvents = await getCalendarBusyRanges(
      aiConfig,
      new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000),
      new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000)
    );
    const nightsMap = buildOccupancyByNight(busyEvents);
    const occupiedOnCheckIn = nightsMap.get(checkInYmd) || new Set();
    const requestedSuites = detectEventSuite(roomType);

    if (occupiedOnCheckIn.has('Noire') && occupiedOnCheckIn.has('Blanc')) {
      console.warn(`[GoogleCalendar] ⛔ Se bloqueó la creación automática de reserva para ${checkInYmd}: ambas suites (Noire y Blanc) ya están ocupadas.`);
      return null;
    }
    if (requestedSuites.includes('Noire') && occupiedOnCheckIn.has('Noire')) {
      console.warn(`[GoogleCalendar] ⛔ Se bloqueó la creación automática de reserva para ${checkInYmd}: la Suite Noire ya está ocupada.`);
      return null;
    }
    if (requestedSuites.includes('Blanc') && occupiedOnCheckIn.has('Blanc')) {
      console.warn(`[GoogleCalendar] ⛔ Se bloqueó la creación automática de reserva para ${checkInYmd}: la Suite Blanc ya está ocupada.`);
      return null;
    }

    const originSuffix = customerOrigin ? ` - ${customerOrigin}` : '';
    const eventPayload = {
      summary: `Reserva: ${roomType} - ${customerName}${originSuffix}`,
      description: [
        `📌 Reservación confirmada automáticamente vía WhatsApp`,
        `👤 Huésped: ${customerName}`,
        customerOrigin ? `📍 Procedencia: ${customerOrigin}` : '',
        `📱 Teléfono: ${customerPhone}`,
        `🏡 Alojamiento: ${roomType}`,
        `👥 Huéspedes: ${guestsCount}`,
        `💰 Total: $${total.toLocaleString('es-CO')}`,
        notes ? `📝 Notas: ${notes}` : ''
      ].filter(Boolean).join('\n'),
      start: {
        dateTime: checkInDate.toISOString(),
        timeZone: 'America/Bogota'
      },
      end: {
        dateTime: checkOutDate.toISOString(),
        timeZone: 'America/Bogota'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 }
        ]
      }
    };

    const createdEvent = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: eventPayload
    });

    console.log(`[GoogleCalendar] Evento de reservación creado exitosamente: "${eventPayload.summary}" (ID: ${createdEvent.data.id})`);

    return {
      eventId: createdEvent.data.id,
      eventLink: createdEvent.data.htmlLink,
      summary: createdEvent.data.summary,
      start: createdEvent.data.start,
      end: createdEvent.data.end
    };

  } catch (error) {
    console.error('[GoogleCalendar] Error creando evento en Google Calendar:', error.message);
    return null;
  }
};

module.exports = {
  parseServiceAccountCredentials,
  getCalendarClient,
  testCalendarConnection,
  getCalendarBusyRanges,
  buildOccupancyByNight,
  formatCalendarAvailabilityForPrompt,
  extractQueriedDatesFromText,
  createReservationEvent,
  isColombianHoliday,
  getNoireBlancNightRateInfo
};
