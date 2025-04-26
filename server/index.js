import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = http.createServer(app)

// Enable CORS
app.use(cors())

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Store active rooms and their participants
const rooms = new Map()

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Join a room
  socket.on("join-room", (roomId) => {
    console.log(`User ${socket.id} joining room ${roomId}`)

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set())
    }

    // Add user to room
    const room = rooms.get(roomId)
    room.add(socket.id)

    // Join the socket.io room
    socket.join(roomId)

    // Notify others in the room
    socket.to(roomId).emit("user-connected", socket.id)

    // Send list of existing users to the new participant
    const users = Array.from(room).filter((id) => id !== socket.id)
    socket.emit("room-users", users)

    console.log(`Room ${roomId} has ${room.size} participants`)
  })

  // Handle WebRTC signaling
  socket.on("signal", ({ userId, signal }) => {
    console.log(`Relaying signal from ${socket.id} to ${userId}`)
    io.to(userId).emit("signal", {
      userId: socket.id,
      signal,
    })
  })

  // Handle text messages
  socket.on("send-message", ({ roomId, message }) => {
    console.log(`Message in room ${roomId}: ${message.type}`)
    socket.to(roomId).emit("receive-message", {
      userId: socket.id,
      message,
    })
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)

    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id)

        // Notify others in the room
        socket.to(roomId).emit("user-disconnected", socket.id)

        // Clean up empty rooms
        if (users.size === 0) {
          rooms.delete(roomId)
          console.log(`Room ${roomId} deleted (empty)`)
        } else {
          console.log(`Room ${roomId} has ${users.size} participants left`)
        }
      }
    })
  })
})

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../client/build")))

  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../client/build/index.html"))
  })
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default server
