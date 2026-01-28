import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ value, onChange, disabled, className }) {
  const [date, setDate] = React.useState(value ? new Date(value) : undefined)
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate)
      // Format as YYYY-MM-DD for input compatibility
      const formatted = format(selectedDate, 'yyyy-MM-dd')
      onChange?.(formatted)
      setOpen(false)
    }
  }

  React.useEffect(() => {
    if (value) {
      try {
        setDate(new Date(value))
      } catch (e) {
        setDate(undefined)
      }
    } else {
      setDate(undefined)
    }
  }, [value])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(day) => day < today}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
