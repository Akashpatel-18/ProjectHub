import api from '@/lib/axios';

export const workspaceService = {
  getWorkspaces: async () => {
    const res = await api.get('/workspaces');
    return res.data.data;
  },
  getWorkspaceDetails: async (slug: string) => {
    const res = await api.get(`/workspaces/${slug}`);
    return res.data.data;
  },
  createWorkspace: async (data: { name: string; slug: string; description?: string }) => {
    const res = await api.post('/workspaces', data);
    return res.data.data;
  },
  getRoles: async (slug: string) => {
    const res = await api.get(`/workspaces/${slug}/roles`);
    return res.data.data;
  }
};
