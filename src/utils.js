function encodeCursor(createdAt, id) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');
}

function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.createdAt || !parsed?.id) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

module.exports = { encodeCursor, decodeCursor };