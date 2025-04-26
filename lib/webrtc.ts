// This is a simplified implementation of WebRTC peer-to-peer connection
// In a real application, you would need more robust error handling and reconnection logic

export class PeerConnection {
  private connection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private onMessageCallback: ((data: any) => void) | null = null
  private onConnectedCallback: (() => void) | null = null
  private onDisconnectedCallback: (() => void) | null = null

  constructor() {
    // Only initialize if we're in a browser environment
    if (typeof window !== "undefined" && "RTCPeerConnection" in window) {
      // Initialize with STUN servers to help with NAT traversal
      this.connection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
      })

      this.setupConnectionListeners()
    }
  }

  private setupConnectionListeners() {
    if (!this.connection) return

    this.connection.oniceconnectionstatechange = () => {
      if (this.connection?.iceConnectionState === "connected") {
        this.onConnectedCallback?.()
      } else if (
        this.connection?.iceConnectionState === "disconnected" ||
        this.connection?.iceConnectionState === "failed"
      ) {
        this.onDisconnectedCallback?.()
      }
    }
  }

  // Create an offer as the initiator
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.connection) throw new Error("Connection not initialized")

    // Create a data channel for sending messages
    this.dataChannel = this.connection.createDataChannel("data")
    this.setupDataChannel()

    // Create and set the local description (offer)
    const offer = await this.connection.createOffer()
    await this.connection.setLocalDescription(offer)

    return offer
  }

  // Accept an offer as the receiver
  async acceptOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.connection) throw new Error("Connection not initialized")

    // Set up listener for the data channel
    this.connection.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this.setupDataChannel()
    }

    // Set the remote description (offer)
    await this.connection.setRemoteDescription(new RTCSessionDescription(offer))

    // Create and set the local description (answer)
    const answer = await this.connection.createAnswer()
    await this.connection.setLocalDescription(answer)

    return answer
  }

  // Complete the connection as the initiator by accepting the answer
  async completeConnection(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connection) throw new Error("Connection not initialized")

    // Set the remote description (answer)
    await this.connection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  // Set up the data channel event listeners
  private setupDataChannel() {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      console.log("Data channel opened")
      this.onConnectedCallback?.()
    }

    this.dataChannel.onclose = () => {
      console.log("Data channel closed")
      this.onDisconnectedCallback?.()
    }

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.onMessageCallback?.(data)
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }
  }

  // Send data through the data channel
  sendData(data: any): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not open")
      return false
    }

    try {
      this.dataChannel.send(JSON.stringify(data))
      return true
    } catch (error) {
      console.error("Error sending data:", error)
      return false
    }
  }

  // Set callback for when a message is received
  onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback
  }

  // Set callback for when the connection is established
  onConnected(callback: () => void) {
    this.onConnectedCallback = callback
  }

  // Set callback for when the connection is lost
  onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback
  }

  // Close the connection
  close() {
    if (this.dataChannel) {
      this.dataChannel.close()
    }

    if (this.connection) {
      this.connection.close()
    }

    this.dataChannel = null
    this.connection = null
  }
}
