import { useInfiniteQuery } from '@tanstack/react-query';
import { activityService } from './activity.service';

export const useWorkspaceActivityQuery = (slug?: string) => {
  return useInfiniteQuery({
    queryKey: ['activity', slug],
    queryFn: ({ pageParam }) => activityService.getActivityLogs(slug!, pageParam as string | undefined),
    getNextPageParam: (lastPage: any) => lastPage.data.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: !!slug,
  });
};
