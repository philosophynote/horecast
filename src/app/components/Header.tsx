import Link from "next/link"

export function Header() {
  return (
    <header className="bg-black text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Horecast
        </Link>
      </div>
    </header>
  )
}