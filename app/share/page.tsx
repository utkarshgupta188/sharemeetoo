"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileUp, Key, FileText, LinkIcon, Download } from "lucide-react"
import QRCodeDisplay from "@/components/qr-code-display"
import ConnectionStatus from "@/components/connection-status"
import { useToast } from "@/hooks/use-toast"
import { WebRTCService, type Message } from "@/lib/webrtc-service"
import { Progress } from "@/components/ui/progress"

// The server URL - change this to your deployed server URL
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"

export default function SharePage() {
  const [connectionId, setConnectionId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [textToShare, setTextToShare] = useState("")
  const [passwordToShare, setPasswordToShare] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const webRTCServiceRef = useRef<WebRTCService | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Initialize WebRTC service
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create WebRTC service
      const webRTCService = new WebRTCService(SERVER_URL)
      webRTCServiceRef.current = webRTCService

      // Create a new room
      const roomId = webRTCService.createRoom()
      setConnectionId(roomId)
      setQrValue(`${window.location.origin}/connect/${roomId}`)

      // Set up event handlers
      webRTCService.onMessage((message, userId) => {
        console.log(`Received message from ${userId}:`, message)
        setReceivedMessages((prev) => [...prev, message])

        toast({
          title: `Received ${message.type}`,
          description:
            message.type === "file"
              ? `Received file: ${(message as any).name || "unnamed"}`
              : `Received ${message.type} from peer`,
        })
      })

      webRTCService.onConnectionStatusChange((connected) => {
        setIsConnected(connected)
        if (connected) {
          toast({
            title: "Connected!",
            description: "You are now connected to a peer.",
          })
        } else {
          toast({
            title: "Disconnected",
            description: "You have been disconnected from the peer.",
            variant: "destructive",
          })
        }
      })

      // Clean up on unmount
      return () => {
        webRTCService.close()
      }
    }
  }, [toast])

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const shareLink = `${window.location.origin}/connect/${connectionId}`
      navigator.clipboard.writeText(shareLink)
      toast({
        title: "Link copied!",
        description: "Share this link with someone to establish a connection.",
      })
    }
  }

  const handleShareText = () => {
    if (!textToShare) {
      toast({
        title: "Nothing to share",
        description: "Please enter some text to share.",
        variant: "destructive",
      })
      return
    }

    if (!webRTCServiceRef.current || !isConnected) {
      toast({
        title: "Not connected",
        description: "Please wait for a connection to be established.",
        variant: "destructive",
      })
      return
    }

    const message = {
      type: "text" as const,
      content: textToShare,
    }

    const sent = webRTCServiceRef.current.sendMessage(message)
    if (sent) {
      toast({
        title: "Text shared!",
        description: "Your text has been sent securely.",
      })
      setTextToShare("")
    } else {
      toast({
        title: "Failed to send",
        description: "Could not send the text. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSharePassword = () => {
    if (!passwordToShare) {
      toast({
        title: "Nothing to share",
        description: "Please enter a password to share.",
        variant: "destructive",
      })
      return
    }

    if (!webRTCServiceRef.current || !isConnected) {
      toast({
        title: "Not connected",
        description: "Please wait for a connection to be established.",
        variant: "destructive",
      })
      return
    }

    const message = {
      type: "password" as const,
      content: passwordToShare,
    }

    const sent = webRTCServiceRef.current.sendMessage(message)
    if (sent) {
      toast({
        title: "Password shared!",
        description: "Your password has been sent securely.",
      })
      setPasswordToShare("")
    } else {
      toast({
        title: "Failed to send",
        description: "Could not send the password. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
      toast({
        title: "File selected",
        description: `Selected file: ${e.target.files[0].name} (${formatFileSize(e.target.files[0].size)})`,
      })
    }
  }

  const handleShareFile = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to share.",
        variant: "destructive",
      })
      return
    }

    if (!webRTCServiceRef.current || !isConnected) {
      toast({
        title: "Not connected",
        description: "Please wait for a connection to be established.",
        variant: "destructive",
      })
      return
    }

    try {
      // Show progress indicator
      setUploadProgress(10)

      // In a real implementation, you'd update progress based on chunks sent
      const updateProgress = () => {
        setUploadProgress((prev) => Math.min(prev + 20, 90))
      }

      const progressInterval = setInterval(updateProgress, 200)

      const sent = await webRTCServiceRef.current.sendFile(selectedFile)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (sent) {
        toast({
          title: "File shared!",
          description: `Your file ${selectedFile.name} has been sent securely.`,
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Reset progress after a delay
        setTimeout(() => setUploadProgress(0), 1000)
      } else {
        setUploadProgress(0)
        toast({
          title: "Failed to send",
          description: "Could not send the file. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setUploadProgress(0)
      console.error("Error sending file:", error)
      toast({
        title: "Error",
        description: "An error occurred while sending the file.",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const downloadFile = (message: any) => {
    try {
      const blob = new Blob([message.data], { type: message.mimeType || "application/octet-stream" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = message.name || "downloaded-file"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download failed",
        description: "Could not download the file.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Secure Sharing</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Establish a secure peer-to-peer connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <ConnectionStatus isConnected={isConnected} />

              {!isConnected ? (
                <>
                  <div className="flex justify-center mb-4">{qrValue && <QRCodeDisplay value={qrValue} />}</div>

                  <div className="flex flex-col gap-4 w-full">
                    <p className="text-center text-sm text-muted-foreground">
                      Scan this QR code with another device or share the link below to connect
                    </p>

                    <Button variant="outline" onClick={handleCopyLink} className="w-full">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Copy Invite Link
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-green-600 font-medium">Connection established! You can now share data securely.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share Data</CardTitle>
            <CardDescription>Share text, passwords, or files securely</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="file">File</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter text to share..."
                    value={textToShare}
                    onChange={(e) => setTextToShare(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <Button onClick={handleShareText} disabled={!isConnected} className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Share Text
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="password">
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Enter password to share..."
                    value={passwordToShare}
                    onChange={(e) => setPasswordToShare(e.target.value)}
                  />
                  <Button onClick={handleSharePassword} disabled={!isConnected} className="w-full">
                    <Key className="mr-2 h-4 w-4" />
                    Share Password
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="file">
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedFile
                        ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                        : "Drag and drop a file here, or click to select a file"}
                    </p>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  </div>

                  {uploadProgress > 0 && (
                    <div className="w-full space-y-2">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-xs text-center text-muted-foreground">
                        {uploadProgress < 100 ? "Sending file..." : "File sent!"}
                      </p>
                    </div>
                  )}

                  <Button onClick={handleShareFile} disabled={!isConnected || !selectedFile} className="w-full">
                    <FileUp className="mr-2 h-4 w-4" />
                    Share File
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Received Messages Section */}
      {receivedMessages.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Received Data</CardTitle>
            <CardDescription>Data received from your peers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receivedMessages.map((message, index) => (
                <Card key={index}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center">
                      {message.type === "text" && <FileText className="mr-2 h-4 w-4" />}
                      {message.type === "password" && <Key className="mr-2 h-4 w-4" />}
                      {message.type === "file" && <FileUp className="mr-2 h-4 w-4" />}
                      {message.type.charAt(0).toUpperCase() + message.type.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {message.type === "text" && <p className="break-words">{(message as any).content}</p>}
                    {message.type === "password" && (
                      <p className="break-words font-mono bg-gray-100 p-2 rounded">{(message as any).content}</p>
                    )}
                    {message.type === "file" && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{(message as any).name || "File"}</p>
                          <p className="text-sm text-muted-foreground">{formatFileSize((message as any).size)}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => downloadFile(message)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
