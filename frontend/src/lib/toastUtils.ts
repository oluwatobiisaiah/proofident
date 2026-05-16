import { toast } from "sonner";

function toastSuccess(message: string) {
  toast.success(message, {
    classNames: {
      icon: "!text-primary",
      title: "!text-primary",
      description: "!text-primary",
    },
  });
}

function toastError(message: string) {
  toast.error(message, {
    classNames: {
      toast: "!text-red-500",
      title: "!text-red-500",
      description: "!text-red-500",
    },
  });
}

export { toastSuccess, toastError };
