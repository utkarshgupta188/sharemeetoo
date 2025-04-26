"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import ConnectionStatus from "@/components/connection-status"
import { useToast } from "@/hooks/use-toast"
import { WebRTCService, type Message } from "@/lib/webrtc-service"
import { FileText, FileUp, Key, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// The server URL - change this to your deployed server URL
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001"

export default function ConnectPage() {
  const params = useParams()
  const connectionId = params.id as string
  const [isConnected, setIsConnected] = useState(false)
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([])
  const [textToShare, setTextToShare] = useState("")
  const [passwordToShare, setPasswordToShare] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const webRTCServiceRef = useRef<WebRTCService | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Initialize WebRTC service
  useEffect(() => {
    if (typeof window !== "undefined" && connectionId) {
      // Create WebRTC service
      const webRTCService = new WebRTCService(SERVER_URL)
      webRTCServiceRef.current = webRTCService

      // Join the room
      webRTCService.joinRoom(connectionId)

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
  }, [connectionId, toast])

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
      <Card>
        <CardHeader>
          <CardTitle>Secure Connection</CardTitle>
          <CardDescription>Connect to establish a secure peer-to-peer channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <ConnectionStatus isConnected={isConnected} />

            {!isConnected ? (
              <div className="w-full">
                <p className="mb-4 text-center">Connecting to peer... This may take a moment.</p>
                <p className="text-sm text-center text-muted-foreground">
                  You're about to establish a secure connection with another device. No data will be stored on any
                  server.
                </p>
              </div>
            ) : (
              <p className="text-green-600 font-medium text-center">
                Connection established! You can now share and receive data securely.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isConnected && (
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          {/* Send Data Card */}
          <Card>
            <CardHeader>
              <CardTitle>Send Data</CardTitle>
              <CardDescription>Share text, passwords, or files securely</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Share Text</h3>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Enter text to share..."
                      value={textToShare}
                      onChange={(e) => setTextToShare(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button onClick={handleShareText} className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Share Text
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Share Password</h3>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Enter password to share..."
                      value={passwordToShare}
                      onChange={(e) => setPasswordToShare(e.target.value)}
                    />
                    <Button onClick={handleSharePassword} className="w-full">
                      <Key className="mr-2 h-4 w-4" />
                      Share Password
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Share File</h3>
                  <div className="space-y-2">
                    <div
                      className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="mx-auto h-6 w-6 text-gray-400" />
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedFile
                          ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                          : "Click to select a file"}
                      </p>
                      <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    </div>

                    {uploadProgress > 0 && (
                      <div className="w-full space-y-1">
                        <Progress value={uploadProgress} className="w-full" />
                        <p className="text-xs text-center text-muted-foreground">
                          {uploadProgress < 100 ? "Sending file..." : "File sent!"}
                        </p>
                      </div>
                    )}

                    <Button onClick={handleShareFile} disabled={!selectedFile} className="w-full">
                      <FileUp className="mr-2 h-4 w-4" />
                      Share File
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Received Data Card */}
          <Card>
            <CardHeader>
              <CardTitle>Received Data</CardTitle>
              <CardDescription>Data received from your peer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receivedMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data received yet. Waiting for your peer to share something.
                  </p>
                ) : (
                  receivedMessages.map((message, index) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
