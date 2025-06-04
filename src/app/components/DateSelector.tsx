'use client'

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { format } from "date-fns"
import { useEffect, useState } from "react"

interface DateSelectorProps {
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await fetch('/api/races/dates')
        if (response.ok) {
          const dates = await response.json()
          setAvailableDates(dates)
        }
      } catch (error) {
        console.error('Error fetching available dates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableDates()
  }, [])

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const isToday = format(today, 'yyyy-MM-dd') === dateStr
    
    let label = format(date, 'M月d日')
    if (isToday) label += ' (今日)'
    
    return label
  }

  if (loading) {
    return (
      <Card className="w-64">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">日付選択</h3>
          <div className="text-sm text-gray-500">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">日付選択</h3>
        <div className="space-y-2">
          {availableDates.length === 0 ? (
            <div className="text-sm text-gray-500">レースが予定されている日がありません</div>
          ) : (
            availableDates.map((dateStr) => (
              <Button
                key={dateStr}
                variant={selectedDate === dateStr ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => onDateChange(dateStr)}
              >
                {formatDateLabel(dateStr)}
              </Button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}