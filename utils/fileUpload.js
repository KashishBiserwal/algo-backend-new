// utils/fileUpload.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadImage = async (file) => {
  const uploadDir = 'public/uploads/images';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(uploadDir, filename);
  
  await fs.promises.writeFile(filepath, file.buffer);
  return `/uploads/images/${filename}`;
};

const uploadFile = async (file) => {
  const uploadDir = 'public/uploads/files';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(uploadDir, filename);
  
  await fs.promises.writeFile(filepath, file.buffer);
  return `/uploads/files/${filename}`;
};

module.exports = { uploadImage, uploadFile };
