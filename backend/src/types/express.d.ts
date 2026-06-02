import { User, Workspace, WorkspaceMember, Role } from '@prisma/client';
import { AppAbility } from '../casl/ability';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        avatarUrl?: string | null;
      };
      workspace?: Workspace;
      memberContext?: WorkspaceMember & {
        role: Role;
      };
      ability?: AppAbility;
    }
  }
}
