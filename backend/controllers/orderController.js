const Order = require('../models/Order');
const Branch = require('../models/Branch');
const Business = require('../models/Business');

const validateBusinessAccess = async (user, businessId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const business = await Business.findById(businessId);
  if (!business) return false;
  return business.owner.toString() === user._id.toString();
};

const validateBranchAccess = async (user, branchId) => {
  if (!user) return false;
  const branch = await Branch.findById(branchId);
  if (!branch) return false;
  if (user.role === 'admin') return true;
  return validateBusinessAccess(user, branch.business);
};

exports.getBranchOrders = async (req, res) => {
  try {
    const hasAccess = await validateBranchAccess(req.user, req.params.branchId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para ver los pedidos de esta sucursal' });
    }

    const orders = await Order.find({ branch: req.params.branchId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const hasAccess = await validateBranchAccess(req.user, existingOrder.branch);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para modificar este pedido' });
    }

    const { status } = req.body;
    existingOrder.status = status;
    const order = await existingOrder.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getBusinessOrders = async (req, res) => {
  try {
    const hasAccess = await validateBusinessAccess(req.user, req.params.businessId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'No tienes permisos para ver los pedidos de este negocio' });
    }

    // Primero encontrar las sucursales del negocio
    const branches = await Branch.find({ business: req.params.businessId });
    const branchIds = branches.map(b => b._id);

    const orders = await Order.find({ branch: { $in: branchIds } })
      .populate('branch', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
