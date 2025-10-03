export function extractUserIdFromToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required');
  }

  try {
    const token = authorizationHeader.split(' ')[1];
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = decoded.sub || decoded.user_id || decoded['cognito:username'];
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    return userId;
  } catch (error) {
    throw new Error('Invalid authorization token');
  }
}