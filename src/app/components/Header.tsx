import Link from "next/link"

const NAV_LINKS = [
  { href: "/", label: "レース" },
  { href: "/time-index", label: "タイム指数" },
]

export function Header() {
  return (
    <header className="bg-black text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Horecast
        </Link>
        <nav aria-label="主要ページ" className="flex gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
