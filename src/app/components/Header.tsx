"use client"

import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-black text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Horecast
        </Link>
        {session ? (
          <div className="flex items-center space-x-4">
            <Link 
              href="/profile" 
              className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
            >
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt="プロフィール"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span>{session.user?.name || "プロフィール"}</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition-colors"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="bg-white text-black px-4 py-2 rounded"
          >
            ログイン
          </button>
        )}
      </div>
    </header>
  )
}