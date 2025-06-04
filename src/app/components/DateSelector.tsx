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
  const [isOpen, setIsOpen] = useState(false)

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
      <>
        {/* デスクトップ表示 */}
        <Card className="hidden lg:block w-64">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">日付選択</h3>
            <div className="text-sm text-gray-500">読み込み中...</div>
          </CardContent>
        </Card>
        
        {/* モバイル表示 */}
        <div className="lg:hidden">
          <Button
            variant="outline"
            className="w-full mb-4 flex items-center justify-between"
            disabled
          >
            <span>日付選択</span>
            <span className="text-sm">読み込み中...</span>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* デスクトップ表示 */}
      <Card className="hidden lg:block w-64">
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

      {/* モバイル表示（ハンバーガーメニュー） */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full mb-4 flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>日付選択</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{formatDateLabel(selectedDate)}</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </Button>
        
        {isOpen && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="space-y-2">
                {availableDates.length === 0 ? (
                  <div className="text-sm text-gray-500">レースが予定されている日がありません</div>
                ) : (
                  availableDates.map((dateStr) => (
                    <Button
                      key={dateStr}
                      variant={selectedDate === dateStr ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        onDateChange(dateStr)
                        setIsOpen(false)
                      }}
                    >
                      {formatDateLabel(dateStr)}
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}