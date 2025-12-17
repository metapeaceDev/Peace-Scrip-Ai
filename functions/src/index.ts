import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

/**
 * Cloud Function เป็น Proxy สำหรับ Replicate API
 * แก้ปัญหา CORS เมื่อเรียก API จาก Browser
 */
export const replicateProxy = functions.https.onCall(async (data, context) => {
  // ตรวจสอบ Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to use this function'
    );
  }

  const { endpoint, method = 'POST', body } = data;

  // ตรวจสอบ REPLICATE_API_TOKEN - ใช้ environment variable แทน functions.config()
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Replicate API token not configured'
    );
  }

  try {
    const response = await fetch(`https://api.replicate.com${endpoint}`, {
      method,
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Replicate proxy error:', error);
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

/**
 * Cloud Function สำหรับตรวจสอบสถานะการสร้างวิดีโอ
 */
export const checkReplicateStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated'
    );
  }

  const { predictionId } = data;

  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Replicate API token not configured'
    );
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          'Authorization': `Token ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Check status error:', error);
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
