import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "./project.service";
import { useToast } from "@/hooks/use-toast";

export const useProjectsQuery = (slug?: string) => {
  return useQuery({
    queryKey: ["projects", slug],
    queryFn: () => projectService.getProjects(slug!),
    enabled: !!slug,
  });
};

export const useCreateProjectMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      projectService.createProject(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", slug] });
      toast({
        title: "Project Created",
        description: "New project has been successfully initialized.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description:
          error.response?.data?.message || "Could not create project.",
      });
    },
  });
};

export const useUpdateProjectMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { status: string };
    }) => projectService.updateProject(slug!, projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", slug] });
      toast({
        title: "Project Updated",
        description: "Project status changed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.message,
      });
    },
  });
};

export const useDeleteProjectMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (projectId: string) =>
      projectService.deleteProject(slug!, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", slug] });
      toast({
        title: "Project Deleted",
        description: "Project has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.response?.data?.message,
      });
    },
  });
};
