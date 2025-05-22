const mongoose = require('mongoose');


const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,

  },
  name: {
    type: String,
    required: true,

  },
  forgetPasswordCode: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});



adminUserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const AdminUser = mongoose.model('AdminUser', adminUserSchema);
module.exports = AdminUser;
