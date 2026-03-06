import { SetMetadata } from '@nestjs/common';

// Clé lue par le guard global (si configuré) pour ignorer la vérification JWT sur certaines routes.
export const IS_PUBLIC_KEY = 'isPublic';

// Décorateur pour marquer une route comme publique : pas besoin de token. Ex. login, register, forgot-password.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
