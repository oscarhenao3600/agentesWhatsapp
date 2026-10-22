const Order = require('../models/Order');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const Conversation = require('../models/Conversation');
const BranchAIConfig = require('../models/BranchAIConfig');

// @desc    Obtener estadísticas completas para el Dashboard (KPIs + desglose por negocio y sucursal)
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    let businessQuery = {};
    if (req.user.role !== 'admin') {
      businessQuery.owner = req.user._id;
    }

    const businesses = await Business.find(businessQuery)
      .populate('owner', 'username email')
      .lean();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (businesses.length === 0) {
      return res.json({
        summary: {
          totalBusinesses: 0,
          totalBranches: 0,
          activeBranches: 0,
          connectedBranches: 0,
          ordersToday: 0,
          ordersTotal: 0,
          salesToday: 0,
          salesTotal: 0,
          aiMessagesToday: 0,
          aiMessagesTotal: 0,
          userMessagesToday: 0,
          conversationsToday: 0,
          conversationsTotal: 0,
          conversionToday: 0,
          conversionTotal: 0
        },
        businesses: [],
        recentOrders: [],
        recentConversations: []
      });
    }

    const businessIds = businesses.map(b => b._id);
    const branches = await Branch.find({ business: { $in: businessIds } })
      .select('_id name phone address isActive gatewayType whatsappConnected business')
      .lean();
    const branchIds = branches.map(b => b._id);

    // Optimización Raspberry Pi (bajo consumo de RAM):
    // Excluir textos largos (messages.content, summary, notes) en el escaneo global de métricas
    const [orders, conversations, topRecentConvs] = await Promise.all([
      Order.find({ branch: { $in: branchIds } })
        .select('branch customerName customerPhone total status orderType createdAt items.quantity')
        .populate('branch', 'name business')
        .sort({ createdAt: -1 })
        .lean(),
      Conversation.find({ branch: { $in: branchIds } })
        .select('branch customerNumber customerName emotionalState lastInteraction messages.role messages.timestamp')
        .sort({ lastInteraction: -1 })
        .lean(),
      Conversation.find({ branch: { $in: branchIds } })
        .select('branch customerNumber customerName emotionalState lastInteraction messages')
        .populate('branch', 'name business')
        .sort({ lastInteraction: -1 })
        .limit(15)
        .lean()
    ]);

    // Mapas de métricas por sucursal
    const branchMetricsMap = {};
    branches.forEach(br => {
      branchMetricsMap[br._id.toString()] = {
        _id: br._id,
        name: br.name,
        phone: br.phone,
        city: br.address?.city || '',
        isActive: br.isActive,
        gatewayType: br.gatewayType,
        whatsappConnected: br.whatsappConnected,
        businessId: br.business.toString(),
        ordersToday: 0,
        ordersTotal: 0,
        salesToday: 0,
        salesTotal: 0,
        aiMessagesToday: 0,
        aiMessagesTotal: 0,
        userMessagesToday: 0,
        conversationsToday: 0,
        conversationsTotal: 0,
        orderCustomersToday: new Set(),
        orderCustomersTotal: new Set()
      };
    });

    // Procesar órdenes
    orders.forEach(order => {
      const bId = (order.branch?._id || order.branch)?.toString();
      const bm = branchMetricsMap[bId];
      if (!bm) return;

      const isToday = new Date(order.createdAt) >= startOfToday;
      const isCancelled = order.status === 'cancelled';
      const orderTotal = isCancelled ? 0 : (order.total || 0);
      const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');

      bm.ordersTotal += 1;
      bm.salesTotal += orderTotal;
      if (cleanPhone) bm.orderCustomersTotal.add(cleanPhone);

      if (isToday) {
        bm.ordersToday += 1;
        bm.salesToday += orderTotal;
        if (cleanPhone) bm.orderCustomersToday.add(cleanPhone);
      }
    });

    // Procesar conversaciones y mensajes IA
    conversations.forEach(conv => {
      const bId = (conv.branch?._id || conv.branch)?.toString();
      const bm = branchMetricsMap[bId];
      if (!bm) return;

      bm.conversationsTotal += 1;

      let hadInteractionToday = conv.lastInteraction && new Date(conv.lastInteraction) >= startOfToday;
      const msgs = Array.isArray(conv.messages) ? conv.messages : [];

      msgs.forEach(msg => {
        const msgDate = msg.timestamp ? new Date(msg.timestamp) : null;
        const msgIsToday = msgDate && msgDate >= startOfToday;
        if (msgIsToday) hadInteractionToday = true;

        if (msg.role === 'assistant') {
          bm.aiMessagesTotal += 1;
          if (msgIsToday) bm.aiMessagesToday += 1;
        } else if (msg.role === 'user') {
          if (msgIsToday) bm.userMessagesToday += 1;
        }
      });

      if (hadInteractionToday) {
        bm.conversationsToday += 1;
      }
    });

    // Calcular conversión helper
    const calcConversion = (ordersCount, uniqueOrderCustomersCount, conversationsCount) => {
      if (conversationsCount > 0) {
        // Si hay clientes únicos con pedido, usamos clientes únicos / conversaciones (máx 100%), o pedidos / conversaciones
        const numerator = uniqueOrderCustomersCount > 0 ? uniqueOrderCustomersCount : ordersCount;
        return Math.min(100, Math.round((numerator / conversationsCount) * 1000) / 10);
      }
      if (ordersCount > 0) return 100;
      return 0;
    };

    // Construir desglose por negocio
    let globalOrdersToday = 0;
    let globalOrdersTotal = 0;
    let globalSalesToday = 0;
    let globalSalesTotal = 0;
    let globalAiMessagesToday = 0;
    let globalAiMessagesTotal = 0;
    let globalUserMessagesToday = 0;
    let globalConversationsToday = 0;
    let globalConversationsTotal = 0;
    const globalOrderCustomersToday = new Set();
    const globalOrderCustomersTotal = new Set();

    const businessBreakdown = businesses.map(biz => {
      const bizIdStr = biz._id.toString();
      const bizBranches = Object.values(branchMetricsMap).filter(b => b.businessId === bizIdStr);

      let bizOrdersToday = 0;
      let bizOrdersTotal = 0;
      let bizSalesToday = 0;
      let bizSalesTotal = 0;
      let bizAiMessagesToday = 0;
      let bizAiMessagesTotal = 0;
      let bizUserMessagesToday = 0;
      let bizConversationsToday = 0;
      let bizConversationsTotal = 0;
      const bizOrderCustomersToday = new Set();
      const bizOrderCustomersTotal = new Set();

      const formattedBranches = bizBranches.map(br => {
        bizOrdersToday += br.ordersToday;
        bizOrdersTotal += br.ordersTotal;
        bizSalesToday += br.salesToday;
        bizSalesTotal += br.salesTotal;
        bizAiMessagesToday += br.aiMessagesToday;
        bizAiMessagesTotal += br.aiMessagesTotal;
        bizUserMessagesToday += br.userMessagesToday;
        bizConversationsToday += br.conversationsToday;
        bizConversationsTotal += br.conversationsTotal;

        br.orderCustomersToday.forEach(p => {
          bizOrderCustomersToday.add(`${br._id}_${p}`);
          globalOrderCustomersToday.add(`${br._id}_${p}`);
        });
        br.orderCustomersTotal.forEach(p => {
          bizOrderCustomersTotal.add(`${br._id}_${p}`);
          globalOrderCustomersTotal.add(`${br._id}_${p}`);
        });

        const conversionToday = calcConversion(br.ordersToday, br.orderCustomersToday.size, br.conversationsToday);
        const conversionTotal = calcConversion(br.ordersTotal, br.orderCustomersTotal.size, br.conversationsTotal);

        return {
          _id: br._id,
          name: br.name,
          phone: br.phone,
          city: br.city,
          isActive: br.isActive,
          gatewayType: br.gatewayType,
          whatsappConnected: br.whatsappConnected,
          ordersToday: br.ordersToday,
          ordersTotal: br.ordersTotal,
          salesToday: br.salesToday,
          salesTotal: br.salesTotal,
          aiMessagesToday: br.aiMessagesToday,
          aiMessagesTotal: br.aiMessagesTotal,
          userMessagesToday: br.userMessagesToday,
          conversationsToday: br.conversationsToday,
          conversationsTotal: br.conversationsTotal,
          conversionToday,
          conversionTotal
        };
      });

      globalOrdersToday += bizOrdersToday;
      globalOrdersTotal += bizOrdersTotal;
      globalSalesToday += bizSalesToday;
      globalSalesTotal += bizSalesTotal;
      globalAiMessagesToday += bizAiMessagesToday;
      globalAiMessagesTotal += bizAiMessagesTotal;
      globalUserMessagesToday += bizUserMessagesToday;
      globalConversationsToday += bizConversationsToday;
      globalConversationsTotal += bizConversationsTotal;

      const bizConversionToday = calcConversion(bizOrdersToday, bizOrderCustomersToday.size, bizConversationsToday);
      const bizConversionTotal = calcConversion(bizOrdersTotal, bizOrderCustomersTotal.size, bizConversationsTotal);

      return {
        _id: biz._id,
        name: biz.name,
        description: biz.description,
        commission: biz.commission,
        owner: biz.owner,
        branchesCount: formattedBranches.length,
        activeBranchesCount: formattedBranches.filter(b => b.isActive).length,
        connectedBranchesCount: formattedBranches.filter(b => b.whatsappConnected).length,
        ordersToday: bizOrdersToday,
        ordersTotal: bizOrdersTotal,
        salesToday: bizSalesToday,
        salesTotal: bizSalesTotal,
        aiMessagesToday: bizAiMessagesToday,
        aiMessagesTotal: bizAiMessagesTotal,
        userMessagesToday: bizUserMessagesToday,
        conversationsToday: bizConversationsToday,
        conversationsTotal: bizConversationsTotal,
        conversionToday: bizConversionToday,
        conversionTotal: bizConversionTotal,
        branches: formattedBranches
      };
    });

    const businessMap = {};
    businesses.forEach(b => {
      businessMap[b._id.toString()] = b.name;
    });

    const recentOrders = orders.slice(0, 15).map(o => ({
      _id: o._id,
      customerName: o.customerName || o.customerPhone,
      customerPhone: o.customerPhone,
      total: o.total,
      status: o.status,
      orderType: o.orderType || 'order',
      createdAt: o.createdAt,
      isToday: new Date(o.createdAt) >= startOfToday,
      branchId: o.branch?._id,
      branchName: o.branch?.name || 'Sucursal',
      businessId: o.branch?.business,
      businessName: businessMap[o.branch?.business?.toString()] || 'Negocio',
      itemsCount: Array.isArray(o.items) ? o.items.reduce((acc, it) => acc + (it.quantity || 1), 0) : 0
    }));

    const recentConversations = topRecentConvs.map(c => {
      const msgs = Array.isArray(c.messages) ? c.messages : [];
      const aiCount = msgs.filter(m => m.role === 'assistant').length;
      const aiTodayCount = msgs.filter(m => m.role === 'assistant' && m.timestamp && new Date(m.timestamp) >= startOfToday).length;
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        _id: c._id,
        customerName: c.customerName || c.customerNumber,
        customerNumber: c.customerNumber,
        emotionalState: c.emotionalState || 'neutral',
        lastInteraction: c.lastInteraction,
        isToday: Boolean(c.lastInteraction && new Date(c.lastInteraction) >= startOfToday),
        aiMessagesTotal: aiCount,
        aiMessagesToday: aiTodayCount,
        totalMessages: msgs.length,
        lastMessagePreview: lastMsg && lastMsg.content ? lastMsg.content.slice(0, 90) : '',
        lastMessageRole: lastMsg ? lastMsg.role : '',
        branchId: c.branch?._id,
        branchName: c.branch?.name || 'Sucursal',
        businessId: c.branch?.business,
        businessName: businessMap[c.branch?.business?.toString()] || 'Negocio'
      };
    });

    const summary = {
      totalBusinesses: businesses.length,
      totalBranches: branches.length,
      activeBranches: branches.filter(b => b.isActive).length,
      connectedBranches: branches.filter(b => b.whatsappConnected).length,
      ordersToday: globalOrdersToday,
      ordersTotal: globalOrdersTotal,
      salesToday: globalSalesToday,
      salesTotal: globalSalesTotal,
      aiMessagesToday: globalAiMessagesToday,
      aiMessagesTotal: globalAiMessagesTotal,
      userMessagesToday: globalUserMessagesToday,
      conversationsToday: globalConversationsToday,
      conversationsTotal: globalConversationsTotal,
      conversionToday: calcConversion(globalOrdersToday, globalOrderCustomersToday.size, globalConversationsToday),
      conversionTotal: calcConversion(globalOrdersTotal, globalOrderCustomersTotal.size, globalConversationsTotal)
    };

    res.json({
      summary,
      businesses: businessBreakdown,
      recentOrders,
      recentConversations
    });
  } catch (error) {
    console.error('Error generando estadísticas del dashboard:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard' });
  }
};

