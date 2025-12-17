"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReplicateStatus = exports.replicateProxy = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
/**
 * Cloud Function เป็น Proxy สำหรับ Replicate API
 * แก้ปัญหา CORS เมื่อเรียก API จาก Browser
 */
exports.replicateProxy = functions.https.onCall(async (data, context) => {
    // ตรวจสอบ Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to use this function');
    }
    const { endpoint, method = 'POST', body } = data;
    // ตรวจสอบ REPLICATE_API_TOKEN - ใช้ environment variable แทน functions.config()
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new functions.https.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    try {
        const response = await (0, node_fetch_1.default)(`https://api.replicate.com${endpoint}`, {
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
    }
    catch (error) {
        console.error('Replicate proxy error:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Cloud Function สำหรับตรวจสอบสถานะการสร้างวิดีโอ
 */
exports.checkReplicateStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { predictionId } = data;
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
        throw new functions.https.HttpsError('failed-precondition', 'Replicate API token not configured');
    }
    try {
        const response = await (0, node_fetch_1.default)(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                'Authorization': `Token ${apiToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        return { success: true, data: result };
    }
    catch (error) {
        console.error('Check status error:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Unknown error');
    }
});
//# sourceMappingURL=index.js.map