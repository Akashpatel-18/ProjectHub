import { AbilityBuilder, createMongoAbility, MongoAbility, RawRuleOf } from '@casl/ability';
import { Permission } from '@prisma/client';

export type AppAbility = MongoAbility;

/**
 * Compiles a database list of role permissions into a CASL Ability instance for a user.
 * Replaces placeholders like "USER_ID" in permission conditions dynamically at runtime.
 */
export function defineAbilityForMember(
  userId: string,
  permissions: Permission[]
): AppAbility {
  const { can, cannot, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const perm of permissions) {
    const isAllowed = !perm.inverted;
    
    // Parse condition placeholders
    let conditions: Record<string, any> | undefined;
    if (perm.conditions) {
      try {
        const rawConditions = perm.conditions.replace(/"USER_ID"/g, `"${userId}"`);
        conditions = JSON.parse(rawConditions);
      } catch (e) {
        console.error('❌ Error parsing permission conditions JSON:', e, perm.conditions);
      }
    }

    // Dynamic actions can be comma-separated strings
    const actions = perm.action.split(',').map((a) => a.trim());
    
    for (const action of actions) {
      if (isAllowed) {
        can(action, perm.subject, conditions);
      } else {
        cannot(action, perm.subject, conditions);
      }
    }
  }

  return createMongoAbility(rules);
}
