const Branch = require('../models/Branch');
const BranchAIConfig = require('../models/BranchAIConfig');

exports.createBranch = async (req, res) => {
  try {
    const { businessId, name, phone, whatsappNumberId, whatsappVerifyToken, accessToken, basePrompt } = req.body;

    const branch = new Branch({
      business: businessId,
      name,
      phone,
      whatsappNumberId,
      whatsappVerifyToken,
      accessToken
    });

    await branch.save();

    // Crear configuración de IA por defecto para la sucursal
    const aiConfig = new BranchAIConfig({
      branch: branch._id,
      basePrompt: basePrompt || `Eres un asistente virtual para ${name}.`
    });

    await aiConfig.save();

    res.status(201).json({ branch, aiConfig });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getBusinessBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ business: req.params.businessId });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBranchDetails = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    const aiConfig = await BranchAIConfig.findOne({ branch: req.params.id });
    res.json({ branch, aiConfig });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBranchAI = async (req, res) => {
  try {
    const aiConfig = await BranchAIConfig.findOneAndUpdate(
      { branch: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    res.json(aiConfig);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
