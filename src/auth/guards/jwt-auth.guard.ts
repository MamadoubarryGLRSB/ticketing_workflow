import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard qui déclenche la JwtStrategy : vérifie le token dans Authorization: Bearer <token>, remplit request.user. Si pas de token ou invalide, renvoie 401.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
