import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("rounded-md border bg-card p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-bold",
        nav: "space-x-1 flex items-center",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-semibold text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: "h-9 w-9 rounded-md p-0 font-medium hover:bg-muted",
        selected: "bg-primary text-primary-foreground hover:bg-primary",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        ...classNames
      }}
      {...props}
    />
  );
}
