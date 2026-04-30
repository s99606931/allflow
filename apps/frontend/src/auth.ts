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
        const backend = process.env.BACKEND_URL ?? 'http://backend:8080/api/v1';
        const body: { email: string; password?: string } = {
          email: String(credentials.email),
        };
        if (credentials.password) body.password = String(credentials.password);
        const res = await fetch(`${backend}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          user: { id: string; email: string; name?: string };
          accessToken: string;
        };
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name ?? data.user.email,
          accessToken: data.accessToken,
        } as never;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      // E2E 모드에서만 라우트 게이트 우회 (non-production 빌드에서만 유효).
      if (process.env.NEXT_PUBLIC_E2E === 'true' && process.env.NODE_ENV !== 'production') return true;
      const { pathname } = request.nextUrl;
      // 미인증 허용: 로그인 UI, next-auth handler, BE 로그인 엔드포인트만.
      // /api/v1/* 의 나머지는 catch-all proxy → BE 401로 자연 차단.
      if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/api/v1/auth/login'
      ) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user && (user as { accessToken?: string }).accessToken) {
        token.accessToken = (user as { accessToken: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as string;
      return session;
    },
  },
  session: { strategy: 'jwt' },
});
