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

/**
 * Consulta los eventos ocupados en el calendario en un rango de fechas
 */
const getCalendarBusyRanges = async (aiConfig, startDate, endDate) => {
  try {
    if (!aiConfig || !aiConfig.calendarSyncEnabled) return [];

    const { calendar, calendarId } = getCalendarClient(aiConfig);

    const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
    const timeMax = endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = response.data.items || [];
    return items.map(ev => ({
      id: ev.id,
      summary: ev.summary || 'Ocupado',
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date
    }));
  } catch (error) {
    console.warn('[GoogleCalendar] No se pudieron obtener rangos ocupados:', error.message);
    return [];
  }
};

/**
 * Crea un evento de reservación en Google Calendar
 */
const createReservationEvent = async (aiConfig, reservationData, customerPhone = '') => {
  try {
    if (!aiConfig || !aiConfig.calendarSyncEnabled) {
      return null;
    }

    const { calendar, calendarId } = getCalendarClient(aiConfig);

    const roomType = reservationData.roomType || 'Alojamiento';
    const customerName = reservationData.customerName || 'Cliente';
    const guestsCount = reservationData.guestsCount || 1;
    const total = reservationData.total || 0;
    const notes = reservationData.notes || '';

    // Determinar fechas de inicio y fin
    let checkInDate = reservationData.checkIn ? new Date(reservationData.checkIn) : new Date();
    if (isNaN(checkInDate.getTime())) checkInDate = new Date();

    let checkOutDate = reservationData.checkOut ? new Date(reservationData.checkOut) : new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);
    if (isNaN(checkOutDate.getTime())) checkOutDate = new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);

    // Si checkOut es igual o anterior a checkIn, sumar 1 día
    if (checkOutDate <= checkInDate) {
      checkOutDate = new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const eventPayload = {
      summary: `Reserva: ${roomType} - ${customerName}`,
      description: [
        `📌 Reservación confirmada automáticamente vía WhatsApp`,
        `👤 Huésped: ${customerName}`,
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
  createReservationEvent
};