// Normalizar número telefónico para cruzar Conversaciones con Pedidos/Reservas
const normalizePhoneKey = (phoneStr) => {
  const digits = String(phoneStr || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
};

// @desc    Obtener reporte de comisiones (Pedidos/Reservas + Conversaciones informativas >= 15 msj IA)
// @route   GET /api/reports/commissions
// @access  Private
exports.getCommissionsReport = async (req, res) => {
  try {
    const { startDate, endDate, status, businessId, branchId } = req.query;

    // 1. Filtrar los negocios dependiendo del rol del usuario
    let businessQuery = {};
    if (req.user.role !== 'admin') {
      businessQuery.owner = req.user._id;
    }
    
    if (businessId) {
      businessQuery._id = businessId;
    }

    const businesses = await Business.find(businessQuery)
      .populate('owner', 'username email')
      .select('_id name description commission owner');
    if (businesses.length === 0) return res.json([]);

    const businessIds = businesses.map(b => b._id);

    // 2. Obtener las sucursales de esos negocios y sus configuraciones de IA
    let branchQuery = { business: { $in: businessIds } };
    if (branchId) {
      branchQuery._id = branchId;
    }
    const branches = await Branch.find(branchQuery).select('_id name phone address business');
    const branchIds = branches.map(b => b._id);

    // Consultar BranchAIConfig proyectando solo los campos necesarios (sin cargar basePrompt, menuContent ni credenciales JSON pesadas en RAM)
    const aiConfigs = await BranchAIConfig.find({ branch: { $in: branchIds } })
      .select('branch apiKey aiProvider aiModel');
    const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const branchAiKeyMap = {};

    aiConfigs.forEach(cfg => {
      const bId = cfg.branch?.toString();
      const rawDecryptedKey = typeof cfg.apiKey === 'string' ? cfg.apiKey.trim() : '';
      const usesOwnAiKey = Boolean(rawDecryptedKey && rawDecryptedKey !== envGeminiKey);
      branchAiKeyMap[bId] = {
        usesOwnAiKey,
        aiProvider: cfg.aiProvider || 'gemini',
        aiModel: cfg.aiModel || 'gemini-flash-lite-latest'
      };
    });

    // Rango de fechas
    let startBound = null;
    let endBound = null;
    if (startDate) {
      startBound = new Date(startDate);
      startBound.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      endBound = new Date(endDate);
      endBound.setHours(23, 59, 59, 999);
    }

    // 3. Preparar los filtros de las órdenes (Order)
    let orderMatch = { branch: { $in: branchIds } };
    const commissionStatusFilter = status || 'pending';
    if (commissionStatusFilter !== 'all') {
      orderMatch.commissionStatus = commissionStatusFilter;
    }
    if (startBound || endBound) {
      orderMatch.createdAt = {};
      if (startBound) orderMatch.createdAt.$gte = startBound;
      if (endBound) orderMatch.createdAt.$lte = endBound;
    }

    // También obtenemos todas las órdenes no canceladas de esas sucursales para identificar qué clientes SÍ cerraron pedido/reserva
    let closedOrdersQuery = {
      branch: { $in: branchIds },
      status: { $ne: 'cancelled' }
    };
    if (startBound || endBound) {
      closedOrdersQuery.createdAt = {};
      if (startBound) closedOrdersQuery.createdAt.$gte = startBound;
      if (endBound) closedOrdersQuery.createdAt.$lte = endBound;
    }

    // 4. Preparar filtro de conversaciones
    let convMatch = { branch: { $in: branchIds } };
    if (commissionStatusFilter === 'pending') {
      convMatch.$or = [
        { commissionStatus: 'pending' },
        { commissionStatus: { $exists: false } }
      ];
    } else if (commissionStatusFilter === 'paid') {
      convMatch.commissionStatus = 'paid';
    }
    if (startBound || endBound) {
      convMatch.lastInteraction = {};
      if (startBound) convMatch.lastInteraction.$gte = startBound;
      if (endBound) convMatch.lastInteraction.$lte = endBound;
    }

    // Optimización Raspberry Pi: proyectar únicamente metadatos de mensajes (role y timestamp), evitando cargar el texto completo de los chats en memoria
    const [filteredOrders, closedOrdersForMatching, conversations] = await Promise.all([
      Order.find(orderMatch)
        .select('branch customerName customerPhone orderType status total commissionAmount commissionStatus createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Order.find(closedOrdersQuery)
        .select('branch customerPhone status createdAt')
        .lean(),
      Conversation.find(convMatch)
        .select('branch customerNumber customerName lastInteraction updatedAt commissionStatus messages.role messages.timestamp')
        .sort({ lastInteraction: -1 })
        .lean()
    ]);

    // Conjunto de clientes (por sucursal) que cerraron al menos un pedido/reserva o venta
    const customersWithClosedOrderByBranch = {};
    closedOrdersForMatching.forEach(ord => {
      const bId = ord.branch?.toString();
      const phoneKey = normalizePhoneKey(ord.customerPhone);
      if (!bId || !phoneKey) return;
      if (!customersWithClosedOrderByBranch[bId]) {
        customersWithClosedOrderByBranch[bId] = new Set();
      }
      customersWithClosedOrderByBranch[bId].add(phoneKey);
    });

    // Agrupar órdenes filtradas por sucursal
    const ordersByBranch = {};
    filteredOrders.forEach(ord => {
      const bId = ord.branch?.toString();
      if (!bId) return;
      if (!ordersByBranch[bId]) ordersByBranch[bId] = [];
      ordersByBranch[bId].push(ord);
    });

    // Agrupar conversaciones filtradas por sucursal
    const conversationsByBranch = {};
    conversations.forEach(conv => {
      const bId = conv.branch?.toString();
      if (!bId) return;
      if (!conversationsByBranch[bId]) conversationsByBranch[bId] = [];
      conversationsByBranch[bId].push(conv);
    });

    const BASE_MSG_THRESHOLD = 15;

    // 5. Construir la estructura jerárquica para la respuesta
    const report = businesses.map(business => {
      const businessBranches = branches.filter(b => b.business.toString() === business._id.toString());
      
      let businessTotalOrders = 0;
      let businessTotalSales = 0;
      let businessOrdersCommission = 0;

      let businessBillableConversations = 0;
      let businessUnderThresholdConversations = 0;
      let businessTotalAiMessagesProcessed = 0;
      let businessBillableBaseMessages = 0;
      let businessBillableExtraMessages = 0;
      let businessBaseConversationsFee = 0;
      let businessExtraMessagesFee = 0;
      let businessConversationsCommission = 0;
      let businessTotalCommission = 0;

      const branchReports = businessBranches.map(branch => {
        const bId = branch._id.toString();
        const keyInfo = branchAiKeyMap[bId] || { usesOwnAiKey: false, aiProvider: 'gemini', aiModel: 'gemini-flash-lite-latest' };
        const usesOwnAiKey = keyInfo.usesOwnAiKey;

        // Tarifas según si el cliente tiene clave de IA propia o usa la del sistema
        const baseRate15 = usesOwnAiKey ? 400 : 1000;
        const extraMsgRate = usesOwnAiKey ? 80 : 100;

        // A. Estadísticas de órdenes de la sucursal
        const branchOrders = ordersByBranch[bId] || [];
        const totalOrders = branchOrders.length;
        const totalSales = branchOrders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0);
        const ordersCommission = branchOrders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? (o.commissionAmount || 0) : 0), 0);

        // B. Estadísticas de conversaciones sin cierre de venta/pedido/reservación
        const branchConvs = conversationsByBranch[bId] || [];
        const closedCustomersSet = customersWithClosedOrderByBranch[bId] || new Set();

        let billableConversationsCount = 0;
        let underThresholdConversationsCount = 0;
        let underThresholdAiMessagesCount = 0;
        let convertedConversationsCount = 0;
        let totalAiMessagesProcessed = 0;
        let baseAiMessagesCount = 0;
        let extraAiMessagesCount = 0;
        let baseConversationsFee = 0;
        let extraMessagesFee = 0;

        const billableConversationsList = [];
        const nonBillableConversationsList = [];

        branchConvs.forEach(conv => {
          const phoneKey = normalizePhoneKey(conv.customerNumber);
          const hasClosedOrder = phoneKey && closedCustomersSet.has(phoneKey);

          const msgs = Array.isArray(conv.messages) ? conv.messages : [];
          // Filtrar mensajes tramitados por la IA (assistant) dentro del rango de fechas si aplica
          const aiMsgs = msgs.filter(m => {
            if (m.role !== 'assistant') return false;
            if (startBound || endBound) {
              const mDate = m.timestamp ? new Date(m.timestamp) : new Date(conv.lastInteraction || conv.updatedAt);
              if (startBound && mDate < startBound) return false;
              if (endBound && mDate > endBound) return false;
            }
            return true;
          });

          const aiCount = aiMsgs.length;
          totalAiMessagesProcessed += aiCount;

          if (hasClosedOrder) {
            convertedConversationsCount += 1;
            return;
          }

          if (aiCount >= BASE_MSG_THRESHOLD) {
            const baseMsgs = BASE_MSG_THRESHOLD;
            const extraMsgs = aiCount - BASE_MSG_THRESHOLD;
            const convBaseFee = baseRate15;
            const convExtraFee = extraMsgs * extraMsgRate;
            const convTotalFee = convBaseFee + convExtraFee;

            billableConversationsCount += 1;
            baseAiMessagesCount += baseMsgs;
            extraAiMessagesCount += extraMsgs;
            baseConversationsFee += convBaseFee;
            extraMessagesFee += convExtraFee;

            billableConversationsList.push({
              conversationId: conv._id,
              customerNumber: conv.customerNumber,
              customerName: conv.customerName || conv.customerNumber,
              lastInteraction: conv.lastInteraction,
              commissionStatus: conv.commissionStatus || 'pending',
              aiMessagesCount: aiCount,
              baseMessages: baseMsgs,
              extraMessages: extraMsgs,
              baseFee: convBaseFee,
              extraFee: convExtraFee,
              totalFee: convTotalFee
            });
          } else if (aiCount > 0) {
            underThresholdConversationsCount += 1;
            underThresholdAiMessagesCount += aiCount;
            nonBillableConversationsList.push({
              conversationId: conv._id,
              customerNumber: conv.customerNumber,
              customerName: conv.customerName || conv.customerNumber,
              lastInteraction: conv.lastInteraction,
              aiMessagesCount: aiCount,
              remainingToThreshold: BASE_MSG_THRESHOLD - aiCount
            });
          }
        });

        const conversationsCommission = baseConversationsFee + extraMessagesFee;
        const totalCommission = ordersCommission + conversationsCommission;

        businessTotalOrders += totalOrders;
        businessTotalSales += totalSales;
        businessOrdersCommission += ordersCommission;

        businessBillableConversations += billableConversationsCount;
        businessUnderThresholdConversations += underThresholdConversationsCount;
        businessTotalAiMessagesProcessed += totalAiMessagesProcessed;
        businessBillableBaseMessages += baseAiMessagesCount;
        businessBillableExtraMessages += extraAiMessagesCount;
        businessBaseConversationsFee += baseConversationsFee;
        businessExtraMessagesFee += extraMessagesFee;
        businessConversationsCommission += conversationsCommission;
        businessTotalCommission += totalCommission;

        return {
          branchId: branch._id,
          branchName: branch.name,
          branchPhone: branch.phone,
          branchCity: branch.address?.city || '',
          usesOwnAiKey,
          aiKeyModeLabel: usesOwnAiKey
            ? 'Clave IA Propia del Cliente (Costo por servicio)'
            : 'IA por Defecto del Sistema',
          aiProvider: keyInfo.aiProvider,
          aiModel: keyInfo.aiModel,
          pricingRates: {
            thresholdMessages: BASE_MSG_THRESHOLD,
            baseRate15,
            extraMsgRate
          },
          totalOrders,
          totalSales,
          ordersCommission,
          ordersDetail: branchOrders.map(o => ({
            orderId: o._id,
            customerName: o.customerName || o.customerPhone,
            customerPhone: o.customerPhone,
            orderType: o.orderType || 'order',
            status: o.status,
            total: o.total || 0,
            commissionAmount: o.commissionAmount || 0,
            createdAt: o.createdAt
          })),
          totalAiMessagesProcessed,
          convertedConversationsCount,
          billableConversationsCount,
          underThresholdConversationsCount,
          underThresholdAiMessagesCount,
          baseAiMessagesCount,
          extraAiMessagesCount,
          baseConversationsFee,
          extraMessagesFee,
          conversationsCommission,
          billableConversations: billableConversationsList,
          underThresholdConversations: nonBillableConversationsList,
          totalCommission
        };
      });

      return {
        businessId: business._id,
        businessName: business.name,
        businessDescription: business.description || '',
        ownerName: business.owner?.username || 'Cliente',
        ownerEmail: business.owner?.email || '',
        commissionRate: business.commission,
        totalOrders: businessTotalOrders,
        totalSales: businessTotalSales,
        ordersCommission: businessOrdersCommission,
        billableConversationsCount: businessBillableConversations,
        underThresholdConversationsCount: businessUnderThresholdConversations,
        totalAiMessagesProcessed: businessTotalAiMessagesProcessed,
        baseAiMessagesCount: businessBillableBaseMessages,
        extraAiMessagesCount: businessBillableExtraMessages,
        baseConversationsFee: businessBaseConversationsFee,
        extraMessagesFee: businessExtraMessagesFee,
        conversationsCommission: businessConversationsCommission,
        totalCommission: businessTotalCommission,
        branches: branchReports
      };
    });

    // Si se filtró un negocio específico, siempre mostrarlo; si se listan todos, mostrar los que tengan actividad o cuando el filtro sea 'all'
    const activeReport = businessId
      ? report
      : report.filter(
          r =>
            r.totalCommission > 0 ||
            r.totalOrders > 0 ||
            r.totalAiMessagesProcessed > 0 ||
            commissionStatusFilter === 'all'
        );

    res.json(activeReport);
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ message: 'Error al generar el reporte de comisiones' });
  }
};

