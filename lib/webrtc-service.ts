import { io, type Socket } from "socket.io-client"

// Types for our messages
export interface FileMessage {
  type: "file"
  name: string
  size: number
  mimeType: string
  data: ArrayBuffer
}

export interface TextMessage {
  type: "text"
  content: string
}

export interface PasswordMessage {
  type: "password"
  content: string
}

export type Message = FileMessage | TextMessage | PasswordMessage

// WebRTC configuration
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
}

export class WebRTCService {
  private socket: Socket
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private roomId: string
  private onMessageCallback: ((message: Message, userId: string) => void) | null = null
  private onUserConnectedCallback: ((userId: string) => void) | null = null
  private onUserDisconnectedCallback: ((userId: string) => void) | null = null
  private onConnectionStatusChangeCallback: ((connected: boolean) => void) | null = null

  constructor(serverUrl: string) {
    this.socket = io(serverUrl)
    this.roomId = ""
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    // Handle when a new user connects to our room
    this.socket.on("user-connected", async (userId: string) => {
      console.log("User connected to room:", userId)
      await this.createPeerConnection(userId, true)
      this.onUserConnectedCallback?.(userId)
    })

    // Handle when a user disconnects from our room
    this.socket.on("user-disconnected", (userId: string) => {
      console.log("User disconnected from room:", userId)
      this.closePeerConnection(userId)
      this.onUserDisconnectedCallback?.(userId)
    })

    // Handle existing users in the room when we join
    this.socket.on("room-users", async (users: string[]) => {
      console.log("Existing users in room:", users)
      for (const userId of users) {
        await this.createPeerConnection(userId, false)
      }
    })

    // Handle WebRTC signaling
    this.socket.on("signal", async ({ userId, signal }: { userId: string; signal: any }) => {
      try {
        const peerConnection = this.peerConnections.get(userId) || (await this.createPeerConnection(userId, false))

        if (signal.type === "offer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          this.socket.emit("signal", { userId, signal: answer })
        } else if (signal.type === "answer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
        } else if (signal.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal))
        }
      } catch (error) {
        console.error("Error handling signal:", error)
      }
    })

    // Handle receiving messages
    this.socket.on("receive-message", ({ userId, message }: { userId: string; message: Message }) => {
      this.onMessageCallback?.(message, userId)
    })
  }

  // Create a new peer connection to a user
  private async createPeerConnection(userId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    try {
      // Close existing connection if any
      this.closePeerConnection(userId)

      // Create new connection
      const peerConnection = new RTCPeerConnection(configuration)
      this.peerConnections.set(userId, peerConnection)

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit("signal", {
            userId,
            signal: event.candidate,
          })
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${userId}:`, peerConnection.connectionState)
        const isConnected = peerConnection.connectionState === "connected"
        this.onConnectionStatusChangeCallback?.(isConnected)
      }

      // Create data channel if we're the initiator
      if (isInitiator) {
        const dataChannel = peerConnection.createDataChannel("data")
        this.setupDataChannel(dataChannel, userId)

        // Create and send offer
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        this.socket.emit("signal", { userId, signal: offer })
      } else {
        // If we're not the initiator, set up to receive the data channel
        peerConnection.ondatachannel = (event) => {
          this.setupDataChannel(event.channel, userId)
        }
      }

      return peerConnection
    } catch (error) {
      console.error("Error creating peer connection:", error)
      throw error
    }
  }

  // Set up a data channel
  private setupDataChannel(dataChannel: RTCDataChannel, userId: string) {
    this.dataChannels.set(userId, dataChannel)

    dataChannel.onopen = () => {
      console.log(`Data channel with ${userId} opened`)
      this.onConnectionStatusChangeCallback?.(true)
    }

    dataChannel.onclose = () => {
      console.log(`Data channel with ${userId} closed`)
      this.onConnectionStatusChangeCallback?.(false)
    }

    dataChannel.onmessage = (event) => {
      try {
        // Handle different types of data
        if (typeof event.data === "string") {
          // Handle JSON messages (text, password)
          const message = JSON.parse(event.data) as Message
          this.onMessageCallback?.(message, userId)
        } else {
          // Handle binary data (files)
          // In a real implementation, you'd need to handle chunking for large files
          const fileReader = new FileReader()
          fileReader.onload = () => {
            const message: FileMessage = {
              type: "file",
              name: "file", // This would come from metadata in a real implementation
              size: event.data.size,
              mimeType: "application/octet-stream", // This would come from metadata
              data: fileReader.result as ArrayBuffer,
            }
            this.onMessageCallback?.(message, userId)
          }
          fileReader.readAsArrayBuffer(event.data)
        }
      } catch (error) {
        console.error("Error handling message:", error)
      }
    }
  }

  // Close a peer connection
  private closePeerConnection(userId: string) {
    const dataChannel = this.dataChannels.get(userId)
    if (dataChannel) {
      dataChannel.close()
      this.dataChannels.delete(userId)
    }

    const peerConnection = this.peerConnections.get(userId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(userId)
    }
  }

  // Join a room
  public joinRoom(roomId: string) {
    this.roomId = roomId
    this.socket.emit("join-room", roomId)
  }

  // Create a new room
  public createRoom(): string {
    const roomId = Math.random().toString(36).substring(2, 10)
    this.joinRoom(roomId)
    return roomId
  }

  // Send a message to all peers in the room
  public sendMessage(message: Message) {
    // Send via data channels if available
    let sent = false
    this.dataChannels.forEach((dataChannel) => {
      if (dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify(message))
        sent = true
      }
    })

    // Fallback to socket.io if no data channels are open
    if (!sent) {
      this.socket.emit("send-message", {
        roomId: this.roomId,
        message,
      })
    }

    return sent
  }

  // Send a file to all peers in the room
  public async sendFile(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer()

      // Send via data channels if available
      let sent = false
      this.dataChannels.forEach((dataChannel) => {
        if (dataChannel.readyState === "open") {
          // In a real implementation, you'd need to chunk large files
          // and implement a protocol for reassembly

          // First send metadata
          const metadata = {
            type: "file-meta",
            name: file.name,
            size: file.size,
            mimeType: file.type,
          }
          dataChannel.send(JSON.stringify(metadata))

          // Then send the actual file data
          dataChannel.send(arrayBuffer)
          sent = true
        }
      })

      return sent
    } catch (error) {
      console.error("Error sending file:", error)
      return false
    }
  }

  // Set callback for when a message is received
  public onMessage(callback: (message: Message, userId: string) => void) {
    this.onMessageCallback = callback
  }

  // Set callback for when a user connects
  public onUserConnected(callback: (userId: string) => void) {
    this.onUserConnectedCallback = callback
  }

  // Set callback for when a user disconnects
  public onUserDisconnected(callback: (userId: string) => void) {
    this.onUserDisconnectedCallback = callback
  }

  // Set callback for connection status changes
  public onConnectionStatusChange(callback: (connected: boolean) => void) {
    this.onConnectionStatusChangeCallback = callback
  }

  // Close all connections
  public close() {
    this.peerConnections.forEach((_, userId) => {
      this.closePeerConnection(userId)
    })
    this.socket.disconnect()
  }

  // Get the room ID
  public getRoomId(): string {
    return this.roomId
  }

  // Check if connected to any peers
  public isConnected(): boolean {
    let connected = false
    this.dataChannels.forEach((dataChannel) => {
      if (dataChannel.readyState === "open") {
        connected = true
      }
    })
    return connected
  }
}
