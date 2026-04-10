const mongoose = require('mongoose');
const { Schema } = mongoose;


const applicationSchema = new Schema({
    jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobTitle: {
        type: String,
        required: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    applicantId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be null if applicant isn't registered
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        match: [/.+\@.+\..+/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: false
    },
    resume: {
        filename: {
            type: String,
            required: [true, 'Resume is required']
        },
        path: {
            type: String,
            required: [true, 'Resume path is required']
        }
    },
    portfolio: {
        type: String,
        required: false,
        match: [/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'Please enter a valid URL']
    },
    coverLetter: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['submitted', 'under-review', 'shortlisted', 'rejected', 'hired'],
        default: 'submitted'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ applicantId: 1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ status: 1 });

// Pre-save hook to update lastUpdated
applicationSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Static method to get applications by job
applicationSchema.statics.findByJobId = function(jobId) {
    return this.find({ jobId }).sort({ applicationDate: -1 });
};

// Static method to get applications by applicant
applicationSchema.statics.findByApplicant = function(applicantId) {
    return this.find({ applicantId }).sort({ applicationDate: -1 });
};

// Instance method to get application status
applicationSchema.methods.getStatus = function() {
    return this.status;
};

// Create the model
const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;