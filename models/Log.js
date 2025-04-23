const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['login', 'logout', 'add_content', 'delete_content', 'create_profile', 'delete_profile', 'add_to_list', 'remove_from_list', 'add_review', 'delete_review']
    },
    details: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});
// Index for faster queries
logSchema.index({ timestamp: -1 });
logSchema.index({ user: 1, timestamp: -1 });
// Add virtual for formatted timestamp
logSchema.virtual('formattedTimestamp').get(function() {
    return this.timestamp.toLocaleString();
});
// Ensure virtuals are included when converting to JSON
logSchema.set('toJSON', { virtuals: true });
logSchema.set('toObject', { virtuals: true });
module.exports = mongoose.model('Log', logSchema);