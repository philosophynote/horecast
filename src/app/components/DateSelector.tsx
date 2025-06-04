'use client'

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { format, subDays } from "date-fns"

interface DateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const generateDates = () => {
    const dates = []
    const today = new Date()
    
    // 過去7日分と今日、明日を含む9日分のオプションを生成
    for (let i = -7; i <= 1; i++) {
      const date = subDays(today, -i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const isToday = format(today, 'yyyy-MM-dd') === dateStr
      const isTomorrow = format(subDays(today, -1), 'yyyy-MM-dd') === dateStr
      
      let label = format(date, 'M月d日')
      if (isToday) label += ' (今日)'
      if (isTomorrow) label += ' (明日)'
      
      dates.push({
        value: dateStr,
        label
      })
    }
    
    return dates
  }

  const dates = generateDates()

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">日付選択</h3>
        <div className="space-y-2">
          {dates.map((date) => (
            <Button
              key={date.value}
              variant={selectedDate === date.value ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => onDateChange(date.value)}
            >
              {date.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}