import api from '@/lib/axios';

export const projectService = {
  getProjects: async (slug: string) => {
    const res = await api.get(`/workspaces/${slug}/projects`);
    return res.data.data;
  },
  createProject: async (slug: string, data: { name: string; description?: string }) => {
    const res = await api.post(`/workspaces/${slug}/projects`, data);
    return res.data.data;
  },
  updateProject: async (slug: string, projectId: string, data: { status: string }) => {
    const res = await api.put(`/workspaces/${slug}/projects/${projectId}`, data);
    return res.data.data;
  },
  deleteProject: async (slug: string, projectId: string) => {
    const res = await api.delete(`/workspaces/${slug}/projects/${projectId}`);
    return res.data.data;
  }
};
