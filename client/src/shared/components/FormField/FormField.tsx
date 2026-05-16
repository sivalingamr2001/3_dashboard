import type { ReactNode } from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/shared/components/ui/form";

interface FormFieldWrapperProps {
  label?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}

export const FormFieldWrapper = ({
  label,
  description,
  required,
  children,
}: FormFieldWrapperProps) => (
  <FormItem>
    {label && (
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
    )}
    <FormControl>{children}</FormControl>
    {description && <FormDescription>{description}</FormDescription>}
    <FormMessage />
  </FormItem>
);
