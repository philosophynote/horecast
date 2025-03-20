"use client";
import { useRouter } from "next/navigation";

type Props = {
  dates: string[];
};

export default function SidebarClient({ dates }: Props) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate) router.push(`/racedate=${selectedDate}`);
  };

  return (
    <aside className="w-64 bg-muted p-4">
      <nav className="space-y-2">
        <select onChange={handleChange}>
          <option value="">日付を選択</option>
          {dates.map(date => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </nav>
    </aside>
  );
}