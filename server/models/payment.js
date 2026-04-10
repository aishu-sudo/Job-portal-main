const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Common fields
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['client_payment', 'freelancer_payout'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Client payment specific fields
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'client_payment';
        }
    },
    freelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'client_payment';
        }
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: function() {
            return this.type === 'client_payment';
        }
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'venmo'],
        required: function() {
            return this.type === 'client_payment';
        }
    },
    paymentDetails: {
        // For card payments
        cardLast4: String,
        cardBrand: String,
        cardHolderName: String,
        // For PayPal
        paypalEmail: String,
        paypalTransactionId: String,
        // For Venmo
        venmoUsername: String,
        venmoTransactionId: String
    },
    saveCard: {
        type: Boolean,
        default: false
    },

    // Freelancer payout specific fields
    payoutMethod: {
        type: String,
        enum: ['bank', 'paypal', 'venmo'],
        required: function() {
            return this.type === 'freelancer_payout';
        }
    },
    payoutDetails: {
        // For bank transfers
        bankName: String,
        routingNumber: String,
        accountNumber: String,
        accountType: {
            type: String,
            enum: ['checking', 'savings']
        },
        accountHolderName: String,
        // For PayPal
        paypalEmail: String,
        // For Venmo
        venmoUsername: String
    },
    payoutStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    payoutDate: Date,
    transactionId: String,
    errorMessage: String
});

// Indexes for better query performance
paymentSchema.index({ clientId: 1, createdAt: -1 });
paymentSchema.index({ freelancerId: 1, createdAt: -1 });
paymentSchema.index({ projectId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });

// Pre-save middleware to update the updatedAt field
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to create a client payment
paymentSchema.statics.createClientPayment = async function(paymentData) {
    const payment = new this({
        type: 'client_payment',
        amount: paymentData.amount,
        clientId: paymentData.clientId,
        freelancerId: paymentData.freelancerId,
        projectId: paymentData.projectId,
        paymentMethod: paymentData.paymentMethod,
        paymentDetails: paymentData.paymentDetails,
        saveCard: paymentData.saveCard || false
    });
    return await payment.save();
};

// Static method to create a freelancer payout
paymentSchema.statics.createFreelancerPayout = async function(payoutData) {
    const payout = new this({
        type: 'freelancer_payout',
        amount: payoutData.amount,
        freelancerId: payoutData.freelancerId,
        payoutMethod: payoutData.payoutMethod,
        payoutDetails: payoutData.payoutDetails
    });
    return await payout.save();
};

// Instance method to update payment status
paymentSchema.methods.updateStatus = async function(newStatus, errorMessage = null) {
    this.status = newStatus;
    if (errorMessage) {
        this.errorMessage = errorMessage;
    }
    return await this.save();
};

// Instance method to update payout status
paymentSchema.methods.updatePayoutStatus = async function(newStatus, transactionId = null) {
    this.payoutStatus = newStatus;
    if (transactionId) {
        this.transactionId = transactionId;
    }
    if (newStatus === 'completed') {
        this.payoutDate = Date.now();
    }
    return await this.save();
};

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;