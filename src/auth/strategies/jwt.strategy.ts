import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { constants } from '../constants';

// Stratégie Passport pour les routes protégées par JwtAuthGuard : elle vérifie le token et attache l'utilisateur à request.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // On récupère le JWT depuis le header Authorization: Bearer <token>.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Si le token est expiré, on rejette (pas de refresh silencieux).
      ignoreExpiration: false,
      // Clé secrète pour vérifier la signature du token (même que celle utilisée à la signature dans AuthService).
      secretOrKey: constants.jwtSecret,
    });
  }

  // Appelé après que Passport ait décodé et vérifié le JWT : payload contient sub (userId), email, iat (date d'émission).
  async validate(payload: { sub: string; email?: string; iat?: number }) {
    // Vérifier que l'utilisateur existe encore et que le token n'a pas été révoqué (logout) ; récupérer les rôles.
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Token expiré ou invalide');
    }
    // L'objet retourné est attaché à request.user pour toute la requête (accessible via @CurrentUser()).
    return user;
  }
}
