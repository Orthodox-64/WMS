import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:"",
      clientEmail:"",
      privateKey:""
    }),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
