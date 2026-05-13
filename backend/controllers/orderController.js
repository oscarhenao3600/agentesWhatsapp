const Order = require('../models/Order');

exports.getBranchOrders = async (req, res) => {
  try {
    const orders = await Order.find({ branch: req.params.branchId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getBusinessOrders = async (req, res) => {
  try {
    // Primero encontrar las sucursales del negocio
    const Branch = require('../models/Branch');
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
