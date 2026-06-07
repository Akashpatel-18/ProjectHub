import api from '@/lib/axios';

export const memberService = {
  getWorkspaceMembers: async (slug: string) => {
    const res = await api.get(`/workspaces/${slug}/members`);
    return res.data.data;
  },
  getProjectMembers: async (slug: string, projectId: string) => {
    const res = await api.get(`/workspaces/${slug}/projects/${projectId}/members`);
    return res.data.data;
  },
  inviteWorkspaceMember: async (slug: string, data: { email: string; roleId: string }) => {
    const res = await api.post(`/workspaces/${slug}/invite`, data);
    return res.data;
  },
  addProjectMember: async (slug: string, projectId: string, data: { userId: string; roleId: string }) => {
    const res = await api.post(`/workspaces/${slug}/projects/${projectId}/members`, data);
    return res.data;
  },
  updateWorkspaceRole: async (slug: string, userId: string, data: { roleId: string }) => {
    const res = await api.put(`/workspaces/${slug}/members/${userId}/role`, data);
    return res.data;
  },
  updateProjectRole: async (slug: string, projectId: string, userId: string, data: { roleId: string }) => {
    const res = await api.put(`/workspaces/${slug}/projects/${projectId}/members/${userId}/role`, data);
    return res.data;
  },
  removeWorkspaceMember: async (slug: string, userId: string) => {
    const res = await api.delete(`/workspaces/${slug}/members/${userId}`);
    return res.data;
  },
  removeProjectMember: async (slug: string, projectId: string, userId: string) => {
    const res = await api.delete(`/workspaces/${slug}/projects/${projectId}/members/${userId}`);
    return res.data;
  }
};
