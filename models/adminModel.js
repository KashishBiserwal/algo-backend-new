const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'ADMIN',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
