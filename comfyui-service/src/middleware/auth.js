/**
 * Firebase Admin Authentication Middleware
 */

import admin from 'firebase-admin';

/**
 * Authenticate Firebase ID token
 */
export async function authenticateFirebase(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();

  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
}

/**
 * Optional authentication (allows both authenticated and anonymous)
 */
export async function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    } else {
      req.user = null; // Anonymous
    }

    next();

  } catch (error) {
    // Allow anonymous if token verification fails
    req.user = null;
    next();
  }
}

export default { authenticateFirebase, authenticateOptional };
