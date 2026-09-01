import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";

/** Se distingue del error de credenciales para poder avisarlo en pantalla. */
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

// Por cuenta: frena la fuerza bruta contra una víctima concreta.
const LOGIN_LIMIT_PER_EMAIL = 8;
// Por IP: frena a alguien probando muchas cuentas distintas desde el mismo lugar.
// Holgado porque varios usuarios pueden compartir IP (CGNAT móvil); la defensa
// fuerte contra fuerza bruta es el límite por cuenta, que no depende de la IP.
const LOGIN_LIMIT_PER_IP = 50;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const ip = clientIp(request);
        const emailKey = `login:${email}`;
        const ipKey = `login-ip:${ip}`;

        const [byEmail, byIp] = await Promise.all([
          checkRateLimit(emailKey, LOGIN_LIMIT_PER_EMAIL, LOGIN_WINDOW_SECONDS),
          checkRateLimit(ipKey, LOGIN_LIMIT_PER_IP, LOGIN_WINDOW_SECONDS),
        ]);
        if (!byEmail.allowed || !byIp.allowed) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Entró bien: se libera el contador de esa cuenta.
        await resetRateLimit(emailKey);

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
