import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Hash standard password
  const passwordHash = bcrypt.hashSync("Password123", 10);

  // 1. Create default system-level Roles (workspaceId = null)
  console.log("🔑 Creating system-level roles and permissions...");

  const ownerRole = await prisma.role.create({
    data: {
      name: "Owner",
      description: "Full workspace ownership and control",
      permissions: {
        create: [{ action: "manage", subject: "all" }],
      },
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: "Admin",
      description:
        "Workspace administrator with full member and project controls",
      permissions: {
        create: [
          { action: "manage", subject: "Project" },
          { action: "manage", subject: "WorkspaceMember" },
          { action: "manage", subject: "WorkspaceInvite" },
          { action: "read", subject: "Task" },
          { action: "create", subject: "Task" },
          { action: "update", subject: "Task" },
          { action: "delete", subject: "Task" },
          { action: "manage", subject: "Comment" },
          { action: "manage", subject: "Label" },
          { action: "manage", subject: "Attachment" },
        ],
      },
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      name: "Member",
      description:
        "Full member who can create projects/tasks and update owned items",
      permissions: {
        create: [
          { action: "read", subject: "Project" },
          { action: "read", subject: "WorkspaceMember" },
          { action: "read", subject: "Label" },
          { action: "read", subject: "Task" },
          { action: "create", subject: "Task" },
          // A member can update ANY task in the workspace
          { action: "update", subject: "Task" },
          // A member can only delete tasks they created
          {
            action: "delete",
            subject: "Task",
            conditions: JSON.stringify({ createdById: "USER_ID" }),
          },
          { action: "create", subject: "Comment" },
          { action: "read", subject: "Comment" },
          {
            action: "update",
            subject: "Comment",
            conditions: JSON.stringify({ userId: "USER_ID" }),
          },
          {
            action: "delete",
            subject: "Comment",
            conditions: JSON.stringify({ userId: "USER_ID" }),
          },
          { action: "create", subject: "Attachment" },
          { action: "read", subject: "Attachment" },
        ],
      },
    },
  });

  const guestRole = await prisma.role.create({
    data: {
      name: "Guest",
      description:
        "Restricted view-only member who can only interact with assigned tasks",
      permissions: {
        create: [
          { action: "read", subject: "Project" },
          { action: "read", subject: "WorkspaceMember" },
          { action: "read", subject: "Label" },
          // Guest can only view tasks assigned to them
          {
            action: "read",
            subject: "Task",
            conditions: JSON.stringify({ assigneeId: "USER_ID" }),
          },
          // Guest can only create comments on tasks they have access to, and update their own comments
          { action: "create", subject: "Comment" },
          { action: "read", subject: "Comment" },
          {
            action: "update",
            subject: "Comment",
            conditions: JSON.stringify({ userId: "USER_ID" }),
          },
        ],
      },
    },
  });

  console.log("👥 Seeding users...");

  const userOwner = await prisma.user.create({
    data: {
      email: "akash@example.com",
      name: "Akash Patel",
      avatarUrl:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      passwordHash,
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      email: "jane@example.com",
      name: "Jane Smith (Admin)",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      passwordHash,
    },
  });

  const userMember = await prisma.user.create({
    data: {
      email: "john@example.com",
      name: "John Doe (Member)",
      avatarUrl:
        "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80",
      passwordHash,
    },
  });

  const userGuest = await prisma.user.create({
    data: {
      email: "jack@example.com",
      name: "Jack Vance (Guest)",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      passwordHash,
    },
  });

  console.log("🏢 Seeding workspaces and memberships...");

  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme SaaS",
      slug: "acme",
      logoUrl:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80",
    },
  });

  // Assign memberships linked to system default roles
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: userOwner.id, roleId: ownerRole.id },
      { workspaceId: workspace.id, userId: userAdmin.id, roleId: adminRole.id },
      {
        workspaceId: workspace.id,
        userId: userMember.id,
        roleId: memberRole.id,
      },
      { workspaceId: workspace.id, userId: userGuest.id, roleId: guestRole.id },
    ],
  });

  console.log("🎨 Seeding labels...");
  const labelBug = await prisma.label.create({
    data: { name: "Bug", color: "#EF4444", workspaceId: workspace.id },
  });
  const labelFeature = await prisma.label.create({
    data: { name: "Feature", color: "#3B82F6", workspaceId: workspace.id },
  });
  const labelDocs = await prisma.label.create({
    data: { name: "Docs", color: "#10B981", workspaceId: workspace.id },
  });

  console.log("🚀 Seeding projects...");
  const projectAlpha = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Phoenix Launch",
      description:
        "Relaunching core SaaS dashboard with real-time sockets and premium aesthetics.",
      status: "ACTIVE",
      createdById: userOwner.id,
    },
  });

  const projectMarketing = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Q3 Marketing Camp",
      description:
        "Brand promotion campaigns and customer conversion optimization panels.",
      status: "PLANNING",
      createdById: userAdmin.id,
    },
  });

  // ── PROJECT MEMBERS: workspace roles and project roles are INDEPENDENT ──────────
  // Seed ProjectMember records so MEMBER and GUEST can see assigned projects.
  // Owner auto-sees all projects (no ProjectMember record needed).
  // Admin auto-sees own created projects; also add as ProjectMember for assigned ones.
  console.log("👥 Seeding project memberships...");

  // projectAlpha: created by userOwner — add admin, member, guest
  // Jane is workspace Admin but gets project-level MEMBER here (independent roles)
  await prisma.projectMember.createMany({
    data: [
      {
        projectId: projectAlpha.id,
        userId: userAdmin.id,
        roleId: memberRole.id,
      },
      {
        projectId: projectAlpha.id,
        userId: userMember.id,
        roleId: memberRole.id,
      },
      {
        projectId: projectAlpha.id,
        userId: userGuest.id,
        roleId: guestRole.id,
      },
    ],
  });

  // projectMarketing: created by userAdmin — she gets project-level ADMIN (she created it)
  await prisma.projectMember.createMany({
    data: [
      {
        projectId: projectMarketing.id,
        userId: userAdmin.id,
        roleId: adminRole.id,
      }, // creator = project Admin
      {
        projectId: projectMarketing.id,
        userId: userMember.id,
        roleId: memberRole.id,
      },
    ],
  });
  // ─────────────────────────────────────────────────────────────────────────────────

  // Task 1: Complete
  const task1 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      workspaceId: workspace.id,
      title: "Design Database Schema using Prisma ORM",
      description:
        "Model users, workspaces, dynamic RBAC permission maps, subtask sheets, labels, comments, and action history files.",
      status: "DONE",
      priority: "HIGH",
      createdById: userOwner.id,
      assigneeId: userOwner.id,
      subtasks: {
        create: [
          {
            title: "Model database tables in schema.prisma",
            isCompleted: true,
          },
          {
            title: "Setup cascade deletes and relational links",
            isCompleted: true,
          },
          { title: "Setup database seeding file", isCompleted: true },
        ],
      },
      labels: {
        create: [{ labelId: labelFeature.id }],
      },
    },
  });

  // Task 2: In Progress
  const task2 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      workspaceId: workspace.id,
      title: "Integrate Resend for Transactional Invites",
      description:
        "Set up Express email handlers, format robust branding HTML templates, and tie dynamic token links.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      createdById: userOwner.id,
      assigneeId: userMember.id,
      subtasks: {
        create: [
          {
            title: "Verify sending domain in Resend dashboard",
            isCompleted: false,
          },
          {
            title: "Design branding-compliant CSS invitation templates",
            isCompleted: true,
          },
        ],
      },
      labels: {
        create: [{ labelId: labelFeature.id }],
      },
    },
  });

  // Task 3: Todo
  const task3 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      workspaceId: workspace.id,
      title: "Write CASL RBAC dynamic permission gates",
      description:
        "Load permissions dynamically from the database, evaluate condition blocks, and intercept requests using withPermission middleware.",
      status: "TODO",
      priority: "HIGH",
      createdById: userOwner.id,
      assigneeId: userAdmin.id,
      subtasks: {
        create: [
          {
            title: "Write defineAbilityForMember core factory",
            isCompleted: false,
          },
          {
            title: "Create Express auth rules interceptor middleware",
            isCompleted: false,
          },
        ],
      },
      labels: {
        create: [{ labelId: labelBug.id }],
      },
    },
  });

  // Task 4: Guest task (assigned to guest)
  const task4 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      workspaceId: workspace.id,
      title: "Audit documentation files & check labels",
      description:
        "Perform a comprehensive walkthrough of initial code organization and verify all label markers.",
      status: "TODO",
      priority: "LOW",
      createdById: userAdmin.id,
      assigneeId: userGuest.id,
      subtasks: {
        create: [
          { title: "Compile developer setup files", isCompleted: false },
        ],
      },
      labels: {
        create: [{ labelId: labelDocs.id }],
      },
    },
  });

  console.log("💬 Seeding comments...");

  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: userOwner.id,
      content:
        "I have prepared the draft template. Please check it and verify the logo url renders nicely.",
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: userMember.id,
      content:
        "Understood. I will run a local SMTP checker and configure the keys once the Resend credentials land.",
    },
  });

  console.log("📈 Seeding activity logs...");

  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        taskId: task1.id,
        actorId: userOwner.id,
        action: "TASK_CREATED",
        metadata: JSON.stringify({ title: task1.title }),
      },
      {
        workspaceId: workspace.id,
        taskId: task1.id,
        actorId: userOwner.id,
        action: "STATUS_CHANGED",
        metadata: JSON.stringify({
          field: "status",
          oldValue: "TODO",
          newValue: "DONE",
        }),
      },
      {
        workspaceId: workspace.id,
        taskId: task2.id,
        actorId: userOwner.id,
        action: "TASK_CREATED",
        metadata: JSON.stringify({ title: task2.title }),
      },
    ],
  });

  console.log("🔔 Seeding notifications...");

  await prisma.notification.createMany({
    data: [
      {
        userId: userMember.id,
        title: "New Task Assigned",
        message: `Akash Patel assigned you task: "${task2.title}"`,
        type: "TASK_ASSIGNED",
        taskId: task2.id,
      },
      {
        userId: userGuest.id,
        title: "New Task Assigned",
        message: `Jane Smith assigned you task: "${task4.title}"`,
        type: "TASK_ASSIGNED",
        taskId: task4.id,
      },
    ],
  });

  console.log("🚀 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
