import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, createPrismaAbility } from '@casl/prisma';
import { Permission, Prisma } from '@prisma/client';

export type AppAbility = PureAbility<[string, string | Record<string, any>], PrismaQuery>;

/**
 * Compiles a database list of role permissions into a CASL Ability instance for a user.
 * Replaces placeholders like "USER_ID" in permission conditions dynamically at runtime.
 */
export function defineAbilityForMember(
  userId: string,
  permissions: Permission[]
): AppAbility {
  return defineUnifiedAbility(userId, permissions);
}

/**
 * Compiles a single CASL Ability instance containing both Workspace-level rules
 * and Project-specific overrides. 
 * Rule Order Matters: Project rules are added LAST so they override Workspace rules.
 */
export function defineUnifiedAbility(
  userId: string,
  workspacePermissions: Permission[],
  projectContext?: { projectId: string; permissions: Permission[] }
): AppAbility {
  const { can, cannot, rules } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  const addPermissions = (permissions: Permission[], restrictToProjectId?: string) => {
    for (const perm of permissions) {
      const isAllowed = !perm.inverted;
      
      let conditions: Record<string, any> = {};
      if (perm.conditions) {
        try {
          const rawConditions = perm.conditions.replace(/"USER_ID"/g, `"${userId}"`);
          conditions = JSON.parse(rawConditions);
        } catch (e) {
          console.error('❌ Error parsing permission conditions JSON:', e, perm.conditions);
        }
      }

      if (restrictToProjectId) {
        conditions.projectId = restrictToProjectId;
      }

      const actions = perm.action.split(',').map((a) => a.trim());
      
      for (const action of actions) {
        const condObj = Object.keys(conditions).length ? conditions : undefined;
        if (isAllowed) {
          can(action, perm.subject, condObj);
        } else {
          cannot(action, perm.subject, condObj);
        }
      }
    }
  };

  // 1. Base Workspace Rules
  addPermissions(workspacePermissions);

  // 2. Project-Specific Overrides
  if (projectContext && projectContext.projectId) {
    // Revoke all access for this specific project first (overrides workspace admin)
    cannot('manage', 'all', { projectId: projectContext.projectId });
    
    // Explicitly grant access back based on the project role
    addPermissions(projectContext.permissions, projectContext.projectId);
  }

  return createPrismaAbility(rules);
}
