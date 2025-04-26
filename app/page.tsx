import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QrCode, Lock, Share2 } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <header className="w-full bg-sky-500 py-6 flex justify-center">
        <div className="container px-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Share2 className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">SecureShare.me</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full bg-sky-500 py-16 flex justify-center text-center">
        <div className="container px-4 flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            FRICTIONLESS SHARING
            <br />
            BETWEEN DEVICES
          </h2>
          <p className="text-white text-lg max-w-2xl">
            Private end-to-end encryption, secure transfer and your data won't be stored in the cloud
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-white text-sky-600 hover:bg-sky-100">
              <Link href="/share">Start Sharing Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What does it do section */}
      <section className="py-16 w-full">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">What does it do?</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-lg">
              SecureShare.me helps you when you need to send a password, text snippet or file from one phone, laptop or
              tablet to another device. No more painstakingly typing in your password character by character, sending
              yourself pieces of text via email or having to look for a USB stick. As long as you have a browser, you
              are ready to start sharing data between devices.
            </p>
          </div>
        </div>
      </section>

      {/* How does it work section */}
      <section className="py-16 w-full bg-gray-50">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How does it work?</h2>
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <QrCode className="h-32 w-32" />
            </div>
            <p className="text-lg">
              The QR code above is generated specifically for you. Scan it by pointing your phone's camera at it (most
              of them have a QR scanner built in) to setup the connection and start sharing! If you don't have a camera
              at hand, for instance when you want to connect your laptop to another computer, simply use the{" "}
              <strong>'connect manually'</strong> option. Or use the <strong>'invite'</strong>
              option if you like to setup a secure connection with someone else.
            </p>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 w-full">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold inline-block mr-3">Securely -</h3>
            <span className="text-2xl font-bold">share passwords</span>
          </div>

          <div className="flex justify-center">
            <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div className="flex-1 flex items-center border rounded-md px-3 py-2">
                  <span className="text-lg">••••••••</span>
                  <Lock className="ml-auto h-5 w-5 text-yellow-500" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500">Enter your password and share it securely</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-800 py-4 text-center text-white">
        <div className="container px-4">
          <p className="text-sm">
            Offered by{" "}
            <a href="#" className="text-sky-400 hover:underline">
              SecureShare
            </a>{" "}
            -
            <a href="#" className="text-sky-400 hover:underline ml-1">
              FAQ
            </a>{" "}
            -
            <a href="#" className="text-sky-400 hover:underline ml-1">
              Donate now
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}
