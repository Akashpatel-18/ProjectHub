import api from '@/lib/axios';

export const taskService = {
  getTasks: async (slug: string, projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const res = await api.get(`/workspaces/${slug}/tasks`, { params });
    return res.data.data;
  },
  createTask: async (slug: string, data: any) => {
    const res = await api.post(`/workspaces/${slug}/tasks`, data);
    return res.data.data;
  },
  updateTask: async (slug: string, taskId: string, data: any) => {
    const res = await api.put(`/workspaces/${slug}/tasks/${taskId}`, data);
    return res.data.data;
  },
  deleteTask: async (slug: string, taskId: string) => {
    const res = await api.delete(`/workspaces/${slug}/tasks/${taskId}`);
    return res.data.data;
  },
  getTask: async (slug: string, taskId: string) => {
    const res = await api.get(`/workspaces/${slug}/tasks/${taskId}`);
    return res.data.data;
  },
  addSubtask: async (slug: string, taskId: string, data: any) => {
    const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/subtasks`, data);
    return res.data.data;
  },
  toggleSubtask: async (slug: string, taskId: string, subtaskId: string, isCompleted: boolean) => {
    const res = await api.put(`/workspaces/${slug}/tasks/${taskId}/subtasks/${subtaskId}`, { isCompleted });
    return res.data.data;
  },
  deleteSubtask: async (slug: string, taskId: string, subtaskId: string) => {
    const res = await api.delete(`/workspaces/${slug}/tasks/${taskId}/subtasks/${subtaskId}`);
    return res.data.data;
  },
  addComment: async (slug: string, taskId: string, data: any) => {
    const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/comments`, data);
    return res.data.data;
  },
  toggleWatch: async (slug: string, taskId: string) => {
    const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/watch`);
    return res.data.data;
  },
  uploadAttachment: async (slug: string, taskId: string, formData: FormData) => {
    const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
  deleteAttachment: async (slug: string, attachmentId: string) => {
    const res = await api.delete(`/workspaces/${slug}/attachments/${attachmentId}`);
    return res.data.data;
  }
};