// @desc    Marcar órdenes y conversaciones facturables como pagadas
// @route   PUT /api/reports/commissions/mark-paid
// @access  Private/Admin
exports.markCommissionsAsPaid = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { branchId, businessId, startDate, endDate } = req.body;

    let branchFilter = {};
    if (branchId) {
      branchFilter = branchId;
    } else if (businessId) {
      const branches = await Branch.find({ business: businessId });
      branchFilter = { $in: branches.map(b => b._id) };
    } else {
      return res.status(400).json({ message: 'Debe especificar un branchId o businessId' });
    }

    let orderQuery = {
      branch: branchFilter,
      commissionStatus: 'pending'
    };

    let convQuery = {
      branch: branchFilter,
      $or: [
        { commissionStatus: 'pending' },
        { commissionStatus: { $exists: false } }
      ]
    };

    if (startDate || endDate) {
      orderQuery.createdAt = {};
      convQuery.lastInteraction = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        orderQuery.createdAt.$gte = start;
        convQuery.lastInteraction.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        orderQuery.createdAt.$lte = end;
        convQuery.lastInteraction.$lte = end;
      }
    }

    const [orderResult, convResult] = await Promise.all([
      Order.updateMany(orderQuery, { $set: { commissionStatus: 'paid' } }),
      Conversation.updateMany(convQuery, { $set: { commissionStatus: 'paid' } })
    ]);

    res.json({
      message: 'Comisiones de pedidos y conversaciones marcadas como pagadas',
      modifiedOrdersCount: orderResult.modifiedCount,
      modifiedConversationsCount: convResult.modifiedCount,
      modifiedCount: (orderResult.modifiedCount || 0) + (convResult.modifiedCount || 0)
    });
  } catch (error) {
    console.error('Error actualizando comisiones:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de las comisiones' });
  }
};
