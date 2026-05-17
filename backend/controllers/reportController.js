const Order = require('../models/Order');
const Business = require('../models/Business');
const Branch = require('../models/Branch');

// @desc    Obtener reporte de comisiones
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

    const businesses = await Business.find(businessQuery).select('_id name commission');
    if (businesses.length === 0) return res.json([]);

    const businessIds = businesses.map(b => b._id);

    // 2. Obtener las sucursales de esos negocios
    let branchQuery = { business: { $in: businessIds } };
    if (branchId) {
      branchQuery._id = branchId;
    }
    const branches = await Branch.find(branchQuery).select('_id name business');
    const branchIds = branches.map(b => b._id);

    // 3. Preparar los filtros de las órdenes (Order)
    let orderMatch = { branch: { $in: branchIds } };

    // Filtro por estado de comisión (por defecto pending si no se especifica 'all')
    const commissionStatusFilter = status || 'pending';
    if (commissionStatusFilter !== 'all') {
      orderMatch.commissionStatus = commissionStatusFilter;
    }

    // Filtro por fechas
    if (startDate || endDate) {
      orderMatch.createdAt = {};
      if (startDate) orderMatch.createdAt.$gte = new Date(startDate);
      if (endDate) {
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Hasta el final del día
        orderMatch.createdAt.$lte = end;
      }
    }

    // 4. Agregación para sumar totales por sucursal
    const orderStats = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: "$branch",
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$total" },
          totalCommission: { $sum: "$commissionAmount" }
        }
      }
    ]);

    // 5. Construir la estructura jerárquica para la respuesta
    const report = businesses.map(business => {
      // Filtrar sucursales de este negocio
      const businessBranches = branches.filter(b => b.business.toString() === business._id.toString());
      
      let businessTotalOrders = 0;
      let businessTotalSales = 0;
      let businessTotalCommission = 0;

      const branchReports = businessBranches.map(branch => {
        // Buscar estadísticas de esta sucursal
        const stat = orderStats.find(s => s._id.toString() === branch._id.toString());
        
        const totalOrders = stat ? stat.totalOrders : 0;
        const totalSales = stat ? stat.totalSales : 0;
        const totalCommission = stat ? stat.totalCommission : 0;

        businessTotalOrders += totalOrders;
        businessTotalSales += totalSales;
        businessTotalCommission += totalCommission;

        return {
          branchId: branch._id,
          branchName: branch.name,
          totalOrders,
          totalSales,
          totalCommission
        };
      });

      return {
        businessId: business._id,
        businessName: business.name,
        commissionRate: business.commission,
        totalOrders: businessTotalOrders,
        totalSales: businessTotalSales,
        totalCommission: businessTotalCommission,
        branches: branchReports
      };
    });

    // Remover negocios que no tengan ningún pedido si es que se está filtrando (opcional, por limpieza visual)
    const activeReport = report.filter(r => r.totalOrders > 0 || commissionStatusFilter === 'all');

    res.json(activeReport);
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ message: 'Error al generar el reporte de comisiones' });
  }
};

// @desc    Marcar órdenes como pagadas
// @route   PUT /api/reports/commissions/mark-paid
// @access  Private/Admin
exports.markCommissionsAsPaid = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { branchId, businessId, startDate, endDate } = req.body;

    let query = { commissionStatus: 'pending' };

    // Si se envía branchId, actualiza esa sucursal
    if (branchId) {
      query.branch = branchId;
    } 
    // Si se envía solo businessId, primero buscamos sus sucursales
    else if (businessId) {
      const branches = await Branch.find({ business: businessId });
      query.branch = { $in: branches.map(b => b._id) };
    } else {
      return res.status(400).json({ message: 'Debe especificar un branchId o businessId' });
    }

    // Aplicar filtros de fecha si existen (para no marcar las nuevas que hayan entrado justo ahora)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const result = await Order.updateMany(query, { $set: { commissionStatus: 'paid' } });

    res.json({ message: 'Comisiones marcadas como pagadas', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error actualizando comisiones:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de las comisiones' });
  }
};
