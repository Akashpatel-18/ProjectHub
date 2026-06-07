import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";

export function useWorkspaceSocket(slug?: string, projectId?: string) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    if (!slug || !currentUser) return;

    socket.connect();
    socket.emit("workspace:join", slug);
    socket.emit("user:join", currentUser.id);

    const handleTaskCreated = () => {
      if (projectId)
        queryClient.invalidateQueries({ queryKey: ["tasks", slug, projectId] });
      queryClient.invalidateQueries({ queryKey: ["activity", slug] });
    };

    const handleTaskUpdated = (updatedTask: any) => {
      if (projectId) {
        queryClient.setQueryData(["tasks", slug, projectId], (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((t: any) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        });
      }
      queryClient.setQueryData(["tasks", slug], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((t: any) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
      });
      
      queryClient.invalidateQueries({ queryKey: ["activity", slug] });
    };

    const handleTaskDeleted = () => {
      if (projectId)
        queryClient.invalidateQueries({ queryKey: ["tasks", slug, projectId] });
      queryClient.invalidateQueries({ queryKey: ["activity", slug] });
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
      socket.disconnect();
    };
  }, [slug, projectId, currentUser, queryClient]);
}
