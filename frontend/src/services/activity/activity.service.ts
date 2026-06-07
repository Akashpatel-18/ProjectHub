import api from '@/lib/axios';

export const activityService = {
  getActivityLogs: async (slug: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    
    const res = await api.get(`/workspaces/${slug}/activity${cursor ? `?${params.toString()}` : ''}`);
    return res.data; // Now returning { data, nextCursor }
  }
};
