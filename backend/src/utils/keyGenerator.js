const { v4: uuid } = require('uuid');

function generateS3Key(className, fileType, originalFilename) {
  const sanitizedClass    = className.toLowerCase().replace(/\s+/g, '-');
  const sanitizedType     = fileType.toLowerCase();
  const sanitizedFilename = originalFilename.toLowerCase().replace(/\s+/g, '-');
  return `classes/${sanitizedClass}/${sanitizedType}/${uuid()}-${sanitizedFilename}`;
}

module.exports = { generateS3Key };
