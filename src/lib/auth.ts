// Convenience re-export barrel. Middleware imports from '@/lib/jwt' directly to
// keep bcryptjs out of the Edge runtime bundle; everything else can use '@/lib/auth'.
export { hashPassword, verifyPassword } from './password'
export {
  AUTH_COOKIE,
  cookieOptions,
  signToken,
  verifyToken,
  currentUserFromToken,
  getActorFromCookies,
  type JwtClaims,
  type Role,
  type Actor,
} from './jwt'
