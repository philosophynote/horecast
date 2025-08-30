"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Image from "next/image"

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ユーザープロフィール</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-6 mb-6">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt="プロフィール画像"
                width={80}
                height={80}
                className="rounded-full"
              />
            )}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {session.user?.name || "名前未設定"}
              </h2>
              <p className="text-gray-600">{session.user?.email}</p>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント情報</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">名前</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {session.user?.name || "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {session.user?.email || "未設定"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}