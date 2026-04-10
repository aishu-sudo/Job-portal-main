const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    // From form fields
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    jobType: {
        type: String,
        required: [true, 'Job type is required'],
        enum: {
            values: ['full-time', 'part-time', 'contract', 'freelance'],
            message: 'Invalid job type'
        }
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    salaryRange: {
        min: {
            type: Number,
            min: [0, 'Minimum salary must be at least 0']
        },
        max: {
            type: Number,
            validate: {
                validator: function(value) {
                    return value >= this.salaryRange.min;
                },
                message: 'Max salary must be greater than min salary'
            }
        },
        period: {
            type: String,
            enum: ['year', 'month', 'hour', 'project'],
            default: 'year'
        }
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
        trim: true,
        minlength: [50, 'Description must be at least 50 characters long']
    },
    skills: {
        type: [String],
        required: [true, 'At least one skill is required'],
        validate: {
            validator: function(skills) {
                return skills.length > 0;
            },
            message: 'At least one skill is required'
        }
    },

    // Additional fields from your existing model
    category: {
        type: String,
        enum: ['web-development', 'design', 'marketing', 'writing', 'other'],
        default: 'other'
    },
    language: {
        type: String,
        default: 'English'
    },
    isTopRated: {
        type: Boolean,
        default: false
    },

    // Relationships and timestamps
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicants: [{
        freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proposal: String,
        bidAmount: Number,
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['open', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

// Update the updatedAt field before saving
jobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add text index for search functionality
jobSchema.index({
    title: 'text',
    description: 'text',
    skills: 'text',
    company: 'text'
});

module.exports = mongoose.model('Job', jobSchema);