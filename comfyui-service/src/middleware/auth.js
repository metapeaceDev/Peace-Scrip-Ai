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
  console.log('🔐 Auth middleware START');
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🔐 Verifying Firebase token...');
      const idToken = authHeader.split('Bearer ')[1];
      
      // Add timeout to Firebase verification
      const verifyPromise = admin.auth().verifyIdToken(idToken);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase verification timeout')), 5000)
      );
      
      const decodedToken = await Promise.race([verifyPromise, timeoutPromise]);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
      console.log('🔐 Token verified:', req.user.email);
    } else {
      console.log('🔐 No token - anonymous access');
      req.user = null; // Anonymous
    }

    console.log('🔐 Auth middleware END - calling next()');
    next();

  } catch (error) {
    console.log('🔐 Auth error:', error.message, '- allowing anonymous');
    // Allow anonymous if token verification fails
    req.user = null;
    next();
  }
}

export default { authenticateFirebase, authenticateOptional };
