import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Credentials from 'next-auth/providers/credentials';

/**
 * next-auth v5 (beta) configuration.
 *
 * In production, prefer Google + Kakao + SAML/OIDC SSO.
 * The Credentials provider here is for local dev; remove or guard it in prod.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Only allow @omelet.com / @omeletcorp.com workspace emails (example)
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
    Credentials({
      name: '데모 로그인',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // DEMO ONLY — replace with real backend verification.
        return {
          id: 'me',
          name: '김지우',
          email: String(credentials.email),
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      // Bypass auth gate when running E2E tests so route smoke tests can render
      // without provisioning a real session.
      if (process.env.NEXT_PUBLIC_E2E === 'true') return true;
      const { pathname } = request.nextUrl;
      // Public paths: login UI, next-auth handler, demo stub API.
      // The /api/v1/* surface is mock-only fixture data — replace this gate
      // with real authorization once a backend is wired up.
      if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/v1')
      ) return true;
      return !!auth?.user;
    },
  },
  session: { strategy: 'jwt' },
});
