const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 7000

app.use(express.static('./public'))
app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + 'index.html')
})

// Object to store backend player data
const backEndPlayers = {}


// Game variables
const gravity = 0.2
const speed = 3
const jumpMultiplier = 1.5

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
		sequenceNumber: 0,
		prevTimeStamp: 0,
		currentTimeStamp: 0
	}

	io.emit('updatePlayers', backEndPlayers)

	// Run event
	socket.on('run', ({ timeStamp, direction }) => {
		backEndPlayers[socket.id].velocity.x = lerp(backEndPlayers[socket.id].velocity.x, direction * speed, 0.8) 
		backEndPlayers[socket.id].timeStamp = timeStamp
	})

	// Jump event
	socket.on('jump', ({ timeStamp }) => {
		if (backEndPlayers[socket.id].velocity.y === 0) {
			backEndPlayers[socket.id].velocity.y = -speed * jumpMultiplier
			backEndPlayers[socket.id].timeStamp = timeStamp
		}
	})

	// Stop event
	socket.on('stop', ({ timeStamp }) => {
		backEndPlayers[socket.id].velocity.x = lerp(backEndPlayers[socket.id].velocity.x, 0, 0.3) 
		backEndPlayers[socket.id].timeStamp = timeStamp
	})

	let start = Date.now()

	// PHYSICS LOOP
	// Authoritative server movement called on a set interval
	setInterval(() => {
		if (!backEndPlayers[socket.id]) return

		let currentTime = Date.now()
		let delta = ((currentTime - start)) / 15 // use delta to compensate for setInterval() innacuracies

		// velocity
		backEndPlayers[socket.id].position.x += (backEndPlayers[socket.id].velocity.x * delta)

		// if player hits bottom of canvas stop velocity.y and set canJump
		if (backEndPlayers[socket.id].position.y + 16 + backEndPlayers[socket.id].velocity.y >= 240 - 32) {
			backEndPlayers[socket.id].velocity.y = 0
			backEndPlayers[socket.id].position.y = 240 - 32 - 16
		} else { // if player is still falling, player cannot jump
			backEndPlayers[socket.id].velocity.y += gravity * delta
			backEndPlayers[socket.id].position.y += (backEndPlayers[socket.id].velocity.y * delta)
		}

		start = currentTime

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

function lerp( a, b, alpha ) {
	return a + alpha * (b - a )
}