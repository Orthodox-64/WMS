import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

if (!getApps().length) {
  initializeApp({
    credential: cert({
   
    } as any),
  });
}

export async function POST(request: Request) {
  try {
    const { uid, role } = await request.json();
    
    // Set custom claims for the user
    await getAuth().setCustomUserClaims(uid, { 
      role: role,
      // Add a timestamp to force token refresh
      updatedAt: Date.now()
    });

    // Force token refresh by revoking all refresh tokens
    await getAuth().revokeRefreshTokens(uid);

    // Get the updated user to verify the claims
    const user = await getAuth().getUser(uid);
    const customClaims = user.customClaims || {};

    if (customClaims.role !== role) {
      throw new Error('Failed to verify role update');
    }

    return NextResponse.json({ 
      success: true,
      message: `Role ${role} set successfully for user ${uid}`,
      claims: customClaims
    });
  } catch (error: any) {
    console.error('Error setting role:', error);
    return NextResponse.json({ 
      error: 'Failed to set role',
      details: error.message 
    }, { status: 500 });
  }
} 