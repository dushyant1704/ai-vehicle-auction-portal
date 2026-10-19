const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

exports.createPaymentIntent = async (req, res) => {
  try {
    const payerId = req.user.id || req.user._id;
    const { auctionId, payeeId, amount, provider = "escrow" } = req.body;

    const payment = await Payment.create({
      auctionId,
      payerId,
      payeeId,
      amount,
      provider,
      paymentIntentId: `pi_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      status: "escrow_held"
    });

    await Transaction.create({
      userId: payerId,
      amount: -amount,
      type: "escrow_hold",
      referenceId: payment._id.toString(),
      description: `Held in escrow for auction #${auctionId}`
    });

    res.json({ success: true, payment, message: "Payment held in escrow successfully" });
  } catch (err) {
    res.status(500).json({ error: "Payment creation failed", details: err.message });
  }
};

exports.releaseEscrow = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: "Payment record not found" });

    payment.status = "captured";
    await payment.save();

    await Transaction.create({
      userId: payment.payeeId,
      amount: payment.amount,
      type: "escrow_release",
      referenceId: payment._id.toString(),
      description: `Escrow released for auction #${payment.auctionId}`
    });

    await User.findByIdAndUpdate(payment.payeeId, { $inc: { walletBalance: payment.amount } });

    res.json({ success: true, payment, message: "Escrow funds released to seller" });
  } catch (err) {
    res.status(500).json({ error: "Failed to release escrow", details: err.message });
  }
};
