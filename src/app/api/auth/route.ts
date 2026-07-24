import { NextResponse } from 'next/server';
import { getUsers, saveUsers, ADMIN_AUTH, User } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { action, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const users = getUsers();

    // 1. Handle Admin special override for backward compatibility
    if (emailLower === ADMIN_AUTH.email.toLowerCase() && password === ADMIN_AUTH.password) {
      return NextResponse.json({
        success: true,
        user: {
          email: ADMIN_AUTH.email,
          role: 'admin'
        }
      });
    }

    if (action === 'signup') {
      // Check if email already exists
      const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email is already registered.' }, { status: 400 });
      }

      // Create new customer user
      const newUser: User = {
        email: emailLower,
        passwordHash: password, // simple storage for scope demonstration
        role: 'customer'
      };

      users.push(newUser);
      saveUsers(users);

      return NextResponse.json({
        success: true,
        user: {
          email: newUser.email,
          role: 'customer'
        }
      });
    }

    if (action === 'signin') {
      const user = users.find(u => u.email.toLowerCase() === emailLower && u.passwordHash === password);
      if (!user) {
        return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          role: user.role
        }
      });
    }

    // Default legacy/fallback signin behaviour for customer login compatibility
    const fallbackUser = users.find(u => u.email.toLowerCase() === emailLower && u.passwordHash === password);
    if (fallbackUser) {
      return NextResponse.json({
        success: true,
        user: {
          email: fallbackUser.email,
          role: fallbackUser.role
        }
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid credentials or missing action.' }, { status: 401 });
  } catch (error) {
    console.error('Authentication Error:', error);
    return NextResponse.json({ success: false, message: 'Server error during auth.' }, { status: 500 });
  }
}
