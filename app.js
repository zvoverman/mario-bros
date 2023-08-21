const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000

app.use(express.static('./public'))
app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + 'index.html')
})

// Object to store backend player data
const backEndPlayers = {}


// Game variables
const gravity = 0.2

// On socket connection...
io.on('connection', (socket) => {

	// Create player
	console.log('a user connected')
	backEndPlayers[socket.id] = {
		position: {
			x: 150,
			y: 30
		},
		velocity: {
			x: 0,
			y: 0
		},
		sequenceNumber: 0
	}

	io.emit('updatePlayers', backEndPlayers)

	// On keydown event from client, handle backend player movement
	socket.on('keydown', ({ keycode, sequenceNumber }) => {
		backEndPlayers[socket.id].sequenceNumber = sequenceNumber
		switch (keycode) {
			case 'd':
				backEndPlayers[socket.id].position.x += 5 // TODO - change how player movement worky
				break
			case 'a':
				backEndPlayers[socket.id].position.x -= 5
				break
			case 'w':
				backEndPlayers[socket.id].velocity.y = -5
				break
		}
	})

	// Authoritative server movement called on a set interval
	setInterval(() => {
		if (!backEndPlayers[socket.id]) return

		// velocity
		backEndPlayers[socket.id].position.x += backEndPlayers[socket.id].velocity.x

		// gravity and floor collision
		if (backEndPlayers[socket.id].position.y + 16 + backEndPlayers[socket.id].velocity.y >= 240) {
			backEndPlayers[socket.id].velocity.y = 0
			backEndPlayers[socket.id].position.y = 240 - 16
		} else {
			backEndPlayers[socket.id].velocity.y += gravity
			backEndPlayers[socket.id].position.y += backEndPlayers[socket.id].velocity.y
		}

		// Send backend player data to clients on a set interval
		io.emit('updatePlayers', backEndPlayers)
	}, 15)

	// On socket disconnect delete player from backend and update players on frontend
	socket.on('disconnect', (reason) => {
		console.log(reason)
		delete backEndPlayers[socket.id]
		io.emit('updatePlayers', backEndPlayers)
	})

	console.log(backEndPlayers)
})

server.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})