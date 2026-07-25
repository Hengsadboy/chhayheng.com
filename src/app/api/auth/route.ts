import { NextResponse } from 'next/server';
import { getUsers, saveUsers, ADMIN_AUTH, User, getVerifications, saveVerifications, Verification } from '@/lib/db';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

// Helper to generate a 6 digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, code, username, phone } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const users = getUsers();
    const verifications = getVerifications();

    // 1. Admin login
    if (action === 'signin' && emailLower === ADMIN_AUTH.email.toLowerCase() && password === ADMIN_AUTH.password) {
      return NextResponse.json({
        success: true,
        user: { email: ADMIN_AUTH.email, role: 'admin' }
      });
    }

    // 2. Send Signup Verification Code
    if (action === 'send-signup-code') {
      const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email is already registered.' }, { status: 400 });
      }

      const vCode = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins
      
      // Clean up old codes for this email and type
      const updatedVerifications = verifications.filter(v => !(v.email.toLowerCase() === emailLower && v.type === 'signup'));
      updatedVerifications.push({ email: emailLower, code: vCode, type: 'signup', expiresAt });
      saveVerifications(updatedVerifications);

      await sendVerificationEmail(emailLower, vCode);
      return NextResponse.json({ success: true, message: 'Verification code sent.' });
    }

    // 3. Verify Signup & Create User
    if (action === 'signup') {
      if (!password || !code) return NextResponse.json({ success: false, message: 'Password and code required.' }, { status: 400 });

      const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
      if (existingUser) return NextResponse.json({ success: false, message: 'Email is already registered.' }, { status: 400 });

      const vRecord = verifications.find(v => v.email.toLowerCase() === emailLower && v.type === 'signup' && v.code === code);
      if (!vRecord) return NextResponse.json({ success: false, message: 'Invalid or missing verification code.' }, { status: 400 });
      if (new Date(vRecord.expiresAt) < new Date()) return NextResponse.json({ success: false, message: 'Verification code expired.' }, { status: 400 });

      const newUser: User = { 
        email: emailLower, 
        passwordHash: password, 
        role: 'customer',
        username: username || '',
        phone: phone || ''
      };
      users.push(newUser);
      saveUsers(users);

      // Clean up verification code
      saveVerifications(verifications.filter(v => v !== vRecord));

      return NextResponse.json({ success: true, user: { email: newUser.email, role: 'customer' } });
    }

    // 4. Sign In
    if (action === 'signin') {
      const user = users.find(u => u.email.toLowerCase() === emailLower && u.passwordHash === password);
      if (user) {
        return NextResponse.json({ success: true, user: { email: user.email, role: user.role } });
      }
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    // 5. Send Forgot Password Code
    if (action === 'send-reset-code') {
      const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
      if (!existingUser) {
        // Return success even if not found to prevent email enumeration
        return NextResponse.json({ success: true, message: 'If an account exists, a reset code was sent.' });
      }

      const vCode = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      
      const updatedVerifications = verifications.filter(v => !(v.email.toLowerCase() === emailLower && v.type === 'reset'));
      updatedVerifications.push({ email: emailLower, code: vCode, type: 'reset', expiresAt });
      saveVerifications(updatedVerifications);

      await sendPasswordResetEmail(emailLower, vCode);
      return NextResponse.json({ success: true, message: 'Reset code sent.' });
    }

    // 6. Reset Password
    if (action === 'reset-password') {
      if (!password || !code) return NextResponse.json({ success: false, message: 'New password and code required.' }, { status: 400 });

      const vRecord = verifications.find(v => v.email.toLowerCase() === emailLower && v.type === 'reset' && v.code === code);
      if (!vRecord) return NextResponse.json({ success: false, message: 'Invalid or missing reset code.' }, { status: 400 });
      if (new Date(vRecord.expiresAt) < new Date()) return NextResponse.json({ success: false, message: 'Reset code expired.' }, { status: 400 });

      const userIndex = users.findIndex(u => u.email.toLowerCase() === emailLower);
      if (userIndex !== -1) {
        users[userIndex].passwordHash = password;
        saveUsers(users);
      }

      // Clean up code
      saveVerifications(verifications.filter(v => v !== vRecord));
      return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid credentials or missing action.' }, { status: 400 });
  } catch (error) {
    console.error('Authentication Error:', error);
    return NextResponse.json({ success: false, message: 'Server error during auth.' }, { status: 500 });
  }
}
