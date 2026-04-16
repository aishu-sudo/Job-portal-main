const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    freelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: ['client_payment', 'freelancer_payout'],
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    errorMessage: {
        type: String,
        default: null
    },
    transactionId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

paymentSchema.statics.createClientPayment = function(data) {
    return this.create({
        ...data,
        type: 'client_payment'
    });
};

paymentSchema.statics.createFreelancerPayout = function(data) {
    return this.create({
        ...data,
        type: 'freelancer_payout'
    });
};

paymentSchema.methods.updateStatus = function(status, errorMessage) {
    this.status = status;
    if (errorMessage) {
        this.errorMessage = errorMessage;
    }
    return this.save();
};

paymentSchema.methods.updatePayoutStatus = function(status, transactionId) {
    this.status = status;
    if (transactionId) {
        this.transactionId = transactionId;
    }
    return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);